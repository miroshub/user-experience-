const JobFilter = require("../domain/JobFilter");
const SkillMatcher = require("../domain/SkillMatcher");
const AppError = require("../errors/AppError");

const SCAN_LIMIT = 200;   // newest live jobs checked against the filters
const MAX_CARDS = 20;     // job rows sent to the page
const MIN_TIP_COUNT = 2;  // "Heads up" only when at least 2 jobs ask for the same missing skill

// H7 "Ask wuzzufny": FR-19 (words to filters), FR-20 (follow-ups), FR-21 (CV tip for these jobs)
class AssistantService {
    #aiChatRepository;
    #jobRepository;
    #swipeRepository;
    #userRepository;

    constructor(aiChatRepository, jobRepository, swipeRepository, userRepository) {
        this.#aiChatRepository = aiChatRepository;
        this.#jobRepository = jobRepository;
        this.#swipeRepository = swipeRepository;
        this.#userRepository = userRepository;
    }

    // Opening the page: the chat so far and the jobs for the current filters
    async open(seeker) {
        const chat = await this.#aiChatRepository.findOrStart(seeker.getUserId());
        return { chat, results: await this.#search(seeker, chat.getSuggestedFilters()) };
    }

    async ask(seeker, text) {
        const chat = await this.#aiChatRepository.findOrStart(seeker.getUserId());
        await seeker.askAssistant(chat, text);
        const saved = await this.#aiChatRepository.save(chat);
        return { chat: saved, results: await this.#search(seeker, saved.getSuggestedFilters()) };
    }

    // The x on a chip: new filters straight from the page, no model call
    async setFilters(seeker, filters) {
        const chat = await this.#aiChatRepository.findOrStart(seeker.getUserId());
        chat.replaceFilters(filters);
        const saved = await this.#aiChatRepository.save(chat);
        return { chat: saved, results: await this.#search(seeker, saved.getSuggestedFilters()) };
    }

    // Live jobs the seeker has not swiped yet that pass every filter, best fit first
    async #search(seeker, filters) {
        if (seeker.getRole() !== "seeker") throw new AppError("Only job seekers use the assistant", 403);
        const excludeIds = await this.#swipeRepository.findJobIdsSwipedBySeeker(seeker.getUserId());
        const jobs = await this.#jobRepository.findLive({ excludeIds, minSalary: filters.minPay || undefined }, SCAN_LIMIT);

        const jobFilter = new JobFilter(filters);
        const matching = jobs.filter(job => jobFilter.matches(job));
        const scored = matching
            .map(job => ({ job, fit: SkillMatcher.compare(seeker.getSkills(), job.getSkills()) }))
            .sort((a, b) => b.fit.percent - a.fit.percent);
        const top = scored.slice(0, MAX_CARDS);

        const companyIds = [...new Set(top.map(item => item.job.getCompanyId()))];
        const companies = await this.#userRepository.findManyByIds(companyIds);
        const cards = top.map(item => ({
            ...item,
            company: companies.find(c => c.getUserId() === item.job.getCompanyId()) || null
        }));

        const missing = SkillMatcher.mostWantedMissing(seeker.getSkills(), matching);
        const tip = missing && missing.count >= MIN_TIP_COUNT ? missing : null;
        return { total: matching.length, cards, tip };
    }
}

module.exports = AssistantService;
