const AIModel = require("../../interfaces/AIModel");

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Google Gemini Flash (AI_MODEL=gemini). The key stays on the server and never reaches the browser (NFR-04).
// fetch is passed in, so the tests can fake the network.
class GeminiFlash extends AIModel {
    #apiKey;
    #modelId;
    #fetch;

    constructor(apiKey, modelId, fetchFn) {
        super();
        this.#apiKey = apiKey;
        this.#modelId = modelId;
        this.#fetch = fetchFn;
    }

    getName() {
        return "gemini";
    }

    async connect(prompt) {
        const body = {
            systemInstruction: { parts: [{ text: prompt.system }] },
            // Gemini calls the assistant "model"
            contents: prompt.messages.map(message => ({
                role: message.role === "assistant" ? "model" : "user",
                parts: [{ text: message.text }]
            })),
            generationConfig: { responseMimeType: "application/json" }
        };

        const response = await this.#fetch(`${API_URL}/${this.#modelId}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": this.#apiKey },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            // Google explains the problem (bad key, unknown model, quota) in the body
            const details = response.json ? await response.json().catch(() => ({})) : {};
            const reason = details.error?.message ? `: ${details.error.message}` : "";
            throw new Error(`Gemini answered with status ${response.status}${reason}`);
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        return parts.map(part => part.text || "").join("");
    }
}

module.exports = GeminiFlash;
