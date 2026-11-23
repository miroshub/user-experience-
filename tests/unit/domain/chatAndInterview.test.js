const Message = require("../../../domain/Message");
const Interview = require("../../../domain/Interview");
const Match = require("../../../domain/Match");
const Company = require("../../../domain/Company");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date("2026-11-20T08:00:00Z");
const later = hours => new Date(now.getTime() + hours * HOUR);

function openMatch() {
    return new Match({ matchId: "m1", seekerId: "s1", jobId: "j1", companyId: "c1", matchedAt: now });
}

describe("Message.send (FR-22)", () => {
    it("trims the text and stamps the time", () => {
        const message = new Message({ matchId: "m1", sender: "s1", text: "  Hi!  " }).send(now);
        expect(message.getText()).toBe("Hi!");
        expect(message.getSentAt()).toBe(now);
        expect(message.isFromSystem()).toBe(false);
        expect(message.getKind()).toBe("text");
    });

    it("refuses empty and very long messages", () => {
        expect(() => new Message({ matchId: "m1", sender: "s1", text: "   " }).send()).toThrow("Write something");
        expect(() => new Message({ matchId: "m1", sender: "s1", text: "x".repeat(1001) }).send()).toThrow("1000");
    });

    it("system cards come from \"system\"", () => {
        const card = Message.notice("m1", "interview", "Interview booked", "i1");
        expect([card.isFromSystem(), card.getKind(), card.getInterviewId()]).toEqual([true, "interview", "i1"]);
        card.setSender("s1");
        card.setText("x");
        expect([card.getSender(), card.getText(), card.getMessageId(), card.getMatchId()]).toEqual(["s1", "x", null, "m1"]);
    });
});

describe("Company.bookInterview and Interview (FR-23, FR-24, Activity 2)", () => {
    const company = new Company({ userId: "c1", fullName: "Nile HR", email: "hr@nile.co" });

    it("books a video or in-person interview in the future", () => {
        const interview = company.bookInterview(openMatch(), later(24), { type: "video", note: " Bring your laptop " }, now);
        expect([interview.getStatus(), interview.getType(), interview.getNote()]).toEqual(["invited", "video", "Bring your laptop"]);
        expect(() => company.bookInterview(openMatch(), later(-1), { type: "video" }, now)).toThrow("future");
        expect(() => company.bookInterview(openMatch(), "not a date", { type: "video" }, now)).toThrow("Pick a day");
        expect(() => company.bookInterview(openMatch(), later(2), { type: "phone" }, now)).toThrow("Video call or In person");
        expect(() => company.bookInterview(openMatch(), later(2), { type: "video", note: "x".repeat(301) }, now)).toThrow("300");
    });

    it("only the match's own company can book, and never on a closed match", () => {
        const other = new Company({ userId: "c2", fullName: "Other", email: "o@o.co" });
        expect(() => other.bookInterview(openMatch(), later(2), { type: "video" }, now)).toThrow("Match not found");
        const closed = openMatch();
        closed.close("Position filled");
        expect(() => company.bookInterview(closed, later(2), { type: "video" }, now)).toThrow("closed");
    });

    it("the seeker accepts once", () => {
        const interview = new Interview({ matchId: "m1", type: "video", dateTime: later(24) });
        interview.confirm();
        expect(interview.getStatus()).toBe("confirmed");
        expect(() => interview.confirm()).toThrow("already been answered");
    });

    it("another time: the asked time is confirmed, any other time goes back to the seeker", () => {
        const interview = new Interview({ matchId: "m1", type: "video", dateTime: later(24) });
        interview.askNewTime(later(48), now);
        expect([interview.getStatus(), interview.getRequestedTime()]).toEqual(["new time asked", later(48)]);
        expect(() => interview.askNewTime(later(50), now)).toThrow("already asked");

        interview.reschedule(later(72), now);
        expect([interview.getStatus(), interview.getDateTime(), interview.getRequestedTime()]).toEqual(["invited", later(72), null]);

        interview.askNewTime(later(96), now);
        interview.reschedule(later(96), now);
        expect(interview.getStatus()).toBe("confirmed");
    });

    it("reminds once, 1 hour before a confirmed meeting", () => {
        const interview = new Interview({ matchId: "m1", type: "in person", dateTime: later(1) });
        expect(interview.isDueForReminder(now)).toBe(false); // not confirmed yet
        interview.confirm();
        expect(interview.isDueForReminder(later(-1))).toBe(false); // 2 hours before
        expect(interview.isDueForReminder(now)).toBe(true);
        interview.markReminded();
        expect(interview.isDueForReminder(now)).toBe(false);
        expect(interview.isDueForReminder(later(2))).toBe(false);
    });

    it("rescheduling resets the reminder", () => {
        const interview = new Interview({ matchId: "m1", type: "video", dateTime: later(1), status: "confirmed", reminded: true });
        interview.reschedule(later(30), now);
        expect(interview.getReminded()).toBe(false);
    });

    it("meetings are not tests, and tests are not meetings", () => {
        const meeting = new Interview({ matchId: "m1", type: "video", dateTime: later(2) });
        const test = new Interview({ matchId: "m1", type: "test" });
        expect(() => meeting.startTest(now)).toThrow("not a test");
        expect(() => test.confirm()).toThrow("This is a test");
        expect(test.isDueForReminder(now)).toBe(false);
    });

    it("getters and setters", () => {
        const interview = new Interview({ matchId: "m1", type: "video", dateTime: later(2) });
        interview.setDateTime(later(3));
        interview.setType("in person");
        interview.setLink("https://meet.jit.si/x");
        interview.setResult("Good");
        expect([interview.getDateTime(), interview.getType(), interview.getLink(), interview.getResult(), interview.getInterviewId()])
            .toEqual([later(3), "in person", "https://meet.jit.si/x", "Good", null]);
    });
});

describe("Quick test (FR-26)", () => {
    const company = new Company({ userId: "c1", fullName: "Nile HR", email: "hr@nile.co" });
    const questions = [
        { question: "Which hook stores state?", options: ["useState", "useMemo"], correct: 0 },
        { question: "JSX turns into?", options: ["HTML files", "function calls", "CSS"], correct: 1 }
    ];

    function sentTest() {
        return company.sendTest(openMatch(), { title: " React basics ", timeLimit: 10, questions });
    }

    it("checks the title, the time limit and up to 10 questions", () => {
        expect(sentTest().getTitle()).toBe("React basics");
        const bad = changes => () => company.sendTest(openMatch(), { title: "T", timeLimit: 10, questions, ...changes });
        expect(bad({ title: " " })).toThrow("title");
        expect(bad({ timeLimit: 0 })).toThrow("1 to 60");
        expect(bad({ questions: [] })).toThrow("1 to 10");
        expect(bad({ questions: Array(11).fill(questions[0]) })).toThrow("1 to 10");
        expect(bad({ questions: [{ question: "", options: ["a", "b"], correct: 0 }] })).toThrow("needs some text");
        expect(bad({ questions: [{ question: "Q", options: ["a"], correct: 0 }] })).toThrow("2 to 4 answers");
        expect(bad({ questions: [{ question: "Q", options: ["a", "b"], correct: 2 }] })).toThrow("right answer");
    });

    it("the timer starts once, on the server", () => {
        const test = sentTest();
        expect(test.secondsLeft(now)).toBe(600);
        test.startTest(now);
        test.startTest(later(0.05)); // a page refresh does not restart the timer
        expect(test.getStartedAt()).toBe(now);
        expect(test.secondsLeft(new Date(now.getTime() + 60 * 1000))).toBe(540);
        expect(test.secondsLeft(later(1))).toBe(0);
    });

    it("scores the answers and saves the result", () => {
        const test = sentTest();
        expect(() => test.submitTest([0, 1], now)).toThrow("Start the test first");
        test.startTest(now);
        expect(() => test.submitTest([0], now)).toThrow("one answer per question");
        test.submitTest([0, 2], new Date(now.getTime() + 5 * 60 * 1000));
        expect([test.getScore(), test.getResult(), test.getStatus(), test.getAnswers()]).toEqual([1, "1/2", "done", [0, 2]]);
        expect(() => test.startTest(now)).toThrow("already finished");
    });

    it("late answers still count, but the result says so", () => {
        const test = sentTest();
        test.startTest(now);
        test.submitTest([0, 1], later(1));
        expect(test.getResult()).toBe("2/2 · after the time limit");
    });
});

describe("Match status, waiting and nudges (FR-27, FR-28, FR-29)", () => {
    it("the first message moves Matched to Chatting, and booking to Interview", () => {
        const match = openMatch();
        match.recordActivity("seeker", later(1));
        expect([match.getStatus(), match.getLastActor()]).toEqual(["chatting", "seeker"]);
        match.reach("interview", later(2));
        match.reach("chatting", later(3)); // never backwards
        expect(match.getStatus()).toBe("interview");
        expect(match.getStepDates().interview).toEqual(later(2));
    });

    it("waits only on the company: a company reply stops the waiting", () => {
        const match = openMatch();
        match.recordActivity("seeker", now);
        expect(match.isWaiting(new Date(now.getTime() + 6 * DAY))).toBe(true);
        expect(match.quietDays(new Date(now.getTime() + 6 * DAY))).toBe(6);
        match.recordActivity("company", now);
        expect(match.isWaiting(new Date(now.getTime() + 6 * DAY))).toBe(false);
    });

    it("nudges once per quiet spell", () => {
        const match = openMatch();
        const sixDays = new Date(now.getTime() + 6 * DAY);
        expect(match.needsNudge(sixDays)).toBe(true);
        match.markNudged(sixDays);
        expect(match.needsNudge(new Date(now.getTime() + 7 * DAY))).toBe(false);
        match.recordActivity("seeker", new Date(now.getTime() + 8 * DAY));
        expect(match.needsNudge(new Date(now.getTime() + 14 * DAY))).toBe(true);
        expect(match.getNudgedAt()).toEqual(sixDays);
    });

    it("knows each side and who closed it", () => {
        const match = openMatch();
        expect([match.sideOf("s1"), match.sideOf("c1"), match.sideOf("x")]).toEqual(["seeker", "company", null]);
        match.close("Took another offer", now, "seeker");
        expect([match.isClosed(), match.getClosedBy()]).toEqual([true, "seeker"]);
        expect(() => match.recordActivity("seeker")).toThrow("closed");
    });
});
