const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { handleAchievements } = require('../utils/achievementHandler');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            const userId = newState.id || oldState.id;
            const guildId = newState.guild?.id || oldState.guild?.id;

            // Validasi userId dan guildId
            if (!userId || !guildId) {
                console.error(`[VoiceStateUpdate] Invalid userId (${userId}) or guildId (${guildId})`);
                return;
            }

            // Inisialisasi userData jika belum ada
            if (!userData[userId]) {
                userData[userId] = { guilds: {} };
            }
            if (!userData[userId]?.guilds?.[guildId]) {
                userData[userId].guilds[guildId] = {
                    xp: 0,
                    level: 1,
                    messageCount: 0,
                    achievements: [],
                    activeTime: 0,
                    voiceTime: 0,
                    voiceJoinTime: null,
                    lastActive: Date.now(),
                    joinDate: Date.now(),
                    reactionCount: 0,
                    reactionsGiven: 0,
                    memeCount: 0,
                    supportMessages: 0,
                    gameTime: 0,
                    eventCount: 0,
                    isBooster: false,
                    coins: 0
                };
            }

            // User bergabung ke voice channel
            if (!oldState.channelId && newState.channelId) {
                userData[userId].guilds[guildId].voiceJoinTime = Date.now();
            }

            // User keluar dari voice channel
            if (oldState.channelId && !newState.channelId) {
                const joinTime = userData[userId].guilds[guildId].voiceJoinTime;
                if (joinTime) {
                    const timeSpent = Math.floor((Date.now() - joinTime) / 1000);
                    userData[userId].guilds[guildId].voiceTime = (userData[userId].guilds[guildId].voiceTime || 0) + timeSpent;
                    userData[userId].guilds[guildId].voiceJoinTime = null;

                    // Only check achievements if time spent is significant
                    if (timeSpent > 60) {
                        await handleAchievements(userId, newState.guild, 'voice');
                    }
                }
            }

            saveData();
        } catch (error) {
            console.error('[VoiceStateUpdate] Error in voiceStateUpdate:', error);
        }
    },
};