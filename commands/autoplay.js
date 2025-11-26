const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggle autoplay (auto add related songs)'),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        const autoplay = queue.toggleAutoplay();

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setDescription(autoplay ? '🔀 Autoplay **enabled** - Will add related songs automatically' : '⏹️ Autoplay **disabled**');

        return interaction.reply({ embeds: [embed] });
    },
};
