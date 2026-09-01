const { SlashCommandBuilder } = require('discord.js');
const { handleProfileCommand } = require('./profile');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('my_stat')
    .setDescription('ดูข้อมูลโปรไฟล์และสเตตัสตัวละครของคุณ')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('เลือกสมาชิกที่ต้องการดูข้อมูล (เว้นว่างไว้เพื่อดูของตัวเอง)')
        .setRequired(false)
    ),
  execute: handleProfileCommand,
};
