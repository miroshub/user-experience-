const AppError = require("../errors/AppError");

// FR-09 score: 70 points for keywords + 10 for each of the 3 layout checks = 100
const KEYWORD_POINTS = 70;
const CHECK_POINTS = 10;
const SUMMARY_WORD_LIMIT = 60;

const MAX_ROLES = 10;
const MAX_SCHOOLS = 5;
const MAX_BULLETS = 6;

function readText(value, name, maxLength) {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") throw new AppError(`${name} must be text`, 400);
    const clean = value.trim();
    if (clean.length > maxLength) throw new AppError(`${name} must be ${maxLength} characters or fewer`, 400);
    return clean;
}

function readList(value, name, maxItems) {
    if (!Array.isArray(value)) throw new AppError(`${name} must be a list`, 400);
    if (value.length > maxItems) throw new AppError(`Add ${maxItems} ${name.toLowerCase()} or fewer`, 400);
    return value;
}

function cleanRole(role) {
    if (!role || typeof role !== "object") throw new AppError("Each role must have a title", 400);
    const title = readText(role.title, "Role title", 80);
    if (title === "") throw new AppError("Each role must have a title", 400);
    const bullets = readList(role.bullets || [], "Bullet points", MAX_BULLETS)
        .map(b => readText(b, "A bullet point", 200))
        .filter(b => b !== "");
    return {
        title,
        company: readText(role.company, "Company", 80),
        startDate: readText(role.startDate, "Start date", 20),
        endDate: readText(role.endDate, "End date", 20),
        bullets
    };
}

function cleanSchool(school) {
    if (!school || typeof school !== "object") throw new AppError("Each school needs a degree or a name", 400);
    const clean = {
        degree: readText(school.degree, "Degree", 80),
        school: readText(school.school, "School", 80),
        startYear: readText(school.startYear, "Start year", 10),
        endYear: readText(school.endYear, "End year", 10)
    };
    if (clean.degree === "" && clean.school === "") throw new AppError("Each school needs a degree or a name", 400);
    return clean;
}

function wordCount(text) {
    const words = text.trim().split(/\s+/);
    return words[0] === "" ? 0 : words.length;
}

// Lower case, punctuation turned into spaces, so "React," and "react" are the same word.
// Dots, + and # stay inside words for skills like Node.js, C++ and C#.
function normalise(text) {
    return ` ${text.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\.(\s|$)/g, " ")} `.replace(/\s+/g, " ");
}

// From the class diagram: a JobSeeker has one CV (composition).
// Skills live on the JobSeeker (the swipe cards use them too), so the CV starts with the owner's skills.
class CV {
    #cvId;
    #owner;
    #summary;
    #experience;
    #education;
    #skills;
    #atsScore;
    #pdfFileId;
    #updatedAt;

    constructor(data, owner) {
        this.#cvId = data.cvId || null;
        this.#owner = owner;
        this.#summary = data.summary || "";
        this.#experience = (data.experience || []).map(role => ({ ...role, bullets: [...(role.bullets || [])] }));
        this.#education = (data.education || []).map(school => ({ ...school }));
        this.#skills = Array.isArray(data.skills) ? [...data.skills] : owner.getSkills();
        this.#atsScore = data.atsScore || 0;
        this.#pdfFileId = data.pdfFileId || null;
        this.#updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    getCvId() { return this.#cvId; }
    getOwner() { return this.#owner; }
    getUpdatedAt() { return this.#updatedAt; }

    getSummary() { return this.#summary; }
    setSummary(value) { this.#summary = readText(value, "About me", 2000); }

    getExperience() { return this.#experience.map(role => ({ ...role, bullets: [...role.bullets] })); }
    setExperience(value) { this.#experience = readList(value, "Roles", MAX_ROLES).map(cleanRole); }

    getEducation() { return this.#education.map(school => ({ ...school })); }
    setEducation(value) { this.#education = readList(value, "Schools", MAX_SCHOOLS).map(cleanSchool); }

    getSkills() { return [...this.#skills]; }
    setSkills(value) { this.#skills = [...value]; }

    getAtsScore() { return this.#atsScore; }
    setAtsScore(value) { this.#atsScore = value; }

    getPdfFileId() { return this.#pdfFileId; }
    setPdfFileId(value) { this.#pdfFileId = value; }

    getSummaryWordCount() { return wordCount(this.#summary); }

    isSummaryTooLong() { return this.getSummaryWordCount() > SUMMARY_WORD_LIMIT; }

    // Positions of the roles that have no start or no end date (highlighted in the preview)
    getRolesMissingDates() {
        const missing = [];
        this.#experience.forEach((role, index) => {
            if (role.startDate === "" || role.endDate === "") missing.push(index);
        });
        return missing;
    }

    // Does the CV contain this skill anywhere (skills, About me, roles, education)?
    mentions(skill) {
        return this.#allText().includes(normalise(skill));
    }

    // FR-09, from the class diagram: how well this CV passes an ATS filter for one job, 0 to 100.
    // Plain keyword overlap with the job's skills, plus three layout checks. No machine learning.
    calcAtsScore(job) {
        const wanted = job.getSkills();
        let keywordPoints = KEYWORD_POINTS;
        if (wanted.length > 0) {
            const found = wanted.filter(skill => this.mentions(skill)).length;
            keywordPoints = Math.round((found / wanted.length) * KEYWORD_POINTS);
        }
        return keywordPoints + this.#layoutPoints();
    }

    // The score shown on the page: the average over the jobs the seeker saved
    scoreAgainst(jobs) {
        let score;
        if (jobs.length === 0) {
            score = this.#layoutPoints();
        } else {
            const total = jobs.reduce((sum, job) => sum + this.calcAtsScore(job), 0);
            score = Math.round(total / jobs.length);
        }
        this.#atsScore = score;
        return score;
    }

    // Skills the jobs ask for that this CV never mentions, most asked first: [{ skill, count }]
    findMissingSkills(jobs) {
        const counts = new Map();
        for (const job of jobs) {
            for (const skill of job.getSkills()) {
                if (this.mentions(skill)) continue;
                const key = skill.toLowerCase();
                const entry = counts.get(key) || { skill, count: 0 };
                entry.count += 1;
                counts.set(key, entry);
            }
        }
        return [...counts.values()].sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
    }

    // The "Shorten" fix: keeps whole sentences until the 60-word limit
    shortenSummary() {
        const sentences = this.#summary.split(/(?<=[.!?])\s+/);
        let result = "";
        for (const sentence of sentences) {
            const next = result === "" ? sentence : `${result} ${sentence}`;
            if (wordCount(next) > SUMMARY_WORD_LIMIT) break;
            result = next;
        }
        // one very long first sentence: cut it at the limit instead
        if (result === "") result = this.#summary.split(/\s+/).slice(0, SUMMARY_WORD_LIMIT).join(" ");
        return result;
    }

    // A changed copy, used to work out how many points a fix is worth without touching this CV
    copyWith(changes) {
        return new CV({
            cvId: this.#cvId,
            summary: this.#summary,
            experience: this.getExperience(),
            education: this.getEducation(),
            skills: this.getSkills(),
            pdfFileId: this.#pdfFileId,
            ...changes
        }, this.#owner);
    }

    // FR-10, from the class diagram: the exporter (PdfExporter today) makes the file
    exportPdf(exporter) {
        return exporter.export(this);
    }

    // 1) a short About me, 2) every role has dates, 3) the experience and education sections are there
    // (half the points each, so adding just one of them already counts)
    #layoutPoints() {
        let points = 0;
        const words = this.getSummaryWordCount();
        if (words > 0 && words <= SUMMARY_WORD_LIMIT) points += CHECK_POINTS;
        if (this.#experience.length > 0 && this.getRolesMissingDates().length === 0) points += CHECK_POINTS;
        if (this.#experience.length > 0) points += CHECK_POINTS / 2;
        if (this.#education.length > 0) points += CHECK_POINTS / 2;
        return points;
    }

    #allText() {
        const parts = [this.#skills.join(" , "), this.#summary];
        for (const role of this.#experience) parts.push(role.title, role.company, ...role.bullets);
        for (const school of this.#education) parts.push(school.degree, school.school);
        return normalise(parts.join(" , "));
    }
}

CV.SUMMARY_WORD_LIMIT = SUMMARY_WORD_LIMIT;

module.exports = CV;
