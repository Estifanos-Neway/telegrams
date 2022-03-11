// importing required modules
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const mtproton = require('mtproton');
const color = require("cli-color");

const {
    getMetaData,
    createThumbnail,
    saveFileParts,
    progress,
    progressBar,
    sendMedia } = require("./functions.js");

const config = require("./config.json");
const { getSessionDataFile, getLogTime, checkAuth } = require('../commons/functions.js');
const { login_first_text } = require('../commons/variables');
if (!config.absolute_path) {
    config.source_path = path.resolve(__dirname, config.source_path);
    config.target_path = path.resolve(__dirname, config.target_path);
    config.thumb_path = path.resolve(__dirname, config.thumb_path);
}

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

function watch() {
    const watcher = chokidar.watch(config.target_path, {
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 1000
        }
    });

    console.log("Watching the target folder...\n");
    watcher.on('add', async file_path => {
        let extension = path.extname(file_path);
        if (!(extension in config.supported_extensions)) {
            return;
        }
        let file_mime = config.supported_extensions[extension];
        let file_name = path.basename(file_path);
        console.log(color.blue(getLogTime()), `${color.green("New file")}:`, `[${file_name}]`);
        console.log(color.blue(getLogTime()), `getting metadata... [${file_name}]`);
        let metadata;
        try {
            metadata = await getMetaData(file_path);
        } catch (error) {
            console.error(color.blue(getLogTime()), color.red(`[ERROR: while getting metadata of '${file_name}']\n`), error);
            return;
        }
        let file_size = metadata?.format?.size;
        let duration = metadata?.format?.duration;
        let streams = metadata?.streams;
        if (!(file_size && duration && streams)) {
            console.error(color.blue(getLogTime()), color.red(`[ERROR: file with incompatible metadata ['${file_name}]']\n`), metadata);
            return;
        }

        let width, height;
        for (let stream of streams) {
            if (stream.codec_type === "video") {
                ({ width, height } = stream);
                break;
            }
        }
        if (!(width && height)) {
            console.error(color.blue(getLogTime()), color.red(`[ERROR: file with incompatible metadata '${file_name}']\n`), metadata);
            return;
        }

        let file_size_MB = Math.round((file_size / (1024 * 1024) * 100)) / 100 + " MB";
        let duration_min = Math.round((duration / 60) * 100) / 100 + " Minutes";
        console.log(color.blue(getLogTime()), color.magenta("Size"), `: ${file_size_MB}, `, color.magenta("Length"), `: ${duration_min} [${file_name}]`);

        console.log(color.blue(getLogTime()), `creating preview... [${file_name}]`);
        let thumb_path;
        if (config.custom_thumbnail) {
            let extension_regex = new RegExp(extension + "$");
            for (let thumbnail_extension of config.supported_thumbnail_extensions) {
                let temp_thumb_path = file_path.replace(extension_regex, thumbnail_extension);
                if (fs.existsSync(temp_thumb_path)) {
                    thumb_path = temp_thumb_path;
                    break;
                }
            }
        }
        if (!thumb_path) {
            try {
                thumb_path = await createThumbnail(file_path, config.thumb_path, width, height, [config.preview_location]);
            } catch (error) {
                console.error(color.blue(getLogTime()), color.red(`[ERROR: while creating preview for '${file_name}']\n`), error);
                return;
            }
        }
        if (!thumb_path) {
            console.error(color.blue(getLogTime()), color.red(`[ERROR: while creating preview for '${file_name}']\n`), "unknown error");
            return;
        }
        let thumb_name = path.basename(thumb_path);

        console.log(color.blue(getLogTime()), `uploading a preview... [${file_name}]`);
        let thumb_id, thumb_parts, big_thumb;
        for await (let result of saveFileParts(mtp, thumb_path)) {
            if (!result.ok) {
                console.log()
                console.error(color.blue(getLogTime()), color.red(`[ERROR: while uploading preview for '${file_name}']\n`), result.reason);
                return;
            } else if (!result.done) {
                let uploaded_size_MB = Math.round((result.result.uploaded_size / 1048576) * 100) / 100
                let full_size_MB = Math.round((result.result.full_size / 1048576) * 100) / 100
                // progress(`${color.blue(getLogTime())} ${color.magenta("Status")}: ${uploaded_size_MB}/${full_size_MB} MB [${file_name}]`);
                let percent = (result.result.uploaded_size * 100) / result.result.full_size;
                progress(`${color.blue(getLogTime())} ${uploaded_size_MB} MB | ${progressBar(percent)} | ${full_size_MB} MB [${file_name}]`);
            } else {
                ({ file_id: thumb_id, file_total_parts: thumb_parts, big: big_thumb } = result.result);
                console.log()
                console.log(color.blue(getLogTime()), color.green(`Preview uploaded!`), `[${file_name}]`)
            }
        }

        console.log(color.blue(getLogTime()), `uploading a file... [${file_name}]`);
        let file_id, file_parts, big_file;
        for await (let result of saveFileParts(mtp, file_path)) {
            if (!result.ok) {
                console.log()
                console.error(color.blue(getLogTime()), color.red(`[ERROR: while uploading a file '${file_name}']\n`), result.reason);
                return;
            } else if (!result.done) {
                let uploaded_size_MB = Math.round((result.result.uploaded_size / 1048576) * 100) / 100
                let full_size_MB = Math.round((result.result.full_size / 1048576) * 100) / 100
                // progress(`${color.blue(getLogTime())} ${color.magenta("Status")}: ${uploaded_size_MB}/${full_size_MB} MB [${file_name}]`);
                let percent = (result.result.uploaded_size * 100) / result.result.full_size;
                progress(`${color.blue(getLogTime())} ${uploaded_size_MB} MB | ${progressBar(percent)} | ${full_size_MB} MB [${file_name}]`);
            } else {
                ({ file_id, file_total_parts: file_parts, big: big_file } = result.result);
                console.log();
                console.log(color.blue(getLogTime()), color.green("File uploaded!"), `[${file_name}]`)
            }
        }

        console.log(color.blue(getLogTime()), `sending to the channel... [${file_name}]`);
        let peer = { _: "inputPeerChannel", ...config.channel };
        let attributes = [
            {
                _: "documentAttributeVideo",
                round_message: false,
                supports_streaming: true,
                duration,
                w: width,
                h: height
            },
            {
                _: "documentAttributeFilename",
                file_name
            }
        ];
        let file = {
            _: big_file ? "inputFileBig" : "inputFile",
            id: file_id,
            parts: file_parts,
            name: file_name
        }
        let thumb = {
            _: big_thumb ? "inputFileBig" : "inputFile",
            id: thumb_id,
            parts: thumb_parts,
            name: thumb_name
        }
        let media = {
            _: "inputMediaUploadedDocument",
            force_file: false,
            mime_type: file_mime,
            attributes,
            file,
            thumb
        };
        let message;
        if (config.include_name) {
            message = file_name;
        }

        try {
            let sendMediaResult = await sendMedia(mtp, peer, media, message);
            if (sendMediaResult.success) {
                console.log(color.blue(getLogTime()), color.green("File sent!"), `[${file_name}]`);
            } else {
                console.error(color.blue(getLogTime()), color.red(`[ERROR: while sending file to the channel '${file_name}']\n`), sendMediaResult);
                return;
            }
        } catch (error) {
            console.error(color.blue(getLogTime()), color.red(`[ERROR: while sending file to the channel '${file_name}']\n`), error);
            return;
        }
        console.log(color.blue(getLogTime()), `Moving a thumbnail out... [${file_name}]`);
        fs.rename(thumb_path, path.resolve(config.source_path, thumb_name), (error) => {
            if (error) {
                console.error(color.blue(getLogTime()), color.red(`[ERROR: while moving a thumbnail out (you may move it manually) '${thumb_name}']\n`), error);
            } else {
                console.log(color.blue(getLogTime()), color.green("File moved out!"), `[${file_name}]`);
            }
        });
        console.log(color.blue(getLogTime()), `Moving a file out... [${file_name}]`);
        fs.rename(file_path, path.resolve(config.source_path, file_name), (error) => {
            if (error) {
                console.error(color.blue(getLogTime()), color.red(`[ERROR: while moving a file out (you may move it manually) '${file_name}']\n`), error);
            } else {
                console.log(color.blue(getLogTime()), color.green("File moved out!"), `[${file_name}]`);
            }
        });
    });
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
    watch();
}

// Here is where the program start
run();