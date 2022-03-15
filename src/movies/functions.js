
exports.getMessageId = message => {
    let message_id = message.id;
    if (!message_id && message.updates) {
        for (let update of message.updates) {
            if (update._ === "updateMessageID") {
                message_id = update.id;
                break;
            }
        }
    }
    return message_id;
}