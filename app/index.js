// configure environment variables
require('../config');

// standard node imports
const fs = require('fs');
const https = require('https');

// module classes
const twitchApi = new (require('./twitch-api')).class(process.env.TWITCH_API_CLIENTID, process.env.TWITCH_API_SECRET);
const ffmpegApi = new (require('./ffmpeg-api')).class();
const overlayFilters = new (require('./overlay-filters')).class();

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

const downloadedMediaDirectory = mediaDirectory + '/' + currentTime + '/downloaded';
fs.mkdirSync(downloadedMediaDirectory, {recursive: true});

const generatedMediaDirectory = mediaDirectory + '/' + currentTime + '/generated';
fs.mkdirSync(generatedMediaDirectory, {recursive: true});

const persistentNumberPath = __dirname + '/../video-number.txt';
let currentNumber = 0;

if (fs.existsSync(persistentNumberPath)) {
    let fileInput = fs.readFileSync(persistentNumberPath).toString().trim();
    currentNumber = Number(fileInput);
} else {
    fs.writeFileSync(persistentNumberPath, '0', {encoding: 'utf8'});
}

// download clips from twitch

twitchApi.getYesterdaysTopClips(gameID, locale).then(clips => {
    return new Promise((resolve) => {
        let meta = [];

        for (let i = 0; i < clips.length; i++) {
            const link = clips[i].mediaURL;

            // output all video files
            let file = fs.createWriteStream(downloadedMediaDirectory + `/${i}.mp4`, {flags: 'w', encoding: 'utf-8'});
            https.get(link, response => {
                response.pipe(file);
                if (i === clips.length - 1) resolve();
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

}).then(() => {

    const currentMediaDirectory = mediaDirectory + '/' + currentTime;

    ffmpegApi.applyVideoFilters(
        currentMediaDirectory,
        currentNumber,
        persistentNumberPath,
        overlayFilters.videoCenteredText,
        overlayFilters.thumbnailSingleImageWithText
    ).then(outputPath => {

        console.log(outputPath);

        // TODO: upload video to YouTube via YouTube Data API

    }).catch(error => {
        throw error;
    });

}).catch(error => {
    console.error(error);
});
