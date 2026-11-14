const FlagRule = require("../../interfaces/FlagRule");

class EmptyProfileRule extends FlagRule {
    get reason() {
        return "Empty profile";
    }

    isHit(user) {
        return user.getHeadline() === "" && user.getSkills().length === 0;
    }
}

module.exports = EmptyProfileRule;
