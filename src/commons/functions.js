
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
exports.getMtproton = () => {
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

// Returns users from the given message id
const getSenderInfo = async (mtproton, message_id) => {
    let params = { id: [{ _: "inputMessageID", id: message_id }] };
    try {
        let message = await mtproton.call("messages.getMessages", params);
        let access_hash, id, first_name;
        for (let user of message.users) {
            if (!user.self) {
                ({ access_hash, id, first_name } = user);
                break;
            }
        }
        if (access_hash && id && first_name) {
            return { success: true, result: { access_hash, id, first_name } };
        } else {
            return { success: false, reason: message };
        }
    } catch (error) {
        return { success: false, reason: error };
    }
}
exports.getSenderInfo = getSenderInfo;

// Sends a text message to the given user
exports.sendTextMessage = async (mtproton, options) => {
    let user_id = options?.user_id;
    let access_hash = options?.access_hash;
    let message_id = options?.message_id;
    let message = options?.message;
    if (!access_hash && !message_id) {
        return { success: false, reason: "BOTH_ACCESS_HASH_AND_MESSAGE_ID_NOT_SPECIFIED" };
    }
    if (!message) {
        return { success: false, reason: "MESSAGE_NOT_SPECIFIED" };
    }
    if (!access_hash || !user_id) {
        let senderInfo = await getSenderInfo(mtproton, message_id);
        if (!senderInfo.success) {
            return senderInfo;
        }
        ({ access_hash, id:user_id } = senderInfo.result);
    }
    let random_id = Math.round(Math.random() * 1000);
    let params = { peer: { _: "inputPeerUser", user_id, access_hash }, message, random_id };
    try {
        let result = await mtproton.call("messages.sendMessage", params);
        return { success: true, result };
    } catch (error) {
        return { success: false, reason: error };
    }
}