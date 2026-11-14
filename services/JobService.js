const AppError = require("../errors/AppError");

function requireCompany(user) {
    if (user.getRole() !== "company") throw new AppError("Only companies can manage jobs", 403);
}

class JobService {
    #jobRepository;
    #fileRepository;

    constructor(jobRepository, fileRepository) {
        this.#jobRepository = jobRepository;
        this.#fileRepository = fileRepository;
    }

    // FR-30
    async createJob(user, data) {
        requireCompany(user);
        if (!data || typeof data !== "object") throw new AppError("Invalid data", 400);
        const job = user.postJob(data);
        return this.#jobRepository.create(job);
    }

    async listMine(user) {
        requireCompany(user);
        return this.#jobRepository.findByCompany(user.getUserId());
    }

    // Live jobs are public to logged-in users; paused or closed ones only to their company
    async getJob(jobId, user) {
        const job = await this.#jobRepository.findById(jobId);
        if (!job) throw new AppError("Job not found", 404);
        if (!job.isLive() && !job.belongsTo(user.getUserId())) throw new AppError("Job not found", 404);
        return job;
    }

    // FR-31
    async editJob(user, jobId, changes) {
        if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
            throw new AppError("Invalid data", 400);
        }
        const job = await this.#ownJob(user, jobId);
        job.edit(changes);
        return this.#jobRepository.update(job);
    }

    // FR-32
    async pauseJob(user, jobId) {
        const job = await this.#ownJob(user, jobId);
        job.pause();
        return this.#jobRepository.update(job);
    }

    async resumeJob(user, jobId) {
        const job = await this.#ownJob(user, jobId);
        job.resume();
        return this.#jobRepository.update(job);
    }

    async closeJob(user, jobId) {
        const job = await this.#ownJob(user, jobId);
        job.close();
        return this.#jobRepository.update(job);
    }

    async uploadImage(user, jobId, file) {
        const job = await this.#ownJob(user, jobId);
        if (!file || !file.mimetype.startsWith("image/")) {
            throw new AppError("Please attach a JPG, PNG or WEBP image", 400);
        }
        const fileId = await this.#fileRepository.save({
            buffer: file.buffer,
            filename: file.originalname,
            contentType: file.mimetype,
            ownerId: user.getUserId(),
            isPublic: true
        });
        job.setImageUrl(`/api/files/${fileId}`);
        return this.#jobRepository.update(job);
    }

    // Another company's job answers "not found", so job ids cannot be probed
    async #ownJob(user, jobId) {
        requireCompany(user);
        const job = await this.#jobRepository.findById(jobId);
        if (!job || !job.belongsTo(user.getUserId())) throw new AppError("Job not found", 404);
        return job;
    }
}

module.exports = JobService;
