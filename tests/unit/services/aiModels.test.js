const AIModel = require("../../../interfaces/AIModel");
const CvExporter = require("../../../interfaces/CvExporter");
const MockModel = require("../../../services/ai/MockModel");
const GeminiFlash = require("../../../services/ai/GeminiFlash");
const ClaudeModel = require("../../../services/ai/ClaudeModel");
const Haiku = require("../../../services/ai/Haiku");
const Sonnet = require("../../../services/ai/Sonnet");
const PdfExporter = require("../../../services/export/PdfExporter");
const AIChat = require("../../../domain/AIChat");
const CV = require("../../../domain/CV");
const JobSeeker = require("../../../domain/JobSeeker");

const ANSWER = '{"reply":"ok","filters":{"level":"Junior"}}';
const PROMPT = {
    system: "Answer with JSON",
    messages: [
        { role: "user", text: "junior jobs" },
        { role: "assistant", text: "ok" },
        { role: "user", text: "only remote" }
    ]
};

// Fake network: the same answer every time, and the requests are kept to check them
function fakeFetch() {
    const fn = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: ANSWER }] } }] }) }));
    return fn;
}

function fakeAnthropic(stopReason = "end_turn") {
    const reply = { stop_reason: stopReason, content: [{ type: "thinking", thinking: "" }, { type: "text", text: ANSWER }] };
    return {
        messages: { create: vi.fn(async () => reply) },
        beta: { messages: { create: vi.fn(async () => reply) } }
    };
}

// LSP: every AIModel must be usable wherever an AIModel is expected.
// The same checks run on every provider, with the network faked.
const providers = [
    ["MockModel", () => new MockModel()],
    ["GeminiFlash", () => new GeminiFlash("test-key", "gemini-test", fakeFetch())],
    ["Haiku", () => new Haiku(fakeAnthropic())],
    ["Sonnet", () => new Sonnet(fakeAnthropic())]
];

describe.each(providers)("%s keeps the AIModel contract (LSP)", (name, build) => {
    it("is an AIModel with a name", () => {
        const model = build();
        expect(model).toBeInstanceOf(AIModel);
        expect(typeof model.getName()).toBe("string");
        expect(model.getName().length).toBeGreaterThan(0);
    });

    it("connect(prompt) resolves to text that AIChat can read", async () => {
        const answer = await build().connect(PROMPT);
        expect(typeof answer).toBe("string");
        expect(AIChat.readReply(answer).reply.length).toBeGreaterThan(0);
    });

    it("works inside AIChat without AIChat knowing which one it is", async () => {
        const chat = new AIChat({ seekerId: "s1" }, build());
        const filters = await chat.ask("junior React jobs");
        expect(filters.level).toBe("Junior");
    });
});

describe("AIModel interface", () => {
    it("cannot be created, and missing methods throw", async () => {
        expect(() => new AIModel()).toThrow("interface");
        class Half extends AIModel {}
        expect(() => new Half().getName()).toThrow("not implemented");
        await expect(new Half().connect(PROMPT)).rejects.toThrow("not implemented");
        expect(() => new ClaudeModel(fakeAnthropic(), "x")).toThrow("Haiku or Sonnet");
    });
});

describe("the providers send the right request", () => {
    it("GeminiFlash: system text, user/model roles, JSON answers, key in a header", async () => {
        const fetch = fakeFetch();
        await new GeminiFlash("secret", "gemini-test", fetch).connect(PROMPT);
        const [url, options] = fetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(url).toContain("/models/gemini-test:generateContent");
        expect(url).not.toContain("secret");
        expect(options.headers["x-goog-api-key"]).toBe("secret");
        expect(body.systemInstruction.parts[0].text).toBe("Answer with JSON");
        expect(body.contents.map(c => c.role)).toEqual(["user", "model", "user"]);
        expect(body.generationConfig.responseMimeType).toBe("application/json");
    });

    it("GeminiFlash: an error status or an empty answer", async () => {
        const failing = vi.fn(async () => ({ ok: false, status: 429 }));
        await expect(new GeminiFlash("k", "m", failing).connect(PROMPT)).rejects.toThrow("429");
        const empty = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
        expect(await new GeminiFlash("k", "m", empty).connect(PROMPT)).toBe("");
    });

    it("Haiku: the Messages API with the Haiku model and only the text blocks back", async () => {
        const client = fakeAnthropic();
        expect(await new Haiku(client).connect(PROMPT)).toBe(ANSWER);
        const params = client.messages.create.mock.calls[0][0];
        expect(params.model).toBe("claude-haiku-5-5");
        expect(params.system).toBe("Answer with JSON");
        expect(params.messages[1]).toEqual({ role: "assistant", content: "ok" });
    });

    it("Sonnet: the beta endpoint with the refusal fallback", async () => {
        const client = fakeAnthropic();
        await new Sonnet(client).connect(PROMPT);
        const params = client.beta.messages.create.mock.calls[0][0];
        expect(params.model).toBe("claude-sonnet-5-5");
        expect(params.fallbacks).toBe("default");
        expect(params.betas).toContain("server-side-fallback-2026-07-01");
    });

    it("a refusal becomes an error, which AIChat shows as a 503", async () => {
        await expect(new Haiku(fakeAnthropic("refusal")).connect(PROMPT)).rejects.toThrow("declined");
    });
});

describe("MockModel reads normal words (FR-19)", () => {
    async function ask(text) {
        const answer = await new MockModel().connect({ system: "", messages: [{ role: "user", text }] });
        return JSON.parse(answer);
    }

    it("the Figma example", async () => {
        const { filters, reply } = await ask("Remote junior React jobs. Cairo is fine too. At least 12k a month.");
        expect(filters).toEqual({ skills: ["React"], role: "Frontend", level: "Junior", places: ["Remote", "Cairo"], minPay: 12000 });
        expect(reply).toContain("Here are your filters");
    });

    it("a role word, a full salary and an internship", async () => {
        const { filters } = await ask("backend internship in Giza, 9000 EGP");
        expect(filters).toEqual({ role: "Backend", level: "Intern", places: ["Giza"], minPay: 9000 });
    });

    it("\"which jobs fit my CV best?\" keeps the filters", async () => {
        const { filters, reply } = await ask("Which jobs fit my CV best?");
        expect(filters).toEqual({});
        expect(reply).toContain("fit your CV");
    });

    it("says so when it finds nothing", async () => {
        const { reply } = await ask("hello there");
        expect(reply).toContain("could not find");
    });
});

describe("PdfExporter (FR-10)", () => {
    it("is a CvExporter and makes a real PDF file", async () => {
        const owner = new JobSeeker({ userId: "s1", fullName: "Salma Adel", email: "s@x.co", headline: "Frontend developer", city: "Cairo", skills: ["React", "CSS"] });
        const cv = new CV({
            summary: "Fresh graduate.",
            experience: [{ title: "Intern", company: "Koshk Labs", startDate: "Jul 2026", endDate: "Sep 2026", bullets: ["Built things"] }, { title: "Freelance", bullets: [] }],
            education: [{ degree: "BSc", school: "Cairo University", startYear: "2022", endYear: "2026" }]
        }, owner);
        const exporter = new PdfExporter();
        expect(exporter).toBeInstanceOf(CvExporter);
        const pdf = await cv.exportPdf(exporter);
        expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    });

    it("works for an empty CV too", async () => {
        const owner = new JobSeeker({ userId: "s1", fullName: "New Person" });
        const pdf = await new PdfExporter().export(new CV({ skills: [] }, owner));
        expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    });

    it("CvExporter is an interface", async () => {
        expect(() => new CvExporter()).toThrow("interface");
        class Half extends CvExporter {}
        await expect(new Half().export()).rejects.toThrow("not implemented");
    });
});
