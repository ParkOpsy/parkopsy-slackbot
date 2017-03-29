## Purpose
ParkOpsy is a chatbot for Slack messager. It can be used to optimize parking place utilization at your company.
It works out of box: just run it and start chatting.

## Run
```bash
npm install

set TOKEN=<your bot token>

node slack_bot.js
```

## Workflow
### Register
Send <b>sign me up</b> message to the bot.

### If you are a parking place owner
If you decided to stay home send <b>free</b> command to the bot.

### If you are a parking place seeker (tenant)
Just send <b>park me</b> command to bot. 
If there are no parking places available you are added to user queue and receive a notification as soon as there will be any.

```The user queue is cleaned up and every free parking place status is set to busy at midnight.```

## Full list of supported commands

* <b>sign me up</b>
	to create account in the system
* <b>update me</b>
    to edit your account
* <b>remove account</b>
	to remove your account
* <b>my info</b>
    to receive your account information
* <b>free</b>
	to share your parking place for today
* <b>park me</b>
	to receive a parking place	
* <b>undo rent</b> and <b>undo free</b>
    to cancel your reservation as a tenant or place sharing as an owner
* <b>vacations start_date end_date</b>
    to add vacations period
* <b>status</b> 
    to see the system status
* <b>help</b> 
    to see available commands 
