const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { config } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get information about CodeFauzanBot.'),
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const embed = new EmbedBuilder()
                .setTitle('CodeFauzanBot Information')
                .setDescription(
                    'CodeFauzanBot is a powerful bot for managing your server with features like welcome messages, rules, roles, and rank cards.\n\n' +
                    `Configure everything with our beautiful dashboard at: [Click Here](${config.dashboardUrl})`
                )
                .setColor('#5865f2')
                .addFields(
                    { name: 'Support', value: 'Join our support server: [Coming Soon](#)', inline: true },
                    { name: 'Version', value: '1.0.0', inline: true }
                )
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .setFooter({ text: 'CodeFauzanBot', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            console.log(`[InfoCommand] Info sent for guild ${interaction.guild.id}`);
        } catch (error) {
            console.error(`[InfoCommand] Error in info command: ${error.message}`);
            await interaction.editReply({ content: 'There was an error while fetching bot info.', ephemeral: true });
        }
    },
};