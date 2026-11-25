// Interface from the class diagram: one AI provider (GeminiFlash, Haiku, Sonnet, MockModel).
// AIChat only knows this interface, so a new provider is one new class (Open/Closed)
// and any provider can replace another (Liskov). This is the Strategy pattern.
class AIModel {
    constructor() {
        if (new.target === AIModel) throw new Error("AIModel is an interface");
    }

    // Short name shown in logs, e.g. "gemini"
    getName() {
        throw new Error("getName not implemented");
    }

    // prompt = { system: "...", messages: [{ role: "user" | "assistant", text: "..." }] }
    // Resolves to the model's answer as plain text.
    async connect(prompt) {
        throw new Error("connect not implemented");
    }
}

module.exports = AIModel;
