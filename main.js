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

        // ARENA - PLATAFORMAS HORIZONTAIS SÓLIDAS
        this.platforms = [
            { x: 220, y: 450, width: 140, height: 16 }, 
            { x: 150, y: 280, width: 120, height: 14 }, 
            { x: 1060, y: 450, width: 140, height: 16 }, 
            { x: 1130, y: 280, width: 120, height: 14 }
        ];

        // TRAMPOLINS NATURAIS (Flores e Arbustos)
        this.flowers = [
            { x: 300, y: 580, radius: 28, bounce: -23, compress: 0, maxCompress: 15, type: "HIGH" },
            { x: 980, y: 580, radius: 28, bounce: -23, compress: 0, maxCompress: 15, type: "HIGH" }
        ];

        this.bushes = [
            { x: 120, y: 580, width: 60, bounce: -17, compress: 0, maxCompress: 10 },
            { x: 1160, y: 580, width: 60, bounce: -17, compress: 0, maxCompress: 10 }
        ];

        // ATMOSFERA (Partículas do cenário)
        this.ambientParticles = [];
        for(let i=0; i<50; i++) {
            this.ambientParticles.push({
                x: Phaser.Math.Between(0, 1280),
                y: Phaser.Math.Between(0, 720),
                vx: Phaser.Math.Between(-2, 2),
                vy: Phaser.Math.Between(1, 4),
                size: Phaser.Math.Between(2, 5),
                wobbleSpeed: Phaser.Math.FloatBetween(0.02, 0.05),
                wobbleOffset: Math.random() * Math.PI * 2
            });
        }

        // PLAYER - MOVIMENTAÇÃO AÉREA CINÉTICA E MIRA 360

        this.player = {

            x:640, 
            y:this.groundY,

            width:40,
            height:70,

            velocityY:0,

            speed:8, 

            jumpForce:-17, 

            gravity:0.85, 

            onGround:true,
            
            hasAirDash:true, 

            hp:100,

            maxHp:100,

            dashCooldown:false,

            animationTime:0,

            direction:1,

            isAttacking:false,

            attackTime:0,

            onPlatform:null
        };

        // BOSS COLOSSAL - THE MOSS GUARDIAN (Fixo, Pesado, Estratégico)

        this.boss = {

            x: 640, 
            y: 350, 

            hp:800, 

            maxHp:800,

            attackCooldown:false,

            attackType:0,

            animationTime:0,

            bodyTilt:0,

            coreExposed:false,

            coreExposedTime:0,

            phase:1,
            
            darkness: 0
        };

        // ARRAYS DE ATAQUES
        this.leafParticles = [];
        this.dangerZones = []; 
        this.lateralRoots = []; 
        this.piercingBranches = []; 

        // NOVOS INPUTS (WASD + Mouse + Shift)
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            dash: Phaser.Input.Keyboard.KeyCodes.SHIFT
        });

        // Habilita rastreamento do mouse
        this.input.on('pointermove', function () {});

        // COMBAT
        this.playerAttackCooldown = false;
        this.slashes = []; // Cortes mágicos de longa distância

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
        ).setOrigin(0.5);
    }

    update(){

        this.updateAtmosphere();

        this.playerMovement();

        this.updatePhysics();
        
        this.updateBouncers(); 

        this.handleCombat();

        this.updateSlashes();

        this.updateLeafParticles();

        this.updateDangerZones();
        
        this.updateLateralRoots(); 
        
        this.updatePiercingBranches(); 

        this.bossAI();

        this.checkGameOver();

        this.renderScene();
    }

    updateAtmosphere() {
        for(let p of this.ambientParticles) {
            p.wobbleOffset += p.wobbleSpeed;
            p.x += p.vx + Math.sin(p.wobbleOffset) * 1.5;
            p.y += p.vy;

            if(p.y > 720) {
                p.y = -10;
                p.x = Phaser.Math.Between(0, 1280);
            }
        }
    }

    updateBouncers() {
        // FLORES GIGANTES
        for(let flower of this.flowers) {
            if(flower.compress > 0) flower.compress -= 1.5;
            if(flower.compress < 0) flower.compress = 0;

            if(this.player.velocityY >= 0 && !this.player.onGround) {
                if(Math.abs(this.player.x - flower.x) < flower.radius + 15 && this.player.y > flower.y - 40 && this.player.y < flower.y + 15) {
                    this.player.velocityY = flower.bounce; 
                    this.player.hasAirDash = true; 
                    this.player.onGround = false;
                    flower.compress = flower.maxCompress; 
                    
                    for(let i=0; i<6; i++) {
                        this.ambientParticles[Phaser.Math.Between(0,49)].y = flower.y;
                        this.ambientParticles[Phaser.Math.Between(0,49)].x = flower.x + Phaser.Math.Between(-30, 30);
                    }
                    this.cameras.main.shake(80, 0.003);
                }
            }
        }

        // ARBUSTOS
        for(let bush of this.bushes) {
            if(bush.compress > 0) bush.compress -= 1;

            if(this.player.velocityY >= 0 && !this.player.onGround) {
                if(Math.abs(this.player.x - bush.x) < bush.width / 2 + 15 && 
                   this.player.y > bush.y - 40 && this.player.y <= bush.y + 15) {
                    this.player.velocityY = bush.bounce; 
                    this.player.hasAirDash = true;
                    this.player.onGround = false;
                    bush.compress = bush.maxCompress;
                }
            }
        }
    }

    // --- SISTEMAS DE ATAQUE DO BOSS ATUALIZADOS ---

    updateLateralRoots() {
        for(let i = this.lateralRoots.length - 1; i >= 0; i--) {
            let root = this.lateralRoots[i];
            root.x += root.speed;
            root.life--;

            if(Math.abs(this.player.x - root.x) < 40 && Math.abs(this.player.y - root.y) < 30) {
                this.player.hp -= 10;
                this.cameras.main.shake(100, 0.005);
                this.lateralRoots.splice(i, 1);
                continue;
            }

            if(root.life <= 0 || root.x < -100 || root.x > 1380) {
                this.lateralRoots.splice(i, 1);
            }
        }
    }

    updatePiercingBranches() {
        for(let i = this.piercingBranches.length - 1; i >= 0; i--) {
            let branch = this.piercingBranches[i];
            branch.timer++;

            if(branch.timer === branch.strikeTime) {
                this.cameras.main.shake(200, 0.008); 
                
                if(Math.abs(this.player.y - branch.y) < 40) {
                    this.player.hp -= 20;
                }
            }

            if(branch.timer > branch.strikeTime + 40) {
                this.piercingBranches.splice(i, 1);
            }
        }
    }

    updateLeafParticles() {
        for(let i = this.leafParticles.length - 1; i >= 0; i--) {
            let leaf = this.leafParticles[i];
            leaf.x += leaf.vx;
            leaf.y += leaf.vy;
            leaf.life--;

            let dist = Phaser.Math.Distance.Between(leaf.x, leaf.y, this.player.x, this.player.y);
            if(dist < 30) {
                this.player.hp -= 4; 
                this.leafParticles.splice(i, 1);
                continue;
            }

            if(leaf.y > 720 || leaf.life <= 0) {
                this.leafParticles.splice(i, 1);
            }
        }
    }

    updateDangerZones() {
        for(let i = this.dangerZones.length - 1; i >= 0; i--) {
            let zone = this.dangerZones[i];
            zone.duration--;

            this.boss.darkness = Math.min(this.boss.darkness + 0.02, 0.6);

            if(this.player.onPlatform === null && this.player.y > zone.y - 50) {
                this.player.hp -= 3; 
            }

            if(zone.duration <= 0) {
                this.dangerZones.splice(i, 1);
            }
        }
        
        if(this.dangerZones.length === 0 && this.boss.darkness > 0) {
            this.boss.darkness -= 0.02;
        }
    }

    checkGameOver() {
        if(this.player.hp <= 0 || this.boss.hp <= 0) {
            this.cameras.main.fadeOut(800);
            this.time.delayedCall(800, ()=> {
                this.scene.start("MapScene");
            });
        }
    }

    playerMovement(){

        // MOVIMENTAÇÃO WASD
        if(this.keys.left.isDown){
            this.player.x -= this.player.speed;
            this.player.direction = -1; // O corpo vira para a direção do movimento
            this.player.animationTime += 0.2;
        }
        if(this.keys.right.isDown){
            this.player.x += this.player.speed;
            this.player.direction = 1;
            this.player.animationTime += 0.2;
        }

        if(!this.keys.left.isDown && !this.keys.right.isDown) {
            this.player.animationTime *= 0.85; 
        }

        // FÍSICA DE PLATAFORMAS HORIZONTAIS
        this.player.onPlatform = null;
        let nextY = this.player.y + this.player.velocityY; 
        
        // Se estiver segurando 'S', permite passar pelas plataformas para baixo
        if(!this.keys.down.isDown) {
            for(let platform of this.platforms) {
                if(this.player.x > platform.x - platform.width / 2 && this.player.x < platform.x + platform.width / 2) {
                    if(this.player.velocityY >= 0 && this.player.y <= platform.y + 15 && nextY >= platform.y - 20) {
                        this.player.onPlatform = platform;
                        this.player.y = platform.y; 
                        this.player.velocityY = 0;
                        this.player.onGround = true;
                        this.player.hasAirDash = true; 
                        break;
                    }
                }
            }
        }

        // VERIFICAR CHÃO
        if(!this.player.onPlatform && this.player.y >= this.groundY) {
            this.player.y = this.groundY;
            this.player.velocityY = 0;
            this.player.onGround = true;
            this.player.hasAirDash = true; 
        } else if(this.player.y > this.groundY) {
            this.player.y = this.groundY;
            this.player.velocityY = 0;
            this.player.onGround = true;
            this.player.hasAirDash = true;
        }

        // PULO (Tecla W)
        if(Phaser.Input.Keyboard.JustDown(this.keys.up) && this.player.onGround){
            this.player.velocityY = this.player.jumpForce;
            this.player.onGround = false;
            this.cameras.main.shake(20, 0.001);
        }

        // DASH (Tecla SHIFT)
        if(Phaser.Input.Keyboard.JustDown(this.keys.dash) && !this.player.dashCooldown){
            if(!this.player.onGround && !this.player.hasAirDash) {
                // Bloqueado
            } else {
                this.player.dashCooldown = true;
                
                if(!this.player.onGround) {
                    this.player.hasAirDash = false; 
                    this.player.velocityY = 0; 
                }

                // O dash obedece as teclas de movimento
                if(this.keys.left.isDown) this.player.x -= 200; 
                else if(this.keys.right.isDown) this.player.x += 200;
                else this.player.x += 200 * this.player.direction; // Default para frente

                this.cameras.main.shake(50, 0.003);

                this.time.delayedCall(600, ()=>{
                    this.player.dashCooldown = false;
                });
            }
        }

        // LIMITES DE TELA
        if(this.player.x < 20) this.player.x = 20;
        if(this.player.x > 1260) this.player.x = 1260;
    }

    updatePhysics(){
        this.player.velocityY += this.player.gravity;
        this.player.y += this.player.velocityY;

        if(!this.player.onPlatform && this.player.y >= this.groundY){
            this.player.y = this.groundY;
            this.player.velocityY = 0;
            this.player.onGround = true;
        }
    }

    handleCombat(){
        let pointer = this.input.activePointer;

        // COMBATE MÁGICO 360 GRAUS
        if(pointer.leftButtonDown() && !this.playerAttackCooldown){

            this.playerAttackCooldown = true;
            this.player.isAttacking = true;
            this.player.attackTime = 0;

            // Calcula o ângulo exato para atirar a meia-lua
            let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 20, pointer.x, pointer.y);
            let slashSpeed = 22; // Rápido e responsivo

            this.slashes.push({
                x: this.player.x,
                y: this.player.y - 20,
                vx: Math.cos(angle) * slashSpeed,
                vy: Math.sin(angle) * slashSpeed,
                angle: angle,
                life: 60
            });

            // Knockback no ar para estilos de combate aéreo (Leve)
            if(!this.player.onGround) {
                this.player.velocityY -= 1; // Leve "flutuada" ao atirar no ar
            }

            this.cameras.main.shake(30, 0.001); // Feedback de tiro

            // Ritmo natural de disparo - Semi-Automático
            this.time.delayedCall(300, ()=>{
                this.player.isAttacking = false;
                this.playerAttackCooldown = false;
            });
        }
    }

    updateSlashes(){
        for(let i = this.slashes.length - 1; i >= 0; i--){
            let slash = this.slashes[i];
            slash.x += slash.vx;
            slash.y += slash.vy;
            slash.life--;

            // O Boss Colossal é alto. Hitbox precisa cobrir a altura central.
            let distToBossX = Math.abs(slash.x - this.boss.x);
            let distToBossY = Math.abs(slash.y - (this.boss.y + 20)); 
            
            if(distToBossX < 120 && distToBossY < 160){
                
                if(this.boss.coreExposed) {
                    this.boss.hp -= 25;
                    this.cameras.main.shake(100,0.004);
                    
                    // Explosão de energia verde
                    for(let p=0; p<4; p++) {
                        this.ambientParticles[Phaser.Math.Between(0,49)].x = this.boss.x;
                        this.ambientParticles[Phaser.Math.Between(0,49)].y = this.boss.y + 20;
                    }

                    if(Math.random() < 0.2) this.boss.coreExposed = false;
                } else {
                    this.cameras.main.shake(15,0.001); // Dano resistido
                }

                this.slashes.splice(i,1);
                continue;
            }

            if(slash.life <= 0) this.slashes.splice(i,1);
        }
    }

    bossAI(){
        this.boss.animationTime += 0.04;

        if(this.boss.hp < this.boss.maxHp * 0.5 && this.boss.phase === 1) {
            this.boss.phase = 2;
            this.phaseText.setText("PHASE 2 - CORRUPTED");
            this.phaseText.setColor("#ff3333");
            this.cameras.main.shake(500, 0.01);
        }

        this.boss.bodyTilt = Math.sin(this.boss.animationTime * 0.5) * 5;

        if(this.boss.coreExposed) {
            this.boss.coreExposedTime++;
            if(this.boss.coreExposedTime > 150) {
                this.boss.coreExposed = false;
            }
        }

        if(!this.boss.attackCooldown){

            this.boss.attackCooldown = true;

            let attackPool = [0, 1, 2]; 
            let attackDuration = 1500;

            if(this.boss.phase === 2 && Math.random() < 0.25) {
                attackPool = [3];
            }

            this.boss.attackType = Phaser.Utils.Array.GetRandom(attackPool);

            if(this.boss.attackType === 0) {
                this.startLeafRain();
                attackDuration = 2200;
            }
            else if(this.boss.attackType === 1) {
                this.startPiercingBranches();
                attackDuration = 1800;
            }
            else if(this.boss.attackType === 2) {
                this.startLateralRoots();
                attackDuration = 1800;
            }
            else if(this.boss.attackType === 3) {
                this.startForestExpansion();
                attackDuration = 2500;
            }

            this.time.delayedCall(attackDuration, ()=>{

                this.boss.attackCooldown = false;

                if(Math.random() < 0.5 || this.boss.attackType === 3) {
                    this.boss.coreExposed = true;
                    this.boss.coreExposedTime = 0;
                    this.cameras.main.shake(80, 0.003); 
                }
            });
        }
    }

    // --- LÓGICA DOS ATAQUES (Preservados do update anterior) ---

    startLeafRain() {
        for(let i = 0; i < 40; i++) {
            this.time.delayedCall(i * 30, ()=>{
                this.leafParticles.push({
                    x: Phaser.Math.Between(100, 1180),
                    y: -20,
                    vx: Phaser.Math.Between(-3, 3),
                    vy: Phaser.Math.Between(8, 12), 
                    life: 150,
                    radius: Phaser.Math.Between(8, 15)
                });
            });
        }
    }

    startPiercingBranches() {
        let heights = [580, 450, 280];
        let targetY = Phaser.Utils.Array.GetRandom(heights);
        let fromLeft = Math.random() > 0.5;

        this.piercingBranches.push({
            y: targetY,
            fromLeft: fromLeft,
            timer: 0,
            strikeTime: 60 
        });
    }

    startLateralRoots() {
        let heights = [580, 450];
        let targetY = Phaser.Utils.Array.GetRandom(heights);
        let fromLeft = Math.random() > 0.5;
        let startX = fromLeft ? -50 : 1330;
        let speed = fromLeft ? 10 : -10;

        for(let i=0; i<3; i++) {
            this.time.delayedCall(i * 200, ()=>{
                this.lateralRoots.push({
                    x: startX,
                    y: targetY,
                    speed: speed,
                    life: 200
                });
            });
        }
    }

    startForestExpansion() {
        this.dangerZones.push({
            y: 550,
            duration: 180 
        });
    }

    renderScene(){

        this.graphics.clear();

        // FUNDO
        this.graphics.fillStyle(0x050f05);
        this.graphics.fillRect(0,0,1280,720);

        if(this.boss.darkness > 0) {
            this.graphics.fillStyle(0x000000, this.boss.darkness);
            this.graphics.fillRect(0, 0, 1280, 720);
        }

        // LUA 
        this.graphics.fillStyle(0xffffff, 0.05);
        this.graphics.fillCircle(640, 150, 150);

        // NEBLINA
        this.graphics.fillStyle(0x1a3a1a, 0.15);
        for(let i = 0; i < 5; i++) {
            this.graphics.fillRect(0, i * 144, 1280, 50);
        }

        // PARTÍCULAS AMBIENTAIS
        this.graphics.fillStyle(0x55aa55, 0.4);
        for(let p of this.ambientParticles) {
            this.graphics.fillCircle(p.x, p.y, p.size);
        }

        // DESENHO DAS PLATAFORMAS 
        this.drawArena();

        // TRAMPOLINS NATURAIS
        this.drawBouncers();

        // CHÃO
        this.graphics.fillStyle(0x1b2a1b);
        this.graphics.fillRect(0, 600, 1280, 120);

        // BOSS COLOSSO
        this.drawColossalBoss();

        // PLAYER (COM MIRA)
        this.drawPlayer();

        // EFEITOS DE ATAQUE
        this.drawLeafParticles();
        this.drawLateralRoots();
        this.drawPiercingBranches();
        this.drawDangerZones();

        // SLASHES
        this.drawSlashes();

        // BARRAS DE VIDA
        this.drawHealthBars();
    }

    drawBouncers() {
        let t = this.time.now * 0.002;

        // ARBUSTOS
        for(let bush of this.bushes) {
            let height = 45 - bush.compress;
            let currentY = bush.y - height / 2;
            let breathe = Math.sin(t + bush.x) * 3;
            
            this.graphics.fillStyle(0x1a3a1a);
            this.graphics.fillEllipse(bush.x, currentY + 5, bush.width * 1.1, height * 1.1);
            
            this.graphics.fillStyle(0x2a5a2a);
            this.graphics.fillEllipse(bush.x - 10, currentY + breathe, bush.width * 0.6, height * 0.8);
            this.graphics.fillEllipse(bush.x + 10, currentY - breathe, bush.width * 0.6, height * 0.8);
            this.graphics.fillEllipse(bush.x, currentY - 5, bush.width * 0.8, height * 0.9);
            
            this.graphics.fillStyle(0x4a8a4a, 0.8);
            this.graphics.fillEllipse(bush.x, currentY, bush.width * 0.5, height * 0.5);
            
            this.graphics.fillStyle(0x88ff88, 0.9);
            this.graphics.fillCircle(bush.x - 12, currentY - 8 + breathe, 3);
            this.graphics.fillCircle(bush.x + 15, currentY + 2 - breathe, 4);
        }

        // FLORES GIGANTES (Bézier Matemático Seguro)
        for(let flower of this.flowers) {
            let currentRadius = flower.radius - (flower.compress * 0.5); 
            let currentY = flower.y + flower.compress;
            let sway = Math.sin(t + flower.x) * 5; 

            // Caule
            this.graphics.lineStyle(8, 0x2d5f2d);
            this.graphics.beginPath();
            this.graphics.moveTo(flower.x, this.groundY + 10);
            
            for(let i = 1; i <= 10; i++) {
                let bt = i / 10;
                let px = Math.pow(1 - bt, 2) * flower.x + 2 * (1 - bt) * bt * (flower.x + sway * 2) + Math.pow(bt, 2) * (flower.x + sway);
                let py = Math.pow(1 - bt, 2) * (this.groundY + 10) + 2 * (1 - bt) * bt * (currentY + 20) + Math.pow(bt, 2) * currentY;
                this.graphics.lineTo(px, py);
            }
            this.graphics.strokePath();

            // Folhas
            this.graphics.fillStyle(0x3a7a3a);
            this.graphics.fillEllipse(flower.x - 15 + sway, currentY + 20, 20, 8);
            this.graphics.fillEllipse(flower.x + 15 + sway, currentY + 30, 20, 8);

            let fX = flower.x + sway;

            // Pétalas
            this.graphics.fillStyle(0xaa2266);
            for(let i=0; i<3; i++) {
                let angle = (i / 3) * Math.PI + Math.PI; 
                this.graphics.fillEllipse(fX + Math.cos(angle) * 10, currentY + Math.sin(angle) * 10, currentRadius * 1.5, currentRadius * 0.8);
            }

            this.graphics.fillStyle(0xff4499);
            let pLift = flower.compress > 0 ? 15 : 0; 
            
            this.graphics.fillEllipse(fX - 15, currentY - pLift, currentRadius * 1.4, currentRadius * 0.6);
            this.graphics.fillEllipse(fX + 15, currentY - pLift, currentRadius * 1.4, currentRadius * 0.6);
            this.graphics.fillEllipse(fX, currentY + 5, currentRadius * 1.8, currentRadius * 0.8);

            // Núcleo
            this.graphics.fillStyle(0xffff55);
            this.graphics.fillCircle(fX, currentY - 5, currentRadius * 0.4);
            
            this.graphics.fillStyle(0xffffff, 0.7);
            this.graphics.fillCircle(fX - 5, currentY - 8, 3);
            this.graphics.fillCircle(fX + 4, currentY - 4, 2);
            this.graphics.fillCircle(fX, currentY - 2, 4);
        }
    }

    drawArena() {
        this.drawTree(150, 200, 80, 400);
        this.drawTree(1130, 200, 80, 400);

        // PLATAFORMAS (Galhos Sólidos)
        for(let platform of this.platforms) {
            
            this.graphics.fillStyle(0x3a2817);
            this.graphics.beginPath();
            this.graphics.moveTo(platform.x - platform.width/2, platform.y);
            this.graphics.lineTo(platform.x + platform.width/2, platform.y);
            this.graphics.lineTo(platform.x + platform.width/2.5, platform.y + platform.height);
            this.graphics.lineTo(platform.x - platform.width/2.5, platform.y + platform.height);
            this.graphics.closePath();
            this.graphics.fill();

            this.graphics.lineStyle(2, 0x1a1a0a, 0.6);
            this.graphics.beginPath();
            this.graphics.moveTo(platform.x - platform.width/2.2, platform.y + 4);
            this.graphics.lineTo(platform.x + platform.width/2.2, platform.y + 4);
            this.graphics.strokePath();

            this.graphics.fillStyle(0x2d5f2d, 0.9);
            this.graphics.fillEllipse(platform.x - platform.width/3, platform.y, 25, 8);
            this.graphics.fillEllipse(platform.x, platform.y, 40, 10);
            this.graphics.fillEllipse(platform.x + platform.width/3, platform.y, 25, 8);
        }
    }

    drawTree(x, y, width, height) {
        this.graphics.fillStyle(0x3a2817);
        this.graphics.beginPath();
        this.graphics.moveTo(x - width/2, y);
        this.graphics.lineTo(x + width/2, y);
        this.graphics.lineTo(x + width/2 + 30, y + height);
        this.graphics.lineTo(x - width/2 - 30, y + height);
        this.graphics.fill();

        this.graphics.lineStyle(3, 0x1a1a0a, 0.6);
        for(let i = 0; i < 6; i++) {
            this.graphics.beginPath();
            let startX = x - width / 2.5 + i * width / 5;
            this.graphics.moveTo(startX, y);
            for(let j = 0; j < height; j+=40) {
                let offsetX = Math.sin(j * 0.05 + i) * 8;
                this.graphics.lineTo(startX + offsetX, y + j);
            }
            this.graphics.strokePath();
        }

        this.graphics.lineStyle(16, 0x2a1807);
        this.graphics.beginPath();
        this.graphics.moveTo(x, y + 80);
        for(let i = 1; i <= 10; i++) {
            let bt = i / 10;
            let px = Math.pow(1-bt, 2) * x + 2 * (1-bt) * bt * (x - width * 2) + Math.pow(bt, 2) * (x - width * 1.8);
            let py = Math.pow(1-bt, 2) * (y + 80) + 2 * (1-bt) * bt * (y + 40) + Math.pow(bt, 2) * (y - 20);
            this.graphics.lineTo(px, py);
        }
        this.graphics.strokePath();

        this.graphics.beginPath();
        this.graphics.moveTo(x, y + 100);
        for(let i = 1; i <= 10; i++) {
            let bt = i / 10;
            let px = Math.pow(1-bt, 2) * x + 2 * (1-bt) * bt * (x + width * 2) + Math.pow(bt, 2) * (x + width * 1.6);
            let py = Math.pow(1-bt, 2) * (y + 100) + 2 * (1-bt) * bt * (y + 50) + Math.pow(bt, 2) * (y - 10);
            this.graphics.lineTo(px, py);
        }
        this.graphics.strokePath();

        this.graphics.fillStyle(0x1d4a1d, 0.8);
        this.graphics.fillCircle(x, y - 40, 80);
        this.graphics.fillCircle(x - 60, y - 10, 60);
        this.graphics.fillCircle(x + 60, y - 10, 60);

        this.graphics.fillStyle(0x2d5f2d, 0.9);
        this.graphics.fillCircle(x, y - 30, 60);
        this.graphics.fillCircle(x - 50, y, 40);
        this.graphics.fillCircle(x + 50, y, 40);
    }

    drawColossalBoss() {
        let x = this.boss.x;
        let y = this.boss.y;
        let tilt = this.boss.bodyTilt;

        // MASSA COLOSSAL DE RAÍZES (Fixo no chão)
        this.graphics.fillStyle(0x2a180f);
        this.graphics.beginPath();
        this.graphics.moveTo(x - 300, 620); 
        
        for(let i=0; i<=10; i++) {
            let bt = i/10;
            let px = Math.pow(1-bt, 2)*(x-300) + 2*(1-bt)*bt*(x-100) + Math.pow(bt, 2)*(x - 60 + tilt*5);
            let py = Math.pow(1-bt, 2)*620 + 2*(1-bt)*bt*500 + Math.pow(bt, 2)*(y + 50);
            this.graphics.lineTo(px, py);
        }
        for(let i=10; i>=0; i--) {
            let bt = i/10;
            let px = Math.pow(1-bt, 2)*(x+300) + 2*(1-bt)*bt*(x+100) + Math.pow(bt, 2)*(x + 60 + tilt*5);
            let py = Math.pow(1-bt, 2)*620 + 2*(1-bt)*bt*500 + Math.pow(bt, 2)*(y + 50);
            this.graphics.lineTo(px, py);
        }
        this.graphics.fill();

        this.graphics.lineStyle(4, 0x1a0f0a, 0.7);
        for(let r=0; r<15; r++) {
            this.graphics.beginPath();
            let rx = x - 250 + (r * 35);
            this.graphics.moveTo(rx, 620);
            for(let j=0; j<10; j++) {
                this.graphics.lineTo(rx + Math.sin(j + r)*10, 620 - (j*20));
            }
            this.graphics.strokePath();
        }

        // TORSO HUMANOIDE DE MADEIRA
        this.graphics.save();
        this.graphics.translateCanvas(x, y + 50);
        this.graphics.rotateCanvas(tilt * Math.PI / 180);
        
        this.graphics.fillStyle(0x4a3820);
        this.graphics.fillEllipse(0, 0, 160, 200);

        this.graphics.lineStyle(5, 0x44dd44, 0.6 + (this.boss.darkness)); 
        this.graphics.beginPath();
        this.graphics.moveTo(-40, -60); this.graphics.lineTo(-20, 80);
        this.graphics.moveTo(50, -50); this.graphics.lineTo(30, 90);
        this.graphics.strokePath();

        // NÚCLEO ESPIRITUAL
        if(this.boss.coreExposed) {
            let pulse = Math.sin(this.boss.animationTime * 5) * 0.4 + 0.6;
            
            this.graphics.fillStyle(0x050505, 0.9);
            this.graphics.fillEllipse(0, 20, 70, 100);

            this.graphics.fillStyle(0x00ff66, pulse);
            this.graphics.fillCircle(0, 20, 35);

            this.graphics.lineStyle(3, 0x44ff44, pulse);
            for(let v = 0; v < 8; v++) {
                let a = (v/8) * Math.PI * 2;
                this.graphics.beginPath();
                this.graphics.moveTo(Math.cos(a)*30, 20 + Math.sin(a)*30);
                this.graphics.lineTo(Math.cos(a)*60, 20 + Math.sin(a)*60);
                this.graphics.strokePath();
            }

            this.graphics.lineStyle(2, 0xffaa00, 0.8);
            this.graphics.strokeCircle(0, 20, 80);
        }

        this.graphics.restore();

        // BRAÇOS ARTICULADOS GIGANTES
        let armLift = Math.cos(this.boss.animationTime) * 30;
        let armStretch = Math.sin(this.boss.animationTime * 0.5) * 20;

        let sLX = x - 90 + tilt, sLY = y;
        let eLX = sLX - 120 - armStretch, eLY = sLY + 60 + armLift;
        let mLX = eLX - 50, mLY = eLY + 150 - armLift;

        this.graphics.lineStyle(35, 0x3a2817);
        this.graphics.beginPath();
        this.graphics.moveTo(sLX, sLY); this.graphics.lineTo(eLX, eLY); this.graphics.lineTo(mLX, mLY);
        this.graphics.strokePath();

        this.graphics.lineStyle(12, 0x2a180f);
        this.graphics.beginPath(); this.graphics.moveTo(mLX, mLY); this.graphics.lineTo(mLX-40, mLY+40); this.graphics.strokePath();
        this.graphics.beginPath(); this.graphics.moveTo(mLX, mLY); this.graphics.lineTo(mLX, mLY+60); this.graphics.strokePath();
        this.graphics.beginPath(); this.graphics.moveTo(mLX, mLY); this.graphics.lineTo(mLX+30, mLY+50); this.graphics.strokePath();

        let sRX = x + 90 + tilt, sRY = y;
        let eRX = sRX + 120 + armStretch, eRY = sRY + 60 - armLift;
        let mRX = eRX + 50, mRY = eRY + 150 + armLift;

        this.graphics.lineStyle(35, 0x3a2817);
        this.graphics.beginPath();
        this.graphics.moveTo(sRX, sRY); this.graphics.lineTo(eRX, eRY); this.graphics.lineTo(mRX, mRY);
        this.graphics.strokePath();

        this.graphics.lineStyle(12, 0x2a180f);
        this.graphics.beginPath(); this.graphics.moveTo(mRX, mRY); this.graphics.lineTo(mRX+40, mRY+40); this.graphics.strokePath();
        this.graphics.beginPath(); this.graphics.moveTo(mRX, mRY); this.graphics.lineTo(mRX, mRY+60); this.graphics.strokePath();
        this.graphics.beginPath(); this.graphics.moveTo(mRX, mRY); this.graphics.lineTo(mRX-30, mRY+50); this.graphics.strokePath();

        // CABEÇA
        let headY = y - 110 + Math.sin(this.boss.animationTime * 2) * 5;
        this.graphics.fillStyle(0x1a1a1a);
        this.graphics.fillCircle(x + tilt, headY, 55);

        this.graphics.lineStyle(18, 0x8b7355);
        this.graphics.beginPath();
        this.graphics.moveTo(x - 30 + tilt, headY - 20); this.graphics.lineTo(x - 100 + tilt, headY - 80); this.graphics.lineTo(x - 120 + tilt, headY - 140);
        this.graphics.strokePath();
        
        this.graphics.beginPath();
        this.graphics.moveTo(x + 30 + tilt, headY - 20); this.graphics.lineTo(x + 100 + tilt, headY - 80); this.graphics.lineTo(x + 120 + tilt, headY - 140);
        this.graphics.strokePath();

        let eyeColor = this.boss.phase === 2 ? 0xff2222 : 0x00ff44;
        let glow = Math.sin(this.boss.animationTime * 3) * 0.4 + 0.6;
        this.graphics.fillStyle(eyeColor, glow);
        this.graphics.fillCircle(x - 25 + tilt, headY - 10, 12);
        this.graphics.fillCircle(x + 25 + tilt, headY - 10, 12);
    }

    drawLeafParticles() {
        for(let leaf of this.leafParticles) {
            this.graphics.fillStyle(0x66dd00, Math.max(0, leaf.life / 150));
            let angle = Math.random() * Math.PI * 2;
            let r = leaf.radius;
            this.graphics.fillTriangle(
                leaf.x + Math.cos(angle)*r, leaf.y + Math.sin(angle)*r,
                leaf.x + Math.cos(angle+2.1)*r, leaf.y + Math.sin(angle+2.1)*r,
                leaf.x + Math.cos(angle+4.2)*r, leaf.y + Math.sin(angle+4.2)*r
            );
        }
    }

    drawLateralRoots() {
        for(let root of this.lateralRoots) {
            this.graphics.fillStyle(0x4a3820);
            this.graphics.fillEllipse(root.x, root.y - 15, 60, 40);
            
            this.graphics.lineStyle(5, 0x2d5f2d);
            this.graphics.beginPath();
            this.graphics.moveTo(root.x, root.y - 35);
            this.graphics.lineTo(root.x - 20, root.y - 60);
            this.graphics.moveTo(root.x, root.y - 35);
            this.graphics.lineTo(root.x + 20, root.y - 60);
            this.graphics.strokePath();
        }
    }

    drawPiercingBranches() {
        for(let branch of this.piercingBranches) {
            let warnAlpha = Math.min(branch.timer / 30, 0.8);
            
            if(branch.timer < branch.strikeTime) {
                this.graphics.lineStyle(4, 0xff0000, warnAlpha);
                this.graphics.beginPath();
                this.graphics.moveTo(0, branch.y);
                this.graphics.lineTo(1280, branch.y);
                this.graphics.strokePath();
            } 
            else {
                this.graphics.fillStyle(0x3a2817);
                this.graphics.fillRect(0, branch.y - 30, 1280, 60);
                
                this.graphics.lineStyle(4, 0x1a1a0a);
                this.graphics.beginPath();
                this.graphics.moveTo(0, branch.y - 15); this.graphics.lineTo(1280, branch.y - 15);
                this.graphics.moveTo(0, branch.y + 15); this.graphics.lineTo(1280, branch.y + 15);
                this.graphics.strokePath();

                this.graphics.fillStyle(0x5a4830);
                for(let k=0; k<1280; k+=150) {
                    this.graphics.fillTriangle(k, branch.y - 30, k+40, branch.y - 30, k+20, branch.y - 60);
                    this.graphics.fillTriangle(k+75, branch.y + 30, k+115, branch.y + 30, k+95, branch.y + 60);
                }
            }
        }
    }

    drawDangerZones() {
        for(let zone of this.dangerZones) {
            let intensity = zone.duration / 180;
            
            this.graphics.fillStyle(0x1a0505, 0.8);
            this.graphics.fillRect(0, zone.y - 20, 1280, 150);

            this.graphics.lineStyle(4, 0xff2222, intensity);
            for(let i = 0; i < 40; i++) {
                let rx = i * 32;
                let rh = Math.random() * 60;
                this.graphics.beginPath();
                this.graphics.moveTo(rx, zone.y + 20);
                this.graphics.lineTo(rx + Math.random()*20 - 10, zone.y - rh);
                this.graphics.strokePath();
            }
        }
    }

    drawPlayer(){

        let x = this.player.x;
        let y = this.player.y;
        let flip = this.player.direction; 
        
        // Ângulo da mira (Sempre seguindo o Mouse)
        let pointer = this.input.activePointer;
        let aimAngle = Phaser.Math.Angle.Between(x, y - 20, pointer.x, pointer.y);

        this.graphics.fillStyle(0x000000,0.35);
        this.graphics.fillEllipse(x, 610, 36, 8);

        // Animação complexa de pernas
        let legSwing = Math.sin(this.player.animationTime) * 12;
        let legSwingOff = Math.sin(this.player.animationTime + Math.PI) * 12;
        let bodyTilt = Math.sin(this.player.animationTime * 0.5) * 4; 

        if(!this.player.onGround) {
            legSwing = -10; legSwingOff = 10; bodyTilt = 10; 
        }

        // Pernas
        this.graphics.lineStyle(9, 0x2d2d2d);
        this.graphics.beginPath(); this.graphics.moveTo(x - 6 * flip, y); this.graphics.lineTo(x - 6 * flip + legSwing * flip, y + 30); this.graphics.strokePath();
        this.graphics.beginPath(); this.graphics.moveTo(x + 6 * flip, y); this.graphics.lineTo(x + 6 * flip + legSwingOff * flip, y + 30); this.graphics.strokePath();

        // Capa
        let capeWave = Math.sin(this.player.animationTime * 0.8) * 4;
        this.graphics.fillStyle(0x111111);
        this.graphics.fillTriangle(x - 24 * flip, y + 20 + capeWave, x + 24 * flip, y + 20 + capeWave * 0.5, x + capeWave * flip, y - 8);
        this.graphics.fillStyle(0x1f1f1f);
        this.graphics.fillTriangle(x - 16 * flip, y + 25, x + 16 * flip, y + 25, x, y - 2);

        // Corpo rotacionando baseado no Movimento
        this.graphics.fillStyle(0x2d2d2d);
        this.graphics.save();
        this.graphics.translateCanvas(x, y - 10);
        this.graphics.rotateCanvas((bodyTilt * flip) * Math.PI / 180);
        this.graphics.fillRect(-10 * flip, -18, 20 * flip, 30);
        this.graphics.restore();

        // --- SISTEMA DE MIRA: BRAÇO E ESPADA RASTREANDO O MOUSE ---
        let shoulderX = x;
        let shoulderY = y - 18;
        let armLength = 25;
        
        let elbowX = shoulderX + Math.cos(aimAngle) * armLength;
        let elbowY = shoulderY + Math.sin(aimAngle) * armLength;

        // Desenha Braço
        this.graphics.lineStyle(8, 0x2d2d2d);
        this.graphics.beginPath();
        this.graphics.moveTo(shoulderX, shoulderY);
        this.graphics.lineTo(elbowX, elbowY);
        this.graphics.strokePath();

        this.graphics.fillStyle(0x3a3a3a);
        this.graphics.fillCircle(elbowX, elbowY, 4); // Articulação

        // Desenha Espada acompanhando exatamente o Braço
        let swordLength = 40;
        let kickback = 0;
        
        // Recuo ao atirar
        if(this.player.isAttacking) {
            let atkP = Math.min(this.player.attackTime / 8, 1);
            kickback = Math.sin(atkP * Math.PI) * -8; // Puxa espada para trás
            this.player.attackTime++;
        }

        let swordTipX = elbowX + Math.cos(aimAngle) * (swordLength + kickback);
        let swordTipY = elbowY + Math.sin(aimAngle) * (swordLength + kickback);
        let handleX = elbowX + Math.cos(aimAngle) * kickback;
        let handleY = elbowY + Math.sin(aimAngle) * kickback;

        // Lâmina Branca
        this.graphics.lineStyle(5, 0xbdbdbd);
        this.graphics.beginPath();
        this.graphics.moveTo(handleX, handleY);
        this.graphics.lineTo(swordTipX, swordTipY);
        this.graphics.strokePath();

        // Brilho da Espada
        let bladeGlow = this.player.isAttacking ? 0.8 : Math.sin(this.player.animationTime * 2) * 0.2 + 0.3;
        this.graphics.lineStyle(2, 0xaaddff, bladeGlow);
        this.graphics.beginPath();
        this.graphics.moveTo(handleX, handleY);
        this.graphics.lineTo(swordTipX, swordTipY);
        this.graphics.strokePath();

        // Cabeça
        this.graphics.fillStyle(0xf5f5f5);
        this.graphics.fillEllipse(x, y - 45, 30, 28);

        this.graphics.fillTriangle(x - 12 * flip,y - 52, x - 15 * flip,y - 72, x - 2 * flip,y - 50);
        this.graphics.fillTriangle(x + 12 * flip,y - 52, x + 15 * flip,y - 72, x + 2 * flip,y - 50);

        this.graphics.fillStyle(0x111111);
        this.graphics.fillTriangle(x - 10 * flip,y - 45, x - 3 * flip,y - 42, x - 10 * flip,y - 39);
        this.graphics.fillTriangle(x + 10 * flip,y - 45, x + 3 * flip,y - 42, x + 10 * flip,y - 39);

        this.graphics.fillStyle(0xaa0000);
        this.graphics.fillTriangle(x - 13 * flip,y - 36, x - 7 * flip,y - 40, x - 9 * flip,y - 32);
        this.graphics.fillTriangle(x + 13 * flip,y - 36, x + 7 * flip,y - 40, x + 9 * flip,y - 32);
    }

    drawSlashes(){
        for(let slash of this.slashes){
            
            // O slash gira fisicamente pro lado que foi atirado
            this.graphics.save();
            this.graphics.translateCanvas(slash.x, slash.y);
            this.graphics.rotateCanvas(slash.angle);

            // Meia-Lua Mágica
            this.graphics.fillStyle(0xaaddff, 0.9);
            this.graphics.beginPath();
            this.graphics.arc(0, 0, 25, -Math.PI/2, Math.PI/2, false);
            this.graphics.arc(-12, 0, 20, Math.PI/2, -Math.PI/2, true);
            this.graphics.fill();

            // Aura do Corte
            this.graphics.fillStyle(0x66ccff, 0.3);
            this.graphics.fillEllipse(0, 0, 45, 20);

            // Fumaça Espiritual deixando Rastro
            this.graphics.lineStyle(4, 0xffffff, slash.life / 60);
            this.graphics.beginPath();
            this.graphics.moveTo(-25, 0);
            this.graphics.lineTo(-45, 0);
            this.graphics.strokePath();

            this.graphics.restore();
        }
    }

    drawHealthBars(){
        this.graphics.fillStyle(0x222222); this.graphics.fillRect(20, 20, 220, 24);
        this.graphics.fillStyle(0xff4444); this.graphics.fillRect(20, 20, 220 * Math.max(0, this.player.hp / this.player.maxHp), 24);
        this.graphics.lineStyle(2, 0xffffff); this.graphics.strokeRect(20, 20, 220, 24);

        this.graphics.fillStyle(0x222222); this.graphics.fillRect(1040, 20, 240, 24);
        this.graphics.fillStyle(0x55dd55); this.graphics.fillRect(1040, 20, 240 * Math.max(0, this.boss.hp / this.boss.maxHp), 24);
        this.graphics.lineStyle(2, 0x55dd55); this.graphics.strokeRect(1040, 20, 240, 24);
        
        if(this.boss.phase === 2) { this.graphics.lineStyle(3, 0xff6655); this.graphics.strokeRect(1035, 15, 250, 34); }
    }
}

const config = {
    type: Phaser.AUTO,
    width:1280, height:720,
    backgroundColor:"#000000",
    pixelArt:false,
    render: { antialias: true, antialiasGL: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene:[MapScene, ForestBossScene]
};

new Phaser.Game(config);