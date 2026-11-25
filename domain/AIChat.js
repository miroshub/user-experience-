const AppError = require("../errors/AppError");

const MEMORY_TURNS = 6;      // FR-20: the last 6 questions and answers go back to the model
const MAX_TEXT = 500;
const LEVELS = ["Intern", "Junior", "Mid", "Senior"];
const EMPTY_FILTERS = { role: null, skills: [], level: null, places: [], minPay: null };

const SYSTEM_PROMPT = [
    "You help job seekers in Egypt find jobs on Wuzzufny.",
    "Turn the user's message into job search filters.",
    "Answer with JSON only, no other text, in this shape:",
    '{"reply": "one or two short sentences", "filters": {"role": string or null, "skills": [strings],',
    '"level": "Intern" | "Junior" | "Mid" | "Senior" | null, "places": ["Remote" or city names], "minPay": number or null}}',
    "minPay is the monthly salary in EGP, so 12k means 12000.",
    "Always send every filter key. Keep the current filters unless the user changes them; use null or [] to clear one.",
    "If the user asks which jobs fit their CV best, keep the filters and say the list is sorted by fit."
].join("\n");

function cleanWords(value, maxItems) {
    if (!Array.isArray(value)) return [];
    const clean = [];
    for (const item of value) {
        if (typeof item !== "string") continue;
        const word = item.trim().slice(0, 30);
        if (word !== "" && !clean.some(c => c.toLowerCase() === word.toLowerCase())) clean.push(word);
    }
    return clean.slice(0, maxItems);
}

// From the class diagram: the seeker's chat with the AI helper (FR-19, FR-20).
// It gets its AIModel through the constructor, so it works with any provider (Strategy pattern).
class AIChat {
    #chatId;
    #seekerId;
    #filters;
    #turns;
    #model;

    constructor(data, model) {
        this.#chatId = data.chatId || null;
        this.#seekerId = data.seekerId;
        this.#filters = { ...EMPTY_FILTERS, ...(data.filters || {}) };
        this.#turns = (data.turns || []).map(turn => ({ ...turn }));
        this.#model = model;
    }

    getChatId() { return this.#chatId; }
    getSeekerId() { return this.#seekerId; }
    getTurns() { return this.#turns.map(turn => ({ ...turn })); }

    // The class diagram's three attributes are the latest turn
    getUserMessage() { return this.#lastTurn().userMessage || ""; }
    setUserMessage(value) { this.#lastTurn().userMessage = value; }

    getAiReply() { return this.#lastTurn().aiReply || ""; }
    setAiReply(value) { this.#lastTurn().aiReply = value; }

    getSuggestedFilters() { return { ...this.#filters, skills: [...this.#filters.skills], places: [...this.#filters.places] }; }
    setSuggestedFilters(value) { this.#filters = { ...EMPTY_FILTERS, ...AIChat.cleanFilters(value) }; }

    // FR-19 + FR-20, from the class diagram: ask in normal words, get filters back.
    // The new filters are merged into the current ones, so a follow-up like "only remote" changes one filter.
    async ask(text) {
        if (typeof text !== "string" || text.trim() === "") throw new AppError("Type what kind of job you want", 400);
        if (text.length > MAX_TEXT) throw new AppError(`Keep it under ${MAX_TEXT} characters`, 400);

        let answer;
        try {
            answer = await this.#model.connect(this.#buildPrompt(text.trim()));
        } catch {
            throw new AppError("The assistant is not available right now. Try again in a minute.", 503);
        }

        const { reply, filters } = AIChat.readReply(answer);
        this.#filters = { ...this.#filters, ...AIChat.cleanFilters(filters) };
        this.#turns.push({ userMessage: text.trim(), aiReply: reply, filters: this.getSuggestedFilters(), askedAt: new Date() });
        return this.getSuggestedFilters();
    }

    // The x on a chip: the seeker edits the filters without asking the model
    replaceFilters(filters) {
        if (!filters || typeof filters !== "object" || Array.isArray(filters)) throw new AppError("Invalid filters", 400);
        this.setSuggestedFilters(filters);
    }

    #buildPrompt(text) {
        const messages = [];
        for (const turn of this.#turns.slice(-MEMORY_TURNS)) {
            messages.push({ role: "user", text: turn.userMessage });
            messages.push({ role: "assistant", text: turn.aiReply });
        }
        messages.push({ role: "user", text });
        const system = `${SYSTEM_PROMPT}\nCurrent filters: ${JSON.stringify(this.#filters)}`;
        return { system, messages };
    }

    #lastTurn() {
        if (this.#turns.length === 0) this.#turns.push({ userMessage: "", aiReply: "", filters: this.getSuggestedFilters() });
        return this.#turns[this.#turns.length - 1];
    }

    // Models sometimes wrap the JSON in other text, so only the part between the first { and the last } is read
    static readReply(answer) {
        const text = typeof answer === "string" ? answer : "";
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start !== -1 && end > start) {
            try {
                const json = JSON.parse(text.slice(start, end + 1));
                const reply = typeof json.reply === "string" && json.reply.trim() !== "" ? json.reply.trim() : "Here are your filters.";
                return { reply: reply.slice(0, MAX_TEXT), filters: json.filters || {} };
            } catch {
                // not JSON after all: fall through and show the text as it is
            }
        }
        const reply = text.trim().slice(0, MAX_TEXT) || "Sorry, I did not get that. Try other words.";
        return { reply, filters: {} };
    }

    // Never trust what the model sends: only known keys, the right types and sensible sizes.
    // A key the model left out is not returned, so the merge in ask() keeps the old value.
    static cleanFilters(raw) {
        const clean = {};
        if (!raw || typeof raw !== "object") return clean;
        if ("role" in raw) clean.role = typeof raw.role === "string" && raw.role.trim() !== "" ? raw.role.trim().slice(0, 40) : null;
        if ("skills" in raw) clean.skills = cleanWords(raw.skills, 10);
        if ("level" in raw) {
            const level = typeof raw.level === "string" ? raw.level.trim().toLowerCase() : "";
            clean.level = LEVELS.find(l => l.toLowerCase() === level) || null;
        }
        if ("places" in raw) clean.places = cleanWords(raw.places, 5);
        if ("minPay" in raw) {
            const pay = Number(raw.minPay);
            clean.minPay = Number.isFinite(pay) && pay > 0 && pay <= 1000000 ? Math.round(pay) : null;
        }
        return clean;
    }
}

AIChat.MEMORY_TURNS = MEMORY_TURNS;
AIChat.SYSTEM_PROMPT = SYSTEM_PROMPT;

module.exports = AIChat;
