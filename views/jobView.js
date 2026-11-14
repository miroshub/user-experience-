function jobToJson(job) {
    return {
        id: job.getJobId(),
        companyId: job.getCompanyId(),
        title: job.getTitle(),
        salaryMin: job.getSalaryMin(),
        salaryMax: job.getSalaryMax(),
        workMode: job.getWorkMode(),
        city: job.getCity(),
        skills: job.getSkills(),
        description: job.getDescription(),
        imageUrl: job.getImageUrl(),
        status: job.getStatus(),
        createdAt: job.getCreatedAt()
    };
}

function companyToCard(company) {
    if (!company) return null;
    return {
        id: company.getUserId(),
        name: company.getCompanyName() || company.getFullName(),
        logoUrl: company.getLogoId() ? `/api/files/${company.getLogoId()}` : null,
        location: company.getLocation(),
        isVerified: company.getIsVerified()
    };
}

function presentJob(job) {
    return { data: jobToJson(job) };
}

function presentJobs(jobs) {
    return { data: jobs.map(jobToJson) };
}

// FR-12: one card = job + "% fit" + "why it fits you" chips + the company
function presentJobCards(items) {
    return {
        data: items.map(({ job, fit, company }) => ({
            ...jobToJson(job),
            fit: fit.percent,
            whyItFits: fit.matched,
            missingSkills: fit.missing,
            company: companyToCard(company)
        }))
    };
}

function candidateToCard({ seeker, fit, spamReasons }) {
    return {
        id: seeker.getUserId(),
        fullName: seeker.getFullName(),
        headline: seeker.getHeadline(),
        city: seeker.getCity(),
        skills: seeker.getSkills(),
        isVerified: seeker.getIsVerified(),
        fit: fit.percent,
        whyItFits: fit.matched,
        missingSkills: fit.missing,
        spamReasons
    };
}

function presentCandidates({ job, candidates, checkLater }) {
    return {
        data: {
            job: jobToJson(job),
            candidates: candidates.map(candidateToCard),
            checkLater: checkLater.map(candidateToCard)
        }
    };
}

module.exports = { jobToJson, presentJob, presentJobs, presentJobCards, presentCandidates };
