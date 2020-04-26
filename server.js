// Comment for the culture.
// One more test comment.
var express= require('express');
var app = express()
// Similar(?) to require('http').createServer(app)
var server = require('http').Server(app)
var io = require('socket.io').listen(server)
var players = {}
var star = {
	x: Math.floor(Math.random() * 700) + 50,
	y: Math.floor(Math.random() * 500) + 50
}
var scores = {
	blue: 0,
	red: 0
}
var playerCount = 0;

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	console.log(__dirname + 'When is this being callled?')
	res.sendFile(__dirname + '/index.html');
});

function addPlayer(socket) {
	players[socket.id] = {
		rotation: 0,
		x: Math.floor(Math.random() * 700) + 50,
		y: Math.floor(Math.random() * 500) + 50,
		playerId: socket.id,
		team: (playerCount % 2 == 0) ? 'red' : 'blue'
	}
	playerCount += 1;
}

function updatePlayer(socket) {
	// send the players object to the new player
	socket.emit('currentPlayers', players)
	// send the star object to the new player
	socket.emit('starLocation', star)
	// send the current scores
	socket.emit('scoreUpdate', scores)
}

function removePlayer(socket) {
	console.log('user disconnected')
	// remove this player from our players object
	delete players[socket.id]
	// emit a message to all players to remove this player
	io.emit('disconnect', socket.id)
}

// Each socket is an individual player.
io.on('connection', function (socket) {
	console.log('Player connected')
	console.log("ID: " + socket.id)

	addPlayer(socket)
	updatePlayer(socket)

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
		star.x = Math.floor(Math.random() * 700) + 50;
		star.y = Math.floor(Math.random() * 500) + 50;
		io.emit('starLocation', star);
		io.emit('scoreUpdate', scores);
	})
})

// The first argument denotes the port to listen to
server.listen(3000, function () {
	console.log(`Listening on ${server.address().port}`);
})
