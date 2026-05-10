class MapScene extends Phaser.Scene{

    constructor(){
        super("MapScene");
    }

    create(){

        this.add.rectangle(640,360,1280,720,0x050805);

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
        g.lineStyle(10,0x223322);
        g.beginPath();
        g.moveTo(250,400);
        g.lineTo(500,400);
        g.lineTo(750,400);
        g.lineTo(1000,400);
        g.strokePath();
    }

    createBossNode(x,y,name,unlocked,callback=null){
        let color = unlocked ? 0x114411 : 0x111111;
        let node = this.add.rectangle(x, y, 100, 100, color);
        node.setStrokeStyle(6,0x44dd44);

        this.add.text(x - 45, y + 70, name, { fontSize:"22px", color:"#ffffff" });

        if(unlocked){
            node.setInteractive();
            node.on("pointerover",()=> node.setScale(1.1));
            node.on("pointerout",()=> node.setScale(1));
            node.on("pointerdown",()=>{
                this.cameras.main.fadeOut(1000);
                this.time.delayedCall(1000,()=> callback());
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

        // ATMOSFERA MÁGICA NEON (Esporos espirituais da floresta)
        this.ambientParticles = [];
        for(let i=0; i<60; i++) {
            this.ambientParticles.push({
                x: Phaser.Math.Between(0, 1280),
                y: Phaser.Math.Between(0, 720),
                vx: Phaser.Math.Between(-1, 1),
                vy: Phaser.Math.FloatBetween(0.5, 2),
                size: Phaser.Math.Between(2, 6),
                wobbleSpeed: Phaser.Math.FloatBetween(0.01, 0.04),
                wobbleOffset: Math.random() * Math.PI * 2,
                glow: Math.random()
            });
        }

        // PLAYER - MOVIMENTAÇÃO AÉREA CINÉTICA E MIRA 360

        this.player = {
            x:640, 
            y:this.groundY,
            width:40, height:70,
            velocityY:0, speed:8, jumpForce:-17, gravity:0.85, 
            onGround:true, hasAirDash:true, 
            hp:100, maxHp:100, dashCooldown:false, animationTime:0, direction:1,
            isAttacking:false, attackTime:0, onPlatform:null
        };

        // BOSS COLOSSAL - THE MOSS GUARDIAN (Espírito Ancestral Fundido ao Solo)

        this.boss = {
            x: 640, 
            y: 320, 
            hp:1000, // Buff para a luta ser de resistência 
            maxHp:1000,
            attackCooldown:false, attackType:0, animationTime:0, bodyTilt:0,
            coreExposed:false, coreExposedTime:0, phase:1, darkness: 0
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

        this.input.on('pointermove', function () {});

        // COMBAT
        this.playerAttackCooldown = false;
        this.slashes = []; 

        this.createUI();
    }

    createUI(){
        this.bossName = this.add.text(
            380, 40, "THE MOSS GUARDIAN",
            { fontSize:"34px", color:"#00ff66", fontFamily:"monospace", fontStyle:"bold" }
        );
        this.phaseText = this.add.text(
            640, 680, "PHASE 1",
            { fontSize:"18px", color:"#aaffaa", fontFamily:"monospace" }
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
            p.y -= p.vy; // Esporos espirituais flutuam PARA CIMA

            p.glow += 0.05;

            if(p.y < -10) {
                p.y = 730;
                p.x = Phaser.Math.Between(0, 1280);
            }
        }
    }

    updateBouncers() {
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
                this.cameras.main.shake(250, 0.01); 
                
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
                this.player.hp -= 5; 
                this.leafParticles.splice(i, 1);
                continue;
            }

            if(leaf.y > 720 || leaf.life <= 0) this.leafParticles.splice(i, 1);
        }
    }

    updateDangerZones() {
        for(let i = this.dangerZones.length - 1; i >= 0; i--) {
            let zone = this.dangerZones[i];
            zone.duration--;

            this.boss.darkness = Math.min(this.boss.darkness + 0.02, 0.75);

            if(this.player.onPlatform === null && this.player.y > zone.y - 50) {
                this.player.hp -= 3; 
            }

            if(zone.duration <= 0) this.dangerZones.splice(i, 1);
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
        // WASD
        if(this.keys.left.isDown){
            this.player.x -= this.player.speed;
            this.player.direction = -1;
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

        // FÍSICA PLATAFORMAS HORIZONTAIS
        this.player.onPlatform = null;
        let nextY = this.player.y + this.player.velocityY; 
        
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

        // CHÃO
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

        // PULO (W)
        if(Phaser.Input.Keyboard.JustDown(this.keys.up) && this.player.onGround){
            this.player.velocityY = this.player.jumpForce;
            this.player.onGround = false;
            this.cameras.main.shake(20, 0.001);
        }

        // DASH (SHIFT)
        if(Phaser.Input.Keyboard.JustDown(this.keys.dash) && !this.player.dashCooldown){
            if(!this.player.onGround && !this.player.hasAirDash) {
            } else {
                this.player.dashCooldown = true;
                if(!this.player.onGround) {
                    this.player.hasAirDash = false; 
                    this.player.velocityY = 0; 
                }
                if(this.keys.left.isDown) this.player.x -= 200; 
                else if(this.keys.right.isDown) this.player.x += 200;
                else this.player.x += 200 * this.player.direction;

                this.cameras.main.shake(50, 0.003);
                this.time.delayedCall(600, ()=>{ this.player.dashCooldown = false; });
            }
        }

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

        if(pointer.leftButtonDown() && !this.playerAttackCooldown){
            this.playerAttackCooldown = true;
            this.player.isAttacking = true;
            this.player.attackTime = 0;

            let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 20, pointer.x, pointer.y);
            let slashSpeed = 24; 

            this.slashes.push({
                x: this.player.x, y: this.player.y - 20,
                vx: Math.cos(angle) * slashSpeed, vy: Math.sin(angle) * slashSpeed,
                angle: angle, life: 60
            });

            if(!this.player.onGround) this.player.velocityY -= 1.5; // Recuo maior para mobilidade

            this.cameras.main.shake(30, 0.001); 

            this.time.delayedCall(250, ()=>{
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

            let distToBossX = Math.abs(slash.x - this.boss.x);
            let distToBossY = Math.abs(slash.y - (this.boss.y)); 
            
            if(distToBossX < 140 && distToBossY < 200){
                if(this.boss.coreExposed) {
                    this.boss.hp -= 25;
                    this.cameras.main.shake(120,0.005);
                    
                    // Sangramento de energia do núcleo
                    for(let p=0; p<6; p++) {
                        this.ambientParticles[Phaser.Math.Between(0,59)].x = this.boss.x + Phaser.Math.Between(-20, 20);
                        this.ambientParticles[Phaser.Math.Between(0,59)].y = this.boss.y;
                    }

                    if(Math.random() < 0.15) this.boss.coreExposed = false;
                } else {
                    this.boss.hp -= 2; // Dano raspão na casca
                    this.cameras.main.shake(15,0.001); 
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
            this.phaseText.setText("PHASE 2 - SPIRITUAL AWAKENING");
            this.phaseText.setColor("#00ff66");
            this.cameras.main.shake(600, 0.015);
            this.boss.coreExposed = true; // Força exposição na transição
        }

        // Respiração / Balanço orgânico do Colosso
        this.boss.bodyTilt = Math.sin(this.boss.animationTime * 0.5) * 4;

        if(this.boss.coreExposed) {
            this.boss.coreExposedTime++;
            // Fica mais tempo exposto na fase 2
            let maxTime = this.boss.phase === 2 ? 250 : 150; 
            if(this.boss.coreExposedTime > maxTime) {
                this.boss.coreExposed = false;
            }
        }

        if(!this.boss.attackCooldown){

            this.boss.attackCooldown = true;

            let attackPool = [0, 1, 2]; 
            let attackDuration = 1500;

            if(this.boss.phase === 2 && Math.random() < 0.3) {
                attackPool = [3];
            }

            this.boss.attackType = Phaser.Utils.Array.GetRandom(attackPool);

            if(this.boss.attackType === 0) {
                this.startLeafRain(); attackDuration = 2200;
            }
            else if(this.boss.attackType === 1) {
                this.startPiercingBranches(); attackDuration = 1800;
            }
            else if(this.boss.attackType === 2) {
                this.startLateralRoots(); attackDuration = 1800;
            }
            else if(this.boss.attackType === 3) {
                this.startForestExpansion(); attackDuration = 2800;
            }

            this.time.delayedCall(attackDuration, ()=>{
                this.boss.attackCooldown = false;
                if(Math.random() < 0.5 || this.boss.attackType === 3) {
                    this.boss.coreExposed = true;
                    this.boss.coreExposedTime = 0;
                    this.cameras.main.shake(100, 0.003); 
                }
            });
        }
    }

    startLeafRain() {
        for(let i = 0; i < 40; i++) {
            this.time.delayedCall(i * 30, ()=>{
                this.leafParticles.push({
                    x: Phaser.Math.Between(100, 1180), y: -20,
                    vx: Phaser.Math.Between(-3, 3), vy: Phaser.Math.Between(8, 12), 
                    life: 150, radius: Phaser.Math.Between(8, 15)
                });
            });
        }
    }

    startPiercingBranches() {
        let heights = [580, 450, 280];
        let targetY = Phaser.Utils.Array.GetRandom(heights);
        let fromLeft = Math.random() > 0.5;

        this.piercingBranches.push({ y: targetY, fromLeft: fromLeft, timer: 0, strikeTime: 60 });
    }

    startLateralRoots() {
        let heights = [580, 450];
        let targetY = Phaser.Utils.Array.GetRandom(heights);
        let fromLeft = Math.random() > 0.5;
        let startX = fromLeft ? -50 : 1330;
        let speed = fromLeft ? 10 : -10;

        for(let i=0; i<3; i++) {
            this.time.delayedCall(i * 200, ()=>{
                this.lateralRoots.push({ x: startX, y: targetY, speed: speed, life: 200 });
            });
        }
    }

    startForestExpansion() {
        this.dangerZones.push({ y: 550, duration: 200 });
    }

    renderScene(){

        this.graphics.clear();

        // FUNDO AMALDIÇOADO
        this.graphics.fillStyle(0x050a05);
        this.graphics.fillRect(0,0,1280,720);

        if(this.boss.darkness > 0) {
            this.graphics.fillStyle(0x000000, this.boss.darkness);
            this.graphics.fillRect(0, 0, 1280, 720);
        }

        // NÉVOA VERDE PROFUNDA
        this.graphics.fillStyle(0x00ff44, 0.03);
        this.graphics.fillCircle(640, 360, 400);

        this.graphics.fillStyle(0x0a1a0a, 0.2);
        for(let i = 0; i < 5; i++) this.graphics.fillRect(0, i * 144, 1280, 50);

        // PARTÍCULAS ESPIRITUAIS
        for(let p of this.ambientParticles) {
            let pAlpha = (Math.sin(p.glow) * 0.5 + 0.5);
            this.graphics.fillStyle(0x00ff66, pAlpha);
            this.graphics.fillCircle(p.x, p.y, p.size);
            this.graphics.fillStyle(0xffffff, pAlpha * 0.5);
            this.graphics.fillCircle(p.x, p.y, p.size * 0.4);
        }

        // PLATAFORMAS 
        this.drawArena();
        this.drawBouncers();

        // CHÃO
        this.graphics.fillStyle(0x0a110a);
        this.graphics.fillRect(0, 600, 1280, 120);

        // BOSS COLOSSO RITUALÍSTICO
        this.drawColossalBoss();

        // PLAYER
        this.drawPlayer();

        // ATAQUES
        this.drawLeafParticles();
        this.drawLateralRoots();
        this.drawPiercingBranches();
        this.drawDangerZones();
        this.drawSlashes();

        this.drawHealthBars();
    }

    // --- FUNÇÃO AUXILIAR PARA RAÍZES E CURVAS ORGÂNICAS ---
    drawProceduralRoot(x1, y1, cx, cy, x2, y2) {
        this.graphics.beginPath();
        this.graphics.moveTo(x1, y1);
        for(let i=1; i<=10; i++) {
            let bt = i/10;
            let px = Math.pow(1-bt, 2)*x1 + 2*(1-bt)*bt*cx + Math.pow(bt, 2)*x2;
            let py = Math.pow(1-bt, 2)*y1 + 2*(1-bt)*bt*cy + Math.pow(bt, 2)*y2;
            this.graphics.lineTo(px, py);
        }
        this.graphics.strokePath();
    }

    drawColossalBoss() {
        let x = this.boss.x;
        let y = this.boss.y;
        let tilt = this.boss.bodyTilt;
        let t = this.boss.animationTime;

        // 1. A BASE: MONTANHA DE RAÍZES VIVAS
        this.graphics.fillStyle(0x0a0502);
        this.graphics.beginPath();
        this.graphics.moveTo(x - 500, 620);
        
        for(let i=0; i<=10; i++) {
            let bt = i/10;
            let px = Math.pow(1-bt, 2)*(x-500) + 2*(1-bt)*bt*(x-150) + Math.pow(bt, 2)*(x - 80 + tilt*5);
            let py = Math.pow(1-bt, 2)*620 + 2*(1-bt)*bt*400 + Math.pow(bt, 2)*(y + 80);
            this.graphics.lineTo(px, py);
        }
        for(let i=10; i>=0; i--) {
            let bt = i/10;
            let px = Math.pow(1-bt, 2)*(x+500) + 2*(1-bt)*bt*(x+150) + Math.pow(bt, 2)*(x + 80 + tilt*5);
            let py = Math.pow(1-bt, 2)*620 + 2*(1-bt)*bt*400 + Math.pow(bt, 2)*(y + 80);
            this.graphics.lineTo(px, py);
        }
        this.graphics.fill();

        // Raízes pulsantes na base (Fase 2 brilha mais)
        let baseGlow = this.boss.phase === 2 ? (Math.sin(t*2)*0.4+0.5) : 0.2;
        this.graphics.lineStyle(4, 0x00ff44, baseGlow);
        for(let r=0; r<8; r++) {
            this.drawProceduralRoot(x - 300 + r*80, 620, x - 100 + r*30, 500, x, y + 100);
        }

        // 2. TORSO GIGANTE ANCESTRAL
        this.graphics.save();
        this.graphics.translateCanvas(x, y + 50);
        this.graphics.rotateCanvas(tilt * Math.PI / 180);
        
        this.graphics.fillStyle(0x1a120c); // Madeira muito escura
        this.graphics.fillEllipse(0, 0, 180, 240);

        // Seiva/Luz vazando pelas rachaduras do tronco
        this.graphics.lineStyle(4, 0x00ff66, 0.4 + (this.boss.darkness)); 
        this.drawProceduralRoot(-60, -80, -40, 0, -30, 100);
        this.drawProceduralRoot(50, -70, 70, 0, 40, 110);

        // 3. NÚCLEO ESPIRITUAL (CORAÇÃO DA FLORESTA)
        let corePulse = Math.sin(t * 5) * 0.4 + 0.6;
        let rootRetract = this.boss.coreExposed ? 45 : 0; // Raízes abrem

        // O buraco no peito
        this.graphics.fillStyle(0x020502, 0.95);
        this.graphics.fillEllipse(0, 10, 90, 120);

        if(this.boss.coreExposed || this.boss.phase === 2) {
            // O Cristal Espiritual Vivo
            this.graphics.fillStyle(0x00ff66, corePulse);
            this.graphics.beginPath();
            this.graphics.moveTo(0, -30); this.graphics.lineTo(35, 10); this.graphics.lineTo(0, 50); this.graphics.lineTo(-35, 10);
            this.graphics.fill();
            
            // Aura intensa
            this.graphics.fillStyle(0xccffcc, corePulse * 1.5);
            this.graphics.fillEllipse(0, 10, 20, 40);

            // Veias de energia
            this.graphics.lineStyle(3, 0x44ff44, corePulse);
            for(let v = 0; v < 6; v++) {
                let a = (v/6) * Math.PI * 2 + t;
                this.drawProceduralRoot(Math.cos(a)*20, 10 + Math.sin(a)*20, Math.cos(a)*50, 10 + Math.sin(a)*50, Math.cos(a)*80, 10 + Math.sin(a)*80);
            }
        }

        // Raízes grossas protegendo o núcleo
        this.graphics.lineStyle(18, 0x110805);
        this.drawProceduralRoot(-80, -20, -rootRetract, 10, 0, 80); // Raiz Esq cruzando
        this.drawProceduralRoot(80, -10, rootRetract, 20, -10, 90);  // Raiz Dir cruzando
        this.drawProceduralRoot(-60, 50, 0, 30 + rootRetract, 70, -20); // Raiz baixo pra cima

        this.graphics.restore();

        // 4. BRAÇOS EXTREMAMENTE LONGOS (Tocando quase o chão)
        let armLift = Math.cos(t) * 30;
        let armStretch = Math.sin(t * 0.5) * 20;

        let sLX = x - 110 + tilt, sLY = y; // Ombro mais largo
        let eLX = sLX - 100 - armStretch, eLY = sLY + 120 + armLift; // Cotovelo baixo
        let mLX = eLX - 20, mLY = eLY + 180 - armLift; // Mão arrastando no chão

        this.graphics.lineStyle(40, 0x1a120c);
        this.drawProceduralRoot(sLX, sLY, eLX, eLY, mLX, mLY);

        // Mão Esquerda (Raízes brutais)
        this.graphics.lineStyle(15, 0x0a0502);
        this.drawProceduralRoot(mLX, mLY, mLX-30, mLY+30, mLX-50, mLY+80);
        this.drawProceduralRoot(mLX, mLY, mLX, mLY+40, mLX+10, mLY+90);
        this.drawProceduralRoot(mLX, mLY, mLX+20, mLY+30, mLX+40, mLY+70);

        let sRX = x + 110 + tilt, sRY = y;
        let eRX = sRX + 100 + armStretch, eRY = sRY + 120 - armLift;
        let mRX = eRX + 20, mRY = eRY + 180 + armLift;

        this.graphics.lineStyle(40, 0x1a120c);
        this.drawProceduralRoot(sRX, sRY, eRX, eRY, mRX, mRY);

        // Mão Direita
        this.graphics.lineStyle(15, 0x0a0502);
        this.drawProceduralRoot(mRX, mRY, mRX+30, mRY+30, mRX+50, mRY+80);
        this.drawProceduralRoot(mRX, mRY, mRX, mRY+40, mRX-10, mRY+90);
        this.drawProceduralRoot(mRX, mRY, mRX-20, mRY+30, mRX-40, mRY+70);

        // 5. ROSTO - MÁSCARA RITUALÍSTICA ANCESTRAL
        let headY = y - 130 + Math.sin(t * 2) * 5;
        let hX = x + tilt;

        // Formato da máscara (Hexágono alongado)
        this.graphics.fillStyle(0x0f0a05);
        this.graphics.beginPath();
        this.graphics.moveTo(hX - 30, headY - 60);
        this.graphics.lineTo(hX + 30, headY - 60);
        this.graphics.lineTo(hX + 45, headY);
        this.graphics.lineTo(hX + 20, headY + 70);
        this.graphics.lineTo(hX - 20, headY + 70);
        this.graphics.lineTo(hX - 45, headY);
        this.graphics.fill();

        // Entalhes/Rachaduras da máscara
        this.graphics.lineStyle(3, 0x00ff66, 0.5);
        this.drawProceduralRoot(hX, headY - 50, hX + 10, headY, hX - 5, headY + 60);
        
        // Olhos Verdes Vivos Observando
        let eyeGlow = Math.sin(t * 3) * 0.4 + 0.6;
        let eyeColor = this.boss.phase === 2 ? 0x00ff00 : 0x00ff66;
        
        // Fumaça espiritual saindo dos olhos
        for(let s=1; s<=4; s++) {
            this.graphics.fillStyle(eyeColor, eyeGlow / (s*1.5));
            this.graphics.fillCircle(hX - 18 + Math.sin(t*5+s)*4, headY - 10 - s*8, 5 + s);
            this.graphics.fillCircle(hX + 18 + Math.cos(t*5+s)*4, headY - 10 - s*8, 5 + s);
        }

        // Foco dos olhos
        this.graphics.fillStyle(0xffffff, eyeGlow + 0.2);
        this.graphics.fillCircle(hX - 18, headY - 10, 4);
        this.graphics.fillCircle(hX + 18, headY - 10, 4);

        // 6. CHIFRES - ÁRVORES MORTAS
        this.graphics.lineStyle(20, 0x110a05);
        this.drawProceduralRoot(hX - 25, headY - 50, hX - 80, headY - 100, hX - 150, headY - 180);
        this.drawProceduralRoot(hX + 25, headY - 50, hX + 80, headY - 100, hX + 150, headY - 180);

        // Galhos secundários dos chifres
        this.graphics.lineStyle(8, 0x110a05);
        this.drawProceduralRoot(hX - 80, headY - 100, hX - 120, headY - 120, hX - 130, headY - 90);
        this.drawProceduralRoot(hX + 80, headY - 100, hX + 120, headY - 120, hX + 130, headY - 90);

        // Musgo pendurado nos chifres
        this.graphics.lineStyle(3, 0x1d4a1d, 0.7);
        for(let m=0; m<4; m++) {
            this.graphics.beginPath();
            this.graphics.moveTo(hX - 100 + m*10, headY - 120 + m*10);
            this.graphics.lineTo(hX - 100 + m*10 + Math.sin(t+m)*5, headY - 50 + m*15);
            this.graphics.strokePath();

            this.graphics.beginPath();
            this.graphics.moveTo(hX + 100 - m*10, headY - 120 + m*10);
            this.graphics.lineTo(hX + 100 - m*10 + Math.cos(t+m)*5, headY - 50 + m*15);
            this.graphics.strokePath();
        }
    }

    drawBouncers() {
        let t = this.time.now * 0.002;

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
            this.graphics.fillStyle(0x00ff66, 0.4);
            this.graphics.fillEllipse(bush.x, currentY, bush.width * 0.5, height * 0.5);
            this.graphics.fillStyle(0x88ff88, 0.9);
            this.graphics.fillCircle(bush.x - 12, currentY - 8 + breathe, 3);
            this.graphics.fillCircle(bush.x + 15, currentY + 2 - breathe, 4);
        }

        for(let flower of this.flowers) {
            let currentRadius = flower.radius - (flower.compress * 0.5); 
            let currentY = flower.y + flower.compress;
            let sway = Math.sin(t + flower.x) * 5; 

            this.graphics.lineStyle(8, 0x1d4a1d);
            this.drawProceduralRoot(flower.x, this.groundY + 10, flower.x + sway * 2, currentY + 20, flower.x + sway, currentY);

            this.graphics.fillStyle(0x2d5f2d);
            this.graphics.fillEllipse(flower.x - 15 + sway, currentY + 20, 20, 8);
            this.graphics.fillEllipse(flower.x + 15 + sway, currentY + 30, 20, 8);

            let fX = flower.x + sway;
            this.graphics.fillStyle(0x008844);
            for(let i=0; i<3; i++) {
                let angle = (i / 3) * Math.PI + Math.PI; 
                this.graphics.fillEllipse(fX + Math.cos(angle) * 10, currentY + Math.sin(angle) * 10, currentRadius * 1.5, currentRadius * 0.8);
            }

            this.graphics.fillStyle(0x00cc66);
            let pLift = flower.compress > 0 ? 15 : 0; 
            this.graphics.fillEllipse(fX - 15, currentY - pLift, currentRadius * 1.4, currentRadius * 0.6);
            this.graphics.fillEllipse(fX + 15, currentY - pLift, currentRadius * 1.4, currentRadius * 0.6);
            this.graphics.fillEllipse(fX, currentY + 5, currentRadius * 1.8, currentRadius * 0.8);

            this.graphics.fillStyle(0xdcffdc);
            this.graphics.fillCircle(fX, currentY - 5, currentRadius * 0.4);
        }
    }

    drawArena() {
        this.drawTree(150, 200, 80, 400);
        this.drawTree(1130, 200, 80, 400);

        for(let platform of this.platforms) {
            this.graphics.fillStyle(0x1a120c);
            this.graphics.beginPath();
            this.graphics.moveTo(platform.x - platform.width/2, platform.y);
            this.graphics.lineTo(platform.x + platform.width/2, platform.y);
            this.graphics.lineTo(platform.x + platform.width/2.5, platform.y + platform.height);
            this.graphics.lineTo(platform.x - platform.width/2.5, platform.y + platform.height);
            this.graphics.closePath();
            this.graphics.fill();

            this.graphics.lineStyle(2, 0x050200, 0.6);
            this.graphics.beginPath();
            this.graphics.moveTo(platform.x - platform.width/2.2, platform.y + 4);
            this.graphics.lineTo(platform.x + platform.width/2.2, platform.y + 4);
            this.graphics.strokePath();

            this.graphics.fillStyle(0x1d4a1d, 0.9);
            this.graphics.fillEllipse(platform.x - platform.width/3, platform.y, 25, 8);
            this.graphics.fillEllipse(platform.x, platform.y, 40, 10);
            this.graphics.fillEllipse(platform.x + platform.width/3, platform.y, 25, 8);
        }
    }

    drawTree(x, y, width, height) {
        this.graphics.fillStyle(0x1a120c);
        this.graphics.beginPath();
        this.graphics.moveTo(x - width/2, y);
        this.graphics.lineTo(x + width/2, y);
        this.graphics.lineTo(x + width/2 + 30, y + height);
        this.graphics.lineTo(x - width/2 - 30, y + height);
        this.graphics.fill();

        this.graphics.lineStyle(3, 0x050200, 0.6);
        for(let i = 0; i < 6; i++) {
            this.graphics.beginPath();
            let startX = x - width / 2.5 + i * width / 5;
            this.graphics.moveTo(startX, y);
            for(let j = 0; j < height; j+=40) {
                this.graphics.lineTo(startX + Math.sin(j * 0.05 + i) * 8, y + j);
            }
            this.graphics.strokePath();
        }

        this.graphics.lineStyle(16, 0x110a05);
        this.drawProceduralRoot(x, y + 80, x - width * 2, y + 40, x - width * 1.8, y - 20);
        this.drawProceduralRoot(x, y + 100, x + width * 2, y + 50, x + width * 1.6, y - 10);

        this.graphics.fillStyle(0x0a1a0a, 0.8);
        this.graphics.fillCircle(x, y - 40, 80);
        this.graphics.fillCircle(x - 60, y - 10, 60);
        this.graphics.fillCircle(x + 60, y - 10, 60);

        this.graphics.fillStyle(0x1d4a1d, 0.9);
        this.graphics.fillCircle(x, y - 30, 60);
        this.graphics.fillCircle(x - 50, y, 40);
        this.graphics.fillCircle(x + 50, y, 40);
    }

    drawLeafParticles() {
        for(let leaf of this.leafParticles) {
            this.graphics.fillStyle(0x00ff66, Math.max(0, leaf.life / 150));
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
            this.graphics.fillStyle(0x1a120c);
            this.graphics.fillEllipse(root.x, root.y - 15, 60, 40);
            
            this.graphics.lineStyle(5, 0x00ff66, 0.8);
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
                this.graphics.lineStyle(4, 0x00ff66, warnAlpha); // Aviso verde fantasma
                this.graphics.beginPath();
                this.graphics.moveTo(0, branch.y);
                this.graphics.lineTo(1280, branch.y);
                this.graphics.strokePath();
            } 
            else {
                this.graphics.fillStyle(0x1a120c);
                this.graphics.fillRect(0, branch.y - 30, 1280, 60);
                
                this.graphics.lineStyle(4, 0x00ff66, 0.5);
                this.graphics.beginPath();
                this.graphics.moveTo(0, branch.y - 15); this.graphics.lineTo(1280, branch.y - 15);
                this.graphics.moveTo(0, branch.y + 15); this.graphics.lineTo(1280, branch.y + 15);
                this.graphics.strokePath();

                this.graphics.fillStyle(0x110a05);
                for(let k=0; k<1280; k+=150) {
                    this.graphics.fillTriangle(k, branch.y - 30, k+40, branch.y - 30, k+20, branch.y - 60);
                    this.graphics.fillTriangle(k+75, branch.y + 30, k+115, branch.y + 30, k+95, branch.y + 60);
                }
            }
        }
    }

    drawDangerZones() {
        for(let zone of this.dangerZones) {
            let intensity = zone.duration / 200;
            
            this.graphics.fillStyle(0x051a05, 0.9);
            this.graphics.fillRect(0, zone.y - 20, 1280, 150);

            this.graphics.lineStyle(4, 0x00ff66, intensity);
            for(let i = 0; i < 40; i++) {
                let rx = i * 32;
                let rh = Math.random() * 80;
                this.graphics.beginPath();
                this.graphics.moveTo(rx, zone.y + 20);
                this.graphics.lineTo(rx + Math.random()*30 - 15, zone.y - rh);
                this.graphics.strokePath();
            }
        }
    }

    drawPlayer(){

        let x = this.player.x;
        let y = this.player.y;
        let flip = this.player.direction; 
        
        let pointer = this.input.activePointer;
        let aimAngle = Phaser.Math.Angle.Between(x, y - 20, pointer.x, pointer.y);

        this.graphics.fillStyle(0x000000,0.35);
        this.graphics.fillEllipse(x, 610, 36, 8);

        let legSwing = Math.sin(this.player.animationTime) * 12;
        let legSwingOff = Math.sin(this.player.animationTime + Math.PI) * 12;
        let bodyTilt = Math.sin(this.player.animationTime * 0.5) * 4; 

        if(!this.player.onGround) {
            legSwing = -10; legSwingOff = 10; bodyTilt = 10; 
        }

        this.graphics.lineStyle(9, 0x2d2d2d);
        this.graphics.beginPath(); this.graphics.moveTo(x - 6 * flip, y); this.graphics.lineTo(x - 6 * flip + legSwing * flip, y + 30); this.graphics.strokePath();
        this.graphics.beginPath(); this.graphics.moveTo(x + 6 * flip, y); this.graphics.lineTo(x + 6 * flip + legSwingOff * flip, y + 30); this.graphics.strokePath();

        let capeWave = Math.sin(this.player.animationTime * 0.8) * 4;
        this.graphics.fillStyle(0x111111);
        this.graphics.fillTriangle(x - 24 * flip, y + 20 + capeWave, x + 24 * flip, y + 20 + capeWave * 0.5, x + capeWave * flip, y - 8);
        this.graphics.fillStyle(0x1f1f1f);
        this.graphics.fillTriangle(x - 16 * flip, y + 25, x + 16 * flip, y + 25, x, y - 2);

        this.graphics.fillStyle(0x2d2d2d);
        this.graphics.save();
        this.graphics.translateCanvas(x, y - 10);
        this.graphics.rotateCanvas((bodyTilt * flip) * Math.PI / 180);
        this.graphics.fillRect(-10 * flip, -18, 20 * flip, 30);
        this.graphics.restore();

        let shoulderX = x;
        let shoulderY = y - 18;
        let armLength = 25;
        
        let elbowX = shoulderX + Math.cos(aimAngle) * armLength;
        let elbowY = shoulderY + Math.sin(aimAngle) * armLength;

        this.graphics.lineStyle(8, 0x2d2d2d);
        this.graphics.beginPath();
        this.graphics.moveTo(shoulderX, shoulderY);
        this.graphics.lineTo(elbowX, elbowY);
        this.graphics.strokePath();

        this.graphics.fillStyle(0x3a3a3a);
        this.graphics.fillCircle(elbowX, elbowY, 4); 

        let swordLength = 40;
        let kickback = 0;
        
        if(this.player.isAttacking) {
            let atkP = Math.min(this.player.attackTime / 8, 1);
            kickback = Math.sin(atkP * Math.PI) * -8; 
            this.player.attackTime++;
        }

        let swordTipX = elbowX + Math.cos(aimAngle) * (swordLength + kickback);
        let swordTipY = elbowY + Math.sin(aimAngle) * (swordLength + kickback);
        let handleX = elbowX + Math.cos(aimAngle) * kickback;
        let handleY = elbowY + Math.sin(aimAngle) * kickback;

        this.graphics.lineStyle(5, 0xbdbdbd);
        this.graphics.beginPath();
        this.graphics.moveTo(handleX, handleY);
        this.graphics.lineTo(swordTipX, swordTipY);
        this.graphics.strokePath();

        let bladeGlow = this.player.isAttacking ? 0.8 : Math.sin(this.player.animationTime * 2) * 0.2 + 0.3;
        this.graphics.lineStyle(2, 0xaaddff, bladeGlow);
        this.graphics.beginPath();
        this.graphics.moveTo(handleX, handleY);
        this.graphics.lineTo(swordTipX, swordTipY);
        this.graphics.strokePath();

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
            this.graphics.save();
            this.graphics.translateCanvas(slash.x, slash.y);
            this.graphics.rotateCanvas(slash.angle);

            this.graphics.fillStyle(0xaaddff, 0.9);
            this.graphics.beginPath();
            this.graphics.arc(0, 0, 25, -Math.PI/2, Math.PI/2, false);
            this.graphics.arc(-12, 0, 20, Math.PI/2, -Math.PI/2, true);
            this.graphics.fill();

            this.graphics.fillStyle(0x66ccff, 0.3);
            this.graphics.fillEllipse(0, 0, 45, 20);

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
        this.graphics.fillStyle(0x00ff66); this.graphics.fillRect(1040, 20, 240 * Math.max(0, this.boss.hp / this.boss.maxHp), 24);
        this.graphics.lineStyle(2, 0x00ff66); this.graphics.strokeRect(1040, 20, 240, 24);
        
        if(this.boss.phase === 2) { this.graphics.lineStyle(3, 0xffffffff); this.graphics.strokeRect(1035, 15, 250, 34); }
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