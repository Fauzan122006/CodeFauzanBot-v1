const { EmbedBuilder } = require('discord.js');

const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { handleLevelUp, getRequiredXP } = require('../utils/levelUpHandler');
const { handleAchievements } = require('../utils/achievementHandler')
const roleList = require('../botconfig/roleList.json');

const shopItems = {
    "vip-role": { name: "Peran VIP", price: 1000, roleId: "ROLE_ID_HERE" },
    "custom-color": { name: "Peran Warna Kustom", price: 500, roleId: "ROLE_ID_HERE" }
};

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Tangani slash command
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Terjadi error saat menjalankan perintah ini!', ephemeral: true });
                } else if (interaction.deferred) {
                    await interaction.editReply({ content: 'Terjadi error saat menjalankan perintah ini!' });
                }
            }
        } 
        // tangani tombol (untuk rules)
        else if (interaction.isButton()) {
            if (interaction.customId === 'accept_rules') {
                try {
                    if (interaction.deferred || interaction.replied) {
                        console.log('[RulesButton] Interaksi sudah diakui, melanjutkan proses...');
                    } else {
                        await interaction.deferReply({ ephemeral: true });
                        console.log('[RulesButton] Deferred reply untuk interaksi:', interaction.id);
                    }
        
                    const guildId = interaction.guild.id;
                    const member = interaction.member;
                    const rulesRole1Id = config[guildId]?.rulesRole1; // Role pertama
                    const rulesRole2Id = config[guildId]?.rulesRole2; // Role kedua (opsional)
        
                    if (!rulesRole1Id) {
                        await interaction.editReply({ content: 'Peran aturan belum diatur! Silakan atur dengan /set-rules.' });
                        console.log(`[RulesButton] Peran aturan belum diatur untuk guild ${guildId}`);
                        return;
                    }
        
                    const rulesRole1 = interaction.guild.roles.cache.get(rulesRole1Id);
                    if (!rulesRole1) {
                        await interaction.editReply({ content: 'Peran aturan pertama tidak ditemukan di server!' });
                        console.log(`[RulesButton] Peran aturan ${rulesRole1Id} tidak ditemukan di guild ${guildId}`);
                        return;
                    }
        
                    const rolesToAdd = [rulesRole1];
                    let roleMessage = rulesRole1.name;
        
                    // Tambah role kedua jika ada
                    if (rulesRole2Id) {
                        const rulesRole2 = interaction.guild.roles.cache.get(rulesRole2Id);
                        if (rulesRole2) {
                            rolesToAdd.push(rulesRole2);
                            roleMessage += ` and ${rulesRole2.name}`;
                        } else {
                            console.log(`[RulesButton] Peran aturan kedua ${rulesRole2Id} tidak ditemukan di guild ${guildId}`);
                        }
                    }
        
                    // Cek apakah user sudah memiliki semua role
                    const alreadyHasAllRoles = rolesToAdd.every(role => member.roles.cache.has(role.id));
                    if (alreadyHasAllRoles) {
                        await interaction.editReply({ content: `Kamu sudah memiliki semua peran aturan (${roleMessage})!` });
                        console.log(`[RulesButton] Pengguna ${member.id} sudah memiliki semua peran di guild ${guildId}`);
                        return;
                    }
        
                    // Tambah role ke user
                    await member.roles.add(rolesToAdd);
                    await interaction.editReply({ content: `Selamat! Kamu telah menerima aturan dan mendapatkan peran ${roleMessage}!` });
                    console.log(`[RulesButton] Pengguna ${member.id} menerima aturan dan mendapatkan peran ${roleMessage} di guild ${guildId}`);
                } catch (error) {
                    console.error('Error menangani interaksi tombol:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: 'Terjadi error saat memproses tombol. Silakan coba lagi atau hubungi developer.', ephemeral: true }).catch(() => {});
                    } else if (interaction.deferred && !interaction.replied) {
                        await interaction.editReply({ content: 'Terjadi error saat memproses tombol. Silakan coba lagi atau hubungi developer.' }).catch(() => {});
                    }
                }
            }
        }
        // Tangani dropdown menu (untuk toko)
        else if (interaction.isStringSelectMenu() && interaction.customId === 'shop-buy') {
            try {
                await interaction.deferReply({ ephemeral: true });

                const userId = interaction.user.id;
                const guildId = interaction.guildId;
                const itemId = interaction.values[0];
                const item = shopItems[itemId];

                if (!userData[userId]?.guilds?.[guildId]) {
                    await interaction.editReply({ content: 'Kamu belum memiliki data di server ini!' });
                    return;
                }

                const userCoins = userData[userId].guilds[guildId].coins || 0;
                if (userCoins < item.price) {
                    await interaction.editReply({ content: `Koinmu tidak cukup! Kamu membutuhkan ${item.price} koin, tetapi kamu hanya memiliki ${userCoins}.` });
                    return;
                }

                userData[userId].guilds[guildId].coins -= item.price;
                const member = await interaction.guild.members.fetch(userId);
                await member.roles.add(item.roleId);
                saveData();

                await interaction.editReply({ content: `Kamu telah membeli ${item.name} seharga ${item.price} koin!` });
            } catch (error) {
                console.error('Error menangani interaksi toko:', error);
                await interaction.editReply({ content: 'Terjadi error saat memproses pembelianmu!' });
            }
        } 
        // Tangani dropdown menu (untuk get-roles)
        else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select-role-')) {
            try {
                await interaction.deferReply({ flags: 64 });

                const guildId = interaction.guildId;
                const selectedRoleName = interaction.values[0]; // Ambil role yang dipilih

                // Ambil semua role dari roleList
                const roles = roleList.guilds && roleList.guilds[guildId] ? roleList.guilds[guildId] : [];
                if (!roles || roles.length === 0) {
                    await interaction.editReply({ content: 'Tidak ada peran yang ditemukan untuk server ini!', flags: 64 });
                    return;
                }

                // Cari role berdasarkan nama di roleList
                const roleData = roles.find(role => role.name === selectedRoleName);
                if (!roleData) {
                    await interaction.editReply({ content: 'Peran tidak ditemukan di daftar peran!', flags: 64 });
                    return;
                }

                // Cek apakah bot punya izin ManageRoles
                if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
                    await interaction.editReply({ content: 'Bot tidak memiliki izin untuk mengelola peran! Pastikan bot punya izin ManageRoles.', flags: 64 });
                    return;
                }

                // Cari role di server berdasarkan nama
                let role = interaction.guild.roles.cache.find(r => r.name === selectedRoleName);
                if (!role) {
                    // Kalau role ga ada, bikin role baru
                    try {
                        role = await interaction.guild.roles.create({
                            name: selectedRoleName,
                            color: 'Default', // Bisa diganti dengan warna tertentu
                            reason: `Role dibuat otomatis oleh bot untuk ${selectedRoleName}`
                        });
                        console.log(`[InteractionCreate] Berhasil membuat role baru: ${selectedRoleName} (${role.id})`);
                    } catch (error) {
                        console.error(`[InteractionCreate] Gagal membuat role ${selectedRoleName}: ${error.message}`);
                        await interaction.editReply({ content: 'Gagal membuat peran baru! Pastikan bot punya izin ManageRoles.', flags: 64 });
                        return;
                    }
                }

                // Cek apakah role-nya bisa dikasih (harus lebih rendah dari role bot)
                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    await interaction.editReply({ content: 'Bot tidak bisa memberikan peran ini karena peran tersebut lebih tinggi atau sama dengan peran tertinggi bot!', flags: 64 });
                    return;
                }

                // Cek apakah user sudah punya role ini
                if (interaction.member.roles.cache.has(role.id)) {
                    await interaction.editReply({ content: `Kamu sudah memiliki peran ${role.name}!`, flags: 64 });
                    return;
                }

                // Kasih role ke user
                await interaction.member.roles.add(role);
                await interaction.editReply({ content: `Berhasil menambahkan peran ${role.name} ke kamu!`, flags: 64 });
            } catch (error) {
                console.error(`[InteractionCreate] Gagal memberikan peran ${selectedRoleName} ke ${interaction.user.id}: ${error.message}`);
                await interaction.editReply({ content: 'Gagal memberikan peran! Pastikan bot punya izin atau peran masih ada.', flags: 64 });
            }
        }

        // Handle level up dan achievements
        try {
            await handleLevelUp(interaction.user.id, interaction.guild, interaction.user);
            await handleAchievements(interaction.user.id, interaction.guild, 'interaction');
        } catch (error) {
            console.error(`[InteractionCreate] Error handling level up or achievements for user ${interaction.user.id}: ${error.message}`);
        }
    },
};