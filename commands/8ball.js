const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const responses = [
    '🎱 Ya, pasti!',
    '🎱 Sepertinya iya.',
    '🎱 Tanpa ragu!',
    '🎱 Kemungkinan besar ya.',
    '🎱 Bisa jadi.',
    '🎱 Mungkin.',
    '🎱 Coba tanya lagi.',
    '🎱 Kayaknya sih iya.',
    '🎱 Sepertinya begitu.',
    '🎱 Ya, menurut saya.',
    '🎱 Tidak yakin, coba lagi.',
    '🎱 Jangan harap terlalu banyak.',
    '🎱 Jawaban saya adalah tidak.',
    '🎱 Sumber saya bilang tidak.',
    '🎱 Kayaknya tidak deh.',
    '🎱 Sangat meragukan.',
    '🎱 Tidak mungkin!',
    '🎱 Jangan dulu.',
    '🎱 Fokus dan tanya lagi.',
    '🎱 Lebih baik jangan.',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Tanya magic 8ball untuk mendapat jawaban!')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Pertanyaan kamu')
                .setRequired(true)),
    
    async execute(interaction) {
        const question = interaction.options.getString('question');
        const answer = responses[Math.floor(Math.random() * responses.length)];

        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🔮 Magic 8Ball')
            .addFields(
                { name: '❓ Pertanyaan', value: question, inline: false },
                { name: '💬 Jawaban', value: answer, inline: false }
            )
            .setFooter({ text: `Ditanya oleh ${interaction.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
