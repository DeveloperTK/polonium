const ffmpeg = require('fluent-ffmpeg');
const ffprobe = ffmpeg.ffprobe;
const fs = require('fs');

function progressWrite(x) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(x);
}

async function applyVideoFilters(mediaDirectory) {
    const metaList = JSON.parse(fs.readFileSync(mediaDirectory + '/downloaded/meta.json').toString());

    for (let i = 0; i < 2; i++) {
        await new Promise((resolve, reject) => {
            process.stdout.write("loading ffmpeg...");
            ffmpeg(mediaDirectory + '/downloaded/' + metaList[i].filename).videoFilters(
                {
                    filter: 'drawtext',
                    options: {
                        text: metaList[i].channel,
                        fontfile: __dirname + '/OpenSans-SemiBold.ttf',
                        fontsize: 20,
                        fontcolor: 'white',
                        x: '(w-text_w)/2',
                        y: 75,
                        box: 1,
                        boxborderw: 18,
                        boxcolor: 'black@0.6'
                    }
                }
            ).on('progress', progress => {
                progressWrite(`Applying video filters to file ${i + 1}/${metaList.length} (${Math.floor(progress.percent)}%)`);
            }).on('error', error => {
                reject(error);
            }).on('end', () => {
                progressWrite(`Done applying video filters to file '${metaList[i].filename}'.\n`);
                resolve();
            }).save(mediaDirectory + '/generated/' + metaList[i].filename);
        }).catch(error => {
            console.error(error);
        });
    }

    const finalResult = ffmpeg(mediaDirectory + '/generated/' + metaList[0].filename);

    for (let i = 1; i < 2; i++) {
        finalResult.mergeAdd(mediaDirectory + '/generated/' + metaList[i].filename);
    }

    await new Promise((resolve, reject) => {
        finalResult.on('progress', progress => {
            progressWrite(`Merging files into 'generatedResult.mp4'... (${Math.floor(progress.percent)}%)`);
        }).on('error', error => {
            reject(error);
        }).on('end', () => {
            progressWrite(`Done merging. Output File: 'generatedResult.mp4'.\n`);
            resolve();
        }).save(mediaDirectory + '/result/generatedResult.mp4');
    }).catch(error => {
        console.error(error);
    });

    let videoDescription = `Beispiel Beschreibung\n\n\n`;
    let currentDuration = 0;

    for (let i = 0; i < 2; i++) {
        ffprobe(mediaDirectory + '/generated/' + metaList[i].filename, (error, probeMeta) => {
            if(error) throw error;
            currentDuration += probeMeta.format.duration;
            const position = new Date(currentDuration * 1000).toISOString().substr(11, 8).replaceAll('-', ':')
            videoDescription += `${position} by ${metaList[i].channel}: ${metaList[i].link}`
        });
    }

    console.log(videoDescription);
}

exports.applyVideoFilters = applyVideoFilters;

applyVideoFilters(__dirname + '/../media/2021-01-29T15-15-08.630Z');