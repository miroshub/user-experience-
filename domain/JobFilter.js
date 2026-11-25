// FR-19: checks one job against the AI helper's filters. Plain rules, no machine learning.
// Jobs have no "level" field, so the level is read from the job title.

// Words that are in almost every title, so they say nothing about the role
const GENERIC_WORDS = ["developer", "engineer", "jobs", "job", "role", "dev", "and"];
const SENIOR_WORDS = ["senior", "lead", "head", "manager"];
const INTERN_WORDS = ["intern", "trainee"];
const WORK_MODES = { remote: "remote", hybrid: "hybrid", onsite: "onsite", "on-site": "onsite", office: "onsite" };

// A filter for a big city also finds jobs in its areas
const AREAS = {
    cairo: ["maadi", "nasr city", "new cairo", "zamalek", "heliopolis", "downtown", "mokattam"],
    giza: ["dokki", "mohandessin", "sheikh zayed", "6th of october", "haram"]
};

function hasAny(text, words) {
    return words.some(word => text.includes(word));
}

class JobFilter {
    #filters;

    constructor(filters) {
        this.#filters = filters;
    }

    matches(job) {
        return this.#roleFits(job) && this.#levelFits(job) && this.#placeFits(job) && this.#payFits(job);
    }

    // "Frontend (React)": the title says frontend, or the job asks for React
    #roleFits(job) {
        const { role, skills } = this.#filters;
        if (!role && skills.length === 0) return true;
        const title = job.getTitle().toLowerCase();
        const jobSkills = job.getSkills().map(s => s.toLowerCase());

        if (role) {
            const roleText = role.toLowerCase();
            const words = roleText.split(/\s+/).filter(w => w.length > 1 && !GENERIC_WORDS.includes(w));
            if (title.includes(roleText) || hasAny(title, words) || jobSkills.includes(roleText)) return true;
        }
        return skills.some(skill => jobSkills.includes(skill.toLowerCase()) || title.includes(skill.toLowerCase()));
    }

    #levelFits(job) {
        const level = this.#filters.level;
        if (!level) return true;
        const title = job.getTitle().toLowerCase();
        if (level === "Intern") return hasAny(title, INTERN_WORDS);
        if (level === "Senior") return hasAny(title, SENIOR_WORDS);
        if (level === "Mid") return !hasAny(title, SENIOR_WORDS) && !hasAny(title, INTERN_WORDS);
        return !hasAny(title, SENIOR_WORDS); // Junior: anything that is not senior
    }

    // "Remote or Cairo": a remote job, or a job in Cairo (or one of its areas)
    #placeFits(job) {
        const places = this.#filters.places;
        if (places.length === 0) return true;
        const city = job.getCity().toLowerCase();
        return places.some(place => {
            const wanted = place.toLowerCase();
            if (WORK_MODES[wanted]) return job.getWorkMode() === WORK_MODES[wanted];
            if (city === "") return false;
            return city.includes(wanted) || (AREAS[wanted] || []).some(area => city.includes(area));
        });
    }

    #payFits(job) {
        const minPay = this.#filters.minPay;
        return !minPay || job.getSalaryMax() >= minPay;
    }
}

module.exports = JobFilter;
