const CvTipRule = require("../../interfaces/CvTipRule");

// An ATS looks for an experience section and an education section
class MissingSectionsRule extends CvTipRule {
    suggest(cv) {
        const tips = [];
        if (cv.getExperience().length === 0) {
            tips.push({
                key: "section:experience",
                text: "Add your experience. Internships, freelance work and big projects all count.",
                action: { type: "open", section: "experience" },
                fixed: cv.copyWith({ experience: [{ title: "Role", company: "", startDate: "start", endDate: "end", bullets: [] }] })
            });
        }
        if (cv.getEducation().length === 0) {
            tips.push({
                key: "section:education",
                text: "Add your education.",
                action: { type: "open", section: "education" },
                fixed: cv.copyWith({ education: [{ degree: "Degree", school: "", startYear: "", endYear: "" }] })
            });
        }
        return tips;
    }
}

module.exports = MissingSectionsRule;
