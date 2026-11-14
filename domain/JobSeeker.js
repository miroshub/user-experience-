const User = require("./User");
const Swipe = require("./Swipe");
const AppError = require("../errors/AppError");

class JobSeeker extends User {
    #headline;
    #city;
    #skills;

    constructor(data) {
        super({ ...data, role: "seeker" });
        this.#headline = data.headline || "";
        this.#city = data.city || "";
        this.#skills = Array.isArray(data.skills) ? [...data.skills] : [];
    }

    getHeadline() { return this.#headline; }
    setHeadline(value) {
        if (typeof value !== "string") throw new AppError("Headline must be text", 400);
        this.#headline = value.trim();
    }

    getCity() { return this.#city; }
    setCity(value) {
        if (typeof value !== "string") throw new AppError("City must be text", 400);
        this.#city = value.trim();
    }

    getSkills() { return [...this.#skills]; }
    setSkills(value) {
        if (!Array.isArray(value) || value.some(s => typeof s !== "string")) {
            throw new AppError("Skills must be a list of words", 400);
        }
        // trimmed, no blanks, no duplicates
        const clean = [];
        for (const skill of value) {
            const s = skill.trim();
            if (s !== "" && !clean.includes(s)) clean.push(s);
        }
        this.#skills = clean;
    }

    getProfileFields() {
        return { headline: this.#headline, city: this.#city, skills: this.getSkills() };
    }

    getEditableFields() {
        return [...super.getEditableFields(), "headline", "city", "skills"];
    }

    // The pure part of a swipe: make the Swipe. SwipeService saves it and checks for a match.
    swipeOnJob(job, choice) {
        if (!job.isLive()) throw new AppError("This job is no longer open", 409);
        return new Swipe({
            seekerId: this.getUserId(),
            jobId: job.getJobId(),
            swipedBy: "seeker",
            isInterested: choice === true
        });
    }

    applyProfileChanges(changes) {
        super.applyProfileChanges(changes);
        if ("headline" in changes) this.setHeadline(changes.headline);
        if ("city" in changes) this.setCity(changes.city);
        if ("skills" in changes) this.setSkills(changes.skills);
    }
}

module.exports = JobSeeker;
