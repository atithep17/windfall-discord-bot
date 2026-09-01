const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const memberService = require('../services/memberService');
const { 
  tempStatsCache, 
  tempStatsTimeouts, 
  resetCacheTimeout, 
  generateStatEmbed,
  assignClassRole,
  syncNickname
} = require('../utils/helpers');

module.exports = async (interaction, client) => {
  const discordId = interaction.user.id;
  const cachedStats = tempStatsCache.get(discordId);

  if (!cachedStats) {
    return interaction.reply({ content: '❌ ข้อมูลของคุณหมดอายุแล้วครับ กรุณาพิมพ์คำสั่ง `/update_stat` ใหม่อีกครั้ง', ephemeral: true });
  }

  // รีเซ็ตเวลา Memory Management ทุกครั้งที่ผู้ใช้มีการกดปุ่ม
  resetCacheTimeout(discordId);

  if (interaction.customId === 'cancel_stat') {
    tempStatsCache.delete(discordId);
    if (tempStatsTimeouts.has(discordId)) clearTimeout(tempStatsTimeouts.get(discordId));
    tempStatsTimeouts.delete(discordId);
    return interaction.update({ content: '❌ **ยกเลิกการบันทึกข้อมูลแล้วครับ**', components: [], embeds: [] });
  }

  if (interaction.customId === 'wizard_step_1') {
    const modal = new ModalBuilder().setCustomId('submit_stat_1').setTitle('🗡️ โจมตีพื้นฐาน (1/5)');
    const inputs = [
      new TextInputBuilder().setCustomId('patk').setLabel('P.Atk').setStyle(TextInputStyle.Short).setValue(String(cachedStats.patk || '')).setRequired(false),
      new TextInputBuilder().setCustomId('matk').setLabel('M.Atk').setStyle(TextInputStyle.Short).setValue(String(cachedStats.matk || '')).setRequired(false),
      new TextInputBuilder().setCustomId('ignore_pdef').setLabel('Ignore P.DEF').setStyle(TextInputStyle.Short).setValue(String(cachedStats.ignore_pdef || '')).setRequired(false),
      new TextInputBuilder().setCustomId('ignore_mdef').setLabel('Ignore M.DEF').setStyle(TextInputStyle.Short).setValue(String(cachedStats.ignore_mdef || '')).setRequired(false)
    ];
    modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
    return await interaction.showModal(modal);
  }
  
  if (interaction.customId === 'wizard_step_2') {
    const modal = new ModalBuilder().setCustomId('submit_stat_2').setTitle('🛡️ ป้องกันพื้นฐาน (2/5)');
    const inputs = [
      new TextInputBuilder().setCustomId('hp').setLabel('Max HP').setStyle(TextInputStyle.Short).setValue(String(cachedStats.hp || '')).setRequired(false),
      new TextInputBuilder().setCustomId('def').setLabel('P.DEF').setStyle(TextInputStyle.Short).setValue(String(cachedStats.def || '')).setRequired(false),
      new TextInputBuilder().setCustomId('mdef').setLabel('M.DEF').setStyle(TextInputStyle.Short).setValue(String(cachedStats.mdef || '')).setRequired(false)
    ];
    modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
    return await interaction.showModal(modal);
  }

  if (interaction.customId === 'wizard_step_3') {
    const modal = new ModalBuilder().setCustomId('submit_stat_3').setTitle('💥 ค่า Bonus (3/5)');
    const inputs = [
      new TextInputBuilder().setCustomId('p_dmg_bonus').setLabel('P.DMG Bonus (%)').setStyle(TextInputStyle.Short).setValue(String(cachedStats.p_dmg_bonus || '')).setRequired(false),
      new TextInputBuilder().setCustomId('m_dmg_bonus').setLabel('M.DMG Bonus (%)').setStyle(TextInputStyle.Short).setValue(String(cachedStats.m_dmg_bonus || '')).setRequired(false)
    ];
    modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
    return await interaction.showModal(modal);
  }

  if (interaction.customId === 'wizard_step_4') {
    const modal = new ModalBuilder().setCustomId('submit_stat_4').setTitle('📉 Reduction (4/5)');
    const inputs = [
      new TextInputBuilder().setCustomId('p_reduc').setLabel('P.Reduction (%)').setStyle(TextInputStyle.Short).setValue(String(cachedStats.p_reduc || '')).setRequired(false),
      new TextInputBuilder().setCustomId('m_reduc').setLabel('M.Reduction (%)').setStyle(TextInputStyle.Short).setValue(String(cachedStats.m_reduc || '')).setRequired(false)
    ];
    modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
    return await interaction.showModal(modal);
  }

  if (interaction.customId === 'wizard_step_5') {
    const modal = new ModalBuilder().setCustomId('submit_stat_5').setTitle('⚔️ PVP (5/5)');
    const inputs = [
      new TextInputBuilder().setCustomId('min_pvp_dmg').setLabel('PVP Dmg').setStyle(TextInputStyle.Short).setValue(String(cachedStats.min_pvp_dmg || '')).setRequired(false),
      new TextInputBuilder().setCustomId('min_pvp_reduction').setLabel('PVP Reduction').setStyle(TextInputStyle.Short).setValue(String(cachedStats.min_pvp_reduction || '')).setRequired(false)
    ];
    modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
    return await interaction.showModal(modal);
  }

  if (interaction.customId === 'confirm_stat') {
    await interaction.update({ content: '⏳ **กำลังบันทึกข้อมูล กรุณารอสักครู่...**', components: [], embeds: [] });
    
    try {
      const memberDoc = await memberService.getMemberByDiscordId(discordId);
      
      if (!memberDoc) return interaction.editReply({ content: '❌ ไม่พบข้อมูลในระบบ' });

      const docData = memberDoc.data();
      if (docData.status === 'PENDING') {
        return interaction.editReply({ 
          content: '⏳ **บัญชีของคุณอยู่ระหว่างรอการยืนยัน/อนุมัติ**\nกรุณารอการอนุมัติก่อน จึงจะสามารถบันทึกสเตตัสได้ครับ' 
        });
      }

      const updates = {
        latestStats: cachedStats,
        pendingStats: cachedStats,
        lastStatSubmitted: new Date()
      };

      if (cachedStats.gameClass) {
        updates.gameClass = cachedStats.gameClass;
        await assignClassRole(interaction, cachedStats.gameClass);
      }

      await memberService.updateMember(discordId, updates);

      const nickname = docData.nickname || 'สมาชิก';
      const finalClass = cachedStats.gameClass || docData.gameClass;
      await syncNickname(interaction, nickname, finalClass);

      tempStatsCache.delete(discordId);
      if (tempStatsTimeouts.has(discordId)) clearTimeout(tempStatsTimeouts.get(discordId));
      tempStatsTimeouts.delete(discordId);

      // --- ส่งแจ้งเตือนไปยัง Channel ---
      const notifyChannelId = process.env.LOG_CHANNEL_ID;
      if (notifyChannelId) {
        try {
          const channel = await client.channels.fetch(notifyChannelId);
          if (channel) {
            const classNameText = cachedStats.gameClass ? ` (อาชีพ: **${cachedStats.gameClass}**)` : '';
            const notifyEmbed = new EmbedBuilder()
              .setColor('#E67E22')
              .setTitle('📈 แจ้งเตือนการอัปเดตสเตตัส')
              .setDescription(`คุณ **${nickname}** (<@${discordId}>)${classNameText} ได้อัปเดตสเตตัสล่าสุดเรียบร้อยแล้ว!`)
              .setTimestamp();
            await channel.send({ embeds: [notifyEmbed] });
          }
        } catch (e) {
          console.error('ไม่สามารถส่งข้อความแจ้งเตือนไปที่ Channel ได้:', e);
        }
      }
      // ------------------------------------------------

      return interaction.editReply({ 
        content: `✅ **บันทึกสเตตัสลง Database เรียบร้อยแล้ว!**`, 
        embeds: [generateStatEmbed(cachedStats, '#2ECC71')]
      });
    } catch (error) {
      console.error('Error confirming stat:', error);
      return interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' });
    }
  }
};
