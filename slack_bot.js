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
            free_dates: [
                {
                    from: "today",
                    to: "today"
                }
            ]
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
            user = createUser(message.user);
        }
        if (user.parking_number == null) {
            bot.reply('Register park number. /n Type "ready YOUR-PARK-NUMBER"');
            return;
        }

        var to = "today"+days;

        if (user.hasOwnProperty('status') && user.status.hasOwnProperty('free_dates'))
        {
            user.status.isbusy = false;
            user.status.free_dates.push(generateDate(days));
        }
        else
        {
            user.status = {
                isbusy: false,
                free_dates: [
                    {
                        from: "today",
                        to: to
                    }
                ]
            };
        }
        controller.storage.users.save(user, function (err, id) {
            bot.reply(message, 'Got it. Your parking place is free for today and '+days+' days.');
        })
    });
});

function generateDate(number) {
    return {
        from: "today",
        to: "today + number"
    }
}

controller.hears(['park me'], 'direct_message', function (bot, message) {
    controller.storage.users.all(function (err, all_user_data) {
        for (var i in all_user_data) {
            if (all_user_data[i] && all_user_data[i].hasOwnProperty('status') && !all_user_data[i].status.isbusy)
            {
                all_user_data[i].status.isbusy = true;
                all_user_data[i].status.before = 'today';
                controller.storage.users.save(all_user_data[i], function (err, id) {
                    bot.reply(message, 'You can park at ' + all_user_data[i].parking_number);
                });
                return;
            }
        }

        // couldn't find anything, adding to queue
        if (!controller.storage.teams.get(message.team_id)) {
            team = {
                id: message.team_id,
                userQueue: [message.user]
            };
        } else {
            team = controller.storage.teams.get(message.team_id);
            team.userQueue.push(message.user);
            // console.log('Added user to queue : ' + team);
        }
        controller.storage.teams.save(team, function (err, id) {
            bot.reply(message, 'Sry no free spaces but u re in a queue now my dude : ' + team.userQueue);
        });
    });
});

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
