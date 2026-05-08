class MapScene extends Phaser.Scene{

    constructor(){
        super("MapScene");
    }

    create(){

        this.add.rectangle(640,360,1280,720,0x101010);

        this.add.text(
            420,
            70,
            "VEIL OF ASH",
            {
                fontSize:"60px",
                color:"#ffffff",
                fontFamily:"monospace"
            }
        );

        this.drawPath();

        this.createBossNode(
            250,
            400,
            "FOREST",
            true,
            () => {
                this.scene.start("ForestBossScene");
            }
        );

        this.createBossNode(500,400,"VILLAGE",false);
        this.createBossNode(750,400,"CATHEDRAL",false);
        this.createBossNode(1000,400,"FORTRESS",false);
    }

    drawPath(){

        let g = this.add.graphics();

        g.lineStyle(10,0x444444);

        g.beginPath();

        g.moveTo(250,400);
        g.lineTo(500,400);
        g.lineTo(750,400);
        g.lineTo(1000,400);

        g.strokePath();
    }

    createBossNode(x,y,name,unlocked,callback=null){

        let color = unlocked ? 0x228833 : 0x333333;

        let node = this.add.rectangle(
            x,
            y,
            100,
            100,
            color
        );

        node.setStrokeStyle(6,0xffffff);

        this.add.text(
            x - 45,
            y + 70,
            name,
            {
                fontSize:"22px",
                color:"#ffffff"
            }
        );

        if(unlocked){

            node.setInteractive();

            node.on("pointerover",()=>{

                node.setScale(1.1);
            });

            node.on("pointerout",()=>{

                node.setScale(1);
            });

            node.on("pointerdown",()=>{

                this.cameras.main.fadeOut(1000);

                this.time.delayedCall(1000,()=>{

                    callback();
                });
            });
        }
    }
}

class ForestBossScene extends Phaser.Scene{

    constructor(){
        super("ForestBossScene");
    }

    create(){

        this.graphics = this.add.graphics();

        this.groundY = 580;

        // PLAYER

        this.player = {

            x:200,
            y:this.groundY,

            width:40,
            height:70,

            velocityY:0,

            speed:6,

            jumpForce:-18,

            gravity:0.8,

            onGround:true,

            hp:100,

            dashCooldown:false
        };

        // BOSS

        this.boss = {

            x:950,
            y:350,

            hp:500,

            attackCooldown:false,

            attackPreparing:false,

            floatTime:0
        };

        // INPUTS

        this.cursors = this.input.keyboard.createCursorKeys();

        this.attackKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.J
        );

        this.dashKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.K
        );

        this.specialKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.L
        );

        // COMBAT

        this.playerAttackCooldown = false;

        this.playerSpecialCooldown = false;

        this.slashes = [];

        this.createUI();
    }

    createUI(){

        this.bossName = this.add.text(
            430,
            40,
            "THE MOSS GUARDIAN",
            {
                fontSize:"34px",
                color:"#88ff88",
                fontFamily:"monospace"
            }
        );
    }

    update(){

        this.playerMovement();

        this.updatePhysics();

        this.handleCombat();

        this.updateSlashes();

        this.bossAI();

        this.renderScene();
    }

    playerMovement(){

        if(this.cursors.left.isDown){

            this.player.x -= this.player.speed;
        }

        if(this.cursors.right.isDown){

            this.player.x += this.player.speed;
        }

        if(
            Phaser.Input.Keyboard.JustDown(this.cursors.up)
            &&
            this.player.onGround
        ){

            this.player.velocityY = this.player.jumpForce;

            this.player.onGround = false;
        }

        // DASH

        if(
            Phaser.Input.Keyboard.JustDown(this.dashKey)
            &&
            !this.player.dashCooldown
        ){

            this.player.dashCooldown = true;

            if(this.cursors.left.isDown){

                this.player.x -= 180;
            }
            else{

                this.player.x += 180;
            }

            this.time.delayedCall(700,()=>{

                this.player.dashCooldown = false;
            });
        }
    }

    updatePhysics(){

        this.player.velocityY += this.player.gravity;

        this.player.y += this.player.velocityY;

        if(this.player.y >= this.groundY){

            this.player.y = this.groundY;

            this.player.velocityY = 0;

            this.player.onGround = true;
        }
    }

    handleCombat(){

        // ATAQUE MELEE

        if(
            Phaser.Input.Keyboard.JustDown(this.attackKey)
            &&
            !this.playerAttackCooldown
        ){

            this.playerAttackCooldown = true;

            let distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.boss.x,
                this.boss.y
            );

            if(distance < 170){

                this.boss.hp -= 20;

                this.cameras.main.shake(120,0.003);
            }

            this.time.delayedCall(250,()=>{

                this.playerAttackCooldown = false;
            });
        }

        // CORTE ESPIRITUAL

        if(
            Phaser.Input.Keyboard.JustDown(this.specialKey)
            &&
            !this.playerSpecialCooldown
        ){

            this.playerSpecialCooldown = true;

            this.slashes.push({

                x:this.player.x + 40,
                y:this.player.y - 40,

                speed:14,

                life:80
            });

            this.time.delayedCall(600,()=>{

                this.playerSpecialCooldown = false;
            });
        }
    }

    updateSlashes(){

        for(let i = this.slashes.length - 1; i >= 0; i--){

            let slash = this.slashes[i];

            slash.x += slash.speed;

            slash.life--;

            let distance = Phaser.Math.Distance.Between(
                slash.x,
                slash.y,
                this.boss.x,
                this.boss.y
            );

            if(distance < 100){

                this.boss.hp -= 10;

                this.cameras.main.shake(80,0.002);

                this.slashes.splice(i,1);

                continue;
            }

            if(slash.life <= 0){

                this.slashes.splice(i,1);
            }
        }
    }

    bossAI(){

        this.boss.floatTime += 0.03;

        this.boss.y =
            350
            +
            Math.sin(this.boss.floatTime) * 20;

        // APROXIMAÇÃO

        if(this.player.x < this.boss.x){

            this.boss.x -= 0.4;
        }

        // ATAQUE

        if(!this.boss.attackCooldown){

            this.boss.attackCooldown = true;

            this.boss.attackPreparing = true;

            this.time.delayedCall(700,()=>{

                this.boss.attackPreparing = false;

                let distance = Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    this.boss.x,
                    this.boss.y
                );

                if(distance < 220){

                    this.player.hp -= 20;

                    this.cameras.main.shake(300,0.008);
                }

                this.time.delayedCall(1800,()=>{

                    this.boss.attackCooldown = false;
                });
            });
        }
    }

    renderScene(){

        this.graphics.clear();

        // FUNDO

        this.graphics.fillStyle(0x081208);

        this.graphics.fillRect(0,0,1280,720);

        // LUA

        this.graphics.fillStyle(0xffffff,0.08);

        this.graphics.fillCircle(
            1020,
            120,
            90
        );

        // ÁRVORES

        for(let i=0;i<20;i++){

            this.graphics.fillStyle(0x111111);

            this.graphics.fillRect(
                i * 70,
                0,
                20,
                720
            );
        }

        // CHÃO

        this.graphics.fillStyle(0x1b1b1b);

        this.graphics.fillRect(
            0,
            620,
            1280,
            100
        );

        this.drawPlayer();

        this.drawBoss();

        this.drawSlashes();

        this.drawHealthBars();
    }

    drawPlayer(){

        let x = this.player.x;
        let y = this.player.y;

        // SOMBRA

        this.graphics.fillStyle(0x000000,0.35);

        this.graphics.fillEllipse(
            x,
            610,
            36,
            8
        );

        // CAPA

        this.graphics.fillStyle(0x111111);

        this.graphics.fillTriangle(
            x - 24,y + 20,
            x + 24,y + 20,
            x,y - 8
        );

        // TECIDO INTERNO

        this.graphics.fillStyle(0x1f1f1f);

        this.graphics.fillTriangle(
            x - 16,y + 25,
            x + 16,y + 25,
            x,y - 2
        );

        // CORPO

        this.graphics.fillStyle(0x2d2d2d);

        this.graphics.fillRect(
            x - 10,
            y - 28,
            20,
            30
        );

        // CACHECOL

        this.graphics.fillStyle(0x444444);

        this.graphics.fillRect(
            x - 12,
            y - 30,
            24,
            6
        );

        // MÁSCARA KITSUNE

        this.graphics.fillStyle(0xf5f5f5);

        this.graphics.fillEllipse(
            x,
            y - 45,
            30,
            28
        );

        // ORELHAS

        this.graphics.fillTriangle(
            x - 12,y - 52,
            x - 5,y - 72,
            x - 2,y - 50
        );

        this.graphics.fillTriangle(
            x + 12,y - 52,
            x + 5,y - 72,
            x + 2,y - 50
        );

        // OLHOS

        this.graphics.fillStyle(0x111111);

        this.graphics.fillTriangle(
            x - 10,y - 45,
            x - 3,y - 42,
            x - 10,y - 39
        );

        this.graphics.fillTriangle(
            x + 10,y - 45,
            x + 3,y - 42,
            x + 10,y - 39
        );

        // MARCAS

        this.graphics.fillStyle(0xaa0000);

        this.graphics.fillTriangle(
            x - 13,y - 36,
            x - 7,y - 40,
            x - 9,y - 32
        );

        this.graphics.fillTriangle(
            x + 13,y - 36,
            x + 7,y - 40,
            x + 9,y - 32
        );

        // ESPADA

        this.graphics.lineStyle(4,0xbdbdbd);

        this.graphics.beginPath();

        this.graphics.moveTo(
            x + 10,
            y - 8
        );

        this.graphics.lineTo(
            x + 45,
            y - 36
        );

        this.graphics.strokePath();

        // CABO

        this.graphics.lineStyle(3,0x553311);

        this.graphics.beginPath();

        this.graphics.moveTo(
            x + 6,
            y - 4
        );

        this.graphics.lineTo(
            x + 15,
            y - 12
        );

        this.graphics.strokePath();
    }

    drawBoss(){

        let x = this.boss.x;
        let y = this.boss.y;

        // TELEGRAPH

        if(this.boss.attackPreparing){

            this.graphics.fillStyle(0xff0000,0.15);

            this.graphics.fillCircle(
                x,
                y,
                180
            );
        }

        // AURA

        this.graphics.fillStyle(0x55ff55,0.05);

        this.graphics.fillCircle(
            x,
            y,
            160
        );

        // SOMBRA

        this.graphics.fillStyle(0x000000,0.4);

        this.graphics.fillEllipse(
            x,
            610,
            180,
            35
        );

        // BRAÇOS

        this.graphics.lineStyle(24,0x224422);

        this.graphics.beginPath();

        this.graphics.moveTo(
            x - 70,
            y + 20
        );

        this.graphics.lineTo(
            x - 170,
            y + 110
        );

        this.graphics.strokePath();

        this.graphics.beginPath();

        this.graphics.moveTo(
            x + 70,
            y + 20
        );

        this.graphics.lineTo(
            x + 170,
            y + 110
        );

        this.graphics.strokePath();

        // CORPO

        this.graphics.fillStyle(0x335533);

        this.graphics.fillEllipse(
            x,
            y,
            180,
            220
        );

        // MUSGO

        this.graphics.fillStyle(0x55aa55);

        this.graphics.fillCircle(
            x - 50,
            y - 60,
            24
        );

        this.graphics.fillCircle(
            x + 40,
            y + 20,
            20
        );

        this.graphics.fillCircle(
            x - 20,
            y + 70,
            18
        );

        // CABEÇA

        this.graphics.fillStyle(0x111111);

        this.graphics.fillCircle(
            x,
            y - 90,
            42
        );

        // CHIFRES

        this.graphics.lineStyle(12,0x665533);

        this.graphics.beginPath();
        this.graphics.moveTo(x - 20,y - 110);
        this.graphics.lineTo(x - 80,y - 170);
        this.graphics.strokePath();

        this.graphics.beginPath();
        this.graphics.moveTo(x + 20,y - 110);
        this.graphics.lineTo(x + 80,y - 170);
        this.graphics.strokePath();

        // OLHOS

        this.graphics.fillStyle(0x88ff88);

        this.graphics.fillCircle(
            x - 14,
            y - 95,
            7
        );

        this.graphics.fillCircle(
            x + 14,
            y - 95,
            7
        );
    }

    drawSlashes(){

        for(let slash of this.slashes){

            // AURA

            this.graphics.fillStyle(0x66ccff,0.2);

            this.graphics.fillEllipse(
                slash.x,
                slash.y,
                60,
                24
            );

            // CORTE

            this.graphics.lineStyle(6,0xaaddff);

            this.graphics.beginPath();

            this.graphics.moveTo(
                slash.x - 20,
                slash.y
            );

            this.graphics.lineTo(
                slash.x + 20,
                slash.y
            );

            this.graphics.strokePath();
        }
    }

    drawHealthBars(){

        // PLAYER

        this.graphics.fillStyle(0x222222);

        this.graphics.fillRect(
            20,
            20,
            220,
            24
        );

        this.graphics.fillStyle(0xff4444);

        this.graphics.fillRect(
            20,
            20,
            this.player.hp * 2,
            24
        );

        // BOSS

        this.graphics.fillStyle(0x222222);

        this.graphics.fillRect(
            760,
            20,
            500,
            24
        );

        this.graphics.fillStyle(0x55aa55);

        this.graphics.fillRect(
            760,
            20,
            this.boss.hp,
            24
        );
    }
}

const config = {

    type: Phaser.AUTO,

    width:1280,
    height:720,

    backgroundColor:"#000000",

    pixelArt:true,

    scene:[
        MapScene,
        ForestBossScene
    ]
};

new Phaser.Game(config);