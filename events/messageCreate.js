const { EmbedBuilder } = require('discord.js');
const { config } = require('../utils/saveData');
const { initUser, getRequiredXP, getRank, userData, saveData } = require('../utils/functions');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        initUser(userId);

        // Tambah XP (random 50-150 XP per pesan)
        const xpGain = Math.floor(Math.random() * 101) + 50;
        userData[userId].xp += xpGain;

        // Cek apakah user naik level
        const requiredXP = getRequiredXP(userData[userId].level);
        if (userData[userId].xp >= requiredXP) {
            userData[userId].level += 1;
            userData[userId].xp -= requiredXP;

            // Ambil channel level dari config
            const levelChannelId = config[guildId]?.levelChannel || config.defaultChannels.levelChannel || message.guild.channels.cache.find(ch => ch.name === 'levels')?.id;
            const levelChannel = message.guild.channels.cache.get(levelChannelId);

            if (levelChannel) {
                const user = message.author;
                const currentXP = userData[userId].xp;
                const nextLevelXP = getRequiredXP(userData[userId].level);
                const rank = getRank(userData[userId].level);
                const avatarURL = user.displayAvatarURL({ dynamic: true, size: 128 });

                const embed = new EmbedBuilder()
                    .setTitle(`RANK #${rank} LEVEL ${userData[userId].level}`)
                    .setDescription(`**${user.username}**`)
                    .addFields(
                        { name: 'XP', value: `${currentXP}/${nextLevelXP} XP`, inline: true }
                    )
                    .setColor(config.colorthemecode || '#00BFFF')
                    .setImage(config.levelUpImage)
                    .setThumbnail(avatarURL);
                await levelChannel.send({ embeds: [embed] });
            }
        }

        saveData();
    },
};