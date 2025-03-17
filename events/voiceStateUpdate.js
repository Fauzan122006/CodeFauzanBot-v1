const { userData, saveData } = require('../utils/functions');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const userId = newState.id || oldState.id; // ID user
        const guildId = newState.guild.id || oldState.guild.id;

        // Inisialisasi user data kalau belum ada
        if (!userData[userId]) {
            userData[userId] = {
                xp: 0,
                level: 0,
                messageCount: 0,
                achievements: [],
                activeTime: 0,
                voiceTime: 0,
                voiceJoinTime: null // Untuk tracking kapan user join voice
            };
        }

        // User join voice channel
        if (!oldState.channelId && newState.channelId) {
            userData[userId].voiceJoinTime = Date.now();
        }

        // User leave voice channel
        if (oldState.channelId && !newState.channelId) {
            const joinTime = userData[userId].voiceJoinTime;
            if (joinTime) {
                const timeSpent = Math.floor((Date.now() - joinTime) / 1000); // Waktu dalam detik
                userData[userId].voiceTime = (userData[userId].voiceTime || 0) + timeSpent;
                userData[userId].voiceJoinTime = null;
            }
        }

        saveData();
    },
};