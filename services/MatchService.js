class MatchService {
    #matchRepository;
    #jobRepository;
    #userRepository;

    constructor(matchRepository, jobRepository, userRepository) {
        this.#matchRepository = matchRepository;
        this.#jobRepository = jobRepository;
        this.#userRepository = userRepository;
    }

    // Each match with its job and "the other person" (the company for a seeker, the seeker for a company)
    async listForUser(user) {
        const matches = await this.#matchRepository.findForUser(user.getUserId());
        const isSeeker = user.getRole() === "seeker";

        const jobs = await this.#jobRepository.findManyByIds(matches.map(m => m.getJobId()));
        const otherIds = matches.map(m => (isSeeker ? m.getCompanyId() : m.getSeekerId()));
        const others = await this.#userRepository.findManyByIds(otherIds);

        return matches.map(match => {
            const otherId = isSeeker ? match.getCompanyId() : match.getSeekerId();
            return {
                match,
                job: jobs.find(j => j.getJobId() === match.getJobId()) || null,
                other: others.find(o => o.getUserId() === otherId) || null
            };
        });
    }
}

module.exports = MatchService;
