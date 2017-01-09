var schedule = require("node-schedule");
var moment = require('moment');

var Botkit = require('./lib/Botkit.js');
var os = require('os');

var controller = Botkit.slackbot({
    debug: true,
    json_file_store: './lib/storage/data'
});

var bot = controller.spawn({
    token: process.env.TOKEN
}).startRTM();

function createUser(userID, parkingNumber) {
    return {
        id: userID,
        parkingPlace: createParkingPlace(parkingNumber)
    }
}

function createParkingPlace(parkingNumber) {
    return {
        number: parkingNumber,
        status: 'busy',
        freeDates: [],
        tenant: ''
    }
}

function printDates(dates) {
    dates = optimizeDates(dates);
    var result = '';
    for (var i in dates) {
        result = result +
            (dates.length == 1 ? '' : i + '. ') +
            'from ' +
            moment(dates[i].from).format('YYYY MMMM D') +
            ' to ' +
            moment(dates[i].to).format('YYYY MMMM D') +
            (i == dates.length - 1 ? '' : '\n');
    }
    return result;
}

function optimizeDates(dates) {
    for (var i = 0; i < dates.length; i++) {
        for (var j = 0; j < dates.length; j++) {
            if (j != i) {
                // [from j   <from i     >to i     ]to j
                if (moment(dates[i].from).diff(moment(dates[j].from), 'days') >= 0 &&
                    moment(dates[i].from).diff(moment(dates[j].to), 'days') <= 0 &&
                    moment(dates[i].to).diff(moment(dates[j].to), 'days') <= 0 &&
                    moment(dates[i].to).diff(moment(dates[j].from), 'days') >= 0) {
                    console.log('[  <  >  ]');
                    dates.splice(i, 1);
                    i = 0;
                    continue;
                }
                // [from j   <from i     ]to j      >to i
                if (moment(dates[i].from).diff(moment(dates[j].from), 'days') >= 0 &&
                    moment(dates[i].from).diff(moment(dates[j].to), 'days') <= 0 &&
                    moment(dates[i].to).diff(moment(dates[j].to), 'days') >= 0 &&
                    moment(dates[i].to).diff(moment(dates[j].from), 'days') >= 0) {
                    console.log('[  <  ]  >');
                    dates[i].from = dates[j].from;
                    dates.splice(j, 1);
                    i = 0;
                    continue;
                }
                // <from i   [from j      >to i     ]to j
                if (moment(dates[i].from).diff(moment(dates[j].from), 'days') <= 0 &&
                    moment(dates[i].from).diff(moment(dates[j].to), 'days') <= 0 &&
                    moment(dates[i].to).diff(moment(dates[j].to), 'days') <= 0 &&
                    moment(dates[i].to).diff(moment(dates[j].from), 'days') >= 0) {
                    console.log('<  [  >  ]');
                    dates[i].to = dates[j].to;
                    dates.splice(j, 1);
                    i = 0;
                }
            }
        }
    }
    return dates;
}

controller.hears(['ready to share (.*)'],
    'direct_message,direct_mention,mention', function (bot, message) {

        var parkingNumber = message.match[1];

        controller.storage.users.get(message.user, function (err, user) {
            if (user) {
                user.parkingPlace = createParkingPlace(parkingNumber);
                controller.storage.users.save(user, function (err, id) {
                    bot.reply(message,
                        'Your parking place number was updated.\n' +
                        'Status is set to busy and free dates are clean up.');
                });
            }
            else {
                user = createUser(message.user, parkingNumber);
                controller.storage.users.save(user, function (err, id) {
                    bot.reply(message,
                        'You was registered.\n' +
                        'Thanks for be ready to share your parking place number ' + user.parkingPlace.number + '.');
                });
            }
        });
    });

controller.hears(['stop sharing'],
    'direct_message,direct_mention,mention', function (bot, message) {
        controller.storage.users.get(message.user, function (err, user) {
            if (!user) {
                bot.reply(message,
                    'You have not registered yet.' +
                    'Use ready to share [parking number] command.\n');
            }
            else {
                controller.storage.users.delete(message.user, function (err) {
                    bot.reply(message, 'All your user information was removed.');
                });
            }
        });
    });

controller.hears(['my info'],
    'direct_message,direct_mention,mention', function (bot, message) {
        controller.storage.users.get(message.user, function (err, user) {
            if (!user) {
                bot.reply(message,
                    'You have not registered yet.\n' +
                    'Use ready to share [parking number] command.\n' +
                    'If you want to park then you do not have user info. Just use park me command.');
            }
            else {
                bot.reply(message,
                    'Your parking number is ' + user.parkingPlace.number + '.\n' +
                    'Its current status is ' + user.parkingPlace.status + '.' +
                    (user.parkingPlace.tenant != '' ?
                    '\nYour tenant for today is ' + user.parkingPlace.tenant + '.' :
                        '') +
                    (user.parkingPlace.freeDates.length > 0 ?
                    '\nYour days off are\n' + printDates(user.parkingPlace.freeDates) + '.' :
                        '\nYou do not have days off.'));
            }
        })
    });


controller.hears(['vacations (.*)'],
    'direct_message,direct_mention,mention', function (bot, message) {
        var dates = message.match[1];
        var pattern = /(\d{4}-\d{2}-\d{2}) (\d{4}-\d{2}-\d{2})/;
        if (pattern.test(dates)) {
            var vacations_from = moment(pattern.exec(dates)[1]);
            var vacations_to = moment(pattern.exec(dates)[2]);
            if (vacations_from.isValid() && vacations_to.isValid()) {
                if (vacations_to.diff(vacations_from, 'days') > 0) {
                    controller.storage.users.get(message.user, function (err, user) {
                        if (!user) {
                            bot.reply(message,
                                'You have not registered yet.' +
                                'Use ready to share [parking number] command.\n');
                        }
                        else {

                            user.parkingPlace.freeDates.push(
                                {
                                    from: vacations_from,
                                    to: vacations_to
                                }
                            );

                            user.parkingPlace.freeDates = optimizeDates(user.parkingPlace.freeDates);

                            controller.storage.users.save(user, function (err, id) {
                                bot.reply(message, 'Got it. I will remember your days off.');
                            })
                        }
                    });
                }
                else {
                    bot.reply(message, 'Dates format is incorrect.\n' +
                        'Vacations start ' + vacations_from.format('MMMM Do YYYY') +
                        ' must be earlier than end ' + vacations_to.format('MMMM Do YYYY') + '.');
                }
            }
            else {
                bot.reply(message, 'Dates format is incorrect.\n' +
                    'Use vacations YYYY-MM-DD YYYY-MM-DD.');
            }
        }
        else {
            bot.reply(message, 'Dates format is incorrect.\n' +
                'Use vacations YYYY-MM-DD YYYY-MM-DD.');
        }
    });

controller.hears(['cancel vacations'],
    'direct_message,direct_mention,mention', function (bot, message) {
        controller.storage.users.get(message.user, function (err, user) {
            if (!user) {
                bot.reply(message,
                    'You have not registered yet.' +
                    'Use ready to share [parking number] command.\n');
            }
            else {
                if (user.parkingPlace.freeDates.length == 0) {
                    bot.reply(message,
                        'You do not have days off.\n' +
                        'Use vacations YYYY-MM-DD YYYY-MM-DD command to add one.')
                }
                else {
                    user.parkingPlace.freeDates = [];
                    controller.storage.users.save(user, function (err, id) {
                        bot.reply(message, 'Your days off were cleaned up.')
                    })
                }
            }
        })
    });

controller.hears(['free (.*)', 'free'],
    'direct_message,direct_mention,mention', function (bot, message) {

        var days = message.match[1];
        controller.storage.users.get(message.user, function (err, user) {

            if (!user) {
                bot.reply(message, 'You have not registered yet.' +
                    'Use ready to share [parking number] command.\n');
            }
            else {
                if (user.parkingPlace.status == 'free' && typeof(days) == 'undefined') {
                    bot.reply(message, 'You parking place is already free for today.');
                }
                else {
                    if (user.parkingPlace.status == 'busy' && user.parkingPlace.tenant != '' && typeof(days) == 'undefined') {
                        bot.reply(message, 'It is not possible to change parking place status since '+user.parkingPlace.tenant+' has already rent it for today.');
                    }
                    else {
                        if (user.parkingPlace.status == 'busy' && user.parkingPlace.tenant != '' && typeof(days) != 'undefined') {
                            bot.reply(message, 'Please, use vacations [YYYY-MM-DD] [YYYY-MM-DD] command to plan your days off.\n' +
                                               user.parkingPlace.tenant + ' has already rent your place for today.');
                        }

                        else {
                            {
                                if (typeof(days) != 'undefined') {
                                    var fromDate = moment();
                                    var toDate = moment();
                                    toDate.add(days, 'days');
                                    user.parkingPlace.freeDates.push(
                                        {
                                            from: fromDate,
                                            to: toDate
                                        }
                                    );
                                }

                                user.parkingPlace.status = 'free';
                                user.parkingPlace.freeDates = optimizeDates(user.parkingPlace.freeDates);

                                controller.storage.users.save(user, function (err, id) {
                                    if (typeof (days) == 'undefined') {
                                        bot.reply(message, 'Got it.\nYour parking place is free for today.');
                                    }
                                    else {
                                        bot.reply(message, 'Got it.\nYour parking place is free for today and ' + (days - 1) + ' next days.');
                                    }

                                    controller.storage.teams.get(message.team, function (err, team) {
                                        if (team) {
                                            if (team.userQueue.length > 0) {
                                                for (var i in team.userQueue) {
                                                    bot.reply(team.userQueue[i], 'Parking place is available! Use park me command to book it for today.');
                                                }
                                                team.userQueue = [];
                                                controller.storage.teams.save(team, function (err, id) {
                                                    console.log('Queue was updated.');
                                                });
                                            }
                                            else {
                                                console.log('Queue is empty at the moment.');
                                            }
                                        }
                                        else {
                                            console.log('No queue was created even once.');
                                        }
                                    });
                                });
                            }
                        }
                    }
                }
            }
        });
    });

controller.hears(['park me'],
    'direct_message,direct_mention,mention', function (bot, message) {
        controller.storage.users.all(function (err, users) {
            if (users) {
                for (var i in users) {
                    if (users[i].parkingPlace.status == 'free') {

                        users[i].parkingPlace.status = 'busy';
                        users[i].parkingPlace.tenant = message.user;

                        for (var j in users[i].parkingPlace.freeDates) {
                            if (moment().diff(moment(users[i].parkingPlace.freeDates[j].from), 'days') == 0 &&
                                moment().diff(moment(users[i].parkingPlace.freeDates[j].to), 'days') == 0) {
                                users[i].parkingPlace.freeDates.splice(j, 1);
                            }
                        }

                        controller.storage.users.save(users[i], function (err, id) {
                            bot.reply(message, 'Hey, lucky, you can park at ' + users[i].parkingPlace.number + '!');
                        });

                        return;
                    }
                }
            }

            controller.storage.teams.get(message.team, function (err, team) {
                if (!team) {
                    team = {
                        id: message.team,
                        userQueue: [message]
                    };
                    controller.storage.teams.save(team, function (err, id) {
                        bot.reply(message, 'You was added to queue and will be notified if there are free parking places.');
                    })
                }
                else {
                    team.userQueue.push(message);
                    controller.storage.teams.save(team, function (err, id) {
                        bot.reply(message, 'You was added to queue and will be notified if there are free parking places.');
                    })
                }
            });
        });
    });

controller.hears(['status'],
    'direct_message,direct_mention,mention', function (bot, message) {
        controller.storage.users.all(function (err, users) {
            if (users) {
                var freeParkingPlaces = 0;
                for (var i in users) {
                    if (users[i].parkingPlace.status == 'free') {
                        freeParkingPlaces = freeParkingPlaces + 1;
                    }
                }
                bot.reply(message, 'Current number of free parking places is ' + freeParkingPlaces + '.');
            }
            else {
                bot.reply(message, 'No users share there parking places.');
            }
        })
    });

var j = schedule.scheduleJob('0 1 * * *', function () {
    controller.storage.users.all(function (err, users) {
        if (users) {
            for (var i in users) {
                if (users[i].parkingPlace.status == 'free') {
                    users[i].parkingPlace.status = 'busy';
                    users[i].parkingPlace.tenant = '';
                }
                else {
                    if (users[i].parkingPlace.tenant != '') {
                        users[i].parkingPlace.tenant = '';
                    }
                }

                var currentDate = moment();
                for (var j in users[i].parkingPlace.freeDates) {
                    if (currentDate.diff(moment(users[i].parkingPlace.freeDates[j].from), 'days') >= 0 &&
                        currentDate.diff(moment(users[i].status.free_dates[j].to), 'days') <= 0) {
                        users[i].parkingPlace.status = 'free';
                    }
                }

                controller.storage.users.save(users[i], function (err, id) {
                    console.log('User ' + users[i].id + ' was updated at ' + new Date() + '.');
                })
            }
        }
    });

    controller.storage.teams.all(function (err, teams) {
        if (teams) {
            teams[0].userQueue = [];
            controller.storage.teams.save(teams[0], function (err, id) {
                console.log('Queue was cleaned up at ' + new Date() + '.');
            });
        }
        else {
            console.log('Queue was not updated at ' + new Date() + '.');
        }

    });
});

controller.hears(['help'],
    'direct_message,direct_mention,mention', function (bot, message) {

        bot.reply(message,
            'if you are a parking place owner: \n' +
            '\n ready to share [parking number] | to register as a parking place peer' +
            '\n stop sharing | to stop sharing the parking place' +
            '\n free [number of days?] | to set status of your parking place to free for today or for number of days (include today)' +
            '\n vacations [yyyy-mm-dd] [yyyy-mm-dd] | to set status of your parking place to free for ceratin period' +
            '\n my info | to send information about you' +
            '\n cancel vacations | to clear your free dates\n\n' +
            'if you are a parking place seeker: \n' +
            '\n park me | to receive a parking place' +
            '\n status | to check is there are any free parking places');
    });

controller.hears(['creators'],
    'direct_message,direct_mention,mention', function (bot, message) {

        bot.reply(message,
            'Grigory Nitsenko \n' +
            'Elizaveta Belokopytova \n' +
            'Andrey Kalinin');
    });

