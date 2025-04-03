const { userData } = require('../utils/userDataHandler');

const log = (module, message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${module}] ${message}`);
};

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        try {
            if (newMember.premiumSince && !oldMember.premiumSince) {
                const userId = newMember.id;
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
                    log('GuildMemberUpdate', `Initialized user data for ${userId}`);
                }
                userData[userId].isBooster = true;
                log('GuildMemberUpdate', `User ${userId} started boosting guild ${newMember.guild.id}`);
            }
        } catch (error) {
            log('GuildMemberUpdate', `Error in guildMemberUpdate event for user ${newMember.id}: ${error.message}`);
        }
    },
};