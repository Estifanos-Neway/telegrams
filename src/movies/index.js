
const color = require("cli-color");
const {
    checkAuth,
    getLogTime,
    getMtproton,
    sendTextMessage,
    getSenderInfo } = require("../commons/functions.js");
const {
    login_first_text } = require("../commons/variables.js");
const {
    userIdRange,
    serviceMessageTexts,
    registrationMessages,
    noteMessages } = require("./config.json")
const User = require("./modules/user.js")

const mtp = getMtproton();

checkAuth(mtp).then(authResult => {
    // check if there is logged in user
    if (!authResult.success) {
        console.error(color.blue(getLogTime()), color.red("[ERROR: while checking user authentication]\n"), authResult.reason);
        process.exit();
    } else if (!authResult.content) {
        console.log(login_first_text);
        console.log();
        process.exit();
    }
    console.log(color.blue(getLogTime()), "Waiting for new messages...\n");
    mtp.updates.on("updateShortMessage", async message => {
        // handling new messages
        let message_id = message.id;
        let user_id = message.user_id;
        console.log(color.blue(getLogTime()), `[${message_id}]`, "New Message:", user_id)
        if (message.out) {
            // handling outgoing messages
            // 
        } else {
            // New Incoming Private Chat
            if (user_id < userIdRange.min || user_id > userIdRange.max) {
                // Chat_Id Out of Range
                let sendMessageParams = {
                    message_id,
                    message: serviceMessageTexts.yourIdIsOutOfRangeMessage
                }
                let sendTextMessageResult = await sendTextMessage(mtp, sendMessageParams);
                if (!sendTextMessageResult.success) {
                    console.error(color.blue(getLogTime()), color.red(`[ERROR: while sending 'yourIdIsOutOfRangeMessage' to ${user_id}]\n`), sendTextMessageResult.reason);
                    return;
                }
                console.log(color.blue(getLogTime()), `[${message_id}]`, "Id Out Of Range:", user_id, "\n");
            } else {
                // 'Chat_Id in Range' user
                let user;
                user = new User(user_id);
                if (!user.access_hash) {
                    let senderInfo = await getSenderInfo(mtp, message_id);
                    if (!senderInfo.success) {
                        console.error(color.blue(getLogTime()), color.red(`[ERROR: while getting access_hash ${user_id}]\n`), senderInfo.reason);
                        return;
                    }
                    user.access_hash = senderInfo.result.access_hash;
                }
                if (user.blocked) {
                    // 'Blocked' user
                    let content = {
                        type: "text",
                        text: serviceMessageTexts.youAreBlockedMessage
                    }
                    let sendMessageResult = await user.sendMessage(mtp, content);
                    if (!sendMessageResult.success) {
                        console.error(color.blue(getLogTime()), color.red(`[ERROR: while sending 'youAreBlockedMessage' to ${user_id}]\n`), sendMessageResult.reason);
                        return;
                    }
                    console.log(color.blue(getLogTime()), `[${message_id}]`, "Blocked User:", user_id, "\n");
                } else if (!user.approved) {
                    // 'Un-Approved' user
                    let content = {
                        type: "text",
                        text: serviceMessageTexts.waitForAdminApproval
                    }
                    let sendMessageResult = await user.sendMessage(mtp, content);
                    if (!sendMessageResult.success) {
                        console.error(color.blue(getLogTime()), color.red(`[ERROR: while sending 'waitForAdminApproval' to ${user_id}]\n`), sendMessageResult.reason);
                        return;
                    }
                    console.log(color.blue(getLogTime()), `[${message_id}]`, "Un-Approved User:", user_id, "\n");
                } else if (!user.confirmed) {
                    // 'Unregistered' or 'On-Registration' user
                    let last_registration_message = user.lastRegistrationMessage;
                    if (!last_registration_message) {
                        // 'Unregistered' user
                        let registrationMessage = registrationMessages.welcome;
                        let content = {
                            type: "text",
                            text: `${registrationMessage.text}\n\n(${noteMessages.tag} ${noteMessages.replay})`
                        }
                        let sendMessageResult = await user.sendMessage(mtp, content);
                        if (!sendMessageResult.success) {
                            console.error(color.blue(getLogTime()), color.red(`[ERROR: while sending '${registrationMessage.code}' to ${user_id}]\n`), sendMessageResult.reason);
                            return;
                        }
                        let sent_message_id = sendMessageResult.result.id;
                        if (sent_message_id) {
                            user.updateLastRegistrationMessage(registrationMessage.code, sent_message_id);
                        } else {
                            console.error(color.blue(getLogTime()), color.red(`[ERROR: while 'updateLastRegistrationMessage' to ${user_id}]\n`), sendMessageResult.result);
                            return;
                        }
                        try {
                            user.save();
                        } catch (error) {
                            console.error(color.blue(getLogTime()), color.red(`[ERROR: while 'save' after '${registrationMessage.code}' to ${user_id}]\n`), error);
                            return;
                        }
                        console.log(color.blue(getLogTime()), `[${message_id}]`, "Unregistered user:", user_id, "\n");
                    } else {
                        // 'On-Registration' user
                        let reply_to_msg_id = message.reply_to?.reply_to_msg_id;
                        if (!reply_to_msg_id || reply_to_msg_id != last_registration_message.id) {
                            let content = {
                                type: "text",
                                text: `${serviceMessageTexts.notReplied}\n\n(${noteMessages.tag} ${noteMessages.replay})`
                            }
                            let sendMessageResult = await user.sendMessage(mtp, content);
                            if (!sendMessageResult.success) {
                                console.error(color.blue(getLogTime()), color.red(`[ERROR: while sending 'notReplied' to ${user_id}]\n`), sendMessageResult.reason);
                                return;
                            }
                            console.log(color.blue(getLogTime()), `[${message_id}]`, `User 'notReplied' to '${last_registration_message.code}':`, user_id, "\n");
                        } else {
                            
                            let last_registration_message_code = last_registration_message.code;
                            let next_registration_message_code = registrationMessages[last_registration_message_code].next;
                            if (!next_registration_message_code) {
                                // ask for verification
                                console.log("Done")
                            } else {
                                let next_registration_message = registrationMessages[next_registration_message_code];
                                let content = {
                                    type: "text",
                                    text: next_registration_message.text
                                }
                                let sendMessageResult = await user.sendMessage(mtp, content);
                                if (!sendMessageResult.success) {
                                    console.error(color.blue(getLogTime()), color.red(`[ERROR: while sending '${next_registration_message.code}' to ${user_id}]\n`), sendMessageResult.reason);
                                    return;
                                }
                                let sent_message_id = sendMessageResult.result.id;
                                if (!sent_message_id) {
                                    console.error(color.blue(getLogTime()), color.red(`[ERROR: while 'updateLastRegistrationMessage' to ${user_id}]\n`), sendMessageResult.result);
                                    return;
                                }
                                user.updateLastRegistrationMessage(next_registration_message.code, sent_message_id);
                                try {
                                    user.save();
                                } catch (error) {
                                    console.error(color.blue(getLogTime()), color.red(`[ERROR: while 'save' after '${next_registration_message.code}' to ${user_id}]\n`), error);
                                    return;
                                }
                                console.log(color.blue(getLogTime()), `[${message_id}]`, `User On-Registration [${last_registration_message.code}]:`, user_id, "\n");
                                return;
                            }
                        }
                    }
                } else {
                    // 'Registered' user
                    // 
                }
            }
        }
    });
});