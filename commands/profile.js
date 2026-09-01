const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const memberService = require('../services/memberService');

async function handleProfileCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.getUser('user') || interaction.user;
  const isSelf = targetUser.id === interaction.user.id;

  try {
    const memberDoc = await memberService.getMemberByDiscordId(targetUser.id);

    if (!memberDoc) {
      if (isSelf) {
        return interaction.editReply({
          content: '❌ **คุณยังไม่ได้ลงทะเบียนในระบบกิลด์ครับ**\nกรุณาใช้คำสั่ง `/menu` เพื่อลงทะเบียนเข้ากิลด์ก่อนนะครับ'
        });
      } else {
        return interaction.editReply({
          content: `❌ **ไม่พบข้อมูลของ <@${targetUser.id}> ในระบบกิลด์ครับ**`
        });
      }
    }

    const data = memberDoc.data();
    const nickname = data.nickname || targetUser.username;
    const gameClass = data.gameClass && data.gameClass !== 'ยังไม่ระบุ' ? data.gameClass : 'ยังไม่ระบุ';
    const gameUid = data.gameUid || '-';
    const stats = data.latestStats || data.pendingStats || {};
    const isPending = data.status === 'PENDING';

    let lastUpdatedText = 'ยังไม่เคยบันทึกสเตตัส';
    const dateVal = data.lastStatSubmitted || data.updatedAt || data.createdAt;
    if (dateVal) {
      const dateObj = dateVal.toDate ? dateVal.toDate() : (dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal));
      if (!isNaN(dateObj.getTime())) {
        const unixTime = Math.floor(dateObj.getTime() / 1000);
        lastUpdatedText = `<t:${unixTime}:f> (<t:${unixTime}:R>)`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(isPending ? '#F1C40F' : '#3498DB')
      .setAuthor({ 
        name: `${nickname} [${gameClass}]`, 
        iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
      })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTitle(`🛡️ ข้อมูลโปรไฟล์ตัวละคร`)
      .addFields(
        {
          name: '👤 ข้อมูลทั่วไป',
          value: `• **ชื่อตัวละคร:** ${nickname}\n` +
                 `• **สายอาชีพ:** ${gameClass}\n` +
                 `• **In-Game UID:** \`${gameUid}\`\n` +
                 `• **สถานะ:** ${isPending ? '⏳ **รอยืนยัน (Pending)**' : '✅ **สมาชิกกิลด์**'}`,
          inline: false
        }
      );

    if (isPending) {
      embed.addFields({
        name: '📊 ข้อมูลสเตตัส',
        value: '⚠️ *บัญชีนี้อยู่ระหว่างรอการยืนยันใน DM จึงยังไม่สามารถดูหรืออัปเดตสเตตัสได้*',
        inline: false
      });
    } else {
      embed.addFields(
        {
          name: '❤️ พลังชีวิต',
          value: `**Max HP:** ${Number(stats.hp || 0).toLocaleString()}`,
          inline: false
        },
        {
          name: '⚔️ สเตตัสการโจมตี',
          value: `• **P.Atk:** ${Number(stats.patk || 0).toLocaleString()} | **M.Atk:** ${Number(stats.matk || 0).toLocaleString()}\n` +
                 `• **P.DMG Bonus:** ${Number(stats.p_dmg_bonus || 0)}% | **M.DMG Bonus:** ${Number(stats.m_dmg_bonus || 0)}%\n` +
                 `• **Ignore P.DEF:** ${Number(stats.ignore_pdef || 0).toLocaleString()} | **Ignore M.DEF:** ${Number(stats.ignore_mdef || 0).toLocaleString()}`,
          inline: false
        },
        {
          name: '🛡️ สเตตัสการป้องกัน',
          value: `• **P.DEF:** ${Number(stats.def || 0).toLocaleString()} | **M.DEF:** ${Number(stats.mdef || 0).toLocaleString()}\n` +
                 `• **P.Reduction:** ${Number(stats.p_reduc || 0)}% | **M.Reduction:** ${Number(stats.m_reduc || 0)}%`,
          inline: false
        },
        {
          name: '🥊 สเตตัส PVP',
          value: `• **PVP Dmg:** ${Number(stats.min_pvp_dmg || 0).toLocaleString()}\n` +
                 `• **PVP Reduction:** ${Number(stats.min_pvp_reduction || 0).toLocaleString()}`,
          inline: false
        },
        {
          name: '🕒 อัปเดตสเตตัสล่าสุด',
          value: lastUpdatedText,
          inline: false
        }
      );
    }

    embed.setFooter({ text: 'Windfall Guild Management System' }).setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in profile command:', error);
    return interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ครับ' });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('ดูข้อมูลโปรไฟล์และสเตตัสตัวละคร')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('เลือกสมาชิกที่ต้องการดูข้อมูล (เว้นว่างไว้เพื่อดูของตัวเอง)')
        .setRequired(false)
    ),
  execute: handleProfileCommand,
  handleProfileCommand
};
