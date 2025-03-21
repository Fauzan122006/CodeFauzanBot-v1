const { config, roleList } = require('../utils/dataManager');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Pastikan bot punya izin dasar
        if (!interaction.guild.members.me.permissions.has(['SendMessages', 'ViewChannel'])) {
            if (interaction.isCommand()) {
                await interaction.reply({
                    content: 'Bot tidak punya permission untuk mengirim pesan atau melihat channel! Berikan permission View Channels dan Send Messages ke bot.',
                    ephemeral: true
                }).catch(() => {});
            }
            return;
        }

        // Tangani Slash Command
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                await interaction.reply({
                    content: 'Command tidak ditemukan! Mungkin command belum diregistrasi.',
                    ephemeral: true
                }).catch(() => {});
                return;
            }

            try {
                await interaction.deferReply();
                await command.execute(interaction, client);
                console.log(`[Interaction] ${interaction.user.tag} used /${interaction.commandName}`);
            } catch (error) {
                console.error(`[Interaction] Error executing ${interaction.commandName}:`, error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Terjadi error saat memproses command. Silakan coba lagi atau hubungi developer.',
                        ephemeral: true
                    }).catch(() => {});
                } else if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({
                        content: 'Terjadi error saat memproses command. Silakan coba lagi atau hubungi developer.'
                    }).catch(() => {});
                }
            }
            return;
        }

        // Tangani Select Menu
        if (interaction.isStringSelectMenu()) {
            try {
                const customId = interaction.customId;
                if (customId.startsWith('select-role-')) {
                    await interaction.deferReply({ ephemeral: true });

                    if (!roleList || roleList.length === 0) {
                        await interaction.editReply({ content: 'Tidak ada role yang tersedia! Cek botconfig/roleList.json.' });
                        return;
                    }

                    const selectedRoleName = interaction.values[0];
                    const roleData = roleList.find(role => role.name === selectedRoleName);
                    if (!roleData) {
                        await interaction.editReply({ content: 'Role tidak ditemukan di konfigurasi!' });
                        return;
                    }

                    let role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === selectedRoleName.toLowerCase());
                    if (!role) {
                        try {
                            role = await interaction.guild.roles.create({
                                name: selectedRoleName,
                                reason: 'Role dibuat otomatis oleh bot untuk fitur select roles',
                                color: 0,
                                permissions: []
                            });
                            await interaction.editReply({ content: `Role **${selectedRoleName}** telah dibuat otomatis di server!` });
                        } catch (error) {
                            await interaction.editReply({ content: `Gagal membuat role **${selectedRoleName}**: ${error.message}` });
                            return;
                        }
                    }

                    if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
                        await interaction.editReply({ content: 'Bot tidak punya permission untuk manage roles! Berikan permission Manage Roles ke bot.' });
                        return;
                    }

                    const botHighestRole = interaction.guild.members.me.roles.highest;
                    if (botHighestRole.comparePositionTo(role) <= 0) {
                        await interaction.editReply({
                            content: `Bot tidak bisa memberikan role **${selectedRoleName}** karena role bot lebih rendah dari role tersebut. Pindahkan role bot ke posisi lebih tinggi di daftar roles.`
                        });
                        return;
                    }

                    const member = interaction.member;
                    if (member.roles.cache.has(role.id)) {
                        await member.roles.remove(role);
                        await interaction.editReply({ content: `Role **${selectedRoleName}** telah dihapus dari kamu!` });
                        console.log(`[SelectRole] User ${member.id} removed role ${selectedRoleName}`);
                    } else {
                        await member.roles.add(role);
                        await interaction.editReply({ content: `Role **${selectedRoleName}** telah ditambahkan ke kamu!` });
                        console.log(`[SelectRole] User ${member.id} added role ${selectedRoleName}`);
                    }
                }
            } catch (error) {
                console.error('Error handling select menu:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Terjadi error saat memproses select menu. Silakan coba lagi atau hubungi developer.',
                        ephemeral: true
                    }).catch(() => {});
                } else if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({
                        content: 'Terjadi error saat memproses select menu. Silakan coba lagi atau hubungi developer.'
                    }).catch(() => {});
                }
            }
            return;
        }

        // Tangani Tombol "Accept" untuk Rules
        if (interaction.isButton()) {
            try {
                if (interaction.customId === 'accept_rules') {
                    await interaction.deferReply({ ephemeral: true });

                    const guildId = interaction.guild.id;
                    const member = interaction.member;

                    const rulesRoleId = config[guildId]?.rulesRole;
                    if (!rulesRoleId) {
                        await interaction.editReply({
                            content: 'Role untuk rules belum diatur! Silakan gunakan command /set-rules untuk mengatur ulang.'
                        });
                        console.log(`[RulesButton] Rules role not set for guild ${guildId}`);
                        return;
                    }

                    const rulesRole = interaction.guild.roles.cache.get(rulesRoleId);
                    if (!rulesRole) {
                        await interaction.editReply({
                            content: 'Role untuk rules tidak ditemukan! Silakan gunakan command /set-rules untuk mengatur ulang.'
                        });
                        console.log(`[RulesButton] Rules role ${rulesRoleId} not found in guild ${guildId}`);
                        return;
                    }

                    if (member.roles.cache.has(rulesRoleId)) {
                        await interaction.editReply({
                            content: 'Kamu sudah menerima rules dan mendapatkan role!'
                        });
                        console.log(`[RulesButton] User ${member.id} already has rules role ${rulesRoleId}`);
                        return;
                    }

                    if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
                        await interaction.editReply({
                            content: 'Bot tidak punya permission untuk manage roles! Berikan permission Manage Roles ke bot.'
                        });
                        console.log(`[RulesButton] Bot lacks ManageRoles permission in guild ${guildId}`);
                        return;
                    }

                    const botHighestRole = interaction.guild.members.me.roles.highest;
                    if (botHighestRole.comparePositionTo(rulesRole) <= 0) {
                        await interaction.editReply({
                            content: `Bot tidak bisa memberikan role **${rulesRole.name}** karena role bot lebih rendah dari role tersebut. Pindahkan role bot ke posisi lebih tinggi di daftar roles.`
                        });
                        console.log(`[RulesButton] Bot role position too low to assign ${rulesRole.name} in guild ${guildId}`);
                        return;
                    }

                    await member.roles.add(rulesRole);
                    await interaction.editReply({
                        content: `Selamat! Kamu telah menerima rules dan mendapatkan role ${rulesRole.name}!`
                    });
                    console.log(`[RulesButton] User ${member.id} accepted rules and received role ${rulesRole.name} in guild ${guildId}`);
                }
            } catch (error) {
                console.error('Error handling button interaction:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Terjadi error saat memproses tombol. Silakan coba lagi atau hubungi developer.',
                        ephemeral: true
                    }).catch(() => {});
                } else if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({
                        content: 'Terjadi error saat memproses tombol. Silakan coba lagi atau hubungi developer.'
                    }).catch(() => {});
                }
            }
        }
    },
};