const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearuser')
        .setDescription('Menghapus semua pesan dari user tertentu di semua channel dalam waktu tertentu.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang pesannya akan dihapus.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('hours')
                .setDescription('Rentang waktu (dalam jam) untuk menghapus pesan (default: 24 jam).')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // Hanya user dengan izin Manage Messages yang bisa pakai perintah ini

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const hours = interaction.options.getInteger('hours') || 24; // Default 24 jam jika tidak diisi
        const timeLimit = Date.now() - (hours * 60 * 60 * 1000); // Hitung batas waktu dalam milidetik

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.editReply({ content: 'Saya tidak memiliki izin untuk mengelola pesan (Manage Messages). Tolong beri saya izin tersebut!' });
        }

        let totalDeleted = 0;
        const textChannels = interaction.guild.channels.cache.filter(channel => channel.isTextBased() && !channel.isThread());

        for (const channel of textChannels.values()) {
            if (!channel.permissionsFor(interaction.guild.members.me).has(['ViewChannel', 'ManageMessages'])) {
                console.log(`[ClearUser] Tidak memiliki izin untuk mengelola pesan di channel ${channel.name}`);
                continue;
            }

            try {
                let fetched;
                do {
                    fetched = await channel.messages.fetch({ limit: 100 });
                    if (fetched.size === 0) break;

                    const messagesToDelete = fetched.filter(msg => 
                        msg.author.id === targetUser.id && 
                        msg.createdTimestamp >= timeLimit && 
                        msg.deletable
                    );

                    if (messagesToDelete.size === 0) break;

                    for (const message of messagesToDelete.values()) {
                        try {
                            await message.delete();
                            totalDeleted++;
                        } catch (error) {
                            console.error(`[ClearUser] Gagal menghapus pesan di channel ${channel.name}:`, error);
                        }
                    }

                    // Tunggu sebentar untuk menghindari rate limit
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } while (fetched.size === 100); // Lanjutkan jika masih ada pesan yang bisa diambil
            } catch (error) {
                console.error(`[ClearUser] Gagal mengambil pesan di channel ${channel.name}:`, error);
            }
        }

        await interaction.editReply({ content: `Berhasil menghapus ${totalDeleted} pesan dari ${targetUser.tag} di semua channel yang dikirim dalam ${hours} jam terakhir.` });
    },
};