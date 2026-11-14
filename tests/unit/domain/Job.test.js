const Company = require("../../../domain/Company");
const Job = require("../../../domain/Job");

const company = new Company({ userId: "c1", fullName: "Nile HR", email: "hr@nile.co" });
const goodJob = { title: "Junior Frontend Developer", salaryMin: 14000, salaryMax: 18000, workMode: "hybrid", city: "Maadi", skills: ["React", "JavaScript"] };

describe("Company.postJob (FR-30)", () => {
    it("makes a live job owned by the company", () => {
        const job = company.postJob(goodJob);
        expect(job.isLive()).toBe(true);
        expect(job.belongsTo("c1")).toBe(true);
        expect(job.getSkills()).toEqual(["React", "JavaScript"]);
    });

    it("checks the fields", () => {
        expect(() => company.postJob({ ...goodJob, title: "" })).toThrow("Job title is required");
        expect(() => company.postJob({ ...goodJob, salaryMin: 20000 })).toThrow("Minimum salary cannot be above the maximum");
        expect(() => company.postJob({ ...goodJob, salaryMin: "14k" })).toThrow("whole number");
        expect(() => company.postJob({ ...goodJob, workMode: "space" })).toThrow("remote, hybrid or onsite");
        expect(() => company.postJob({ ...goodJob, city: "" })).toThrow("City is required unless the job is remote");
        expect(() => company.postJob({ ...goodJob, skills: [] })).toThrow("Add at least one skill");
        expect(() => company.postJob({ ...goodJob, description: "x".repeat(1001) })).toThrow("1000 characters");
    });

    it("a remote job needs no city", () => {
        expect(() => company.postJob({ ...goodJob, workMode: "remote", city: "" })).not.toThrow();
    });
});

describe("Job.edit, pause, resume, close (FR-31, FR-32)", () => {
    it("edits any field and re-checks the job", () => {
        const job = company.postJob(goodJob);
        job.edit({ salaryMax: 20000, skills: ["React", "TypeScript"] });
        expect(job.getSalaryMax()).toBe(20000);
        expect(() => job.edit({ salaryMax: 100 })).toThrow("Minimum salary cannot be above the maximum");
        expect(() => job.edit({ status: "live" })).toThrow('"status" cannot be changed here');
    });

    it("moves live -> paused -> live -> closed, and no further", () => {
        const job = company.postJob(goodJob);
        job.pause();
        expect(job.getStatus()).toBe("paused");
        expect(() => job.pause()).toThrow("Only a live job can be paused");
        job.resume();
        expect(job.isLive()).toBe(true);
        expect(() => job.resume()).toThrow("Only a paused job");
        job.close();
        expect(() => job.close()).toThrow("already closed");
        expect(() => job.edit({ title: "New" })).toThrow("A closed job cannot be edited");
    });

    it("getters and setters", () => {
        const job = new Job({ ...goodJob, jobId: "j1", companyId: "c1" });
        job.setJobId("j2");
        job.setImageUrl("/api/files/f1");
        job.setStatus("paused");
        job.setCity("Giza");
        job.setTitle("QA");
        expect([job.getJobId(), job.getImageUrl(), job.getStatus(), job.getCity(), job.getTitle(), job.getDescription()])
            .toEqual(["j2", "/api/files/f1", "paused", "Giza", "QA", ""]);
        expect(() => job.setCity(4)).toThrow("City must be text");
        expect(() => job.setDescription(4)).toThrow("Description must be text");
        expect(() => job.setSkills("React")).toThrow("Skills must be a list");
        expect(() => job.setTitle("x".repeat(81))).toThrow("80 characters");
    });
});
