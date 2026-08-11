const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const config = require('./config');

// Mini Express server for Render port requirements
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Vanatge Bot is online and running!');
});

app.listen(PORT, () => {
    console.log(`[Web] Server is listening on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Required for . commands to work
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

// DM owners when ANY new bot joins the server
client.on('guildMemberAdd', async member => {
    if (!member.user.bot) return;

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

    if (content === '.ping') {
        if (!config.owners.includes(message.author.id)) {
            return message.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }

        const sent = await message.reply('Pinging...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(`🏓 Pong! Latency: **${latency}ms**. API Latency: **${Math.round(client.ws.ping)}ms**.`);
    }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'verify') {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('instant_verify')
                        .setLabel('Verify')
                        .setStyle(ButtonStyle.Success)
                );

            // PUBLIC reply so everyone can see the verify button panel
            await interaction.reply({
                content: 'Click the button below to verify instantly and get access to the Server:',
                components: [row]
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
