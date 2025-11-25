const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { config } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('my-achievements')
        .setDescription('View your achievements in this server!'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Load userData
            const { userData } = require('../utils/userDataHandler');
            const userGuildData = userData[userId]?.guilds?.[guildId];
            const userAchievements = userGuildData?.achievements || [];

            // Get total achievements
            const { achievementList } = require('../utils/dataManager');
            const totalCount = Object.keys(achievementList).length;
            const unlockedCount = userAchievements.length;
            const percentage = Math.round((unlockedCount / totalCount) * 100);

            // Create achievement URL
            const baseUrl = process.env.CALLBACK_URL || config.callbackurl || 'http://localhost:3000';
            const cleanBaseUrl = baseUrl.replace('/auth/discord/callback', '');
            const achievementUrl = `${cleanBaseUrl}/achievements/${guildId}/${userId}`;

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle('🏆 Your Achievements')
                .setDescription(`View all your achievements on our web dashboard!`)
                .addFields(
                    { name: '✅ Unlocked', value: `${unlockedCount}/${totalCount}`, inline: true },
                    { name: '📊 Progress', value: `${percentage}%`, inline: true },
                    { name: '🎯 Remaining', value: `${totalCount - unlockedCount}`, inline: true }
                )
                .setColor(config.colorthemecode || '#ffa500')
                .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 128 }))
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            // Create button
            const button = new ButtonBuilder()
                .setLabel('View My Achievements')
                .setStyle(ButtonStyle.Link)
                .setURL(achievementUrl)
                .setEmoji('🏆');

            const row = new ActionRowBuilder().addComponents(button);

            await interaction.editReply({ 
                embeds: [embed], 
                components: [row]
            });

        } catch (error) {
            console.error(`[MyAchievements] Error: ${error.message}`);
            try {
                await interaction.editReply({ 
                    content: 'There was an error fetching your achievements. Please try again later.',
                    ephemeral: true 
                });
            } catch (replyError) {
                console.error(`[MyAchievements] Failed to send error reply: ${replyError.message}`);
            }
        }
    },
};
