const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('menu')
    .setDescription('เรียกหน้าต่างเมนูหลักของระบบกิลด์')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const menuEmbed = new EmbedBuilder()
      .setColor('#2B2D31')
      .setTitle('🛡️ ระบบจัดการข้อมูลกิลด์ 🛡️')
      .setDescription(
        `ยินดีต้อนรับสมาชิกกิลด์ทุกท่าน! สามารถจัดการข้อมูลของคุณได้ที่นี่\n\n` +
        `\`\`\`\nกรุณาลงทะเบียนและรอการอนุมัติก่อนใช้งานระบบอัปเดตสเตตัสนะครับ\n\`\`\`\n` +
        `**ข้อควรระวัง**\n` +
        `กรุณากรอก In-Game UID ให้ถูกต้อง เพื่อให้ระบบบันทึกข้อมูลได้ตรงกับตัวละครของคุณและป้องกันข้อมูลสูญหาย\n\n` +
        `**ขั้นตอนการใช้งานระบบ**\n` +
        `1. 📝 **ลงทะเบียนเข้ากิลด์:** สำหรับสมาชิกที่ยังไม่เคยลงทะเบียน\n` +
        `2. 📊 **อัปเดตสเตตัส:** เลือกอาชีพและกรอกข้อมูลสเตตัสใหม่\n` +
        `3. ⚙️ **แก้ไขชื่อ/UID:** หากต้องการอัปเดตชื่อหรือ UID\n\n` +
        `**คำแนะนำ**\n` +
        `สามารถพิมพ์คำสั่ง \`/update_stat\` ลงในแชทเพื่อเปิดหน้าต่างอัปเดตสเตตัสได้โดยตรง`
      );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('guild_main_menu')
      .setPlaceholder('เลือกรายการที่ต้องการดำเนินการ...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('ขั้นตอนที่ 1: ลงทะเบียนเข้ากิลด์')
          .setDescription('คลิกเพื่อกรอกข้อมูล UID และชื่อตัวละคร')
          .setValue('menu_register')
          .setEmoji('📝'),
        new StringSelectMenuOptionBuilder()
          .setLabel('ขั้นตอนที่ 2: อัปเดตสเตตัส')
          .setDescription('เลือกสายอาชีพและกรอกข้อมูลสเตตัสตัวละคร')
          .setValue('menu_update')
          .setEmoji('📊'),
        new StringSelectMenuOptionBuilder()
          .setLabel('ขั้นตอนที่ 3: แก้ไขชื่อและ UID')
          .setDescription('คลิกเพื่อเปลี่ยนชื่อหรือ UID')
          .setValue('menu_edit')
          .setEmoji('⚙️')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    return interaction.reply({ embeds: [menuEmbed], components: [row] });
  },
};
