const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const memberService = require('../services/memberService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guild_stats')
    .setDescription('สรุปข้อมูลประชากรของกิลด์ (จำนวนแต่ละสายอาชีพ)'),
  async execute(interaction) {
    await interaction.reply({ content: '⏳ กำลังรวบรวมข้อมูลสถิติของกิลด์...', ephemeral: true });

    try {
      const allMembers = await memberService.getAllMembers();
      
      if (allMembers.length === 0) {
        return interaction.editReply('⚠️ ยังไม่มีข้อมูลสมาชิกในระบบครับ');
      }

      let totalMembers = 0;
      const classCounts = {};

      allMembers.forEach(doc => {
        const data = doc.data();
        const gameClass = data.gameClass || 'ยังไม่ระบุ';
        
        if (gameClass !== 'ยังไม่ระบุ') {
          classCounts[gameClass] = (classCounts[gameClass] || 0) + 1;
        }
        totalMembers++;
      });

      // Sort classes by count (descending)
      const sortedClasses = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);

      let description = `👥 **จำนวนสมาชิกทั้งหมดในระบบ:** ${totalMembers} คน\n\n**📊 สัดส่วนสายอาชีพในกิลด์:**\n`;
      
      if (sortedClasses.length === 0) {
        description += '\n*ยังไม่มีสมาชิกคนใดระบุสายอาชีพ*';
      } else {
        description += '```\n';
        for (const [className, count] of sortedClasses) {
          description += `• ${className.padEnd(16, ' ')} : ${count} คน\n`;
        }
        description += '```';
      }

      const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('🛡️ สรุปข้อมูลประชากรกิลด์')
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: 'ข้อมูลสรุปจากระบบกิลด์' });

      return interaction.editReply({ content: '', embeds: [embed] });
    } catch (error) {
      console.error('Error fetching guild stats:', error);
      return interaction.editReply('❌ เกิดข้อผิดพลาดในการดึงข้อมูลสถิติครับ');
    }
  },
};
