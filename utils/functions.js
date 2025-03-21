const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { config, userData, achievementList } = require('./dataManager');

const userDataPath = './database/userData.json';

function initUser(userId) {
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
}

function getRequiredXP(level) {
    return (level * 100) + 1000;
}

function getRank(userId) {
    // Ambil semua user dan sort berdasarkan XP
    const users = Object.entries(userData)
        .map(([id, data]) => ({ id, xp: data.xp || 0 }))
        .sort((a, b) => b.xp - a.xp);

    // Cari rank user
    const rank = users.findIndex(user => user.id === userId) + 1;
    return rank || 1; // Default rank 1 kalau tidak ada data
}

async function checkAchievements(userId, guild) {
    try {
        const user = userData[userId];
        const achievements = user.achievements || [];
        const guildId = guild.id;
        const achievementChannelId = config[guildId]?.achievementChannel || config.defaultChannels.achievementChannel || guild.channels.cache.find(ch => ch.name === 'achievements')?.id;
        
        let achievementChannel = guild.channels.cache.get(achievementChannelId);
        if (!achievementChannel) {
            console.log(`[CheckAchievements] Channel ${achievementChannelId} not in cache, attempting to fetch...`);
            try {
                achievementChannel = await guild.channels.fetch(achievementChannelId);
            } catch (error) {
                console.error(`[CheckAchievements] Failed to fetch channel ${achievementChannelId}:`, error);
            }
        }

        if (!achievementChannel) {
            console.warn(`[CheckAchievements] Achievement channel not found for guild: ${guild.id}. Tried: ${config[guildId]?.achievementChannel}, ${config.defaultChannels.achievementChannel}, or channel named 'achievements'`);
            return;
        }

        if (!achievementChannel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])) {
            console.warn(`[CheckAchievements] Bot lacks permissions (SendMessages, ViewChannel) for channel: ${achievementChannelId}`);
            return;
        }

        console.log(`[CheckAchievements] Found achievement channel: ${achievementChannel.name} (${achievementChannelId})`);

        for (const [achievementId, achievement] of Object.entries(achievementList)) {
            if (achievements.includes(achievementId)) continue;

            let achieved = false;

            const currentHour = new Date().getHours();

            switch (achievementId) {
                case 'first-step':
                    if (user.messageCount >= 1) achieved = true;
                    break;
                case 'chat-rookie':
                    if (user.messageCount >= 100) achieved = true;
                    break;
                case 'social-butterfly':
                    if (user.messageCount >= 500) achieved = true;
                    break;
                case 'pro-typer':
                    if (user.messageCount >= 1000) achieved = true;
                    break;
                case 'chat-master':
                    if (user.messageCount >= 5000) achieved = true;
                    break;
                case 'message-master':
                    if (user.messageCount >= 10000) achieved = true;
                    break;
                case 'voice-starter':
                    if (user.voiceTime >= 1) achieved = true;
                    break;
                case 'stay-awhile-and-listen':
                    if (user.voiceTime >= 10800) achieved = true;
                    break;
                case 'voice-enthusiast':
                    if (user.voiceTime >= 36000) achieved = true;
                    break;
                case 'voice-king':
                    if (user.voiceTime >= 360000) achieved = true;
                    break;
                case 'level-up':
                    if (user.level >= 10) achieved = true;
                    break;
                case 'level-pro':
                    if (user.level >= 50) achieved = true;
                    break;
                case 'level-legend':
                    if (user.level >= 100) achieved = true;
                    break;
                case 'all-nighter':
                    if (user.activeTime >= 86400) achieved = true;
                    break;
                case 'night-owl':
                    if (currentHour >= 0 && currentHour < 5 && user.lastActive) achieved = true;
                    break;
                case 'early-bird':
                    if (currentHour >= 5 && currentHour < 8 && user.lastActive) achieved = true;
                    break;
                case 'reaction-king':
                    if (user.reactionCount >= 100) achieved = true;
                    break;
                case 'true-star':
                    if (user.reactionsGiven >= 100) achieved = true;
                    break;
                case 'event-joiner':
                    if (user.eventCount >= 1) achieved = true;
                    break;
                case 'event-master':
                    if (user.eventCount >= 10) achieved = true;
                    break;
                case 'meme-lord':
                    if (user.memeCount >= 50) achieved = true;
                    break;
                case 'helper':
                    if (user.supportMessages >= 10) achieved = true;
                    break;
                case 'gamer':
                    if (user.gameTime >= 18000) achieved = true;
                    break;
                case 'server-booster':
                    if (user.isBooster) achieved = true;
                    break;
                case 'anniversary':
                    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
                    if (Date.now() - user.joinDate >= oneYearInMs) achieved = true;
                    break;
            }

            if (achieved) {
                achievements.push(achievementId);
                userData[userId].achievements = achievements;
                userData[userId].xp += achievement.xpReward || 0;

                const imagePath = achievement.icon;
                let attachment;
                try {
                    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                        attachment = new AttachmentBuilder(imagePath, { name: `${achievementId}.png` });
                    } else {
                        const imageBuffer = fs.readFileSync(imagePath);
                        attachment = new AttachmentBuilder(imageBuffer, { name: `${achievementId}.png` });
                    }
                } catch (error) {
                    console.error(`[CheckAchievements] Failed to load image for achievement ${achievementId}:`, error);
                    continue;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`ACHIEVEMENT UNLOCKED! ${achievement.name}`)
                    .setDescription(`<@${userId}>, ${achievement.description}\n+${achievement.xpReward} XP`)
                    .setColor(config.colorthemecode || '#00FF00');

                await achievementChannel.send({
                    content: `Hey <@${userId}> Kamu unlock achievement!`,
                    embeds: [embed],
                    files: [attachment]
                });
                console.log(`[CheckAchievements] User ${userId} unlocked achievement: ${achievementId}`);
            }
        }
    } catch (error) {
        console.error('[CheckAchievements] Error in checkAchievements:', error);
    }
}

function saveData() {
    try {
        fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
        console.log('UserData saved successfully from functions.js');
    } catch (error) {
        console.error('Error saving userData:', error);
    }
}

module.exports = {
    initUser,
    getRequiredXP,
    getRank,
    checkAchievements,
    userData,
    saveData
};