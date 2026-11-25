const CvTipRule = require("../../interfaces/CvTipRule");
const CV = require("../../domain/CV");

// "Your About me is 140 words. Aim for under 60." or, when it is empty, "Add a short About me".
class SummaryRule extends CvTipRule {
    suggest(cv) {
        const words = cv.getSummaryWordCount();
        if (words === 0) {
            return [{
                key: "summary:empty",
                text: "Add a short \"About me\": two or three sentences about what you do.",
                action: { type: "open", section: "about" },
                fixed: cv.copyWith({ summary: "A short summary." })
            }];
        }
        if (cv.isSummaryTooLong()) {
            return [{
                key: "summary:long",
                text: `Your "About me" is ${words} words. Aim for under ${CV.SUMMARY_WORD_LIMIT}.`,
                action: { type: "shortenSummary" },
                fixed: cv.copyWith({ summary: cv.shortenSummary() })
            }];
        }
        return [];
    }
}

module.exports = SummaryRule;
