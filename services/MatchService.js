const AppError = require("../errors/AppError");
const ChatService = require("./ChatService");

const { nameOf } = ChatService;
const DAY_MS = 24 * 60 * 60 * 1000;
const WAITING_DAYS = 5;
const COMPANY_STEPS = ["offer", "hired"];

class MatchService {
    #matchRepository;
    #jobRepository;
    #userRepository;
    #interviewRepository;
    #matchGuard;
    #chatService;

    constructor(matchRepository, jobRepository, userRepository, interviewRepository, matchGuard, chatService) {
        this.#matchRepository = matchRepository;
        this.#jobRepository = jobRepository;
        this.#userRepository = userRepository;
        this.#interviewRepository = interviewRepository;
        this.#matchGuard = matchGuard;
        this.#chatService = chatService;
    }

    // Each match with its job, "the other person" and its interviews (H4 left column)
    async listForUser(user) {
        const matches = await this.#matchRepository.findForUser(user.getUserId());
        return this.#withDetails(user, matches);
    }

    // One match for the H4 chat and the "About this match" column
    async getOne(user, matchId) {
        const match = await this.#matchGuard.load(user, matchId);
        const [item] = await this.#withDetails(user, [match]);
        return { ...item, callLink: this.#chatService.callLink(match), mySide: match.sideOf(user.getUserId()) };
    }

    // FR-27: the company moves the status bar to Offer or Hired. Earlier steps move by themselves.
    async moveStatus(company, matchId, status, now = new Date()) {
        const match = await this.#matchGuard.loadAs(company, matchId, "company");
        if (!COMPANY_STEPS.includes(status)) throw new AppError("The status can be moved to offer or hired", 400);
        match.moveTo(status, now);
        match.recordActivity("company", now);
        await this.#matchRepository.save(match);
        const words = { offer: "made an offer", hired: "marked this as hired" }[status];
        await this.#chatService.postNotice(match, "status", `${nameOf(company)} ${words}`, null, now);
        this.#chatService.statusChanged(match);
        return match;
    }

    // FR-29: closing needs a reason, and the other side sees it in the chat. No silent closing.
    async close(user, matchId, reason, now = new Date()) {
        const match = await this.#matchGuard.load(user, matchId);
        if (typeof reason === "string" && reason.trim().length > 200) {
            throw new AppError("The reason can be up to 200 characters", 400);
        }
        const side = match.sideOf(user.getUserId());
        match.close(reason, now, side);
        await this.#matchRepository.save(match);
        await this.#chatService.postNotice(match, "closed", `${nameOf(user)} closed this match. Reason: ${match.getCloseReason()}`, null, now);
        this.#chatService.statusChanged(match);
        return match;
    }

    // FR-28, the daily job: for every match where the company has been quiet for 5 days,
    // one card in the chat and a reminder to the company. Returns how many were sent.
    async sendNudges(now = new Date()) {
        const cutoff = new Date(now.getTime() - WAITING_DAYS * DAY_MS);
        const quiet = await this.#matchRepository.findQuietSince(cutoff);
        let sent = 0;
        for (const match of quiet) {
            if (!match.needsNudge(now)) continue;
            const [company, seeker] = await Promise.all([
                this.#userRepository.findById(match.getCompanyId()),
                this.#userRepository.findById(match.getSeekerId())
            ]);
            const companyName = company ? nameOf(company) : "The company";
            const seekerName = seeker ? nameOf(seeker) : "The candidate";
            const days = match.quietDays(now);

            match.markNudged(now);
            await this.#matchRepository.save(match);
            await this.#chatService.postNotice(match, "nudge",
                `No reply for ${days} days. ${companyName}, please answer or close this match with a reason.`, null, now);
            this.#chatService.notifyUsers([match.getCompanyId()], match, `${seekerName} is waiting for your reply`);
            this.#chatService.statusChanged(match);
            sent++;
        }
        return sent;
    }

    async #withDetails(user, matches) {
        const isSeeker = user.getRole() === "seeker";
        const matchIds = matches.map(m => m.getMatchId());
        const otherIds = matches.map(m => (isSeeker ? m.getCompanyId() : m.getSeekerId()));
        const [jobs, others, interviews] = await Promise.all([
            this.#jobRepository.findManyByIds(matches.map(m => m.getJobId())),
            this.#userRepository.findManyByIds(otherIds),
            this.#interviewRepository.findForMatches(matchIds)
        ]);

        return matches.map(match => {
            const otherId = isSeeker ? match.getCompanyId() : match.getSeekerId();
            return {
                match,
                job: jobs.find(j => j.getJobId() === match.getJobId()) || null,
                other: others.find(o => o.getUserId() === otherId) || null,
                interviews: interviews.filter(i => i.getMatchId() === match.getMatchId())
            };
        });
    }
}

module.exports = MatchService;
