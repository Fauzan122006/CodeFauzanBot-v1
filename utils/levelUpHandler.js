const { EmbedBuilder } = require('discord.js');
const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { config } = require('./dataManager');
const { createLevelUpImage } = require('./levelImage');
const chalk = require('chalk');

const log = (module, message, level = 'info') => {
    const timestamp = new Date().toISOString();
    let coloredMessage;

    switch (level.toLowerCase()) {
        case 'success':
            coloredMessage = chalk.cyan(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'error':
            coloredMessage = chalk.red(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'warning':
            coloredMessage = chalk.yellow(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'info':
        default:
            coloredMessage = chalk.white(`[${timestamp}] [${module}] ${message}`);
            break;
    }

    console.log(coloredMessage);
};

function getRequiredXP(level) {
    return (level * 100) + 1000;
}

async function handleLevelUp(userId, guild, member) {
    log('LevelUpHandler', `Starting level up check for user ${userId}`);

    const guildId = guild.id;
    const user = userData[userId]?.guilds?.[guildId];
    if (!user) {
        log('LevelUpHandler', `User data not found for user ${userId} in guild ${guildId}`, 'error');
        return;
    }

    let level = user.level || 1;
    let xp = user.xp || 0;
    const requiredXP = getRequiredXP(level);

    log('LevelUpHandler', `User ${userId} - Level: ${level}, XP: ${xp}, Required XP: ${requiredXP}`);

    if (xp < requiredXP) {
        return;
    }

    level += 1;
    user.level = level;
    user.xp = xp - requiredXP;
    user.coins += 100; // Bonus coins saat level up

    const rank = getRank(userId, guildId);

    const levelUpChannelId = config[guildId]?.levelChannel || config.defaultChannels?.levelChannel || guild.channels.cache.find(ch => ch.name === '✨〢・level-up')?.id;

    if (!levelUpChannelId) {
        log('LevelUpHandler', `Level up channel not set for guild ${guildId}. Tried: ${config[guildId]?.levelChannel}, ${config.defaultChannels?.levelChannel}, or channel named '✨〢・level-up'`, 'warning');
        return;
    }

    let levelUpChannel = guild.channels.cache.get(levelUpChannelId);
    if (!levelUpChannel) {
        log('LevelUpHandler', `Channel ${levelUpChannelId} not in cache, attempting to fetch...`);
        try {
            levelUpChannel = await guild.channels.fetch(levelUpChannelId);
        } catch (error) {
            log('LevelUpHandler', `Failed to fetch channel ${levelUpChannelId}: ${error.message}`, 'error');
            return;
        }
    }

    if (!levelUpChannel) {
        log('LevelUpHandler', `Level up channel not found for guild ${guildId}. Channel ID: ${levelUpChannelId}`, 'error');
        return;
    }

    if (!levelUpChannel.permissionsFor || typeof levelUpChannel.permissionsFor !== 'function') {
        log('LevelUpHandler', `Channel ${levelUpChannelId} does not have permissionsFor method. Channel type: ${levelUpChannel?.type}`, 'error');
        return;
    }

    if (!levelUpChannel.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel'])) {
        log('LevelUpHandler', `Bot lacks permissions (SendMessages, ViewChannel) for channel ${levelUpChannel.name} (${levelUpChannelId})`, 'error');
        return;
    }

    try {
        let fetchedMember = member;
        if (!fetchedMember || !fetchedMember.user || !fetchedMember.user.displayAvatarURL) {
            log('LevelUpHandler', `Invalid member data for user ${userId}, attempting to fetch...`, 'warning');
            try {
                fetchedMember = await guild.members.fetch(userId);
            } catch (error) {
                log('LevelUpHandler', `Failed to fetch member ${userId}: ${error.message}`, 'error');
                const embed = new EmbedBuilder()
                    .setTitle('LEVEL UP!')
                    .setDescription(`<@${userId}> has reached **Level ${level}**! 🎉\nRank: #${rank}\n+100 Coins`)
                    .setColor(config.colorthemecode || '#00FF00');

                await levelUpChannel.send({ embeds: [embed] });
                log('LevelUpHandler', `User ${userId} leveled up to ${level} and message sent to channel ${levelUpChannelId} (without image)`, 'success');
                return;
            }
        }

        if (!fetchedMember || !fetchedMember.user || !fetchedMember.user.displayAvatarURL) {
            log('LevelUpHandler', `Invalid member or user data for user ${userId} after fetch. Cannot generate level up image.`, 'error');
            const embed = new EmbedBuilder()
                .setTitle('LEVEL UP!')
                .setDescription(`<@${userId}> has reached **Level ${level}**! 🎉\nRank: #${rank}\n+100 Coins`)
                .setColor(config.colorthemecode || '#00FF00');

            await levelUpChannel.send({ embeds: [embed] });
            log('LevelUpHandler', `User ${userId} leveled up to ${level} and message sent to channel ${levelUpChannelId} (without image)`, 'success');
            return;
        }

        const levelUpImage = await createLevelUpImage(fetchedMember.user, level, user.xp, rank);

        const embed = new EmbedBuilder()
            .setTitle('LEVEL UP!')
            .setDescription(`<@${userId}> has reached **Level ${level}**! 🎉\nRank: #${rank}\n+100 Coins`)
            .setColor(config.colorthemecode || '#00FF00')
            .setImage('attachment://level-up-image.png');

        await levelUpChannel.send({ embeds: [embed], files: [levelUpImage] });
        log('LevelUpHandler', `User ${userId} leveled up to ${level} and message sent to channel ${levelUpChannelId}`, 'success');
    } catch (error) {
        log('LevelUpHandler', `Error sending level up message for user ${userId}: ${error.message}`, 'error');
    }
}

module.exports = {getRequiredXP, handleLevelUp };