const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('./config');
const { startServer } = require('./server');
const { getDb } = require('./database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once('ready', () => {
    console.log(`[Bot] Logged in as ${client.user.tag}!`);
    startServer(client);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const isOwner = config.owners.includes(message.author.id);

    // .verify Command
    if (message.content === '.verify') {
        if (!isOwner) return message.reply('You do not have permission to use this command.');

        const oauthUrl = config.verifyUrl;

        const embed = new EmbedBuilder()
            .setTitle('Server Verification')
            .setDescription('Click the button below to authorize the external app and complete your verification.')
            .setColor(0x00FF00);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Verify (External App)')
                .setStyle(ButtonStyle.Link)
                .setURL(oauthUrl)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {});
    }

    // .pullall Command
    if (message.content === '.pullall') {
        if (!isOwner) return message.reply('You do not have permission to use this command.');

        const targetGuildId = message.guild.id;
        const db = getDb();

        if (db.length === 0) {
            return message.reply('No verified users found in the database yet.');
        }

        await message.reply('Processing `.pullall`... Adding verified users to this server. Please wait.');

        let addedCount = 0;
        let failedCount = 0;
        let addedUsersList = [];

        for (const user of db) {
            try {
                const response = await fetch(`https://discord.com/api/guilds/${targetGuildId}/members/${user.id}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bot ${config.token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        access_token: user.access_token,
                    }),
                });

                if (response.ok || response.status === 204) {
                    addedCount++;
                    addedUsersList.push(`- <@${user.id}> (${user.username})`);
                } else {
                    failedCount++;
                }
            } catch (err) {
                console.error(`Failed to add user ${user.id}:`, err);
                failedCount++;
            }
        }

        // Send summary DM to owner
        try {
            const summaryEmbed = new EmbedBuilder()
                .setTitle('Pullall Execution Summary')
                .setDescription(`Successfully processed users for server: **${message.guild.name}**.`)
                .addFields(
                    { name: 'Successfully Added', value: `${addedCount}`, inline: true },
                    { name: 'Failed / Skipped', value: `${failedCount}`, inline: true },
                    { name: 'Added Users', value: addedUsersList.length > 0 ? addedUsersList.join('\n') : 'None' }
                )
                .setColor(0x0099FF)
                .setTimestamp();

            await message.author.send({ embeds: [summaryEmbed] });
        } catch (dmErr) {
            console.error('Could not send DM to owner:', dmErr);
            message.channel.send(`${message.author}, I tried to DM you the summary, but your DMs are closed! Successfully added: ${addedCount}`);
        }
    }
});

client.login(config.token);
