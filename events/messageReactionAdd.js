const { userData } = require('../utils/functions');

const log = (module, message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${module}] ${message}`);
};

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        try {
            if (user.bot) return;

            const userId = user.id;
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
                log('MessageReactionAdd', `Initialized user data for ${userId}`);
            }

            userData[userId].reactionCount = (userData[userId].reactionCount || 0) + 1;
            log('MessageReactionAdd', `User ${userId} added a reaction. Total reactions: ${userData[userId].reactionCount}`);
        } catch (error) {
            log('MessageReactionAdd', `Error in messageReactionAdd event for user ${user.id}: ${error.message}`);
        }
    },
};