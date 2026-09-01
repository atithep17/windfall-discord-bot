const { db } = require('../firebase');
const { EmbedBuilder } = require('discord.js');
const memberService = require('./memberService');
const { assignClassRole, syncNickname } = require('../utils/helpers');

/**
 * ติดตามคิวการส่งแจ้งเตือน (DM / Webhook) จาก Firestore แบบ Realtime
 * @param {import('discord.js').Client} client 
 */
function initNotificationQueue(client) {
  console.log('📡 เริ่มต้นระบบ Discord Notification Queue Listener...');

  const processedIds = new Set();

  // ดักจับ Document ใน collection 'discord_queue' ที่มีสถานะ 'PENDING'
  db.collection('discord_queue')
    .where('status', '==', 'PENDING')
    .onSnapshot(async (snapshot) => {
      if (snapshot.empty) return;

      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added' && change.type !== 'modified') continue;

        const docSnap = change.doc;
        const docId = docSnap.id;

        if (processedIds.has(docId)) continue;

        const item = docSnap.data();
        if (item.status !== 'PENDING') continue;

        // ป้องกันการส่งซ้ำระดับ In-Memory
        processedIds.add(docId);

        try {
          // ใช้ Transaction ตรวจสอบและ Lock สถานะแบบ Atomic
          let shouldProcess = false;
          await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(docSnap.ref);
            if (freshDoc.exists && freshDoc.data().status === 'PENDING') {
              transaction.update(docSnap.ref, { status: 'PROCESSING', processedAt: new Date() });
              shouldProcess = true;
            }
          });

          if (!shouldProcess) continue;

          if (item.type === 'DM' && item.recipientId) {
            const user = await client.users.fetch(item.recipientId).catch(() => null);

            if (!user) {
              await docSnap.ref.update({ 
                status: 'FAILED', 
                error: 'ไม่พบผู้ใช้หรือ User ID ไม่ถูกต้อง', 
                failedAt: new Date() 
              });
              continue;
            }

            const embed = new EmbedBuilder()
              .setColor(item.color || '#3498DB')
              .setTitle(item.title || '📢 แจ้งเตือนจากกิลด์ Windfall')
              .setFooter({ text: 'Windfall Guild Management System' })
              .setTimestamp();

            if (item.description && typeof item.description === 'string' && item.description.trim()) {
              embed.setDescription(item.description.trim());
            }

            if (item.fields && Array.isArray(item.fields)) {
              embed.addFields(item.fields.filter(f => f && f.name && f.value));
            }

            await user.send({ embeds: [embed] });

            await docSnap.ref.update({ 
              status: 'SENT', 
              sentAt: new Date() 
            });

            console.log(`✅ [Queue] ส่งข้อความ DM ให้กับ ${user.tag} (${item.recipientId}) เรียบร้อยแล้ว`);

            // ซิงค์ Role อาชีพและชื่อในเซิร์ฟเวอร์กิลด์อัตโนมัติเมื่อได้รับการอนุมัติ
            try {
              const memberDoc = await memberService.getMemberByDiscordId(item.recipientId);
              if (memberDoc) {
                const mData = memberDoc.data();
                for (const [guildId, guild] of client.guilds.cache) {
                  const guildMember = await guild.members.fetch(item.recipientId).catch(() => null);
                  if (guildMember) {
                    if (mData.gameClass && mData.gameClass !== 'ยังไม่ระบุ') {
                      await assignClassRole(guildMember, mData.gameClass);
                    }
                    if (mData.nickname) {
                      await syncNickname(guildMember, mData.nickname, mData.gameClass);
                    }
                  }
                }
              }
            } catch (roleErr) {
              console.error('❌ [Queue] ไม่สามารถซิงค์ Role/Nickname ตอนอนุมัติได้:', roleErr);
            }
          }
        } catch (error) {
          console.error(`❌ [Queue] เกิดข้อผิดพลาดในการประมวลผล (${docId}):`, error);
          await docSnap.ref.update({ 
            status: 'FAILED', 
            error: error.message || 'ส่งข้อความไม่สำเร็จ', 
            failedAt: new Date() 
          });
        }
      }
    }, (error) => {
      console.error('❌ [Queue] Firestore Snapshot Error:', error);
    });
}

module.exports = { initNotificationQueue };
