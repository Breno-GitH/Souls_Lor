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

        // ARENA - ÁRVORES ESCALÁVEIS
        this.platforms = [
            { x: 150, y: 500, width: 60, height: 15 }, // Base esquerda
            { x: 150, y: 350, width: 60, height: 15 }, // Meio esquerda
            { x: 150, y: 200, width: 60, height: 15 }, // Topo esquerda
            { x: 1100, y: 500, width: 60, height: 15 }, // Base direita
            { x: 1100, y: 350, width: 60, height: 15 }, // Meio direita
            { x: 1100, y: 200, width: 60, height: 15 }, // Topo direita
        ];

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

            maxHp:100,

            dashCooldown:false,

            animationTime:0,

            direction:1,

            isAttacking:false,

            attackTime:0,

            onPlatform:null
        };

        // BOSS - GUARDIÃO DA FLORESTA

        this.boss = {

            x:640,
            y:250,

            hp:600,

            maxHp:600,

            attackCooldown:false,

            attackType:0,

            floatTime:0,

            animationTime:0,

            bodyTilt:0,

            coreExposed:false,

            coreExposedTime:0,

            phase:1,

            direction:-1
        };

        // ATAQUES DO BOSS
        this.leafParticles = [];
        this.rootAttacks = [];
        this.dangerZones = [];

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
            380,
            40,
            "THE MOSS GUARDIAN",
            {
                fontSize:"34px",
                color:"#55dd55",
                fontFamily:"monospace"
            }
        );

        this.phaseText = this.add.text(
            640,
            680,
            "PHASE 1",
            {
                fontSize:"18px",
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

        this.updateLeafParticles();

        this.updateRootAttacks();

        this.updateDangerZones();

        this.bossAI();

        this.checkGameOver();

        this.renderScene();
    }

    updateLeafParticles() {
        for(let i = this.leafParticles.length - 1; i >= 0; i--) {
            let leaf = this.leafParticles[i];
            leaf.x += leaf.vx;
            leaf.y += leaf.vy;
            leaf.life--;

            // Colisão com player
            let dist = Phaser.Math.Distance.Between(leaf.x, leaf.y, this.player.x, this.player.y);
            if(dist < 30) {
                this.player.hp -= 3;
                this.leafParticles.splice(i, 1);
            }

            if(leaf.y > 720 || leaf.life <= 0) {
                this.leafParticles.splice(i, 1);
            }
        }
    }

    updateRootAttacks() {
        for(let i = this.rootAttacks.length - 1; i >= 0; i--) {
            let root = this.rootAttacks[i];
            root.growthTime++;
            root.size = (root.growthTime / root.maxGrowthTime) * 60;

            if(root.growthTime > root.maxGrowthTime + 30) {
                this.rootAttacks.splice(i, 1);
            }
        }
    }

    updateDangerZones() {
        for(let i = this.dangerZones.length - 1; i >= 0; i--) {
            let zone = this.dangerZones[i];
            zone.duration--;

            // Verificar colisão com player (se não estiver em plataforma)
            if(this.player.onPlatform === null && this.player.y > zone.y - 50) {
                this.player.hp -= 2;
            }

            if(zone.duration <= 0) {
                this.dangerZones.splice(i, 1);
            }
        }
    }

    checkGameOver() {
        if(this.player.hp <= 0) {
            this.player.hp = 0;
            this.cameras.main.fadeOut(500);
            this.time.delayedCall(500, ()=> {
                this.scene.start("MapScene");
            });
        }

        if(this.boss.hp <= 0) {
            this.boss.hp = 0;
            this.cameras.main.fadeOut(500);
            this.time.delayedCall(500, ()=> {
                this.scene.start("MapScene");
            });
        }
    }

    playerMovement(){

        let wasOnPlatform = this.player.onPlatform !== null;

        // VERIFICAR SE ESTÁ EM PLATAFORMA
        this.player.onPlatform = null;
        for(let platform of this.platforms) {
            if(
                this.player.x > platform.x - platform.width / 2 &&
                this.player.x < platform.x + platform.width / 2 &&
                this.player.y >= platform.y - 20 &&
                this.player.y <= platform.y &&
                this.player.velocityY >= 0
            ) {
                this.player.onPlatform = platform;
                this.player.y = platform.y;
                this.player.velocityY = 0;
                this.player.onGround = true;
                break;
            }
        }

        // VERIFICAR CHÃO NORMAL
        if(!this.player.onPlatform && this.player.y >= this.groundY) {
            this.player.y = this.groundY;
            this.player.velocityY = 0;
            this.player.onGround = true;
        } else if(this.player.y > this.groundY) {
            this.player.y = this.groundY;
            this.player.velocityY = 0;
            this.player.onGround = true;
        }

        // MOVIMENTAÇÃO HORIZONTAL
        if(this.cursors.left.isDown){

            this.player.x -= this.player.speed;

            this.player.direction = -1;

            this.player.animationTime += 0.15;
        }

        if(this.cursors.right.isDown){

            this.player.x += this.player.speed;

            this.player.direction = 1;

            this.player.animationTime += 0.15;
        }

        if(!this.cursors.left.isDown && !this.cursors.right.isDown) {
            this.player.animationTime *= 0.92;
        }

        // PULO
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

        // LIMITES DE TELA
        if(this.player.x < 20) this.player.x = 20;
        if(this.player.x > 1260) this.player.x = 1260;
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

            this.player.isAttacking = true;

            this.player.attackTime = 0;

            let distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.boss.x,
                this.boss.y
            );

            // Verificar se acertou o núcleo exposto
            if(distance < 150 && this.boss.coreExposed) {

                this.boss.hp -= 30;

                this.cameras.main.shake(150,0.004);

                this.boss.coreExposedTime = 0; // Fechar núcleo
            }

            this.time.delayedCall(250,()=>{

                this.player.isAttacking = false;

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

        this.boss.animationTime += 0.04;

        // VERIFICAR FASE 2
        if(this.boss.hp < this.boss.maxHp * 0.4 && this.boss.phase === 1) {
            this.boss.phase = 2;
            this.phaseText.setText("PHASE 2 - ENRAGED");
            this.phaseText.setColor("#ff6655");
        }

        // MOVIMENTO BASE - FLUTUAÇÃO
        let baseY = this.boss.phase === 1 ? 280 : 260;
        this.boss.y = baseY + Math.sin(this.boss.floatTime) * 12;

        // INCLINAÇÃO DO CORPO
        if(this.player.x < this.boss.x) {
            this.boss.bodyTilt = -5;
        } else {
            this.boss.bodyTilt = 5;
        }

        // NÚCLEO EXPOSTO POR UM TEMPO
        if(this.boss.coreExposed) {
            this.boss.coreExposedTime++;
            if(this.boss.coreExposedTime > 120) {
                this.boss.coreExposed = false;
            }
        }

        // ATAQUE DO BOSS
        if(!this.boss.attackCooldown){

            this.boss.attackCooldown = true;

            let attackDuration = 800;

            if(this.boss.phase === 1) {
                this.boss.attackType = Phaser.Math.Between(0, 3);
            } else {
                this.boss.attackType = Phaser.Math.Between(0, 4);
            }

            // ATAQUE 1: CHUVA DE FOLHAS
            if(this.boss.attackType === 0) {
                this.startLeafRain();
                attackDuration = 2000;
            }
            // ATAQUE 2: RAÍZES PERFURANTES
            else if(this.boss.attackType === 1) {
                this.startRootAttack();
                attackDuration = 1200;
            }
            // ATAQUE 3: EXPANSÃO FLORESTAL
            else if(this.boss.attackType === 2) {
                this.startForestExpansion();
                attackDuration = 1800;
            }
            // ATAQUE 4: INVESTIDA ANCESTRAL
            else if(this.boss.attackType === 3) {
                this.startAncestralCharge();
                attackDuration = 1500;
            }

            this.time.delayedCall(attackDuration, ()=>{

                this.boss.attackCooldown = false;

                // Chance de expor núcleo
                if(Math.random() < 0.4) {
                    this.boss.coreExposed = true;
                    this.boss.coreExposedTime = 0;
                }
            });
        }
    }

    startLeafRain() {
        // Criar tempestade de folhas
        for(let i = 0; i < 20; i++) {
            this.time.delayedCall(i * 60, ()=>{
                let leafX = Phaser.Math.Between(100, 1180);
                this.leafParticles.push({
                    x: leafX,
                    y: 0,
                    vx: Phaser.Math.Between(-2, 2),
                    vy: 6,
                    life: 120,
                    radius: Phaser.Math.Between(6, 12)
                });
            });
        }
    }

    startRootAttack() {
        // Raízes surgem do chão
        let baseX = this.boss.x;
        
        for(let i = 0; i < 5; i++) {
            let rootX = baseX + (i - 2) * 150;
            
            this.time.delayedCall(i * 150, ()=>{
                this.rootAttacks.push({
                    x: rootX,
                    y: 580,
                    growthTime: 0,
                    maxGrowthTime: 30,
                    size: 0,
                    active: true
                });

                // Verificar colisão com player
                this.time.delayedCall(150, ()=>{
                    let dist = Math.abs(this.player.x - rootX);
                    if(dist < 80 && this.player.y > 500) {
                        this.player.hp -= 15;
                        this.cameras.main.shake(200, 0.005);
                    }
                });
            });
        }
    }

    startForestExpansion() {
        // Raízes cobrem quase todo o chão
        this.dangerZones.push({
            y: 550,
            intensity: 1,
            duration: 120
        });
    }

    startAncestralCharge() {
        // Boss carrega e investe
        let startX = this.boss.x;
        let targetX = this.player.x;
        let chargeSpeed = 15;
        let chargeDistance = Math.abs(targetX - startX);
        let chargeDuration = chargeDistance / chargeSpeed;

        for(let i = 0; i < 20; i++) {
            this.time.delayedCall(i * 20, ()=>{
                let progress = Math.min(i * 20 / 600, 1);
                this.boss.x = startX + (targetX - startX) * progress;
            });
        }

        // Deixar núcleo exposto após a carga
        this.time.delayedCall(600, ()=>{
            this.boss.coreExposed = true;
            this.boss.coreExposedTime = 0;
            this.boss.x = startX;
        });
    }

    renderScene(){

        this.graphics.clear();

        // FUNDO FLORESTA ANCESTRAL
        this.graphics.fillStyle(0x0a1f0a);
        this.graphics.fillRect(0,0,1280,720);

        // LUA GRANDE
        this.graphics.fillStyle(0xffffff,0.06);
        this.graphics.fillCircle(1050, 100, 100);

        // NEBLINA
        this.graphics.fillStyle(0x1a3a1a, 0.15);
        for(let i = 0; i < 5; i++) {
            this.graphics.fillRect(0, i * 144, 1280, 50);
        }

        // ÁRVORES ESCALÁVEIS E PLATAFORMAS
        this.drawArena();

        // CHÃO
        this.graphics.fillStyle(0x1b2a1b);
        this.graphics.fillRect(0, 600, 1280, 120);

        // Textura de folhas no chão
        this.graphics.fillStyle(0x2d4a2d, 0.3);
        for(let i = 0; i < 20; i++) {
            this.graphics.fillRect(i * 64, 600, 30, 120);
        }

        // RAÍZES GIGANTES DECORATIVAS
        this.drawDecoRoots();

        // PLAYER
        this.drawPlayer();

        // BOSS
        this.drawBoss();

        // EFEITOS DE ATAQUE
        this.drawLeafParticles();
        this.drawRootAttacks();
        this.drawDangerZones();

        // SLASHES
        this.drawSlashes();

        // BARRAS DE VIDA
        this.drawHealthBars();
    }

    drawArena() {
        // ÁRVORE ESQUERDA
        this.drawTree(150, 200, 80, 400);

        // ÁRVORE DIREITA
        this.drawTree(1100, 200, 80, 400);

        // ÁRVORE CENTRAL (menor)
        this.drawTree(640, 280, 60, 300);

        // PLATAFORMAS VISÍVEIS
        for(let platform of this.platforms) {
            this.graphics.fillStyle(0x5a4830);
            this.graphics.fillRect(
                platform.x - platform.width / 2,
                platform.y,
                platform.width,
                platform.height
            );

            // Musgo na plataforma
            this.graphics.fillStyle(0x55aa55, 0.4);
            this.graphics.fillRect(
                platform.x - platform.width / 2 + 2,
                platform.y - 3,
                platform.width - 4,
                3
            );
        }
    }

    drawTree(x, y, width, height) {
        // TRONCO
        this.graphics.fillStyle(0x3a2817);
        this.graphics.fillRect(x - width / 2, y, width, height);

        // CASCA RACHADA
        this.graphics.lineStyle(2, 0x1a1a0a, 0.5);
        for(let i = 0; i < 4; i++) {
            this.graphics.beginPath();
            this.graphics.moveTo(x - width / 2 + i * width / 4, y);
            this.graphics.lineTo(x - width / 2 + i * width / 4 + Phaser.Math.Between(-5, 5), y + height);
            this.graphics.strokePath();
        }

        // GALHOS
        this.graphics.lineStyle(12, 0x4a3820);
        
        // Galho superior esquerdo
        this.graphics.beginPath();
        this.graphics.moveTo(x - width / 2, y + 60);
        this.graphics.lineTo(x - width * 1.5, y + 20);
        this.graphics.stroke();

        // Galho superior direito
        this.graphics.beginPath();
        this.graphics.moveTo(x + width / 2, y + 60);
        this.graphics.lineTo(x + width * 1.5, y + 20);
        this.graphics.stroke();

        // Galho médio
        this.graphics.beginPath();
        this.graphics.moveTo(x - width / 2, y + height / 2);
        this.graphics.lineTo(x - width * 1.3, y + height / 2 - 40);
        this.graphics.stroke();

        // FOLHAGEM (topo)
        this.graphics.fillStyle(0x2d5f2d, 0.6);
        this.graphics.fillCircle(x, y - 30, 60);
        this.graphics.fillCircle(x - 50, y, 40);
        this.graphics.fillCircle(x + 50, y, 40);

        // MUSGO
        this.graphics.fillStyle(0x55aa55, 0.5);
        this.graphics.fillCircle(x - 20, y + 150, 15);
        this.graphics.fillCircle(x + 25, y + 250, 12);
    }

    drawDecoRoots() {
        this.graphics.lineStyle(8, 0x2d4a2d, 0.5);

        // Raízes saindo da esquerda
        this.graphics.beginPath();
        this.graphics.moveTo(0, 600);
        this.graphics.lineTo(75, 575);
        this.graphics.lineTo(150, 500);
        this.graphics.strokePath();

        // Raízes saindo do centro
        this.graphics.beginPath();
        this.graphics.moveTo(640, 650);
        this.graphics.lineTo(600, 625);
        this.graphics.lineTo(500, 580);
        this.graphics.strokePath();

        this.graphics.beginPath();
        this.graphics.moveTo(640, 650);
        this.graphics.lineTo(680, 625);
        this.graphics.lineTo(800, 580);
        this.graphics.strokePath();

        // Raízes saindo da direita
        this.graphics.beginPath();
        this.graphics.moveTo(1280, 600);
        this.graphics.lineTo(1205, 575);
        this.graphics.lineTo(1150, 500);
        this.graphics.strokePath();
    }

    drawLeafParticles() {
        for(let leaf of this.leafParticles) {
            this.graphics.fillStyle(0x66dd00, Math.max(0, leaf.life / 120));

            // Forma de folha - triângulo rotacionado
            let angle = Math.random() * Math.PI * 2;
            let p1x = leaf.x + Math.cos(angle) * leaf.radius;
            let p1y = leaf.y + Math.sin(angle) * leaf.radius;
            let p2x = leaf.x + Math.cos(angle + 2.1) * leaf.radius;
            let p2y = leaf.y + Math.sin(angle + 2.1) * leaf.radius;
            let p3x = leaf.x + Math.cos(angle + 4.2) * leaf.radius;
            let p3y = leaf.y + Math.sin(angle + 4.2) * leaf.radius;

            this.graphics.fillTriangle(p1x, p1y, p2x, p2y, p3x, p3y);

            // Brilho
            this.graphics.fillStyle(0xffff88, Math.max(0, leaf.life / 200));
            this.graphics.fillCircle(leaf.x + 2, leaf.y - 2, 2);
        }
    }

    drawRootAttacks() {
        for(let root of this.rootAttacks) {
            let progress = root.growthTime / root.maxGrowthTime;

            // Base da raiz
            this.graphics.fillStyle(0x4a3820);
            this.graphics.fillRect(root.x - 25, 580 - root.size, 50, root.size);

            // Brilho verde nas fendas
            if(progress > 0.3) {
                this.graphics.lineStyle(3, 0x44dd44, progress * 0.7);
                this.graphics.beginPath();
                this.graphics.moveTo(root.x - 10, 580 - root.size);
                this.graphics.lineTo(root.x - 10, 580);
                this.graphics.strokePath();

                this.graphics.beginPath();
                this.graphics.moveTo(root.x + 10, 580 - root.size);
                this.graphics.lineTo(root.x + 10, 580);
                this.graphics.strokePath();
            }
        }
    }

    drawDangerZones() {
        for(let zone of this.dangerZones) {
            let intensity = zone.duration / 120;
            this.graphics.fillStyle(0xff4444, intensity * 0.3);
            this.graphics.fillRect(0, zone.y - 40, 1280, 80);

            // Aviso de raízes
            this.graphics.lineStyle(3, 0xff6655, intensity);
            for(let i = 0; i < 20; i++) {
                this.graphics.beginPath();
                this.graphics.moveTo(i * 64, zone.y);
                this.graphics.lineTo(i * 64 + 32, zone.y - 20);
                this.graphics.strokePath();
            }
        }
    }

    drawPlayer(){

        let x = this.player.x;
        let y = this.player.y;
        let flip = this.player.direction; // 1 = direita, -1 = esquerda

        // SOMBRA

        this.graphics.fillStyle(0x000000,0.35);

        this.graphics.fillEllipse(
            x,
            610,
            36,
            8
        );

        // PERNAS (animadas ao andar) - com mais peso
        let legSwing = Math.sin(this.player.animationTime) * 10;
        let legSwingOff = Math.sin(this.player.animationTime + Math.PI) * 10;
        let bodyTilt = Math.sin(this.player.animationTime * 0.5) * 2; // Inclinação corporal

        // Perna esquerda
        this.graphics.lineStyle(9, 0x2d2d2d);
        this.graphics.beginPath();
        this.graphics.moveTo(x - 6 * flip, y);
        this.graphics.lineTo(x - 6 * flip + legSwing * flip, y + 30);
        this.graphics.strokePath();

        // Perna direita
        this.graphics.lineStyle(9, 0x2d2d2d);
        this.graphics.beginPath();
        this.graphics.moveTo(x + 6 * flip, y);
        this.graphics.lineTo(x + 6 * flip + legSwingOff * flip, y + 30);
        this.graphics.strokePath();

        // CAPA COM BALANÇO
        let capeWave = Math.sin(this.player.animationTime * 0.8) * 2;

        this.graphics.fillStyle(0x111111);

        this.graphics.fillTriangle(
            x - 24 * flip,y + 20 + capeWave,
            x + 24 * flip,y + 20 + capeWave * 0.5,
            x + capeWave * flip,y - 8
        );

        // TECIDO INTERNO

        this.graphics.fillStyle(0x1f1f1f);

        this.graphics.fillTriangle(
            x - 16 * flip,y + 25,
            x + 16 * flip,y + 25,
            x,y - 2
        );

        // CORPO COM INCLINAÇÃO

        this.graphics.fillStyle(0x2d2d2d);

        this.graphics.fillRect(
            x - 10 * flip,
            y - 28 + bodyTilt,
            20 * flip,
            30
        );

        // OMBRO (melhor articulação)
        this.graphics.fillStyle(0x3a3a3a);
        this.graphics.fillCircle(x - 12 * flip, y - 20, 6);

        // BRAÇOS (animados COM PESO)
        let armSwing = Math.sin(this.player.animationTime * 1.2) * 12;
        let armSwingOff = Math.sin(this.player.animationTime * 1.2 + Math.PI) * 12;

        // Braço esquerdo
        this.graphics.lineStyle(8, 0x2d2d2d);
        this.graphics.beginPath();
        this.graphics.moveTo(x - 12 * flip, y - 18);
        this.graphics.lineTo(x - 32 * flip + armSwing * flip, y - 12);
        this.graphics.strokePath();

        // Detalhe de cotovelo
        this.graphics.fillStyle(0x3a3a3a);
        let elbowX = x - 22 * flip + armSwing * flip * 0.5;
        this.graphics.fillCircle(elbowX, y - 15, 4);

        // Braço direito (durante ataque, segue a espada)
        if(this.player.isAttacking) {
            this.player.attackTime += 1;
            let attackProgress = Math.min(this.player.attackTime / 8, 1);
            let armRotation = Math.sin(attackProgress * Math.PI) * 35;
            this.graphics.lineStyle(8, 0x2d2d2d);
            this.graphics.beginPath();
            this.graphics.moveTo(x + 12 * flip, y - 18);
            this.graphics.lineTo(x + 32 * flip + armRotation * 0.8 * flip, y - 12 - armRotation);
            this.graphics.strokePath();

            // Cotovelo em ataque
            this.graphics.fillStyle(0x3a3a3a);
            this.graphics.fillCircle(x + 20 * flip + armRotation * 0.4 * flip, y - 15 - armRotation * 0.3, 4);
        } else {
            this.graphics.lineStyle(8, 0x2d2d2d);
            this.graphics.beginPath();
            this.graphics.moveTo(x + 12 * flip, y - 18);
            this.graphics.lineTo(x + 32 * flip + armSwingOff * flip, y - 12);
            this.graphics.strokePath();

            // Cotovelo em repouso
            this.graphics.fillStyle(0x3a3a3a);
            let elbowX2 = x + 22 * flip + armSwingOff * flip * 0.5;
            this.graphics.fillCircle(elbowX2, y - 15, 4);
        }

        // CACHECOL

        this.graphics.fillStyle(0x444444);

        this.graphics.fillRect(
            x - 12 * flip,
            y - 30,
            24 * flip,
            6
        );

        // MÁSCARA KITSUNE (virada)

        this.graphics.fillStyle(0xf5f5f5);

        this.graphics.fillEllipse(
            x,
            y - 45,
            30,
            28
        );

        // ORELHAS (flipadas)

        this.graphics.fillTriangle(
            x - 12 * flip,y - 52,
            x - 5 * flip - 10 * flip,y - 72,
            x - 2 * flip,y - 50
        );

        this.graphics.fillTriangle(
            x + 12 * flip,y - 52,
            x + 5 * flip + 10 * flip,y - 72,
            x + 2 * flip,y - 50
        );

        // OLHOS (flipados)

        this.graphics.fillStyle(0x111111);

        this.graphics.fillTriangle(
            x - 10 * flip,y - 45,
            x - 3 * flip,y - 42,
            x - 10 * flip,y - 39
        );

        this.graphics.fillTriangle(
            x + 10 * flip,y - 45,
            x + 3 * flip,y - 42,
            x + 10 * flip,y - 39
        );

        // MARCAS (flipadas)

        this.graphics.fillStyle(0xaa0000);

        this.graphics.fillTriangle(
            x - 13 * flip,y - 36,
            x - 7 * flip,y - 40,
            x - 9 * flip,y - 32
        );

        this.graphics.fillTriangle(
            x + 13 * flip,y - 36,
            x + 7 * flip,y - 40,
            x + 9 * flip,y - 32
        );

        // ESPADA COM ANIMAÇÃO DE ATAQUE (flipada)
        let swordX, swordY, swordEndX, swordEndY;

        if(this.player.isAttacking) {
            // Durante ataque, espada move em arco
            let attackProgress = Math.min(this.player.attackTime / 8, 1);
            let swordRotation = Math.sin(attackProgress * Math.PI) * 50;
            let swordLift = Math.sin(attackProgress * Math.PI) * 40;
            
            swordX = x + 10 * flip;
            swordY = y - 8;
            swordEndX = x + 45 * flip + swordRotation * flip;
            swordEndY = y - 36 - swordLift;
        } else {
            // Posição normal - com ligeiro balanço
            let swordSway = Math.sin(this.player.animationTime * 0.5) * 2;
            swordX = x + 10 * flip;
            swordY = y - 8 + swordSway;
            swordEndX = x + 45 * flip;
            swordEndY = y - 36 + swordSway;
        }

        this.graphics.lineStyle(5, 0xbdbdbd);
        this.graphics.beginPath();
        this.graphics.moveTo(swordX, swordY);
        this.graphics.lineTo(swordEndX, swordEndY);
        this.graphics.strokePath();

        // LÂMINA COM BRILHO DINÂMICO
        let bladeGlow = Math.sin(this.player.animationTime * 2) * 0.2 + 0.3;
        this.graphics.lineStyle(2, 0xffffff, bladeGlow);
        this.graphics.beginPath();
        this.graphics.moveTo(swordX, swordY);
        this.graphics.lineTo(swordEndX, swordEndY);
        this.graphics.strokePath();

        // CABO

        this.graphics.lineStyle(3, 0x553311);

        this.graphics.beginPath();

        this.graphics.moveTo(
            x + 6 * flip,
            y - 4
        );

        this.graphics.lineTo(
            x + 15 * flip,
            y - 12
        );

        this.graphics.strokePath();

        // IDLE BREATHING
        let breathing = Math.sin(this.player.animationTime * 0.3) * 1;
        if(this.player.animationTime < 0.2) {
            this.graphics.fillStyle(0xff8888, 0.15);
            this.graphics.fillCircle(x, y - 45, 8 + breathing);
        }
    }

    drawBoss(){

        let x = this.boss.x;
        let y = this.boss.y;

        // SOMBRA
        this.graphics.fillStyle(0x000000,0.5);
        this.graphics.fillEllipse(x, 620, 200, 40);

        // PERNAS - TRONCOS DE ÁRVORE
        let legSwing = Math.sin(this.boss.animationTime * 0.3) * 8;

        // Perna esquerda
        this.graphics.fillStyle(0x3a2817);
        this.graphics.beginPath();
        this.graphics.moveTo(x - 60, y + 110);
        this.graphics.lineTo(x - 60 + legSwing, y + 180);
        this.graphics.closePath();
        this.graphics.fill();

        // Textura de casca
        this.graphics.lineStyle(2, 0x1a1a0a, 0.4);
        this.graphics.beginPath();
        this.graphics.moveTo(x - 58, y + 110);
        this.graphics.lineTo(x - 58 + legSwing, y + 180);
        this.graphics.strokePath();

        // Perna direita
        this.graphics.fillStyle(0x3a2817);
        this.graphics.beginPath();
        this.graphics.moveTo(x + 60, y + 110);
        this.graphics.lineTo(x + 60 - legSwing, y + 180);
        this.graphics.closePath();
        this.graphics.fill();

        this.graphics.lineStyle(2, 0x1a1a0a, 0.4);
        this.graphics.beginPath();
        this.graphics.moveTo(x + 58, y + 110);
        this.graphics.lineTo(x + 58 - legSwing, y + 180);
        this.graphics.strokePath();

        // BRAÇOS - LONGOS E PESADOS
        let armSwing = Math.sin(this.boss.animationTime) * 20;
        let armLift = Math.cos(this.boss.animationTime * 0.7) * 15;

        // Braço esquerdo
        this.graphics.lineStyle(28, 0x5a4830);
        this.graphics.beginPath();
        this.graphics.moveTo(x - 80, y);
        this.graphics.lineTo(x - 150 + armSwing, y + 40 - armLift);
        this.graphics.lineTo(x - 180 + armSwing, y + 120);
        this.graphics.strokePath();

        // Raízes no braço esquerdo
        this.graphics.lineStyle(3, 0x2d5f2d, 0.6);
        this.graphics.beginPath();
        this.graphics.moveTo(x - 100, y + 10);
        this.graphics.lineTo(x - 140 + armSwing, y + 50 - armLift);
        this.graphics.strokePath();

        // Braço direito
        this.graphics.lineStyle(28, 0x5a4830);
        this.graphics.beginPath();
        this.graphics.moveTo(x + 80, y);
        this.graphics.lineTo(x + 150 - armSwing, y + 40 + armLift);
        this.graphics.lineTo(x + 180 - armSwing, y + 120);
        this.graphics.strokePath();

        // Raízes no braço direito
        this.graphics.lineStyle(3, 0x2d5f2d, 0.6);
        this.graphics.beginPath();
        this.graphics.moveTo(x + 100, y + 10);
        this.graphics.lineTo(x + 140 - armSwing, y + 50 + armLift);
        this.graphics.strokePath();

        // CORPO PRINCIPAL - CASCA DE MADEIRA
        this.graphics.fillStyle(0x4a3820);
        this.graphics.fillEllipse(x, y + 20, 140, 160);
        this.graphics.fill();

        // RACHURAS NA CASCA COM BRILHO VERDE
        this.graphics.lineStyle(4, 0x44dd44, 0.6);
        this.graphics.beginPath();
        this.graphics.moveTo(x - 80, y - 30);
        this.graphics.lineTo(x - 90, y + 50);
        this.graphics.strokePath();

        this.graphics.beginPath();
        this.graphics.moveTo(x + 80, y - 20);
        this.graphics.lineTo(x + 100, y + 60);
        this.graphics.strokePath();

        this.graphics.beginPath();
        this.graphics.moveTo(x - 30, y - 60);
        this.graphics.lineTo(x - 20, y + 80);
        this.graphics.strokePath();

        // MUSGO E DETALHES
        this.graphics.fillStyle(0x55aa55, 0.7);
        this.graphics.fillCircle(x - 100, y - 20, 20);
        this.graphics.fillCircle(x + 90, y + 30, 18);
        this.graphics.fillCircle(x - 50, y + 100, 16);
        this.graphics.fillCircle(x + 60, y - 50, 14);

        // FOLHAS NA ESTRUTURA
        this.graphics.fillStyle(0x66dd00, 0.5);
        for(let i = 0; i < 8; i++) {
            let lx = x + Math.cos(this.boss.animationTime + i) * 100;
            let ly = y + Math.sin(this.boss.animationTime * 0.5 + i) * 80;
            this.graphics.fillTriangle(lx, ly, lx + 8, ly + 4, lx + 4, ly - 6);
        }

        // CABEÇA
        this.graphics.fillStyle(0x2a1810);
        this.graphics.fillCircle(x, y - 110, 50);

        // CHIFRES - GALHOS ANTIGOS
        this.graphics.lineStyle(16, 0x8b7355);
        
        // Chifre esquerdo
        this.graphics.beginPath();
        this.graphics.moveTo(x - 30, y - 130);
        this.graphics.lineTo(x - 80, y - 180);
        this.graphics.lineTo(x - 90, y - 220);
        this.graphics.strokePath();

        // Chifre direito
        this.graphics.beginPath();
        this.graphics.moveTo(x + 30, y - 130);
        this.graphics.lineTo(x + 80, y - 180);
        this.graphics.lineTo(x + 90, y - 220);
        this.graphics.strokePath();

        // OLHOS VERDES BRILHANTES
        let eyeGlow = Math.sin(this.boss.animationTime * 2) * 0.3 + 0.6;
        this.graphics.fillStyle(0x00ff00, eyeGlow);
        this.graphics.fillCircle(x - 18, y - 115, 10);
        this.graphics.fillCircle(x + 18, y - 115, 10);

        // PUPILAS
        this.graphics.fillStyle(0x000000);
        this.graphics.fillCircle(x - 18 + Math.sin(this.boss.animationTime * 3) * 3, y - 115, 5);
        this.graphics.fillCircle(x + 18 + Math.sin(this.boss.animationTime * 3) * 3, y - 115, 5);

        // NÚCLEO ESPIRITUAL (quando exposto)
        if(this.boss.coreExposed) {
            let corePulse = Math.sin(this.boss.animationTime * 4) * 0.3 + 0.7;
            
            // Fenda no peito
            this.graphics.fillStyle(0x000000, 0.8);
            this.graphics.fillEllipse(x, y + 30, 60, 80);

            // Núcleo brilhante
            this.graphics.fillStyle(0x00ff66, corePulse);
            this.graphics.fillCircle(x, y + 30, 30);

            // Raízes luminosas ao redor do núcleo
            this.graphics.lineStyle(3, 0x44ff44, corePulse);
            for(let i = 0; i < 6; i++) {
                let angle = (i / 6) * Math.PI * 2;
                let startX = x + Math.cos(angle) * 25;
                let startY = y + 30 + Math.sin(angle) * 25;
                let endX = x + Math.cos(angle) * 50;
                let endY = y + 30 + Math.sin(angle) * 50;

                this.graphics.beginPath();
                this.graphics.moveTo(startX, startY);
                this.graphics.lineTo(endX, endY);
                this.graphics.strokePath();
            }

            // Aviso visual
            this.graphics.lineStyle(2, 0xff6600, 0.8);
            this.graphics.strokeCircle(x, y + 30, 70);
        }

        // AURA NORMAL
        if(!this.boss.coreExposed) {
            this.graphics.fillStyle(0x44dd44, 0.08);
            this.graphics.fillCircle(x, y, 220);
        }
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
        this.graphics.fillRect(20, 20, 220, 24);

        let playerHealthPercent = Math.max(0, this.player.hp / this.player.maxHp);
        this.graphics.fillStyle(0xff4444);
        this.graphics.fillRect(20, 20, 220 * playerHealthPercent, 24);

        // Borda
        this.graphics.lineStyle(2, 0xffffff);
        this.graphics.strokeRect(20, 20, 220, 24);

        // Texto HP do player
        this.graphics.fillStyle(0xffffff);
        this.graphics.font = "16px monospace";

        // BOSS
        this.graphics.fillStyle(0x222222);
        this.graphics.fillRect(1040, 20, 240, 24);

        let bossHealthPercent = Math.max(0, this.boss.hp / this.boss.maxHp);
        this.graphics.fillStyle(0x55dd55);
        this.graphics.fillRect(1040, 20, 240 * bossHealthPercent, 24);

        // Borda
        this.graphics.lineStyle(2, 0x55dd55);
        this.graphics.strokeRect(1040, 20, 240, 24);

        // Indicador de fase no boss
        if(this.boss.phase === 2) {
            this.graphics.lineStyle(3, 0xff6655);
            this.graphics.strokeRect(1035, 15, 250, 34);
        }
    }
}

const config = {

    type: Phaser.AUTO,

    width:1280,
    height:720,

    backgroundColor:"#000000",

    pixelArt:false,

    render: {
        pixelPerfect: false,
        antialias: true,
        antialiasGL: true
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        fullscreenTarget: 'parent',
        expandParent: true
    },

    scene:[
        MapScene,
        ForestBossScene
    ]
};

new Phaser.Game(config);