const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { config, serverList, ensureGuildConfig, achievementList } = require('./dataManager');
const { userData, saveData } = require('./userDataHandler');

// Function to create achievement card image
async function createAchievementCard(achievement, achievementId) {
    try {
        const canvas = createCanvas(750, 280);
        const ctx = canvas.getContext('2d');

        // Background - Dark purple gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 750, 280);
        bgGradient.addColorStop(0, '#1a0d2e');
        bgGradient.addColorStop(0.5, '#2d1b4e');
        bgGradient.addColorStop(1, '#1a0d2e');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, 750, 280);

        // Outer glow border
        ctx.shadowColor = '#ffa500';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#ffa500';
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 730, 260);
        ctx.shadowBlur = 0;

        // Inner border
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, 710, 240);

        // Decorative corner accents
        const drawCornerAccent = (x, y, rotation) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.strokeStyle = '#ffa500';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(30, 0);
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 30);
            ctx.stroke();
            ctx.restore();
        };
        
        drawCornerAccent(30, 30, 0);
        drawCornerAccent(720, 30, Math.PI / 2);
        drawCornerAccent(720, 250, Math.PI);
        drawCornerAccent(30, 250, -Math.PI / 2);

        // Load achievement icon
        let iconImage;
        try {
            iconImage = await loadImage(achievement.icon);
        } catch (error) {
            console.warn(`[AchievementCard] Failed to load icon: ${error.message}`);
        }

        // Draw hexagon icon background with glow
        const hexX = 150;
        const hexY = 140;
        const hexSize = 85;
        
        // Hexagon glow
        ctx.shadowColor = '#ffa500';
        ctx.shadowBlur = 30;
        
        // Draw hexagon
        ctx.fillStyle = '#2d1b4e';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const x = hexX + hexSize * Math.cos(angle);
            const y = hexY + hexSize * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // Hexagon border
        ctx.strokeStyle = '#ffa500';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.shadowBlur = 0;

        // Draw icon inside hexagon if loaded
        if (iconImage) {
            ctx.save();
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const x = hexX + (hexSize - 15) * Math.cos(angle);
                const y = hexY + (hexSize - 15) * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.clip();
            
            const iconSize = 140;
            ctx.drawImage(iconImage, hexX - iconSize / 2, hexY - iconSize / 2, iconSize, iconSize);
            ctx.restore();
        }

        // Top label "ACHIEVEMENT UNLOCKED!"
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('ACHIEVEMENT UNLOCKED!', 280, 70);

        // Achievement name - large and bold
        ctx.fillStyle = '#ffa500';
        ctx.font = 'bold 42px Arial, sans-serif';
        ctx.fillText(achievement.name, 280, 125);

        // Achievement description
        ctx.fillStyle = '#d0d0d0';
        ctx.font = '18px Arial, sans-serif';
        
        // Word wrap for description
        const maxWidth = 420;
        const words = achievement.description.split(' ');
        let line = '';
        let y = 165;
        
        for (let word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line, 280, y);
                line = word + ' ';
                y += 25;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 280, y);

        // Rewards section at bottom
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 18px Arial, sans-serif';
        const rewardText = `+${achievement.xpReward} XP  •  +${Math.floor(achievement.xpReward / 2)} Coins`;
        ctx.fillText(rewardText, 280, 230);

        // Rarity badge (top right corner)
        const rarity = achievement.xpReward >= 200 ? 'RARE' : achievement.xpReward >= 150 ? 'RARE' : achievement.xpReward >= 100 ? 'RARE' : 'RARE';
        const rarityColors = {
            'RARE': '#ffa500'
        };
        
        // Rarity label background
        ctx.fillStyle = 'rgba(255, 165, 0, 0.2)';
        ctx.fillRect(630, 30, 95, 35);
        
        // Rarity border
        ctx.strokeStyle = rarityColors[rarity];
        ctx.lineWidth = 2;
        ctx.strokeRect(630, 30, 95, 35);
        
        // Rarity text
        ctx.fillStyle = rarityColors[rarity];
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rarity, 677.5, 52);
        
        ctx.textAlign = 'left'; // Reset text align

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
                    const currentHour = localTime.getHours(); // Fixed: use getHours() not getUTCHours()
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
                // Get member info for username
                const member = await guild.members.fetch(userId).catch(() => null);
                const username = member ? member.user.username : 'User';
                
                // Create custom achievement card
                const cardBuffer = await createAchievementCard(achievement, achievementId);
                
                // Create achievement URL
                const baseUrl = process.env.CALLBACK_URL || config.callbackurl || 'http://localhost:3000';
                const cleanBaseUrl = baseUrl.replace('/auth/discord/callback', '');
                const achievementUrl = `${cleanBaseUrl}/achievements/${guild.id}/${userId}`;
                
                // Create button for viewing achievements
                const viewButton = new ButtonBuilder()
                    .setLabel(`View ${username}'s Achievements`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(achievementUrl)
                    .setEmoji('🏆');
                
                const achievementListButton = new ButtonBuilder()
                    .setLabel('All Achievements')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`${cleanBaseUrl}/dashboard/${guild.id}/achievements`)
                    .setEmoji('📋');
                
                const row = new ActionRowBuilder()
                    .addComponents(viewButton, achievementListButton);
                
                if (cardBuffer) {
                    // Send with custom card
                    const attachment = new AttachmentBuilder(cardBuffer, { name: 'achievement.png' });
                    
                    await achievementChannel.send({
                        content: `GG <@${userId}>, you just unlocked the achievement: **${achievement.name}!** 🎉`,
                        files: [attachment],
                        components: [row]
                    });
                } else {
                    // Fallback to simple embed if card creation failed
                    const embed = new EmbedBuilder()
                        .setTitle(`🎉 ACHIEVEMENT UNLOCKED!`)
                        .setDescription(`**${achievement.name}**\n${achievement.description}`)
                        .addFields(
                            { name: '🎁 Rewards', value: `+${achievement.xpReward} XP • +${Math.floor(achievement.xpReward / 2)} Coins`, inline: true }
                        )
                        .setColor('#ffa500')
                        .setTimestamp();

                    await achievementChannel.send({
                        content: `GG <@${userId}>, you just unlocked the achievement: **${achievement.name}!** 🎉`,
                        embeds: [embed],
                        components: [row]
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