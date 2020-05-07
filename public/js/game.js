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
 
var game = new Phaser.Game(config);
var platforms;
var player;
 
function preload() {
	this.load.image('ship', 'assets/spaceShips_001.png');
	this.load.image('otherPlayer', 'assets/enemyBlack5.png');
	this.load.image('star', 'assets/star_gold.png');
	this.load.image('background', 'assets/sky.png'); //changed from back.jpg
	this.load.image('ground', 'assets/platform.png');
	this.load.image('hero_jump', 'assets/jump.png');
	this.load.image('hero_jump_left', 'assets/jump_left.png');
	this.load.spritesheet('hero', "assets/spritesheets/hero.png", {
		frameWidth: 19,
		frameHeight: 34
	})
	this.load.spritesheet('hero_left', "assets/spritesheets/hero_left.png", {
		frameWidth: 19,
		frameHeight: 34
	})
	this.load.spritesheet('hero_run', "assets/spritesheets/hero_run.png", {
		frameWidth: 21, frameHeight: 34
	})
	this.load.spritesheet('hero_run_left', "assets/spritesheets/hero_run_left.png", {
		frameWidth: 21, frameHeight: 34
	})
	// using another spritesheet just to test.
	this.load.spritesheet('dude', 
        'assets/dude.png',
		{ frameWidth: 32, frameHeight: 48 }
	);
}
 
// Used to create game objects.
function create() {
	this.add.image(400,300,'background');

	platforms = this.physics.add.staticGroup();
	platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');
    platforms.create(400, 584, 'ground');


	this.anims.create({
		key: 'left',
		frames: this.anims.generateFrameNumbers('hero_run_left', { start: 0, end: 7 }),
		frameRate: 10,
		repeat: -1
	});

	this.anims.create({
		key: 'idle',
		frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 11}),
		frameRate: 20,
		repeat: -1
	});

	this.anims.create({
		key: 'idle_left',
		frames: this.anims.generateFrameNumbers('hero_left', { start: 0, end: 11}),
		frameRate: 20,
		repeat: -1
	});

	this.anims.create({
		key: 'right',
		frames: this.anims.generateFrameNumbers('hero_run', { start: 0, end: 7 }),
		frameRate: 10,
		repeat: -1
	});

	this.anims.create({
		key: 'jump',
		frames: [ { key: 'hero_jump'} ],
		frameRate: 20
	})
	
	this.anims.create({
		key: 'jump_left',
		frames: [ { key: 'hero_jump_left'} ],
		frameRate: 20
	})

	var self = this;
	this.socket = io();
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

}


var direction = true;
function update() {
	if (this.hero) {
        if (this.cursors.left.isDown) {
			//this.hero.scaleX *= -1;
			this.hero.setVelocityX(-160);
			this.hero.anims.play('left', true);
			direction = false;
			
		} else if (this.cursors.right.isDown) {
			this.hero.setVelocityX(160);
			this.hero.anims.play('right', true);
			direction = true;
			
		} else {
			if (direction) {
				this.hero.setVelocityX(0);
				this.hero.anims.play('idle', true);
			} else {
				this.hero.setVelocityX(0);
				this.hero.anims.play('idle_left', true);
			}

			
		}

		if (this.cursors.up.isDown) {
			//this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
			if (direction) {
				this.hero.setVelocityY(-160);
				this.hero.play('jump', true);
			} else {
				this.hero.setVelocityY(-160);
				this.hero.play('jump_left', true);
			}
        } else if(this.cursors.down.isDown){ 
			this.hero.setVelocityY(160);
			
        } else {
			this.hero.setAcceleration(0);

		}

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
	self.hero= self.physics.add.sprite(playerInfo.x, playerInfo.y, 'hero').setOrigin(0.5, 0.5).setDisplaySize(24, 39).setGravityY(1500);
	if (playerInfo.team === 'blue') {
		self.hero.setTint(0x0000ff);
	} else {
		self.hero.setTint(0xff0000);
	}
	self.physics.add.collider(self.hero, platforms);
	self.hero.setDrag(100);
	self.hero.setAngularDrag(100);
    self.hero.setMaxVelocity(200);
    self.hero.body.setCollideWorldBounds(true);
    self.hero.onWorldBounds=true;
	self.hero.setBounce(0.2);
	
}

function addOtherPlayers(self, playerInfo) {
	//const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
	const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'hero').setOrigin(0.5, 0.5).setDisplaySize(24, 39);
	
	if (playerInfo.team === 'blue') {
		otherPlayer.setTint(0x0000ff);
	} else {
		otherPlayer.setTint(0xff0000);
	}
	otherPlayer.playerId = playerInfo.playerId;
	self.otherPlayers.add(otherPlayer);
}
