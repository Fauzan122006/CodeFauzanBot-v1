const { userData, saveData } = require('../utils/functions');
const { handleAchievements } = require('../utils/achievementHandler');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            const userId = newState.id || oldState.id; // ID user
            const guildId = newState.guild.id || oldState.guild.id;
            console.log(`[VoiceStateUpdate] Processing voice state update for user ${userId} in guild ${guildId}`);

            // Inisialisasi user data kalau belum ada
            if (!userData[userId]) {
                userData[userId] = {
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
                    isBooster: false
                };
            }

            // User join voice channel
            if (!oldState.channelId && newState.channelId) {
                userData[userId].voiceJoinTime = Date.now();
                console.log(`[VoiceStateUpdate] User ${userId} joined voice channel`);
            }

            // User leave voice channel
            if (oldState.channelId && !newState.channelId) {
                const joinTime = userData[userId].voiceJoinTime;
                if (joinTime) {
                    const timeSpent = Math.floor((Date.now() - joinTime) / 1000); // Waktu dalam detik
                    userData[userId].voiceTime = (userData[userId].voiceTime || 0) + timeSpent;
                    userData[userId].voiceJoinTime = null;
                    console.log(`[VoiceStateUpdate] User ${userId} left voice channel. Time spent: ${timeSpent}s, Total voiceTime: ${userData[userId].voiceTime}s`);

                    // Handle achievements (berbasis voice)
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