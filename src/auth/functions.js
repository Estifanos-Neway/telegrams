
const prompt = require('prompt-sync')();
const {
    ask_phone_number_text,
    ask_login_code_text, } = require("./variables.js");

// almost all functions in this module expect mtproton object as there first argument
// all functions return an object required property named 'success'
// it is boolean and tells if it is a successful return or not,
// the other properties depend on 'success'

// This function sets the default data center to the
// closest data center
exports.setClosestDc = async (mtproton) => {
    try {
        let result = await mtproton.call('help.getNearestDc');
        let dc = result.nearest_dc;
        if (dc) {
            mtproton.setDefaultDc(dc);
            return { success: true }
        } else {
            return { success: false, reason: result }
        }
    } catch (error) {
        return { success: false, reason: error }
    }
}

// This function expects a phone number 
// and send login code to the phone number
async function sendCode(mtproton, phone_number) {
    let params = { phone_number: phone_number, settings: { _: 'codeSettings' } };
    try {
        let result = await mtproton.call('auth.sendCode', params);
        if (result.phone_code_hash) {
            return { success: true, content: result.phone_code_hash }
        } else {
            return { success: false, reason: result }
        }
    } catch (error) {
        return { success: false, reason: error }
    }
}

// this function authenticate a user to this device
async function signIn(mtproton, phone_number, phone_code_hash, phone_code) {
    let params = { phone_number, phone_code_hash, phone_code };
    try {
        let result = await mtproton.call('auth.signIn', params);
        if (result.user) {
            return { success: true, content: result.user };
        } else {
            return { success: false, reason: result };
        }
    } catch (error) {
        return { success: false, reason: error };
    }
}

// This function take phone number and login code
// from users and sign them in
exports.auth = async (mtproton) => {
    let phone_number = prompt(ask_phone_number_text);
    let phone_code_hash;
    while (true) {
        let sendCodeResult = await sendCode(mtproton, phone_number);
        if (sendCodeResult.success) {
            phone_code_hash = sendCodeResult.content;
            break;
        } else if (sendCodeResult.reason._ === "mt_rpc_error") {
            let error_message = sendCodeResult.reason.error_message;
            if (error_message.startsWith("PHONE_MIGRATE")) {
                error_message = error_message.split("_");
                let dc = error_message[error_message.length - 1];
                try {
                    await mtproton.setDefaultDc(parseInt(dc));
                } catch (error) {
                    return { success: false, reason: error };
                }
            } else {
                return sendCodeResult;
            }
        } else {
            return sendCodeResult;
        }
    }
    let login_code = prompt(ask_login_code_text);
    let signInResult = await signIn(mtproton, phone_number, phone_code_hash, login_code);
    return signInResult;
}