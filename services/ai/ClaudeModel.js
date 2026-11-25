const AIModel = require("../../interfaces/AIModel");

// The shared part of Haiku and Sonnet: both use Anthropic's Messages API through the official SDK.
// The SDK client is passed in (built in container.js), so the tests can fake it.
class ClaudeModel extends AIModel {
    #client;
    #modelId;

    constructor(client, modelId) {
        super();
        if (new.target === ClaudeModel) throw new Error("Use Haiku or Sonnet");
        this.#client = client;
        this.#modelId = modelId;
    }

    async connect(prompt) {
        const response = await this.send({
            model: this.#modelId,
            max_tokens: 4096,
            // a short chat answer: low effort is enough and keeps it fast and cheap
            output_config: { effort: "low" },
            system: prompt.system,
            messages: prompt.messages.map(message => ({ role: message.role, content: message.text }))
        });
        if (response.stop_reason === "refusal") throw new Error("The model declined this request");

        return response.content
            .filter(block => block.type === "text")
            .map(block => block.text)
            .join("");
    }

    // Sonnet overrides this to add the refusal fallback
    send(params) {
        return this.#client.messages.create(params);
    }

    getClient() {
        return this.#client;
    }
}

module.exports = ClaudeModel;
