const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { config, saveConfig } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-roles')
        .setDescription('Atur channel untuk embed daftar peran')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel untuk mengirim embed daftar peran')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guildId;

        // Cek apakah channel-nya text channel
        if (channel.type !== ChannelType.GuildText) {
            await interaction.editReply({ content: 'Channel yang dipilih bukan text channel! Silakan pilih text channel.' });
            return;
        }

        // Cek izin bot di channel
        if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
            await interaction.editReply({ content: 'Bot tidak memiliki izin untuk mengirim pesan atau embed di channel tersebut! Pastikan bot punya izin SendMessages, ViewChannel, dan EmbedLinks.' });
            return;
        }

        // Simpan channel ke config
        if (!config[guildId]) config[guildId] = {};
        config[guildId].rolesChannel = channel.id;
        saveConfig();

        await interaction.editReply({ content: `Channel untuk daftar peran telah diatur ke ${channel}!` });
    },
};