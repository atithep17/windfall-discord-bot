const { sendErrorLog } = require('../utils/helpers');

const handleSelectMenus = require('../interactions/selectMenus');
const handleButtons = require('../interactions/buttons');
const handleModals = require('../interactions/modals');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // --- ล็อคให้บอททำงานแค่ในห้องที่กำหนดเท่านั้น ---
    const allowedChannelId = process.env.ALLOWED_CHANNEL_ID;
    if (allowedChannelId && interaction.channelId !== allowedChannelId) {
      return interaction.reply({ 
        content: `⚠️ บอทสามารถใช้งานได้เฉพาะในห้อง <#${allowedChannelId}> เท่านั้นครับ!`, 
        ephemeral: true 
      });
    }

    try {
      if (interaction.isStringSelectMenu()) {
        return await handleSelectMenus(interaction, client);
      }

      if (interaction.isButton()) {
        return await handleButtons(interaction, client);
      }

      if (interaction.isModalSubmit()) {
        return await handleModals(interaction, client);
      }

      // ==========================================
      // ส่วนที่ 4: ดักการพิมพ์คำสั่ง (Slash Commands)
      // ==========================================
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction, client);
      }
    } catch (error) {
      // ดักจับ Error 10062 (Unknown interaction - เกิดจาก Discord Token หมดอายุ/ผู้ใช้กดย้ำเร็วเกินไป)
      if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
        console.warn('⚠️ [Interaction Expired] ผู้ใช้อาจกดย้ำหรือหมดเวลาตอบสนอง 3 วินาทีของ Discord (ไม่ส่งผลต่อระบบ)');
        return;
      }

      console.error(`❌ Error executing interaction (${interaction.customId || interaction.commandName}):`, error);
      await sendErrorLog(client, error, `Interaction: ${interaction.customId || interaction.commandName}`);

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: '❌ มีบางอย่างผิดพลาดขณะดำเนินการ (แอดมินได้รับแจ้งเตือนแล้วครับ)', ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ มีบางอย่างผิดพลาดขณะดำเนินการ (แอดมินได้รับแจ้งเตือนแล้วครับ)', ephemeral: true });
        }
      } catch (replyErr) {
        // ignore if cannot reply
      }
    }
  },
};
