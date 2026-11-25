// FR-09: the ATS score plus up to 5 fixes, best first.
// Like FlagChecker, it runs whatever CvTipRules it is given and never changes when a rule is added (Open/Closed).
class CvAdvisor {
    #rules;
    #maxTips;

    constructor(rules, maxTips) {
        this.#rules = rules;
        this.#maxTips = maxTips;
    }

    // context = { jobs, jobWord } where jobWord is "saved jobs" or "open jobs"
    advise(cv, context) {
        const score = cv.scoreAgainst(context.jobs);

        const tips = [];
        for (const rule of this.#rules) {
            for (const tip of rule.suggest(cv, context)) {
                // a fix is worth the points the CV would gain with it
                const gain = tip.fixed.scoreAgainst(context.jobs) - score;
                if (gain > 0) tips.push({ key: tip.key, text: tip.text, action: tip.action, gain });
            }
        }
        tips.sort((a, b) => b.gain - a.gain);
        const top = tips.slice(0, this.#maxTips);

        const potential = Math.min(100, score + top.reduce((sum, tip) => sum + tip.gain, 0));
        return { score, potential, tips: top };
    }
}

module.exports = CvAdvisor;
