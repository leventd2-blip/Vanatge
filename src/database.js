const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.json');

function getDb() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
    }
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (err) {
        return [];
    }
}

function saveDb(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = { getDb, saveDb };
