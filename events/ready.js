const { Events } = require('discord.js');
const { initNotificationQueue } = require('../services/notificationQueueService');

module.exports = {
  name: Events.ClientReady || 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ บอทออนไลน์: ${client.user.tag}`);
    try {
      // Register all loaded slash commands to Discord
      const commandData = client.commands.map(cmd => cmd.data.toJSON());
      await client.application.commands.set(commandData);
      console.log('✅ โหลดคำสั่งทั้งหมดสำเร็จ!');
    } catch (error) {
      console.error('❌ โหลดคำสั่งล้มเหลว:', error);
    }

    // เริ่มต้นระบบคิวส่งแจ้งเตือน DM จาก Web App
    try {
      initNotificationQueue(client);
    } catch (error) {
      console.error('❌ ไม่สามารถเริ่มต้นระบบ Notification Queue ได้:', error);
    }
  },
};
