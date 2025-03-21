const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Menampilkan daftar semua command yang tersedia di bot.'),
    async execute(interaction, client) {
        // Gunakan client dari argumen, bukan interaction.client
        const commands = client.commands;

        const embed = new EmbedBuilder()
            .setTitle('📜 Daftar Command CodeFauzanBot')
            .setDescription('Berikut adalah semua command yang tersedia. Kamu bisa pakai slash command (`/`) atau prefix (`..`).')
            .setColor('#00BFFF')
            .setTimestamp()
            .setFooter({ text: '© @codefauzan' });

        commands.forEach(command => {
            embed.addFields({
                name: `/${command.data.name} (atau ..${command.data.name})`,
                value: command.data.description || 'Tidak ada deskripsi.',
                inline: false
            });
        });

        // Tambah tombol link
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('YouTube')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://www.youtube.com/@FauzanEditz'), // Ganti dengan link YouTube
                new ButtonBuilder()
                    .setLabel('Discord')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/wtCPYCVG3E'), // Ganti dengan link Discord
                new ButtonBuilder()
                    .setLabel('Instagram')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://www.instagram.com/moh_fauzan1212') // Ganti dengan link Instagram
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};