const AppError = require("../errors/AppError");

class UserService {
    #userRepository;
    #fileRepository;

    constructor(userRepository, fileRepository) {
        this.#userRepository = userRepository;
        this.#fileRepository = fileRepository;
    }

    async updateProfile(user, changes) {
        if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
            throw new AppError("Invalid data", 400);
        }
        user.applyProfileChanges(changes);
        return this.#userRepository.update(user);
    }

    // FR-03 / FR-04: the ID is asked for once. Sending it marks the account as verified.
    async verifyIdentity(user, file) {
        if (user.getIsVerified()) throw new AppError("Your account is already verified", 409);
        if (!file) throw new AppError("Please attach a photo or scan of your ID", 400);

        const fileId = await this.#fileRepository.save({
            buffer: file.buffer,
            filename: file.originalname,
            contentType: file.mimetype,
            ownerId: user.getUserId(),
            isPublic: false
        });
        user.markVerified();
        return this.#userRepository.update(user, { idDocumentId: fileId });
    }

    // FR-11: company logo, shown on every job card, so it is public
    async uploadLogo(user, file) {
        if (user.getRole() !== "company") throw new AppError("Only companies have a logo", 403);
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
        user.setLogoId(fileId);
        return this.#userRepository.update(user);
    }
}

module.exports = UserService;
