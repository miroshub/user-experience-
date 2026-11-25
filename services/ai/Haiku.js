const ClaudeModel = require("./ClaudeModel");

// Claude Haiku (AI_MODEL=haiku): the fast, cheap Claude model
class Haiku extends ClaudeModel {
    constructor(client) {
        super(client, "claude-haiku-5-5");
    }

    getName() {
        return "haiku";
    }
}

module.exports = Haiku;
