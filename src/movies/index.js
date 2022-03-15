
const path = require("path");
const color = require("cli-color");
const {
    checkAuth,
    getLogTime,
    getMtproton,
    sendTextMessage,
    getSenderInfo } = require(path.resolve("src/commons/functions.js"));
const {
    login_first_text } = require(path.resolve("src/commons/variables.js"));
const { getMessageId } = require(path.resolve("src/movies/functions.js"));
const {
    userIdRange,
    serviceMessageTexts,
    registrationMessages,
    noteMessages } = require(path.resolve("src/movies/config.json"));
const User = require(path.resolve("src/movies/modules/user.js"));

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
        // New Incoming Private Chat
        let message_id = message.id;
        let user_id = message.user_id;
        console.log(`\n${color.blue(getLogTime())}`, `[${user_id} | ${message_id}]`, "New Message")
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
                    console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while sending 'yourIdIsOutOfRangeMessage']\n`), sendTextMessageResult.reason);
                    return;
                }
                console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Id Out Of Range");
            } else {
                // 'Chat_Id in Range' user
                let user;
                user = new User(user_id);
                if (!user.access_hash) {
                    let senderInfo = await getSenderInfo(mtp, message_id);
                    if (!senderInfo.success) {
                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while getting access_hash]\n`), senderInfo.reason);
                        let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                        if (!notifyErrorResult.success) {
                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                            return;
                        }
                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
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
                    // console.dir(sendMessageResult, { depth: null })
                    if (!sendMessageResult.success) {
                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while sending 'youAreBlockedMessage']\n`), sendMessageResult.reason);
                        let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                        if (!notifyErrorResult.success) {
                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                            return;
                        }
                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                        return;
                    }
                    console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Blocked User");
                } else if (!user.approved) {
                    // 'Un-Approved' user
                    let content = {
                        type: "text",
                        text: serviceMessageTexts.waitForAdminApproval
                    }
                    let sendMessageResult = await user.sendMessage(mtp, content);
                    // console.dir(sendMessageResult, { depth: null })
                    if (!sendMessageResult.success) {
                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while sending 'waitForAdminApproval']\n`), sendMessageResult.reason);
                        let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                        if (!notifyErrorResult.success) {
                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                            return;
                        }
                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                        return;
                    }
                    console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Un-Approved User");
                } else if (!user.confirmed) {
                    // 'Unregistered' or 'On-Registration' user
                    let last_registration_message = user.lastRegistrationMessage;
                    if (!last_registration_message) {
                        // 'Unregistered' user

                        // welcoming
                        let welcomingContent = {
                            type: "text",
                            text: serviceMessageTexts.welcomeMessage
                        }
                        let welcomingResult = await user.sendMessage(mtp, welcomingContent);
                        // console.dir(welcomingResult, { depth: null })
                        if (!welcomingResult.success) {
                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while welcoming]\n`), welcomingResult.reason);
                            let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                            if (!notifyErrorResult.success) {
                                console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                return;
                            }
                            console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                            return;
                        }

                        // initiate registration
                        let registrationMessage = registrationMessages.name;
                        let content = {
                            type: "text",
                            text: `${registrationMessage.text}\n\n(${noteMessages.tag} ${noteMessages.replay})`
                        }
                        let sendMessageResult = await user.sendMessage(mtp, content);
                        // console.dir(sendMessageResult, { depth: null })
                        if (!sendMessageResult.success) {
                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while asking '${registrationMessage.field}'](3)\n`), sendMessageResult.reason);
                            let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                            if (!notifyErrorResult.success) {
                                console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                return;
                            }
                            console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                            return;
                        }
                        let sent_message_id = getMessageId(sendMessageResult.result);
                        if (sent_message_id) {
                            user.updateLastRegistrationMessage(registrationMessage.field, sent_message_id);
                        } else {
                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while 'updateLastRegistrationMessage'](1)\n`), sendMessageResult.result);
                            let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                            if (!notifyErrorResult.success) {
                                console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                return;
                            }
                            console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                            return;
                        }
                        try {
                            user.save();
                        } catch (error) {
                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while saving '${registrationMessage.field}'\n`), error);
                            let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                            if (!notifyErrorResult.success) {
                                console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                return;
                            }
                            console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                            return;
                        }
                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Unregistered user");
                    } else {
                        // 'On-Registration' user
                        let reply_to_msg_id = message.reply_to?.reply_to_msg_id;
                        if (!reply_to_msg_id || reply_to_msg_id != last_registration_message.id) {
                            let content = {
                                type: "text",
                                text: `${serviceMessageTexts.notReplied}\n\n(${noteMessages.tag} ${noteMessages.replay})`
                            }
                            let sendMessageResult = await user.sendMessage(mtp, content);
                            // console.dir(sendMessageResult, { depth: null })
                            if (!sendMessageResult.success) {
                                console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while sending 'notReplied']\n`), sendMessageResult.reason);
                                let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                if (!notifyErrorResult.success) {
                                    console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                    return;
                                }
                                console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                return;
                            }
                            console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, `User 'notReplied' to '${last_registration_message.field}'`);
                        } else {
                            let last_registration_message_field = last_registration_message.field;

                            // validate the user answer
                            let message_text = message.message;
                            let validation = user.validate(last_registration_message_field, message_text);
                            if (!validation.success) {
                                console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while validating '${last_registration_message_field}']\n`), validation.reason);
                                let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                if (!notifyErrorResult.success) {
                                    console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                    return;
                                }
                                console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                return;
                            }
                            if (!validation.result) {
                                let content = {
                                    type: "text",
                                    text: validation.message
                                }
                                let sendMessageResult = await user.sendMessage(mtp, content);
                                // console.dir(sendMessageResult, { depth: null })
                                if (!sendMessageResult.success) {
                                    console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while sending invalid '${last_registration_message_field}']\n`), sendMessageResult.reason);
                                    let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                    if (!notifyErrorResult.success) {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                        return;
                                    }
                                    console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                    return;
                                }
                                console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, `Invalid '${last_registration_message_field}'\n`);
                                return;
                            }
                            if (last_registration_message_field === "confirm") {
                                if (validation.value == "yes") {
                                    // successful registration
                                    user.confirmed = true;
                                    user.lastRegistrationMessage = undefined;
                                    let successfulRegistrationContent = {
                                        type: "text",
                                        text: serviceMessageTexts.successfulRegistration
                                    }
                                    let successfulRegistrationResult = await user.sendMessage(mtp, successfulRegistrationContent);
                                    // console.dir(successfulRegistrationResult, { depth: null })
                                    if (!successfulRegistrationResult.success) {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while telling successful registration]\n`), successfulRegistrationResult.reason);
                                        let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                        if (!notifyErrorResult.success) {
                                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                            return;
                                        }
                                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                        return;
                                    }
                                    try {
                                        user.save();
                                    } catch (error) {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while saving 'confirmed'\n`), error);
                                        let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                        if (!notifyErrorResult.success) {
                                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                            return;
                                        }
                                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                        return;
                                    }
                                    console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Registration Confirmed");
                                } else {
                                    // restarting registration
                                    let restartRegistrationContent = {
                                        type: "text",
                                        text: serviceMessageTexts.restartRegistration
                                    }
                                    let restartRegistrationResult = await user.sendMessage(mtp, restartRegistrationContent);
                                    // console.dir(restartRegistrationResult, { depth: null })
                                    if (!restartRegistrationResult.success) {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while telling restart registration]\n`), restartRegistrationResult.reason);
                                        let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                        if (!notifyErrorResult.success) {
                                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                            return;
                                        }
                                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                        return;
                                    }

                                    // re-initiate registration
                                    let registrationMessage = registrationMessages.name;
                                    let content = {
                                        type: "text",
                                        text: `${registrationMessage.text}`
                                    }
                                    let sendMessageResult = await user.sendMessage(mtp, content);
                                    // console.dir(sendMessageResult, { depth: null })
                                    if (!sendMessageResult.success) {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while asking '${registrationMessage.field}'](4)\n`), sendMessageResult.reason);
                                        let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                        if (!notifyErrorResult.success) {
                                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                            return;
                                        }
                                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                        return;
                                    }
                                    let sent_message_id = getMessageId(sendMessageResult.result);
                                    if (sent_message_id) {
                                        user.updateLastRegistrationMessage(registrationMessage.field, sent_message_id);
                                    } else {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while 'updateLastRegistrationMessage'](2)\n`), sendMessageResult.result);
                                        let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                        if (!notifyErrorResult.success) {
                                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                            return;
                                        }
                                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                        return;
                                    }
                                    try {
                                        user.save();
                                    } catch (error) {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while saving '${registrationMessage.field}'\n`), error);
                                        let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                        if (!notifyErrorResult.success) {
                                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                            return;
                                        }
                                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                        return;
                                    }
                                    console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, `Registration Restarted]`);
                                    return;
                                }
                            } else {
                                // update the user data
                                user[last_registration_message_field] = validation.value;
                                // save the updated user
                                try {
                                    user.save();
                                } catch (error) {
                                    console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while saving the '${last_registration_message_field}']\n`), error);
                                    let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                    if (!notifyErrorResult.success) {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                        return;
                                    }
                                    console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                    return;
                                }

                                // to the next question
                                let next_registration_message_field = registrationMessages[last_registration_message_field].next;
                                let next_registration_message = registrationMessages[next_registration_message_field];
                                let next_registration_message_text = next_registration_message.text;
                                // replace placeholders
                                next_registration_message_text = next_registration_message_text.replace(/\%name\%/g, user.name);
                                if (next_registration_message_field === "confirm") {
                                    let contact_info = "";
                                    for (let [field, value] of Object.entries(user.contactInfo)) {
                                        contact_info += `${field[0].toUpperCase() + "" + field.slice(1).toLowerCase()}: ${value}\n`
                                    }
                                    next_registration_message_text = next_registration_message_text.replace(/\%contactInfo\%/g, contact_info);
                                }
                                let content = {
                                    type: "text",
                                    text: next_registration_message_text
                                }
                                let sendMessageResult = await user.sendMessage(mtp, content);
                                // console.dir(sendMessageResult, { depth: null })
                                if (!sendMessageResult.success) {
                                    console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while asking '${next_registration_message_field}'](1)\n`), sendMessageResult.reason);
                                    let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                    if (!notifyErrorResult.success) {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                        return;
                                    }
                                    console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                    return;
                                }
                                let sent_message_id = getMessageId(sendMessageResult.result);
                                if (!sent_message_id) {
                                    console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while asking '${next_registration_message_field}'](2)\n`), sendMessageResult.result);
                                    let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                    if (!notifyErrorResult.success) {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                        return;
                                    }
                                    console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                    return;
                                }
                                user.updateLastRegistrationMessage(next_registration_message.field, sent_message_id);
                                try {
                                    user.save();
                                } catch (error) {
                                    console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while saving 'updateLastRegistrationMessage' to '${next_registration_message_field}'](3)\n`), error);
                                    let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                                    if (!notifyErrorResult.success) {
                                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                                        return;
                                    }
                                    console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                                    return;
                                }
                                console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, `User On-Registration [${last_registration_message_field}]`);
                                return;
                            }
                        }
                    }
                } else {
                    // 'Registered' user
                    let content = {
                        type: "text",
                        text: `You are a registered user. The service will be started soon.`
                    }
                    let sendMessageResult = await user.sendMessage(mtp, content);
                    // console.dir(sendMessageResult, { depth: null })
                    if (!sendMessageResult.success) {
                        console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while handling a 'Registered' user]\n`), sendMessageResult.reason);
                        let notifyErrorResult = await user.notifyError(mtp, "Internal Error");
                        if (!notifyErrorResult.success) {
                            console.error(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, color.red(`[ERROR: while notifying error]\n`), notifyErrorResult.reason);
                            return;
                        }
                        console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, "Error Notified");
                        return;
                    }
                    console.log(color.blue(getLogTime()), `[${user_id} | ${message_id}]`, `Registration user`);
                    return;
                }
            }
        }
    });
});