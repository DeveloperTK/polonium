const ffmpeg = require('fluent-ffmpeg');
const ffprobe = ffmpeg.ffprobe;
const { exec } = require("child_process");
const fs = require('fs');

function progressWrite(x) {
    process.stdout.clearLine(undefined, undefined);
    process.stdout.cursorTo(0);
    process.stdout.write(x);
}

async function applyVideoFilters(mediaDirectory, lastVideoNumber) {
    return new Promise(async (globalResolve, globalReject) => {

        const metaList = JSON.parse(fs.readFileSync(mediaDirectory + '/downloaded/meta.json').toString());

        for (let i = 0; i < metaList.length; i++) {
            await new Promise((resolve, reject) => {
                process.stdout.write("loading ffmpeg...");
                ffmpeg(mediaDirectory + '/downloaded/' + metaList[i].filename).videoFilters(
                    {
                        filter: 'drawtext',
                        options: {
                            text: metaList[i].channel,
                            fontfile: __dirname + '/OpenSans-SemiBold.ttf',
                            fontsize: 48,
                            fontcolor: 'white',
                            x: '(w-text_w)/2',
                            y: 75,
                            box: 1,
                            boxborderw: 18,
                            boxcolor: 'black@0.6'
                        }
                    }
                ).addOption("-qscale 0")
                  .on('progress', progress => {
                    progressWrite(`Applying video filters to file ${i + 1}/${metaList.length} (${Math.floor(progress.percent)}%)`);
                }).on('error', error => {
                    reject(error);
                }).on('end', () => {
                    progressWrite(`Done applying video filters to file ${metaList[i].filename}.ts\n`);
                    resolve();
                }).save(mediaDirectory + '/generated/' + metaList[i].filename + '.ts');
            }).catch(error => {
                globalReject(error);
            });
        }

        let mergeFile = "";

        for (let i = 0; i < metaList.length; i++) {
            mergeFile += `file '${metaList[i].filename}.ts'\n`;
        }

        fs.writeFileSync(mediaDirectory + '/generated/mergelist.txt', mergeFile);

        exec(`cd ${mediaDirectory}/generated; ffmpeg -f concat -safe 0 -i mergelist.txt -c copy result.ts`, (error, stdout, stderr) => {
            if(error) throw error;
            process.stdout.write(stdout);
            process.stderr.write(stderr);
        });

        let videoDescription = `Top Twitch Compilation #${lastVideoNumber + 1}
If you liked this video, please make sure to check out the original creators as well.
They are listed in order of appearance below.\n\n`;
        let currentDuration = 0;

        for (let i = 0; i < metaList.length; i++) {
            await new Promise(((resolve, reject) => {
                ffprobe(mediaDirectory + '/generated/' + metaList[i].filename + '.ts', async (error, probeMeta) => {
                    if(error) throw reject(error);
                    const position = new Date(currentDuration * 1000).toISOString().substr(14, 5)
                        .replace('-', ':').replace('-', ':');
                    videoDescription += `${position} ${metaList[i].channel}: ${metaList[i].link}\n`
                    currentDuration += probeMeta.format.duration;
                    resolve();
                });
            }));
        }

        fs.writeFileSync(mediaDirectory + '/generated/description.txt', videoDescription, {encoding: 'utf8'});

        // TODO: generate video thumbnail

        globalResolve(mediaDirectory + '/generated');
    });
}

exports.applyVideoFilters = applyVideoFilters;
