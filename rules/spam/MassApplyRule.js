const FlagRule = require("../../interfaces/FlagRule");

const LIMIT_PER_DAY = 50;

// "Same CV sent to 50+ jobs today": one seeker has one CV, so this counts today's Interested swipes
class MassApplyRule extends FlagRule {
    get reason() {
        return `Interested in ${LIMIT_PER_DAY}+ jobs today`;
    }

    isHit(user, data) {
        return data.interestedToday >= LIMIT_PER_DAY;
    }
}

module.exports = MassApplyRule;
