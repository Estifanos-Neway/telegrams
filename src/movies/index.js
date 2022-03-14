
const color = require("cli-color");
const {
    checkAuth,
    getLogTime,
    getMtproton,
    sendTextMessage } = require("../commons/functions.js");
const {
    login_first_text } = require("../commons/variables.js");
const {
    userIdRange,
    messageTexts } = require("./config.json")
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
    console.log("Waiting for new messages...\n");
    mtp.updates.on("updateShortMessage", async message => {
        // handling new messages
        let user_id = message.user_id;
        console.log("New Message:", user_id)
        if (message.out) {
            // handling outgoing messages
            // 
        } else {
            // check if user_id in servable range or not
            if (user_id < userIdRange.min || user_id > userIdRange.max) {
                let sendMessageParams = {
                    message_id: message.id,
                    message: messageTexts.userIdOutOfRangeMessage
                }
                let sendTextMessageResult = await sendTextMessage(mtp, sendMessageParams);
                if (!sendTextMessageResult.success) {
                    console.error(color.blue(getLogTime()), color.red("[ERROR: while checking user sending a text message]\n"), sendTextMessageResult.reason);
                    return;
                }
                console.log("Id Out Of Range:", user_id, "\n");
            } else {
                // Serve the user accordingly

            }
        }
    });
});