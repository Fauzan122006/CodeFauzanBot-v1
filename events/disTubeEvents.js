const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        const distube = client.distube;

        // Play song event
        distube.on('playSong', async (queue, song) => {
            // Terapkan filter untuk kualitas audio yang lebih baik
            if (!queue.filters.has('clear')) {
                try {
                    await queue.filters.add('clear');
                } catch (error) {
                    console.log('[DisTube] Could not apply clear filter');
                }
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎵 Now Playing')
                .setDescription(`🎵 **[${song.name}](${song.url})**`)
                .addFields(
                    { name: '🎤 Requested By', value: `${song.user}`, inline: true },
                    { name: '🎵 Music Duration', value: song.formattedDuration, inline: true },
                    { name: '🎸 Music Author', value: song.uploader?.name || 'Unknown', inline: true }
                )
                .setThumbnail(song.thumbnail);

            // Create music control buttons - Row 1
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_volume_down')
                        .setLabel('Down')
                        .setEmoji('🔉')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_previous')
                        .setLabel('Back')
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_pause')
                        .setLabel('Pause')
                        .setEmoji('⏸️')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setLabel('Skip')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Create music control buttons - Row 2
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_volume_up')
                        .setLabel('Up')
                        .setEmoji('🔊')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_shuffle')
                        .setLabel('Shuffle')
                        .setEmoji('🔀')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_loop')
                        .setLabel('Loop')
                        .setEmoji('🔁')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setLabel('Stop')
                        .setEmoji('⏹️')
                        .setStyle(ButtonStyle.Danger)
                );

            // Create music control buttons - Row 3
            const row3 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_autoplay')
                        .setLabel('AutoPlay')
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_queue')
                        .setLabel('Playlist')
                        .setEmoji('📜')
                        .setStyle(ButtonStyle.Secondary)
                );

            const musicPanel = new EmbedBuilder()
                .setColor('#5865F2')
                .setDescription('**MUSIC PANEL**')
                .setTimestamp();

            queue.textChannel.send({ 
                embeds: [embed, musicPanel], 
                components: [row1, row2, row3]
            });
        });

        // Add song event
        distube.on('addSong', (queue, song) => {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Song Added to Queue')
                .setDescription(`**[${song.name}](${song.url})** **[${song.formattedDuration}]**`)
                .setFooter({ text: `Iman Troye, HARRY - kita (Official Music Video)` });

            queue.textChannel.send({ embeds: [embed] });
        });

        // Add playlist event
        distube.on('addList', (queue, playlist) => {
            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('📃 Playlist Added')
                .setDescription(`**[${playlist.name}](${playlist.url})**`)
                .addFields(
                    { name: 'Songs', value: `${playlist.songs.length}`, inline: true },
                    { name: 'Duration', value: playlist.formattedDuration, inline: true }
                )
                .setThumbnail(playlist.thumbnail);

            queue.textChannel.send({ embeds: [embed] });
        });

        // Error event
        distube.on('error', (channel, error) => {
            console.error('DisTube error:', error);
            if (channel && error && error.message) {
                const errorMsg = error.message.slice(0, 100);
                channel.send(`❌ An error occurred: ${errorMsg}`).catch(() => {});
            }
        });

        // Empty queue event  
        distube.on('finish', (queue) => {
            queue.textChannel.send('✅ Queue finished!');
        });

        // No related song
        distube.on('noRelated', (queue) => {
            queue.textChannel.send('❌ Could not find related song! Autoplay stopped.');
        });

        console.log('[DisTube] Events registered!');
    },
};
