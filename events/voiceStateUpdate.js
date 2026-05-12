const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { handleAchievements } = require('../utils/achievementHandler');
const { createLogger } = require('../utils/logger');

const log = createLogger('VoiceStateUpdate');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            const userId = newState.id || oldState.id;
            const guildId = newState.guild?.id || oldState.guild?.id;
            const member = newState.member || oldState.member;

            // Validasi userId dan guildId
            if (!userId || !guildId) {
                log.error('Invalid identifiers', { userId, guildId });
                return;
            }

            if (member?.user?.bot) {
                return;
            }

            initUser(userId, guildId);
            const guildUser = userData[userId]?.guilds?.[guildId];
            if (!guildUser) return;

            // User bergabung ke voice channel
            if (!oldState.channelId && newState.channelId) {
                guildUser.voiceJoinTime = Date.now();
                
                // Track event if it's a stage channel or event
                const channel = newState.channel;
                if (channel && (channel.type === 13 || channel.name.toLowerCase().includes('event'))) {
                    guildUser.eventCount = (guildUser.eventCount || 0) + 1;
                }
            }

            // User keluar dari voice channel
            if (oldState.channelId && !newState.channelId) {
                const joinTime = guildUser.voiceJoinTime;
                if (joinTime) {
                    const timeSpent = Math.floor((Date.now() - joinTime) / 1000);
                    guildUser.voiceTime = (guildUser.voiceTime || 0) + timeSpent;
                    guildUser.voiceJoinTime = null;

                    // Only check achievements if time spent is significant
                    if (timeSpent > 60) {
                        await handleAchievements(userId, newState.guild, 'voice');
                    }
                }
            }

            saveData();
        } catch (error) {
            log.error('Unhandled error', { error: error.message });
        }
    },
};
