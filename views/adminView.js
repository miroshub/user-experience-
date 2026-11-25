const { userToJson } = require("./userView");
const { warningToJson, ticketToJson } = require("./trustView");
const { reviewToJson } = require("./reviewView");

function userById(users, id) {
    const user = users.find(u => u.getUserId() === id);
    return user ? userToJson(user) : null;
}

// FR-34: why, how many rules, and whether Suspend may be pressed (FR-36)
function presentFlags(items) {
    return {
        data: items.map(({ flag, user, warnings, canSuspend }) => ({
            id: flag.getFlagId(),
            source: flag.getSource(),
            reasons: flag.getReasons(),
            hits: flag.hitCount(),
            createdAt: flag.getCreatedAt(),
            user: user ? userToJson(user) : null,
            warnings: warnings.map(w => warningToJson(w)),
            canSuspend
        }))
    };
}

function presentFlag(flag) {
    return { data: { id: flag.getFlagId(), status: flag.getStatus() } };
}

function presentWarning(warning) {
    return { data: warningToJson(warning) };
}

function presentWarnings({ warnings, users }) {
    return { data: warnings.map(w => ({ ...warningToJson(w), user: userById(users, w.getUserId()) })) };
}

function presentUsers(users) {
    return { data: users.map(userToJson) };
}

function presentDisputes({ reviews, users }) {
    return {
        data: reviews.map(r => ({
            ...reviewToJson(r),
            reviewer: userById(users, r.getReviewerId()),
            reviewee: userById(users, r.getRevieweeId())
        }))
    };
}

function presentInbox({ tickets, users }) {
    return { data: tickets.map(t => ({ ...ticketToJson(t), user: userById(users, t.getUserId()) })) };
}

function presentTicket(ticket) {
    return { data: ticketToJson(ticket) };
}

module.exports = {
    presentFlags, presentFlag, presentWarning, presentWarnings, presentUsers,
    presentDisputes, presentInbox, presentTicket
};
