const { interviewToJson } = require("./interviewView");

function matchToJson(match, now = new Date()) {
    return {
        id: match.getMatchId(),
        seekerId: match.getSeekerId(),
        jobId: match.getJobId(),
        companyId: match.getCompanyId(),
        status: match.getStatus(),
        matchedAt: match.getMatchedAt(),
        lastActivity: match.getLastActivity(),
        lastActor: match.getLastActor(),
        stepDates: match.getStepDates(),
        closeReason: match.getCloseReason(),
        closedBy: match.getClosedBy(),
        isWaiting: match.isWaiting(now),
        quietDays: match.quietDays(now)
    };
}

// "The other person": the company for a seeker, the seeker for a company
function otherToJson(other) {
    if (!other) return null;
    if (other.getRole() === "company") {
        return {
            id: other.getUserId(),
            role: "company",
            name: other.getCompanyName() || other.getFullName(),
            contactName: other.getFullName(),
            location: other.getLocation(),
            logoUrl: other.getLogoId() ? `/api/files/${other.getLogoId()}` : null
        };
    }
    return {
        id: other.getUserId(),
        role: other.getRole(),
        name: other.getFullName(),
        headline: other.getRole() === "seeker" ? other.getHeadline() : "",
        city: other.getRole() === "seeker" ? other.getCity() : ""
    };
}

function jobToSummary(job) {
    if (!job) return null;
    return {
        id: job.getJobId(),
        title: job.getTitle(),
        salaryMin: job.getSalaryMin(),
        salaryMax: job.getSalaryMax(),
        workMode: job.getWorkMode(),
        city: job.getCity()
    };
}

function itemToJson({ match, job, other, interviews = [] }, side) {
    return {
        ...matchToJson(match),
        job: jobToSummary(job),
        with: otherToJson(other),
        interviews: interviews.map(i => interviewToJson(i, side))
    };
}

function sideFor(user, match) {
    return match.sideOf(user.getUserId());
}

function presentMatches(items, user) {
    return { data: items.map(item => itemToJson(item, sideFor(user, item.match))) };
}

function presentMatchDetail(detail) {
    return { data: { ...itemToJson(detail, detail.mySide), callLink: detail.callLink, mySide: detail.mySide } };
}

function presentMatch(match) {
    return { data: matchToJson(match) };
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

module.exports = { matchToJson, presentMatches, presentMatchDetail, presentMatch, presentSwipeResult };
