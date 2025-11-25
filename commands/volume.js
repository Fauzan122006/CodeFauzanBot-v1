const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the music volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-200)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(200)),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        const volume = interaction.options.getInteger('level');
        queue.setVolume(volume);

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setDescription(`🔊 Volume set to **${volume}%**`);

        return interaction.reply({ embeds: [embed] });
    },
};
