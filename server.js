var express = require('express');
var app = express()
var server = require('http').Server(app)
var io = require('socket.io').listen(server)

var players = {}
var star = {
	x: 350,
	y: 250
}
var scores = {
	blue: 0,
	red: 0
}
var playerCount = 0;

app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});
const port = 3000
server.listen(port, function () {
	console.log(`Listening on ${server.address().port}`);
})

process.on('SIGINT', () => {
	console.log("\nExiting server.")
	process.exit(1)
})


/*MAIN*************************************************************************/
// Each socket is an individual player.
// With the exception of on() calls to connection and disconnect, all other
//  on() and emit() calls are a back and forth between server.js and game.js
io.on('connection', function (socket) {
	addNewPlayer(socket)
	updateNewPlayer(socket)

	// update all other players of the new player
	socket.broadcast.emit('newPlayer', players[socket.id])

	// when a player disconnects, remove them from our players object
	socket.on('disconnect', function () {
		removePlayer(socket)
	})

	socket.on('playerMovement', function (movementData) {
		players[socket.id].x = movementData.x;
		players[socket.id].y = movementData.y;
		players[socket.id].rotation = movementData.rotation;
		// emit a message to all players about the player that moved
		socket.broadcast.emit('playerMoved', players[socket.id]);
	})
	socket.on('starCollected', function () {
		if (players[socket.id].team === 'red') {
			scores.red += 10;
		} else {
			scores.blue += 10;
		}
		// star.x = Math.floor(Math.random() * 700) + 50;
		// star.y = Math.floor(Math.random() * 500) + 50;
		pos = Math.floor((Math.random() * 6));
		switch (pos) {
			case 0:
				star.x = 400;
				star.y = 400;
				break;
			case 1:
				star.x =550;
				star.y = 300;
				break;
			case 2:
				star.x = 100;
				star.y = 200;
				break;
			case 3:
				star.x =350;
				star.y = 250;
				break;
			case 4:
				star.x =540;
				star.y = 150;
				break;
			case 5:
				star.x =250;
				star.y = 100;
				break;
		}
		io.emit('starLocation', star);
		io.emit('scoreUpdate', scores);
	})
})
/*MAIN*END*********************************************************************/

function addNewPlayer(socket) {
	players[socket.id] = {
		rotation: 0,
		x: 50,
		y: 550,
		playerId: socket.id,
		team: (playerCount % 2 == 0) ? 'red' : 'blue'
	}
	playerCount += 1;
	console.log(players[socket.id])
}

// Sends the player, star location, and current score to new player.
function updateNewPlayer(socket) {
	socket.emit('currentPlayers', players)
	socket.emit('starLocation', star)
	socket.emit('scoreUpdate', scores)
}

// Deletes the player object and informs other players to remove the player
//  from their game session. 
function removePlayer(socket) {
	console.log('userID: ' + socket.id + ' disconnected')
	delete players[socket.id]
	io.emit('disconnect', socket.id)
}
