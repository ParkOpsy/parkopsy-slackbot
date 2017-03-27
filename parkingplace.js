/**
 * Created by nitseg1 on 3/27/2017.
 */

/**
 * Class representing a parking place
 * @class
 */
class ParkingPlace {

    /**
     * Create a parking place
     * @constructs
     * @param {string} id - Place owner id
     * @param {number} number - Number of the parking place
     */
    constructor(id, number) {
        this.placeOwner = id;
        this.placeNumber = number;
        this.placeStatus = 'BUSY';
        this.placeFreeDates = [];
    }

    /**
     * Get the parking place owner
     * @return {string} - User id of the parking place owner
     */
    get owner() {
        return this.placeOwner;
    }

    /**
     * Set the parking place tenant for today
     * @param {string} id - The tenant user id
     * @return {void}
     */
    set tenant(id) {
        this.placeTenant = id;
    }

    /**
     * Get the parking place tenant for today
     * @return {string} - User id of the parking place tenant
     */
    get tenant() {
        return this.placeTenant;
    }

    /**
     * Get the parking place number
     * @return {number} - The number of the parking place
     */
    get number() {
        return this.placeNumber;
    }

    /**
     * Get free dates of the parking place
     * @return {Array} - An array of the time periods when the parking place is free
     */
    get freeDates() {
        return this.placeFreeDates;
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