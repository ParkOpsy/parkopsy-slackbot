## Run
```bash
npm install

set TOKEN=<your bot token>

node slack_bot.js
```

## Workflow
### If you are a parking place peer
Firstly register your parking place with <b>ready to share [your parking place number]</b> command.
Then if you decide to WFH send <b>free</b> command.

### If you are a parking place seeker
Just send <b>park me</b> command to bot. 
If there is no parking places are available you will be added to user queue and receive a notification as soon as any will be.

```The user queue is cleaned up and every free place status is set to busy (if current date is not in free_dates[]) at 23:59.```

## User structure
```javascript
{
	"id": string,
	"parkingPlace": {
        "number": integer,
		"status": string,
		"free_dates": 
		  [{
			  "from": string,
			  "to": string
		  }],
        "tenant": string
	},
}
```
## Queue structure
```javascript
{
    "users":
        slackMessage[]
}
```
## Full list of commands

<h3>Parking place owners</h3>

* <b>ready to share [parking number]</b>
	to register as a parking peer or to update your parking number
* <b>stop sharing</b>
	to remove your parking peer profile
* <b>my info</b>
    to print information about your parking place status and days off
* <b>free</b>
	to share your parking place for today
* <b>free [number of days]</b>
	to share your parking place for today and for [number of days] - 1
* <b>vacations [yyyy-mm-dd] [yyyy-mm-dd]</b>
	to set your parking place status to free for specific dates
* <b>cancel vacations</b>
	to clear up your days off

<h3>Parking place seekers</h3>

* <b>park me</b>
	to receive a parking place

<h3>Common commands</h3>

* <b>help</b> to see available commands 
* <b>status</b> to see if there any free places 
