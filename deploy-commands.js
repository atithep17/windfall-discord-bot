const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 1. เช็คว่าโหลด .env (Prod) หรือ .env.dev (Dev)
const isDev = process.argv.includes('dev') || process.env.NODE_ENV === 'development';
const envFile = (isDev && fs.existsSync(path.join(__dirname, '.env.dev'))) ? '.env.dev' : '.env';
dotenv.config({ path: path.join(__dirname, envFile), override: true });
process.env.NODE_ENV = isDev ? 'development' : 'production';

console.log(`🔧 Deploy Commands: กำลังโหลดการตั้งค่าจากไฟล์: ${envFile} (โหมด: ${isDev ? '🟢 DEVELOPMENT' : '🔴 PRODUCTION'})`);

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // Optional: If provided, will deploy only to this guild (faster updates). If not, deploys globally.

if (!token || !clientId) {
    console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in environment variables.');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        let data;
        if (guildId) {
            // Deploy to a specific guild (updates instantly)
            console.log(`Deploying to Guild: ${guildId}...`);
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
        } else {
            // Deploy globally (can take up to an hour to cache across all servers)
            console.log(`Deploying Globally...`);
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
        }

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('❌ Error deploying commands:');
        console.error(error);
    }
})();
