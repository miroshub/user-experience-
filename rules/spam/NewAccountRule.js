const FlagRule = require("../../interfaces/FlagRule");

const DAY_MS = 24 * 60 * 60 * 1000;

class NewAccountRule extends FlagRule {
    get reason() {
        return "Account less than 1 day old";
    }

    isHit(user, data) {
        const createdAt = user.getCreatedAt();
        if (!createdAt) return false;
        return data.now.getTime() - createdAt.getTime() < DAY_MS;
    }
}

module.exports = NewAccountRule;
