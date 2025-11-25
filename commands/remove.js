const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a song from the queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Song position in queue')
                .setRequired(true)
                .setMinValue(1)),
    async execute(interaction) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
        }

        const queue = getQueue(interaction.guildId);
        const position = interaction.options.getInteger('position');

        if (position > queue.songs.length) {
            return interaction.reply({ content: '❌ Invalid position!', ephemeral: true });
        }

        const removed = queue.remove(position - 1);

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`🗑️ Removed: **${removed.title}**`);

        return interaction.reply({ embeds: [embed] });
    },
};
