const CvTipRule = require("../../interfaces/CvTipRule");

// "Add start and end dates to Freelance web projects." One tip for the first role without dates.
class MissingDatesRule extends CvTipRule {
    suggest(cv) {
        const missing = cv.getRolesMissingDates();
        if (missing.length === 0) return [];

        const index = missing[0];
        const experience = cv.getExperience();
        // the copy gets dates on every role, because the layout check needs all of them
        const withDates = experience.map(role => ({
            ...role,
            startDate: role.startDate || "start",
            endDate: role.endDate || "end"
        }));
        return [{
            key: "dates",
            text: `Add start and end dates to "${experience[index].title}".`,
            action: { type: "open", section: "experience", index },
            fixed: cv.copyWith({ experience: withDates })
        }];
    }
}

module.exports = MissingDatesRule;
