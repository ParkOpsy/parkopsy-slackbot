/**
 * Created by nitseg1 on 3/27/2017.
 */

const User = require('./user');
const ParkingPlace = require('./parkingplace');

class Owner extends User {

    constructor(message, firstName, lastName, phoneNumber, parkingNumber) {
        super(message, firstName, lastName, phoneNumber);
        this.userType = 'OWNER';
        if (typeof parkingNumber !== 'undefined') {
            this.parkingPlace = new ParkingPlace(message.user, parkingNumber);
        }
    }

    get info() {
        return 'Your full name is '+this.fullName+'.\n' +
                'Your phone number is '+this.phoneNumber+'.\n'+
                'You own the parking place with '+this.parkingPlace.placeNumber+' number.\n' +
                'It is '+this.parkingPlace.placeStatus+' for today.\n'+
            (this.parkingPlace.placeTenant?
                     'Your tenant for today is '+this.parkingPlace.placeTenant.fullName+'.\n'+
                    +'You can contact him by mobile phone '+this.parkingPlace.placeTenant.phoneNumber + '.\n'
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