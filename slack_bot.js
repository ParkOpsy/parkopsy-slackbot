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

controller.hears(['ready (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
    var parking = message.match[1];
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            user = createUser(message.user);
        }
        user.parking_number = parking;
        user.status = {
            isbusy: true,
            free_dates: []
        };
        controller.storage.users.save(user, function (err, id) {
            bot.reply(message, 'Thanks for ready to share your place number ' + user.parking_number);
        });
    });
});

controller.hears(['free (.*)', 'free'], 'direct_message,direct_mention,mention', function (bot, message) {
    var days = message.match[1];
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            bot.reply(message, 'Please, use ready command first.');
            return;
        }
        if (typeof (days) == 'undefined' && !user.status.isbusy) {
            bot.reply(message, 'You parking place is free for today already');
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
                            //bot.startPrivateConversation({user: team.userQueue[user_id].user}, function (err, conversation) {
                            bot.reply(team.userQueue[user_id], 'Parking place is available!');
                            //});
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
                    bot.reply(message, 'You can park at ' + all_user_data[i].parking_number);
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
                    bot.reply(message, 'You was added to queue and be notificate if there will be free parkings.');
                })
            }
            else {
                team.userQueue.push(message);
                controller.storage.teams.save(team, function (err, id) {
                    bot.reply(message, 'You was added to queue and be notificate if there will be free parkings.');
                })
            }
        });
    });
});

controller.hears(['cancel'], 'direct_message', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            bot.replay(message, 'User is not registered.');
            return;
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
    })
});

controller.hears(['status'], 'direct_message', function (bot, message) {
    controller.storage.users.all(function (err, all_user_data) {
        var number_of_free_parkings = 0;
        for (var user_index in all_user_data) {
            if (!all_user_data[user_index].status.isbusy) {
                number_of_free_parkings = number_of_free_parkings + 1;
            }
        }
        bot.reply(message, 'Current number of free parking places is ' + number_of_free_parkings);
    })
})

var j = schedule.scheduleJob('0 0 * * * *', function () {
    controller.storage.users.all(function (err, all_user_data) {
        if (all_user_data)
        {
            for (var user_index in all_user_data)
            {
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


controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function (bot, message) {

    bot.startConversation(message, function (err, convo) {

        convo.ask('Are you sure you want me to shutdown?', [
            {
                pattern: bot.utterances.yes,
                callback: function (response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function () {
                        process.exit();
                    }, 3000);
                }
            },
            {
                pattern: bot.utterances.no,
                default: true,
                callback: function (response, convo) {
                    convo.say('*Phew!*');
                    convo.next();
                }
            }
        ]);
    });
});


controller.hears(['help'],
    'direct_message,direct_mention,mention', function (bot, message) {

        bot.reply(message,
            'if you are a parking place owner: \n ready [parking number] \n free [number of days?] \n cancel \n \n' +
            'if you are a parking place seeker: \n park me \n status');

    });

controller.hears(['admin'],
    'direct_message,direct_mention,mention', function (bot, message) {

        bot.reply(message,
            (function () {
                var number_of_users;
                var number_of_parkings;
                var queue_length;

                controller.storage.teams.all(function (err, all_team_data) {
                    if (all_team_data && all_team_data.hasOwnProperty('userQueue')) {
                        queue_length = all_team_data.userQueue.length;
                    }
                    else
                    {
                        queue_length
                    }
                });

                controller.storage.users.all(function (err, all_user_data) {
                    number_of_users = all_user_data.length;
                    for (var i in all_user_data)
                    {
                        if (all_user_data[i].parking_number != 'no parking number') {
                            number_of_parkings = number_of_parkings + 1;
                        }
                    }
                });

                return 'Number of users is ' + number_of_users + '\n' +
                        'Number of parkings is ' + number_of_parkings + '\n' +
                        'Length of queue is ' + queue_length;
            })()
        );

    });
