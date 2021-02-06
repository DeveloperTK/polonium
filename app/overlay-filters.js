const ffmpeg = require('fluent-ffmpeg');

class OverlayFilters {

    constructor() {
    }

    videoCenteredText(progressWrite, inputPath, outputPath, metaList, index) {
        return new Promise((resolve, reject) => {
            process.stdout.write("loading ffmpeg...");
            ffmpeg(inputPath).videoFilters(
                {
                    filter: 'drawtext',
                    options: {
                        text: metaList[index].channel,
                        fontfile: __dirname + '/OpenSans-SemiBold.ttf',
                        fontsize: 56,
                        fontcolor: 'white',
                        x: '(w-text_w)/2',
                        y: 75,
                        box: 1,
                        boxborderw: 12,
                        boxcolor: 'black@0.85'
                    }
                }
            ).addOption("-qscale 0")
                .on('progress', progress => {
                    progressWrite(`Applying video filters to file ${index + 1}/${metaList.length} (${Math.floor(progress.percent)}%)`);
                }).on('error', error => {
                reject(error);
            }).on('end', () => {
                progressWrite(`Done applying video filters to file ${metaList[index].filename}.ts\n`);
                resolve();
            }).save(outputPath);
        });
    }

    thumbnailSingleImageWithText(mediaDirectory, metaList, lastVideoNumber) {

    }

}

module.exports.class = OverlayFilters;
