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

    // FR-21 "Heads up: 9 of these ask for TypeScript": the skill the seeker lacks
    // that the most of these jobs ask for. Returns { skill, count } or null.
    static mostWantedMissing(haveSkills, jobs) {
        const have = haveSkills.map(s => s.toLowerCase());
        const counts = new Map();
        for (const job of jobs) {
            for (const skill of job.getSkills()) {
                const key = skill.toLowerCase();
                if (have.includes(key)) continue;
                const entry = counts.get(key) || { skill, count: 0 };
                entry.count += 1;
                counts.set(key, entry);
            }
        }
        let best = null;
        for (const entry of counts.values()) {
            if (!best || entry.count > best.count) best = entry;
        }
        return best;
    }
}

module.exports = SkillMatcher;
