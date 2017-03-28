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


    constructor(ownerID, placeNumber) {
        if (typeof ownerID !== 'undefined' && typeof placeNumber !== 'undefined') {
            this.placeOwner = ownerID;
            this.placeNumber = placeNumber;
            this.placeStatus = 'BUSY';
            this.placeFreeDates = [];
        }
    }


    static fromJSON(data) {
        let parkingPlaceInstance = new ParkingPlace;

        for (let prop in data) {
            if (prop === 'placeTenant') {
                parkingPlaceInstance[prop] = Tenant.fromJSON(data[prop]);
            }
            else {
                parkingPlaceInstance[prop] = data[prop];
            }
        }

        return parkingPlaceInstance;
    }
}

module.exports = ParkingPlace;