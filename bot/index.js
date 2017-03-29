const User = require('./../classes/user');
const Owner = require('./../classes/owner');
const Tenant = require('./../classes/tenant');
const Queue = require('./../classes/queue');
const ParkingPlace = require('./../classes/parkingplace');
const logger = require('./../helpers/logger');

const schedule = require("node-schedule");
const moment = require('moment');
require('twix');

const Botkit = require('botkit');
const os = require('os');

const controller = Botkit.slackbot({
    debug: true,
    json_file_store: './lib/storage/data'
});

controller.spawn({
    token: process.env.TOKEN,
    retry: 'Infinity',
    stale_connection_timeout: 1000
}).startRTM();

schedule.scheduleJob('1 0 * * *', () => {
    logger(controller,
        'scheduledJob',
        null,
        'scheduleJob was triggered');
    controller.storage.users.all((err, data) => {
        if (err) {
            logger(controller,
                'scheduledJob',
                err,
                'when getting all user data from storage');
        }
        else {
            if (typeof data === 'undefined' || data.length === 0) {
                logger(controller,
                    'scheduledJob',
                    'no user data in the system',
                    'when getting all user data from storage',
                    data);
            }
            else {
                for (let index in data) {
                    if (data.hasOwnProperty(index) &&
                        data[index].hasOwnProperty('userType') &&
                        data[index].userType === 'OWNER') {
                        let owner = Owner.fromJSON(data[index]);

                        // Remove the owner parking place tenant in any awy
                        delete owner.parkingPlace.placeTenant;
                        // Set the owner parking place status to BUSY.
                        owner.parkingPlace.placeStatus = 'BUSY';

                        // Validate if current day is a day of the owner vacations
                        for (let i in owner.parkingPlace.placeFreeDates) {
                            // Check if the data has twix format
                            if (owner.parkingPlace.placeFreeDates[i] &&
                                owner.parkingPlace.placeFreeDates[i].hasOwnProperty('_oStart') &&
                                owner.parkingPlace.placeFreeDates[i].hasOwnProperty('_oEnd')) {
                                // Create a twix object from the data
                                const vacationPeriod = moment.twix(owner.parkingPlace.placeFreeDates[i]._oStart, owner.parkingPlace.placeFreeDates[i]._oEnd);
                                // Check if the twix ends in the past
                                if (vacationPeriod.isPast()) {
                                    // Remove the past vacation period
                                    owner.parkingPlace.placeFreeDates.splice(i, 1);
                                }
                                else {
                                    // Check if today is in the vacation period
                                    if (vacationPeriod.isCurrent()) {
                                        // Set the owner parking place status to FREE
                                        owner.parkingPlace.placeStatus = 'FREE';
                                        break;
                                    }
                                }
                            }
                        }

                        controller.storage.users.save(owner, (err, id) => {
                            if (err) {
                                logger(controller,
                                    'scheduledJob',
                                    err,
                                    'when saving owner data to storage',
                                    owner);
                            }
                            else {
                                logger(controller,
                                    'scheduledJob',
                                    null,
                                    'owner data was successfully updated',
                                    owner);
                            }
                        })
                    }
                }
            }
        }
    });

    controller.storage.teams.all((err, data) => {
        if (err) {
            logger(controller,
                'scheduledJob',
                err,
                'when getting all team data from the storage');
        }
        else {
            if (typeof data === 'undefined' || data.length === 0) {
                logger(controller,
                    'scheduledJob',
                    'no team data in the system',
                    'when getting all user data from the storage',
                    data);
            }
            else {
                if (data.length > 1) {
                    logger(controller,
                        'scheduledJob',
                        'team data contains more than 1 json',
                        'when getting all user data from the storage',
                        data);
                }
                else {
                    let queue = Queue.fromJSON(data[0]);

                    queue.tenants = [];

                    controller.storage.teams.save(queue, (err, id) => {
                        if (err) {
                            logger(controller,
                                'scheduledJob',
                                err,
                                'when saving team data to the storage',
                                queue);
                        }
                        else {
                            logger(controller,
                                'scheduledJob',
                                null,
                                'tenants queue was successfully updated',
                                queue);
                        }
                    });
                }
            }
        }
    });
});

controller.hears(['sign me up'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.startConversation(message, (err, convo) => {
                    convo.say('Hello there! Remember, you can stop the conversion with *exit* message.');
                    convo.ask('What is your first name?', [
                        {
                            pattern: 'exit',
                            callback: (response, convo) => {
                                convo.say('OK, maybe next time!');
                                convo.next();
                            }
                        },
                        {
                            pattern: '^[a-zA-Z]+$',
                            callback: (response, convo) => {
                                let firstName = response.match[0];
                                convo.ask('Got you, ' + firstName + '! What is your last name?', [
                                    {
                                        pattern: 'exit',
                                        callback: (response, convo) => {
                                            convo.say('OK, maybe next time!');
                                            convo.next();
                                        }
                                    },
                                    {
                                        pattern: '^[a-zA-Z]+$',
                                        callback: (response, convo) => {
                                            let lastName = response.match[0];
                                            convo.ask('Prettiest name I have ever heard! Tell me your phone number, please. (_89xxxxxxxxx_)', [
                                                {
                                                    pattern: '89[0-9]{9}',
                                                    callback: (response, convo) => {
                                                        let phoneNumber = response.match[0];
                                                        convo.ask('Thank you! So are you a parking place owner or a tenant? (_owner_/_tenant_)', [
                                                            {
                                                                pattern: 'owner',
                                                                callback: (response, convo) => {
                                                                    convo.ask('Okey then. What is your parking place number?', [
                                                                        {
                                                                            pattern: '[0-9]+',
                                                                            callback: (response, convo) => {
                                                                                let owner = new Owner(message, firstName, lastName, phoneNumber, +response.match[0]);
                                                                                controller.storage.users.save(owner, (err) => {
                                                                                    if (!err) {
                                                                                        convo.say('OK, nice to meet you, ' + owner.firstName + '!\n' +
                                                                                            'Your account was created.');
                                                                                        convo.next();
                                                                                    }
                                                                                    else {
                                                                                        convo.say('Opps, something goes wrong! Try again.\n' +
                                                                                            'No data was saved so use *sign me up* command once again.');
                                                                                        convo.next();
                                                                                    }
                                                                                });
                                                                                convo.next();
                                                                            }
                                                                        },
                                                                        {
                                                                            pattern: 'exit',
                                                                            callback: (response, convo) => {
                                                                                convo.say('OK, maybe next time!');
                                                                                convo.next();
                                                                            }
                                                                        },
                                                                        {
                                                                            default: true,
                                                                            callback: (response, convo) => {
                                                                                convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                                                                convo.repeat();
                                                                                convo.next();
                                                                            }
                                                                        }
                                                                    ]);
                                                                    convo.next();
                                                                }
                                                            },
                                                            {
                                                                pattern: 'tenant',
                                                                callback: (response, convo) => {
                                                                    let tenant = new Tenant(message, firstName, lastName, phoneNumber);
                                                                    controller.storage.users.save(tenant, (err) => {
                                                                        if (!err) {
                                                                            convo.say('OK, nice to meet you, ' + tenant.firstName + '!\n' +
                                                                                'Your account was created.');
                                                                            convo.next();
                                                                        }
                                                                        else {
                                                                            convo.say('Opps, something goes wrong! Try again.\n' +
                                                                                'No data was saved so use *sign me up* command once again.');
                                                                            convo.next();
                                                                        }
                                                                    });
                                                                    convo.next();
                                                                }
                                                            },
                                                            {
                                                                pattern: 'exit',
                                                                callback: (response, convo) => {
                                                                    convo.say('OK, maybe next time!');
                                                                    convo.next();
                                                                }
                                                            },
                                                            {
                                                                default: true,
                                                                callback: (response, convo) => {
                                                                    convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                                                    convo.repeat();
                                                                    convo.next();
                                                                }
                                                            }
                                                        ]);
                                                        convo.next();
                                                    }
                                                },
                                                {
                                                    pattern: 'exit',
                                                    callback: (response, convo) => {
                                                        convo.say('OK, maybe next time!');
                                                        convo.next();
                                                    }
                                                },
                                                {
                                                    default: true,
                                                    callback: (response, convo) => {
                                                        convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                                        convo.repeat();
                                                        convo.next();
                                                    }
                                                }
                                            ]);
                                            convo.next();
                                        }
                                    },
                                    {
                                        default: true,
                                        callback: (response, convo) => {
                                            convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }
                                ]);
                                convo.next();
                            }
                        },
                        {
                            default: true,
                            callback: (response, convo) => {
                                convo.say('Sorry, I did not understand you.');
                                convo.repeat();
                                convo.next();
                            }
                        }
                    ]);
                });
            }
            else {
                let user = User.fromJSON(data);
                bot.reply(message,
                    'We have found your account, ' + user.fullName + '.\n' +
                    'If you want to update your account, use *update me* command.\n' +
                    'If you want to remove your account, use *remove account* command.');
            }

        });
    });

controller.hears(['update me'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'We have not found your account.\n' +
                    'If you want to create an account, use *sign me up* command.\n');
            }
            else {
                bot.startConversation(message, (err, convo) => {
                    convo.ask('Okey, ' + data.firstName + '. What do you want to update? (_name_, _phone_, _place_, _vacations_)', [
                        {
                            pattern: 'name',
                            callback: (response, convo) => {
                                convo.ask('What is your full name then? (example: Ivan Ivanov)', [

                                    {
                                        pattern: 'exit',
                                        callback: (response, convo) => {
                                            convo.say('OK, maybe next time!');
                                            convo.next();
                                        }
                                    },
                                    {
                                        pattern: '[a-zA-Z]+ [a-zA-Z]+',
                                        callback: (response, convo) => {
                                            [data.firstName, data.lastName] = response.match[0].split(' ');
                                            controller.storage.users.save(data, (err) => {
                                                if (err) {
                                                    bot.reply(message,
                                                        'Opps, something goes wrong! Try again.\n' +
                                                        'No data was saved so use *update me* command once again.');

                                                    logger(controller,
                                                        'updateMe',
                                                        err,
                                                        'when saving user data to the storage (updating name)',
                                                        data);
                                                }
                                                else {
                                                    bot.reply(message,
                                                        'Your name was updated successfully.');
                                                }
                                            });
                                            convo.next();
                                        }
                                    },
                                    {
                                        default: true,
                                        callback: (response, convo) => {
                                            convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }
                                ]);
                                convo.next();
                            }
                        },
                        {
                            pattern: 'phone',
                            callback: (response, convo) => {
                                convo.ask('Okey, ' + data.firstName + '. What is you phone number then? (_89xxxxxxxxx_)', [
                                    {
                                        pattern: '89[0-9]{9}',
                                        callback: (response, convo) => {
                                            data.phoneNumber = response.match[0];
                                            controller.storage.users.save(data, (err) => {
                                                if (err) {
                                                    bot.reply(message,
                                                        'Opps, something goes wrong! Try again.\n' +
                                                        'No data was saved so use *update me* command once again.');
                                                    logger(controller,
                                                        'updateMe',
                                                        err,
                                                        'when saving user data to the storage (updating phone)',
                                                        data);
                                                }
                                                else {
                                                    bot.reply(message,
                                                        'Your contact phone number was updated successfully.');
                                                }
                                            });
                                            convo.next();
                                        }
                                    },
                                    {
                                        pattern: 'exit',
                                        callback: (response, convo) => {
                                            convo.say('OK, maybe next time!');
                                            convo.next();
                                        }
                                    },
                                    {
                                        default: true,
                                        callback: (response, convo) => {
                                            convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }
                                ]);
                                convo.next();
                            }
                        },
                        {
                            pattern: 'place',
                            callback: (response, convo) => {
                                if (data.userType === 'OWNER') {
                                    convo.ask('Allright, ' + data.firstName + '! What is your parking place number then?', [
                                        {
                                            pattern: '[0-9]+',
                                            callback: (response, convo) => {
                                                let owner = Owner.fromJSON(data);
                                                owner.parking = +response.match[0];
                                                controller.storage.users.save(owner, (err) => {
                                                    if (err) {
                                                        bot.reply(message,
                                                            'Opps, something goes wrong! Try again.\n' +
                                                            'No data was saved so use *update me* command once again.');
                                                        logger(controller,
                                                            'updateMe',
                                                            err,
                                                            'when saving user data to the storage (updating parking place)',
                                                            owner);
                                                    }
                                                    else {
                                                        bot.reply(message,
                                                            'You parking place number was updated successfully.');
                                                    }
                                                });
                                                convo.next();
                                            }
                                        },
                                        {
                                            pattern: 'exit',
                                            callback: (response, convo) => {
                                                convo.say('OK, maybe next time!');
                                                convo.next();
                                            }
                                        },
                                        {
                                            default: true,
                                            callback: (response, convo) => {
                                                convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                                convo.repeat();
                                                convo.next();
                                            }
                                        }
                                    ]);
                                    convo.next();
                                }
                                else {
                                    convo.say('Sorry, ' + data.firstName + ', but you have a tenant account and do not have parking place.\n' +
                                        'Remove you account with *remove account* command and try to create another type of account with *sign me up* command.');
                                    convo.next();
                                }
                            }
                        },
                        {
                            pattern: 'vacations',
                            callback: (response, convo) => {
                                if (data.userType === 'OWNER') {
                                    let owner = Owner.fromJSON(data);
                                    if (owner.parkingPlace.placeFreeDates.length === 0) {
                                        convo.say('You do not have vacation periods, ' + owner.firstName + '!\n' +
                                            'You can plan your vacations using *vacations [start date] [end date]* command.\n' +
                                            'Example: _vacations 2017-03-28 2017-04-05_. Have a try!');
                                        convo.next();
                                    }
                                    else {
                                        convo.say('Here is the list of your vacations, ' + owner.firstName + ':\n' +
                                            ((dates) => {
                                                if (dates) {
                                                    let result = '';
                                                    for (let i in dates) {
                                                        if (dates[i] &&
                                                            dates[i].hasOwnProperty('_oStart') &&
                                                            dates[i].hasOwnProperty('_oEnd')) {
                                                            result = result + (+i + 1) + '. ' + moment.twix(dates[i]._oStart, dates[i]._oEnd).format({hideTime: true}) + '\n';
                                                        }
                                                    }
                                                    return result;
                                                }
                                                else {
                                                    return '_Sorry, an error occured while printing your vacation periods._';
                                                }
                                            })(owner.parkingPlace.placeFreeDates));

                                        convo.ask('Which period do you want to remove? (_index of the period_, _all_)', [
                                            {
                                                pattern: '[0-9]+',
                                                callback: (response, convo) => {
                                                   const index = +response.match[0] - 1;

                                                   if (owner.parkingPlace.placeFreeDates.hasOwnProperty(index)) {
                                                       owner.parkingPlace.placeFreeDates.splice(index, 1);

                                                       controller.storage.users.save(owner, (err) => {
                                                          if (err) {
                                                              convo.say('Opps! I could not save changes. Try again later.');
                                                              convo.next();
                                                              logger(controller,
                                                                'updateme',
                                                                err,
                                                                'when saving owner data (updating vacations)',
                                                                owner);
                                                          }
                                                          else {
                                                              convo.say('OK, '+owner.firstName+', I have deleted this period.');
                                                              convo.next();
                                                          }
                                                       });
                                                   }
                                                   else {
                                                       convo.say('Sorry,'+owner.firstName+', but I could not find vacations with that index.\n'+
                                                                 'You can try again or stop the conversation with *exit* command.');
                                                       convo.repeat();
                                                       convo.next();
                                                   }
                                                }
                                            },
                                            {
                                                pattern: 'all',
                                                callback: (response, convo) => {
                                                    owner.parkingPlace.placeFreeDates = [];

                                                    controller.storage.users.save(owner, (err) => {
                                                        if (err) {
                                                            convo.say('Opps! I could not save changes. Try again later.');
                                                            convo.next();
                                                            logger(controller,
                                                                'updateme',
                                                                err,
                                                                'when saving owner data (updating vacations)',
                                                                owner);
                                                        }
                                                        else {
                                                            convo.say('OK, '+owner.firstName+', I have removed all your vacations information.\n'+
                                                                      'Try not to be so workaholic. Take a rest!');
                                                            convo.next();
                                                        }
                                                    });
                                                }
                                            },
                                            {
                                                pattern: 'exit',
                                                callback: (response, convo) => {
                                                    convo.say('OK, maybe next time!');
                                                    convo.next();
                                                }
                                            },
                                            {
                                                default: true,
                                                callback: (response, convo) => {
                                                    convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                                    convo.repeat();
                                                    convo.next();
                                                }
                                            }
                                        ]);
                                        convo.next();
                                    }
                                }
                                else {
                                    convo.say('Sorry, ' + data.firstName + ', but you have a tenant account and do not have vacations.\n' +
                                        'Remove you account with *remove account* command and try to create another type of account with *sign me up* command.');
                                    convo.next();
                                }
                            }
                        },
                        {
                            pattern: 'exit',
                            callback: (response, convo) => {
                                convo.say('OK, maybe next time!');
                                convo.next();
                            }
                        },
                        {
                            default: true,
                            callback: (response, convo) => {
                                convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                convo.repeat();
                                convo.next();
                            }
                        }
                    ])
                });
            }

        });
    });

controller.hears(['remove account'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'You do not have an account.\n' +
                    'Use *sign me up* command.');
            }
            else {
                controller.storage.users.delete(data, (err) => {
                    if (!err) {
                        bot.reply(message, 'All your user information was removed.');
                    }
                    else {
                        bot.reply(message,
                            'Opps, something goes wrong! Try again.\n' +
                            'No data was saved so use *update me* command once again.');
                        logger(controller,
                            'removeAccount',
                            err,
                            'when deleting user data from the storage',
                            data);
                    }
                });
            }
        });
    });

controller.hears(['my info'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'You have not signed up yet. ' +
                    'Use *sign me up* command.\n');
            }
            else {
                let user;

                switch (data.userType) {
                    case 'OWNER':
                        user = Owner.fromJSON(data);
                        break;
                    case 'TENANT':
                        user = Tenant.fromJSON(data);
                        break;
                    default:
                        user = User.fromJSON(data);
                        break;
                }

                bot.reply(message, user.info);
            }
        })
    });

controller.hears(['^free$'],
    'direct_message', (bot, message) => {

        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'You have not signed up yet. ' +
                    'Use *sign me up* command.\n');
            }
            else {
                if (data.userType === 'TENANT') {
                    bot.reply(message,
                        'You are a tenant.\n' +
                        'You need to be a parking place owner to use *free* command.')
                }
                else {
                    const owner = Owner.fromJSON(data);

                    if (owner.parkingPlace.placeStatus === 'FREE') {
                        bot.reply(message,
                            'Your place is already free for today, ' + owner.firstName);
                    }
                    else {
                        if (owner.parkingPlace.placeTenant) {
                            bot.reply(message,
                                'Your place is already rent for today.\n' +
                                'Your tenant is ' + owner.parkingPlace.placeTenant.fullName + '.' +
                                'You can contact him by phone number ' + owner.parkingPlace.placeTenant.phoneNumber + '.');
                        }
                        else {
                            owner.parkingPlace.placeStatus = 'FREE';

                            controller.storage.users.save(owner, (err, id) => {
                                if (err) {
                                    bot.reply(message, 'Ooops! Something goes wrong while updating your parking place status. No effects were applied.\n' +
                                        'Try again.');

                                    logger(controller,
                                        'free',
                                        err,
                                        'when saving owner data to the storage (setting parkingPlace status to FREE)',
                                        owner);
                                }
                                else {
                                    bot.reply(message, 'Got you, ' + owner.firstName + '! Your parking place is free for today.');

                                    controller.storage.teams.get(message.team, (err, data) => {
                                        if (typeof data !== 'undefined') {
                                            const queue = Queue.fromJSON(data);

                                            if (queue.tenants.length > 0) {
                                                for (let tenant of queue.tenants) {
                                                    bot.reply(tenant.reference, 'Parking place is available.\n' +
                                                        'Send *park me* command if you need it. Wish you luck, ' + tenant.firstName +'!');
                                                }
                                                queue.tenants = [];
                                                controller.storage.teams.save(queue, (err, id) => {
                                                    if (err) {
                                                        logger(controller,
                                                            'free',
                                                            err,
                                                            'when saving team data to the storage (cleaning up tenants queue)',
                                                            queue);
                                                    }
                                                    else {
                                                        logger(controller,
                                                            'free',
                                                            null,
                                                            'queue was updated and notifications were sent successfully',
                                                            queue);
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    }
                }
            }
        });
    });

controller.hears(['vacations (.*)'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'You have not signed up yet. ' +
                    'Use *sign me up* command.\n');
            }
            else {
                if (data.userType === 'TENANT') {
                    bot.reply(message,
                        'You are a tenant.\n' +
                        'You need to be a parking place owner to use *vacations* command.')
                }
                else {
                    let owner = Owner.fromJSON(data);

                    const match = message.match[1];
                    const pattern = /^\d{4}-\d{2}-\d{2} \d{4}-\d{2}-\d{2}$/;

                    if (pattern.test(match)) {
                        const start = match.split(' ')[0];
                        const end = match.split(' ')[1];

                        const vacationPeriod = moment.twix(start, end);

                        if (vacationPeriod.isValid() && vacationPeriod.isFuture()) {
                            owner.parkingPlace.placeFreeDates.push(vacationPeriod);

                            controller.storage.users.save(owner, (err) => {
                                if (err) {
                                    bot.reply(message, 'Ooops! Something goes wrong while saving your vacations. No effects were applied.\n' +
                                        'Try again.');
                                    logger(controller,
                                        'vacations',
                                        err,
                                        'when saving owner to the storage (adding vacations)',
                                        owner);
                                }
                                else {
                                    bot.reply(message, 'Got you, ' + owner.firstName + '! Your parking place will be free these days.');
                                }
                            });
                        }
                        else {
                            bot.reply(message, 'Sorry, ' + owner.firstName + ', but vacations period is not correct.\n' +
                                'It probably does not start in the future or the start date is after the end date.\n' +
                                'Try again using YYYY-MM-DD format. Good luck!')
                        }
                    }
                    else {
                        bot.reply(message, 'Sorry, ' + owner.firstName + ', I did not understand the dates you sent.\n' +
                            'You can try again using YYYY-MM-DD format. Example:\n' +
                            '*vacations 2017-03-22 2017-03-28*')
                    }

                }
            }
        });
    });

controller.hears(['park me'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'You have not signed up yet. ' +
                    'Use *sign me up* command.\n');
            }
            else {
                if (data.userType === 'OWNER') {
                    bot.reply(message,
                        'You are a parking place owner.\n' +
                        'You need to be a tenant to use *park me* command.')
                }
                else {
                    const tenant = Tenant.fromJSON(data);

                    controller.storage.users.all((err, data) => {
                        if (typeof data !== 'undefined') {
                            const userWithFreeParkingPlace = data.find(
                                (user) => {
                                    return user &&
                                        user.userType === 'OWNER' &&
                                        user.parkingPlace &&
                                        user.parkingPlace.placeStatus === 'FREE';
                                }
                            );

                            if (userWithFreeParkingPlace) {
                                let owner = Owner.fromJSON(userWithFreeParkingPlace);

                                owner.parkingPlace.placeStatus = 'BUSY';
                                owner.parkingPlace.placeTenant = tenant;

                                controller.storage.users.save(owner, (err, id) => {
                                    if (err) {
                                        bot.reply(message, 'Ooops! Something goes wrong while sending you a parking place number. No effects were applied.\n' +
                                            'Try again.');
                                        logger(controller,
                                            'parkMe',
                                            err,
                                            'when saving owner data to the storage (setting parking place status is BUSY)',
                                            owner);
                                    }
                                    else {
                                        bot.reply(message, 'Hey, ' + tenant.firstName + ', you can park at ' + owner.parkingPlace.placeNumber + '!\n' +
                                            'It is a place of ' + owner.fullName + '.\n' +
                                            'In case of a question you can contact him by phone number ' + owner.phoneNumber + '.');
                                        bot.reply(owner.reference, 'Hello, ' + owner.firstName + '!\n' +
                                            'Your parking place was booked by ' + tenant.fullName + ' for today.\n' +
                                            'In case of a question you can contact him by phone number ' + tenant.phoneNumber + '.');

                                    }
                                });
                            }
                            else {
                                controller.storage.teams.get(message.team, (err, team) => {
                                    let queue;
                                    if (typeof team === 'undefined') {
                                        queue = new Queue(message, tenant);
                                    }
                                    else {
                                        queue = Queue.fromJSON(team);
                                        queue.tenants.push(tenant);
                                    }

                                    controller.storage.teams.save(queue, (err, id) => {
                                        if (err) {
                                            bot.reply(message, 'Ooops! Something goes wrong while adding you to user queue. No effects were applied.\n' +
                                                'Try again.');

                                            logger(controller,
                                                'parkMe',
                                                err,
                                                'when saving team data to the storage (adding tenant to the queue)',
                                                queue);
                                        }
                                        else {
                                            bot.reply(message, 'You were added to queue and will be notified if there are free parking places.\n' +
                                                'There are ' + queue.tenants.length + ' users in the queue including you.');
                                        }
                                    });
                                });
                            }
                        }
                        else {
                            bot.reply(message, 'Oppps! Something goes wrong. No users were found in the system.\n' +
                                'Try again later.');
                        }
                    });
                }
            }
        });
    });

controller.hears(['^undo rent$'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'You have not signed up yet. ' +
                    'Use *sign me up* command.\n');
            }
            else {
                if (data.userType === 'OWNER') {
                    bot.reply(message,
                        'You are a parking place owner.\n' +
                        'You need to be a tenant to use *undo rent* command.')
                }
                else {
                    const tenant = Tenant.fromJSON(data);

                    controller.storage.users.all((err, data) => {
                        if (typeof data === 'undefined' || data.length === 0) {
                            bot.reply(message, 'Sorry, no users were found. Try again later.');
                        }
                        else {
                            const user = data.find(
                                (user) => {
                                    return user &&
                                        user.userType === 'OWNER' &&
                                        user.parkingPlace &&
                                        user.parkingPlace.placeTenant &&
                                        user.parkingPlace.placeTenant.id === tenant.id;
                                }
                            );
                            if (user) {
                                const placeProvider = Owner.fromJSON(user);

                                placeProvider.parkingPlace.placeStatus = 'FREE';
                                delete placeProvider.parkingPlace.placeTenant;

                                controller.storage.users.save(placeProvider, (err) => {
                                   if (err) {
                                       bot.reply(message, 'Ooops! Something goes wrong while saving data to the storage. Try again later.');
                                       logger(controller,
                                            'undorent',
                                            err,
                                            'when saving owner data to the storage',
                                            placeProvider);
                                   }
                                   else {
                                       bot.reply(message, 'I have canceled your reservation and informed '+placeProvider.fullName+' about that.');

                                       bot.reply(placeProvider.reference, 'Hi, '+placeProvider.firstName+'!\n'+tenant.fullName+' have canceled his reservation so your place is free again.');

                                       controller.storage.teams.get(message.team, (err, data) => {
                                           if (typeof data !== 'undefined') {
                                               const queue = Queue.fromJSON(data);

                                               if (queue.tenants.length > 0) {
                                                   for (let tenant of queue.tenants) {
                                                       bot.reply(tenant.reference, 'Parking place is available.\n' +
                                                           'Send *park me* command if you need it. Wish you luck, ' + tenant.firstName +'!');
                                                   }
                                                   queue.tenants = [];
                                                   controller.storage.teams.save(queue, (err, id) => {
                                                       if (err) {
                                                           logger(controller,
                                                               'free',
                                                               err,
                                                               'when saving team data to the storage (cleaning up tenants queue)',
                                                               queue);
                                                       }
                                                       else {
                                                           logger(controller,
                                                               'free',
                                                               null,
                                                               'queue was updated and notifications were sent successfully',
                                                               queue);
                                                       }
                                                   });
                                               }
                                           }
                                       });
                                   }
                                });
                            }
                            else {
                                bot.reply(message, 'Sorry, '+tenant.firstName+', but I have not found your place reservation.'+
                                                    'Are you sure that you have rent a place for today?');
                            }
                        }
                    });
                }
            }
        });
    });

controller.hears(['^undo free$'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'You have not signed up yet. ' +
                    'Use *sign me up* command.\n');
            }
            else {
                if (data.userType === 'TENANT') {
                    bot.reply(message,
                        'You are a tenant.\n' +
                        'You need to be an owner to use *undo free* command.')
                }
                else {
                    const owner = Owner.fromJSON(data);

                    if (owner.parkingPlace && owner.parkingPlace.placeStatus === 'FREE') {
                        owner.parkingPlace.placeStatus = 'BUSY';

                        controller.storage.users.save(owner, (err) => {
                            if (err) {
                                bot.reply(message, 'Ooops! Something goes wrong while saving data to the storage. Try again later.');
                                logger(controller,
                                    'undofree',
                                    err,
                                    'when saving owner data to the storage',
                                    owner);
                            }
                            else {
                                bot.reply(message, 'OK, '+owner.firstName+', your parking place status is set to BUSY again.');
                            }
                        });
                    }
                    else {
                        if (owner.parkingPlace && owner.parkingPlace.placeTenant) {
                            bot.reply(message, 'Sorry, '+owner.firstName+', but you place has been already rent by '+owner.parkingPlace.placeTenant.fullName+' for today.\n'+
                                owner.parkingPlace.placeTenant.phoneNumber + ' - you can contact him by phone in case you need it back')
                        }
                        else {
                            bot.reply(message, 'Your parking place is BUSY already, '+owner.firstName+'! Do not be so worried :).');
                        }
                    }
                }
            }
        });
    });

controller.hears(['status'],
    'direct_message', (bot, message) => {
        controller.storage.users.all((err, data) => {
            if (typeof data === 'undefined' || data.length === 0) {
                bot.reply(message, 'Sorry, no users were found. Try again later.');
            }
            else {
                let freeParkingPlaces = 0;
                let placeOwners = 0;
                let placeTenants = 0;
                let tenantsInQueue = 0;

                for (let index in data) {
                    let user = User.fromJSON(data[index]);
                    if (user.userType === 'OWNER') {
                        placeOwners = placeOwners + 1;
                        if (user.parkingPlace.placeStatus === 'FREE') {
                            freeParkingPlaces = freeParkingPlaces + 1;
                        }
                    }
                    else {
                        placeTenants = placeTenants + 1;
                    }
                }

                controller.storage.teams.get(message.team, (err, data) => {
                    if (typeof data !== 'undefined') {
                        let queue = Queue.fromJSON(data);
                        tenantsInQueue = queue.tenants.length;
                    }

                    bot.reply(message, 'Parking place owners: ' + placeOwners + '\n' +
                        'Tenants: ' + placeTenants + '\n' +
                        'Free parking places: ' + freeParkingPlaces + '\n' +
                        'Tenants in queue: ' + tenantsInQueue)
                });
            }
        })
    });

controller.hears(['help'],
    'direct_message', function (bot, message) {

        bot.reply(message,
            'To start using ParkOpsy chatbot send *sign me up*.\n\n' +
            'To edit your account use *update me*.\n' +
            'To remove your account use *remove account*.\n' +
            'To view your account use *my info*.\n\n' +
            'To receive a parking place use *park me*.\n' +
            'To share your place for today use *free*.\n\n' +
            'To add vacations period use *vacations YYYY-MM-DD YYYY-MM-DD*.\n\n' +
            'To receive system current status use *status*.');
    });

controller.hears(['creators'],
    'direct_message', function (bot, message) {

        bot.reply(message,
            'Grigory Nitsenko \n' +
            'Elizaveta Belokopytova \n' +
            'Andrey Kalinin');
    });

