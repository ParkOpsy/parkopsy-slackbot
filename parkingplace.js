/**
 * Created by nitseg1 on 3/27/2017.
 */

const User = require('./user');
const Owner = require('./owner');
const Tenant = require('./tenant');

/**
 * Class representing a parking place
 * @class
 */
class ParkingPlace {

    /**
     * Create a parking place
     * @constructs
     * @param {Owner} owner - Place owner
     * @param {number} number - Number of the parking place
     */
    constructor(owner, number) {
        this.placeOwner = owner;
        this.placeNumber = number;
        this.placeStatus = 'BUSY';
        this.placeFreeDates = [];
        this.placeTenant = null;
    }

    /**
     * Get the parking places status for today or for the certain date
     * @param {Date} [date] - The date to check the parking place status
     * @return {boolean} - Returns true if the parking place is busy and false if it is free.
     */
    getStatus(date) {
        if (typeof date === 'undefined') {
            return this.placeStatus === 'BUSY';
        }
        else {

        }
    }
}

module.exports = ParkingPlace;