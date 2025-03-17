const fs = require('fs');
const path = require('path');
const { config } = require('../utils/saveData');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        try {
            // Tangani Slash Command
            if (interaction.isCommand()) {
                const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
                const commandName = interaction.commandName;

                for (const file of commandFiles) {
                    const command = require(path.join(__dirname, '../commands', file));
                    if (command.data.name === commandName) {
                        await command.execute(interaction);
                        break;
                    }
                }
            }

            // Tangani Select Menu
            if (interaction.isStringSelectMenu()) {
                const customId = interaction.customId;
                if (customId.startsWith('select-role-')) {
                    const selectedRoleName = interaction.values[0]; // Role yang dipilih user

                    // Cari role di config berdasarkan nama
                    const roleData = config.rolesList.find(role => role.name === selectedRoleName);
                    if (!roleData) {
                        await interaction.reply({ content: 'Role tidak ditemukan di konfigurasi!', ephemeral: true });
                        return;
                    }

                    // Cari role di server berdasarkan nama
                    let role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === selectedRoleName.toLowerCase());
                    if (!role) {
                        try {
                            // Buat role otomatis kalau belum ada
                            role = await interaction.guild.roles.create({
                                name: selectedRoleName,
                                reason: 'Role dibuat otomatis oleh bot untuk fitur select roles',
                                color: 0, // Gunakan 0 untuk warna default (abu-abu)
                                permissions: [] // Kosongkan permission kalau tidak perlu
                            });
                            await interaction.reply({ content: `Role **${selectedRoleName}** telah dibuat otomatis di server!`, ephemeral: true });
                        } catch (error) {
                            await interaction.reply({ content: `Gagal membuat role **${selectedRoleName}**: ${error.message}`, ephemeral: true });
                            return;
                        }
                    }

                    // Cek apakah bot punya permission untuk manage roles
                    if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
                        await interaction.reply({ content: 'Bot tidak punya permission untuk manage roles! Berikan permission Manage Roles ke bot.', ephemeral: true });
                        return;
                    }

                    // Cek apakah role bot lebih tinggi dari role yang ingin diberikan
                    const botHighestRole = interaction.guild.members.me.roles.highest;
                    if (botHighestRole.comparePositionTo(role) <= 0) {
                        await interaction.reply({ content: `Bot tidak bisa memberikan role **${selectedRoleName}** karena role bot lebih rendah dari role tersebut. Pindahkan role bot ke posisi lebih tinggi di daftar roles.`, ephemeral: true });
                        return;
                    }

                    // Tambah atau hapus role dari user
                    const member = interaction.member;
                    if (member.roles.cache.has(role.id)) {
                        await member.roles.remove(role);
                        await interaction.reply({ content: `Role **${selectedRoleName}** telah dihapus dari kamu!`, ephemeral: true });
                    } else {
                        await member.roles.add(role);
                        await interaction.reply({ content: `Role **${selectedRoleName}** telah ditambahkan ke kamu!`, ephemeral: true });
                    }
                }
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Terjadi error saat memproses interaksi. Silakan coba lagi atau hubungi developer.', ephemeral: true }).catch(() => {});
            }
        }
    },
};