function presentProfile(profile) {
    return { data: profile };
}

function presentProfileList(profiles, pagination) {
    return { data: profiles, pagination };
}

function presentError(message) {
    return { message };
}

module.exports = { presentProfile, presentProfileList, presentError };
