const { userData } = require('./userDataHandler'); // Impor userData dari userDataHandler

function getRank(userId, guildId) {
    const users = Object.entries(userData)
        .filter(([id, data]) => data.guilds && data.guilds[guildId])
        .map(([id, data]) => ({ id, xp: data.guilds[guildId].xp || 0 }))
        .sort((a, b) => b.xp - a.xp);

    const rank = users.findIndex(user => user.id === userId) + 1;
    return rank || 1;
}

module.exports = {
    getRank
};