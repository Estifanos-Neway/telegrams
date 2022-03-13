
const color = require("cli-color");
const {
    checkAuth,
    getLogTime,
    getMtproton } = require("../commons/functions.js");
const {
    login_first_text } = require("../commons/variables.js");
const User = require("./modules/user.js")

const mtp = getMtproton();

checkAuth(mtp).then(authResult => {
    if (!authResult.success) {
        console.error(color.blue(getLogTime()), color.red("[ERROR: while checking user authentication]\n"), authResult.reason);
        process.exit();
    } else if (!authResult.content) {
        console.log(login_first_text);
        console.log();
        process.exit();
    }
    console.log("Waiting for new messages...")
    mtp.updates.on("updateShortMessage", async update => {
        console.log("New Message:")
        console.dir(update, { depth: null });
    })
});