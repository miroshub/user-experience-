const AIChat = require("../../../domain/AIChat");
const JobFilter = require("../../../domain/JobFilter");
const SkillMatcher = require("../../../domain/SkillMatcher");
const Job = require("../../../domain/Job");
const JobSeeker = require("../../../domain/JobSeeker");

// A fake model that always answers the same text and remembers the prompts it got
function fakeModel(answer) {
    const prompts = [];
    return {
        prompts,
        getName: () => "fake",
        connect: async prompt => {
            prompts.push(prompt);
            return typeof answer === "function" ? answer(prompt) : answer;
        }
    };
}

function job(fields) {
    return new Job({ title: "Developer", salaryMin: 10000, salaryMax: 15000, workMode: "remote", city: "", skills: [], ...fields });
}

const NO_FILTERS = { role: null, skills: [], level: null, places: [], minPay: null };

describe("AIChat.ask (FR-19)", () => {
    it("turns the model's JSON into filters and keeps the turn", async () => {
        const model = fakeModel('{"reply":"Got it.","filters":{"role":"Frontend","skills":["React"],"level":"junior","places":["Remote","Cairo"],"minPay":12000}}');
        const chat = new AIChat({ seekerId: "s1" }, model);

        const filters = await chat.ask("  Remote junior React jobs, 12k  ");

        expect(filters).toEqual({ role: "Frontend", skills: ["React"], level: "Junior", places: ["Remote", "Cairo"], minPay: 12000 });
        expect(chat.getUserMessage()).toBe("Remote junior React jobs, 12k");
        expect(chat.getAiReply()).toBe("Got it.");
        expect(chat.getTurns()).toHaveLength(1);
        expect(model.prompts[0].system).toContain("Answer with JSON only");
    });

    it("merges a follow-up into the current filters (FR-20)", async () => {
        const answers = [
            '{"reply":"ok","filters":{"role":"Frontend","places":["Remote","Cairo"]}}',
            '{"reply":"Only remote then.","filters":{"places":["Remote"]}}'
        ];
        const chat = new AIChat({ seekerId: "s1" }, fakeModel(() => answers.shift()));
        await chat.ask("frontend, remote or Cairo");
        const filters = await chat.ask("only remote");
        expect(filters.role).toBe("Frontend");
        expect(filters.places).toEqual(["Remote"]);
    });

    it("sends only the last 6 turns and the current filters to the model (FR-20)", async () => {
        const model = fakeModel('{"reply":"ok","filters":{}}');
        const turns = Array.from({ length: 9 }, (_, i) => ({ userMessage: `q${i}`, aiReply: `a${i}` }));
        const chat = new AIChat({ seekerId: "s1", turns, filters: { minPay: 9000 } }, model);

        await chat.ask("next");

        const { messages, system } = model.prompts[0];
        expect(messages).toHaveLength(6 * 2 + 1);
        expect(messages[0]).toEqual({ role: "user", text: "q3" });
        expect(messages[12]).toEqual({ role: "user", text: "next" });
        expect(system).toContain('"minPay":9000');
    });

    it("refuses empty or very long questions", async () => {
        const chat = new AIChat({ seekerId: "s1" }, fakeModel("{}"));
        await expect(chat.ask("   ")).rejects.toThrow("Type what kind of job");
        await expect(chat.ask(42)).rejects.toThrow("Type what kind of job");
        await expect(chat.ask("x".repeat(501))).rejects.toThrow("500");
    });

    it("turns a model failure into a friendly 503", async () => {
        const model = { connect: async () => { throw new Error("network down"); } };
        const chat = new AIChat({ seekerId: "s1" }, model);
        await expect(chat.ask("react")).rejects.toMatchObject({ status: 503 });
    });

    it("replaceFilters is the x on a chip, with no model call", () => {
        const model = fakeModel("{}");
        const chat = new AIChat({ seekerId: "s1", filters: { role: "Frontend", minPay: 12000 } }, model);
        chat.replaceFilters({ role: "Frontend", minPay: null });
        expect(chat.getSuggestedFilters()).toEqual({ ...NO_FILTERS, role: "Frontend" });
        expect(model.prompts).toHaveLength(0);
        expect(() => chat.replaceFilters("nope")).toThrow("Invalid filters");
        expect(() => chat.replaceFilters([])).toThrow("Invalid filters");
    });

    it("has the class diagram's getters and setters, even before the first question", () => {
        const chat = new AIChat({ chatId: "c1", seekerId: "s1" }, fakeModel("{}"));
        expect(chat.getUserMessage()).toBe("");
        chat.setUserMessage("hi");
        chat.setAiReply("hello");
        chat.setSuggestedFilters({ level: "Senior" });
        expect(chat.getChatId()).toBe("c1");
        expect(chat.getUserMessage()).toBe("hi");
        expect(chat.getAiReply()).toBe("hello");
        expect(chat.getSuggestedFilters().level).toBe("Senior");
    });
});

describe("AIChat.readReply and cleanFilters", () => {
    it("reads JSON wrapped in other text", () => {
        expect(AIChat.readReply('Sure! {"reply":"Hi","filters":{"role":"QA"}} Enjoy')).toEqual({ reply: "Hi", filters: { role: "QA" } });
    });

    it("shows plain text when there is no JSON", () => {
        expect(AIChat.readReply("I cannot help with that")).toEqual({ reply: "I cannot help with that", filters: {} });
        expect(AIChat.readReply("{not json}").filters).toEqual({});
        expect(AIChat.readReply(null).reply).toContain("did not get that");
        expect(AIChat.readReply('{"filters":{}}').reply).toBe("Here are your filters.");
    });

    it("keeps only known keys with safe values", () => {
        const clean = AIChat.cleanFilters({
            role: "  ", skills: ["React", "react", 5, ""], level: "boss", places: "Cairo", minPay: -3, hack: "x"
        });
        expect(clean).toEqual({ role: null, skills: ["React"], level: null, places: [], minPay: null });
        expect(AIChat.cleanFilters(null)).toEqual({});
        expect(AIChat.cleanFilters({ minPay: "15000" })).toEqual({ minPay: 15000 });
    });
});

describe("JobFilter (FR-19)", () => {
    const filter = changes => new JobFilter({ ...NO_FILTERS, ...changes });

    it("matches everything with no filters", () => {
        expect(filter({}).matches(job({}))).toBe(true);
    });

    it("role matches the title or the job's skills", () => {
        const react = filter({ role: "Frontend developer", skills: ["React"] });
        expect(react.matches(job({ title: "Junior Frontend Developer" }))).toBe(true);
        expect(react.matches(job({ title: "React Developer (Junior)", skills: ["React"] }))).toBe(true);
        expect(react.matches(job({ title: "Data Analyst", skills: ["SQL"] }))).toBe(false);
        expect(filter({ role: "QA" }).matches(job({ title: "Tester", skills: ["qa"] }))).toBe(true);
    });

    it("level is read from the title", () => {
        expect(filter({ level: "Intern" }).matches(job({ title: "UI Developer Intern" }))).toBe(true);
        expect(filter({ level: "Intern" }).matches(job({ title: "UI Developer" }))).toBe(false);
        expect(filter({ level: "Junior" }).matches(job({ title: "Senior React Developer" }))).toBe(false);
        expect(filter({ level: "Junior" }).matches(job({ title: "React Developer" }))).toBe(true);
        expect(filter({ level: "Senior" }).matches(job({ title: "Tech Lead" }))).toBe(true);
        expect(filter({ level: "Mid" }).matches(job({ title: "Backend Trainee" }))).toBe(false);
    });

    it("places: remote, a work mode, a city or one of its areas", () => {
        const remoteOrCairo = filter({ places: ["Remote", "Cairo"] });
        expect(remoteOrCairo.matches(job({ workMode: "remote" }))).toBe(true);
        expect(remoteOrCairo.matches(job({ workMode: "hybrid", city: "Maadi" }))).toBe(true);
        expect(remoteOrCairo.matches(job({ workMode: "onsite", city: "Alexandria" }))).toBe(false);
        expect(filter({ places: ["Hybrid"] }).matches(job({ workMode: "hybrid", city: "Giza" }))).toBe(true);
        expect(filter({ places: ["Giza"] }).matches(job({ workMode: "remote", city: "" }))).toBe(false);
    });

    it("minimum pay checks the top of the range", () => {
        expect(filter({ minPay: 15000 }).matches(job({ salaryMax: 15000 }))).toBe(true);
        expect(filter({ minPay: 16000 }).matches(job({ salaryMax: 15000 }))).toBe(false);
    });
});

describe("SkillMatcher.mostWantedMissing (FR-21)", () => {
    it("finds the skill most of the jobs ask for that the seeker lacks", () => {
        const jobs = [job({ skills: ["React", "TypeScript"] }), job({ skills: ["TypeScript"] }), job({ skills: ["Git"] })];
        expect(SkillMatcher.mostWantedMissing(["react"], jobs)).toEqual({ skill: "TypeScript", count: 2 });
        expect(SkillMatcher.mostWantedMissing(["React", "TypeScript", "Git"], jobs)).toBeNull();
    });
});

describe("JobSeeker.askAssistant", () => {
    it("asks through the seeker's own chat only", async () => {
        const seeker = new JobSeeker({ userId: "s1", fullName: "Salma" });
        const mine = new AIChat({ seekerId: "s1" }, fakeModel('{"reply":"ok","filters":{"level":"Junior"}}'));
        expect((await seeker.askAssistant(mine, "junior jobs")).level).toBe("Junior");
        const other = new AIChat({ seekerId: "s2" }, fakeModel("{}"));
        expect(() => seeker.askAssistant(other, "hi")).toThrow("not your chat");
    });
});
