/**
 * Created by nitseg1 on 3/27/2017.
 */

/**
 * Class representing a Slack user
 * @class
 */
class User {

    constructor(message, firstName, lastName, phoneNumber) {
        if (typeof message !== 'undefined') {
            this.id = message.user;
            this.reference = message;
            this.firstName = firstName;
            this.lastName = lastName;
            this.phoneNumber = phoneNumber;
        }
    }

    get fullName() {
        return this.firstName + ' ' + this.lastName;
    }

    /**
     *
     * @param data
     * @return {User}
     */
    static fromJSON(data) {
        let userInstance = new User;

        for (let prop in data) {
            userInstance[prop] = data[prop];
        }
        return userInstance;
    }
}

module.exports = User;