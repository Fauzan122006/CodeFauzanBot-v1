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

            console.log(`[VoiceStateUpdate] Processing voice state update for user ${userId} in guild ${guildId}`);

            // Inisialisasi userData jika belum ada
            if (!userData[userId]) {
                userData[userId] = { guilds: {} };
            }
            if (!userData[userId].guilds[guildId]) {
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
                console.log(`[VoiceStateUpdate] User ${userId} joined voice channel`);
            }

            // User keluar dari voice channel
            if (oldState.channelId && !newState.channelId) {
                const joinTime = userData[userId].guilds[guildId].voiceJoinTime;
                if (joinTime) {
                    const timeSpent = Math.floor((Date.now() - joinTime) / 1000);
                    userData[userId].guilds[guildId].voiceTime = (userData[userId].guilds[guildId].voiceTime || 0) + timeSpent;
                    userData[userId].guilds[guildId].voiceJoinTime = null;
                    console.log(`[VoiceStateUpdate] User ${userId} left voice channel. Time spent: ${timeSpent}s, Total voiceTime: ${userData[userId].guilds[guildId].voiceTime}s`);

                    await handleAchievements(userId, newState.guild, 'voice');
                }
            }

            saveData();
            console.log(`[VoiceStateUpdate] Data saved for user ${userId}`);
        } catch (error) {
            console.error('[VoiceStateUpdate] Error in voiceStateUpdate:', error);
        }
    },
};