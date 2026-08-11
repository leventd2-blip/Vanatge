module.exports = {
    token: process.env.TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    verifiedRoleId: process.env.VERIFIED_ROLE_ID,
    owners: process.env.OWNERS ? process.env.OWNERS.split(',').map(id => id.trim()) : []
};
