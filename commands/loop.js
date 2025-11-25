const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Set loop mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'none' },
                    { name: 'Song', value: 'song' },
                    { name: 'Queue', value: 'queue' }
                )),
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

        const mode = interaction.options.getString('mode');
        queue.setLoop(mode);

        const modeText = {
            'none': '🔁 Loop disabled',
            'song': '🔂 Looping current song',
            'queue': '🔁 Looping queue'
        };

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setDescription(modeText[mode]);

        return interaction.reply({ embeds: [embed] });
    },
};
