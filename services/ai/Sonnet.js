const ClaudeModel = require("./ClaudeModel");

// Claude Sonnet (AI_MODEL=sonnet): stronger than Haiku, costs more
class Sonnet extends ClaudeModel {
    constructor(client) {
        super(client, "claude-sonnet-5-5");
    }

    getName() {
        return "sonnet";
    }

    // If Sonnet declines a request, Anthropic's server retries it on a fallback model in the same call
    send(params) {
        return this.getClient().beta.messages.create({
            ...params,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default"
        });
    }
}

module.exports = Sonnet;
