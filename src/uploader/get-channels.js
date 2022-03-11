// importing required modules
const path = require('path');
const mtproton = require('mtproton');
const color = require("cli-color");

const { getSessionDataFile, checkAuth, getLogTime } = require('../commons/functions');
const { login_first_text } = require('./variables');

// configuring 'dotenv'
require("dotenv").config();

// getting api_id and api_hash
const api_id = process.env.API_ID;
const api_hash = process.env.API_HASH;

// mtp is the mtproton object we will be using to communicate with tdlib
const mtp = new mtproton({
    api_id,
    api_hash,
    storageOptions: {
        path: getSessionDataFile(),
    },
});

async function getAllChannels() {
    let params = { except_ids: [] }
    try {
        let chats = await mtp.call("messages.getAllChats", params);
        let channels = chats = chats.chats.filter(chat => chat.broadcast);
        channels = channels.map(channel => {
            return {
                Name: channel.title,
                id: channel.id,
                access_hash: channel.access_hash
            }
        })
        console.log(channels);
        console.log("Found", channels.length, "channels.")
    } catch (error) {
        console.log(error)
    }
}

// Here is where the program run
async function run() {
    let authentication = await checkAuth(mtp);
    if (!authentication.success) {
        console.error(color.blue(getLogTime()), color.red("[ERROR: while checking user authentication]\n"), authentication.reason);
        process.exit();
    } else if (!authentication.content) {
        console.log(login_first_text);
        console.log()
        process.exit();
    }
    await getAllChannels()
    process.exit();
}

// Here is where the program start
run();