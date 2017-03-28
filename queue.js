/**
 * Created by nitseg1 on 3/28/2017.
 */

const Tenant = require('./tenant');

class Queue {
    constructor(message, tenant) {
        if(typeof message !== 'undefined') {
            this.id = message.team;
            if (typeof tenant !== 'undefined') {
                this.tenants = [tenant];
            }
        }
    }

    static fromJSON(data) {
        let queueInstance = new Queue;

        if (typeof data.id !== 'undefined' && typeof data.tenants !== 'undefined') {
            queueInstance.id = data.id;
            queueInstance.tenants = [];

            for (let tenant of data.tenants) {
                queueInstance.tenants.push(Tenant.fromJSON(tenant));
            }
        }

        return queueInstance;
    }
}

module.exports = Queue;