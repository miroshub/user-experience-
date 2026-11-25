const CV = require("../domain/CV");
const AppError = require("../errors/AppError");

const FALLBACK_JOBS = 20; // a seeker with no saved jobs is checked against the newest open jobs
const SECTIONS = ["summary", "experience", "education", "skills"];

// FR-08 to FR-10: build the CV, score it, apply one-click fixes, upload or export a PDF.
// The rules themselves live in the CV class and the tip rules; this class loads, calls them and saves.
class CvService {
    #cvRepository;
    #userRepository;
    #jobRepository;
    #swipeRepository;
    #fileRepository;
    #advisor;
    #exporter;

    constructor(cvRepository, userRepository, jobRepository, swipeRepository, fileRepository, advisor, exporter) {
        this.#cvRepository = cvRepository;
        this.#userRepository = userRepository;
        this.#jobRepository = jobRepository;
        this.#swipeRepository = swipeRepository;
        this.#fileRepository = fileRepository;
        this.#advisor = advisor;
        this.#exporter = exporter;
    }

    // GET /api/cv: the CV plus its ATS check (FR-09). A seeker with no CV yet gets an empty one.
    async check(seeker) {
        const cv = await this.#load(seeker);
        const { jobs, jobWord } = await this.#jobsToCheck(seeker);
        const report = this.#advisor.advise(cv, { jobs, jobWord });
        // keep the stored score up to date, without creating a CV just by opening the page
        if (cv.getCvId()) await this.#cvRepository.save(cv);
        return { cv, report, checkedAgainst: { count: jobs.length, jobWord } };
    }

    // FR-08: saves one or more sections of the form, then checks again
    async updateSections(seeker, changes) {
        if (!changes || typeof changes !== "object" || Array.isArray(changes)) throw new AppError("Invalid data", 400);
        const keys = Object.keys(changes);
        if (keys.length === 0) throw new AppError("Nothing to save", 400);
        for (const key of keys) {
            if (!SECTIONS.includes(key)) throw new AppError(`"${key}" is not a part of the CV`, 400);
        }

        const cv = await this.#load(seeker);
        if ("summary" in changes) cv.setSummary(changes.summary);
        if ("experience" in changes) cv.setExperience(changes.experience);
        if ("education" in changes) cv.setEducation(changes.education);
        if ("skills" in changes) await this.#saveSkills(seeker, cv, changes.skills);

        await this.#cvRepository.save(cv);
        return this.check(seeker);
    }

    // FR-09: the one-click buttons that need no typing (Add a skill, Shorten)
    async applyFix(seeker, action) {
        const cv = await this.#load(seeker);
        const type = action && action.type;
        if (type === "addSkill") {
            if (typeof action.skill !== "string" || action.skill.trim() === "") throw new AppError("Which skill?", 400);
            await this.#saveSkills(seeker, cv, [...seeker.getSkills(), action.skill]);
        } else if (type === "shortenSummary") {
            if (!cv.isSummaryTooLong()) throw new AppError("Your About me is already short", 409);
            cv.setSummary(cv.shortenSummary());
        } else {
            throw new AppError("Unknown fix", 400);
        }
        await this.#cvRepository.save(cv);
        return this.check(seeker);
    }

    // FR-08 "or upload a PDF": kept as it is, private to the seeker
    async uploadPdf(seeker, file) {
        if (!file || file.mimetype !== "application/pdf") throw new AppError("Please attach your CV as a PDF", 400);
        const cv = await this.#load(seeker);
        const fileId = await this.#fileRepository.save({
            buffer: file.buffer,
            filename: file.originalname,
            contentType: file.mimetype,
            ownerId: seeker.getUserId(),
            isPublic: false
        });
        cv.setPdfFileId(fileId);
        await this.#cvRepository.save(cv);
        return this.check(seeker);
    }

    // FR-10, through the class diagram's CV.exportPdf(exporter)
    async exportPdf(seeker) {
        const cv = await this.#load(seeker);
        return cv.exportPdf(this.#exporter);
    }

    async #load(seeker) {
        if (seeker.getRole() !== "seeker") throw new AppError("Only job seekers have a CV", 403);
        const cv = await this.#cvRepository.findBySeeker(seeker);
        return cv || new CV({}, seeker);
    }

    // Skills belong to the seeker, so the swipe cards and the CV always agree
    async #saveSkills(seeker, cv, skills) {
        seeker.setSkills(skills);
        await this.#userRepository.update(seeker);
        cv.setSkills(seeker.getSkills());
    }

    // FR-09 compares the CV with the seeker's saved jobs (the ones they said Interested to)
    async #jobsToCheck(seeker) {
        const savedIds = await this.#swipeRepository.findInterestedJobIds(seeker.getUserId());
        if (savedIds.length > 0) {
            return { jobs: await this.#jobRepository.findManyByIds(savedIds), jobWord: "saved jobs" };
        }
        return { jobs: await this.#jobRepository.findLive({}, FALLBACK_JOBS), jobWord: "open jobs" };
    }
}

module.exports = CvService;
