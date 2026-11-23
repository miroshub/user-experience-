const AppError = require("../errors/AppError");

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const MEETING_TYPES = ["video", "in person"];
const MAX_QUESTIONS = 10;
const LATE_GRACE_MS = 30 * 1000;

// Meetings: invited → confirmed, or invited → new time asked → (company answers) → invited / confirmed.
// Tests (FR-26): sent → started → done.
class Interview {
    #interviewId;
    #matchId;
    #dateTime;
    #type;
    #link;
    #result;
    #questions;
    #answers;
    #score;
    #timeLimit;
    #reminded;
    // not in the class diagram, needed by FR-24 and FR-26
    #status;
    #note;
    #requestedTime;
    #title;
    #startedAt;

    constructor(data) {
        this.#interviewId = data.interviewId || null;
        this.#matchId = String(data.matchId);
        this.#dateTime = data.dateTime ? new Date(data.dateTime) : null;
        this.#type = data.type;
        this.#link = data.link || null;
        this.#result = data.result || null;
        this.#questions = Array.isArray(data.questions) ? data.questions.map(q => ({ ...q, options: [...q.options] })) : [];
        this.#answers = Array.isArray(data.answers) ? [...data.answers] : [];
        this.#score = typeof data.score === "number" ? data.score : null;
        this.#timeLimit = data.timeLimit || null;
        this.#reminded = data.reminded === true;
        this.#status = data.status || (data.type === "test" ? "sent" : "invited");
        this.#note = data.note || "";
        this.#requestedTime = data.requestedTime ? new Date(data.requestedTime) : null;
        this.#title = data.title || "";
        this.#startedAt = data.startedAt ? new Date(data.startedAt) : null;
    }

    getInterviewId() { return this.#interviewId; }
    getMatchId() { return this.#matchId; }
    getStatus() { return this.#status; }
    getNote() { return this.#note; }
    getRequestedTime() { return this.#requestedTime; }
    getTitle() { return this.#title; }
    getStartedAt() { return this.#startedAt; }
    getQuestions() { return this.#questions.map(q => ({ ...q, options: [...q.options] })); }
    getAnswers() { return [...this.#answers]; }
    getScore() { return this.#score; }
    getTimeLimit() { return this.#timeLimit; }
    getReminded() { return this.#reminded; }

    getDateTime() { return this.#dateTime; }
    setDateTime(value) { this.#dateTime = value; }

    getType() { return this.#type; }
    setType(value) { this.#type = value; }

    getLink() { return this.#link; }
    setLink(value) { this.#link = value; }

    getResult() { return this.#result; }
    setResult(value) { this.#result = value; }

    isTest() {
        return this.#type === "test";
    }

    // Booking rules (FR-23): a real meeting type, a time in the future, a short note
    validateMeeting(now = new Date()) {
        if (!MEETING_TYPES.includes(this.#type)) throw new AppError("Pick Video call or In person", 400);
        requireFutureTime(this.#dateTime, now);
        if (typeof this.#note !== "string" || this.#note.length > 300) {
            throw new AppError("The note can be up to 300 characters", 400);
        }
        this.#note = this.#note.trim();
    }

    // FR-24: the seeker accepts the invite
    confirm() {
        this.#requireMeeting();
        if (this.#status !== "invited") throw new AppError("This invite has already been answered", 409);
        this.#status = "confirmed";
    }

    // FR-24: "Another time" sends a new time request to the company
    askNewTime(time, now = new Date()) {
        this.#requireMeeting();
        if (this.#status === "new time asked") throw new AppError("You already asked for another time", 409);
        requireFutureTime(time, now);
        this.#requestedTime = new Date(time);
        this.#status = "new time asked";
    }

    // Class diagram: reschedule(newTime). Activity 2: if the company takes the time the
    // seeker asked for, it is confirmed; any other time goes back to the seeker as a new invite.
    reschedule(newTime, now = new Date()) {
        this.#requireMeeting();
        requireFutureTime(newTime, now);
        const time = new Date(newTime);
        const isTheAskedTime = this.#requestedTime !== null && this.#requestedTime.getTime() === time.getTime();
        this.#dateTime = time;
        this.#status = isTheAskedTime ? "confirmed" : "invited";
        this.#requestedTime = null;
        this.#reminded = false;
    }

    // FR-23: reminder 1 hour before. Only for confirmed meetings, and only once.
    isDueForReminder(now = new Date()) {
        if (this.isTest() || this.#status !== "confirmed" || this.#reminded) return false;
        const left = this.#dateTime.getTime() - now.getTime();
        return left > 0 && left <= HOUR_MS;
    }

    markReminded() {
        this.#reminded = true;
    }

    // FR-26: up to 10 multiple-choice questions and a time limit in minutes
    validateTest() {
        if (typeof this.#title !== "string" || this.#title.trim() === "") throw new AppError("Give the test a title", 400);
        if (!Number.isInteger(this.#timeLimit) || this.#timeLimit < 1 || this.#timeLimit > 60) {
            throw new AppError("The time limit must be 1 to 60 minutes", 400);
        }
        if (this.#questions.length < 1 || this.#questions.length > MAX_QUESTIONS) {
            throw new AppError(`A test has 1 to ${MAX_QUESTIONS} questions`, 400);
        }
        this.#questions.forEach((q, i) => checkQuestion(q, i + 1));
        this.#title = this.#title.trim();
    }

    // The timer starts on the server, so a page refresh does not reset it
    startTest(now = new Date()) {
        this.#requireTest();
        if (this.#status === "done") throw new AppError("You already finished this test", 409);
        if (this.#status === "sent") {
            this.#status = "started";
            this.#startedAt = now;
        }
    }

    secondsLeft(now = new Date()) {
        if (!this.#startedAt) return this.#timeLimit * 60;
        const end = this.#startedAt.getTime() + this.#timeLimit * MINUTE_MS;
        return Math.max(0, Math.round((end - now.getTime()) / 1000));
    }

    // answers: one option index (or null) per question. Late answers still count, but the result says so.
    submitTest(answers, now = new Date()) {
        this.#requireTest();
        if (this.#status !== "started") throw new AppError("Start the test first", 409);
        if (!Array.isArray(answers) || answers.length !== this.#questions.length) {
            throw new AppError("Send one answer per question", 400);
        }
        this.#answers = answers.map(a => (Number.isInteger(a) ? a : null));
        this.#score = this.#questions.filter((q, i) => q.correct === this.#answers[i]).length;

        const end = this.#startedAt.getTime() + this.#timeLimit * MINUTE_MS + LATE_GRACE_MS;
        const late = now.getTime() > end;
        this.#result = `${this.#score}/${this.#questions.length}${late ? " · after the time limit" : ""}`;
        this.#status = "done";
    }

    #requireMeeting() {
        if (this.isTest()) throw new AppError("This is a test, not a meeting", 400);
    }

    #requireTest() {
        if (!this.isTest()) throw new AppError("This is not a test", 400);
    }
}

function requireFutureTime(time, now) {
    const date = time ? new Date(time) : null;
    if (!date || Number.isNaN(date.getTime())) throw new AppError("Pick a day and a time", 400);
    if (date.getTime() <= now.getTime()) throw new AppError("Pick a time in the future", 400);
}

function isText(value) {
    return typeof value === "string" && value.trim() !== "";
}

function checkQuestion(q, number) {
    if (!q || !isText(q.question)) throw new AppError(`Question ${number} needs some text`, 400);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4 || !q.options.every(isText)) {
        throw new AppError(`Question ${number} needs 2 to 4 answers`, 400);
    }
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) {
        throw new AppError(`Mark the right answer for question ${number}`, 400);
    }
}

module.exports = Interview;
