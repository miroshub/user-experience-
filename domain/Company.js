const User = require("./User");
const Job = require("./Job");
const Swipe = require("./Swipe");
const Interview = require("./Interview");
const AppError = require("../errors/AppError");

const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

function requireText(value, label) {
    if (typeof value !== "string") throw new AppError(`${label} must be text`, 400);
    return value.trim();
}

// companyName, industry and location come from the class diagram.
// size, about and logoId are the extra company-profile fields from FR-11.
class Company extends User {
    #companyName;
    #industry;
    #location;
    #size;
    #about;
    #logoId;

    constructor(data) {
        super({ ...data, role: "company" });
        this.#companyName = data.companyName || "";
        this.#industry = data.industry || "";
        this.#location = data.location || "";
        this.#size = data.size || "";
        this.#about = data.about || "";
        this.#logoId = data.logoId ? String(data.logoId) : null;
    }

    getCompanyName() { return this.#companyName; }
    setCompanyName(value) { this.#companyName = requireText(value, "Company name"); }

    getIndustry() { return this.#industry; }
    setIndustry(value) { this.#industry = requireText(value, "Industry"); }

    getLocation() { return this.#location; }
    setLocation(value) { this.#location = requireText(value, "Location"); }

    getSize() { return this.#size; }
    setSize(value) {
        if (!SIZES.includes(value)) throw new AppError(`Size must be one of: ${SIZES.join(", ")}`, 400);
        this.#size = value;
    }

    getAbout() { return this.#about; }
    setAbout(value) {
        const text = requireText(value, "About");
        if (text.length > 500) throw new AppError("About must be 500 characters or fewer", 400);
        this.#about = text;
    }

    getLogoId() { return this.#logoId; }
    setLogoId(value) { this.#logoId = value; }

    // FR-05: part of anonymise() in User
    clearProfile() {
        this.#companyName = "";
        this.#industry = "";
        this.#location = "";
        this.#size = "";
        this.#about = "";
        this.#logoId = null;
    }

    getProfileFields() {
        return {
            companyName: this.#companyName,
            industry: this.#industry,
            location: this.#location,
            size: this.#size,
            about: this.#about,
            logoId: this.#logoId
        };
    }

    getEditableFields() {
        return [...super.getEditableFields(), "companyName", "industry", "location", "size", "about"];
    }

    // FR-30: the pure part of posting a job. JobService saves it.
    postJob(data) {
        const job = new Job({
            companyId: this.getUserId(),
            title: data.title,
            salaryMin: data.salaryMin,
            salaryMax: data.salaryMax,
            workMode: data.workMode,
            city: data.city,
            skills: data.skills,
            status: "live"
        });
        if (data.description !== undefined) job.setDescription(data.description);
        job.validate();
        return job;
    }

    // Class diagram: swipeOnSeeker(seeker, choice). The job is needed too: a company swipes per job.
    swipeOnSeeker(seeker, choice, job) {
        if (!job.belongsTo(this.getUserId())) throw new AppError("Job not found", 404);
        if (!job.isLive()) throw new AppError("This job is not live", 409);
        if (seeker.getRole() !== "seeker") throw new AppError("Candidate not found", 404);
        return new Swipe({
            seekerId: seeker.getUserId(),
            jobId: job.getJobId(),
            swipedBy: "company",
            isInterested: choice === true
        });
    }

    // Class diagram: bookInterview(match, time). The pure part of FR-23: InterviewService saves it.
    // details: { type: "video" | "in person", note }
    bookInterview(match, time, details = {}, now = new Date()) {
        this.#requireOwnOpenMatch(match);
        const interview = new Interview({
            matchId: match.getMatchId(),
            dateTime: time,
            type: details.type,
            note: details.note || ""
        });
        interview.validateMeeting(now);
        return interview;
    }

    // FR-26: a short timed test, stored as an Interview of type "test"
    sendTest(match, data = {}) {
        this.#requireOwnOpenMatch(match);
        const test = new Interview({
            matchId: match.getMatchId(),
            type: "test",
            title: data.title,
            timeLimit: data.timeLimit,
            questions: Array.isArray(data.questions) ? data.questions : []
        });
        test.validateTest();
        return test;
    }

    #requireOwnOpenMatch(match) {
        if (match.getCompanyId() !== this.getUserId()) throw new AppError("Match not found", 404);
        match.requireOpen();
    }

    applyProfileChanges(changes) {
        super.applyProfileChanges(changes);
        if ("companyName" in changes) this.setCompanyName(changes.companyName);
        if ("industry" in changes) this.setIndustry(changes.industry);
        if ("location" in changes) this.setLocation(changes.location);
        if ("size" in changes) this.setSize(changes.size);
        if ("about" in changes) this.setAbout(changes.about);
    }
}

module.exports = Company;
