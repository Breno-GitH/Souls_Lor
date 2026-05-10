// ==================================================
// ESTADO GLOBAL DO JOGO (PROGRESSÃO)
// ==================================================
window.gameProgress = {
    forestCleared: false,
    mountainCleared: false
};

// ==================================================
// MAP SCENE
// ==================================================
class MapScene extends Phaser.Scene{

    constructor(){
        super("MapScene");
    }

    create(){

        this.add.rectangle(640,360,1280,720,0x101010);

        this.add.text(420, 70, "VEIL OF ASH", { fontSize:"60px", color:"#ffffff", fontFamily:"monospace" });

        this.drawPath();

        // NÓ 1: THE MOSS GUARDIAN
        this.createBossNode(250, 400, "FOREST", true, () => {
            this.scene.start("ForestBossScene");
        });

        // NÓ 2: THE MOUNTAIN KING
        this.createBossNode(500, 400, "MOUNTAIN", window.gameProgress.forestCleared, () => {
            this.scene.start("MountainBossScene");
        });

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
        let nodeColor = 0x333333;
        let strokeColor = 0xffffff;

        if(unlocked) {
            if(name === "FOREST") nodeColor = 0x228833;
            if(name === "MOUNTAIN") nodeColor = 0x2255aa;
        }

        let node = this.add.rectangle(x, y, 100, 100, nodeColor);
        node.setStrokeStyle(6,strokeColor);

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


/*==================================================
====================================================
MOSS GUARDIAN - FLORESTA
====================================================
==================================================*/

class ForestBossScene extends Phaser.Scene{

    constructor(){
        super("ForestBossScene");
    }

    create(){
        this.graphics = this.add.graphics();
        this.groundY = 580;

        this.platforms = [
            { x: 220, y: 450, width: 140, height: 16 }, 
            { x: 150, y: 280, width: 120, height: 14 }, 
            { x: 1060, y: 450, width: 140, height: 16 }, 
            { x: 1130, y: 280, width: 120, height: 14 }
        ];

        this.flowers = [
            { x: 300, y: 580, radius: 28, bounce: -23, compress: 0, maxCompress: 15, type: "HIGH" },
            { x: 980, y: 580, radius: 28, bounce: -23, compress: 0, maxCompress: 15, type: "HIGH" }
        ];

        this.bushes = [
            { x: 120, y: 580, width: 60, bounce: -17, compress: 0, maxCompress: 10 },
            { x: 1160, y: 580, width: 60, bounce: -17, compress: 0, maxCompress: 10 }
        ];

        this.ambientParticles = [];
        for(let i=0; i<60; i++) {
            this.ambientParticles.push({
                x: Phaser.Math.Between(0, 1280), y: Phaser.Math.Between(0, 720),
                vx: Phaser.Math.Between(-1, 1), vy: Phaser.Math.FloatBetween(0.5, 2),
                size: Phaser.Math.Between(2, 6), wobbleSpeed: Phaser.Math.FloatBetween(0.01, 0.04),
                wobbleOffset: Math.random() * Math.PI * 2, glow: Math.random()
            });
        }

        this.player = {
            x:640, y:this.groundY, width:40, height:70,
            velocityY:0, speed:8, jumpForce:-17, gravity:0.85, 
            onGround:true, hasAirDash:true, hp:100, maxHp:100, dashCooldown:false, 
            animationTime:0, direction:1, isAttacking:false, attackTime:0, onPlatform:null
        };

        this.boss = {
            x: 640, y: 320, hp:1000, maxHp:1000,
            attackCooldown:false, attackType:0, animationTime:0, bodyTilt:0,
            coreExposed:false, coreExposedTime:0, phase:1, darkness: 0,
            isDead: false, deathTimer: 0 
        };

        this.leafParticles = [];
        this.dangerZones = []; 
        this.lateralRoots = []; 
        this.piercingBranches = []; 

        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D,
            dash: Phaser.Input.Keyboard.KeyCodes.SHIFT
        });
        this.input.on('pointermove', function () {});

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
        
        if(!this.boss.isDead) {
            this.playerMovement();
            this.handleCombat();
        }
        
        this.updatePhysics();
        this.updateBouncers(); 
        this.updateSlashes();
        this.updateLeafParticles();
        this.updateDangerZones();
        this.updateLateralRoots(); 
        this.updatePiercingBranches(); 
        
        if(!this.boss.isDead) {
            this.bossAI();
            this.checkGameOver();
        } else {
            this.handleDeathSequence();
        }
        
        this.renderScene();
    }

    updateAtmosphere() {
        for(let p of this.ambientParticles) {
            p.wobbleOffset += p.wobbleSpeed;
            p.x += p.vx + Math.sin(p.wobbleOffset) * 1.5;
            if(this.boss.isDead) p.vy = -3;
            p.y -= p.vy; 
            p.glow += 0.05;
            if(p.y < -10 || p.y > 730) {
                p.y = this.boss.isDead ? -10 : 730;
                p.x = Phaser.Math.Between(0, 1280);
            }
        }
    }

    updateBouncers() {
        for(let flower of this.flowers) {
            if(flower.compress > 0) flower.compress -= 1.5;
            if(flower.compress < 0) flower.compress = 0;
            if(this.player.velocityY >= 0 && !this.player.onGround && !this.boss.isDead) {
                if(Math.abs(this.player.x - flower.x) < flower.radius + 15 && this.player.y > flower.y - 40 && this.player.y < flower.y + 15) {
                    this.player.velocityY = flower.bounce; this.player.hasAirDash = true; this.player.onGround = false; flower.compress = flower.maxCompress; 
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
            if(this.player.velocityY >= 0 && !this.player.onGround && !this.boss.isDead) {
                if(Math.abs(this.player.x - bush.x) < bush.width / 2 + 15 && this.player.y > bush.y - 40 && this.player.y <= bush.y + 15) {
                    this.player.velocityY = bush.bounce; this.player.hasAirDash = true; this.player.onGround = false; bush.compress = bush.maxCompress;
                }
            }
        }
    }

    updateLateralRoots() {
        for(let i = this.lateralRoots.length - 1; i >= 0; i--) {
            let root = this.lateralRoots[i];
            root.x += root.speed; root.life--;
            if(!this.boss.isDead && Math.abs(this.player.x - root.x) < 40 && Math.abs(this.player.y - root.y) < 30) {
                this.player.hp -= 10; this.cameras.main.shake(100, 0.005); this.lateralRoots.splice(i, 1); continue;
            }
            if(root.life <= 0 || root.x < -100 || root.x > 1380) this.lateralRoots.splice(i, 1);
        }
    }

    updatePiercingBranches() {
        for(let i = this.piercingBranches.length - 1; i >= 0; i--) {
            let branch = this.piercingBranches[i];
            branch.timer++;
            if(branch.timer === branch.strikeTime) {
                this.cameras.main.shake(250, 0.01); 
                if(!this.boss.isDead && Math.abs(this.player.y - branch.y) < 40) this.player.hp -= 20;
            }
            if(branch.timer > branch.strikeTime + 40) this.piercingBranches.splice(i, 1);
        }
    }

    updateLeafParticles() {
        for(let i = this.leafParticles.length - 1; i >= 0; i--) {
            let leaf = this.leafParticles[i];
            let windWobble = Math.sin(this.time.now * 0.005 + leaf.y) * 2;
            leaf.x += leaf.vx + windWobble; leaf.y += leaf.vy; leaf.life--;
            let dist = Phaser.Math.Distance.Between(leaf.x, leaf.y, this.player.x, this.player.y);
            if(!this.boss.isDead && dist < 30) {
                this.player.hp -= 5; this.leafParticles.splice(i, 1); continue;
            }
            if(leaf.y > 720 || leaf.life <= 0) this.leafParticles.splice(i, 1);
        }
    }

    updateDangerZones() {
        for(let i = this.dangerZones.length - 1; i >= 0; i--) {
            let zone = this.dangerZones[i];
            zone.duration--;
            this.boss.darkness = Math.min(this.boss.darkness + 0.02, 0.75);
            if(!this.boss.isDead && this.player.onPlatform === null && this.player.y > zone.y - 50) this.player.hp -= 3; 
            if(zone.duration <= 0) this.dangerZones.splice(i, 1);
        }
        if(this.dangerZones.length === 0 && this.boss.darkness > 0) this.boss.darkness -= 0.02;
    }

    checkGameOver() {
        if(this.player.hp <= 0) {
            this.cameras.main.fadeOut(800);
            this.time.delayedCall(800, ()=> this.scene.start("MapScene"));
        }
        if(this.boss.hp <= 0 && !this.boss.isDead) {
            this.boss.isDead = true;
            this.boss.attackCooldown = true;
            this.dangerZones = [];
            this.piercingBranches = [];
            this.lateralRoots = [];
            this.cameras.main.shake(4000, 0.005);
            this.phaseText.setText("GUARDIAN DEFEATED");
            this.phaseText.setColor("#ffffff");
        }
    }

    handleDeathSequence() {
        this.boss.deathTimer++;
        this.boss.bodyTilt += 0.05; 
        if(this.boss.deathTimer % 5 === 0) {
            this.leafParticles.push({
                x: Phaser.Math.Between(0, 1280), y: -20,
                vx: Phaser.Math.Between(-2, 2), vy: Phaser.Math.Between(4, 8), 
                life: 200, radius: Phaser.Math.Between(8, 15)
            });
        }
        if(this.boss.deathTimer === 200) {
            window.gameProgress.forestCleared = true; 
            this.cameras.main.fadeOut(2000, 255, 255, 255); 
            this.time.delayedCall(2000, ()=> this.scene.start("MapScene"));
        }
    }

    playerMovement(){
        if(this.keys.left.isDown){
            this.player.x -= this.player.speed; this.player.direction = -1; this.player.animationTime += 0.2;
        }
        if(this.keys.right.isDown){
            this.player.x += this.player.speed; this.player.direction = 1; this.player.animationTime += 0.2;
        }
        if(!this.keys.left.isDown && !this.keys.right.isDown) this.player.animationTime *= 0.85; 

        this.player.onPlatform = null;
        let nextY = this.player.y + this.player.velocityY; 
        
        if(!this.keys.down.isDown) {
            for(let platform of this.platforms) {
                if(this.player.x > platform.x - platform.width / 2 && this.player.x < platform.x + platform.width / 2) {
                    if(this.player.velocityY >= 0 && this.player.y <= platform.y + 15 && nextY >= platform.y - 20) {
                        this.player.onPlatform = platform; this.player.y = platform.y; this.player.velocityY = 0;
                        this.player.onGround = true; this.player.hasAirDash = true; break;
                    }
                }
            }
        }

        if(!this.player.onPlatform && this.player.y >= this.groundY) {
            this.player.y = this.groundY; this.player.velocityY = 0; this.player.onGround = true; this.player.hasAirDash = true; 
        } else if(this.player.y > this.groundY) {
            this.player.y = this.groundY; this.player.velocityY = 0; this.player.onGround = true; this.player.hasAirDash = true;
        }

        if(Phaser.Input.Keyboard.JustDown(this.keys.up) && this.player.onGround){
            this.player.velocityY = this.player.jumpForce; this.player.onGround = false; this.cameras.main.shake(20, 0.001);
        }

        if(Phaser.Input.Keyboard.JustDown(this.keys.dash) && !this.player.dashCooldown){
            if(this.player.onGround || this.player.hasAirDash) {
                this.player.dashCooldown = true;
                if(!this.player.onGround) { this.player.hasAirDash = false; this.player.velocityY = 0; }
                if(this.keys.left.isDown) this.player.x -= 200; else if(this.keys.right.isDown) this.player.x += 200; else this.player.x += 200 * this.player.direction;
                this.cameras.main.shake(50, 0.003);
                this.time.delayedCall(600, ()=>{ this.player.dashCooldown = false; });
            }
        }

        if(this.player.x < 20) this.player.x = 20; if(this.player.x > 1260) this.player.x = 1260;
    }

    updatePhysics(){
        this.player.velocityY += this.player.gravity; this.player.y += this.player.velocityY;
        if(!this.player.onPlatform && this.player.y >= this.groundY){
            this.player.y = this.groundY; this.player.velocityY = 0; this.player.onGround = true;
        }
    }

    handleCombat(){
        let pointer = this.input.activePointer;
        if(pointer.leftButtonDown() && !this.playerAttackCooldown){
            this.playerAttackCooldown = true; this.player.isAttacking = true; this.player.attackTime = 0;
            let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 20, pointer.x, pointer.y);
            this.slashes.push({ x: this.player.x, y: this.player.y - 20, vx: Math.cos(angle) * 24, vy: Math.sin(angle) * 24, angle: angle, life: 60 });
            if(!this.player.onGround) this.player.velocityY -= 1.5; 
            this.cameras.main.shake(30, 0.001); 
            this.time.delayedCall(250, ()=>{ this.player.isAttacking = false; this.playerAttackCooldown = false; });
        }
    }

    updateSlashes(){
        for(let i = this.slashes.length - 1; i >= 0; i--){
            let slash = this.slashes[i];
            slash.x += slash.vx; slash.y += slash.vy; slash.life--;
            let distToBossX = Math.abs(slash.x - this.boss.x); let distToBossY = Math.abs(slash.y - (this.boss.y)); 
            
            if(!this.boss.isDead && distToBossX < 140 && distToBossY < 200){
                if(this.boss.coreExposed) {
                    this.boss.hp -= 25; this.cameras.main.shake(120,0.005);
                    for(let p=0; p<6; p++) {
                        this.ambientParticles[Phaser.Math.Between(0,59)].x = this.boss.x + Phaser.Math.Between(-20, 20);
                        this.ambientParticles[Phaser.Math.Between(0,59)].y = this.boss.y;
                    }
                    if(Math.random() < 0.15) this.boss.coreExposed = false;
                } else {
                    this.boss.hp -= 2; this.cameras.main.shake(15,0.001); 
                }
                this.slashes.splice(i,1); continue;
            }
            if(slash.life <= 0) this.slashes.splice(i,1);
        }
    }

    bossAI(){
        this.boss.animationTime += 0.04;
        if(this.boss.hp < this.boss.maxHp * 0.5 && this.boss.phase === 1) {
            this.boss.phase = 2; this.phaseText.setText("PHASE 2 - SPIRITUAL AWAKENING"); this.phaseText.setColor("#00ff66");
            this.cameras.main.shake(600, 0.015); this.boss.coreExposed = true; 
        }
        this.boss.bodyTilt = Math.sin(this.boss.animationTime * 0.5) * 4;
        if(this.boss.coreExposed) {
            this.boss.coreExposedTime++;
            let maxTime = this.boss.phase === 2 ? 250 : 150; 
            if(this.boss.coreExposedTime > maxTime) this.boss.coreExposed = false;
        }

        if(!this.boss.attackCooldown){
            this.boss.attackCooldown = true;
            let attackPool = [0, 1, 2]; let attackDuration = 1500;
            if(this.boss.phase === 2 && Math.random() < 0.3) attackPool = [3];
            this.boss.attackType = Phaser.Utils.Array.GetRandom(attackPool);

            if(this.boss.attackType === 0) { this.startLeafRain(); attackDuration = 2200; }
            else if(this.boss.attackType === 1) { this.startPiercingBranches(); attackDuration = 1800; }
            else if(this.boss.attackType === 2) { this.startLateralRoots(); attackDuration = 1800; }
            else if(this.boss.attackType === 3) { this.startForestExpansion(); attackDuration = 2800; }

            this.time.delayedCall(attackDuration, ()=>{
                this.boss.attackCooldown = false;
                if(Math.random() < 0.5 || this.boss.attackType === 3) {
                    this.boss.coreExposed = true; this.boss.coreExposedTime = 0; this.cameras.main.shake(100, 0.003); 
                }
            });
        }
    }

    startLeafRain() {
        for(let i = 0; i < 40; i++) {
            this.time.delayedCall(i * 30, ()=>{
                this.leafParticles.push({ x: Phaser.Math.Between(100, 1180), y: -20, vx: Phaser.Math.Between(-3, 3), vy: Phaser.Math.Between(8, 12), life: 150, radius: Phaser.Math.Between(8, 15) });
            });
        }
    }

    startPiercingBranches() {
        let targetY = Phaser.Utils.Array.GetRandom([580, 450, 280]);
        this.piercingBranches.push({ y: targetY, fromLeft: Math.random() > 0.5, timer: 0, strikeTime: 60 });
    }

    startLateralRoots() {
        let fromLeft = Math.random() > 0.5; let speed = fromLeft ? 10 : -10;
        for(let i=0; i<3; i++) {
            this.time.delayedCall(i * 200, ()=>{
                this.lateralRoots.push({ x: fromLeft ? -50 : 1330, y: Phaser.Utils.Array.GetRandom([580, 450]), speed: speed, life: 200 });
            });
        }
    }

    startForestExpansion() { this.dangerZones.push({ y: 550, duration: 200 }); }

    renderScene(){
        this.graphics.clear();
        this.graphics.fillStyle(0x050a05); this.graphics.fillRect(0,0,1280,720);

        if(this.boss.darkness > 0) {
            this.graphics.fillStyle(0x000000, this.boss.darkness); this.graphics.fillRect(0, 0, 1280, 720);
        }

        this.graphics.fillStyle(0x00ff44, 0.03); this.graphics.fillCircle(640, 360, 400);
        this.graphics.fillStyle(0x0a1a0a, 0.2); for(let i = 0; i < 5; i++) this.graphics.fillRect(0, i * 144, 1280, 50);

        for(let p of this.ambientParticles) {
            let pAlpha = (Math.sin(p.glow) * 0.5 + 0.5);
            this.graphics.fillStyle(this.boss.isDead ? 0xaa2222 : 0x00ff66, pAlpha);
            this.graphics.fillCircle(p.x, p.y, p.size);
            this.graphics.fillStyle(0xffffff, pAlpha * 0.5); this.graphics.fillCircle(p.x, p.y, p.size * 0.4);
        }

        this.drawArena();
        this.drawBouncers();
        this.graphics.fillStyle(0x0a110a); this.graphics.fillRect(0, 600, 1280, 120);

        this.drawColossalBoss();
        this.drawPlayer();

        this.drawLeafParticles();
        this.drawLateralRoots();
        this.drawPiercingBranches();
        this.drawDangerZones();
        
        this.drawSlashes();
        this.drawHealthBars();
    }

    drawLeafParticles() {
        let t = this.time.now * 0.002;
        for(let leaf of this.leafParticles) {
            let alpha = Math.max(0, leaf.life / 150);
            this.graphics.fillStyle(this.boss.isDead ? 0x8b4513 : 0x00ff66, alpha); 
            let rotation = t * 2 + leaf.x * 0.05; let r = leaf.radius;
            this.graphics.fillTriangle(
                leaf.x + Math.cos(rotation)*r, leaf.y + Math.sin(rotation)*r, 
                leaf.x + Math.cos(rotation+2.1)*r, leaf.y + Math.sin(rotation+2.1)*r, 
                leaf.x + Math.cos(rotation+4.2)*r, leaf.y + Math.sin(rotation+4.2)*r
            );
        }
    }

    drawLateralRoots() {
        let t = this.time.now * 0.005;
        for(let root of this.lateralRoots) {
            let dir = root.speed > 0 ? 1 : -1; let rootBaseX = root.x - (80 * dir); 
            let tremorX = Math.sin(t * 10) * 2; let tremorY = Math.cos(t * 12) * 2;

            this.graphics.fillStyle(0x0a0502, 0.8); this.graphics.fillEllipse(rootBaseX + tremorX, root.y + 10 + tremorY, 120, 40);

            for(let p = 0; p < 8; p++) {
                let pX = rootBaseX + Math.sin(t * 2 + p * 4) * 60 + tremorX;
                let pY = root.y - Math.abs(Math.cos(t * 3 + p)) * 40 + tremorY;
                this.graphics.fillStyle(0x2a180f, 0.9); this.graphics.fillCircle(pX, pY, Math.random() * 4 + 2);
                this.graphics.fillStyle(0x00ff66, 0.7); this.graphics.fillTriangle(pX, pY, pX+6, pY-4, pX+4, pY+4);
            }

            this.graphics.lineStyle(28, 0x1a120c); this.graphics.beginPath(); this.graphics.moveTo(rootBaseX + tremorX, root.y + tremorY + 15);
            let currentX = rootBaseX; let currentY = root.y + 15; let points = []; points.push({x: currentX + tremorX, y: currentY + tremorY});
            for(let i = 1; i <= 8; i++) {
                currentX += (20 * dir); currentY = root.y - Math.sin(t + i * 0.5) * 25 - (i * 3); 
                let px = currentX + tremorX; let py = currentY + tremorY;
                this.graphics.lineTo(px, py); points.push({x: px, y: py});
            }
            this.graphics.strokePath();

            this.graphics.lineStyle(4, 0x00ff55, 0.8); this.graphics.beginPath(); this.graphics.moveTo(points[0].x, points[0].y);
            for(let i = 1; i < points.length; i++) this.graphics.lineTo(points[i].x, points[i].y + Math.sin(i) * 5); 
            this.graphics.strokePath();

            this.graphics.lineStyle(8, 0x0a0502);
            for(let i = 2; i < points.length - 1; i += 2) {
                let px = points[i].x; let py = points[i].y;
                let branchLength = 30 + Math.sin(t + i) * 10;
                let endX = px - (branchLength * dir * 0.5) + Math.cos(t * 0.5 + i) * 10; let endY = py - branchLength + Math.sin(t * 0.5 + i) * 10;
                this.graphics.beginPath(); this.graphics.moveTo(px, py); this.graphics.lineTo(endX, endY); this.graphics.strokePath();
                this.graphics.lineStyle(3, 0x44ff88, 0.9); this.graphics.beginPath(); this.graphics.moveTo(px, py); this.graphics.lineTo(endX, endY); this.graphics.strokePath(); this.graphics.lineStyle(8, 0x0a0502);
            }
            
            let tipX = points[points.length - 1].x; let tipY = points[points.length - 1].y;
            this.graphics.fillStyle(0x0a0502); this.graphics.fillTriangle(tipX, tipY - 15, tipX, tipY + 15, tipX + (40 * dir), tipY + Math.sin(t*3)*10);
            this.graphics.fillStyle(0x00ff66, 0.6); this.graphics.fillCircle(tipX + (10 * dir), tipY, 8);
        }
    }

    drawPiercingBranches() {
        for(let branch of this.piercingBranches) {
            let warnAlpha = Math.min(branch.timer / 30, 0.8);
            if(branch.timer < branch.strikeTime) {
                this.graphics.lineStyle(4, 0x00ff66, warnAlpha); this.graphics.beginPath(); this.graphics.moveTo(0, branch.y); this.graphics.lineTo(1280, branch.y); this.graphics.strokePath();
            } 
            else {
                this.graphics.fillStyle(0x1a120c); this.graphics.fillRect(0, branch.y - 30, 1280, 60);
                this.graphics.lineStyle(4, 0x00ff66, 0.5); this.graphics.beginPath(); this.graphics.moveTo(0, branch.y - 15); this.graphics.lineTo(1280, branch.y - 15); this.graphics.moveTo(0, branch.y + 15); this.graphics.lineTo(1280, branch.y + 15); this.graphics.strokePath();
                this.graphics.fillStyle(0x110a05);
                for(let k=0; k<1280; k+=150) {
                    this.graphics.fillTriangle(k, branch.y - 30, k+40, branch.y - 30, k+20, branch.y - 60); this.graphics.fillTriangle(k+75, branch.y + 30, k+115, branch.y + 30, k+95, branch.y + 60);
                }
            }
        }
    }

    drawDangerZones() {
        for(let zone of this.dangerZones) {
            let intensity = zone.duration / 200;
            this.graphics.fillStyle(0x051a05, 0.9); this.graphics.fillRect(0, zone.y - 20, 1280, 150);
            this.graphics.lineStyle(4, 0x00ff66, intensity);
            for(let i = 0; i < 40; i++) {
                let rx = i * 32; let rh = Math.random() * 80;
                this.graphics.beginPath(); this.graphics.moveTo(rx, zone.y + 20); this.graphics.lineTo(rx + Math.random()*30 - 15, zone.y - rh); this.graphics.strokePath();
            }
        }
    }

    drawProceduralRoot(x1, y1, cx, cy, x2, y2) {
        this.graphics.beginPath(); this.graphics.moveTo(x1, y1);
        for(let i=1; i<=10; i++) {
            let bt = i/10; let px = Math.pow(1-bt, 2)*x1 + 2*(1-bt)*bt*cx + Math.pow(bt, 2)*x2; let py = Math.pow(1-bt, 2)*y1 + 2*(1-bt)*bt*cy + Math.pow(bt, 2)*y2; this.graphics.lineTo(px, py);
        }
        this.graphics.strokePath();
    }

    drawColossalBoss() {
        let x = this.boss.x; let y = this.boss.y; let tilt = this.boss.bodyTilt; let t = this.boss.animationTime;
        let deadFade = this.boss.isDead ? Math.min(this.boss.deathTimer / 100, 1) : 0; 

        this.graphics.fillStyle(0x0a0502);
        this.graphics.beginPath(); this.graphics.moveTo(x - 500, 620);
        for(let i=0; i<=10; i++) { let bt = i/10; this.graphics.lineTo(Math.pow(1-bt, 2)*(x-500) + 2*(1-bt)*bt*(x-150) + Math.pow(bt, 2)*(x - 80 + tilt*5), Math.pow(1-bt, 2)*620 + 2*(1-bt)*bt*400 + Math.pow(bt, 2)*(y + 80)); }
        for(let i=10; i>=0; i--) { let bt = i/10; this.graphics.lineTo(Math.pow(1-bt, 2)*(x+500) + 2*(1-bt)*bt*(x+150) + Math.pow(bt, 2)*(x + 80 + tilt*5), Math.pow(1-bt, 2)*620 + 2*(1-bt)*bt*400 + Math.pow(bt, 2)*(y + 80)); }
        this.graphics.fill();

        let baseGlow = this.boss.phase === 2 && !this.boss.isDead ? (Math.sin(t*2)*0.4+0.5) : 0.2;
        this.graphics.lineStyle(4, 0x00ff44, baseGlow * (1-deadFade));
        for(let r=0; r<8; r++) this.drawProceduralRoot(x - 300 + r*80, 620, x - 100 + r*30, 500, x, y + 100);

        this.graphics.save();
        this.graphics.translateCanvas(x, y + 50); this.graphics.rotateCanvas(tilt * Math.PI / 180);
        
        this.graphics.fillStyle(0x1a120c); this.graphics.fillEllipse(0, 0, 180, 240);
        this.graphics.lineStyle(4, 0x00ff66, (0.4 + this.boss.darkness) * (1-deadFade)); 
        this.drawProceduralRoot(-60, -80, -40, 0, -30, 100); this.drawProceduralRoot(50, -70, 70, 0, 40, 110);

        let corePulse = Math.sin(t * 5) * 0.4 + 0.6;
        let rootRetract = this.boss.coreExposed ? 45 : 0; 
        if(this.boss.isDead) rootRetract = 0;

        this.graphics.fillStyle(0x020502, 0.95); this.graphics.fillEllipse(0, 10, 90, 120);

        if((this.boss.coreExposed || this.boss.phase === 2) && !this.boss.isDead) {
            this.graphics.fillStyle(0x00ff66, corePulse);
            this.graphics.beginPath(); this.graphics.moveTo(0, -30); this.graphics.lineTo(35, 10); this.graphics.lineTo(0, 50); this.graphics.lineTo(-35, 10); this.graphics.fill();
            this.graphics.fillStyle(0xccffcc, corePulse * 1.5); this.graphics.fillEllipse(0, 10, 20, 40);
            this.graphics.lineStyle(3, 0x44ff44, corePulse);
            for(let v = 0; v < 6; v++) {
                let a = (v/6) * Math.PI * 2 + t;
                this.drawProceduralRoot(Math.cos(a)*20, 10 + Math.sin(a)*20, Math.cos(a)*50, 10 + Math.sin(a)*50, Math.cos(a)*80, 10 + Math.sin(a)*80);
            }
        }

        this.graphics.lineStyle(18, 0x110805);
        this.drawProceduralRoot(-80, -20, -rootRetract, 10, 0, 80); 
        this.drawProceduralRoot(80, -10, rootRetract, 20, -10, 90);  
        this.drawProceduralRoot(-60, 50, 0, 30 + rootRetract, 70, -20); 
        this.graphics.restore();

        let armLift = this.boss.isDead ? -80 : Math.cos(t) * 30;
        let armStretch = this.boss.isDead ? 0 : Math.sin(t * 0.5) * 20;

        let sLX = x - 110 + tilt, sLY = y; let eLX = sLX - 100 - armStretch, eLY = sLY + 120 + armLift; let mLX = eLX - 20, mLY = eLY + 180 - armLift; 
        this.graphics.lineStyle(40, 0x1a120c); this.drawProceduralRoot(sLX, sLY, eLX, eLY, mLX, mLY);
        this.graphics.lineStyle(15, 0x0a0502); this.drawProceduralRoot(mLX, mLY, mLX-30, mLY+30, mLX-50, mLY+80); this.drawProceduralRoot(mLX, mLY, mLX, mLY+40, mLX+10, mLY+90); this.drawProceduralRoot(mLX, mLY, mLX+20, mLY+30, mLX+40, mLY+70);

        let sRX = x + 110 + tilt, sRY = y; let eRX = sRX + 100 + armStretch, eRY = sRY + 120 - armLift; let mRX = eRX + 20, mRY = eRY + 180 + armLift;
        this.graphics.lineStyle(40, 0x1a120c); this.drawProceduralRoot(sRX, sRY, eRX, eRY, mRX, mRY);
        this.graphics.lineStyle(15, 0x0a0502); this.drawProceduralRoot(mRX, mRY, mRX+30, mRY+30, mRX+50, mRY+80); this.drawProceduralRoot(mRX, mRY, mRX, mRY+40, mRX-10, mRY+90); this.drawProceduralRoot(mRX, mRY, mRX-20, mRY+30, mRX-40, mRY+70);

        let headY = y - 130 + (this.boss.isDead ? 40 : Math.sin(t * 2) * 5); 
        let hX = x + tilt;

        this.graphics.fillStyle(0x0f0a05); this.graphics.beginPath();
        this.graphics.moveTo(hX - 30, headY - 60); this.graphics.lineTo(hX + 30, headY - 60); this.graphics.lineTo(hX + 45, headY);
        this.graphics.lineTo(hX + 20, headY + 70); this.graphics.lineTo(hX - 20, headY + 70); this.graphics.lineTo(hX - 45, headY); this.graphics.fill();

        this.graphics.lineStyle(3, 0x00ff66, 0.5 * (1-deadFade)); this.drawProceduralRoot(hX, headY - 50, hX + 10, headY, hX - 5, headY + 60);
        
        let eyeGlow = this.boss.isDead ? 0 : Math.sin(t * 3) * 0.4 + 0.6;
        let eyeColor = this.boss.phase === 2 ? 0x00ff00 : 0x00ff66;
        
        for(let s=1; s<=4; s++) {
            this.graphics.fillStyle(eyeColor, eyeGlow / (s*1.5));
            this.graphics.fillCircle(hX - 18 + Math.sin(t*5+s)*4, headY - 10 - s*8, 5 + s);
            this.graphics.fillCircle(hX + 18 + Math.cos(t*5+s)*4, headY - 10 - s*8, 5 + s);
        }
        this.graphics.fillStyle(0xffffff, eyeGlow + 0.2); this.graphics.fillCircle(hX - 18, headY - 10, 4); this.graphics.fillCircle(hX + 18, headY - 10, 4);

        this.graphics.lineStyle(20, 0x110a05); this.drawProceduralRoot(hX - 25, headY - 50, hX - 80, headY - 100, hX - 150, headY - 180); this.drawProceduralRoot(hX + 25, headY - 50, hX + 80, headY - 100, hX + 150, headY - 180);
        this.graphics.lineStyle(8, 0x110a05); this.drawProceduralRoot(hX - 80, headY - 100, hX - 120, headY - 120, hX - 130, headY - 90); this.drawProceduralRoot(hX + 80, headY - 100, hX + 120, headY - 120, hX + 130, headY - 90);
        this.graphics.lineStyle(3, 0x1d4a1d, 0.7 * (1-deadFade));
        for(let m=0; m<4; m++) {
            this.graphics.beginPath(); this.graphics.moveTo(hX - 100 + m*10, headY - 120 + m*10); this.graphics.lineTo(hX - 100 + m*10 + Math.sin(t+m)*5, headY - 50 + m*15); this.graphics.strokePath();
            this.graphics.beginPath(); this.graphics.moveTo(hX + 100 - m*10, headY - 120 + m*10); this.graphics.lineTo(hX + 100 - m*10 + Math.cos(t+m)*5, headY - 50 + m*15); this.graphics.strokePath();
        }
    }

    drawBouncers() {
        let t = this.time.now * 0.002;
        let deadFade = this.boss.isDead ? Math.min(this.boss.deathTimer / 100, 1) : 0;

        for(let bush of this.bushes) {
            let height = 45 - bush.compress; let currentY = bush.y - height / 2; let breathe = Math.sin(t + bush.x) * 3;
            this.graphics.fillStyle(0x1a3a1a); this.graphics.fillEllipse(bush.x, currentY + 5, bush.width * 1.1, height * 1.1);
            this.graphics.fillStyle(this.boss.isDead ? 0x2a3a2a : 0x2a5a2a); this.graphics.fillEllipse(bush.x - 10, currentY + breathe, bush.width * 0.6, height * 0.8); this.graphics.fillEllipse(bush.x + 10, currentY - breathe, bush.width * 0.6, height * 0.8); this.graphics.fillEllipse(bush.x, currentY - 5, bush.width * 0.8, height * 0.9);
            this.graphics.fillStyle(0x00ff66, 0.4 * (1-deadFade)); this.graphics.fillEllipse(bush.x, currentY, bush.width * 0.5, height * 0.5);
            this.graphics.fillStyle(0x88ff88, 0.9 * (1-deadFade)); this.graphics.fillCircle(bush.x - 12, currentY - 8 + breathe, 3); this.graphics.fillCircle(bush.x + 15, currentY + 2 - breathe, 4);
        }

        for(let flower of this.flowers) {
            let currentRadius = flower.radius - (flower.compress * 0.5); let currentY = flower.y + flower.compress; let sway = Math.sin(t + flower.x) * 5; 
            this.graphics.lineStyle(8, 0x1d4a1d); this.drawProceduralRoot(flower.x, this.groundY + 10, flower.x + sway * 2, currentY + 20, flower.x + sway, currentY);
            this.graphics.fillStyle(0x2d5f2d); this.graphics.fillEllipse(flower.x - 15 + sway, currentY + 20, 20, 8); this.graphics.fillEllipse(flower.x + 15 + sway, currentY + 30, 20, 8);
            let fX = flower.x + sway;
            this.graphics.fillStyle(this.boss.isDead ? 0x552233 : 0x008844);
            for(let i=0; i<3; i++) { let angle = (i / 3) * Math.PI + Math.PI; this.graphics.fillEllipse(fX + Math.cos(angle) * 10, currentY + Math.sin(angle) * 10, currentRadius * 1.5, currentRadius * 0.8); }
            this.graphics.fillStyle(this.boss.isDead ? 0x884455 : 0x00cc66); let pLift = flower.compress > 0 ? 15 : 0; 
            this.graphics.fillEllipse(fX - 15, currentY - pLift, currentRadius * 1.4, currentRadius * 0.6); this.graphics.fillEllipse(fX + 15, currentY - pLift, currentRadius * 1.4, currentRadius * 0.6); this.graphics.fillEllipse(fX, currentY + 5, currentRadius * 1.8, currentRadius * 0.8);
            this.graphics.fillStyle(0xdcffdc, 1-deadFade); this.graphics.fillCircle(fX, currentY - 5, currentRadius * 0.4);
        }
    }

    drawArena() {
        this.drawTree(150, 200, 80, 400); this.drawTree(1130, 200, 80, 400);
        for(let platform of this.platforms) {
            this.graphics.fillStyle(0x1a120c); this.graphics.beginPath(); this.graphics.moveTo(platform.x - platform.width/2, platform.y); this.graphics.lineTo(platform.x + platform.width/2, platform.y); this.graphics.lineTo(platform.x + platform.width/2.5, platform.y + platform.height); this.graphics.lineTo(platform.x - platform.width/2.5, platform.y + platform.height); this.graphics.closePath(); this.graphics.fill();
            this.graphics.lineStyle(2, 0x050200, 0.6); this.graphics.beginPath(); this.graphics.moveTo(platform.x - platform.width/2.2, platform.y + 4); this.graphics.lineTo(platform.x + platform.width/2.2, platform.y + 4); this.graphics.strokePath();
            this.graphics.fillStyle(0x1d4a1d, 0.9); this.graphics.fillEllipse(platform.x - platform.width/3, platform.y, 25, 8); this.graphics.fillEllipse(platform.x, platform.y, 40, 10); this.graphics.fillEllipse(platform.x + platform.width/3, platform.y, 25, 8);
        }
    }

    drawTree(x, y, width, height) {
        let deadFade = this.boss.isDead ? Math.min(this.boss.deathTimer / 100, 1) : 0;
        this.graphics.fillStyle(0x1a120c); this.graphics.beginPath(); this.graphics.moveTo(x - width/2, y); this.graphics.lineTo(x + width/2, y); this.graphics.lineTo(x + width/2 + 30, y + height); this.graphics.lineTo(x - width/2 - 30, y + height); this.graphics.fill();
        this.graphics.lineStyle(3, 0x050200, 0.6);
        for(let i = 0; i < 6; i++) { this.graphics.beginPath(); let startX = x - width / 2.5 + i * width / 5; this.graphics.moveTo(startX, y); for(let j = 0; j < height; j+=40) { this.graphics.lineTo(startX + Math.sin(j * 0.05 + i) * 8, y + j); } this.graphics.strokePath(); }
        this.graphics.lineStyle(16, 0x110a05); this.drawProceduralRoot(x, y + 80, x - width * 2, y + 40, x - width * 1.8, y - 20); this.drawProceduralRoot(x, y + 100, x + width * 2, y + 50, x + width * 1.6, y - 10);
        this.graphics.fillStyle(0x0a1a0a, 0.8 * (1-deadFade)); this.graphics.fillCircle(x, y - 40, 80); this.graphics.fillCircle(x - 60, y - 10, 60); this.graphics.fillCircle(x + 60, y - 10, 60);
        this.graphics.fillStyle(0x1d4a1d, 0.9 * (1-deadFade)); this.graphics.fillCircle(x, y - 30, 60); this.graphics.fillCircle(x - 50, y, 40); this.graphics.fillCircle(x + 50, y, 40);
    }

    drawPlayer(){
        let x = this.player.x; let y = this.player.y; let flip = this.player.direction; 
        let pointer = this.input.activePointer; let aimAngle = Phaser.Math.Angle.Between(x, y - 20, pointer.x, pointer.y);

        this.graphics.fillStyle(0x000000,0.35); this.graphics.fillEllipse(x, 610, 36, 8);

        let legSwing = Math.sin(this.player.animationTime) * 12; let legSwingOff = Math.sin(this.player.animationTime + Math.PI) * 12; let bodyTilt = Math.sin(this.player.animationTime * 0.5) * 4; 
        if(!this.player.onGround) { legSwing = -10; legSwingOff = 10; bodyTilt = 10; }

        this.graphics.lineStyle(9, 0x2d2d2d); this.graphics.beginPath(); this.graphics.moveTo(x - 6 * flip, y); this.graphics.lineTo(x - 6 * flip + legSwing * flip, y + 30); this.graphics.strokePath(); this.graphics.beginPath(); this.graphics.moveTo(x + 6 * flip, y); this.graphics.lineTo(x + 6 * flip + legSwingOff * flip, y + 30); this.graphics.strokePath();

        let capeWave = Math.sin(this.player.animationTime * 0.8) * 4; this.graphics.fillStyle(0x111111); this.graphics.fillTriangle(x - 24 * flip, y + 20 + capeWave, x + 24 * flip, y + 20 + capeWave * 0.5, x + capeWave * flip, y - 8); this.graphics.fillStyle(0x1f1f1f); this.graphics.fillTriangle(x - 16 * flip, y + 25, x + 16 * flip, y + 25, x, y - 2);

        this.graphics.fillStyle(0x2d2d2d); this.graphics.save(); this.graphics.translateCanvas(x, y - 10); this.graphics.rotateCanvas((bodyTilt * flip) * Math.PI / 180); this.graphics.fillRect(-10 * flip, -18, 20 * flip, 30); this.graphics.restore();

        let shoulderX = x; let shoulderY = y - 18; let armLength = 25; let elbowX = shoulderX + Math.cos(aimAngle) * armLength; let elbowY = shoulderY + Math.sin(aimAngle) * armLength;

        this.graphics.lineStyle(8, 0x2d2d2d); this.graphics.beginPath(); this.graphics.moveTo(shoulderX, shoulderY); this.graphics.lineTo(elbowX, elbowY); this.graphics.strokePath(); this.graphics.fillStyle(0x3a3a3a); this.graphics.fillCircle(elbowX, elbowY, 4); 

        let swordLength = 40; let kickback = 0; if(this.player.isAttacking) { let atkP = Math.min(this.player.attackTime / 8, 1); kickback = Math.sin(atkP * Math.PI) * -8; this.player.attackTime++; }

        let swordTipX = elbowX + Math.cos(aimAngle) * (swordLength + kickback); let swordTipY = elbowY + Math.sin(aimAngle) * (swordLength + kickback); let handleX = elbowX + Math.cos(aimAngle) * kickback; let handleY = elbowY + Math.sin(aimAngle) * kickback;

        this.graphics.lineStyle(5, 0xbdbdbd); this.graphics.beginPath(); this.graphics.moveTo(handleX, handleY); this.graphics.lineTo(swordTipX, swordTipY); this.graphics.strokePath();

        let bladeGlow = this.player.isAttacking ? 0.8 : Math.sin(this.player.animationTime * 2) * 0.2 + 0.3; this.graphics.lineStyle(2, 0xaaddff, bladeGlow); this.graphics.beginPath(); this.graphics.moveTo(handleX, handleY); this.graphics.lineTo(swordTipX, swordTipY); this.graphics.strokePath();

        this.graphics.fillStyle(0xf5f5f5); this.graphics.fillEllipse(x, y - 45, 30, 28); this.graphics.fillTriangle(x - 12 * flip,y - 52, x - 15 * flip,y - 72, x - 2 * flip,y - 50); this.graphics.fillTriangle(x + 12 * flip,y - 52, x + 15 * flip,y - 72, x + 2 * flip,y - 50);
        this.graphics.fillStyle(0x111111); this.graphics.fillTriangle(x - 10 * flip,y - 45, x - 3 * flip,y - 42, x - 10 * flip,y - 39); this.graphics.fillTriangle(x + 10 * flip,y - 45, x + 3 * flip,y - 42, x + 10 * flip,y - 39);
        this.graphics.fillStyle(0xaa0000); this.graphics.fillTriangle(x - 13 * flip,y - 36, x - 7 * flip,y - 40, x - 9 * flip,y - 32); this.graphics.fillTriangle(x + 13 * flip,y - 36, x + 7 * flip,y - 40, x + 9 * flip,y - 32);
    }

    drawSlashes(){
        for(let slash of this.slashes){
            this.graphics.save(); this.graphics.translateCanvas(slash.x, slash.y); this.graphics.rotateCanvas(slash.angle);
            this.graphics.fillStyle(0xaaddff, 0.9); this.graphics.beginPath(); this.graphics.arc(0, 0, 25, -Math.PI/2, Math.PI/2, false); this.graphics.arc(-12, 0, 20, Math.PI/2, -Math.PI/2, true); this.graphics.fill();
            this.graphics.fillStyle(0x66ccff, 0.3); this.graphics.fillEllipse(0, 0, 45, 20);
            this.graphics.lineStyle(4, 0xffffff, slash.life / 60); this.graphics.beginPath(); this.graphics.moveTo(-25, 0); this.graphics.lineTo(-45, 0); this.graphics.strokePath();
            this.graphics.restore();
        }
    }

    drawHealthBars(){
        this.graphics.fillStyle(0x222222); this.graphics.fillRect(20, 20, 220, 24); this.graphics.fillStyle(0xff4444); this.graphics.fillRect(20, 20, 220 * Math.max(0, this.player.hp / this.player.maxHp), 24); this.graphics.lineStyle(2, 0xffffff); this.graphics.strokeRect(20, 20, 220, 24);
        this.graphics.fillStyle(0x222222); this.graphics.fillRect(1040, 20, 240, 24); this.graphics.fillStyle(0x00ff66); this.graphics.fillRect(1040, 20, 240 * Math.max(0, this.boss.hp / this.boss.maxHp), 24); this.graphics.lineStyle(2, 0x00ff66); this.graphics.strokeRect(1040, 20, 240, 24);
        if(this.boss.phase === 2) { this.graphics.lineStyle(3, 0xffffffff); this.graphics.strokeRect(1035, 15, 250, 34); }
    }
}


/*==================================================
====================================================
MOUNTAIN KING - PREDADOR CELESTIAL
====================================================
==================================================*/

class MountainBossScene extends Phaser.Scene{

    constructor(){
        super("MountainBossScene");
    }

    create(){
        this.graphics = this.add.graphics();
        
        // FÍSICA REAL DO PENHASCO (Lado esquerdo sólido)
        this.cliff = { x: 0, y: 550, width: 450, height: 200 };

        this.clouds = [];
        this.spawnClouds();

        // PLAYER SPAWNA EM SEGURANÇA NO PENHASCO
        this.player = {
            x: 150, y: 400, width: 40, height: 70,
            velocityY: 0, speed: 8, jumpForce: -17, gravity: 0.85, 
            onGround: false, hasAirDash: true, 
            hp: 100, maxHp: 100, dashCooldown: false, animationTime: 0, direction: 1,
            isAttacking: false, attackTime: 0, onPlatform: null
        };

        // ÁGUIA HARPIA COLOSSAL PROCEDURAL
        this.boss = {
            x: 950, y: 300, 
            hp: 1200, maxHp: 1200,
            attackCooldown: false, state: "HOVER_RIGHT", stateTimer: 0,
            animationTime: 0, phase: 1,
            targetX: 950, targetY: 300, vulnerable: false,
            isDead: false, deathTimer: 0
        };

        this.windActive = false;
        this.windForce = 0;
        this.feathers = [];
        this.lightnings = [];
        this.tornados = []; // Novo ataque da Fase 2
        
        this.slashes = [];
        this.playerAttackCooldown = false;

        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D,
            dash: Phaser.Input.Keyboard.KeyCodes.SHIFT
        });
        this.input.on('pointermove', function () {});

        this.createUI();
    }

    spawnClouds() {
        this.clouds.push({ x: 550, y: 450, width: 120, height: 20, wobble: 0 });
        this.clouds.push({ x: 800, y: 350, width: 140, height: 25, wobble: 1 });
        this.clouds.push({ x: 1050, y: 480, width: 120, height: 20, wobble: 2 });
        this.clouds.push({ x: 1200, y: 300, width: 100, height: 20, wobble: 3 });
    }

    createUI(){
        this.bossName = this.add.text(
            380, 40, "THE MOUNTAIN KING",
            { fontSize:"34px", color:"#aaddff", fontFamily:"monospace", fontStyle:"bold" }
        );
        this.phaseText = this.add.text(
            640, 680, "PHASE 1",
            { fontSize:"18px", color:"#ffffff", fontFamily:"monospace" }
        ).setOrigin(0.5);
    }

    update(){
        if(!this.boss.isDead) {
            this.playerMovement();
            this.handleCombat();
        }

        this.updatePhysics();
        this.updateSlashes();
        this.updateClouds();
        this.updateAttacks();
        
        if(!this.boss.isDead) {
            this.bossAI();
            this.checkGameOver();
        } else {
            this.handleDeathSequence();
        }

        this.renderScene();
    }

    updateClouds() {
        let cloudSpeedY = 0;
        if(this.boss.state === "TRANSITION") cloudSpeedY = 25; 
        if(this.boss.phase === 2 && !this.boss.isDead) cloudSpeedY = 12; 
        if(this.boss.isDead) cloudSpeedY = -8; 

        for(let c of this.clouds) {
            c.wobble += 0.05;
            c.y += Math.sin(c.wobble) * 0.5 + cloudSpeedY;
            if(c.y > 800) { c.y = -50; c.x = Phaser.Math.Between(100, 1180); }
            if(c.y < -100) { c.y = 800; c.x = Phaser.Math.Between(100, 1180); }
        }

        if(this.boss.phase === 2 && this.player.y > 800 && !this.boss.isDead) {
            this.player.hp -= 15;
            this.cameras.main.shake(100, 0.005);
            this.player.x = 640; this.player.y = 100; this.player.velocityY = 0;
        }
    }

    bossAI() {
        this.boss.animationTime += 0.05;

        // Gatilho da Transição Épica para Fase 2
        if(this.boss.hp < this.boss.maxHp * 0.5 && this.boss.phase === 1 && this.boss.state !== "TRANSITION") {
            this.boss.state = "TRANSITION";
            this.boss.stateTimer = 0;
            this.boss.attackCooldown = true;
            this.player.invulnerable = true;
            this.phaseText.setText("PHASE 2 - TEMPEST OVERLORD");
            this.phaseText.setColor("#00ffff");
        }

        this.boss.stateTimer++;

        // FASE 1: HOVER (Mora do Lado Direito controlando a arena - Justo)
        if(this.boss.state === "HOVER_RIGHT") {
            // Fica flutuando entre X: 900 e 1100, seguro para o player na montanha
            this.boss.targetX = 1000 + Math.cos(this.boss.animationTime) * 100;
            this.boss.x += (this.boss.targetX - this.boss.x) * 0.05;
            this.boss.y = 300 + Math.sin(this.boss.animationTime) * 100;
            
            if(!this.boss.attackCooldown) {
                this.boss.attackCooldown = true;
                // BITE substituido por TALON_STRIKE
                this.boss.state = Phaser.Utils.Array.GetRandom(["WIND", "LIGHTNING", "FEATHERS", "TALON_STRIKE"]);
                this.boss.stateTimer = 0;
            }
        }
        else if(this.boss.state === "TRANSITION") {
            if(this.boss.stateTimer < 60) {
                this.boss.x += (this.player.x - this.boss.x) * 0.1;
                this.boss.y += (this.player.y - this.boss.y) * 0.1;
            } else if(this.boss.stateTimer < 180) {
                this.boss.y -= 5;
                this.player.x = this.boss.x;
                this.player.y = this.boss.y + 120; // Agarrado pelas garras
                this.cameras.main.shake(100, 0.005);
            } else {
                this.boss.phase = 2;
                this.boss.state = "HOVER_HIGH";
                this.boss.attackCooldown = false;
                this.player.invulnerable = false;
                this.player.y = 200; 
                this.clouds = [];
                for(let i=0; i<5; i++) this.clouds.push({ x: 200 + i*200, y: 500 + Phaser.Math.Between(-100,100), width: 120, height: 25, wobble: i });
            }
        }
        // FASE 2: CÉU ABERTO
        else if(this.boss.state === "HOVER_HIGH") {
            this.boss.targetX = 640 + Math.cos(this.boss.animationTime * 0.5) * 400;
            this.boss.targetY = 200 + Math.sin(this.boss.animationTime) * 100;
            this.boss.x += (this.boss.targetX - this.boss.x) * 0.05;
            this.boss.y += (this.boss.targetY - this.boss.y) * 0.05;

            if(!this.boss.attackCooldown) {
                this.boss.attackCooldown = true;
                this.boss.state = Phaser.Utils.Array.GetRandom(["DIVE", "STORM", "SWOOP", "TORNADO"]);
                this.boss.stateTimer = 0;
            }
        }
        // ATAQUES
        else if(this.boss.state === "FEATHERS") {
            this.boss.y = 300 + Math.sin(this.boss.animationTime) * 100; 
            if(this.boss.stateTimer % 20 === 0 && this.boss.stateTimer < 100) {
                let angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
                this.feathers.push({ x: this.boss.x, y: this.boss.y, vx: Math.cos(angle)*15, vy: Math.sin(angle)*15, angle: angle, life: 120 });
            }
            if(this.boss.stateTimer > 150) { this.boss.state = "HOVER_RIGHT"; this.boss.attackCooldown = false; }
        }
        else if(this.boss.state === "WIND") {
            if(this.boss.stateTimer === 10) { this.windActive = true; this.windForce = -6; } 
            if(this.boss.stateTimer > 150) { this.windActive = false; this.windForce = 0; this.boss.state = "HOVER_RIGHT"; this.boss.attackCooldown = false; }
        }
        else if(this.boss.state === "LIGHTNING" || this.boss.state === "STORM") {
            if(this.boss.stateTimer % 30 === 0 && this.boss.stateTimer < 150) {
                this.lightnings.push({ x: this.player.x, timer: 0, strikeTime: 40 });
            }
            if(this.boss.stateTimer > 200) { this.boss.state = this.boss.phase===1 ? "HOVER_RIGHT" : "HOVER_HIGH"; this.boss.attackCooldown = false; }
        }
        else if(this.boss.state === "TALON_STRIKE") {
            // Avança até o centro e recua (Não prende o player no penhasco)
            if(this.boss.stateTimer < 30) { this.boss.x -= 15; } // Avança rápido
            else if(this.boss.stateTimer > 60 && this.boss.stateTimer < 100) { this.boss.x += 10; } // Recua
            else if(this.boss.stateTimer > 100) { this.boss.state = "HOVER_RIGHT"; this.boss.attackCooldown = false; }
            
            // Dano do bote se o player não pular/dar dash
            if(this.boss.stateTimer > 30 && this.boss.stateTimer < 60 && Math.abs(this.player.x - this.boss.x) < 120) { this.player.hp -= 15; }
        }
        else if(this.boss.state === "TORNADO") { // NOVO ATAQUE DA FASE 2
            if(this.boss.stateTimer === 30) {
                this.tornados.push({ x: 1300, speed: -5, life: 300 });
                this.tornados.push({ x: -50, speed: 5, life: 300 });
            }
            if(this.boss.stateTimer > 180) { this.boss.state = "HOVER_HIGH"; this.boss.attackCooldown = false; }
        }
        else if(this.boss.state === "DIVE") {
            if(this.boss.stateTimer < 60) { this.boss.y -= 10; this.boss.targetX = this.player.x; } 
            else if(this.boss.stateTimer === 60) { this.boss.x = this.boss.targetX; this.boss.y = -200; }
            else if(this.boss.stateTimer > 60 && this.boss.stateTimer < 80) { this.boss.y += 50; } 
            else if(this.boss.stateTimer === 80) {
                this.cameras.main.shake(400, 0.02);
                if(Math.abs(this.player.x - this.boss.x) < 150 && Math.abs(this.player.y - this.boss.y) < 150) this.player.hp -= 25;
                this.boss.vulnerable = true; 
            }
            if(this.boss.stateTimer > 250) { this.boss.vulnerable = false; this.boss.state = "HOVER_HIGH"; this.boss.attackCooldown = false; }
        }
        else if(this.boss.state === "SWOOP") {
            if(this.boss.stateTimer < 40) { this.boss.x = -200; this.boss.y = this.player.y; }
            else if(this.boss.stateTimer > 40 && this.boss.stateTimer < 80) { this.boss.x += 40; } 
            if(this.boss.stateTimer > 40 && this.boss.stateTimer < 80 && Math.abs(this.player.x - this.boss.x) < 120) { this.player.hp -= 20; }
            if(this.boss.stateTimer > 120) { this.boss.state = "HOVER_HIGH"; this.boss.attackCooldown = false; }
        }
    }

    updateAttacks() {
        for(let i = this.feathers.length - 1; i >= 0; i--) {
            let f = this.feathers[i];
            f.x += f.vx; f.y += f.vy; f.life--;
            if(Math.abs(this.player.x - f.x) < 20 && Math.abs(this.player.y - f.y) < 30) {
                this.player.hp -= 8;
                this.cameras.main.shake(50, 0.002);
                this.feathers.splice(i, 1);
                continue;
            }
            if(f.life <= 0) this.feathers.splice(i, 1);
        }

        for(let i = this.lightnings.length - 1; i >= 0; i--) {
            let L = this.lightnings[i];
            L.timer++;
            if(L.timer === L.strikeTime) {
                this.cameras.main.shake(150, 0.008);
                if(Math.abs(this.player.x - L.x) < 40) this.player.hp -= 15;
            }
            if(L.timer > L.strikeTime + 20) this.lightnings.splice(i, 1);
        }

        for(let i = this.tornados.length - 1; i >= 0; i--) {
            let t = this.tornados[i];
            t.x += t.speed;
            t.life--;
            if(Math.abs(this.player.x - t.x) < 60) {
                this.player.hp -= 2; // Dano contínuo
                this.player.velocityY -= 1; // Joga pra cima
            }
            if(t.life <= 0) this.tornados.splice(i, 1);
        }

        if(this.windActive) {
            this.player.x += this.windForce;
        }
    }

    checkGameOver() {
        if(this.player.hp <= 0) {
            this.cameras.main.fadeOut(800);
            this.time.delayedCall(800, ()=> this.scene.start("MapScene"));
        }
        if(this.boss.hp <= 0 && !this.boss.isDead) {
            this.boss.isDead = true;
            this.boss.attackCooldown = true;
            this.boss.state = "DYING";
            this.player.invulnerable = true;
            this.cameras.main.shake(5000, 0.01);
            this.phaseText.setText("KINGDOM FALLEN");
            this.phaseText.setColor("#ffffff");
        }
    }

    handleDeathSequence() {
        this.boss.deathTimer++;
        
        this.boss.y += 4; 
        this.boss.animationTime += 0.01; 

        if(this.boss.deathTimer % 15 === 0) {
            this.lightnings.push({ x: this.boss.x + Phaser.Math.Between(-150, 150), timer: 0, strikeTime: 10 });
        }

        if(this.boss.deathTimer === 250) {
            window.gameProgress.mountainCleared = true; 
            this.cameras.main.fadeOut(3000, 255, 255, 255); 
            this.time.delayedCall(3000, ()=> this.scene.start("MapScene"));
        }
    }

    playerMovement(){
        if(this.keys.left.isDown){ this.player.x -= this.player.speed; this.player.direction = -1; this.player.animationTime += 0.2; }
        if(this.keys.right.isDown){ this.player.x += this.player.speed; this.player.direction = 1; this.player.animationTime += 0.2; }
        if(!this.keys.left.isDown && !this.keys.right.isDown) this.player.animationTime *= 0.85; 

        this.player.onPlatform = null;
        let nextY = this.player.y + this.player.velocityY; 
        
        // FÍSICA DO PENHASCO (Lado Esquerdo da Fase 1) - Resolvido!
        if(this.boss.phase === 1 && this.player.x >= this.cliff.x && this.player.x <= this.cliff.x + this.cliff.width) {
            if(this.player.velocityY >= 0 && this.player.y <= this.cliff.y + 15 && nextY >= this.cliff.y - 20) {
                this.player.onPlatform = this.cliff;
                this.player.y = this.cliff.y;
                this.player.velocityY = 0;
                this.player.onGround = true;
                this.player.hasAirDash = true;
            }
        }

        if(!this.keys.down.isDown) {
            for(let c of this.clouds) {
                if(this.player.x > c.x - c.width / 2 && this.player.x < c.x + c.width / 2) {
                    if(this.player.velocityY >= 0 && this.player.y <= c.y + 15 && nextY >= c.y - 20) {
                        this.player.onPlatform = c; this.player.y = c.y; this.player.velocityY = 0;
                        this.player.onGround = true; this.player.hasAirDash = true; break;
                    }
                }
            }
        }

        // Queda no Abismo na Fase 1 - Reposiciona com segurança no Penhasco
        if(!this.player.onPlatform && this.player.y > 750 && this.boss.phase === 1) {
            this.player.hp -= 10; 
            this.cameras.main.shake(100, 0.005); 
            this.player.x = 200; this.player.y = 400; this.player.velocityY = 0;
        }

        if(Phaser.Input.Keyboard.JustDown(this.keys.up) && this.player.onGround){
            this.player.velocityY = this.player.jumpForce; this.player.onGround = false;
        }

        if(Phaser.Input.Keyboard.JustDown(this.keys.dash) && !this.player.dashCooldown){
            if(this.player.onGround || this.player.hasAirDash) {
                this.player.dashCooldown = true;
                if(!this.player.onGround) { this.player.hasAirDash = false; this.player.velocityY = 0; }
                if(this.keys.left.isDown) this.player.x -= 200; else if(this.keys.right.isDown) this.player.x += 200; else this.player.x += 200 * this.player.direction;
                this.cameras.main.shake(50, 0.003); this.time.delayedCall(600, ()=>{ this.player.dashCooldown = false; });
            }
        }

        if(this.player.x < 20) this.player.x = 20; if(this.player.x > 1260) this.player.x = 1260;
    }

    updatePhysics(){
        this.player.velocityY += this.player.gravity;
        this.player.y += this.player.velocityY;
    }

    handleCombat(){
        let pointer = this.input.activePointer;
        if(pointer.leftButtonDown() && !this.playerAttackCooldown){
            this.playerAttackCooldown = true; this.player.isAttacking = true; this.player.attackTime = 0;
            let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 20, pointer.x, pointer.y);
            this.slashes.push({ x: this.player.x, y: this.player.y - 20, vx: Math.cos(angle) * 24, vy: Math.sin(angle) * 24, angle: angle, life: 60 });
            if(!this.player.onGround) this.player.velocityY -= 1.5; 
            this.cameras.main.shake(30, 0.001); 
            this.time.delayedCall(250, ()=>{ this.player.isAttacking = false; this.playerAttackCooldown = false; });
        }
    }

    updateSlashes(){
        for(let i = this.slashes.length - 1; i >= 0; i--){
            let slash = this.slashes[i];
            slash.x += slash.vx; slash.y += slash.vy; slash.life--;

            // O peito da Harpia é enorme, hitbox generosa
            if(Math.abs(slash.x - this.boss.x) < 100 && Math.abs(slash.y - this.boss.y) < 120 && !this.boss.isDead){
                if(this.boss.vulnerable) {
                    this.boss.hp -= 35; this.cameras.main.shake(120,0.005);
                } else {
                    this.boss.hp -= 3; this.cameras.main.shake(10,0.001); 
                }
                this.slashes.splice(i,1); continue;
            }
            if(slash.life <= 0) this.slashes.splice(i,1);
        }
    }

    renderScene() {
        this.graphics.clear();

        if(this.boss.phase === 1) {
            this.graphics.fillStyle(0x0a1525); this.graphics.fillRect(0,0,1280,720);
            this.graphics.fillStyle(0xddffff, 0.05); this.graphics.fillCircle(640, 360, 300);
        } else {
            this.graphics.fillStyle(0x050a15); this.graphics.fillRect(0,0,1280,720);
            if(Math.random() < 0.1) { this.graphics.fillStyle(0xffffff, 0.1); this.graphics.fillRect(0,0,1280,720); } 
        }

        if(this.windActive || this.boss.phase === 2) {
            this.graphics.fillStyle(0xffffff, 0.2);
            for(let i=0; i<40; i++) this.graphics.fillRect(Math.random()*1280, Math.random()*720, Math.random()*100 + 50, 2);
            if(this.boss.phase === 2) {
                this.graphics.fillStyle(0xaaddff, 0.3);
                for(let i=0; i<60; i++) this.graphics.fillEllipse(Math.random()*1280, Math.random()*720, 2, 20);
            }
        }

        // PENHASCO SÓLIDO (Esquerda) - Match com a física
        if(this.boss.phase === 1) {
            this.graphics.fillStyle(0x1a2530);
            this.graphics.fillRect(this.cliff.x, this.cliff.y, this.cliff.width, this.cliff.height); 
            this.graphics.fillStyle(0xddffff);
            this.graphics.fillRect(this.cliff.x, this.cliff.y, this.cliff.width, 10); 
            
            // Textura visual
            this.graphics.fillTriangle(0, 500, 100, 450, 200, 500);
            this.graphics.fillTriangle(150, 500, 300, 420, 450, 500);
        }

        this.drawClouds();
        this.drawAttacks();

        // DESENHAR ÁGUIA-HARPIA COLOSSAL
        this.drawMountainKing();

        this.drawPlayer();
        this.drawSlashes();
        this.drawHealthBars();
    }

    drawClouds() {
        this.graphics.fillStyle(0xaaddff, 0.8);
        for(let c of this.clouds) {
            this.graphics.fillEllipse(c.x, c.y, c.width, c.height);
            this.graphics.fillStyle(0xffffff, 0.5); this.graphics.fillEllipse(c.x, c.y - 5, c.width * 0.8, c.height * 0.6);
            this.graphics.fillStyle(0xaaddff, 0.8);
        }
    }

    drawAttacks() {
        this.graphics.lineStyle(4, 0xffffff);
        for(let f of this.feathers) {
            this.graphics.beginPath(); this.graphics.moveTo(f.x, f.y); this.graphics.lineTo(f.x - Math.cos(f.angle)*30, f.y - Math.sin(f.angle)*30); this.graphics.strokePath();
        }

        for(let L of this.lightnings) {
            if(L.timer < L.strikeTime) {
                this.graphics.fillStyle(0x00ffff, 0.3); this.graphics.fillRect(L.x - 20, 0, 40, 720);
            } else {
                this.graphics.lineStyle(10, 0xffffff); this.graphics.beginPath(); this.graphics.moveTo(L.x, 0); this.graphics.lineTo(L.x + Phaser.Math.Between(-30,30), 200); this.graphics.lineTo(L.x + Phaser.Math.Between(-30,30), 400); this.graphics.lineTo(L.x, 720); this.graphics.strokePath();
                this.graphics.lineStyle(4, 0x00ffff); this.graphics.strokePath(); 
            }
        }

        // Tornados da Fase 2
        this.graphics.fillStyle(0xddffff, 0.5);
        let tTime = this.time.now * 0.01;
        for(let t of this.tornados) {
            for(let j=0; j<8; j++) {
                let w = 80 - (j*8);
                let wX = Math.sin(tTime + j) * 20;
                this.graphics.fillEllipse(t.x + wX, 600 - (j*80), w, 20);
            }
        }
    }

    // ASA CELESTIAL DE HARPIA PROCEDURAL (Com Penas)
    drawFeatheredWing(x, y, flip, flap) {
        let elbowX = x + 150 * flip;
        let elbowY = y - 80 + flap;
        let tipX = x + 300 * flip;
        let tipY = y + 20 + flap * 1.5;

        // Osso da Asa (Braço)
        this.graphics.lineStyle(12, 0xdddddd);
        this.graphics.beginPath();
        this.graphics.moveTo(x, y);
        this.graphics.lineTo(elbowX, elbowY);
        this.graphics.lineTo(tipX, tipY);
        this.graphics.strokePath();

        // Penas Primárias (Longas)
        this.graphics.fillStyle(0xeeeeff, 0.9);
        for(let i=0; i<=8; i++) {
            let px = elbowX + ((tipX - elbowX) * (i/8));
            let py = elbowY + ((tipY - elbowY) * (i/8));
            let fLength = 150 - (i*10); // Penas afinam para a ponta
            this.graphics.fillTriangle(px, py, px - 10*flip, py + fLength + flap*0.8, px + 20*flip, py);
        }

        // Penas Secundárias (Base)
        this.graphics.fillStyle(0xccddff, 0.9);
        for(let i=0; i<=8; i++) {
            let px = x + ((elbowX - x) * (i/8));
            let py = y + ((elbowY - y) * (i/8));
            let fLength = 100;
            this.graphics.fillTriangle(px, py, px - 15*flip, py + fLength + flap*0.5, px + 15*flip, py);
        }
    }

    drawMountainKing() {
        let x = this.boss.x;
        let y = this.boss.y;
        let t = this.boss.animationTime;

        let flap = this.boss.vulnerable || this.boss.isDead ? 80 : Math.sin(t * 3) * 50; 
        if(this.boss.state === "DIVE" || this.boss.state === "SWOOP" || this.boss.state === "TALON_STRIKE") flap = -50; 

        // 1. CAUDA DE PREDADOR
        let tailSwing = Math.sin(t * 2) * 40;
        this.graphics.fillStyle(0xbbccdd);
        this.graphics.fillTriangle(x, y + 80, x - 60 + tailSwing, y + 200, x + 60 + tailSwing, y + 200);

        // 2. PERNAS E GARRAS
        let legFlex = this.boss.state === "TALON_STRIKE" ? 60 : 0; // Estica as garras ao atacar
        this.graphics.lineStyle(16, 0x8899aa);
        // Perna Esq
        this.graphics.beginPath(); this.graphics.moveTo(x - 40, y + 50); this.graphics.lineTo(x - 60, y + 120 + legFlex); this.graphics.strokePath();
        this.graphics.fillStyle(0x444444); this.graphics.fillTriangle(x - 60, y + 120 + legFlex, x - 80, y + 150 + legFlex, x - 40, y + 150 + legFlex);
        // Perna Dir
        this.graphics.beginPath(); this.graphics.moveTo(x + 40, y + 50); this.graphics.lineTo(x + 60, y + 120 + legFlex); this.graphics.strokePath();
        this.graphics.fillTriangle(x + 60, y + 120 + legFlex, x + 40, y + 150 + legFlex, x + 80, y + 150 + legFlex);

        // 3. AS CELESTIAIS ASAS
        this.drawFeatheredWing(x - 30, y - 40, -1, flap);
        this.drawFeatheredWing(x + 30, y - 40, 1, flap);

        // 4. CORPO (TORSO DA ÁGUIA)
        this.graphics.fillStyle(0xffffff);
        this.graphics.fillEllipse(x, y, 140, 180); // Peito de pombo massivo

        // Penas no Peito
        this.graphics.fillStyle(0xddffff);
        for(let i=0; i<5; i++) {
            this.graphics.fillTriangle(x - 40 + i*20, y + 40, x - 50 + i*25, y + 90, x - 20 + i*20, y + 40);
        }

        // 5. CABEÇA E COROA CELESTIAL
        let headY = y - 100;
        this.graphics.fillStyle(0xeeeeee);
        this.graphics.fillEllipse(x, headY, 80, 80); // Crânio

        // Bico de Águia
        this.graphics.fillStyle(0xffaa00);
        let beakDir = (this.player.x > x) ? 1 : -1;
        this.graphics.fillTriangle(x + 20*beakDir, headY - 10, x + 80*beakDir, headY + 30, x, headY + 20);

        // Coroa de Penas Ancestrais
        this.graphics.fillStyle(0x88ccff);
        this.graphics.fillTriangle(x, headY - 20, x - 40, headY - 80, x - 20, headY - 10);
        this.graphics.fillTriangle(x, headY - 20, x, headY - 90, x + 10, headY - 10);
        this.graphics.fillTriangle(x, headY - 20, x + 40, headY - 80, x + 20, headY - 10);

        // Olhos Brilhantes Predatórios
        let eyeColor = this.boss.isDead ? 0x000000 : 0x00ffff;
        this.graphics.fillStyle(eyeColor, 1);
        this.graphics.fillCircle(x + 15*beakDir, headY - 15, 8);

        // Aura de Vulnerabilidade e Raios
        if(this.boss.vulnerable) {
            this.graphics.lineStyle(6, 0xff0000, Math.sin(this.boss.animationTime*10)*0.5+0.5);
            this.graphics.strokeCircle(x, y, 140);
        } else if(!this.boss.isDead) {
            this.graphics.lineStyle(2, 0x00ffff, 0.7);
            for(let i=0; i<3; i++) {
                let ang = Math.random() * Math.PI * 2;
                this.graphics.beginPath(); this.graphics.moveTo(x, headY); this.graphics.lineTo(x + Math.cos(ang)*120, headY + Math.sin(ang)*120); this.graphics.strokePath();
            }
        }
    }

    drawPlayer(){
        let x = this.player.x; let y = this.player.y; let flip = this.player.direction; 
        let pointer = this.input.activePointer; let aimAngle = Phaser.Math.Angle.Between(x, y - 20, pointer.x, pointer.y);

        this.graphics.fillStyle(0x000000,0.35); this.graphics.fillEllipse(x, 610, 36, 8);

        let legSwing = Math.sin(this.player.animationTime) * 12; let legSwingOff = Math.sin(this.player.animationTime + Math.PI) * 12; let bodyTilt = Math.sin(this.player.animationTime * 0.5) * 4; 
        if(!this.player.onGround) { legSwing = -10; legSwingOff = 10; bodyTilt = 10; }

        this.graphics.lineStyle(9, 0x2d2d2d); this.graphics.beginPath(); this.graphics.moveTo(x - 6 * flip, y); this.graphics.lineTo(x - 6 * flip + legSwing * flip, y + 30); this.graphics.strokePath(); this.graphics.beginPath(); this.graphics.moveTo(x + 6 * flip, y); this.graphics.lineTo(x + 6 * flip + legSwingOff * flip, y + 30); this.graphics.strokePath();

        let capeWave = Math.sin(this.player.animationTime * 0.8) * 4; this.graphics.fillStyle(0x111111); this.graphics.fillTriangle(x - 24 * flip, y + 20 + capeWave, x + 24 * flip, y + 20 + capeWave * 0.5, x + capeWave * flip, y - 8); this.graphics.fillStyle(0x1f1f1f); this.graphics.fillTriangle(x - 16 * flip, y + 25, x + 16 * flip, y + 25, x, y - 2);

        this.graphics.fillStyle(0x2d2d2d); this.graphics.save(); this.graphics.translateCanvas(x, y - 10); this.graphics.rotateCanvas((bodyTilt * flip) * Math.PI / 180); this.graphics.fillRect(-10 * flip, -18, 20 * flip, 30); this.graphics.restore();

        let shoulderX = x; let shoulderY = y - 18; let armLength = 25; let elbowX = shoulderX + Math.cos(aimAngle) * armLength; let elbowY = shoulderY + Math.sin(aimAngle) * armLength;

        this.graphics.lineStyle(8, 0x2d2d2d); this.graphics.beginPath(); this.graphics.moveTo(shoulderX, shoulderY); this.graphics.lineTo(elbowX, elbowY); this.graphics.strokePath(); this.graphics.fillStyle(0x3a3a3a); this.graphics.fillCircle(elbowX, elbowY, 4); 

        let swordLength = 40; let kickback = 0; if(this.player.isAttacking) { let atkP = Math.min(this.player.attackTime / 8, 1); kickback = Math.sin(atkP * Math.PI) * -8; this.player.attackTime++; }

        let swordTipX = elbowX + Math.cos(aimAngle) * (swordLength + kickback); let swordTipY = elbowY + Math.sin(aimAngle) * (swordLength + kickback); let handleX = elbowX + Math.cos(aimAngle) * kickback; let handleY = elbowY + Math.sin(aimAngle) * kickback;

        this.graphics.lineStyle(5, 0xbdbdbd); this.graphics.beginPath(); this.graphics.moveTo(handleX, handleY); this.graphics.lineTo(swordTipX, swordTipY); this.graphics.strokePath();

        let bladeGlow = this.player.isAttacking ? 0.8 : Math.sin(this.player.animationTime * 2) * 0.2 + 0.3; this.graphics.lineStyle(2, 0xaaddff, bladeGlow); this.graphics.beginPath(); this.graphics.moveTo(handleX, handleY); this.graphics.lineTo(swordTipX, swordTipY); this.graphics.strokePath();

        this.graphics.fillStyle(0xf5f5f5); this.graphics.fillEllipse(x, y - 45, 30, 28); this.graphics.fillTriangle(x - 12 * flip,y - 52, x - 15 * flip,y - 72, x - 2 * flip,y - 50); this.graphics.fillTriangle(x + 12 * flip,y - 52, x + 15 * flip,y - 72, x + 2 * flip,y - 50);
        this.graphics.fillStyle(0x111111); this.graphics.fillTriangle(x - 10 * flip,y - 45, x - 3 * flip,y - 42, x - 10 * flip,y - 39); this.graphics.fillTriangle(x + 10 * flip,y - 45, x + 3 * flip,y - 42, x + 10 * flip,y - 39);
        this.graphics.fillStyle(0xaa0000); this.graphics.fillTriangle(x - 13 * flip,y - 36, x - 7 * flip,y - 40, x - 9 * flip,y - 32); this.graphics.fillTriangle(x + 13 * flip,y - 36, x + 7 * flip,y - 40, x + 9 * flip,y - 32);
    }

    drawSlashes(){
        for(let slash of this.slashes){
            this.graphics.save(); this.graphics.translateCanvas(slash.x, slash.y); this.graphics.rotateCanvas(slash.angle);
            this.graphics.fillStyle(0xaaddff, 0.9); this.graphics.beginPath(); this.graphics.arc(0, 0, 25, -Math.PI/2, Math.PI/2, false); this.graphics.arc(-12, 0, 20, Math.PI/2, -Math.PI/2, true); this.graphics.fill();
            this.graphics.fillStyle(0x66ccff, 0.3); this.graphics.fillEllipse(0, 0, 45, 20);
            this.graphics.lineStyle(4, 0xffffff, slash.life / 60); this.graphics.beginPath(); this.graphics.moveTo(-25, 0); this.graphics.lineTo(-45, 0); this.graphics.strokePath();
            this.graphics.restore();
        }
    }

    drawHealthBars(){
        this.graphics.fillStyle(0x222222); this.graphics.fillRect(20, 20, 220, 24); this.graphics.fillStyle(0xff4444); this.graphics.fillRect(20, 20, 220 * Math.max(0, this.player.hp / this.player.maxHp), 24); this.graphics.lineStyle(2, 0xffffff); this.graphics.strokeRect(20, 20, 220, 24);
        this.graphics.fillStyle(0x222222); this.graphics.fillRect(1040, 20, 240, 24); this.graphics.fillStyle(0x00ffff); this.graphics.fillRect(1040, 20, 240 * Math.max(0, this.boss.hp / this.boss.maxHp), 24); this.graphics.lineStyle(2, 0x00ffff); this.graphics.strokeRect(1040, 20, 240, 24);
        if(this.boss.phase === 2) { this.graphics.lineStyle(3, 0xffffffff); this.graphics.strokeRect(1035, 15, 250, 34); }
    }
}

// ==================================================
// INICIALIZAÇÃO DO PHASER
// ==================================================
const config = {
    type: Phaser.AUTO,
    width:1280, height:720,
    backgroundColor:"#000000",
    pixelArt:false,
    render: { antialias: true, antialiasGL: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene:[MapScene, ForestBossScene, MountainBossScene]
};

new Phaser.Game(config);