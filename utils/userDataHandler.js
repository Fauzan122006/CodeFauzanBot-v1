const fs = require('fs');
const { userData } = require('./dataManager');

const userDataPath = './database/userData.json';

function initUser(userId, guildId) {
    let isNewUser = false;
    
    if (!userData[userId]) {
        userData[userId] = { guilds: {} };
        isNewUser = true;
    }
    
    if (!userData[userId].guilds) {
        userData[userId].guilds = {};
        isNewUser = true;
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
        isNewUser = true;
    }
    
    // Save immediately if new user was created
    if (isNewUser) {
        saveData(true);
        console.log(`[UserDataHandler] Initialized new user ${userId} in guild ${guildId}`);
    }
    
    return userData[userId].guilds[guildId];
}

let saveTimeout = null;

function saveData(immediate = false) {
    if (immediate) {
        try {
            fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
        } catch (error) {
            console.error('[UserDataHandler] Error saving userData:', error);
        }
        return;
    }

    // Debounce: save after 5 seconds of inactivity
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
        } catch (error) {
            console.error('[UserDataHandler] Error saving userData:', error);
        }
    }, 5000);
}

module.exports = {
    initUser,
    saveData,
    userData
};