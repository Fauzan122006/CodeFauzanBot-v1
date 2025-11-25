const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
    async execute(interaction) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
        }

        const queue = getQueue(interaction.guildId);

        if (!queue.isPlaying) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        if (queue.pause()) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription('⏸️ Paused the music');
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply({ content: '❌ Music is already paused!', ephemeral: true });
        }
    },
};
