const CvTipRule = require("../../interfaces/CvTipRule");

// "Add React to your skills. 6 of your saved jobs ask for it."
class MissingSkillsRule extends CvTipRule {
    #maxSkills;

    constructor(maxSkills) {
        super();
        this.#maxSkills = maxSkills;
    }

    suggest(cv, context) {
        return cv.findMissingSkills(context.jobs)
            .slice(0, this.#maxSkills)
            .map(({ skill, count }) => ({
                key: `skill:${skill.toLowerCase()}`,
                text: `Add ${skill} to your skills. ${count} of your ${context.jobWord} ${count === 1 ? "asks" : "ask"} for it.`,
                action: { type: "addSkill", skill },
                fixed: cv.copyWith({ skills: [...cv.getSkills(), skill] })
            }));
    }
}

module.exports = MissingSkillsRule;
