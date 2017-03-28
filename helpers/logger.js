/**
 * Created by nitseg1 on 3/28/2017.
 */

const moment = require('moment');

/**
 * Write a log to file system
 * @param controller - Running Slackbot instances
 * @param {string} location - where the logger was called
 * @param [error] - what happened
 * @param [message] - any comments
 * @param [sample] - any sample data
 */
const log = function (controller, location, error, message, sample) {
    if (typeof controller !== 'undefined' &&
        typeof location !== 'undefined') {
        const log = new Log(location, error, message, sample);
        controller.storage.channels.save(log);
    }
};

class Log {
    constructor(location, error, message, data) {
        const timestamp = moment().format("DMMMYYkmsx");
        if (location) {
            this.id = location+timestamp;
        }
        if (error) {
            this.error = error;
        }
        if (message) {
            this.message = message;
        }
        if (data) {
            this.data = data;
        }
        this.timestamp = timestamp;
    }
}

module.exports = log;