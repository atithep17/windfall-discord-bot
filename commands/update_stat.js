const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const memberService = require('../services/memberService');
const { CLASS_CHOICES } = require('../utils/helpers');

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update_stat')
    .setDescription('เปิดเมนูเลือกสายอาชีพและกรอกข้อมูลอัปเดตสเตตัสตัวละคร'),
  async execute(interaction) {
    const discordId = interaction.user.id;
    try {
      const memberDoc = await memberService.getMemberByDiscordId(discordId);
      if (!memberDoc) {
        return interaction.reply({ 
          content: '❌ ไม่พบข้อมูลของคุณในระบบครับ กรุณาลงทะเบียนผ่าน `/menu` ก่อนครับ', 
          ephemeral: true 
        });
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
      console.error('Error in update_stat command:', error);
      return interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล', ephemeral: true });
    }
  },
};
