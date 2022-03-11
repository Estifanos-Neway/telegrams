// importing required modules
const path = require('path');
const mtproton = require('mtproton');
const color = require("cli-color"); // this module is used to set the CLI colors

const {
    setClosestDc,
    auth } = require("./functions.js");
const {
    welcome_text,
    welcome_back_text } = require("./variables.js");
const {
    getLogTime,
    checkAuth,
    getMe, 
    getSessionDataFile} = require('../commons/functions.js');

// configuring 'dotenv'
require("dotenv").config();

// getting the path to session data keeping file
let session_data_file = getSessionDataFile();

// getting api_id and api_hash
const api_id = process.env.API_ID;
const api_hash = process.env.API_HASH;

// mtp is the mtproton object we will be using to communicate with tdlib
const mtp = new mtproton({
    api_id,
    api_hash,
    storageOptions: {
        path: path.resolve(__dirname, session_data_file)
    },
});

// sets the default data center to the closest data center
async function setDefaultDC() {
    let setClosestDcResult = await setClosestDc(mtp);
    if (!setClosestDcResult.success) {
        console.error(color.blue(getLogTime()), color.red("[ERROR: while setting the default DC]"), setClosestDcResult[1]);
    }
}

// This function deals with user authentication
async function authorize() {
    let authentication = await checkAuth(mtp);
    if (!authentication.success) {
        console.error(color.blue(getLogTime()), color.red("[ERROR: while checking user authentication]"), authentication.reason);
        process.exit();
    } else if (!authentication.content) {
        let authResult = await auth(mtp);
        if (!authResult.success) {
            console.error(color.blue(getLogTime()), color.red("[ERROR: while authenticating]"), authResult.reason);
            process.exit();
        }
        console.log(welcome_text(authResult.content.first_name));
    } else {
        let getMeResult = await getMe(mtp);
        if (getMeResult.success) {
            console.log(welcome_back_text(getMeResult.content.first_name));
        } else {
            console.log(welcome_back_text("there"));
        }
    }
}

// Here is where the program run
async function run() {
    await setDefaultDC();
    await authorize();
    process.exit();
}

// Here is where the program start
run();