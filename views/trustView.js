const { userToJson } = require("./userView");

function warningToJson(warning, now = new Date()) {
    return {
        id: warning.getWarningId(),
        userId: warning.getUserId(),
        reason: warning.getReason(),
        reviewId: warning.getReviewId(),
        status: warning.currentStatus(now),
        deadline: warning.getDeadline(),
        daysLeft: warning.daysLeft(now),
        createdAt: warning.getCreatedAt()
    };
}

function ticketToJson(ticket, now = new Date()) {
    return {
        id: ticket.getTicketId(),
        userId: ticket.getUserId(),
        topic: ticket.getTopic(),
        message: ticket.getMessage(),
        status: ticket.getStatus(),
        reply: ticket.getReply(),
        repliedAt: ticket.getRepliedAt(),
        createdAt: ticket.getCreatedAt(),
        hoursWaiting: ticket.hoursWaiting(now)
    };
}

// H8: account health, warning history, tickets, and the verified line
function presentOverview(user, overview) {
    return {
        data: {
            user: userToJson(user),
            health: overview.health,
            openWarning: overview.openWarning ? warningToJson(overview.openWarning) : null,
            warnings: overview.warnings.map(w => warningToJson(w)),
            tickets: overview.tickets.map(t => ticketToJson(t)),
            replyPromise: overview.replyPromise
        }
    };
}

function presentTicket(ticket, replyPromise) {
    return { data: { ...ticketToJson(ticket), replyPromise } };
}

module.exports = { warningToJson, ticketToJson, presentOverview, presentTicket };
