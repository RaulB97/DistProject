var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
      //gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};
 
var platform;
var game = new Phaser.Game(config);
 
function preload() {
	this.load.image('ship', 'assets/spaceShips_001.png');
	this.load.image('otherPlayer', 'assets/enemyBlack5.png');
	this.load.image('star', 'assets/star_gold.png');
	this.load.image('background', 'assets/back.jpg');
	this.load.image('block', 'assets/default.png');
	this.load.spritesheet('ship', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
	this.load.spritesheet("hero", "assets/spritesheets/hero.png", {
		frameWidth: 19,
		frameHeight: 34
	})
}
 
// Used to create game objects.
function create() {
	//let playah = this.physics.add.sprite(20,0, "ship");
	//playah.setGravityY(20);
	this.add.image(400,300,'background');
	// self is used to pass this into functions. Due to scope concerns?
	var self = this;
	this.socket = io();
	this.platform = this.physics.add.group();
	// Does group() create an 'array' type structure?
	this.otherPlayers = this.physics.add.group();
	this.socket.on('currentPlayers', function (players) {
		Object.keys(players).forEach(function (id) {
			if (players[id].playerId === self.socket.id) {
				addPlayer(self, players[id]);
			} else {
				addOtherPlayers(self, players[id]);
			}
		});
	});
	this.socket.on('newPlayer', function (playerInfo) {
		addOtherPlayers(self, playerInfo);
	});
	this.socket.on('disconnect', function (playerId) {
		self.otherPlayers.getChildren().forEach(function (otherPlayer) {
			if (playerId === otherPlayer.playerId) {
				otherPlayer.destroy();
			}
		});
	});

	this.socket.on('playerMoved', function (playerInfo) {
		self.otherPlayers.getChildren().forEach(function (otherPlayer) {
		  if (playerInfo.playerId === otherPlayer.playerId) {
			otherPlayer.setRotation(playerInfo.rotation);
			otherPlayer.setPosition(playerInfo.x, playerInfo.y);
		  }
		});
	});

	this.cursors = this.input.keyboard.createCursorKeys();

	this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
	this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });
  
	this.socket.on('scoreUpdate', function (scores) {
		self.blueScoreText.setText('Blue: ' + scores.blue);
		self.redScoreText.setText('Red: ' + scores.red);
	});
	this.socket.on('starLocation', function (starLocation) {
		if (self.star) self.star.destroy();
		self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
		self.physics.add.overlap(self.hero, self.star, function () {
		  this.socket.emit('starCollected');
		}, null, self);
	});

	//platform = this.physics.add.staticGroup();
	//this.platform.create(400, 568, 'block').setScale(2).refreshBody();//center, a lil higher, block//scale by 2x block will now be 114x114
	//hmm, causes problems
	//self.ship.physics.add.collider(self.ship, self.platform);
}


function update() {
	if (this.hero) {
        if (this.cursors.left.isDown) {
            // this.ship.setAngularVelocity(-150);
            this.hero.setVelocityX(-160);
		} else if (this.cursors.right.isDown) {
            //this.ship.setAngularVelocity(150);
            this.hero.setVelocityX(160);
		} else {
            //this.ship.setAngularVelocity(0);
            this.hero.setVelocityX(0);
		}

        /*if (this.cursors.up.isDown && this.ship.body.touching.down)
        {
            this.ship.setVelocityY(-330);
        }*/

		if (this.cursors.up.isDown) {
            //this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
            this.hero.setVelocityY(-160);
        } else if(this.cursors.down.isDown){ 
            this.hero.setVelocityY(160);
        } else {
			this.hero.setAcceleration(0);
		}
        //	this.physics.world.wrap(this.ship, 5); 

		// emit player movement
		var x = this.hero.x;
		var y = this.hero.y;
		var r = this.hero.rotation;
		if (this.hero.oldPosition && (x !== this.hero.oldPosition.x || y !== this.hero.oldPosition.y || r !== this.hero.oldPosition.rotation)) {
			this.socket.emit('playerMovement', { x: this.hero.x, y: this.hero.y, rotation: this.hero.rotation });
		}

		// save old position data
		this.hero.oldPosition = {
			x: this.hero.x,
			y: this.hero.y,
			rotation: this.hero.rotation
		};
	}
}

function addPlayer(self, playerInfo) {
	// Make sure setDisplaySize matches sprite size.
	self.hero= self.physics.add.sprite(playerInfo.x, playerInfo.y, 'hero').setOrigin(0.5, 0.5).setDisplaySize(19, 34);
	if (playerInfo.team === 'blue') {
		self.hero.setTint(0x0000ff);
	} else {
		self.hero.setTint(0xff0000);
	}
	self.hero.setDrag(100);
	self.hero.setAngularDrag(100);
    self.hero.setMaxVelocity(200);
    self.hero.body.setCollideWorldBounds(true);
    self.hero.onWorldBounds=true;
    self.hero.setBounce(0.1,0.1);
}

function addOtherPlayers(self, playerInfo) {
	const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
	this.anims.create({
		key: "hero_anim",
		frames: this.anims.generateFrameNumbers("hero"),
		frameRate: 60,
		repeat: -1
	})
	if (playerInfo.team === 'blue') {
		otherPlayer.setTint(0x0000ff);
	} else {
		otherPlayer.setTint(0xff0000);
	}
	otherPlayer.playerId = playerInfo.playerId;
	self.otherPlayers.add(otherPlayer);
}
