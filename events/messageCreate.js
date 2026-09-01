module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // ไม่ลบข้อความของบอทเอง
    if (message.author.bot) return;

    const allowedChannelId = process.env.ALLOWED_CHANNEL_ID;
    if (allowedChannelId && message.channelId === allowedChannelId) {
      try {
        await message.delete();
      } catch (error) {
        console.error('ไม่สามารถลบข้อความได้ (อาจจะขาด Permission):', error);
      }
    }
  },
};
