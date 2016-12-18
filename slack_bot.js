var schedule = require("node-schedule");

var Botkit = require('./lib/Botkit.js');
var os = require('os');

var controller = Botkit.slackbot({
    debug: true,
    json_file_store: './lib/storage/data'
});

var bot = controller.spawn({
    token: ''
}).startRTM();

function createUser(id) {
    return {
        id: id,
        parking_number: 'no parking number',
        status: {
            isbusy: 'no parking number',
            free_dates: []
        }
    }
}

controller.hears(['not ready'],
    'direct_message,direct_mention,mention', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if(!user) {
            user = createUser(message.user);
            controller.storage.users.save(user, function (err, id) {
                bot.reply(message, 'You was not registered yet.');
            });
        }
        else
        {
            user = createUser(message.user);
            controller.storage.users.save(user, function (err, id) {
                bot.reply(message, 'All your user information was deleted.');
            });
        }
    });
});

controller.hears(['my info'], 'direct_message,direct_mention,mention', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            user = createUser(message.user);
            controller.storage.users.save(user, function (err, id) {
                bot.reply(message, 'You do not register a parking place. Use ready [parking number] command.\n' +
                    'If you want to park then you do not have user info and just use park me command.');
            });
        }
        else {
            if (user.hasOwnProperty('parking_number') && user.parking_number == 'no parking number') {
                bot.reply(message, 'You do not register a parking place. Use ready [parking number] command.\n' +
                    'If you want to park then you do not have user info and just use park me command.');
            }
            else {
                bot.reply(message, 'Your parking number is ' + user.parking_number + '.\n' +
                'Its current status is ' + (user.status.isbusy ? 'busy' : 'free') + '.')
            }
        }
    })
});

controller.hears(['ready (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
    var parking = message.match[1];

    controller.storage.users.get(message.user, function (err, user) {

        if (user) {
            user.parking_number = parking;
            if (user.hasOwnProperty('status') && user.status.isbusy == 'no parking number') {
                user.status = {
                    isbusy: true,
                    froo_dates: []
                }
            }
            controller.storage.users.save(user, function (err, id) {
                bot.reply(message, 'Your parking number was updated.');
            });
            return;
        }

        if (!user) {
            user = createUser(message.user);
        }
        user.parking_number = parking;
        user.status = {
            isbusy: true,
            free_dates: []
        };

        controller.storage.users.save(user, function (err, id) {
            bot.reply(message, 'You was registered.\nThanks for be ready to share your place number ' + user.parking_number);
        });
    });
});

controller.hears(['vacations (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
    var dates = message.match[1];

    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            bot.reply(message, 'Please, use ready command first.');
            return;
        }

        var vacations_from = dates.match(/\d{4}-\d{2}-\d{2}/);
        var vacations_to = dates.match(/ \d{4}-\d{2}-\d{2}/);

        if (user.hasOwnProperty('status') && user.status.hasOwnProperty('free_dates')) {
            user.status.free_dates.push(
                {
                    from: vacations_from,
                    to: vacations_to
                }
            );
        }
        else {
            user.status =
                {
                    isbusy: true,
                    free_dates: [
                        {
                            from: vacations_from,
                            to: vacations_to
                        }
                    ]
                };
        }

        controller.storage.users.save(user, function (err, id) {

            bot.reply(message, 'Got it. I will remember you vacations dates');

        })
    });
});

controller.hears(['free (.*)', 'free'], 'direct_message,direct_mention,mention', function (bot, message) {
    var days = message.match[1];

    controller.storage.users.get(message.user, function (err, user) {

        if (!user) {
            bot.reply(message, 'You do not register a parking place. Use ready [parking number] command.');
            return;
        }

        if (user.hasOwnProperty('parking_number') && user.parking_number == 'no parking number') {
            bot.reply(message, 'You do not register a parking place. Use ready [parking number] command.');
            return;
        }

        if (typeof (days) == 'undefined' && user.hasOwnProperty('status') && !user.status.isbusy) {
            bot.reply(message, 'You parking place is already free for today.');
            return;
        }
        // Approach to get current date
        var to = new Date();
        if (typeof(days) != 'undefined') {
            // Approach to add N days to current date
            to.setDate(to.getDate() + days);
        }

        if (user.hasOwnProperty('status') && user.status.hasOwnProperty('free_dates')) {
            user.status.isbusy = false;
            user.status.free_dates.push(
                {
                    from: new Date(),
                    to: to
                }
            );
        }
        else {
            user.status = {
                isbusy: false,
                free_dates: [
                    {
                        from: new Date(),
                        to: to
                    }
                ]
            };
        }

        controller.storage.users.save(user, function (err, id) {
            if (typeof (days) == 'undefined') {
                bot.reply(message, 'Got it. Your parking place is free for today.');
            }
            else {
                bot.reply(message, 'Got it. Your parking place is free for today and ' + (days - 1) + ' next days.');
            }

            controller.storage.teams.get(message.team, function (err, team) {
                if (team) {
                    if (team.hasOwnProperty('userQueue') && team.userQueue.length != 0) {
                        for (var user_id in team.userQueue) {
                            bot.reply(team.userQueue[user_id], 'Parking place is available! Use park me command to book it for today');
                        }
                        team.userQueue = [];
                        controller.storage.teams.save(team, function (err, id) {
                            console.log('Queue was updated');
                        });
                    }
                    else {
                        console.log('Queue is empty at the moment');
                    }
                }
                else {
                    console.log('No queue was created even once');
                }
            })
        })
    });
});

controller.hears(['park me'], 'direct_message', function (bot, message) {
    controller.storage.users.all(function (err, all_user_data) {
        for (var i in all_user_data) {
            if (all_user_data[i] && all_user_data[i].hasOwnProperty('status') && !all_user_data[i].status.isbusy) {

                // We should only change status of the parking place to busy status.
                all_user_data[i].status.isbusy = true;

                controller.storage.users.save(all_user_data[i], function (err, id) {
                    bot.reply(message, 'Hey, lucky, you can park at ' + all_user_data[i].parking_number + '!');
                });
                return;
            }
        }

        controller.storage.teams.get(message.team, function (err, team) {
            if (!team) {
                team = {
                    id: message.team,
                    userQueue: [message]
                };
                controller.storage.teams.save(team, function (err, id) {
                    bot.reply(message, 'You was added to queue and be notificate if there will be free parking places.');
                })
            }
            else {
                team.userQueue.push(message);
                controller.storage.teams.save(team, function (err, id) {
                    bot.reply(message, 'You was added to queue and will be notificated if there will be free parking places.');
                })
            }
        });
    });
});

controller.hears(['cancel'], 'direct_message', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            bot.reply(message, 'You are not a registered user. Use ready [parking number] to create free date reservations.');

        }
        else {
            if (user.hasOwnProperty('parking_number') && user.parking_number == 'no parking number') {
                bot.reply(message, 'You have no registered parking places. Use ready [parking number] to create free date reservations.');

            }
            else {
                user.status = {
                    isbusy: true,
                    free_dates: []
                }
                controller.storage.users.save(user, function (err, id) {
                    bot.reply(message, 'All free dates were canceled.')
                })
            }
        }
    })
});

controller.hears(['status'], 'direct_message', function (bot, message) {
    controller.storage.users.all(function (err, all_user_data) {
        var number_of_free_parkings = 0;
        for (var user_index in all_user_data) {
            if (all_user_data[user_index].hasOwnProperty('status') && !all_user_data[user_index].status.isbusy) {
                number_of_free_parkings = number_of_free_parkings + 1;
            }
        }
        bot.reply(message, 'Current number of free parking places is ' + number_of_free_parkings + '.');
    })
})

var j = schedule.scheduleJob('0 0 * * * *', function () {
    controller.storage.users.all(function (err, all_user_data) {
        if (all_user_data) {
            for (var user_index in all_user_data) {
                if (all_user_data[user_index].parking_number != 'no parking number') {
                    all_user_data[user_index].status.isbusy = true;
                    for (var date_index in all_user_data[user_index].status.free_dates) {
                        if (all_user_data[user_index].status.free_dates[date_index].from <= new Date() &&
                            new Date() <= all_user_data[user_index].status.free_dates[date_index].to) {
                            all_user_data[user_index].status.isbusy = false;
                        }
                    }
                }
            }
            controller.storage.users.save(all_user_data, function (err, id) {
                console.log('Users were updated');
            });
        }
    });

    controller.storage.teams.all(function (err, all_team_data) {
        all_team_data = {};
        controller.storage.teams.save(all_team_data, function (err, id) {
            console.log('Queue was cleared');
        })
    });

});

controller.hears(['help'],
    'direct_message,direct_mention,mention', function (bot, message) {

        bot.reply(message,
            'if you are a parking place owner: \n' +
            '\n ready [parking number] | to register as a parking place peer' +
            '\n not ready | to stop sharing the parking place' +
            '\n free [number of days?] | to set status of your parking place to free for today or for number of days (include today)' +
            '\n vacations [yyyy-mm-dd] [yyyy-mm-dd] | to set status of your parking place to free for ceratin period' +
            '\n my info | to send information about you' +
            '\n cancel | to clear your free dates\n\n' +
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
    })

controller.hears(['admin'],
    'direct_message,direct_mention,mention', function (bot, message) {

        bot.reply(message,
            (function () {
                var number_of_users = 0;
                var number_of_parkings = 0;
                var queue_length = 0;

                controller.storage.teams.all(function (err, all_team_data) {
                    if (all_team_data && all_team_data.hasOwnProperty('userQueue')) {
                        queue_length = all_team_data.userQueue.length;
                    }
                    else {
                        queue_length = 0;
                    }
                });

                controller.storage.users.all(function (err, all_user_data) {
                    number_of_users = all_user_data.length;
                    for (var i in all_user_data) {
                        if (all_user_data[i].parking_number != 'no parking number') {
                            number_of_parkings = number_of_parkings + 1;
                        }
                    }
                });

                return 'Number of users is ' + number_of_users + '\n' +
                    'Number of parkings is ' + number_of_parkings + '\n' +
                    'Length of queue is ' + queue_length;
            })()
        );});
