const { serverList } = require('../utils/dataManager');
const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { handleLevelUp, getRequiredXP } = require('../utils/levelUpHandler');
const { handleAchievements } = require('../utils/achievementHandler');

const shopItems = {
    "vip-role": { name: "Peran VIP", price: 1000, roleId: "ROLE_ID_HERE" },
    "custom-color": { name: "Peran Warna Kustom", price: 500, roleId: "ROLE_ID_HERE" }
};

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Tangani slash command
        if (interaction.isCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.log(`[InteractionCreate] Command not found: ${interaction.commandName}`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[InteractionCreate] Error executing command ${interaction.commandName}:`, error);
                await interaction.reply({ content: 'Terjadi error saat menjalankan perintah ini!', ephemeral: true });
            }
        } else if (interaction.isButton()) {
            // Music control buttons
            if (interaction.customId.startsWith('music_')) {
                const queue = interaction.client.distube.getQueue(interaction.guildId);
                
                if (!queue) {
                    return interaction.reply({ content: '❌ No music is currently playing!', ephemeral: true });
                }

                try {
                    switch (interaction.customId) {
                        case 'music_pause':
                            if (queue.paused) {
                                await queue.resume();
                                await interaction.reply({ content: '▶️ Resumed the music!', ephemeral: true });
                            } else {
                                await queue.pause();
                                await interaction.reply({ content: '⏸️ Paused the music!', ephemeral: true });
                            }
                            break;

                        case 'music_skip':
                            await queue.skip();
                            await interaction.reply({ content: '⏭️ Skipped to the next song!', ephemeral: true });
                            break;

                        case 'music_stop':
                            await queue.stop();
                            await interaction.reply({ content: '⏹️ Stopped the music and cleared the queue!', ephemeral: true });
                            break;

                        case 'music_shuffle':
                            await queue.shuffle();
                            await interaction.reply({ content: '🔀 Shuffled the queue!', ephemeral: true });
                            break;

                        case 'music_loop':
                            const loopMode = queue.repeatMode;
                            if (loopMode === 0) {
                                await queue.setRepeatMode(1);
                                await interaction.reply({ content: '🔂 Looping current song!', ephemeral: true });
                            } else if (loopMode === 1) {
                                await queue.setRepeatMode(2);
                                await interaction.reply({ content: '🔁 Looping queue!', ephemeral: true });
                            } else {
                                await queue.setRepeatMode(0);
                                await interaction.reply({ content: '▶️ Loop disabled!', ephemeral: true });
                            }
                            break;

                        case 'music_autoplay':
                            const autoplay = queue.toggleAutoplay();
                            await interaction.reply({ 
                                content: autoplay ? '🔄 Autoplay enabled!' : '🔄 Autoplay disabled!', 
                                ephemeral: true 
                            });
                            break;

                        case 'music_volume_up':
                            const newVolumeUp = Math.min(queue.volume + 10, 100);
                            await queue.setVolume(newVolumeUp);
                            await interaction.reply({ content: `🔊 Volume set to ${newVolumeUp}%`, ephemeral: true });
                            break;

                        case 'music_volume_down':
                            const newVolumeDown = Math.max(queue.volume - 10, 0);
                            await queue.setVolume(newVolumeDown);
                            await interaction.reply({ content: `🔉 Volume set to ${newVolumeDown}%`, ephemeral: true });
                            break;

                        case 'music_previous':
                            if (queue.previousSongs?.length > 0) {
                                await queue.previous();
                                await interaction.reply({ content: '⏮️ Playing previous song!', ephemeral: true });
                            } else {
                                await interaction.reply({ content: '❌ No previous songs in history!', ephemeral: true });
                            }
                            break;

                        case 'music_queue':
                            const { EmbedBuilder } = require('discord.js');
                            const queueEmbed = new EmbedBuilder()
                                .setColor('#5865F2')
                                .setTitle('📜 Music Queue')
                                .setDescription(
                                    queue.songs.length === 0 
                                        ? 'No songs in queue' 
                                        : queue.songs.slice(0, 10).map((song, i) => 
                                            `${i === 0 ? '🎵 Now Playing' : `${i}.`} **[${song.name}](${song.url})** - \`${song.formattedDuration}\``
                                        ).join('\n')
                                )
                                .setFooter({ text: `${queue.songs.length} song(s) in queue` });
                            await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
                            break;
                    }
                } catch (error) {
                    console.error('Music button error:', error);
                    await interaction.reply({ content: '❌ An error occurred while processing your request!', ephemeral: true }).catch(() => {});
                }
            }
            // Tangani tombol "accept_rules"
            else if (interaction.customId === 'accept_rules') {
                try {
                    await interaction.deferReply({ ephemeral: true });

                    const guildId = interaction.guild.id;
                    const config = serverList[guildId]?.rules;
                    if (!config || !config.enabled) {
                        await interaction.editReply({ content: 'Rules are not enabled for this server.' });
                        return;
                    }

                    const role1 = interaction.guild.roles.cache.get(config.role1);
                    const role2 = config.role2 ? interaction.guild.roles.cache.get(config.role2) : null;

                    if (!role1) {
                        await interaction.editReply({ content: 'Role 1 not found in the server!' });
                        return;
                    }

                    if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
                        await interaction.editReply({ content: 'Bot tidak punya permission untuk manage roles! Berikan permission Manage Roles ke bot.' });
                        return;
                    }

                    const botHighestRole = interaction.guild.members.me.roles.highest;
                    if (botHighestRole.comparePositionTo(role1) <= 0 || (role2 && botHighestRole.comparePositionTo(role2) <= 0)) {
                        await interaction.editReply({
                            content: 'Bot tidak bisa memberikan role karena role bot lebih rendah dari role tersebut. Pindahkan role bot ke posisi lebih tinggi di daftar roles.'
                        });
                        return;
                    }

                    const member = interaction.member;
                    const rolesToAdd = [role1];
                    if (role2) rolesToAdd.push(role2);

                    try {
                        await member.roles.add(rolesToAdd);
                        await interaction.editReply({ content: `Kamu telah menerima aturan dan diberikan role: ${rolesToAdd.map(r => r.name).join(', ')}` });
                        console.log(`[AcceptRules] User ${member.id} accepted rules and received roles: ${rolesToAdd.map(r => r.name).join(', ')}`);
                    } catch (error) {
                        await interaction.editReply({ content: `Gagal memberikan role: ${error.message}` });
                        console.error(`[AcceptRules] Failed to add roles to user ${member.id}: ${error.message}`);
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
        } else if (interaction.isStringSelectMenu()) {
            try {
                // Tangani dropdown menu untuk toko (shop-buy)
                if (interaction.customId === 'shop-buy') {
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
                }
                // Tangani dropdown menu untuk fitur Roles (select-role-)
                else if (interaction.customId.startsWith('select-role-')) {
                    await interaction.deferReply({ ephemeral: true });

                    const guildId = interaction.guild.id;
                    const config = serverList[guildId]?.roles;
                    if (!config || !config.enabled) {
                        await interaction.editReply({ content: 'Role selection is not enabled for this server.' });
                        return;
                    }

                    const selectedRoleName = interaction.values[0];
                    let role = interaction.guild.roles.cache.find(r => r.name === selectedRoleName);
                    if (!role) {
                        try {
                            // Gunakan embedColor dari konfigurasi untuk warna role
                            const embedColor = config.embedColor || '#5865f2';
                            role = await interaction.guild.roles.create({
                                name: selectedRoleName,
                                reason: 'Role dibuat otomatis oleh bot untuk fitur select roles',
                                color: embedColor.replace('#', ''), // Konversi hex ke format Discord
                                permissions: []
                            });
                            console.log(`[SelectRole] Created role ${selectedRoleName} for guild ${guildId}`);
                            await interaction.editReply({ content: `Role **${selectedRoleName}** telah dibuat otomatis di server!` });
                        } catch (error) {
                            console.error(`[SelectRole] Failed to create role ${selectedRoleName} in guild ${guildId}: ${error.message}`);
                            await interaction.editReply({ content: `Gagal membuat role **${selectedRoleName}**: ${error.message}` });
                            return;
                        }
                    }

                    if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
                        console.error(`[SelectRole] Bot lacks ManageRoles permission in guild ${guildId}`);
                        await interaction.editReply({ content: 'Bot tidak punya permission untuk manage roles! Berikan permission Manage Roles ke bot.' });
                        return;
                    }

                    const botHighestRole = interaction.guild.members.me.roles.highest;
                    if (botHighestRole.comparePositionTo(role) <= 0) {
                        console.error(`[SelectRole] Bot role is lower than target role ${selectedRoleName} in guild ${guildId}`);
                        await interaction.editReply({
                            content: `Bot tidak bisa memberikan role **${selectedRoleName}** karena role bot lebih rendah dari role tersebut. Pindahkan role bot ke posisi lebih tinggi di daftar roles.`
                        });
                        return;
                    }

                    const member = interaction.member;
                    try {
                        if (member.roles.cache.has(role.id)) {
                            await member.roles.remove(role);
                            await interaction.editReply({ content: `Role **${selectedRoleName}** telah dihapus dari kamu!` });
                            console.log(`[SelectRole] User ${member.id} removed role ${selectedRoleName} in guild ${guildId}`);
                        } else {
                            await member.roles.add(role);
                            await interaction.editReply({ content: `Role **${selectedRoleName}** telah ditambahkan ke kamu!` });
                            console.log(`[SelectRole] User ${member.id} added role ${selectedRoleName} in guild ${guildId}`);
                        }
                    } catch (error) {
                        console.error(`[SelectRole] Failed to modify role ${selectedRoleName} for user ${member.id} in guild ${guildId}: ${error.message}`);
                        await interaction.editReply({ content: `Gagal memodifikasi role **${selectedRoleName}**: ${error.message}` });
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
        }

        // Handle level up dan achievements untuk setiap interaksi
        try {
            await handleLevelUp(interaction.user.id, interaction.guild, interaction.user);
            await handleAchievements(interaction.user.id, interaction.guild, 'interaction');
        } catch (error) {
            console.error(`[InteractionCreate] Error handling level up or achievements for user ${interaction.user.id}:`, error);
        }
    },
};