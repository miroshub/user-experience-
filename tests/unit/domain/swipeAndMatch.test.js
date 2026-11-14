const JobSeeker = require("../../../domain/JobSeeker");
const Company = require("../../../domain/Company");
const Swipe = require("../../../domain/Swipe");
const Match = require("../../../domain/Match");
const SkillMatcher = require("../../../domain/SkillMatcher");

const seeker = new JobSeeker({ userId: "s1", fullName: "Salma", email: "s@s.co", skills: ["React"] });
const company = new Company({ userId: "c1", fullName: "Nile HR", email: "hr@nile.co" });
const otherCompany = new Company({ userId: "c2", fullName: "Other", email: "o@o.co" });

function liveJob() {
    const job = company.postJob({ title: "Dev", salaryMin: 1, salaryMax: 2, workMode: "remote", skills: ["React"] });
    job.setJobId("j1");
    return job;
}

describe("Swipe.checkForMatch (FR-17)", () => {
    const seekerYes = new Swipe({ seekerId: "s1", jobId: "j1", swipedBy: "seeker", isInterested: true });
    const companyYes = new Swipe({ seekerId: "s1", jobId: "j1", swipedBy: "company", isInterested: true });
    const companyNo = new Swipe({ seekerId: "s1", jobId: "j1", swipedBy: "company", isInterested: false });

    it("matches when both sides say yes", () => {
        expect(seekerYes.checkForMatch(companyYes)).toBe(true);
        expect(companyYes.checkForMatch(seekerYes)).toBe(true);
    });

    it("does not match on a no, a missing swipe, the same side, or another job", () => {
        expect(seekerYes.checkForMatch(companyNo)).toBe(false);
        expect(seekerYes.checkForMatch(null)).toBe(false);
        expect(seekerYes.checkForMatch(seekerYes)).toBe(false);
        const otherJob = new Swipe({ seekerId: "s1", jobId: "j2", swipedBy: "company", isInterested: true });
        expect(seekerYes.checkForMatch(otherJob)).toBe(false);
        const otherSeeker = new Swipe({ seekerId: "s2", jobId: "j1", swipedBy: "company", isInterested: true });
        expect(seekerYes.checkForMatch(otherSeeker)).toBe(false);
    });

    it("getters and setters", () => {
        const swipe = new Swipe({ seekerId: "s1", jobId: "j1", swipedBy: "seeker" });
        swipe.setSwipedBy("company");
        swipe.setIsInterested(true);
        swipe.setSwipedAt(new Date(0));
        expect([swipe.getSwipedBy(), swipe.getIsInterested(), swipe.getSwipedAt().getTime(), swipe.getSwipeId()])
            .toEqual(["company", true, 0, null]);
    });
});

describe("swipeOnJob and swipeOnSeeker", () => {
    it("a seeker swipe on a live job", () => {
        const swipe = seeker.swipeOnJob(liveJob(), true);
        expect([swipe.getSwipedBy(), swipe.getIsInterested(), swipe.getJobId()]).toEqual(["seeker", true, "j1"]);
    });

    it("no swipe on a paused job", () => {
        const job = liveJob();
        job.pause();
        expect(() => seeker.swipeOnJob(job, true)).toThrow("no longer open");
        expect(() => company.swipeOnSeeker(seeker, true, job)).toThrow("not live");
    });

    it("a company can only swipe for its own job, on a seeker", () => {
        expect(company.swipeOnSeeker(seeker, false, liveJob()).getSwipedBy()).toBe("company");
        expect(() => otherCompany.swipeOnSeeker(seeker, true, liveJob())).toThrow("Job not found");
        expect(() => company.swipeOnSeeker(company, true, liveJob())).toThrow("Candidate not found");
    });
});

describe("Match (FR-27, FR-28, FR-29)", () => {
    const day = 24 * 60 * 60 * 1000;
    const start = new Date("2026-11-01T10:00:00Z");

    it("status only moves forward", () => {
        const match = new Match({ seekerId: "s1", jobId: "j1", companyId: "c1", matchedAt: start });
        match.moveTo("chatting");
        match.moveTo("interview");
        expect(() => match.moveTo("matched")).toThrow("only move forward");
        expect(() => match.moveTo("party")).toThrow("Unknown status");
    });

    it("is waiting after 5 quiet days", () => {
        const match = new Match({ seekerId: "s1", jobId: "j1", companyId: "c1", matchedAt: start });
        expect(match.isWaiting(new Date(start.getTime() + 4 * day))).toBe(false);
        expect(match.isWaiting(new Date(start.getTime() + 5 * day))).toBe(true);
    });

    it("closing needs a reason, and a closed match stays closed", () => {
        const match = new Match({ seekerId: "s1", jobId: "j1", companyId: "c1", matchedAt: start });
        expect(() => match.close("  ")).toThrow("pick a reason");
        match.close("Position filled");
        expect(match.getCloseReason()).toBe("Position filled");
        expect(match.isWaiting(new Date(start.getTime() + 30 * day))).toBe(false);
        expect(() => match.close("again")).toThrow("already closed");
        expect(() => match.moveTo("offer")).toThrow("closed");
    });

    it("only its two members are involved", () => {
        const match = new Match({ seekerId: "s1", jobId: "j1", companyId: "c1" });
        expect([match.involves("s1"), match.involves("c1"), match.involves("x")]).toEqual([true, true, false]);
        match.setStatus("offer");
        match.setMatchedAt(start);
        match.setLastActivity(start);
        match.setCloseReason(null);
        expect([match.getStatus(), match.getMatchedAt(), match.getLastActivity()]).toEqual(["offer", start, start]);
    });
});

describe("SkillMatcher (% fit)", () => {
    it("counts the wanted skills someone has, ignoring case", () => {
        expect(SkillMatcher.compare(["react", "CSS"], ["React", "JavaScript"])).toEqual({ percent: 50, matched: ["React"], missing: ["JavaScript"] });
        expect(SkillMatcher.compare(["React"], []).percent).toBe(0);
    });
});
