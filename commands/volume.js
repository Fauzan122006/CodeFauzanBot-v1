const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicPlayer');

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
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
        }

        const queue = getQueue(interaction.guildId);

        if (!queue.isPlaying) {
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
