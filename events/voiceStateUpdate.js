const { initUser, checkAchievements, userData, saveData } = require('../utils/functions');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const userId = newState.member.id;
        const guild = newState.guild;
        initUser(userId);

        if (!oldState.channelId && newState.channelId) {
            userData[userId].lastJoinTime = Date.now();
        }

        if (oldState.channelId && !newState.channelId) {
            const joinTime = userData[userId].lastJoinTime;
            if (joinTime) {
                const timeSpent = (Date.now() - joinTime) / 1000 / 60;
                userData[userId].voiceTime += timeSpent;

                await checkAchievements(userId, guild);

                saveData();
            }
        }
    },
};