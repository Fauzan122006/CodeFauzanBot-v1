const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { config, serverList, ensureGuildConfig, achievementList } = require('./dataManager');
const { userData, saveData } = require('./userDataHandler');

async function checkAchievements(userId, guild) {
    const guildId = guild.id;

    // Pastikan serverList[guildId] ada
    ensureGuildConfig(guildId);

    const user = userData[userId]?.guilds?.[guildId];
    if (!user) {
        return; // Skip silently
    }

    const achievements = user.achievements || [];
    const achievementChannelId = serverList[guildId].achievementChannel || config.defaultChannels.achievementChannel || guild.channels.cache.find(ch => ch.name === 'achievements')?.id;

    let achievementChannel = guild.channels.cache.get(achievementChannelId);
    if (!achievementChannel) {
        try {
            achievementChannel = await guild.channels.fetch(achievementChannelId);
        } catch (error) {
            console.error(`[CheckAchievements] Failed to fetch channel ${achievementChannelId}:`, error);
        }
    }

    if (!achievementChannel) {
        return; // Skip silently if channel not found
    }

    if (!achievementChannel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])) {
        return; // Skip silently if no permissions
    }

    let newAchievements = 0;

    for (const [achievementId, achievement] of Object.entries(achievementList)) {
        if (achievements.includes(achievementId)) continue;

        let achieved = false;
        const condition = achievement.condition;

        if (!condition) continue;

        const userValue = user[condition.key];
        if (userValue === undefined) continue;

        switch (condition.type) {
            case 'threshold':
                if (condition.comparison === 'timeElapsed') {
                    // Untuk achievement seperti anniversary, bandingkan selisih waktu
                    const timeElapsed = Date.now() - userValue;
                    achieved = timeElapsed >= condition.value;
                } else {
                    // Untuk achievement berbasis threshold biasa (misalnya messageCount, voiceTime)
                    achieved = userValue >= condition.value;
                }
                break;

            case 'timeRange':
                // Untuk achievement berbasis rentang waktu (misalnya night-owl, early-bird)
                if (userValue) {
                    const lastActiveDate = new Date(userValue);
                    const wibOffset = 7 * 60; // WIB adalah UTC+7 (dalam menit)
                    const localTime = new Date(lastActiveDate.getTime() + (wibOffset * 60 * 1000));
                    const currentHour = localTime.getUTCHours();
                    achieved = currentHour >= condition.startHour && currentHour < condition.endHour;
                }
                break;

            case 'boolean':
                // Untuk achievement berbasis boolean (misalnya server-booster)
                achieved = userValue === condition.value;
                break;

            default:
                continue;
        }

        if (achieved) {
            achievements.push(achievementId);
            userData[userId].guilds[guildId].achievements = achievements;
            userData[userId].guilds[guildId].xp += achievement.xpReward || 0;
            userData[userId].guilds[guildId].coins += Math.floor(achievement.xpReward / 2) || 0; // Bonus coins
            newAchievements++;

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
                .setDescription(`<@${userId}>, ${achievement.description}\n+${achievement.xpReward} XP\n+${Math.floor(achievement.xpReward / 2)} Coins`)
                .setColor(config.colorthemecode || '#00FF00');

            try {
                await achievementChannel.send({
                    content: `Hey <@${userId}> Kamu unlock achievement!`,
                    embeds: [embed],
                    files: [attachment]
                });
                console.log(`[CheckAchievements] User ${userId} unlocked achievement: ${achievementId}`);
            } catch (error) {
                console.error(`[CheckAchievements] Failed to send achievement message for ${achievementId}:`, error);
            }
        }
    }

    // Only save if there are new achievements
    if (newAchievements > 0) {
        saveData();
        console.log(`[CheckAchievements] User ${userId} unlocked ${newAchievements} new achievement(s)`);
    }
}

async function handleAchievements(userId, guild, type) {
    await checkAchievements(userId, guild);
}

module.exports = {
    checkAchievements,
    handleAchievements
};