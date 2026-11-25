// Interface: one kind of CV fix (FR-09). CvAdvisor runs every rule it is given,
// so a new kind of fix is one new class plus one line in container.js (Open/Closed).
class CvTipRule {
    constructor() {
        if (new.target === CvTipRule) throw new Error("CvTipRule is an interface");
    }

    // Returns a list (often empty) of { key, text, action, fixed }.
    // fixed = a copy of the CV with this fix applied, so CvAdvisor can work out the points it is worth.
    suggest(cv, context) {
        throw new Error("suggest not implemented");
    }
}

module.exports = CvTipRule;
