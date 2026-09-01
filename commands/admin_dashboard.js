const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin_dashboard')
    .setDescription('เปิดหน้าต่างสำหรับผู้ดูแลระบบ')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    // Currently a placeholder
    return interaction.reply({ content: '🛠️ หน้าต่างผู้ดูแลระบบกำลังอยู่ในระหว่างการพัฒนาครับ', ephemeral: true });
  },
};
