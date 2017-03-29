/**
 * Created by nitseg1 on 3/27/2017.
 */

const User = require('./user');
const ParkingPlace = require('./parkingplace');

const moment = require('moment');
require('twix');

class Owner extends User {

    constructor(message, firstName, lastName, phoneNumber, parkingNumber) {
        super(message, firstName, lastName, phoneNumber);
        this.userType = 'OWNER';
        if (typeof parkingNumber !== 'undefined') {
            this.parkingPlace = new ParkingPlace(message.user, parkingNumber);
        }
    }

    get info() {
        return 'Your full name is ' + this.fullName + '.\n' +
            'Your phone number is ' + this.phoneNumber + '.\n' +
            'You own the parking place with ' + this.parkingPlace.placeNumber + ' number.\n' +
            'It is ' + this.parkingPlace.placeStatus + ' for today.\n\n' +
            ((this.parkingPlace && this.parkingPlace.placeTenant)?
                'Your tenant for today is ' + this.parkingPlace.placeTenant.firstName + ' '+ this.parkingPlace.placeTenant.lastName + '.\n' +
                + this.parkingPlace.placeTenant.phoneNumber + ' - you can contact him with mobile phone.\n'
                :
                '') +
            ((this.parkingPlace && this.parkingPlace.placeFreeDates && this.parkingPlace.placeFreeDates.length > 0)?
                'You have vacations:\n' + ((dates) => {
                    if (dates) {
                        let result = '';
                        for (let i in dates) {
                            if (dates[i] &&
                                dates[i].hasOwnProperty('_oStart') &&
                                dates[i].hasOwnProperty('_oEnd')) {
                                result = result + (+i + 1) + moment.twix(dates[i]._oStart, dates[i]._oEnd).format({hideTime: true}) + '\n';
                            }
                        }
                        return result;
                    }
                    else {
                        return '_Sorry, an error occured while printing your vacation periods._';
                    }
                })(this.parkingPlace.placeFreeDates)
                :
                '');
    }

    /**
     * Create a parking place with the number for the user
     * @param {number} number - The parking place number
     * @return {void}
     */
    set parking(number) {
        this.userParkingPlace = new ParkingPlace(this.id, number);
    }

    static fromJSON(data) {
        let userInstance = new Owner;

        for (let prop in data) {
            if (prop === 'parkingPlace') {
                userInstance[prop] = ParkingPlace.fromJSON(data[prop]);
            }
            else {
                userInstance[prop] = data[prop];
            }
        }
        return userInstance;
    }
}

module.exports = Owner;