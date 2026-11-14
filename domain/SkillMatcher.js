// "% fit" and "why it fits you" on the cards (FR-12, FR-16): how many of the wanted skills someone has.
// Plain keyword overlap, no machine learning. The CV-based ATS score comes in Phase 4.
class SkillMatcher {
    static compare(haveSkills, wantSkills) {
        const have = haveSkills.map(s => s.toLowerCase());
        const matched = [];
        const missing = [];
        for (const skill of wantSkills) {
            if (have.includes(skill.toLowerCase())) matched.push(skill);
            else missing.push(skill);
        }
        const percent = wantSkills.length === 0 ? 0 : Math.round((matched.length / wantSkills.length) * 100);
        return { percent, matched, missing };
    }
}

module.exports = SkillMatcher;
