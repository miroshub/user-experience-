const JobSeeker = require("./JobSeeker");
const Company = require("./Company");
const Admin = require("./Admin");
const AppError = require("../errors/AppError");

// Open/Closed: a new kind of user means one new line in this map, nothing else changes
const roles = {
    seeker: JobSeeker,
    company: Company,
    admin: Admin
};

class UserFactory {
    static createUser(role, data) {
        const UserClass = roles[role];
        if (!UserClass) throw new AppError("Unknown role", 400);
        return new UserClass(data);
    }
}

module.exports = UserFactory;
