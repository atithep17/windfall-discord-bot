const { 
  ModalBuilder, 
  ActionRowBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder 
} = require('discord.js');
const memberService = require('../services/memberService');
const { tempStatsCache, resetCacheTimeout, CLASS_CHOICES } = require('../utils/helpers');

const CLASS_EMOJIS = {
  'Lord Knight': '⚔️',
  'Paladin': '🛡️',
  'High Wizard': '🔮',
  'Sage': '📖',
  'Mastersmith': '🔨',
  'Biochemist': '🧪',
  'High Priest': '✨',
  'Champion': '👊',
  'Assassin Cross': '🗡️',
  'Stalker': '🏹',
  'Sniper': '🎯',
  'Minstrel': '🎵',
  'Gypsy': '💃',
  'Apprentice': '🐱',
  'Rebellion': '🔫'
};

module.exports = async (interaction, client) => {
  // ===================================================
  // 1. ดักจับการเลือกเมนูหลักจากคำสั่ง /menu
  // ===================================================
  if (interaction.customId === 'guild_main_menu') {
    const selected = interaction.values[0];

    // --- เมนูลงทะเบียนเข้ากิลด์ ---
    if (selected === 'menu_register') {
      const discordId = interaction.user.id;
      try {
        const memberDoc = await memberService.getMemberByDiscordId(discordId);
        if (memberDoc) {
          const memberData = memberDoc.data();
          if (memberData.status === 'PENDING') {
            return interaction.reply({
              content: '⏳ **ข้อมูลของคุณอยู่ระหว่างรอการยืนยันในข้อความส่วนตัว (DM)**\nกรุณารอการอนุมัติก่อนนะครับ จึงจะสามารถอัปเดตสเตตัสได้',
              ephemeral: true
            });
          }
          return interaction.reply({ content: '❌ คุณมีตัวละครในระบบแล้วครับ', ephemeral: true });
        }

        const classSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_register_class')
          .setPlaceholder('เลือกสายอาชีพหลักของคุณ...')
          .addOptions(
            CLASS_CHOICES.map(c => 
              new StringSelectMenuOptionBuilder()
                .setLabel(c.name)
                .setValue(c.value)
                .setEmoji(CLASS_EMOJIS[c.name] || '⚔️')
            )
          );

        const row = new ActionRowBuilder().addComponents(classSelectMenu);
        return interaction.reply({
          content: '⚔️ **ขั้นตอนที่ 1/2: กรุณาเลือกสายอาชีพของคุณ**\n(หลังจากเลือกอาชีพแล้ว ระบบจะเปิดหน้าต่างให้กรอก UID และชื่อตัวละครครับ)',
          components: [row],
          ephemeral: true
        });
      } catch (error) {
        console.error('Error in menu_register:', error);
        return interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล', ephemeral: true });
      }
    }

    // --- เมนูแก้ไขชื่อและ UID ---
    if (selected === 'menu_edit') {
      const modal = new ModalBuilder().setCustomId('modal_edit_ui').setTitle('⚙️ แก้ไขข้อมูล (เว้นว่างช่องที่ไม่ต้องการแก้)');
      
      const rowUid = new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('uid').setLabel('In-Game UID ใหม่').setStyle(TextInputStyle.Short).setRequired(false)
      );
      const rowNickname = new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nickname').setLabel('ชื่อตัวละครใหม่').setStyle(TextInputStyle.Short).setRequired(false)
      );

      modal.addComponents(rowUid, rowNickname);
      return await interaction.showModal(modal);
    }

    // --- เมนูอัปเดตสเตตัส ---
    if (selected === 'menu_update') {
      const discordId = interaction.user.id;
      try {
        const memberDoc = await memberService.getMemberByDiscordId(discordId);
        if (!memberDoc) {
          return interaction.reply({ content: '❌ ไม่พบข้อมูลของคุณในระบบครับ กรุณาลงทะเบียนผ่าน `/menu` ก่อนครับ', ephemeral: true });
        }

        const docData = memberDoc.data();
        if (docData.status === 'PENDING') {
          return interaction.reply({ 
            content: '⏳ **บัญชีของคุณอยู่ระหว่างรอการยืนยัน/อนุมัติ**\nกรุณารอการอนุมัติจากแอดมินก่อน จึงจะสามารถใช้งานระบบอัปเดตสเตตัสได้ครับ', 
            ephemeral: true 
          });
        }

        const currentClass = docData.gameClass || 'ยังไม่ระบุ';
        const classSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_update_stat_class')
          .setPlaceholder(`เลือกสายอาชีพที่ต้องการอัปเดต (ปัจจุบัน: ${currentClass})...`)
          .addOptions(
            CLASS_CHOICES.map(c => 
              new StringSelectMenuOptionBuilder()
                .setLabel(c.name)
                .setValue(c.value)
                .setEmoji(CLASS_EMOJIS[c.name] || '⚔️')
            )
          );

        const row = new ActionRowBuilder().addComponents(classSelectMenu);
        return interaction.reply({
          content: `⚔️ **กรุณาเลือกสายอาชีพที่คุณต้องการอัปเดตสเตตัส**\n(อาชีพปัจจุบันของคุณ: **${currentClass}**)\n*หลังจากเลือกอาชีพแล้ว ระบบจะเปิดหน้าต่างให้กรอกข้อมูลสเตตัสทันทีครับ*`,
          components: [row],
          ephemeral: true
        });
      } catch (error) {
        console.error('Error in menu_update:', error);
        return interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล', ephemeral: true });
      }
    }
  }

  // ===================================================
  // 2. ดักจับการเลือกอาชีพเพื่อเปิดหน้าต่างลงทะเบียน
  // ===================================================
  if (interaction.customId === 'select_register_class') {
    const selectedClass = interaction.values[0];
    const modal = new ModalBuilder()
      .setCustomId(`modal_register_ui:${selectedClass}`)
      .setTitle(`📝 ลงทะเบียน (${selectedClass})`);

    const rowUid = new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('uid')
        .setLabel('In-Game UID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    );
    const rowNickname = new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('nickname')
        .setLabel('ชื่อตัวละคร')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    );

    modal.addComponents(rowUid, rowNickname);
    return await interaction.showModal(modal);
  }

  // ===================================================
  // 3. ดักจับการเลือกอาชีพเพื่ออัปเดตสเตตัสตัวละคร (เปิด Modal หมวดที่ 1 ทันที)
  // ===================================================
  if (interaction.customId === 'select_update_stat_class') {
    const selectedClass = interaction.values[0];
    const discordId = interaction.user.id;

    try {
      const memberDoc = await memberService.getMemberByDiscordId(discordId);
      if (!memberDoc) {
        return interaction.reply({ content: '❌ ไม่พบข้อมูลของคุณในระบบครับ กรุณาลงทะเบียนผ่าน `/menu` ก่อนครับ', ephemeral: true });
      }

      const docData = memberDoc.data();
      if (docData.status === 'PENDING') {
        return interaction.reply({ 
          content: '⏳ **บัญชีของคุณอยู่ระหว่างรอการยืนยัน/อนุมัติ**\nกรุณารอการอนุมัติจากแอดมินก่อน จึงจะสามารถใช้งานระบบอัปเดตสเตตัสได้ครับ', 
          ephemeral: true 
        });
      }

      const existingStats = docData.latestStats || docData.pendingStats || {};

      const initialStats = {
        gameClass: selectedClass,
        hp: existingStats.hp || 0,
        patk: existingStats.patk || 0,
        matk: existingStats.matk || 0,
        p_dmg_bonus: existingStats.p_dmg_bonus || 0,
        m_dmg_bonus: existingStats.m_dmg_bonus || 0,
        ignore_pdef: existingStats.ignore_pdef || 0,
        ignore_mdef: existingStats.ignore_mdef || 0,
        def: existingStats.def || 0,
        mdef: existingStats.mdef || 0,
        p_reduc: existingStats.p_reduc || 0,
        m_reduc: existingStats.m_reduc || 0,
        min_pvp_dmg: existingStats.min_pvp_dmg || 0,
        min_pvp_reduction: existingStats.min_pvp_reduction || 0
      };

      tempStatsCache.set(discordId, initialStats);
      resetCacheTimeout(discordId);

      // เปิด Modal หมวดที่ 1 (โจมตีพื้นฐาน) ทันที
      const modal = new ModalBuilder()
        .setCustomId('submit_stat_1')
        .setTitle(`🗡️ โจมตีพื้นฐาน (1/5) - ${selectedClass}`);

      const inputs = [
        new TextInputBuilder()
          .setCustomId('patk')
          .setLabel('P.Atk')
          .setStyle(TextInputStyle.Short)
          .setValue(String(initialStats.patk || ''))
          .setRequired(false),
        new TextInputBuilder()
          .setCustomId('matk')
          .setLabel('M.Atk')
          .setStyle(TextInputStyle.Short)
          .setValue(String(initialStats.matk || ''))
          .setRequired(false),
        new TextInputBuilder()
          .setCustomId('ignore_pdef')
          .setLabel('Ignore P.DEF')
          .setStyle(TextInputStyle.Short)
          .setValue(String(initialStats.ignore_pdef || ''))
          .setRequired(false),
        new TextInputBuilder()
          .setCustomId('ignore_mdef')
          .setLabel('Ignore M.DEF')
          .setStyle(TextInputStyle.Short)
          .setValue(String(initialStats.ignore_mdef || ''))
          .setRequired(false)
      ];

      modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
      return await interaction.showModal(modal);
    } catch (error) {
      console.error('Error in select_update_stat_class:', error);
      return interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลสเตตัส', ephemeral: true });
    }
  }

  // ===================================================
  // 4. ดักจับเมนู Quick Edit สเตตัส
  // ===================================================
  if (interaction.customId === 'quick_edit_menu') {
    const selected = interaction.values[0];
    const discordId = interaction.user.id;
    const cachedStats = tempStatsCache.get(discordId);

    if (!cachedStats) {
      return interaction.reply({ content: '❌ ข้อมูลของคุณหมดอายุแล้วครับ กรุณาพิมพ์คำสั่ง `/update_stat` ใหม่อีกครั้ง', ephemeral: true });
    }
    resetCacheTimeout(discordId);

    if (selected === 'quick_edit_1') {
      const modal = new ModalBuilder().setCustomId('quick_submit_stat_1').setTitle('🗡️ โจมตีพื้นฐาน (แก้ไขด่วน)');
      const inputs = [
        new TextInputBuilder().setCustomId('patk').setLabel('P.Atk').setStyle(TextInputStyle.Short).setValue(String(cachedStats.patk || '')).setRequired(false),
        new TextInputBuilder().setCustomId('matk').setLabel('M.Atk').setStyle(TextInputStyle.Short).setValue(String(cachedStats.matk || '')).setRequired(false),
        new TextInputBuilder().setCustomId('ignore_pdef').setLabel('Ignore P.DEF').setStyle(TextInputStyle.Short).setValue(String(cachedStats.ignore_pdef || '')).setRequired(false),
        new TextInputBuilder().setCustomId('ignore_mdef').setLabel('Ignore M.DEF').setStyle(TextInputStyle.Short).setValue(String(cachedStats.ignore_mdef || '')).setRequired(false)
      ];
      modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
      return await interaction.showModal(modal);
    }
    
    if (selected === 'quick_edit_2') {
      const modal = new ModalBuilder().setCustomId('quick_submit_stat_2').setTitle('🛡️ ป้องกันพื้นฐาน (แก้ไขด่วน)');
      const inputs = [
        new TextInputBuilder().setCustomId('hp').setLabel('Max HP').setStyle(TextInputStyle.Short).setValue(String(cachedStats.hp || '')).setRequired(false),
        new TextInputBuilder().setCustomId('def').setLabel('P.DEF').setStyle(TextInputStyle.Short).setValue(String(cachedStats.def || '')).setRequired(false),
        new TextInputBuilder().setCustomId('mdef').setLabel('M.DEF').setStyle(TextInputStyle.Short).setValue(String(cachedStats.mdef || '')).setRequired(false)
      ];
      modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
      return await interaction.showModal(modal);
    }

    if (selected === 'quick_edit_3') {
      const modal = new ModalBuilder().setCustomId('quick_submit_stat_3').setTitle('💥 ค่า Bonus (แก้ไขด่วน)');
      const inputs = [
        new TextInputBuilder().setCustomId('p_dmg_bonus').setLabel('P.DMG Bonus (%)').setStyle(TextInputStyle.Short).setValue(String(cachedStats.p_dmg_bonus || '')).setRequired(false),
        new TextInputBuilder().setCustomId('m_dmg_bonus').setLabel('M.DMG Bonus (%)').setStyle(TextInputStyle.Short).setValue(String(cachedStats.m_dmg_bonus || '')).setRequired(false)
      ];
      modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
      return await interaction.showModal(modal);
    }

    if (selected === 'quick_edit_4') {
      const modal = new ModalBuilder().setCustomId('quick_submit_stat_4').setTitle('📉 Reduction (แก้ไขด่วน)');
      const inputs = [
        new TextInputBuilder().setCustomId('p_reduc').setLabel('P.Reduction (%)').setStyle(TextInputStyle.Short).setValue(String(cachedStats.p_reduc || '')).setRequired(false),
        new TextInputBuilder().setCustomId('m_reduc').setLabel('M.Reduction (%)').setStyle(TextInputStyle.Short).setValue(String(cachedStats.m_reduc || '')).setRequired(false)
      ];
      modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
      return await interaction.showModal(modal);
    }

    if (selected === 'quick_edit_5') {
      const modal = new ModalBuilder().setCustomId('quick_submit_stat_5').setTitle('⚔️ PVP (แก้ไขด่วน)');
      const inputs = [
        new TextInputBuilder().setCustomId('min_pvp_dmg').setLabel('PVP Dmg').setStyle(TextInputStyle.Short).setValue(String(cachedStats.min_pvp_dmg || '')).setRequired(false),
        new TextInputBuilder().setCustomId('min_pvp_reduction').setLabel('PVP Reduction').setStyle(TextInputStyle.Short).setValue(String(cachedStats.min_pvp_reduction || '')).setRequired(false)
      ];
      modal.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
      return await interaction.showModal(modal);
    }
  }
};
