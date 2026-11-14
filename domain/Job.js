const AppError = require("../errors/AppError");

const WORK_MODES = ["remote", "hybrid", "onsite"];
const EDITABLE = ["title", "salaryMin", "salaryMax", "workMode", "city", "skills", "description"];

function cleanSkills(value) {
    if (!Array.isArray(value) || value.some(s => typeof s !== "string")) {
        throw new AppError("Skills must be a list of words", 400);
    }
    const clean = [];
    for (const skill of value) {
        const s = skill.trim();
        if (s !== "" && !clean.includes(s)) clean.push(s);
    }
    return clean;
}

// From the class diagram. city and description are extra fields the job card needs (FR-12).
class Job {
    #jobId;
    #companyId;
    #title;
    #salaryMin;
    #salaryMax;
    #workMode;
    #city;
    #skills;
    #description;
    #imageUrl;
    #status;
    #createdAt;

    constructor(data) {
        this.#jobId = data.jobId || null;
        this.#companyId = data.companyId ? String(data.companyId) : null;
        this.#title = data.title;
        this.#salaryMin = data.salaryMin;
        this.#salaryMax = data.salaryMax;
        this.#workMode = data.workMode;
        this.#city = data.city || "";
        this.#skills = Array.isArray(data.skills) ? [...data.skills] : [];
        this.#description = data.description || "";
        this.#imageUrl = data.imageUrl || null;
        this.#status = data.status || "live";
        this.#createdAt = data.createdAt ? new Date(data.createdAt) : null;
    }

    getJobId() { return this.#jobId; }
    setJobId(value) { this.#jobId = value; }

    getCompanyId() { return this.#companyId; }

    getTitle() { return this.#title; }
    setTitle(value) {
        if (typeof value !== "string" || value.trim() === "") throw new AppError("Job title is required", 400);
        if (value.trim().length > 80) throw new AppError("Job title must be 80 characters or fewer", 400);
        this.#title = value.trim();
    }

    getSalaryMin() { return this.#salaryMin; }
    setSalaryMin(value) {
        if (!Number.isInteger(value) || value < 0) throw new AppError("Minimum salary must be a whole number", 400);
        this.#salaryMin = value;
    }

    getSalaryMax() { return this.#salaryMax; }
    setSalaryMax(value) {
        if (!Number.isInteger(value) || value < 0) throw new AppError("Maximum salary must be a whole number", 400);
        this.#salaryMax = value;
    }

    getWorkMode() { return this.#workMode; }
    setWorkMode(value) {
        if (!WORK_MODES.includes(value)) throw new AppError("Work mode must be remote, hybrid or onsite", 400);
        this.#workMode = value;
    }

    getCity() { return this.#city; }
    setCity(value) {
        if (typeof value !== "string") throw new AppError("City must be text", 400);
        this.#city = value.trim();
    }

    getSkills() { return [...this.#skills]; }
    setSkills(value) { this.#skills = cleanSkills(value); }

    getDescription() { return this.#description; }
    setDescription(value) {
        if (typeof value !== "string") throw new AppError("Description must be text", 400);
        if (value.length > 1000) throw new AppError("Description must be 1000 characters or fewer", 400);
        this.#description = value.trim();
    }

    getImageUrl() { return this.#imageUrl; }
    setImageUrl(value) { this.#imageUrl = value; }

    getStatus() { return this.#status; }
    setStatus(value) { this.#status = value; }

    getCreatedAt() { return this.#createdAt; }

    isLive() { return this.#status === "live"; }

    belongsTo(companyId) { return this.#companyId === companyId; }

    // Checks the whole job, after creating or editing it
    validate() {
        this.setTitle(this.#title);
        this.setSalaryMin(this.#salaryMin);
        this.setSalaryMax(this.#salaryMax);
        this.setWorkMode(this.#workMode);
        this.setSkills(this.#skills);
        if (this.#salaryMin > this.#salaryMax) throw new AppError("Minimum salary cannot be above the maximum", 400);
        if (this.#workMode !== "remote" && this.#city === "") throw new AppError("City is required unless the job is remote", 400);
        if (this.#skills.length === 0) throw new AppError("Add at least one skill", 400);
    }

    // FR-31: any field of a live (or paused) job can change
    edit(changes) {
        if (this.#status === "closed") throw new AppError("A closed job cannot be edited", 409);
        for (const key of Object.keys(changes)) {
            if (!EDITABLE.includes(key)) throw new AppError(`"${key}" cannot be changed here`, 400);
        }
        if ("title" in changes) this.setTitle(changes.title);
        if ("salaryMin" in changes) this.setSalaryMin(changes.salaryMin);
        if ("salaryMax" in changes) this.setSalaryMax(changes.salaryMax);
        if ("workMode" in changes) this.setWorkMode(changes.workMode);
        if ("city" in changes) this.setCity(changes.city);
        if ("skills" in changes) this.setSkills(changes.skills);
        if ("description" in changes) this.setDescription(changes.description);
        this.validate();
    }

    // FR-32: paused or closed jobs leave the swipe page; existing matches stay
    pause() {
        if (this.#status !== "live") throw new AppError("Only a live job can be paused", 409);
        this.#status = "paused";
    }

    resume() {
        if (this.#status !== "paused") throw new AppError("Only a paused job can go live again", 409);
        this.#status = "live";
    }

    close() {
        if (this.#status === "closed") throw new AppError("This job is already closed", 409);
        this.#status = "closed";
    }
}

module.exports = Job;
