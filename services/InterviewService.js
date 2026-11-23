const AppError = require("../errors/AppError");
const TimeSlots = require("./TimeSlots");
const ChatService = require("./ChatService");

const { nameOf } = ChatService;

// Activity diagram 2 "book an interview" (FR-23, FR-24), the 1-hour reminder and the quick test (FR-26)
class InterviewService {
    #interviewRepository;
    #matchRepository;
    #matchGuard;
    #chatService;

    constructor(interviewRepository, matchRepository, matchGuard, chatService) {
        this.#interviewRepository = interviewRepository;
        this.#matchRepository = matchRepository;
        this.#matchGuard = matchGuard;
        this.#chatService = chatService;
    }

    // "The system shows free time slots": the next working days, minus the company's booked times
    async freeSlots(user, matchId, now = new Date()) {
        const match = await this.#matchGuard.load(user, matchId);
        return this.#freeSlotsFor(match.getCompanyId(), now);
    }

    // FR-23: Company.bookInterview makes it, this saves it, posts the card and moves the status bar
    async book(company, matchId, body = {}, now = new Date()) {
        const match = await this.#matchGuard.loadAs(company, matchId, "company");
        const interview = company.bookInterview(match, body.dateTime, { type: body.type, note: body.note }, now);
        await this.#requireFreeSlot(match.getCompanyId(), interview.getDateTime(), now);
        if (interview.getType() === "video") interview.setLink(this.#chatService.callLink(match));

        const saved = await this.#interviewRepository.create(interview);
        match.recordActivity("company", now);
        match.reach("interview", now);
        await this.#matchRepository.save(match);

        await this.#chatService.postNotice(match, "interview", "Interview booked", saved.getInterviewId(), now);
        this.#chatService.statusChanged(match);
        return saved;
    }

    // FR-24: Accept marks it confirmed
    async accept(seeker, interviewId, now = new Date()) {
        const { interview, match } = await this.#load(seeker, interviewId, "seeker");
        interview.confirm();
        return this.#saveWithNotice(match, interview, "seeker", `${nameOf(seeker)} accepted the interview`, now);
    }

    // FR-24: "Another time" sends a new time request to the company
    async askNewTime(seeker, interviewId, body = {}, now = new Date()) {
        const { interview, match } = await this.#load(seeker, interviewId, "seeker");
        interview.askNewTime(body.dateTime, now);
        await this.#requireFreeSlot(match.getCompanyId(), interview.getRequestedTime(), now);
        return this.#saveWithNotice(match, interview, "seeker", `${nameOf(seeker)} asked for another time`, now);
    }

    // Activity 2: the company takes the asked time (confirmed) or picks a new one (back to the seeker)
    async reschedule(company, interviewId, body = {}, now = new Date()) {
        const { interview, match } = await this.#load(company, interviewId, "company");
        await this.#requireFreeSlot(match.getCompanyId(), body.dateTime ? new Date(body.dateTime) : null, now, interviewId);
        interview.reschedule(body.dateTime, now);
        const text = interview.getStatus() === "confirmed"
            ? `${nameOf(company)} took the new time`
            : `${nameOf(company)} suggested a new time`;
        return this.#saveWithNotice(match, interview, "company", text, now);
    }

    // FR-26: Company.sendTest checks it; a "Quick test" card goes into the chat
    async sendTest(company, matchId, body = {}, now = new Date()) {
        const match = await this.#matchGuard.loadAs(company, matchId, "company");
        const test = company.sendTest(match, body);
        const saved = await this.#interviewRepository.create(test);
        match.recordActivity("company", now);
        await this.#matchRepository.save(match);
        await this.#chatService.postNotice(match, "test", "Quick test", saved.getInterviewId(), now);
        this.#chatService.statusChanged(match);
        return saved;
    }

    async startTest(seeker, interviewId, now = new Date()) {
        const { interview } = await this.#load(seeker, interviewId, "seeker");
        interview.startTest(now);
        await this.#interviewRepository.save(interview);
        return interview;
    }

    // The result is saved on the interview, and both sides see the score in the chat
    async submitTest(seeker, interviewId, body = {}, now = new Date()) {
        const { interview, match } = await this.#load(seeker, interviewId, "seeker");
        interview.submitTest(body.answers, now);
        const text = `${nameOf(seeker)} finished the test: ${interview.getResult()}`;
        return this.#saveWithNotice(match, interview, "seeker", text, now);
    }

    // The 10-minute job: a reminder card 1 hour before each confirmed interview, sent once
    async sendReminders(now = new Date()) {
        const due = await this.#interviewRepository.findDueForReminder(now);
        let sent = 0;
        for (const interview of due) {
            if (!interview.isDueForReminder(now)) continue;
            const match = await this.#matchRepository.findById(interview.getMatchId());
            if (!match || match.isClosed()) continue;
            interview.markReminded();
            await this.#interviewRepository.save(interview);
            await this.#chatService.postNotice(match, "reminder", "Your interview starts in 1 hour", interview.getInterviewId(), now);
            this.#chatService.notifyUsers([match.getSeekerId(), match.getCompanyId()], match, "Your interview starts in 1 hour");
            sent++;
        }
        return sent;
    }

    async listForMatches(matchIds) {
        return this.#interviewRepository.findForMatches(matchIds);
    }

    // Loads the interview and its match, and checks the user is on the right side of it
    async #load(user, interviewId, side) {
        const interview = await this.#interviewRepository.findById(interviewId);
        if (!interview) throw new AppError("Interview not found", 404);
        const match = await this.#matchGuard.loadAs(user, interview.getMatchId(), side);
        match.requireOpen();
        return { interview, match };
    }

    async #saveWithNotice(match, interview, side, text, now) {
        await this.#interviewRepository.save(interview);
        match.recordActivity(side, now);
        await this.#matchRepository.save(match);
        await this.#chatService.postNotice(match, "status", text, interview.getInterviewId(), now);
        this.#chatService.statusChanged(match);
        return interview;
    }

    async #freeSlotsFor(companyId, now, ignoreInterviewId = null) {
        const slots = TimeSlots.next(now);
        if (slots.length === 0) return [];
        const matches = await this.#matchRepository.findForUser(companyId);
        const end = new Date(slots[slots.length - 1].getTime() + 1);
        const booked = await this.#interviewRepository.findMeetingsBetween(matches.map(m => m.getMatchId()), slots[0], end);
        const taken = booked
            .filter(i => i.getInterviewId() !== ignoreInterviewId)
            .map(i => i.getDateTime().getTime());
        return slots.filter(slot => !taken.includes(slot.getTime()));
    }

    async #requireFreeSlot(companyId, time, now, ignoreInterviewId = null) {
        if (!time || Number.isNaN(time.getTime())) throw new AppError("Pick a day and a time", 400);
        const free = await this.#freeSlotsFor(companyId, now, ignoreInterviewId);
        if (!free.some(slot => slot.getTime() === time.getTime())) {
            throw new AppError("That time is not free. Pick one of the times shown.", 409);
        }
    }
}

module.exports = InterviewService;
