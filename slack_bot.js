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
        parking_number: null,
        status: {
            isbusy: null,
            free_dates: []
        },
        desire: null
    }
}

controller.hears(['ready (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var parking = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = createUser(message.user);
        }
        user.parking_number = parking;
        user.status = {
            isbusy: true,
            free_dates: []
        };
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Thanks for ready to share your place number '+user.parking_number);
        });
    });
});

controller.hears(['free (.*)','free'], 'direct_message,direct_mention,mention', function (bot, message) {
    var days = message.match[1];
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            bot.reply(message, 'Please, use ready command first.');
            return;
        }

        // Approach to get current date
        var to = new Date();
        if (typeof(days) != 'undefined')
        {
            // Approach to add N days to current date
            to.setDate(to.getDate() + days);
        }

        if (user.hasOwnProperty('status') && user.status.hasOwnProperty('free_dates'))
        {
            user.status.isbusy = false;
            user.status.free_dates.push(
                {
                    from: new Date(),
                    to: to
                }
            );
        }
        else
        {
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
            if (typeof (days) == 'undefined'){
                bot.reply(message, 'Got it. Your parking place is free for today.');
            }
            else
            {
                bot.reply(message, 'Got it. Your parking place is free for today and '+(days-1)+' next days.');
            }

            controller.storage.teams.get(message.team, function (err, team) {
                if (team)
                {
                    if (team.hasOwnProperty('userQueue') && team.userQueue.length != 0) {
                        for (var user_id in team.userQueue) {
                            bot.startPrivateConversation({user: user_id}, function (err, conversation) {
                                bot.say('Parking place is available!');
                            });
                        }
                        team.userQueue = [];
                        controller.storage.teams.save(team, function (err, id) {
                            console.log('Queue was updated');
                        });
                    }
                    else
                    {
                        console.log('Queue is empty at the moment');
                    }
                }
                else
                {
                    console.log('No queue was created even once');
                }
            })
        })
    });
});

controller.hears(['park me'], 'direct_message', function (bot, message) {
    controller.storage.users.all(function (err, all_user_data) {
        for (var i in all_user_data) {
            if (all_user_data[i] && all_user_data[i].hasOwnProperty('status') && !all_user_data[i].status.isbusy)
            {
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
                    userQueue: [message.user]
                };
                controller.storage.teams.save(team, function (err, id) {
                    bot.reply(message, 'You was added to queue and be notificate if there will be free parkings.');
                })
            }
            else
            {
                team.userQueue.push(message.user);
                controller.storage.teams.save(team, function (err, id) {
                    bot.reply(message, 'You was added to queue and be notificate if there will be free parkings.');
                })
            }
        });
    });
});

controller.hears(['cancel'],'direct_message', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            bot.replay(message, 'User is not registered.');
            return;
        }
        else
        {
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
            if (!all_user_data[user_index].status.isbusy)
            {
                number_of_free_parkings = number_of_free_parkings + 1;
            }
        }
        bot.reply(message, 'Current number of free parking places is ' + number_of_free_parkings);
    })
})

var j = schedule.scheduleJob('0 0 * * * *', function(){
    controller.storage.users.all(function (err, all_user_data) {
        if (all_user_data) {
            for (var user_index in all_user_data) {
                all_user_data[user_index].desire = false;
                for (var date_index in all_user_data[user_index].status.free_dates) {
                    if (validateDate(
                            currentdate,
                            all_user_data[user_index].status.free_dates[date_index].from,
                            all_user_data[user_index].status.free_dates[date_index].to)) {
                        all_user_data[user_index].status.busy = false;
                    }
                }
            }
            controller.storage.users.save(all_user_data, function (err, id) {

            })
        }
    });

    controller.storage.teams.all(function(err, all_team_data) {
        all_team_data = {
            users: []
        };
        controller.storage.teams.save(all_team_data, function (err, id) {

        })
    });

});

function validateDate(date, from, to) {
    return true;
}


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


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function (bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
            '>. I have been running for ' + uptime + ' on ' + hostname);

    });

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}
