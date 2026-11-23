const Message = require("../domain/Message");

// FR-22 and FR-25: messages, the system cards in the chat, and the video call
class ChatService {
    #messageRepository;
    #matchRepository;
    #matchGuard;
    #videoCalls;
    #notifier;

    constructor(messageRepository, matchRepository, matchGuard, videoCalls, notifier) {
        this.#messageRepository = messageRepository;
        this.#matchRepository = matchRepository;
        this.#matchGuard = matchGuard;
        this.#videoCalls = videoCalls;
        this.#notifier = notifier;
    }

    async list(user, matchId) {
        await this.#matchGuard.load(user, matchId);
        return this.#messageRepository.findForMatch(matchId);
    }

    // Saves the message, then pushes it live to both sides (FR-22)
    async send(user, matchId, text, now = new Date()) {
        const match = await this.#matchGuard.load(user, matchId);
        match.requireOpen();

        const message = new Message({ matchId, sender: user.getUserId(), text }).send(now);
        const statusBefore = match.getStatus();
        match.recordActivity(match.sideOf(user.getUserId()), now);

        const saved = await this.#messageRepository.create(message);
        await this.#matchRepository.save(match);

        this.#notifier.toMatch(match, "message:new", { matchId, messageId: saved.getMessageId() });
        if (match.getStatus() !== statusBefore) this.statusChanged(match);
        return saved;
    }

    // FR-25: the call link is made for this match. A card tells the other side to join.
    async startCall(user, matchId, now = new Date()) {
        const match = await this.#matchGuard.load(user, matchId);
        match.requireOpen();
        match.recordActivity(match.sideOf(user.getUserId()), now);
        await this.#matchRepository.save(match);
        await this.postNotice(match, "call", `${nameOf(user)} started a video call`, null, now);
        return this.callLink(match);
    }

    callLink(match) {
        return this.#videoCalls.linkFor(match.getMatchId());
    }

    // System cards: interview booked, reminders, nudges, closing... They never count as a reply.
    async postNotice(match, kind, text, interviewId = null, now = new Date()) {
        const notice = Message.notice(match.getMatchId(), kind, text, interviewId);
        notice.setSentAt(now);
        const saved = await this.#messageRepository.create(notice);
        this.#notifier.toMatch(match, "message:new", { matchId: match.getMatchId(), messageId: saved.getMessageId() });
        return saved;
    }

    // The status bar, the interview cards or the "waiting" label changed: both sides reload the match
    statusChanged(match) {
        this.#notifier.toMatch(match, "match:status", { matchId: match.getMatchId(), status: match.getStatus() });
    }

    // A notice outside the chat too, e.g. the company's nudge (shown as a toast in the app)
    notifyUsers(userIds, match, text) {
        this.#notifier.toUsers(userIds, "notice:new", { matchId: match.getMatchId(), text });
    }
}

// The name people see: the company name for companies, the full name for everyone else
function nameOf(user) {
    if (user.getRole() === "company") return user.getCompanyName() || user.getFullName();
    return user.getFullName();
}

ChatService.nameOf = nameOf;

module.exports = ChatService;
