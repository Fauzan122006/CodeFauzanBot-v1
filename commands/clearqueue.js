const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Clear all songs from the queue'),
    async execute(interaction) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
        }

        const queue = getQueue(interaction.guildId);

        if (queue.songs.length === 0) {
            return interaction.reply({ content: '❌ Queue is already empty!', ephemeral: true });
        }

        const count = queue.songs.length;
        queue.clearQueue();

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`🗑️ Cleared **${count}** songs from the queue`);

        return interaction.reply({ embeds: [embed] });
    },
};
