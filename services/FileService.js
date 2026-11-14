const AppError = require("../errors/AppError");

class FileService {
    #fileRepository;

    constructor(fileRepository) {
        this.#fileRepository = fileRepository;
    }

    // Public files (logos, job images) are open to any logged-in user.
    // Private files (ID scans, CVs) only to their owner. Admin access to CVs comes later.
    async getFile(fileId, user) {
        const info = await this.#fileRepository.findInfo(fileId);
        // "not found" for private files too, so nobody can test which file ids exist
        if (!info) throw new AppError("File not found", 404);
        if (!info.isPublic && info.ownerId !== user.getUserId()) throw new AppError("File not found", 404);
        return { info, stream: this.#fileRepository.openDownload(fileId) };
    }
}

module.exports = FileService;
