const ffmpeg = require('fluent-ffmpeg');
const { exec } = require("child_process");
const fs = require('fs');

// hardcoded for now...
const introLength = 7;
const outroLength = 20;

class FFmpegApi {

    constructor(introPath, outroPath) {
        this.introPath = introPath;
        this.outroPath = outroPath;
    }

    progressWrite(x) {
        process.stdout.clearLine(undefined, undefined);
        process.stdout.cursorTo(0);
        process.stdout.write(x);
    }

    _mergeVideos(mediaDirectory) {
        return new Promise((resolve, reject) => {
            const mergeCommand = `cd ${mediaDirectory}/generated; ffmpeg -f concat -safe 0 -i mergelist.txt -c copy result.ts`;
            const mergeProcess = exec(mergeCommand);

            mergeProcess.stdin.on('data', process.stdin.write);
            mergeProcess.stdout.on('data', process.stdout.write);
            mergeProcess.stderr.on('data', process.stderr.write);

            mergeProcess.on('close', resolve);
            mergeProcess.on('error', reject);
        });
    }

    async _generateDescriptionFile(mediaDirectory, metaList, lastVideoNumber) {
        let videoDescription = `Top Twitch Compilation #${lastVideoNumber + 1}
If you liked this video, please make sure to check out the original creators as well.
They are listed in order of appearance below.\n\n`;
        let currentDuration = introLength;

        for (let i = 0; i < metaList.length; i++) {
            await new Promise(((resolve, reject) => {
                ffmpeg.ffprobe(mediaDirectory + '/generated/' + metaList[i].filename + '.ts', async (error, probeMeta) => {
                    if (error) throw reject(error);
                    const position = new Date(currentDuration * 1000).toISOString().substr(14, 5)
                        .replace('-', ':').replace('-', ':');
                    videoDescription += `${position} ${metaList[i].channel}: ${metaList[i].link}\n`
                    currentDuration += probeMeta.format.duration;
                    resolve();
                });
            }));
        }

        try {
            fs.writeFileSync(__dirname + '/../video-number.txt', lastVideoNumber + 1, {encoding: 'utf-8'});
        } catch (err) {
            console.error(err);
        }

        fs.writeFileSync(mediaDirectory + '/generated/description.txt', videoDescription, {encoding: 'utf8'});
    }

    /**
     * 
     *
     * @param mediaDirectory
     * @param lastVideoNumber
     * @returns {Promise<void>}
     * @private
     */
    async _generateVideoThumbnail(mediaDirectory, lastVideoNumber) {
        // TODO: generate video thumbnail
    }

    /**
     * Applies video filters to all videos in a directory (determined by the meta.json file).
     *
     * @param mediaDirectory{String | URL}
     * @param lastVideoNumber{Number}
     * @param persistentNumberPath{String | URL}
     * @param applyFilter{Function<String, String, Object, Number> | any}
     * @param thumbnailStyle{Function<String, Object[], Number> | any}
     * @returns {Promise<String>}
     */
    applyVideoFilters(mediaDirectory, lastVideoNumber, persistentNumberPath, applyFilter, thumbnailStyle, intermediatePath) {
        return new Promise(async (resolve, reject) => {

            const metaListPath = mediaDirectory + '/downloaded/meta.json';
            const metaList = JSON.parse(fs.readFileSync(metaListPath).toString());

            for (let i = 0; i < metaList.length; i++) {
                const inputPath = mediaDirectory + '/downloaded/' + metaList[i].filename;
                const outputPath = mediaDirectory + '/generated/' + metaList[i].filename + '.ts'

                await applyFilter(this.progressWrite, inputPath, outputPath, metaList, i).catch(reason => {
                    reject(reason);
                });

            }

            let mergeList = "";

            if (this.introPath) {
                fs.copyFileSync(this.introPath, mediaDirectory + '/generated/intro.ts');
                mergeList += `file 'intro.ts'\n`;
            }

            mergeList += `file '${metaList[0].filename}.ts'\n`;

            for (let i = 1; i < metaList.length; i++) {
                // TODO: implement intermediates
                // mergeList += `file '${intermediatePath}'\n`;
                mergeList += `file '${metaList[i].filename}.ts'\n`;
            }

            if (this.outroPath) {
                fs.copyFileSync(this.outroPath, mediaDirectory + '/generated/outro.ts');
                mergeList += `file 'outro.ts'\n`;
            }

            const mergeListPath = mediaDirectory + '/generated/mergelist.txt'
            fs.writeFileSync(mergeListPath, mergeList);

            await this._mergeVideos(mediaDirectory);

            await this._generateDescriptionFile(mediaDirectory, metaList, lastVideoNumber);

            await thumbnailStyle(mediaDirectory, metaList, lastVideoNumber);

            resolve(mediaDirectory + '/generated');
        });
    }
}

module.exports.class = FFmpegApi;
