
const path = require("path");
const fs = require("fs");
const {
    users_dir } = require("../variables.js");
const { validations } = require("../config.json");

class User {
    #id;
    access_hash;
    name;
    age;
    country;
    phone;
    confirmed = false;
    approved = true;
    blocked = false;
    lastRegistrationMessage;

    constructor(id) {
        this.#id = id;
        if (this.isRegistered()) {
            let user_file_path = path.resolve(users_dir, id + ".json");
            let user_data = fs.readFileSync(user_file_path, { encoding: 'utf-8' });
            user_data = JSON.parse(user_data);
            for (let [field, value] of Object.entries(user_data)) {
                try {
                    this[field] = value;
                } catch (error) { }
            }
        }
    }

    get id() {
        return this.#id
    }

    isRegistered() {
        return fs.existsSync(path.resolve(users_dir, this.id + ".json"));
    }

    get contactInfo() {
        return {
            name: this.name,
            aga: this.age,
            country: this.country,
            phone: this.phone
        }
    }

    get fullInfo() {
        let fullInfo = { id: this.id };
        for (let [key, value] of Object.entries(this)) {
            fullInfo[key] = value;
        }
        return fullInfo
    }

    async sendMessage(mtproton, content, options) {
        if (!content) {
            return { success: false, reason: "CONTENT_NOT_SPECIFIED" };
        }
        let type = content.type;
        if (!type) {
            return { success: false, reason: "CONTENT_TYPE_NOT_SPECIFIED" };
        }
        let random_id = Math.round(Math.random() * 1000);
        if (type === "text") {
            let text = content.text;
            if (!text) {
                return { success: false, reason: "MESSAGE_TEXT_NOT_SPECIFIED" };
            }
            let params = { peer: { _: "inputPeerUser", user_id: this.id, access_hash: this.access_hash }, message: text, random_id };
            try {
                let result = await mtproton.call("messages.sendMessage", params);
                return { success: true, result };
            } catch (error) {
                return { success: false, reason: error };
            }
        }
    }
    updateLastRegistrationMessage(message_code, message_id) {
        this.lastRegistrationMessage = {
            code: message_code,
            id: message_id
        }
    }
    validate(fieldName, value) {
        if (!(fieldName && value)) {
            return { success: false, reason: "FIELD_NAME_OR_VALUE_NOT_SPECIFIED" };
        }
        switch (fieldName) {
            case "age":
                let age = parseInt(value);
                if (Number.isInteger(age) && age > validations.minAge) {
                    return { success: true, result: true, value: age };
                } else {
                    return { success: true, result: false, message: `Age must be a number greater than ${validations.minAge}` };
                }
            default:
                return { success: true, result: true, value };
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