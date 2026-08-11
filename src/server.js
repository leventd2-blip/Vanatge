const express = require('express');
const config = require('./config');
const { getDb, saveDb } = require('./database');

function startServer(client) {
    const app = express();
    const PORT = 3000;

    app.get('/callback', async (req, res) => {
        const code = req.query.code;
        if (!code) return res.status(400).send('No authorization code provided.');

        try {
            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: config.redirectUri,
                }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const tokenData = await tokenResponse.json();
            if (!tokenData.access_token) {
                return res.status(400).send('Failed to retrieve access token from Discord.');
            }

            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: { authorization: `Bearer ${tokenData.access_token}` },
            });
            const userData = await userResponse.json();

            const guild = await client.guilds.fetch(config.guildId);
            const member = await guild.members.add(userData.id, {
                accessToken: tokenData.access_token,
            });

            if (config.verifiedRoleId) {
                await member.roles.add(config.verifiedRoleId);
            }

            let db = getDb();
            const existingIndex = db.findIndex(u => u.id === userData.id);
            const userInfo = {
                id: userData.id,
                username: userData.username,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token
            };

            if (existingIndex > -1) {
                db[existingIndex] = userInfo;
            } else {
                db.push(userInfo);
            }
            saveDb(db);

            res.send('<h2>Verification successful! You can now close this window.</h2>');
        } catch (error) {
            console.error('OAuth Error:', error);
            res.status(500).send('An error occurred during verification.');
        }
    });

    app.listen(PORT, () => {
        console.log(`[Web] OAuth2 server running on http://localhost:${PORT}`);
    });
}

module.exports = { startServer };
