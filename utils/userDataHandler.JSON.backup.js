const fs = require('fs');
const { userData } = require('./dataManager');

const userDataPath = './database/userData.json';

// Active time tracking - consider user inactive after 5 minutes
const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

function updateActiveTime(userId, guildId) {
    if (!userData[userId] || !userData[userId].guilds || !userData[userId].guilds[guildId]) {
        return;
    }

    const user = userData[userId].guilds[guildId];
    const now = Date.now();
    
    // If user has lastActiveStart, calculate time since then
    if (user.lastActiveStart) {
        const timeSinceLastActive = now - user.lastActive;
        
        // Only add to activeTime if within inactive threshold
        if (timeSinceLastActive < INACTIVE_THRESHOLD) {
            const sessionTime = Math.floor((now - user.lastActiveStart) / 1000);
            user.activeTime = (user.activeTime || 0) + sessionTime;
        }
    }
    
    // Update tracking
    user.lastActiveStart = now;
    user.lastActive = now;
}

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
            lastActiveStart: null,
            voiceTime: 0,
            voiceJoinTime: null,
            lastActive: Date.now(),
            joinDate: Date.now(),
            reactionCount: 0,
            reactionsGiven: 0,
            memeCount: 0,
            supportMessages: 0,
            totalGameTime: 0,
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
    updateActiveTime,
    userData
};