const model = require("../models/profileModel");
const repo = require("../repositories/profileRepository");

function listProfiles(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    if (!Number.isInteger(page) || page < 1) return "invalid";
    if (!Number.isInteger(limit) || limit < 1) return "invalid";

    const role = query.role ? query.role.trim().toLowerCase() : "";
    const search = query.search ? query.search.trim().toLowerCase() : "";
    const all = repo.findAll(role, search);

    const start = (page - 1) * limit;
    return {
        profiles: all.slice(start, start + limit),
        pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) }
    };
}

function getProfile(id) {
    if (!model.validateId(id)) return "invalid";
    const p = repo.findById(Number(id));
    if (!p) return "not found";
    return p;
}

function createProfile(data) {
    if (!model.validateProfile(data)) return "invalid";
    return repo.create(model.normalize(data));
}

function replaceProfile(id, data) {
    if (!model.validateId(id) || !model.validateProfile(data)) return "invalid";
    const p = repo.update(Number(id), model.normalize(data));
    if (!p) return "not found";
    return p;
}

function patchProfile(id, changes) {
    if (!model.validateId(id) || !model.validateProfilePatch(changes)) return "invalid";
    const p = repo.findById(Number(id));
    if (!p) return "not found";
    return repo.update(p.id, model.normalize({ ...p, ...changes }));
}

function deleteProfile(id) {
    if (!model.validateId(id)) return "invalid";
    if (!repo.remove(Number(id))) return "not found";
    return "ok";
}

module.exports = { listProfiles, getProfile, createProfile, replaceProfile, patchProfile, deleteProfile };
