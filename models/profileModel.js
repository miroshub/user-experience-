const fields = ["name", "email", "role"];

function isText(value) {
    return typeof value === "string" && value.trim() !== "";
}

// ID from the URL must be a whole number above 0
function validateId(id) {
    const n = Number(id);
    return Number.isInteger(n) && n > 0;
}

// Body must be a plain JSON object. It is undefined when the request had no body
// or wasn't sent as Content-Type: application/json (Express 5 leaves req.body undefined).
function isObject(data) {
    return data !== null && typeof data === "object" && !Array.isArray(data);
}

// Full profile: every field required
function validateProfile(data) {
    if (!isObject(data)) return false;
    for (const f of fields) {
        if (!isText(data[f])) return false;
    }
    return true;
}

// Partial profile: at least one field, and only known fields
function validateProfilePatch(data) {
    if (!isObject(data)) return false;
    const keys = Object.keys(data);
    if (keys.length === 0) return false;
    for (const k of keys) {
        if (!fields.includes(k) || !isText(data[k])) return false;
    }
    return true;
}

// Keep only the known fields, with spaces removed around each one
function normalize(data) {
    return { name: data.name.trim(), email: data.email.trim(), role: data.role.trim() };
}

module.exports = { validateId, validateProfile, validateProfilePatch, normalize };
