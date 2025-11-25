const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused song'),
    async execute(interaction) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
        }

        const queue = getQueue(interaction.guildId);

        if (!queue.isPaused) {
            return interaction.reply({ content: '❌ Music is not paused!', ephemeral: true });
        }

        if (queue.resume()) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setDescription('▶️ Resumed the music');
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply({ content: '❌ Failed to resume!', ephemeral: true });
        }
    },
};
