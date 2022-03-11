
// this file contains the functions to be used in the main app
const path = require("path");
const fs = require("fs");
const prompt = require('prompt-sync')();
const ffmpeg = require('fluent-ffmpeg')

const {
    tg_small_file_limit,
    tg_file_part_size,
    progress_bar_width, } = require("./variables.js");

// almost all functions in this module expect mtproton object as there first argument
// all functions return an object required property named 'success'
// it is boolean and tells if it is a successful return or not,
// the other properties depend on 'success'

exports.progress = text => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(text);
}

exports.progressBar = percent => {
    let completed = (percent / 100) * progress_bar_width;
    let uncompleted = progress_bar_width - completed;
    return "#".repeat(completed) + "-".repeat(uncompleted);
}

exports.getMetaData = (file_path) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(file_path, function (error, metadata) {
            if (metadata) {
                resolve(metadata);
            } else {
                reject(error);
            }
        });
    })
}

exports.createThumbnail = async (file_path, thumb_path, width, height, timestamps) => {
    let thumb_name;
    return new Promise((resolve, reject) => {
        try {
            ffmpeg(file_path)
                .on('filenames', function (filenames) {
                    thumb_name = filenames[0];
                })
                .on('end', function () {
                    resolve(path.resolve(thumb_path, thumb_name));
                })
                .screenshots({
                    timestamps,
                    filename: `%b-${new Date().getTime()}.png`,
                    folder: thumb_path,
                    size: `${width}x${height}`
                });
        } catch (error) {
            reject(error)
        }
    })
}

exports.saveFilePartsSync = async function* (mtproton, file_path) {
    let bytes;
    try {
        bytes = fs.readFileSync(file_path);
    } catch (error) {
        yield { ok: false, reason: error };
        return;
    }

    let length = bytes.length;
    let big, saver_method;
    if (length > tg_small_file_limit) {
        big = true;
        saver_method = "upload.saveBigFilePart";
    } else {
        big = false;
        saver_method = "upload.saveFilePart";
    }
    let file_total_parts = Math.ceil(length / tg_file_part_size);
    let file_id = Math.round(Math.random() * 10000);
    let file_part = 0;
    let uploaded_size = 0;
    for (let start_index = 0; start_index <= length; start_index += tg_file_part_size, file_part++) {
        let partBytes = bytes.slice(start_index, start_index + tg_file_part_size);
        console.log(partBytes)
        let params = { bytes: partBytes, file_id, file_part, file_total_parts }
        try {
            let result = await mtproton.call(saver_method, params);
            if (result) {
                uploaded_size += partBytes.length
                yield { ok: true, result: { uploaded_size, full_size: length } };
            } else {
                yield { ok: false, reason: "parts of the file not uploaded" };
            }
        } catch (error) {
            yield { ok: false, reason: error };
            return;
        }
    }
    yield { ok: true, done: true, result: { file_id, file_total_parts, big } }
}

exports.saveFileParts = async function* (mtproton, file_path) {
    let stat;
    try {
        stat = fs.statSync(file_path);
    } catch (error) {
        yield { ok: false, reason: error };
        return;
    }
    let length = stat.size;
    let big, saver_method;
    if (length > tg_small_file_limit) {
        big = true;
        saver_method = "upload.saveBigFilePart";
    } else {
        big = false;
        saver_method = "upload.saveFilePart";
    }
    let file_total_parts = Math.ceil(length / tg_file_part_size);
    let file_id = Math.round(Math.random() * 10000);
    let file_part = 0;
    let uploaded_size = 0;

    let readStream;
    try {
        readStream = fs.createReadStream(file_path, { highWaterMark: tg_file_part_size });
    } catch (error) {
        yield { ok: false, reason: error };
        return;
    }
    let end, final;
    while (!end) {
        readStream.resume();
        yield new Promise(resolve => {
            if (final) {
                end = true;
                resolve({ ok: true, done: true, result: { file_id, file_total_parts, big } })
            }
            readStream.once("data", async bytes => {
                readStream.pause();
                let params = { bytes, file_id, file_part, file_total_parts }
                file_part++;
                try {
                    let result = await mtproton.call(saver_method, params);
                    if (result) {
                        uploaded_size += bytes.length;
                        if (length > uploaded_size) {
                            resolve({ ok: true, result: { uploaded_size, full_size: length } });
                        } else {
                            final = true;
                            readStream.destroy();
                            resolve({ ok: true, result: { uploaded_size, full_size: length } });
                        }
                    } else {
                        end = true;
                        readStream.destroy();
                        resolve({ ok: false, reason: "parts of the file not uploaded" });
                    }
                } catch (error) {
                    end = true;
                    readStream.destroy();
                    resolve({ ok: false, reason: error });
                }
            });
        });
    }
}

exports.sendMedia = async (mtproton, peer, media, message) => {
    let random_id = Math.round(Math.random() * 10000);
    let params = { peer, media, message, random_id };
    try {
        let result = await mtproton.call("messages.sendMedia", params);
        return { success: true, reason: result }
    } catch (error) {
        return { success: false, reason: error }
    }
}