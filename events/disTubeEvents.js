const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        const distube = client.distube;

        // Play song event
        distube.on('playSong', (queue, song) => {
            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('🎵 Now Playing')
                .setDescription(`**[${song.name}](${song.url})**`)
                .addFields(
                    { name: 'Duration', value: song.formattedDuration, inline: true },
                    { name: 'Requested by', value: song.user.tag, inline: true },
                    { name: 'Queue', value: `${queue.songs.length} song(s)`, inline: true }
                )
                .setThumbnail(song.thumbnail)
                .setTimestamp();

            queue.textChannel.send({ embeds: [embed] });
        });

        // Add song event
        distube.on('addSong', (queue, song) => {
            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('✅ Added to Queue')
                .setDescription(`**[${song.name}](${song.url})**`)
                .addFields(
                    { name: 'Duration', value: song.formattedDuration, inline: true },
                    { name: 'Position', value: `${queue.songs.length}`, inline: true }
                )
                .setThumbnail(song.thumbnail);

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
