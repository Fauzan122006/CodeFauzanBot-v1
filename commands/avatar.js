const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Tampilkan avatar user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang ingin dilihat avatarnya')
                .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`Avatar ${targetUser.username}`)
            .setImage(targetUser.displayAvatarURL({ size: 1024, extension: 'png' }))
            .setDescription(`[Download Link](${targetUser.displayAvatarURL({ size: 1024, extension: 'png' })})`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
