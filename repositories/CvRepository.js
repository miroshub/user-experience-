const CvModel = require("../models/CvModel");
const CV = require("../domain/CV");

class CvRepository {
    // The seeker is passed in because the CV keeps a link to its owner (name, contact, skills)
    async findBySeeker(seeker) {
        const doc = await CvModel.findOne({ seeker: seeker.getUserId() });
        return doc ? this.#toDomain(doc, seeker) : null;
    }

    // One CV per seeker: create it the first time, update it after that
    async save(cv) {
        const doc = await CvModel.findOneAndUpdate(
            { seeker: cv.getOwner().getUserId() },
            {
                summary: cv.getSummary(),
                experience: cv.getExperience(),
                education: cv.getEducation(),
                atsScore: cv.getAtsScore(),
                pdfFileId: cv.getPdfFileId()
            },
            { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
        );
        return this.#toDomain(doc, cv.getOwner());
    }

    #toDomain(doc, seeker) {
        const data = doc.toObject();
        return new CV({
            ...data,
            cvId: data._id.toString(),
            pdfFileId: data.pdfFileId ? data.pdfFileId.toString() : null
        }, seeker);
    }
}

module.exports = CvRepository;
