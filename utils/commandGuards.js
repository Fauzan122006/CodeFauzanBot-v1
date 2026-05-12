async function fetchTargetMember(interaction, targetUser) {
    if (!targetUser) return null;
    try {
        return await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
        return null;
    }
}

function canModerate(interaction, member) {
    if (!member) {
        return { ok: false, message: '❌ User tidak ada di server!' };
    }

    if (member.id === interaction.user.id) {
        return { ok: false, message: '❌ Kamu tidak bisa moderasi diri sendiri!' };
    }

    if (member.id === interaction.client.user.id) {
        return { ok: false, message: '❌ Kamu tidak bisa moderasi bot!' };
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return { ok: false, message: '❌ Kamu tidak bisa moderasi user dengan role lebih tinggi atau sama!' };
    }

    if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
        return { ok: false, message: '❌ Bot tidak bisa moderasi user dengan role lebih tinggi atau sama!' };
    }

    return { ok: true };
}

function buildCooldownGuard(cooldownMap, key, cooldownMs) {
    const now = Date.now();
    const last = cooldownMap.get(key) || 0;
    const remaining = cooldownMs - (now - last);

    if (remaining > 0) {
        return {
            ok: false,
            message: `⏳ Tunggu ${Math.ceil(remaining / 1000)} detik sebelum aksi moderasi berikutnya untuk user ini.`
        };
    }

    cooldownMap.set(key, now);
    return { ok: true };
}

module.exports = {
    fetchTargetMember,
    canModerate,
    buildCooldownGuard
};
