const { EmbedBuilder } = require('discord.js');

// ที่เก็บข้อมูลชั่วคราวก่อนกดเซฟ (เก็บตาม Discord ID)
const tempStatsCache = new Map();
// ระบบจัดการ Memory (ลบข้อมูลทิ้งเมื่อไม่ได้ใช้งานเกินเวลา)
const tempStatsTimeouts = new Map();

function resetCacheTimeout(discordId) {
  if (tempStatsTimeouts.has(discordId)) clearTimeout(tempStatsTimeouts.get(discordId));
  const timeout = setTimeout(() => {
    tempStatsCache.delete(discordId);
    tempStatsTimeouts.delete(discordId);
    console.log(`🧹 เคลียร์แคชขยะของ ${discordId} เรียบร้อยแล้ว (เกิน 15 นาที)`);
  }, 15 * 60 * 1000); // 15 นาที
  tempStatsTimeouts.set(discordId, timeout);
}

// ฟังก์ชันช่วยจัดหน้าตาข้อความสเตตัสเป็น Embed
function generateStatEmbed(stats, color = '#F1C40F') {
  const className = stats.gameClass ? ` - ${stats.gameClass}` : '';
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`📊 รายละเอียดสเตตัสตัวละคร${className}`)
    .setDescription(
      `ข้อมูลสเตตัสปัจจุบันของคุณ\n` +
      `\n\`\`\`\nกรุณาเลือกหมวดหมู่จากเมนูด้านล่างเพื่อกรอกข้อมูล เมื่อครบแล้วกดยืนยัน\n\`\`\`\n\n` +
      `❤️ **Max HP:** ${Number(stats.hp || 0).toLocaleString()}\n\n` +
      `**สเตตัสโจมตี**\n` +
      `🗡️ **P.Atk:** ${Number(stats.patk || 0).toLocaleString()} | 🔮 **M.Atk:** ${Number(stats.matk || 0).toLocaleString()}\n` +
      `💥 **P.DMG Bonus:** ${Number(stats.p_dmg_bonus || 0)}% | ✨ **M.DMG Bonus:** ${Number(stats.m_dmg_bonus || 0)}%\n` +
      `🗡️ **Ignore P.DEF:** ${Number(stats.ignore_pdef || 0).toLocaleString()} | 🔮 **Ignore M.DEF:** ${Number(stats.ignore_mdef || 0).toLocaleString()}\n\n` +
      `**สเตตัสป้องกัน**\n` +
      `🛡️ **P.DEF:** ${Number(stats.def || 0).toLocaleString()} | 🛡️ **M.DEF:** ${Number(stats.mdef || 0).toLocaleString()}\n` +
      `📉 **P.Reduction:** ${Number(stats.p_reduc || 0)}% | 📉 **M.Reduction:** ${Number(stats.m_reduc || 0)}%\n\n` +
      `**สเตตัส PVP**\n` +
      `🥊 **PVP Dmg:** ${Number(stats.min_pvp_dmg || 0).toLocaleString()}\n` +
      `🔰 **PVP Reduction:** ${Number(stats.min_pvp_reduction || 0).toLocaleString()}`
    );
}

// ฟังก์ชันทำความสะอาดตัวเลข (ลบ , และ %)
function cleanNumber(str) {
  if (!str) return 0;
  return Number(String(str).replace(/,/g, '').replace(/%/g, '').trim()) || 0;
}

const CLASS_CHOICES = [
  { name: 'Lord Knight', value: 'Lord Knight' }, { name: 'Paladin', value: 'Paladin' },
  { name: 'High Wizard', value: 'High Wizard' }, { name: 'Sage', value: 'Sage' },
  { name: 'Mastersmith', value: 'Mastersmith' }, { name: 'Biochemist', value: 'Biochemist' },
  { name: 'High Priest', value: 'High Priest' }, { name: 'Champion', value: 'Champion' },
  { name: 'Assassin Cross', value: 'Assassin Cross' }, { name: 'Stalker', value: 'Stalker' },
  { name: 'Sniper', value: 'Sniper' }, { name: 'Minstrel', value: 'Minstrel' },
  { name: 'Gypsy', value: 'Gypsy' }, { name: 'Apprentice', value: 'Apprentice' },
  { name: 'Rebellion', value: 'Rebellion' }
];

async function assignClassRole(target, newClass) {
  try {
    if (!target || !newClass || newClass === 'ยังไม่ระบุ') return;

    let member = null;
    let guild = null;

    // รองรับทั้งแบบส่ง interaction เข้ามา หรือส่ง member เข้ามาโดยตรง
    if (target.member && target.guild) {
      member = target.member;
      guild = target.guild;
    } else if (target.guild && target.roles) {
      member = target;
      guild = target.guild;
    }

    if (!member || !guild) return;

    // ดึงข้อมูล Member & Roles ล่าสุดจาก Discord API เพื่อป้องกันปัญหา Cache เก่าหรือไม่ครบ
    const freshMember = await guild.members.fetch(member.id).catch(() => member);
    const allRoles = await guild.roles.fetch().catch(() => guild.roles.cache);

    // ตรวจสอบสิทธิ์ของบอท
    const botMember = await guild.members.fetch(guild.client.user.id).catch(() => null);
    if (!botMember) return;

    // หากผู้ใช้เป็นเจ้าของเซิร์ฟเวอร์ หรือมียศสูงกว่า/เท่ากับบอท Discord จะไม่อนุญาตให้แก้ไข
    if (freshMember.id === guild.ownerId || (botMember.roles.highest.position <= freshMember.roles.highest.position && freshMember.id !== botMember.id)) {
      console.warn(`⚠️ [Role] บอทไม่สามารถเปลี่ยน Role ให้ ${freshMember.user?.tag || freshMember.id} เนื่องจากมียศสูงกว่าหรือเป็นเจ้าของเซิร์ฟเวอร์`);
      return;
    }

    const classRoleNames = CLASS_CHOICES.map(c => c.value.trim().toLowerCase());
    const targetClassName = newClass.trim().toLowerCase();

    // ดึง Roles ปัจจุบันของ User ที่ตรงกับรายชื่ออาชีพ (ยกเว้นอาชีพใหม่ที่ต้องการใส่)
    const memberRolesList = freshMember.roles.cache.values 
      ? Array.from(freshMember.roles.cache.values()) 
      : (Array.isArray(freshMember.roles.cache) ? freshMember.roles.cache : []);

    const rolesToRemove = memberRolesList.filter(role => 
      classRoleNames.includes(role.name.trim().toLowerCase()) &&
      role.name.trim().toLowerCase() !== targetClassName
    );

    // ถอด Role อาชีพเดิมออก
    for (const role of rolesToRemove) {
      const roleId = role.id;
      await freshMember.roles.remove(roleId).catch(err => {
        console.error(`❌ [Role] ถอด Role เดิม (${role.name}) ไม่สำเร็จ:`, err.message);
      });
    }

    // เพิ่ม Role อาชีพใหม่ (จับคู่แบบไม่สนตัวพิมพ์เล็ก-ใหญ่และเว้นวรรค)
    const allRolesList = allRoles.values 
      ? Array.from(allRoles.values()) 
      : (Array.isArray(allRoles) ? allRoles : []);

    const newRole = allRolesList.find(role => role.name.trim().toLowerCase() === targetClassName);
    if (newRole) {
      const hasRoleAlready = freshMember.roles.cache.has 
        ? freshMember.roles.cache.has(newRole.id) 
        : memberRolesList.some(r => r.id === newRole.id);

      if (!hasRoleAlready) {
        await freshMember.roles.add(newRole).catch(err => {
          console.error(`❌ [Role] เพิ่ม Role (${newRole.name}) ให้ ${freshMember.user?.tag} ไม่สำเร็จ:`, err.message);
        });
        console.log(`✅ [Role] มอบ Role "${newRole.name}" ให้กับ ${freshMember.user?.tag || freshMember.id} สำเร็จ`);
      }
    } else {
      console.warn(`⚠️ [Role] ไม่พบ Role ชื่อ "${newClass}" ในเซิร์ฟเวอร์ ${guild.name}`);
    }
  } catch (error) {
    console.error('Error in assignClassRole:', error);
  }
}

// แผนผังตัวย่ออาชีพ (ตัวพิมพ์ใหญ่ทั้งหมด)
const CLASS_ABBREVIATIONS = {
  'Lord Knight': 'LK', 'Paladin': 'PALA', 'High Wizard': 'WIZ', 'Sage': 'SAGE',
  'Mastersmith': 'MS', 'Biochemist': 'BIO', 'High Priest': 'PRIEST', 'Champion': 'CHAMP',
  'Assassin Cross': 'ASS', 'Stalker': 'STALKER', 'Sniper': 'SNI', 'Minstrel': 'BARD',
  'Gypsy': 'DANCER', 'Apprentice': 'CAT', 'Rebellion': 'GUN', 'ยังไม่ระบุ': '-'
};

// ฟังก์ชันซิงค์ชื่อ Discord กับในเกม
async function syncNickname(target, nickname, gameClass) {
  try {
    if (!target || !nickname) return;

    let member = null;
    let guild = null;

    if (target.member && target.guild) {
      member = target.member;
      guild = target.guild;
    } else if (target.guild && target.roles) {
      member = target;
      guild = target.guild;
    }

    if (!member || !guild) return;

    const freshMember = await guild.members.fetch(member.id).catch(() => member);
    if (!freshMember.manageable) {
      console.warn(`⚠️ [Nickname] บอทไม่มีสิทธิ์เปลี่ยนชื่อให้ ${freshMember.user?.tag || freshMember.id}`);
      return;
    }

    let newNickname = nickname;
    if (gameClass && gameClass !== 'ยังไม่ระบุ') {
      const abbr = (CLASS_ABBREVIATIONS[gameClass] || gameClass).toUpperCase();
      newNickname = `[${abbr}] ${nickname}`;
    }

    // จำกัดความยาวชื่อไม่เกิน 32 ตัวอักษรตามข้อจำกัดของ Discord
    if (newNickname.length > 32) {
      newNickname = newNickname.substring(0, 32);
    }

    if (freshMember.nickname !== newNickname) {
      await freshMember.setNickname(newNickname).catch(err => {
        console.error(`❌ [Nickname] ไม่สามารถเปลี่ยนชื่อให้ ${freshMember.user?.tag}:`, err.message);
      });
      console.log(`✅ [Nickname] เปลี่ยนชื่อให้ ${freshMember.user?.tag || freshMember.id} เป็น "${newNickname}" สำเร็จ`);
    }
  } catch (error) {
    console.error('Error in syncNickname:', error);
  }
}

// ฟังก์ชันส่งแจ้งเตือน Error ไปยังห้อง Dev
async function sendErrorLog(client, error, context = 'Unknown Context') {
  try {
    const devChannelId = process.env.DEV_LOG_CHANNEL_ID;
    if (!devChannelId) return;

    // ถ้า client ยังไม่พร้อมออนไลน์ ให้ข้ามไปก่อนเพื่อป้องกัน Timeout
    if (!client || typeof client.isReady !== 'function' || !client.isReady()) return;

    // ดึงห้องจาก Cache ก่อน ถ้าไม่มีค่อย fetch จาก Discord API
    const channel = client.channels.cache.get(devChannelId) || await client.channels.fetch(devChannelId).catch(() => null);
    if (!channel) return;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error && error.stack ? error.stack : 'No stack trace available';

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('🚨 Bot Error Alert')
      .addFields(
        { name: 'Context', value: `\`${context}\``, inline: false },
        { name: 'Message', value: `\`\`\`${errorMessage.substring(0, 1000)}\`\`\``, inline: false },
        { name: 'Stack Trace', value: `\`\`\`js\n${errorStack.substring(0, 1000)}\n\`\`\``, inline: false }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(err => {
      console.warn('⚠️ [sendErrorLog] ไม่สามารถส่งข้อความแจ้งเตือน Error ไปยัง Discord ได้:', err.message);
    });
  } catch (err) {
    console.warn('⚠️ Failed to send error log to Dev Channel:', err.message || err);
  }
}

module.exports = {
  tempStatsCache,
  tempStatsTimeouts,
  resetCacheTimeout,
  generateStatEmbed,
  cleanNumber,
  CLASS_CHOICES,
  assignClassRole,
  syncNickname,
  sendErrorLog
};
