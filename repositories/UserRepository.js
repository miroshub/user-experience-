const mongoose = require("mongoose");
const { UserModel, SeekerModel, CompanyModel, AdminModel } = require("../models/UserModel");
const UserFactory = require("../domain/UserFactory");

const modelsByRole = { seeker: SeekerModel, company: CompanyModel, admin: AdminModel };

// The only class that reads or writes the users collection.
// It turns Mongoose documents into domain objects and back.
class UserRepository {
    async create(user, passwordHash) {
        const Model = modelsByRole[user.getRole()];
        const doc = await Model.create({ ...this.#toDocument(user), passwordHash });
        return this.#toDomain(doc);
    }

    async findById(id) {
        if (!mongoose.isValidObjectId(id)) return null;
        const doc = await UserModel.findById(id);
        return doc ? this.#toDomain(doc) : null;
    }

    async findManyByIds(ids) {
        const docs = await UserModel.find({ _id: { $in: ids } });
        return docs.map(doc => this.#toDomain(doc));
    }

    // Active seekers for a company's candidate cards, skipping the ones already swiped on
    async findSeekers({ excludeIds = [] }, limit) {
        const docs = await SeekerModel.find({ _id: { $nin: excludeIds }, accountState: "active" })
            .sort({ createdAt: -1 })
            .limit(limit);
        return docs.map(doc => this.#toDomain(doc));
    }

    // login is an email or a phone number. Returns the hash too, for AuthService only.
    async findByLogin(login) {
        const value = login.trim();
        const doc = await UserModel.findOne({ $or: [{ email: value.toLowerCase() }, { phone: value }] });
        if (!doc) return null;
        return { user: this.#toDomain(doc), passwordHash: doc.passwordHash };
    }

    async existsWithEmail(email) {
        return (await UserModel.exists({ email: email.trim().toLowerCase() })) !== null;
    }

    async existsWithPhone(phone) {
        return (await UserModel.exists({ phone: phone.trim() })) !== null;
    }

    // extraFields: storage-only fields that are not on the domain class, e.g. idDocumentId
    async update(user, extraFields = {}) {
        const Model = modelsByRole[user.getRole()];
        const doc = await Model.findByIdAndUpdate(
            user.getUserId(),
            { ...this.#toDocument(user), ...extraFields },
            { returnDocument: "after", runValidators: true }
        );
        return doc ? this.#toDomain(doc) : null;
    }

    #toDocument(user) {
        const doc = {
            fullName: user.getFullName(),
            isVerified: user.getIsVerified(),
            accountState: user.getAccountState(),
            ...user.getProfileFields()
        };
        // leave empty contact fields out, so the unique indexes ignore them
        if (user.getEmail()) doc.email = user.getEmail();
        if (user.getPhone()) doc.phone = user.getPhone();
        return doc;
    }

    #toDomain(doc) {
        const data = doc.toObject();
        return UserFactory.createUser(data.role, { ...data, userId: data._id.toString() });
    }
}

module.exports = UserRepository;
