const FlagRule = require("../../interfaces/FlagRule");

class NotVerifiedRule extends FlagRule {
    get reason() {
        return "Not verified";
    }

    isHit(user) {
        return !user.getIsVerified();
    }
}

module.exports = NotVerifiedRule;
