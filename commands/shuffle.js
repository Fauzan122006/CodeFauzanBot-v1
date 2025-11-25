const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue'),
    async execute(interaction) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
        }

        const queue = getQueue(interaction.guildId);

        if (queue.songs.length < 2) {
            return interaction.reply({ content: '❌ Not enough songs in queue to shuffle!', ephemeral: true });
        }

        queue.shuffle();

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setDescription(`🔀 Shuffled **${queue.songs.length}** songs`);

        return interaction.reply({ embeds: [embed] });
    },
};
