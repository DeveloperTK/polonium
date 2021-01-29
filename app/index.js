require('../config');

const fs = require('fs');
const https = require('https');
const api = require('./twitch-api');

const gameID = process.argv.slice(2)[0];
const locale = process.argv.slice(2)[1];

const currentTime = new Date().toISOString()
    .replace(":", "-").replace(":", "-");

if (!gameID)
    throw "Missing program argument: { position: 0, name: gameID }"
if (!locale)
    throw "Missing program argument: { position: 1, name: locale }"

// create directories

const mediaDirectory = __dirname + '/../media';

try {
    fs.mkdirSync(mediaDirectory);
} catch (ignored) {
    // directory probably exists
}

fs.mkdirSync(mediaDirectory + '/' + currentTime);

const downloadedMediaDirectory = __dirname + '/../media/' + currentTime + '/downloaded';
fs.mkdirSync(downloadedMediaDirectory);

const generatedMediaDirectory = __dirname + '/../media/' + currentTime + '/generated';
fs.mkdirSync(generatedMediaDirectory);

const gameIDs = {
    justChatting: 509658
}

// download clips from twitch

api.getYesterdaysTopClips(gameID, locale, clips => {
    let meta = [];

    for (let i = 0; i < clips.length; i++) {
        const link = clips[i].mediaURL;

        // output all video files
        let file = fs.createWriteStream(downloadedMediaDirectory + `/${i}.mp4`, {flags: 'w', encoding: 'utf-8'});
        https.get(link, response => {
            response.pipe(file);
        });

        meta.push({
            filename: i + ".mp4",
            link: clips[i].meta['url'],
            channel: clips[i].meta['broadcaster_name']
        });
    }

    // save metadata
    fs.writeFileSync(downloadedMediaDirectory + '/meta.json', JSON.stringify(meta));
});

// TODO: generate video with ffmpeg
