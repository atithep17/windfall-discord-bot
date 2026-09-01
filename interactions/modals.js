const { 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder 
} = require('discord.js');
const memberService = require('../services/memberService');
const { 
  tempStatsCache, 
  tempStatsTimeouts, 
  resetCacheTimeout, 
  generateStatEmbed,
  cleanNumber, 
  syncNickname,
  assignClassRole
} = require('../utils/helpers');

module.exports = async (interaction, client) => {
  // ✨ ดักจับ Modal ลงทะเบียนจากเมนู UI
  if (interaction.customId.startsWith('modal_register_ui')) {
    const selectedClass = interaction.customId.includes(':') 
      ? interaction.customId.split(':')[1] 
      : 'ยังไม่ระบุ';
    const inputUid = interaction.fields.getTextInputValue('uid');
    const inputNickname = interaction.fields.getTextInputValue('nickname');
    const discordId = interaction.user.id;
    
    await interaction.reply({ content: '⏳ กำลังบันทึกข้อมูลการลงทะเบียน...', ephemeral: true });
    try {
      const memberDoc = await memberService.getMemberByDiscordId(discordId);
      if (memberDoc) {
        const memberData = memberDoc.data();
        if (memberData.status === 'PENDING') {
          return interaction.editReply(`⏳ **ข้อมูลของคุณอยู่ระหว่างรอการยืนยันในข้อความส่วนตัว (DM)**\nกรุณารอการอนุมัติก่อนนะครับ จึงจะสามารถอัปเดตสเตตัสได้`);
        }
        return interaction.editReply(`❌ คุณมีตัวละครในระบบแล้วครับ`);
      }
      const isUidExists = await memberService.checkUidExists(inputUid);
      if (isUidExists) return interaction.editReply(`❌ **UID: ${inputUid}** มีผู้อื่นใช้งานแล้ว`);
      
      await memberService.registerMember({ 
        gameUid: inputUid, 
        nickname: inputNickname, 
        gameClass: selectedClass, 
        status: 'PENDING', 
        discordId: discordId, 
        discordAvatarUrl: interaction.user.displayAvatarURL(), 
        createdAt: new Date() 
      });
      
      await syncNickname(interaction, inputNickname, selectedClass);
      if (selectedClass && selectedClass !== 'ยังไม่ระบุ') {
        await assignClassRole(interaction, selectedClass);
      }

      // --- ส่งแจ้งเตือนไปยัง Channel ---
      const notifyChannelId = process.env.LOG_CHANNEL_ID;
      if (notifyChannelId) {
        try {
          const channel = await client.channels.fetch(notifyChannelId);
          if (channel) {
            const classText = selectedClass !== 'ยังไม่ระบุ' ? `\nอาชีพ: **${selectedClass}**` : '';
            const notifyEmbed = new EmbedBuilder()
              .setColor('#F1C40F')
              .setTitle('📝 แจ้งเตือนการขอลงทะเบียนสมาชิกใหม่')
              .setDescription(`คุณ **${inputNickname}** (<@${discordId}>)${classText}\nUID: \`${inputUid}\`\n(สถานะ: **รอยืนยัน/อนุมัติ ⏳**)`)
              .setTimestamp();
            await channel.send({ embeds: [notifyEmbed] });
          }
        } catch (e) {
          console.error('ไม่สามารถส่งข้อความแจ้งเตือนไปที่ Channel ได้:', e);
        }
      }
      // ------------------------------------------------

      const classDisplay = selectedClass !== 'ยังไม่ระบุ' ? `\nสายอาชีพ: **${selectedClass}**` : '';
      return interaction.editReply(
        `📩 **ส่งข้อมูลลงทะเบียนเรียบร้อยแล้ว!**${classDisplay}\n` +
        `กรุณา**รอยืนยันในข้อความส่วนตัว (DM)** นะครับ\n` +
        `เมื่อได้รับการยืนยันแล้ว จึงจะสามารถใช้คำสั่ง \`/update_stat\` เพื่ออัปเดตสเตตัสได้ครับ ✨`
      );
    } catch (error) { 
      console.error('Error in register modal:', error);
      return interaction.editReply('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลครับ'); 
    }
  }

  // ✨ ดักจับ Modal แก้ไขข้อมูลจากเมนู UI
  if (interaction.customId === 'modal_edit_ui') {
    const newUid = interaction.fields.getTextInputValue('uid');
    const newNickname = interaction.fields.getTextInputValue('nickname');
    const discordId = interaction.user.id;
    
    await interaction.reply({ content: '⏳ กำลังอัปเดตข้อมูล...', ephemeral: true });
    if (!newNickname && !newUid) return interaction.editReply('⚠️ คุณไม่ได้แก้ไขข้อมูลใดๆ ครับ');
    
    try {
      const memberDoc = await memberService.getMemberByDiscordId(discordId);
      if (!memberDoc) return interaction.editReply('❌ ไม่พบข้อมูลของคุณในระบบกิลด์ครับ');
      
      const currentData = memberDoc.data();
      const updates = {}; let changeLog = [];
      if (newNickname) { updates.nickname = newNickname; changeLog.push(`• ชื่อ: \`${currentData.nickname}\` ➡️ **${newNickname}**`); }
      if (newUid) { updates.gameUid = newUid; changeLog.push(`• UID: \`${currentData.gameUid || '-'}\` ➡️ **${newUid}**`); }
      
      await memberService.updateMember(discordId, updates);
      
      const finalNickname = newNickname || currentData.nickname;
      const finalClass = currentData.gameClass; // gameClass is not modified here usually, but keeping it in sync
      await syncNickname(interaction, finalNickname, finalClass);
      if (finalClass && finalClass !== 'ยังไม่ระบุ') {
        await assignClassRole(interaction, finalClass);
      }

      // --- ส่งแจ้งเตือนไปยัง Channel ---
      const notifyChannelId = process.env.LOG_CHANNEL_ID;
      if (notifyChannelId && changeLog.length > 0) {
        try {
          const channel = await client.channels.fetch(notifyChannelId);
          if (channel) {
            const notifyEmbed = new EmbedBuilder()
              .setColor('#F1C40F')
              .setTitle('📝 มีการแก้ไขข้อมูลส่วนตัว')
              .setDescription(`คุณ **${newNickname || currentData.nickname}** (<@${discordId}>) ได้ทำการแก้ไขข้อมูล:\n\n${changeLog.join('\n')}`)
              .setTimestamp();
            await channel.send({ embeds: [notifyEmbed] });
          }
        } catch (e) {
          console.error('ไม่สามารถส่งข้อความแจ้งเตือนไปที่ Channel ได้:', e);
        }
      }
      // ------------------------------------------------

      return interaction.editReply(`✅ **อัปเดตข้อมูลสำเร็จ!**\n${changeLog.join('\n')}`);
    } catch (error) { 
      console.error('Error in edit modal:', error);
      return interaction.editReply('❌ เกิดข้อผิดพลาดในการอัปเดตข้อมูลครับ'); 
    }
  }

  const discordId = interaction.user.id;
  const cachedStats = tempStatsCache.get(discordId);
  if (!cachedStats) return interaction.reply({ content: '❌ ข้อมูลของคุณหมดอายุแล้วครับ กรุณาพิมพ์คำสั่ง `/update_stat` ใหม่อีกครั้ง', ephemeral: true });

  // รีเซ็ตเวลา Memory Management ทุกครั้งที่ผู้ใช้มีการ submit ข้อมูล
  resetCacheTimeout(discordId);

  let nextStepButton = null;

  if (interaction.customId === 'submit_stat_1' || interaction.customId === 'quick_submit_stat_1') {
    cachedStats.patk = cleanNumber(interaction.fields.getTextInputValue('patk'));
    cachedStats.matk = cleanNumber(interaction.fields.getTextInputValue('matk'));
    cachedStats.ignore_pdef = cleanNumber(interaction.fields.getTextInputValue('ignore_pdef'));
    cachedStats.ignore_mdef = cleanNumber(interaction.fields.getTextInputValue('ignore_mdef'));
    if (interaction.customId === 'submit_stat_1') {
      nextStepButton = new ButtonBuilder().setCustomId('wizard_step_2').setLabel('📝 ไปหน้าถัดไป (2/5)').setStyle(ButtonStyle.Primary);
    }
  }

  if (interaction.customId === 'submit_stat_2' || interaction.customId === 'quick_submit_stat_2') {
    cachedStats.hp = cleanNumber(interaction.fields.getTextInputValue('hp'));
    cachedStats.def = cleanNumber(interaction.fields.getTextInputValue('def'));
    cachedStats.mdef = cleanNumber(interaction.fields.getTextInputValue('mdef'));
    if (interaction.customId === 'submit_stat_2') {
      nextStepButton = new ButtonBuilder().setCustomId('wizard_step_3').setLabel('📝 ไปหน้าถัดไป (3/5)').setStyle(ButtonStyle.Primary);
    }
  }

  if (interaction.customId === 'submit_stat_3' || interaction.customId === 'quick_submit_stat_3') {
    cachedStats.p_dmg_bonus = cleanNumber(interaction.fields.getTextInputValue('p_dmg_bonus'));
    cachedStats.m_dmg_bonus = cleanNumber(interaction.fields.getTextInputValue('m_dmg_bonus'));
    if (interaction.customId === 'submit_stat_3') {
      nextStepButton = new ButtonBuilder().setCustomId('wizard_step_4').setLabel('📝 ไปหน้าถัดไป (4/5)').setStyle(ButtonStyle.Primary);
    }
  }

  if (interaction.customId === 'submit_stat_4' || interaction.customId === 'quick_submit_stat_4') {
    cachedStats.p_reduc = cleanNumber(interaction.fields.getTextInputValue('p_reduc'));
    cachedStats.m_reduc = cleanNumber(interaction.fields.getTextInputValue('m_reduc'));
    if (interaction.customId === 'submit_stat_4') {
      nextStepButton = new ButtonBuilder().setCustomId('wizard_step_5').setLabel('📝 ไปหน้าถัดไป (5/5)').setStyle(ButtonStyle.Primary);
    }
  }

  if (interaction.customId === 'submit_stat_5' || interaction.customId === 'quick_submit_stat_5') {
    cachedStats.min_pvp_dmg = cleanNumber(interaction.fields.getTextInputValue('min_pvp_dmg'));
    cachedStats.min_pvp_reduction = cleanNumber(interaction.fields.getTextInputValue('min_pvp_reduction'));
    // No next step button for step 5, we show the confirm button
  }

  tempStatsCache.set(discordId, cachedStats);
  
  const quickEditMenu = new StringSelectMenuBuilder()
    .setCustomId('quick_edit_menu')
    .setPlaceholder('⚡ แก้ไขด่วน (เลือกเฉพาะหมวดที่ต้องการแก้)')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('1. โจมตีพื้นฐาน').setValue('quick_edit_1').setEmoji('🗡️'),
      new StringSelectMenuOptionBuilder().setLabel('2. ป้องกันพื้นฐาน').setValue('quick_edit_2').setEmoji('🛡️'),
      new StringSelectMenuOptionBuilder().setLabel('3. ค่า Bonus').setValue('quick_edit_3').setEmoji('💥'),
      new StringSelectMenuOptionBuilder().setLabel('4. Reduction').setValue('quick_edit_4').setEmoji('📉'),
      new StringSelectMenuOptionBuilder().setLabel('5. PVP').setValue('quick_edit_5').setEmoji('⚔️')
    );
  const rowSelect = new ActionRowBuilder().addComponents(quickEditMenu);
  const rowButtons = new ActionRowBuilder();
  
  if (nextStepButton) {
    rowButtons.addComponents(
      nextStepButton,
      new ButtonBuilder().setCustomId('confirm_stat').setLabel('✅ ยืนยันข้อมูลตอนนี้').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel_stat').setLabel('❌ ยกเลิก').setStyle(ButtonStyle.Danger)
    );
    return interaction.update({ 
      content: `⏳ **กำลังกรอกข้อมูลสเตตัส...**\n(กดปุ่ม "ไปหน้าถัดไป" เพื่อกรอกหมวดต่อไป หรือเลือก "แก้ไขด่วน" จากเมนูด้านล่าง)`, 
      embeds: [generateStatEmbed(cachedStats)],
      components: [rowSelect, rowButtons] 
    });
  } else {
    rowButtons.addComponents(
      new ButtonBuilder().setCustomId('confirm_stat').setLabel('✅ ยืนยันการบันทึกข้อมูล').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('wizard_step_1').setLabel('🔄 แก้ไขใหม่ตั้งแต่ต้น').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cancel_stat').setLabel('❌ ยกเลิก').setStyle(ButtonStyle.Danger)
    );
    return interaction.update({ 
      content: `✅ **กรอกข้อมูลครบแล้ว! ตรวจสอบความถูกต้องและกดยืนยันได้เลยครับ**`, 
      embeds: [generateStatEmbed(cachedStats)],
      components: [rowSelect, rowButtons] 
    });
  }
};
