const { userData, initUser, saveData } = require('../utils/userDataHandler');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        try {
            if (user.bot) return;

            const userId = user.id;
            const guildId = reaction.message.guild?.id;
            
            if (!guildId) return;

            // Initialize user if needed
            initUser(userId, guildId);

            // Track reactions given
            if (userData[userId]?.guilds?.[guildId]) {
                userData[userId].guilds[guildId].reactionsGiven = (userData[userId].guilds[guildId].reactionsGiven || 0) + 1;
                saveData();
            }
        } catch (error) {
            console.error('[MessageReactionAdd] Error:', error);
        }
    },
};