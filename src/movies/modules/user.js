
const path = require("path");
const fs = require("fs");
const {
    users_dir } = require("../variables.js")

class User {
    #id;
    name;
    country;
    phone;
    confirmed = false;
    verified = true;
    blocked = true;

    static isRegistered(id) {
        return fs.existsSync(path.resolve(users_dir, id + ".json"));
    }

    constructor(id) {
        if (User.isRegistered(id)) {
            let user_file_path = path.resolve(users_dir, id + ".json");
            let user_data = require(user_file_path);
            for (let [field, value] of Object.entries(user_data)) {
                try {
                    this[field] = value;
                } catch (error) { }
            }
        }
        this.#id = id;
    }

    get id() {
        return this.#id
    }

    get basicInfo() {
        return {
            id: this.id,
            name: this.name,
            country: this.country,
            phone: this.phone
        }
    }
    get fullInfo() {
        return {
            id: this.id,
            name: this.name,
            country: this.country,
            phone: this.phone,
            confirmed: this.confirmed,
            verified: this.verified,
            blocked: this.blocked
        }
    }
    save() {
        let user_data = this.fullInfo;
        let user_file_path = path.resolve(users_dir, this.id + ".json");
        fs.writeFile(user_file_path, JSON.stringify(user_data), (error) => {
            if (error) {
                throw error;
            }
        })
    }
}

module.exports = User;