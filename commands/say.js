const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Buat bot mengatakan sesuatu')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Pesan yang akan dikatakan bot')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel untuk mengirim pesan (opsional)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        const message = interaction.options.getString('message');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await channel.send(message);
            await interaction.reply({ 
                content: '✅ Pesan terkirim!', 
                ephemeral: true 
            });
        } catch (error) {
            await interaction.reply({ 
                content: `❌ Gagal mengirim pesan: ${error.message}`, 
                ephemeral: true 
            });
        }
    },
};
