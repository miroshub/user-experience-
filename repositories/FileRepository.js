const mongoose = require("mongoose");

// Stores files (ID scans, logos, job images, CV PDFs) in MongoDB GridFS
class FileRepository {
    #database;

    constructor(database) {
        this.#database = database;
    }

    // made on demand, because the connection only exists after connect()
    #bucket() {
        return new mongoose.mongo.GridFSBucket(this.#database.getConnection().db, { bucketName: "files" });
    }

    async save({ buffer, filename, contentType, ownerId, isPublic }) {
        const upload = this.#bucket().openUploadStream(filename, {
            metadata: { contentType, ownerId, isPublic }
        });
        await new Promise((resolve, reject) => {
            upload.once("finish", resolve);
            upload.once("error", reject);
            upload.end(buffer);
        });
        return upload.id.toString();
    }

    async findInfo(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        const files = await this.#bucket().find({ _id: new mongoose.Types.ObjectId(id) }).toArray();
        if (files.length === 0) return null;
        const file = files[0];
        return {
            id,
            filename: file.filename,
            size: file.length,
            contentType: file.metadata.contentType,
            ownerId: file.metadata.ownerId,
            isPublic: file.metadata.isPublic === true
        };
    }

    openDownload(id) {
        return this.#bucket().openDownloadStream(new mongoose.Types.ObjectId(id));
    }
}

module.exports = FileRepository;
