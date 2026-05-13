const { PermissionFlagsBits } = require('discord.js');

async function bulkAddRoleToMembers({ guild, roleToAdd, sourceRole = null, includeBots = false, reason = 'Bulk role assignment' }) {
    if (!guild || !roleToAdd) {
        return { ok: false, error: 'Guild atau role tujuan tidak valid.' };
    }

    const me = guild.members.me || await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return { ok: false, error: 'Bot tidak memiliki permission Manage Roles.' };
    }

    if (roleToAdd.managed) {
        return { ok: false, error: 'Role tujuan adalah managed role dan tidak bisa diberikan manual.' };
    }

    if (roleToAdd.id === guild.id) {
        return { ok: false, error: 'Role @everyone tidak bisa digunakan sebagai role tujuan.' };
    }

    if (me.roles.highest.comparePositionTo(roleToAdd) <= 0) {
        return { ok: false, error: 'Role bot harus lebih tinggi dari role tujuan.' };
    }

    const members = await guild.members.fetch();

    let added = 0;
    let failed = 0;
    let alreadyHasRole = 0;
    let filteredOut = 0;
    let unmanageable = 0;
    let eligible = 0;
    const failureSamples = [];

    for (const member of members.values()) {
        if (!includeBots && member.user.bot) {
            filteredOut++;
            continue;
        }

        if (sourceRole && !member.roles.cache.has(sourceRole.id)) {
            filteredOut++;
            continue;
        }

        if (member.roles.cache.has(roleToAdd.id)) {
            alreadyHasRole++;
            continue;
        }

        if (member.roles.highest.comparePositionTo(me.roles.highest) >= 0) {
            unmanageable++;
            continue;
        }

        eligible++;

        try {
            await member.roles.add(roleToAdd, reason);
            added++;
        } catch (error) {
            failed++;
            if (failureSamples.length < 5) {
                failureSamples.push(`${member.user.tag}: ${error.message}`);
            }
        }
    }

    return {
        ok: true,
        totalMembers: members.size,
        eligible,
        added,
        failed,
        alreadyHasRole,
        filteredOut,
        unmanageable,
        failureSamples
    };
}

module.exports = {
    bulkAddRoleToMembers
};
