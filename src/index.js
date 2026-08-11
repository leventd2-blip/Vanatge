const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');
const config = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', async () => {
    console.log(`[Bot] Logged in as ${client.user.tag}!`);

    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
        const commands = [
            new SlashCommandBuilder()
                .setName('verify')
                .setDescription('Sends the verification panel'),
            new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Check bot latency (Owner Only)')
        ].map(command => command.toJSON());

        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands },
        );
        console.log('[Bot] Slash commands registered successfully.');
    } catch (error) {
        console.error(error);
    }
});

// DM owners when ANY new bot joins your server (Vanatge's server)
client.on('guildMemberAdd', async member => {
    // Check if the user that joined is a bot
    if (!member.user.bot) return;

    // Optional: If you want this to only trigger in your specific main server, 
    // uncomment the line below and replace YOUR_GUILD_ID with that server's ID:
    // if (member.guild.id !== 'YOUR_GUILD_ID') return;

    const ownerMessage = `🤖 **New Bot Joined Server!**\n* **Bot Name:** ${member.user.tag}\n* **Server:** ${member.guild.name}\n* **Bot ID:** ${member.id}`;
    
    for (const ownerId of config.owners) {
        try {
            const ownerUser = await client.users.fetch(ownerId);
            if (ownerUser) {
                await ownerUser.send(ownerMessage);
            }
        } catch (err) {
            console.error(`Could not DM owner ${ownerId}:`, err);
        }
    }
});

// Text commands: .verify and owner-only .ping
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();

    // .verify command
    if (content === '.verify') {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('instant_verify')
                    .setLabel('Verify')
                    .setStyle(ButtonStyle.Success)
            );

        await message.channel.send({
            content: 'Click the button below to verify instantly and get your role:',
            components: [row]
        });
    }

    // .ping command (Owner Only)
    if (content === '.ping') {
        if (!config.owners.includes(message.author.id)) {
            return message.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }

        const sent = await message.reply('Pinging...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(`🏓 Pong! Latency: **${latency}ms**. API Latency: **${Math.round(client.ws.ping)}ms**.`);
    }
});

// Handle interactions (Slash commands + Button clicks)
client.on('interactionCreate', async interaction => {
    // Slash commands
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'verify') {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('instant_verify')
                        .setLabel('Verify')
                        .setStyle(ButtonStyle.Success)
                );

            await interaction.reply({
                content: 'Click the button below to verify instantly and get your role:',
                components: [row],
                ephemeral: true
            });
        }

        if (interaction.commandName === 'ping') {
            if (!config.owners.includes(interaction.user.id)) {
                return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
            }

            const latency = Date.now() - interaction.createdTimestamp;
            await interaction.reply({ content: `🏓 Pong! Latency: **${latency}ms**. API Latency: **${Math.round(client.ws.ping)}ms**.`, ephemeral: true });
        }
    }

    // Instant role-assignment button
    if (interaction.isButton() && interaction.customId === 'instant_verify') {
        try {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            await member.roles.add(config.verifiedRoleId);

            await interaction.reply({
                content: '✅ You have been successfully verified and given the role!',
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: '❌ Failed to give you the role. Make sure the bot role is higher than the verified role in server settings!',
                ephemeral: true
            });
        }
    }
});

client.login(config.token);
