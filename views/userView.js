// The password hash never reaches this file: domain users do not carry it
function userToJson(user) {
    return {
        id: user.getUserId(),
        fullName: user.getFullName(),
        email: user.getEmail(),
        phone: user.getPhone(),
        role: user.getRole(),
        isVerified: user.getIsVerified(),
        verifiedAt: user.getVerifiedAt(),
        accountState: user.getAccountState(),
        ...user.getProfileFields(),
        // FR-33: the admin dashboard shows only these tabs
        ...(user.getRole() === "admin" ? { tabs: user.getTabs() } : {})
    };
}

function presentUser(user) {
    return { data: userToJson(user) };
}

function presentAuth(user, token) {
    return { data: { user: userToJson(user), token } };
}

module.exports = { userToJson, presentUser, presentAuth };
