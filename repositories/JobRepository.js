const mongoose = require("mongoose");
const JobModel = require("../models/JobModel");
const Job = require("../domain/Job");

// Stops someone typing regex symbols into a filter box and changing the query
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class JobRepository {
    async create(job) {
        const doc = await JobModel.create(this.#toDocument(job));
        return this.#toDomain(doc);
    }

    async findById(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        const doc = await JobModel.findById(id);
        return doc ? this.#toDomain(doc) : null;
    }

    async findManyByIds(ids) {
        const docs = await JobModel.find({ _id: { $in: ids } });
        return docs.map(doc => this.#toDomain(doc));
    }

    async findByCompany(companyId) {
        const docs = await JobModel.find({ company: companyId }).sort({ createdAt: -1 });
        return docs.map(doc => this.#toDomain(doc));
    }

    // FR-15 filters. Returns live jobs the seeker has not swiped yet, newest first.
    async findLive({ excludeIds = [], role, city, workMode, minSalary }, limit) {
        const query = { status: "live", _id: { $nin: excludeIds } };
        if (role) query.title = { $regex: escapeRegex(role), $options: "i" };
        if (city) query.city = { $regex: `^${escapeRegex(city)}$`, $options: "i" };
        if (workMode) query.workMode = workMode;
        if (minSalary) query.salaryMax = { $gte: minSalary };
        const docs = await JobModel.find(query).sort({ createdAt: -1 }).limit(limit);
        return docs.map(doc => this.#toDomain(doc));
    }

    async update(job) {
        const doc = await JobModel.findByIdAndUpdate(job.getJobId(), this.#toDocument(job), {
            returnDocument: "after",
            runValidators: true
        });
        return doc ? this.#toDomain(doc) : null;
    }

    #toDocument(job) {
        return {
            company: job.getCompanyId(),
            title: job.getTitle(),
            salaryMin: job.getSalaryMin(),
            salaryMax: job.getSalaryMax(),
            workMode: job.getWorkMode(),
            city: job.getCity(),
            skills: job.getSkills(),
            description: job.getDescription(),
            imageUrl: job.getImageUrl(),
            status: job.getStatus()
        };
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return new Job({ ...data, jobId: data._id.toString(), companyId: data.company.toString() });
    }
}

module.exports = JobRepository;
