const multer = require("multer");
const AppError = require("../errors/AppError");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Files stay in memory for a moment, then FileRepository streams them into GridFS
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter(req, file, callback) {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            return callback(new AppError("Only JPG, PNG, WEBP or PDF files are allowed", 400));
        }
        callback(null, true);
    }
});

module.exports = upload;
