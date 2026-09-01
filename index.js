const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 1. เช็คว่าเป็นโหมด Development หรือ Production
// ค่าเริ่มต้นคือ Production (สำหรับ Discloud และ Production Server)
// หากต้องการรัน Dev ให้ใช้คำสั่ง 'npm run start:dev' หรือส่ง argument 'dev'
const isDev = process.argv.includes('dev') || process.env.NODE_ENV === 'development';

let envFile = '.env';
if (isDev && fs.existsSync(path.join(__dirname, '.env.dev'))) {
  envFile = '.env.dev';
}

dotenv.config({ path: path.join(__dirname, envFile), override: true });

// กำหนด NODE_ENV ให้ตรงกับโหมด
process.env.NODE_ENV = isDev ? 'development' : 'production';

console.log(`🔧 กำลังโหลดการตั้งค่าจากไฟล์: ${envFile} (โหมด: ${process.env.NODE_ENV})`);

const { Client, GatewayIntentBits, Collection } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // สำคัญ: ต้องไปเปิด Server Members Intent ใน Discord Developer Portal
  ],
  rest: {
    timeout: 30000, // เพิ่มเวลารอการตอบสนองเป็น 30 วินาที เพื่อรองรับช่วง Cloud Network ช้า
    retries: 5,     // ลองส่งใหม่สูงสุด 5 ครั้งอัตโนมัติ
  },
});

client.commands = new Collection();

// โหลด Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// โหลด Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// --- ป้องกันบอทดับจาก Error ที่ไม่ได้ Catch ---
const { sendErrorLog } = require('./utils/helpers');
process.on('unhandledRejection', async (error) => {
  console.error('Unhandled promise rejection:', error);
  await sendErrorLog(client, error, 'Unhandled Rejection (Global)');
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await sendErrorLog(client, error, 'Uncaught Exception (Global)');
});

// ฟังก์ชันเริ่มการทำงานของบอทพร้อมระบบเชื่อมต่อใหม่อัตโนมัติเมื่อเกิด Network Timeout
async function startBot() {
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ ไม่สามารถล็อกอินเข้า Discord ได้ (อาจเกิดจาก Network ชั่วขณะ):', error.message || error);
    console.log('🔄 ระบบจะลองเชื่อมต่อใหม่อีกครั้งใน 5 วินาที...');
    setTimeout(startBot, 5000);
  }
}

startBot();