
const color = require("cli-color");
const {
    checkAuth,
    getLogTime,
    getMtproton } = require("../commons/functions.js");
const {
    login_first_text } = require("../commons/variables.js");

const mtp = getMtproton();

async function run() {
    let authentication = await checkAuth(mtp);
    if (!authentication.success) {
        console.error(color.blue(getLogTime()), color.red("[ERROR: while checking user authentication]\n"), authentication.reason);
        process.exit();
    } else if (!authentication.content) {
        console.log(login_first_text);
        console.log();
        process.exit();
    }
    console.log("Hey there!")
}

run();
