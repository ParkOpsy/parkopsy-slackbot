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


controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function (bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function (err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello. Sorry I dont know your name.');
        }
    });
});

controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            user = {
                id: message.user
            };
        }
        user.name = name;
        controller.storage.users.save(user, function (err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.hears(['ready (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var parking = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user
            };
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
            bot.reply(message, 'Thanks for ready to share your place!');
        });
    });
});

// controller.hears(['free'], 'direct_message,direct_mention,mention', function (bot, message) {
controller.hears(['free (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {

    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            user = {
                id: message.user
            };
        }
        console.log('second');
        console.log(user.name);
        console.log(user.parking_number);
        if (typeof (user.parking_number) == 'undefined') {
            bot.reply('Register park number. /n Type "ready YOUR-PARK-NUMBER"');
            return;
        }
        var days = message.match[1];

        var to;
        if (!days){
             to ="today";
        }else{
            to = "today"+days;
        }

        if (user.hasOwnProperty('status') && user.status.hasOwnProperty('free_dates')){
            user.status.isbusy=true;
            user.status.free_dates.push(generateDate(days));
        }else{
//move from bottom
        }
        user.status = {
                isbusy: true,
                free_dates: [
                    {
                        from: "today",
                        to: to
                    }
                ]
            };

        controller.storage.users.save(user, function (err, id) {
            bot.reply(message, 'Got it. Your parking place is free for today, ' + user.name);
        })
    });
});

function generateDate(number) {
    if (!number){
        number=0;
    }
    return {
        from: "today",
        to: "today + number"
    }
}

controller.hears(['park me'], 'direct_message', function (bot, message) {
    controller.storage.users.all(function (err, all_user_data) {
        for (var i in all_user_data) {
            if (all_user_data[i] && all_user_data[i].hasOwnProperty('status') && !all_user_data[i].status.isbusy) {
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

controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention', function(bot, message) {

    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.name) {
            bot.reply(message, 'Your name is ' + user.name);
        } else {
            bot.startConversation(message, function (err, convo) {
                if (!err) {
                    convo.say('I do not know your name yet!');
                    convo.ask('What should I call you?', function (response, convo) {
                        convo.ask('You want me to call you `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function (response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function (response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function (response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, {'key': 'nickname'}); // store the results in a field called nickname

                    convo.on('end', function (convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function (err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');
                                controller.storage.users.save(user, function (err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                });
                            });


                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
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
