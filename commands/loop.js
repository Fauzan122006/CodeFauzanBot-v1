const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Set loop mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: '0' },
                    { name: 'Song', value: '1' },
                    { name: 'Queue', value: '2' }
                )),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        const mode = parseInt(interaction.options.getString('mode'));
        queue.setRepeatMode(mode);

        const modeText = {
            0: '🔁 Loop disabled',
            1: '🔂 Looping current song',
            2: '🔁 Looping queue'
        };

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setDescription(modeText[mode]);

        return interaction.reply({ embeds: [embed] });
    },
};
