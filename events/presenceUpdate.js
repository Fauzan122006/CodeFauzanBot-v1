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
                    guilds: {}
                };
            }

            // Only track game time if activity changed
            if (newPresence.activities.some(activity => activity.type === 'PLAYING')) {
                if (!oldPresence || !oldPresence.activities.some(activity => activity.type === 'PLAYING')) {
                    // User just started playing
                    userData[userId].gameStartTime = Date.now();
                }
            } else if (userData[userId].gameStartTime) {
                // User stopped playing, calculate time
                const gameTime = Math.floor((Date.now() - userData[userId].gameStartTime) / 1000);
                userData[userId].totalGameTime = (userData[userId].totalGameTime || 0) + gameTime;
                delete userData[userId].gameStartTime;
            }
        } catch (error) {
            // Silent fail
        }
    },
};