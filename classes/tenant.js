/**
 * Created by nitseg1 on 3/27/2017.
 */

const User = require('./user');

class Tenant extends User {

    constructor(message, firstName, lastName, phoneNumber) {
        super(message, firstName, lastName, phoneNumber);
        this.userType = 'TENANT';
    }

    get info() {
        return 'Your full name is '+this.fullName+'.\n' +
                'Your phone number is '+this.phoneNumber+'.\n';
    }

    static fromJSON(data) {
        let userInstance = new Tenant;

        for (let prop in data) {
            userInstance[prop] = data[prop];
        }
        return userInstance;
    }
}

module.exports = Tenant;