const { userData } = require('../utils/userDataHandler');

const log = (module, message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${module}] ${message}`);
};

module.exports = {
    name: 'presenceUpdate',
    async execute(oldPresence, newPresence) {
        try {
            if (!newPresence || newPresence.user.bot) return;

            const userId = newPresence.user.id;
            if (!userData[userId]) {
                userData[userId] = {
                    xp: 0,
                    level: 0,
                    messageCount: 0,
                    achievements: [],
                    activeTime: 0,
                    voiceTime: 0,
                    lastActive: Date.now(),
                    joinDate: Date.now(),
                    reactionCount: 0,
                    memeCount: 0,
                    supportMessages: 0,
                    gameTime: 0,
                    eventCount: 0,
                    isBooster: false
                };
                log('PresenceUpdate', `Initialized user data for ${userId}`);
            }

            if (newPresence.activities.some(activity => activity.type === 'PLAYING')) {
                userData[userId].gameTime = (userData[userId].gameTime || 0) + 60; // Tambah 1 menit
                log('PresenceUpdate', `User ${userId} is playing a game. Total game time: ${userData[userId].gameTime}s`);
            }
        } catch (error) {
            log('PresenceUpdate', `Error in presenceUpdate event for user ${newPresence?.user?.id || 'unknown'}: ${error.message}`);
        }
    },
};