const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Apply audio filters to enhance sound quality')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Select audio filter')
                .setRequired(true)
                .addChoices(
                    { name: 'Clear (Best Quality)', value: 'clear' },
                    { name: 'Bass Boost', value: 'bassboost' },
                    { name: '8D Audio', value: '8d' },
                    { name: 'Nightcore', value: 'nightcore' },
                    { name: 'Vaporwave', value: 'vaporwave' },
                    { name: 'Treble', value: 'treble' },
                    { name: 'Surrounding', value: 'surrounding' },
                    { name: 'Off (Remove Filters)', value: 'off' }
                )),
    async execute(interaction) {
        await interaction.deferReply();

        const queue = interaction.client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.editReply('❌ No music is currently playing!');
        }

        const filterType = interaction.options.getString('type');

        try {
            if (filterType === 'off') {
                await queue.filters.clear();
                return interaction.editReply('✅ All filters removed!');
            }

            await queue.filters.set([filterType]);
            return interaction.editReply(`✅ Applied **${filterType}** filter!`);
        } catch (error) {
            console.error('Filter error:', error);
            return interaction.editReply('❌ Failed to apply filter!');
        }
    },
};
