const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue, deleteQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),
    async execute(interaction) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
        }

        const queue = getQueue(interaction.guildId);

        if (!queue.isPlaying && queue.songs.length === 0) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        deleteQueue(interaction.guildId);

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('⏹️ Stopped the music and cleared the queue');

        return interaction.reply({ embeds: [embed] });
    },
};
