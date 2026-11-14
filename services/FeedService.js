const SkillMatcher = require("../domain/SkillMatcher");
const AppError = require("../errors/AppError");

const DEFAULT_CARDS = 5;    // NFR-01: 5 cards are preloaded
const MAX_CARDS = 20;
const SCAN_LIMIT = 200;     // how many newest jobs or seekers are scored per request
const WORK_MODES = ["remote", "hybrid", "onsite"];

function readLimit(value) {
    if (value === undefined) return DEFAULT_CARDS;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) throw new AppError("limit must be a whole number above 0", 400);
    return Math.min(n, MAX_CARDS);
}

function readText(value, name) {
    if (value === undefined || value === "") return undefined;
    if (typeof value !== "string" || value.length > 50) throw new AppError(`Invalid ${name} filter`, 400);
    return value.trim();
}

// Higher fit first. sort() keeps the "newest first" order for equal scores.
function byFit(a, b) {
    return b.fit.percent - a.fit.percent;
}

class FeedService {
    #jobRepository;
    #swipeRepository;
    #userRepository;

    constructor(jobRepository, swipeRepository, userRepository) {
        this.#jobRepository = jobRepository;
        this.#swipeRepository = swipeRepository;
        this.#userRepository = userRepository;
    }

    // FR-12 + FR-15: the next job cards for a seeker
    async jobsForSeeker(user, query) {
        if (user.getRole() !== "seeker") throw new AppError("Only seekers swipe on jobs", 403);

        const filters = {
            role: readText(query.role, "role"),
            city: readText(query.city, "city"),
            workMode: readText(query.workMode, "work mode"),
            minSalary: undefined
        };
        if (filters.workMode && !WORK_MODES.includes(filters.workMode)) throw new AppError("Invalid work mode filter", 400);
        if (query.minSalary !== undefined && query.minSalary !== "") {
            const salary = Number(query.minSalary);
            if (!Number.isInteger(salary) || salary < 0) throw new AppError("Invalid salary filter", 400);
            filters.minSalary = salary;
        }
        const limit = readLimit(query.limit);

        filters.excludeIds = await this.#swipeRepository.findJobIdsSwipedBySeeker(user.getUserId());
        const jobs = await this.#jobRepository.findLive(filters, SCAN_LIMIT);

        const scored = jobs.map(job => ({ job, fit: SkillMatcher.compare(user.getSkills(), job.getSkills()) }));
        const top = scored.sort(byFit).slice(0, limit);

        const companyIds = [...new Set(top.map(item => item.job.getCompanyId()))];
        const companies = await this.#userRepository.findManyByIds(companyIds);
        return top.map(item => ({
            ...item,
            company: companies.find(c => c.getUserId() === item.job.getCompanyId()) || null
        }));
    }

    // FR-16 + FR-18: candidate cards for one of the company's jobs, flagged ones kept apart
    async candidatesForJob(user, query) {
        if (user.getRole() !== "company") throw new AppError("Only companies swipe on candidates", 403);
        const job = await this.#jobRepository.findById(query.jobId);
        if (!job || !job.belongsTo(user.getUserId())) throw new AppError("Job not found", 404);
        const limit = readLimit(query.limit);

        const alreadySwiped = await this.#swipeRepository.findSeekerIdsSwipedByCompany(job.getJobId());
        const seekers = await this.#userRepository.findSeekers({ excludeIds: alreadySwiped }, SCAN_LIMIT);

        const flagged = new Map();
        for (const swipe of await this.#swipeRepository.findSeekerSwipesForJob(job.getJobId())) {
            if (swipe.getIsSpam()) flagged.set(swipe.getSeekerId(), swipe.getSpamReasons());
        }

        const scored = seekers
            .map(seeker => ({
                seeker,
                fit: SkillMatcher.compare(seeker.getSkills(), job.getSkills()),
                spamReasons: flagged.get(seeker.getUserId()) || []
            }))
            .sort(byFit);

        return {
            job,
            candidates: scored.filter(item => item.spamReasons.length === 0).slice(0, limit),
            checkLater: scored.filter(item => item.spamReasons.length > 0).slice(0, limit)
        };
    }
}

module.exports = FeedService;
