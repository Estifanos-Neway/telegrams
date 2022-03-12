
// common functions for all apps

const path = require('path');
const mtproton = require("mtproton");

// configuring 'dotenv'
require("dotenv").config();

const {
    default_user_file,
    session_data_dir } = require("./variables");

// almost all functions in this module expect mtproton object as there first argument
// all functions return an object required property named 'success'
// it is boolean and tells if it is a successful return or not,
// the other properties depend on 'success'

// Returns the current time formatted for logging
exports.getLogTime = () => {
    let now = new Date().toISOString();
    now = now.replace("Z", "").replace(/\-/g, ":").replace("T", "-");
    now = now.split(".")[0];
    now = now.substring(now.indexOf(":") + 1, now.lastIndexOf(":"))
    return "[" + now + "]";
}

// returns mtproton object
exports.getMtproton = async () => {
    let session_data_file = this.getSessionDataFile();

    // getting api_id and api_hash
    const api_id = process.env.API_ID;
    const api_hash = process.env.API_HASH;

    // mtp is the mtproton object we will be using to communicate with tdlib
    return new mtproton({
        api_id,
        api_hash,
        storageOptions: {
            path: path.resolve(__dirname, session_data_file)
        },
    });
}

// Checks if there is a logged in user or not
exports.checkAuth = async (mtproton) => {
    try {
        let getSupportResult = await mtproton.call("help.getSupport");
        if (getSupportResult._ === "help.support") {
            return { success: true, content: true }
        }
        return { success: false, reason: getSupportResult }
    } catch (error) {
        if (error.error_message === "AUTH_KEY_UNREGISTERED") {
            return { success: true, content: false }
        }
        return { success: false, reason: error }
    }
}

exports.getSessionDataFile = () => {
    let user_file;
    if (process.argv[2]) {
        user_file = process.argv[2];
    } else {
        user_file = default_user_file;
    }
    return path.resolve(session_data_dir, user_file + ".json");
}
// Returns the current user
exports.getMe = async (mtproton) => {
    let params = { id: { _: 'inputUserSelf' } };
    try {
        let userFull = await mtproton.call("users.getFullUser", params);
        let user = userFull.user;
        if (user) {
            return { success: true, content: user };
        } else {
            return { success: false, reason: userFull };
        }
    } catch (error) {
        return { success: false, reason: error };
    }
}