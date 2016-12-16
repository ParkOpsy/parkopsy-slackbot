<h2>User structure</h2>

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
	"desire": boolean
}

<h2>Queue structure</h2>

{
    "users":
        [{
            "id": string,
        }]
}

<h2>Commands</h2>

<h3>Parking place owners</h3>

<b>ready _parking number_</b>
if (user in users already)
    then sent WTF

<b>free</b>

</b>free _number of days</b>
if (queue not empty)
    then sent notifications to users in queue

<b>vacations _date1_ _date2_</b>

<b>cancel</b>
user.status.free_dates = undefined

<h3>Parking place seekers</h3>
<b>park me

if (no available places)
    then user.desire = true

if (success)
    then remove user from queue
