const axios = require('axios');

//import axios from 'axios';

class TwitchApi {

    constructor(clientID, clientSecret) {
        this.clientID = clientID;
        this.clientSecret = clientSecret;

        // base twitch api url
        axios.defaults.baseURL = 'https://api.twitch.tv/helix';
    }

    clearDaytime(date) {
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
    }

    filterData(data, locale) {
        let resultClips = [];
        for (const clip of data) {
            if(clip['language'].toLowerCase() === locale) {
                resultClips.push(clip);
            }
        }
        return resultClips;
    }

    getYesterdaysTopClips(gameID, locale) {
        return new Promise((resolve, reject) => {
            const today = new Date();
            this.clearDaytime(today);

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            this.clearDaytime(yesterday);

            console.log("authenticating...");

            axios({
                method: 'POST',
                url: `https://id.twitch.tv/oauth2/token?client_id=${this.clientID}&client_secret=${this.clientSecret}&grant_type=client_credentials`
            }).then(response => {
                console.log(`access_token: ${response.data['access_token']}`);
                axios.defaults.headers.common = {
                    'Authorization': `Bearer ${response.data['access_token']}`,
                    'Client-Id': this.clientID
                }

                return axios.request({
                    method: 'GET',
                    url: `/clips?first=100&game_id=${gameID}&started_at=${yesterday.toISOString()}`,
                });
            }).then(response => {
                console.log(`received ${response.data['data'].length} clips`);

                const resultClips = this.filterData(response.data['data'], locale);

                console.log(`of which ${resultClips.length} are of ${locale} locale`);

                const mediaLinks = [];

                for (let i = 0; i < Math.min(15, resultClips.length); i++) {
                    mediaLinks.push({
                        mediaURL: resultClips[i]['thumbnail_url'].replace('-preview-480x272.jpg', '.mp4'),
                        meta: resultClips[i]
                    });
                }

                resolve(mediaLinks);
            }).catch(error => {
                reject(error);
            });
        });
    }
}

module.exports.class = TwitchApi;
