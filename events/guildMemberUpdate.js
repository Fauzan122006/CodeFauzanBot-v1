const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { handleAchievements } = require('../utils/achievementHandler');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        try {
            const userId = newMember.id;
            const guildId = newMember.guild.id;

            // Initialize user if needed
            initUser(userId, guildId);

            // Check if user started boosting
            const wasBooster = oldMember.premiumSince !== null;
            const isBooster = newMember.premiumSince !== null;

            if (!wasBooster && isBooster) {
                // User just started boosting!
                if (userData[userId]?.guilds?.[guildId]) {
                    userData[userId].guilds[guildId].isBooster = true;
                    saveData();
                    
                    // Check for server-booster achievement
                    await handleAchievements(userId, newMember.guild, 'boost');
                    
                    console.log(`[GuildMemberUpdate] User ${userId} started boosting server ${guildId}`);
                }
            } else if (wasBooster && !isBooster) {
                // User stopped boosting
                if (userData[userId]?.guilds?.[guildId]) {
                    userData[userId].guilds[guildId].isBooster = false;
                    saveData();
                }
            }
        } catch (error) {
            console.error('[GuildMemberUpdate] Error:', error);
        }
    },
};