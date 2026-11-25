// H6: the CV form data, the preview highlights and the ATS check
function cvToJson(cv) {
    const owner = cv.getOwner();
    return {
        id: cv.getCvId(),
        fullName: owner.getFullName(),
        headline: owner.getHeadline(),
        city: owner.getCity(),
        email: owner.getEmail(),
        phone: owner.getPhone(),
        summary: cv.getSummary(),
        summaryWords: cv.getSummaryWordCount(),
        summaryTooLong: cv.isSummaryTooLong(),
        experience: cv.getExperience(),
        rolesMissingDates: cv.getRolesMissingDates(),
        education: cv.getEducation(),
        skills: cv.getSkills(),
        pdfUrl: cv.getPdfFileId() ? `/api/files/${cv.getPdfFileId()}` : null,
        updatedAt: cv.getUpdatedAt()
    };
}

function presentCvCheck({ cv, report, checkedAgainst }) {
    return {
        data: {
            cv: cvToJson(cv),
            ats: {
                score: report.score,
                potential: report.potential,
                tips: report.tips,
                checkedAgainst
            }
        }
    };
}

module.exports = { cvToJson, presentCvCheck };
