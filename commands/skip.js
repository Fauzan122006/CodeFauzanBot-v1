const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
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

        const skipped = queue.nowPlaying;
        queue.skip();

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setDescription(`⏭️ Skipped: **${skipped.title}**`);

        return interaction.reply({ embeds: [embed] });
    },
};
