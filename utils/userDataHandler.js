const fs = require('fs');
const { userData } = require('./dataManager');

const userDataPath = './database/userData.json';

function initUser(userId, guildId) {
    if (!userData[userId]) userData[userId] = { guilds: {} };
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
}

function saveData() {
    try {
        fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
        console.log('UserData saved successfully from userDataHandler.js');
    } catch (error) {
        console.error('Error saving userData:', error);
    }
}

module.exports = {
    initUser,
    saveData,
    userData
};