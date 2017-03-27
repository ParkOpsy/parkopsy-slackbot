/**
 * Created by nitseg1 on 3/27/2017.
 */

const ParkingPlace = require('./parkingplace');

/**
 * Class representing a Slack user
 * @class
 */
class User {
    /**
     * Create a user object
     * @constructs
     * @param {string} id - ID from a Slack message
     */
    constructor(id) {
        this.id = id;
    }

    /**
     * Get the parking place of the user
     * @return {ParkingPlace} A ParkingPlace object representing a parking place of the user
     */
    get parkingPlace() {
        return this.userParkingPlace;
    }

    /**
     * Set the full name for the user
     * @param {string} value - A string representing a full name of the user
     * @example
     * // set the user firstName to Ivan and lastName to Ivanov
     * user.fullName('Ivan Ivanov');
     * @return {void}
     */
    set fullName(value) {
    }

    /**
     * Get the full name of the user
     * @return {string} The full name of the user
     */
    get fullName() {
        return this.userFirstName + ' ' + this.userLastName;
    }

    /**
     * Set the phone number for the user
     * @param {string} value - A string representing the phone number of the user
     * @return {void}
     */
    set phone(value) {

    }

    /**
     * Get the contact phone number for the user
     * @return {string} The phone number of the user
     */
    get phone() {
        return this.userPhone;
    }

    /**
     * Set the email address for the user
     * @param {string} value - A string representing the email address of the user
     * @return {void}
     */
    set email(value) {

    }

    /**
     * Get the email address for the user
     * @return {string} The email address of the user
     */
    get email() {
        return this.userEmail;
    }

    /**
     * Create a parking place with the number for the user
     * @param {number} number - The parking place number
     * @return {void}
     */
    set parking(number) {
        this.userParkingPlace = new ParkingPlace(this.id, number);
    }

    /**
     * Get the parking place number of the user
     * @return {number} The number of the user parking place
     */
    get parking() {
        return this.userParkingPlace.number;
    }

    /**
     * Set the registration plate of the user car.
     * @param {string} value - A string containing a fragment of the registration plate
     * @example
     * // set the user car information to k123
     * user.car('k123');
     * @return {void}
     */
    set car(value) {

    }

    /**
     * Get the registration plate of the user car.
     * @return {string}
     */
    get car() {
        return this.userVenichle;
    }

    /**
     * Get prettified description of the user vacations.
     * @return {string}
     */
    get vacations() {

    }

    /**
     * Add a time period for the user vacations
     * @param period
     * @return {void}
     */
    addVacationsPeriod(period) {

    };

    /**
     * Remove all added vacations period of the user
     * @return {void}
     */
    clearVacations() {

    };
}

module.exports = User;