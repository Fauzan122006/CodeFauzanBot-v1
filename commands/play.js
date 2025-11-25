const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube, Spotify, or SoundCloud')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();

        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.editReply('❌ You need to be in a voice channel to play music!');
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            return interaction.editReply('❌ I need permissions to join and speak in your voice channel!');
        }

        const query = interaction.options.getString('query');

        try {
            await interaction.client.distube.play(voiceChannel, query, {
                textChannel: interaction.channel,
                member: interaction.member
            });
            
            return interaction.editReply(`🎵 Searching and adding: **${query}**`);
        } catch (error) {
            console.error('Play command error:', error);
            return interaction.editReply('❌ An error occurred while playing the song!');
        }
    },
};
