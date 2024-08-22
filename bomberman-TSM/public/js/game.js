var config = {
    type: Phaser.AUTO,
    width: 240,
    height: 240,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: "#000000",
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        },
    },
    pixelArt: true
};

const game = new Phaser.Game(config);

let map;
let tileset;
let groundLayer;
let player;
let cursors;
let bombs;
let canPlaceBomb = true;
let bombKey;

function preload() {
    this.load.image("tiles", "assets/tiles/snes_stage_1.png");
    this.load.tilemapCSV('map', 'assets/tilemaps/bomberman_map.csv');
    this.load.spritesheet('player', 'assets/sprites/snes_white.png', { frameWidth: 17, frameHeight: 26 });
    this.load.spritesheet('bomb', 'assets/sprites/snes_bombs_black.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('fire', 'assets/sprites/snes_flames_red.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('destructibleWall', 'assets/tiles/snes_stage_1.png', { frameWidth: 16, frameHeight: 16 });
    this.load.audio('explosion', 'assets/sounds/explosion.mp3');
    this.load.audio('background', 'assets/sounds/snes_battle_music.mp3');
    this.load.spritesheet('player_red', 'assets/sprites/snes_red.png', { frameWidth: 17, frameHeight: 26 });
    this.load.spritesheet('player_black', 'assets/sprites/snes_black.png', { frameWidth: 17, frameHeight: 26 });
    this.load.spritesheet('player_blue', 'assets/sprites/snes_blue.png', { frameWidth: 17, frameHeight: 26 });
}

function create() {
    // Crear el mapa
    map = this.make.tilemap({ key: 'map', tileWidth: 16, tileHeight: 16 });

    // Añadir el tileset
    tileset = map.addTilesetImage('tiles', 'tiles', 16, 16);

    // Crear la capa del suelo y los muros
    groundLayer = map.createLayer(0, tileset, 0, 0);

    // Ajustar la cámara
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);

    // Configurar colisiones
    groundLayer.setCollisionByProperty({ collides: true });

    // Configurar propiedades de colisión para cada tipo de tile
    map.setCollision([1]); // Colisión para muros indestructibles y destructibles

    // Crear el jugador
    player = this.physics.add.sprite(24, 216, 'player'); // Posición inicial en la esquina inferior izquierda
    player.setCollideWorldBounds(true);
    player.body.setSize(14, 14); // Ajustar el tamaño del cuerpo de colisión
    player.body.setOffset(1, 10); // Ajustar el offset del cuerpo de colisión

    // Configurar colisiones entre el jugador y el mapa
    this.physics.add.collider(player, groundLayer);

    // Configurar controles
    cursors = this.input.keyboard.createCursorKeys();

    // Animaciones del jugador
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    bombs = this.physics.add.group();
    this.physics.add.collider(bombs, groundLayer);
    bombKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.anims.create({
        key: 'bomb',
        frames: this.anims.generateFrameNumbers('bomb', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1
    });

    this.anims.create({
        key: 'fire',
        frames: this.anims.generateFrameNumbers('fire', { start: 0, end: 3 }),
        frameRate: 12,
        repeat: 1
    });

    this.fires = this.physics.add.group();
    this.physics.add.collider(this.fires, groundLayer);
    this.physics.add.overlap(player, this.fires, playerHit, null, this);
    this.fires.setDepth(2); // Asegurarse de que todos los fuegos estén por encima de otros elementos

    // Crear grupo para muros destructibles
    this.destructibleWalls = this.physics.add.staticGroup();

    // Añadir muros destructibles
    for (let y = 1; y < 14; y++) {
        for (let x = 1; x < 14; x++) {
            if (x % 2 === 0 && y % 2 === 0) continue; // Saltar las posiciones de los muros fijos
            if ((x < 3 && y < 3) || (x > 11 && y < 3) || (x < 3 && y > 11) || (x > 11 && y > 11)) continue; // Evitar las esquinas
            if (Math.random() < 0.7) { // 70% de probabilidad de colocar un muro destructible
                const wall = this.destructibleWalls.create(x * 16 + 8, y * 16 + 8, 'destructibleWall', 2); // Usamos el frame 2 (tercer frame)
                wall.setOrigin(0.5);
                wall.setDisplaySize(16, 16);
                wall.refreshBody(); // Actualizar el cuerpo físico
                wall.setDepth(0); // Asignar una profundidad menor a los muros destructibles
            }
        }
    }

    console.log(`Muros destructibles creados: ${this.destructibleWalls.countActive()}`);

    // Añadir colisiones con muros destructibles
    this.physics.add.collider(player, this.destructibleWalls);
    this.physics.add.collider(bombs, this.destructibleWalls);

    player.setDepth(1); // Asignar una profundidad mayor al jugador

    this.explosionSound = this.sound.add('explosion');
    this.backgroundMusic = this.sound.add('background', { loop: true });
    if (!this.sound.get('background').isPlaying) {
        this.backgroundMusic.play();
    }

    this.players = [player];

    // Crear bots
    const botSprites = ['player_red', 'player_black', 'player_blue'];

    for (let i = 0; i < 3; i++) {
        let botX, botY;
        if (i === 0) {
            botX = 216; botY = 24; // Esquina superior derecha
        } else if (i === 1) {
            botX = 24; botY = 24; // Esquina superior izquierda
        } else {
            botX = 216; botY = 216; // Esquina inferior derecha
        }

        let bot = this.physics.add.sprite(botX, botY, botSprites[i]);
        bot.setCollideWorldBounds(true);
        bot.body.setSize(14, 14);
        bot.body.setOffset(1, 10);
        this.physics.add.collider(bot, groundLayer);
        this.physics.add.collider(bot, this.destructibleWalls);
        this.physics.add.overlap(bot, this.fires, playerHit, null, this);

        bot.isBot = true;
        bot.direction = 'down';
        bot.moveTimer = 0;
        bot.bombTimer = 0;

        this.players.push(bot);
    }

    // Crear animaciones para los bots
    const botAnimationKeys = ['left', 'right', 'up', 'down'];
    const startFrames = [3, 9, 0, 6];
    const endFrames = [5, 11, 2, 8];

    botSprites.forEach(spriteKey => {
        botAnimationKeys.forEach((key, index) => {
            this.anims.create({
                key: `${spriteKey}_${key}`,
                frames: this.anims.generateFrameNumbers(spriteKey, { start: startFrames[index], end: endFrames[index] }),
                frameRate: 10,
                repeat: -1
            });
        });
    });
}

function update(time, delta) {
    const speed = 80;

    // Manejo del movimiento del jugador humano
    this.players[0].setVelocity(0);

    if (cursors.left.isDown) {
        this.players[0].setVelocityX(-speed);
        this.players[0].anims.play('left', true);
    } else if (cursors.right.isDown) {
        this.players[0].setVelocityX(speed);
        this.players[0].anims.play('right', true);
    }

    if (cursors.up.isDown) {
        this.players[0].setVelocityY(-speed);
        this.players[0].anims.play('up', true);
    } else if (cursors.down.isDown) {
        this.players[0].setVelocityY(speed);
        this.players[0].anims.play('down', true);
    }

    if (this.players[0].body.velocity.x === 0 && this.players[0].body.velocity.y === 0) {
        this.players[0].anims.stop();
    }

    // Manejo de la colocación de bombas para el jugador humano
    if (Phaser.Input.Keyboard.JustDown(bombKey) && canPlaceBomb) {
        placeBomb(this.players[0]);
    }

    // Actualizar bots
    for (let i = 1; i < this.players.length; i++) {
        updateBot(this.players[i], delta);
    }
}

function updateBot(bot, time) {
    bot.moveTimer += time;
    bot.bombTimer += time;

    if (bot.moveTimer > 1000) { // Cambiar dirección cada segundo
        bot.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
        bot.moveTimer = 0;
    }

    const speed = 80;
    const spriteKey = bot.texture.key;
    switch (bot.direction) {
        case 'left':
            bot.setVelocityX(-speed);
            bot.anims.play(`${spriteKey}_left`, true);
            break;
        case 'right':
            bot.setVelocityX(speed);
            bot.anims.play(`${spriteKey}_right`, true);
            break;
        case 'up':
            bot.setVelocityY(-speed);
            bot.anims.play(`${spriteKey}_up`, true);
            break;
        case 'down':
            bot.setVelocityY(speed);
            bot.anims.play(`${spriteKey}_down`, true);
            break;
    }

    if (bot.bombTimer > 3000 && Math.random() < 0.1) { // 10% de probabilidad de colocar una bomba cada 3 segundos
        placeBomb(bot);
        bot.bombTimer = 0;
    }
}

function placeBomb(player) {
    const bombX = Math.floor(player.x / 16) * 16 + 8;
    const bombY = Math.floor(player.y / 16) * 16 + 8;

    // Verificar si hay un muro destructible en esta posición
    const destructibleWall = game.scene.scenes[0].destructibleWalls.getChildren().find(wall =>
        wall.x === bombX && wall.y === bombY
    );

    if (!destructibleWall && canPlaceBomb) {
        const bomb = bombs.create(bombX, bombY, 'bomb');
        bomb.anims.play('bomb');
        bomb.body.immovable = true;

        canPlaceBomb = false;

        setTimeout(() => {
            bomb.destroy();
            createExplosion(game.scene.scenes[0], bombX, bombY);
        }, 3000);

        setTimeout(() => {
            canPlaceBomb = true;
        }, 3500);
    }
}

function createExplosion(scene, x, y) {
    // Reproducir el sonido
    if (scene.explosionSound) {
        scene.explosionSound.play();
    } else {
        console.error('El sonido de explosión no está disponible');
    }

    const directions = [
        { x: 0, y: 0 },   // Centro
        { x: -16, y: 0 }, // Izquierda
        { x: 16, y: 0 },  // Derecha
        { x: 0, y: -16 }, // Arriba
        { x: 0, y: 16 }   // Abajo
    ];

    directions.forEach(dir => {
        let fireX = x + dir.x;
        let fireY = y + dir.y;

        // Verificar si hay un muro indestructible en esta posición
        const tile = groundLayer.getTileAtWorldXY(fireX, fireY);
        if (tile && tile.index === 1) {
            return; // Si hay un muro indestructible, no crear fuego en esta dirección
        }

        // Verificar si hay un muro destructible en esta posición
        const destructibleWall = scene.destructibleWalls.getChildren().find(wall =>
            wall.x === fireX && wall.y === fireY
        );

        if (destructibleWall) {
            destructibleWall.destroy();
        }

        // Crear fuego
        const fire = scene.fires.create(fireX, fireY, 'fire');
        fire.setDepth(2);
        fire.anims.play('fire', true);
        fire.on('animationcomplete', () => {
            fire.destroy();
        });

        console.log('Fuego creado en:', fireX, fireY);
    });
}

function playerHit(player, fire) {
    if (player === this.players[0]) {  // Si es el jugador humano
        console.log('¡El jugador humano ha sido golpeado!');
        player.setTint(0xff0000);  // Colorear al jugador de rojo
        player.anims.stop();  // Detener la animación del jugador
        this.physics.pause();  // Pausar la física del juego

        // Detener la música de fondo
        stopAndResetMusic(this);

        // Mostrar mensaje de "Game Over"
        let gameOverText = this.add.text(120, 120, 'Game Over', { fontSize: '32px', fill: '#fff' });
        gameOverText.setOrigin(0.5);

        // Reiniciar el juego después de 2 segundos
        this.time.delayedCall(2000, () => {
            restartGame.call(this);
        }, [], this);
    } else {  // Si es un bot
        botHit.call(this, player, fire);
    }
}

function botHit(bot, fire) {
    console.log('¡Un bot ha sido golpeado!');
    bot.destroy();  // Eliminar el bot del juego

    // Eliminar el bot de la lista de jugadores
    const index = this.players.indexOf(bot);
    if (index > -1) {
        this.players.splice(index, 1);
    }

    // Verificar si quedan bots
    if (this.players.length === 1) {
        console.log('¡El jugador humano ha ganado!');
        // Aquí puedes añadir lógica adicional para manejar la victoria del jugador
    }
}

function stopAndResetMusic(scene) {
    if (scene.backgroundMusic) {
        scene.backgroundMusic.stop();
    }
}

function restartGame() {
    this.scene.restart();
}