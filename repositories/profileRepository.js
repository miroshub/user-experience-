let profiles = [
    { id: 1, name: "Amina Yusuf", email: "amina@example.com", role: "recruit" },
    { id: 2, name: "Daniel Okafor", email: "daniel@example.com", role: "recruit" },
    { id: 3, name: "Rachel Thompson", email: "rachel@example.com", role: "recruiter" },
    { id: 4, name: "Marcus Lee", email: "marcus@example.com", role: "recruiter" }
];

let nextId = 5;

// role must match exactly, search looks inside name and email
function findAll(role, search) {
    const result = [];
    for (const p of profiles) {
        const text = (p.name + " " + p.email).toLowerCase();
        if (role && p.role.toLowerCase() !== role) continue;
        if (search && !text.includes(search)) continue;
        result.push(p);
    }
    return result;
}

function findById(id) {
    return profiles.find(p => p.id === id);
}

function create(data) {
    const p = { id: nextId, name: data.name, email: data.email, role: data.role };
    nextId++;
    profiles.push(p);
    return p;
}

function update(id, data) {
    const p = findById(id);
    if (!p) return null;
    p.name = data.name;
    p.email = data.email;
    p.role = data.role;
    return p;
}

function remove(id) {
    const i = profiles.findIndex(p => p.id === id);
    if (i === -1) return false;
    profiles.splice(i, 1);
    return true;
}

module.exports = { findAll, findById, create, update, remove };
