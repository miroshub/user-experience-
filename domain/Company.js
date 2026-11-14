const User = require("./User");
const AppError = require("../errors/AppError");

const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

function requireText(value, label) {
    if (typeof value !== "string") throw new AppError(`${label} must be text`, 400);
    return value.trim();
}

// companyName, industry and location come from the class diagram.
// size, about and logoId are the extra company-profile fields from FR-11.
class Company extends User {
    #companyName;
    #industry;
    #location;
    #size;
    #about;
    #logoId;

    constructor(data) {
        super({ ...data, role: "company" });
        this.#companyName = data.companyName || "";
        this.#industry = data.industry || "";
        this.#location = data.location || "";
        this.#size = data.size || "";
        this.#about = data.about || "";
        this.#logoId = data.logoId ? String(data.logoId) : null;
    }

    getCompanyName() { return this.#companyName; }
    setCompanyName(value) { this.#companyName = requireText(value, "Company name"); }

    getIndustry() { return this.#industry; }
    setIndustry(value) { this.#industry = requireText(value, "Industry"); }

    getLocation() { return this.#location; }
    setLocation(value) { this.#location = requireText(value, "Location"); }

    getSize() { return this.#size; }
    setSize(value) {
        if (!SIZES.includes(value)) throw new AppError(`Size must be one of: ${SIZES.join(", ")}`, 400);
        this.#size = value;
    }

    getAbout() { return this.#about; }
    setAbout(value) {
        const text = requireText(value, "About");
        if (text.length > 500) throw new AppError("About must be 500 characters or fewer", 400);
        this.#about = text;
    }

    getLogoId() { return this.#logoId; }
    setLogoId(value) { this.#logoId = value; }

    getProfileFields() {
        return {
            companyName: this.#companyName,
            industry: this.#industry,
            location: this.#location,
            size: this.#size,
            about: this.#about,
            logoId: this.#logoId
        };
    }

    getEditableFields() {
        return [...super.getEditableFields(), "companyName", "industry", "location", "size", "about"];
    }

    applyProfileChanges(changes) {
        super.applyProfileChanges(changes);
        if ("companyName" in changes) this.setCompanyName(changes.companyName);
        if ("industry" in changes) this.setIndustry(changes.industry);
        if ("location" in changes) this.setLocation(changes.location);
        if ("size" in changes) this.setSize(changes.size);
        if ("about" in changes) this.setAbout(changes.about);
    }
}

module.exports = Company;
