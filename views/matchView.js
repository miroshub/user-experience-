function matchToJson(match) {
    return {
        id: match.getMatchId(),
        seekerId: match.getSeekerId(),
        jobId: match.getJobId(),
        companyId: match.getCompanyId(),
        status: match.getStatus(),
        matchedAt: match.getMatchedAt(),
        lastActivity: match.getLastActivity(),
        closeReason: match.getCloseReason(),
        isWaiting: match.isWaiting()
    };
}

function otherToJson(other) {
    if (!other) return null;
    const name = other.getRole() === "company" ? other.getCompanyName() || other.getFullName() : other.getFullName();
    return { id: other.getUserId(), name, role: other.getRole() };
}

function presentMatches(items) {
    return {
        data: items.map(({ match, job, other }) => ({
            ...matchToJson(match),
            job: job ? { id: job.getJobId(), title: job.getTitle() } : null,
            with: otherToJson(other)
        }))
    };
}

// The answer to a swipe: match is null unless both sides said yes
function presentSwipeResult({ swipe, match, job }) {
    return {
        data: {
            jobId: swipe.getJobId(),
            seekerId: swipe.getSeekerId(),
            interested: swipe.getIsInterested(),
            match: match ? { ...matchToJson(match), job: { id: job.getJobId(), title: job.getTitle() } } : null
        }
    };
}

module.exports = { matchToJson, presentMatches, presentSwipeResult };
