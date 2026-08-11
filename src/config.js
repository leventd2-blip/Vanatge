require('dotenv').config();

module.exports = {
    token: process.env.TOKEN,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
    guildId: process.env.GUILD_ID,
    verifiedRoleId: process.env.VERIFIED_ROLE_ID,
    owners: process.env.OWNERS ? process.env.OWNERS.split(',').map(id => id.trim()) : [],
    verifyUrl: process.env.VERIFY_URL
};
