// The timed jobs (node-cron), in Cairo time:
// - every day at 09:00: the 5-day nudge (FR-28), the 14-day review reveal (FR-39)
//   and the review flag check (FR-42).
// - every 10 minutes: the 1-hour interview reminder (FR-23).
// The work itself lives in the services; this class only decides *when* it runs.
class Scheduler {
    #cron;
    #matchService;
    #interviewService;
    #reviewService;
    #tasks = [];

    constructor(cron, matchService, interviewService, reviewService) {
        this.#cron = cron;
        this.#matchService = matchService;
        this.#interviewService = interviewService;
        this.#reviewService = reviewService;
    }

    start() {
        const options = { timezone: "Africa/Cairo" };
        this.#tasks.push(this.#cron.schedule("0 9 * * *", () => this.#daily(), options));
        this.#tasks.push(this.#cron.schedule("*/10 * * * *", () => this.#run("reminders", () => this.#interviewService.sendReminders()), options));
    }

    stop() {
        for (const task of this.#tasks) task.stop();
        this.#tasks = [];
    }

    // One after the other: the flag check should see the reviews revealed just before it
    async #daily() {
        await this.#run("nudges", () => this.#matchService.sendNudges());
        await this.#run("review reveal", () => this.#reviewService.revealExpired());
        await this.#run("review flags", () => this.#reviewService.checkFlags());
    }

    // A failed run is logged and tried again next time; it never crashes the server
    async #run(name, work) {
        try {
            const count = await work();
            if (count > 0) console.log(`[scheduler] ${name}: sent ${count}`);
        } catch (err) {
            console.error(`[scheduler] ${name} failed:`, err.message);
        }
    }
}

module.exports = Scheduler;
