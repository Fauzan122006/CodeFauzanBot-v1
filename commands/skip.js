const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        const song = queue.songs[0];
        await queue.skip();

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setDescription(`⏭️ Skipped: **${song.name}**`);

        return interaction.reply({ embeds: [embed] });
    },
};
