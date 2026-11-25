const CV = require("../../../domain/CV");
const Job = require("../../../domain/Job");
const JobSeeker = require("../../../domain/JobSeeker");

function seeker(skills = ["JavaScript", "HTML", "CSS"]) {
    return new JobSeeker({ userId: "s1", fullName: "Salma Adel", email: "salma@x.co", headline: "Frontend developer", city: "Cairo", skills });
}

function job(skills, title = "Frontend Developer") {
    return new Job({ jobId: `j-${skills.join("-")}`, title, salaryMin: 1, salaryMax: 2, workMode: "remote", skills });
}

const LONG_SUMMARY = Array.from({ length: 14 }, (_, i) => `Sentence number ${i + 1} has a few more words.`).join(" ");

function fullCv(owner = seeker()) {
    return new CV({
        summary: "Fresh graduate who builds web apps.",
        experience: [{ title: "Frontend Intern", company: "Koshk Labs", startDate: "Jul 2026", endDate: "Sep 2026", bullets: ["Rebuilt the sign-up flow"] }],
        education: [{ degree: "BSc Computer Science", school: "Cairo University", startYear: "2022", endYear: "2026" }]
    }, owner);
}

describe("CV.calcAtsScore (FR-09)", () => {
    it("gives 100 when every skill is there and the layout is right", () => {
        expect(fullCv().calcAtsScore(job(["JavaScript", "CSS"]))).toBe(100);
    });

    it("gives 70 keyword points split by the skills found", () => {
        // 1 of 2 skills = 35, plus 30 layout points
        expect(fullCv().calcAtsScore(job(["JavaScript", "React"]))).toBe(65);
    });

    it("finds a skill written in the About me or a role, ignoring case and punctuation", () => {
        const cv = new CV({ summary: "I taught myself react, and node.js." }, seeker([]));
        expect(cv.mentions("React")).toBe(true);
        expect(cv.mentions("Node.js")).toBe(true);
        expect(cv.mentions("Java")).toBe(false);
    });

    it("scores a job with no skills on layout only plus full keyword points", () => {
        const noSkills = new Job({ title: "Anything", salaryMin: 1, salaryMax: 2, workMode: "remote", skills: [] });
        expect(new CV({}, seeker()).calcAtsScore(noSkills)).toBe(70);
    });

    it("loses layout points for a long About me, missing dates and missing sections", () => {
        const cv = new CV({
            summary: LONG_SUMMARY,
            experience: [{ title: "Freelance web projects", company: "", startDate: "", endDate: "", bullets: [] }]
        }, seeker());
        // 70 keyword points + 5 for having an experience section
        expect(cv.calcAtsScore(job(["CSS"]))).toBe(75);
    });
});

describe("CV.scoreAgainst and findMissingSkills", () => {
    it("averages the jobs and stores the score", () => {
        const cv = fullCv();
        const score = cv.scoreAgainst([job(["JavaScript"]), job(["React"])]);
        expect(score).toBe(65); // (100 + 30) / 2
        expect(cv.getAtsScore()).toBe(65);
    });

    it("uses only the layout points when there are no jobs", () => {
        expect(fullCv().scoreAgainst([])).toBe(30);
    });

    it("lists missing skills, most asked first", () => {
        const jobs = [job(["React", "TypeScript"]), job(["React"]), job(["Git", "CSS"])];
        expect(fullCv().findMissingSkills(jobs)).toEqual([
            { skill: "React", count: 2 },
            { skill: "Git", count: 1 },
            { skill: "TypeScript", count: 1 }
        ]);
    });
});

describe("CV form sections (FR-08)", () => {
    it("cleans roles and schools", () => {
        const cv = new CV({}, seeker());
        cv.setExperience([{ title: "  Intern ", company: "Koshk", bullets: ["  did things ", ""] }]);
        cv.setEducation([{ school: "Cairo University" }]);
        cv.setSummary("  Hello  ");
        expect(cv.getExperience()).toEqual([{ title: "Intern", company: "Koshk", startDate: "", endDate: "", bullets: ["did things"] }]);
        expect(cv.getEducation()).toEqual([{ degree: "", school: "Cairo University", startYear: "", endYear: "" }]);
        expect(cv.getSummary()).toBe("Hello");
    });

    it("refuses bad input", () => {
        const cv = new CV({}, seeker());
        expect(() => cv.setExperience("nope")).toThrow("must be a list");
        expect(() => cv.setExperience([{ company: "No title" }])).toThrow("title");
        expect(() => cv.setExperience([null])).toThrow("title");
        expect(() => cv.setExperience(Array(11).fill({ title: "x" }))).toThrow("10");
        expect(() => cv.setEducation([{}])).toThrow("degree or a name");
        expect(() => cv.setEducation([5])).toThrow("degree or a name");
        expect(() => cv.setSummary(42)).toThrow("must be text");
        expect(() => cv.setSummary("x".repeat(2001))).toThrow("2000");
    });

    it("knows which roles miss dates and whether the About me is too long", () => {
        const cv = new CV({
            summary: LONG_SUMMARY,
            experience: [
                { title: "A", startDate: "2025", endDate: "2026", bullets: [] },
                { title: "B", startDate: "2025", endDate: "", bullets: [] }
            ]
        }, seeker());
        expect(cv.getRolesMissingDates()).toEqual([1]);
        expect(cv.isSummaryTooLong()).toBe(true);
        expect(cv.getSummaryWordCount()).toBe(14 * 8);
    });

    it("shortens the About me to whole sentences under 60 words", () => {
        const cv = new CV({ summary: LONG_SUMMARY }, seeker());
        const short = cv.shortenSummary();
        expect(short.split(" ").length).toBeLessThanOrEqual(60);
        expect(short.endsWith(".")).toBe(true);
    });

    it("cuts one very long sentence at 60 words", () => {
        const cv = new CV({ summary: "word ".repeat(80).trim() }, seeker());
        expect(cv.shortenSummary().split(" ")).toHaveLength(60);
    });

    it("copyWith changes the copy only", () => {
        const cv = fullCv();
        const copy = cv.copyWith({ skills: ["React"] });
        expect(copy.getSkills()).toEqual(["React"]);
        expect(cv.getSkills()).toEqual(["JavaScript", "HTML", "CSS"]);
        expect(copy.getOwner()).toBe(cv.getOwner());
    });

    it("exportPdf hands the CV to the exporter (FR-10)", async () => {
        const cv = fullCv();
        const exporter = { export: vi.fn().mockResolvedValue(Buffer.from("pdf")) };
        expect(await cv.exportPdf(exporter)).toEqual(Buffer.from("pdf"));
        expect(exporter.export).toHaveBeenCalledWith(cv);
    });

    it("has the class diagram's getters and setters", () => {
        const cv = new CV({ cvId: "c1", pdfFileId: "f1", updatedAt: "2026-11-20" }, seeker());
        cv.setAtsScore(50);
        cv.setPdfFileId("f2");
        expect(cv.getCvId()).toBe("c1");
        expect(cv.getAtsScore()).toBe(50);
        expect(cv.getPdfFileId()).toBe("f2");
        expect(cv.getUpdatedAt()).toBeInstanceOf(Date);
    });
});
