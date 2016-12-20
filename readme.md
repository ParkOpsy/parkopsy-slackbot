### User structure
```javascript
{
	"id": string,
	"parking_number": number,
	"status": {
		"isbusy": boolean,
		"free_dates": 
		  [{
			  "from": string,
			  "to": string
		  }]
	},
}
```
### Queue structure
```javascript
{
    "users":
        slackMessage[]
}
```
### Commands

<h3>Parking place owners</h3>

* <b>ready [parking number]</b>
	to register as a parking peer or to update your parking number
* <b>not ready</b>
	to remove your parking peer profile
* <b>free</b>
	to share your parking place for today
* <b>free [number of days]</b>
	to share your parking place for today and for [number of days] - 1
* <b>vacations [yyyy-mm-dd] [yyyy-mm-dd]</b>
	to set your parking place status to free for specific dates
* <b>cancel</b>
	to clear up you vacations dates

<h3>Parking place seekers</h3>

* <b>park me</b>
	to recieve a parking place

<h3>Common commands</h3>

* <b>help</b>
* <b>status</b>
