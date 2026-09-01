const { EmbedBuilder } = require('discord.js');
const memberService = require('../services/memberService');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    try {
      const discordId = member.id;
      const isDeleted = await memberService.deleteMember(discordId);
      
      if (isDeleted) {
        // ลบข้อมูลคนนั้นออกจาก Firebase
        console.log(`🗑️ ลบข้อมูลของ ${member.user.tag} (ID: ${discordId}) ออกจากฐานข้อมูลแล้ว เนื่องจากออกจากเซิร์ฟเวอร์`);

        // ส่งแจ้งเตือนไปยัง Log Channel (ถ้ามีตั้งค่าไว้)
        const notifyChannelId = process.env.LOG_CHANNEL_ID;
        if (notifyChannelId) {
          const channel = await client.channels.fetch(notifyChannelId).catch(() => null);
          if (channel) {
            const notifyEmbed = new EmbedBuilder()
              .setColor('#E74C3C')
              .setTitle('👋 สมาชิกออกจากกิลด์')
              .setDescription(`**${member.user.tag}** ได้ออกจากเซิร์ฟเวอร์\nระบบได้ลบข้อมูลสเตตัสของบุคคลนี้ออกจากฐานข้อมูลแล้วอัตโนมัติ!`)
              .setTimestamp();
            await channel.send({ embeds: [notifyEmbed] });
          }
        }
      }
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการลบข้อมูลอัตโนมัติ:', error);
    }
  },
};
