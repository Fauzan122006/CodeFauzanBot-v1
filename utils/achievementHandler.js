const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { config, serverList, ensureGuildConfig, achievementList } = require('./dataManager');
const { userData, saveData } = require('./userDataHandler');

// Function to create achievement card image
async function createAchievementCard(achievement, achievementId) {
    try {
        const canvas = createCanvas(700, 200);
        const ctx = canvas.getContext('2d');

        // Background with gradient
        const gradient = ctx.createLinearGradient(0, 0, 700, 200);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 700, 200);

        // Border with achievement color
        ctx.strokeStyle = '#ffa500'; // Orange/gold border
        ctx.lineWidth = 6;
        ctx.strokeRect(5, 5, 690, 190);

        // Load achievement icon
        let iconImage;
        try {
            iconImage = await loadImage(achievement.icon);
        } catch (error) {
            console.warn(`[AchievementCard] Failed to load icon: ${error.message}`);
        }

        // Draw icon if loaded
        if (iconImage) {
            const iconSize = 120;
            const iconX = 40;
            const iconY = (200 - iconSize) / 2;
            
            // Icon background circle
            ctx.fillStyle = '#2a2a3e';
            ctx.beginPath();
            ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2 + 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw icon
            ctx.save();
            ctx.beginPath();
            ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
            ctx.restore();
            
            // Icon border
            ctx.strokeStyle = '#ffa500';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Text content
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Sans';
        ctx.fillText('ACHIEVEMENT UNLOCKED!', 200, 50);

        // Achievement name
        ctx.fillStyle = '#ffa500';
        ctx.font = 'bold 32px Sans';
        ctx.fillText(achievement.name, 200, 95);

        // Achievement description
        ctx.fillStyle = '#b0b0b0';
        ctx.font = '18px Sans';
        ctx.fillText(achievement.description, 200, 130);

        // Rewards
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 16px Sans';
        ctx.fillText(`+${achievement.xpReward} XP  •  +${Math.floor(achievement.xpReward / 2)} Coins`, 200, 160);

        // Rarity badge (optional)
        const rarity = achievement.xpReward >= 200 ? 'LEGENDARY' : achievement.xpReward >= 150 ? 'EPIC' : achievement.xpReward >= 100 ? 'RARE' : 'COMMON';
        const rarityColors = {
            'LEGENDARY': '#ff00ff',
            'EPIC': '#a335ee',
            'RARE': '#0070dd',
            'COMMON': '#9d9d9d'
        };
        
        ctx.fillStyle = rarityColors[rarity];
        ctx.font = 'bold 14px Sans';
        ctx.fillText(rarity, 600, 180);

        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error('[AchievementCard] Error creating achievement card:', error);
        return null;
    }
}

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
            userData[userId].guilds[guildId].coins += Math.floor(achievement.xpReward / 2) || 0;
            newAchievements++;

            try {
                // Create custom achievement card
                const cardBuffer = await createAchievementCard(achievement, achievementId);
                
                // Create achievement URL
                const baseUrl = process.env.CALLBACK_URL || config.callbackurl || 'http://localhost:3000';
                const cleanBaseUrl = baseUrl.replace('/auth/discord/callback', '');
                const achievementUrl = `${cleanBaseUrl}/achievements/${guild.id}/${userId}`;
                
                if (cardBuffer) {
                    // Send with custom card
                    const attachment = new AttachmentBuilder(cardBuffer, { name: 'achievement.png' });
                    
                    await achievementChannel.send({
                        content: `GG <@${userId}>, you just unlocked the achievement: **${achievement.name}!** 🎉\n[See Min-Erva's achievements](${achievementUrl})`,
                        files: [attachment]
                    });
                } else {
                    // Fallback to simple embed if card creation failed
                    const embed = new EmbedBuilder()
                        .setTitle(`🎉 ACHIEVEMENT UNLOCKED!`)
                        .setDescription(`**${achievement.name}**\n${achievement.description}\n\n[View all achievements](${achievementUrl})`)
                        .addFields(
                            { name: '🎁 Rewards', value: `+${achievement.xpReward} XP • +${Math.floor(achievement.xpReward / 2)} Coins`, inline: true }
                        )
                        .setColor('#ffa500')
                        .setTimestamp();

                    await achievementChannel.send({
                        content: `GG <@${userId}>, you just unlocked the achievement: **${achievement.name}!** 🎉`,
                        embeds: [embed]
                    });
                }
                
                console.log(`[CheckAchievements] User ${userId} unlocked: ${achievementId}`);
            } catch (error) {
                console.error(`[CheckAchievements] Failed to send achievement for ${achievementId}:`, error);
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