const CV = require("../../../domain/CV");
const Job = require("../../../domain/Job");
const JobSeeker = require("../../../domain/JobSeeker");
const CvAdvisor = require("../../../rules/CvAdvisor");
const CvTipRule = require("../../../interfaces/CvTipRule");
const MissingSkillsRule = require("../../../rules/cv/MissingSkillsRule");
const SummaryRule = require("../../../rules/cv/SummaryRule");
const MissingDatesRule = require("../../../rules/cv/MissingDatesRule");
const MissingSectionsRule = require("../../../rules/cv/MissingSectionsRule");

const owner = new JobSeeker({ userId: "s1", fullName: "Salma Adel", skills: ["JavaScript", "CSS"] });
const LONG = "This About me has far too many words in it. ".repeat(14).trim();

function job(skills) {
    return new Job({ title: "Frontend Developer", salaryMin: 1, salaryMax: 2, workMode: "remote", skills });
}

// The Figma example: long About me, one role without dates, React missing
function salmaCv() {
    return new CV({
        summary: LONG,
        experience: [
            { title: "Frontend Intern", company: "Koshk Labs", startDate: "Jul 2026", endDate: "Sep 2026", bullets: [] },
            { title: "Freelance web projects", company: "", startDate: "", endDate: "", bullets: [] }
        ],
        education: [{ degree: "BSc Computer Science", school: "Cairo University", startYear: "2022", endYear: "2026" }]
    }, owner);
}

const advisor = new CvAdvisor([new MissingSkillsRule(2), new SummaryRule(), new MissingDatesRule(), new MissingSectionsRule()], 5);

describe("CvAdvisor (FR-09)", () => {
    it("gives the score, the fixes with their points, and the score after the fixes", () => {
        const jobs = [job(["React", "JavaScript"]), job(["React", "CSS"]), job(["JavaScript"])];
        const report = advisor.advise(salmaCv(), { jobs, jobWord: "saved jobs" });

        expect(report.tips.map(t => t.key)).toEqual(["skill:react", "summary:long", "dates"]);
        expect(report.tips[0]).toMatchObject({
            text: "Add React to your skills. 2 of your saved jobs ask for it.",
            action: { type: "addSkill", skill: "React" }
        });
        expect(report.tips[1].text).toBe('Your "About me" is 140 words. Aim for under 60.');
        expect(report.tips[2]).toMatchObject({ text: 'Add start and end dates to "Freelance web projects".', action: { type: "open", section: "experience", index: 1 } });
        for (const tip of report.tips) expect(tip.gain).toBeGreaterThan(0);
        expect(report.potential).toBe(Math.min(100, report.score + report.tips.reduce((s, t) => s + t.gain, 0)));
    });

    it("never gives more than the maximum number of tips", () => {
        const many = new CvAdvisor([new MissingSkillsRule(5)], 2);
        const jobs = [job(["A1", "B1", "C1", "D1"])];
        expect(many.advise(salmaCv(), { jobs, jobWord: "open jobs" }).tips).toHaveLength(2);
    });

    it("drops tips that would not add points", () => {
        const useless = { suggest: cv => [{ key: "x", text: "x", action: {}, fixed: cv.copyWith({}) }] };
        expect(new CvAdvisor([useless], 5).advise(salmaCv(), { jobs: [], jobWord: "open jobs" }).tips).toEqual([]);
    });
});

describe("CV tip rules", () => {
    it("CvTipRule is an interface", () => {
        expect(() => new CvTipRule()).toThrow("interface");
        class Half extends CvTipRule {}
        expect(() => new Half().suggest()).toThrow("not implemented");
    });

    it("MissingSkillsRule uses the singular for one job", () => {
        const [tip] = new MissingSkillsRule(1).suggest(salmaCv(), { jobs: [job(["Git"])], jobWord: "open jobs" });
        expect(tip.text).toBe("Add Git to your skills. 1 of your open jobs asks for it.");
        expect(tip.fixed.getSkills()).toContain("Git");
    });

    it("SummaryRule asks for an About me when it is empty, and is quiet when it is fine", () => {
        expect(new SummaryRule().suggest(new CV({}, owner))[0].action).toEqual({ type: "open", section: "about" });
        expect(new SummaryRule().suggest(new CV({ summary: "Short and sweet." }, owner))).toEqual([]);
    });

    it("MissingDatesRule is quiet when every role has dates", () => {
        expect(new MissingDatesRule().suggest(new CV({}, owner))).toEqual([]);
    });

    it("MissingSectionsRule asks for experience and education", () => {
        const keys = new MissingSectionsRule().suggest(new CV({}, owner)).map(t => t.key);
        expect(keys).toEqual(["section:experience", "section:education"]);
        expect(new MissingSectionsRule().suggest(salmaCv())).toEqual([]);
    });
});
