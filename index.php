<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>JoJo Dungeon: Répteis Assustadores</title>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
    <style>
        body { background: #000; margin: 0; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: 'Courier New', monospace; }
        canvas { box-shadow: 0 0 20px rgba(0, 255, 100, 0.4); border: 1px solid #333; cursor: crosshair; }
    </style>
</head>
<body>
    <div id="game"></div>
    <script>
        class PreloadScene extends Phaser.Scene {
            constructor() { super('PreloadScene'); }
            preload() {}
            
            create() {
                let g = this.make.graphics({x:0, y:0, add:false});

                // ===== DIOGO BRANDO - APARÊNCIA MELHORADA =====
                // Cabeça com chapéu
                g.fillStyle(0x8B4513).fillCircle(20, 18, 8); // Cabeça
                g.fillStyle(0x654321).fillRect(10, 8, 20, 4); // Chapéu (rim)
                g.fillStyle(0x4A2511).fillRect(12, 6, 16, 4); // Chapéu (topo)
                // Rosto
                g.fillStyle(0xf1c27d).fillCircle(16, 18, 6);
                g.fillStyle(0xffd700).fillCircle(14, 17, 1); // Olho esquerdo
                g.fillStyle(0xffd700).fillCircle(18, 17, 1); // Olho direito
                // Corpo
                g.fillStyle(0x1a1a2e).fillRect(12, 24, 16, 12); // Casaco
                g.fillStyle(0xffd700).fillRect(11, 24, 2, 8); // Detalhes dourados
                g.fillStyle(0xffd700).fillRect(27, 24, 2, 8);
                // Calças
                g.fillStyle(0x2d2d44).fillRect(13, 36, 14, 10);
                // Pés
                g.fillStyle(0x654321).fillRect(14, 46, 4, 4);
                g.fillStyle(0x654321).fillRect(22, 46, 4, 4);
                
                g.generateTexture('player', 40, 50); 
                g.clear();

                // ===== STAND - APARÊNCIA MELHORADA =====
                // Cabeça humanóide
                g.fillStyle(0x0277bd).fillCircle(30, 15, 8);
                // Olhos brilhantes
                g.fillStyle(0xffff00).fillCircle(27, 14, 2);
                g.fillStyle(0xffff00).fillCircle(33, 14, 2);
                g.fillStyle(0x000000).fillCircle(27, 14, 1);
                g.fillStyle(0x000000).fillCircle(33, 14, 1);
                // Auréola/energia ao redor
                g.lineStyle(2, 0xffd700, 0.8).beginPath().arc(30, 15, 12, 0, Math.PI * 2).strokePath();
                // Corpo musculoso
                g.fillStyle(0x0277bd).fillRect(24, 24, 12, 18);
                // Detalhes brilhantes
                g.fillStyle(0xffeb3b).fillRect(26, 26, 2, 4);
                g.fillStyle(0xffeb3b).fillRect(34, 26, 2, 4);
                g.fillStyle(0xffeb3b).fillRect(26, 34, 2, 4);
                g.fillStyle(0xffeb3b).fillRect(34, 34, 2, 4);
                // Aura/energia
                g.lineStyle(1, 0xffff00, 0.5).strokeRect(22, 22, 16, 22);
                
                g.generateTexture('stand', 60, 60); 
                g.clear();

                // DINO ALIADO - Melhorado
                g.fillStyle(0x00a86b).beginPath().moveTo(5,8).lineTo(20,5).lineTo(22,10).lineTo(15,12).closePath().fill(); // Cabeça
                g.fillStyle(0x008c45).fillRect(8, 10, 14, 6); // Corpo
                g.fillStyle(0xffd700).fillCircle(10, 9, 1.5); // Olho
                g.fillStyle(0x00ff00).fillCircle(12, 16, 1); // Ponta brilhante
                
                g.generateTexture('dino_ally', 25, 20); 
                g.clear();

                // ORC - Melhorado com mais detalhes
                g.fillStyle(0x1a4d1a).fillCircle(20, 12, 7); // Cabeça
                g.fillStyle(0xff0000).fillRect(17, 11, 6, 2); // Olhos vermelhos
                g.fillStyle(0x1a1a1a).fillRect(18, 11, 1.5, 2);
                g.fillStyle(0x1a1a1a).fillRect(21.5, 11, 1.5, 2);
                g.fillStyle(0x558b2f).fillRect(10, 20, 20, 12); // Corpo armado
                g.fillStyle(0x3e2723).fillRect(10, 25, 20, 7); // Armadura
                g.fillStyle(0xff6600).fillRect(15, 28, 10, 3); // Arma
                
                g.generateTexture('orc', 40, 45); 
                g.clear();

                // LOBO - Melhorado
                g.fillStyle(0x2a2a2a).beginPath().moveTo(10,15).lineTo(30,10).lineTo(40,18).lineTo(35,30).lineTo(15,32).closePath().fill(); // Corpo
                g.fillStyle(0x4a4a4a).fillCircle(8, 12, 5); // Cabeça
                g.fillStyle(0xff0000).fillCircle(6, 11, 2); // Olhos vermelhos brilhantes
                g.fillStyle(0xff0000).fillCircle(10, 11, 2);
                g.fillStyle(0xffaa00).fillCircle(6, 11, 0.8); // Brilho
                g.fillStyle(0xffaa00).fillCircle(10, 11, 0.8);
                g.fillStyle(0x1a1a1a).fillRect(7, 14, 6, 3); // Focinho
                // Cauda (usando triângulo ao invés de curve)
                g.fillStyle(0x2a2a2a).beginPath().moveTo(35, 25).lineTo(42, 20).lineTo(45, 15).lineTo(43, 22).closePath().fill();
                
                g.generateTexture('wolf', 50, 40); 
                g.clear();

                // CICLOPE - Melhorado (BOSS)
                // Sombra
                g.fillStyle(0x000, 0.3).fillEllipse(40, 95, 60, 12);
                // Perna esquerda
                g.fillStyle(0x6b4423).fillRect(20, 60, 12, 35);
                // Perna direita
                g.fillStyle(0x6b4423).fillRect(48, 60, 12, 35);
                // Corpo
                g.fillStyle(0x8d6e63).fillRoundedRect(15, 35, 50, 35, 8);
                // Armadura no peito
                g.fillStyle(0x333333).fillRect(18, 40, 44, 12);
                g.fillStyle(0xffaa00).lineStyle(2, 0xffaa00, 1).strokeRect(20, 42, 40, 8);
                // Braço esquerdo (levantado)
                g.fillStyle(0x6b4423).beginPath().moveTo(15, 45).lineTo(5, 20).lineTo(12, 25).lineTo(20, 50).closePath().fill();
                // Braço direito
                g.fillStyle(0x6b4423).beginPath().moveTo(65, 45).lineTo(75, 30).lineTo(68, 28).lineTo(60, 50).closePath().fill();
                // Cabeça
                g.fillStyle(0x8d6e63).fillCircle(40, 20, 18);
                // Olho único GIGANTE
                g.fillStyle(0xffffff).fillCircle(40, 20, 12);
                g.fillStyle(0xff0000).fillCircle(40, 20, 8);
                g.fillStyle(0x000000).fillCircle(40, 20, 4);
                g.fillStyle(0xffff00).fillCircle(42, 18, 1.5); // Brilho do olho
                // Chifres
                g.lineStyle(3, 0x333333).beginPath().moveTo(25, 5).lineTo(18, -5).stroke();
                g.lineStyle(3, 0x333333).beginPath().moveTo(55, 5).lineTo(62, -5).stroke();
                
                g.generateTexture('cyclops', 80, 100); 
                g.clear();

                // PROJÉTEIS - Melhorados
                // Faca brilhante
                g.fillStyle(0xcccccc).beginPath().moveTo(0, 5).lineTo(15, 2).lineTo(18, 8).lineTo(5, 10).closePath().fill();
                g.fillStyle(0xffff00).fillRect(7, 3, 8, 4); // Brilho
                g.generateTexture('knife', 20, 10); 
                g.clear();
                
                // Laser/Magia
                g.fillStyle(0xff0000).fillCircle(10, 10, 8);
                g.fillStyle(0xff6600).fillCircle(10, 10, 5);
                g.fillStyle(0xffff00).fillCircle(10, 10, 2);
                g.lineStyle(2, 0xffff00, 0.6).strokeCircle(10, 10, 10);
                g.generateTexture('laser', 20, 20); 
                g.clear();
                
                // Porta - Portal
                g.fillStyle(0x6a0dad).fillRect(0, 0, 40, 60);
                g.fillStyle(0x9d00ff).fillCircle(20, 30, 18); // Usando fillCircle ao invés de ellipse
                g.lineStyle(2, 0xff00ff, 0.8).strokeCircle(20, 30, 20);
                g.fillStyle(0xff00ff, 0.3).fillCircle(20, 30, 12);
                
                g.generateTexture('door', 40, 60); 
                g.clear();

                if (g) g.destroy();
                this.scene.start('MainScene', { stage: 1, hp: 15 });
            }
        }

        class MainScene extends Phaser.Scene {
            constructor() { super('MainScene'); }

            init(data) {
                this.stage = data.stage || 1;
                this.playerHP = data.hp || 15;
                this.isTimeStopped = false;
                this.isTransitioning = false;
                this.isMeleeActive = false; // Flag segura para o soco
                
                this.themeIndex = Math.floor((this.stage - 1) / 5);
                this.themes = [
                    { name: "Caverna do Desespero", floor: 0x3e2723, wall: 0x2a1a18, out: 0x000000 },
                    { name: "Floresta Petrificada", floor: 0x2e3b32, wall: 0x1b5e20, out: 0x0f1c0f }
                ];
                this.currentTheme = this.themes[this.themeIndex] || this.themes[1];
            }

            create() {
                this.cameras.main.fadeIn(300, 0, 0, 0);

                this.tileSize = 64;
                this.isBossStage = (this.stage % 5 === 0);
                this.mapSize = this.isBossStage ? 20 : 30; 
                this.physics.world.setBounds(0, 0, this.mapSize * this.tileSize, this.mapSize * this.tileSize);

                // NÃO criar grupo de paredes - apenas imagens visuais
                this.enemies = this.physics.add.group();
                this.allies = this.physics.add.group();
                this.projectiles = this.physics.add.group();
                this.enemyProjectiles = this.physics.add.group();

                this.cameras.main.setBackgroundColor(this.currentTheme.out);
                this.createOutsideDecorations();

                let spawnPoint = this.generateMap();

                this.player = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, 'player');
                this.player.setCollideWorldBounds(true).setBodySize(20, 20).setOffset(10, 25);
                this.player.speed = 280;

                this.stand = this.add.sprite(this.player.x, this.player.y, 'stand').setAlpha(0.85);
                this.stand.state = 'follow';

                // Hitbox do stand agora fica escondida longe em vez de desligar a física
                this.standHitbox = this.physics.add.sprite(-1000, -1000, 'player');
                this.standHitbox.setVisible(false).setActive(false);
                if (this.standHitbox && this.standHitbox.body) this.standHitbox.body.setCircle(40);

                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,ONE,TWO,THREE');

                this.ui = this.add.container(20, 20).setScrollFactor(0).setDepth(9999);
                this.ui.add(this.add.text(0, 0, this.isBossStage ? "BOSS: CICLOPE" : `Fase ${this.stage} - ${this.currentTheme.name}`, { fontSize: '22px', fill: '#fff' }));
                this.txtHP = this.add.text(0, 25, "HP: " + this.playerHP, { fontSize: '20px', fill: '#f00' });
                this.txtPower = this.add.text(0, 50, "[1]Muda [2]Faca [3]Dinos [Espaço]Tempo", { fontSize: '16px', fill: '#0ff' });
                this.ui.add([this.txtHP, this.txtPower]);

                this.cooldowns = { punch: 0, knife: 0, dinos: 0, time: 0 };
                this.input.on('pointerdown', () => this.isAttacking = true);
                this.input.on('pointerup', () => this.isAttacking = false);

                // SEM OVERLAPS - tudo feito manualmente no update()

                if (this.isBossStage) {
                    this.boss = this.enemies.create(this.mapSize/2 * this.tileSize, 200, 'cyclops');
                    if (this.boss) {
                        this.boss.hp = 100 + (this.stage * 10);
                        this.boss.setCollideWorldBounds(true).setImmovable(true);
                        this.time.addEvent({ delay: 2000, callback: this.bossAttackPattern, callbackScope: this, loop: true });
                    }
                }
            }

            update(time) {
                if (this.isTransitioning || !this.player || !this.player.active) return;

                let vx = (this.keys.D.isDown - this.keys.A.isDown);
                let vy = (this.keys.S.isDown - this.keys.W.isDown);
                let vec = new Phaser.Math.Vector2(vx, vy).normalize();
                this.player.setVelocity(vec.x * this.player.speed, vec.y * this.player.speed);

                let pX = this.input.activePointer.worldX;
                let pY = this.input.activePointer.worldY;
                let isFlipped = pX < this.player.x;
                this.player.flipX = isFlipped;

                if (this.stand && this.stand.active && this.stand.state === 'follow') {
                    this.stand.flipX = isFlipped;
                    this.stand.x += ((this.player.x + (isFlipped ? 25 : -25)) - this.stand.x) * 0.3;
                    this.stand.y += ((this.player.y - 15 + Math.sin(time/150)*5) - this.stand.y) * 0.3;
                }

                if (this.isAttacking || this.keys.ONE.isDown) this.attackMudaMuda(pX, pY, time);
                if (this.keys.TWO.isDown) this.attackKnives(pX, pY, time);
                if (this.keys.THREE.isDown) this.summonDinos(time);
                if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.stopTime(time);

                // Aliados indo para inimigos
                if (this.allies && this.allies.getChildren) {
                    this.allies.getChildren().forEach(ally => {
                        if(!ally || !ally.active) return;
                        let target = this.physics.closest(ally, this.enemies.getChildren().filter(e => e && e.active));
                        if (target && target.body) this.physics.moveToObject(ally, target, 200);
                    });
                }

                // Inimigos indo para player ou parados se time stopped
                if (!this.isTimeStopped) {
                    if (this.enemies && this.enemies.getChildren) {
                        this.enemies.getChildren().forEach(e => {
                            if (e && e.active && e !== this.boss && e.body) this.physics.moveToObject(e, this.player, e.texture && e.texture.key==='wolf'?150:90);
                        });
                    }
                } else {
                    if (this.enemies && this.enemies.getChildren) {
                        this.enemies.getChildren().forEach(e => { if (e && e.active && e.body) e.body.stop(); });
                    }
                    if (this.enemyProjectiles && this.enemyProjectiles.getChildren) {
                        this.enemyProjectiles.getChildren().forEach(p => { if (p && p.active && p.body) p.body.stop(); });
                    }
                }

                // Destruir projéteis que saíram do mapa
                if (this.projectiles && this.projectiles.getChildren) {
                    this.projectiles.getChildren().forEach(p => {
                        if (p && p.active && (p.x < 0 || p.x > this.cameras.main.worldView.right || p.y < 0 || p.y > this.cameras.main.worldView.bottom)) {
                            p.destroy();
                        }
                    });
                }
                if (this.enemyProjectiles && this.enemyProjectiles.getChildren) {
                    this.enemyProjectiles.getChildren().forEach(p => {
                        if (p && p.active && (p.x < 0 || p.x > this.cameras.main.worldView.right || p.y < 0 || p.y > this.cameras.main.worldView.bottom)) {
                            p.destroy();
                        }
                    });
                }

                // Detectar melee attack manualmente
                if (this.isMeleeActive && this.standHitbox && this.enemies && this.enemies.getChildren) {
                    this.enemies.getChildren().forEach(e => {
                        if (e && e.active) {
                            let dist = Phaser.Math.Distance.Between(this.standHitbox.x, this.standHitbox.y, e.x, e.y);
                            if (dist < 60) {
                                this.applyDamage(e, 2);
                            }
                        }
                    });
                }

                // Detectar colisão player com inimigos
                if (this.enemies && this.enemies.getChildren) {
                    this.enemies.getChildren().forEach(e => {
                        if (e && e.active) {
                            let dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
                            if (dist < 40) {
                                this.takeDamage(this.player, e);
                            }
                        }
                    });
                }

                // Detectar colisão player com laser inimigo
                if (this.enemyProjectiles && this.enemyProjectiles.getChildren) {
                    this.enemyProjectiles.getChildren().forEach(p => {
                        if (p && p.active) {
                            let dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
                            if (dist < 40) {
                                this.takeDamage(this.player, p);
                            }
                        }
                    });
                }

                // Detectar colisão facas com inimigos
                if (this.projectiles && this.projectiles.getChildren && this.enemies && this.enemies.getChildren) {
                    this.projectiles.getChildren().forEach(projectile => {
                        if (projectile && projectile.active) {
                            this.enemies.getChildren().forEach(e => {
                                if (e && e.active) {
                                    let dist = Phaser.Math.Distance.Between(projectile.x, projectile.y, e.x, e.y);
                                    if (dist < 30) {
                                        this.hitEnemyRanged(projectile, e);
                                    }
                                }
                            });
                        }
                    });
                }

                // Detectar dinos comendo inimigos
                if (this.allies && this.allies.getChildren && this.enemies && this.enemies.getChildren) {
                    this.allies.getChildren().forEach(ally => {
                        if (ally && ally.active) {
                            this.enemies.getChildren().forEach(e => {
                                if (e && e.active) {
                                    let dist = Phaser.Math.Distance.Between(ally.x, ally.y, e.x, e.y);
                                    if (dist < 40) {
                                        this.allyBiteEnemy(ally, e);
                                    }
                                }
                            });
                        }
                    });
                }

                // Detectar colisão com porta
                if (this.doorX && this.doorY && !this.isTransitioning) {
                    let distDoor = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorX, this.doorY);
                    if (distDoor < 50) {
                        this.isTransitioning = true;
                        this.physics.pause();
                        this.cameras.main.fadeOut(300, 0, 0, 0);
                        this.time.delayedCall(300, () => {
                            this.scene.restart({stage: this.stage + 1, hp: this.playerHP});
                        });
                    }
                }

                // Profundidade correta
                let personagens = [this.player, ...(this.enemies && this.enemies.getChildren ? this.enemies.getChildren() : []), ...(this.allies && this.allies.getChildren ? this.allies.getChildren() : [])];
                personagens.forEach(char => {
                    if (char && char.active && char.body) {
                        char.setDepth(char.y + (char.height / 2));
                    }
                });
                
                if (this.stand && this.stand.active && this.player) {
                    this.stand.setDepth(this.player.depth - 1);
                }
            }

            createDoor(x, y) {
                // Porta como imagem visual + sprite simples para detecção
                let doorImage = this.add.image(x, y, 'door').setDepth(1);
                this.doorX = x;
                this.doorY = y;
            }

            // ==========================================
            // ATAQUES
            // ==========================================
            attackMudaMuda(tX, tY, time) {
                if (time < this.cooldowns.punch || this.isTransitioning || !this.stand) return;
                this.cooldowns.punch = time + 150;
                
                this.stand.state = 'attack';
                let ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, tX, tY);
                let dX = this.player.x + Math.cos(ang) * 60 + Phaser.Math.Between(-15, 15);
                let dY = this.player.y + Math.sin(ang) * 60 + Phaser.Math.Between(-15, 15);

                this.tweens.add({ targets: this.stand, x: dX, y: dY, duration: 50, yoyo: true, onComplete: ()=> { if(this.stand) this.stand.state='follow' } });
                
                // Ativa a hitbox para detectar inimigos
                if (this.standHitbox && this.standHitbox.body) {
                    this.standHitbox.setPosition(dX, dY);
                    this.standHitbox.setActive(true);
                    this.isMeleeActive = true;
                    this.time.delayedCall(50, () => { 
                        this.isMeleeActive = false;
                        if(this.standHitbox) {
                            this.standHitbox.setActive(false);
                            this.standHitbox.setPosition(-1000, -1000);
                        }
                    });
                }

                let fx = this.add.circle(dX, dY, 15, 0xffd700, 0.6).setDepth(9999);
                this.tweens.add({ targets: fx, scale: 2, alpha: 0, duration: 100, onComplete: ()=> { if(fx) fx.destroy(); } });
            }

            attackKnives(tX, tY, time) {
                if (time < this.cooldowns.knife || this.isTransitioning || !this.stand) return;
                this.cooldowns.knife = time + 400;

                let ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, tX, tY);
                let knife = this.projectiles.create(this.stand.x, this.stand.y, 'knife');
                if (knife && knife.body) {
                    knife.rotation = ang;
                    knife.body.setVelocity(Math.cos(ang) * 700, Math.sin(ang) * 700);
                }
            }

            summonDinos(time) {
                if (time < this.cooldowns.dinos || this.isTransitioning || !this.allies) return;
                this.cooldowns.dinos = time + 10000;
                
                for(let i=0; i<3; i++) {
                    let dino = this.allies.create(this.player.x + Phaser.Math.Between(-30,30), this.player.y, 'dino_ally');
                    if (dino) {
                        dino.setBounce(1).setCollideWorldBounds(true);
                        this.time.delayedCall(8000, () => {
                            if (dino && dino.active) dino.destroy();
                        });
                    }
                }
            }

            stopTime(time) {
                if (time < this.cooldowns.time || this.isTransitioning) return;
                this.cooldowns.time = time + 20000;

                this.isTimeStopped = true;
                this.cameras.main.postFX.addGrayscale(1);
                
                let txt = this.add.text(this.player.x, this.player.y - 50, "ZA WARUDO!", { fontSize: '30px', fill: '#ff0', fontStyle: 'bold' }).setOrigin(0.5).setDepth(9999);
                this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2000, onComplete: ()=> { if(txt) txt.destroy(); } });

                this.time.delayedCall(4000, () => {
                    if(this.cameras && this.cameras.main) {
                        this.isTimeStopped = false;
                        this.cameras.main.postFX.clear();
                    }
                });
            }

            bossAttackPattern() {
                if (this.isTransitioning || !this.boss || !this.boss.active || this.isTimeStopped || !this.player) return;
                
                let dist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
                
                if (dist < 150) {
                    if (this.cameras && this.cameras.main) this.cameras.main.shake(300, 0.02);
                    let shockwave = this.add.circle(this.boss.x, this.boss.y, 20, 0x8d6e63, 0.5);
                    this.tweens.add({ targets: shockwave, scale: 8, alpha: 0, duration: 500, onComplete: ()=> { if(shockwave) shockwave.destroy(); } });
                    if (dist < 100 && this.player && !this.player.isInvulnerable) this.takeDamage(this.player, this.boss);
                } else {
                    let ang = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
                    let laser = this.enemyProjectiles.create(this.boss.x, this.boss.y-10, 'laser');
                    if (laser && laser.body) {
                        laser.body.setVelocity(Math.cos(ang) * 400, Math.sin(ang) * 400);
                    }
                }
            }

            // ==========================================
            // LÓGICA DE DANO BLINDADA
            // ==========================================
            hitEnemyRanged(projectile, enemy) { 
                if (!projectile || !projectile.active || !enemy || !enemy.active) return;
                projectile.destroy();
                this.applyDamage(enemy, 3); 
            }
            
            allyBiteEnemy(ally, enemy) { 
                if (!ally.active || !enemy.active) return;
                if(!ally.lastBite || this.time.now > ally.lastBite) {
                    this.applyDamage(enemy, 1);
                    ally.lastBite = this.time.now + 500;
                }
            }

            applyDamage(enemy, dmg) {
                if (!enemy || !enemy.active || enemy.isInvulnerable || this.isTransitioning) return;
                
                enemy.hp = (enemy.hp || 5) - dmg;
                if (enemy.setTint) enemy.setTint(0xffffff);
                this.time.delayedCall(100, () => { if(enemy && enemy.active && enemy.clearTint) enemy.clearTint(); });

                enemy.isInvulnerable = true;
                this.time.delayedCall(150, () => { if (enemy && enemy.active) enemy.isInvulnerable = false; });

                if (enemy.hp <= 0) {
                    enemy.active = false; // Trava imediata contra hits duplos
                    if (enemy === this.boss && this.createDoor) {
                        this.createDoor(enemy.x, enemy.y);
                    }
                    if (enemy && enemy.destroy) enemy.destroy(); // Destroy é 100x mais seguro que disableBody aqui
                }
            }

            takeDamage(player, source) {
                if (!player || !player.active || player.isInvulnerable || this.isTransitioning) return;
                
                if (source && source.active && source.texture && source.texture.key === 'laser') {
                    source.destroy(); // Destruição segura
                }

                this.playerHP -= 1;
                this.txtHP.setText("HP: " + this.playerHP);
                this.cameras.main.shake(200, 0.03);
                this.cameras.main.flash(200, 255, 0, 0);

                if (this.playerHP <= 0) {
                    this.isTransitioning = true;
                    this.physics.pause();
                    this.player.setTint(0xff0000);
                    this.cameras.main.fadeOut(2000, 255, 0, 0);
                    this.time.delayedCall(2000, () => location.reload());
                } else {
                    player.isInvulnerable = true;
                    player.setAlpha(0.5);
                    this.time.delayedCall(1000, () => { 
                        if (player && player.active) {
                            player.isInvulnerable = false; 
                            player.setAlpha(1); 
                        }
                    });
                }
            }

            // ==========================================
            // GERADORES
            // ==========================================
            createOutsideDecorations() {
                // Criar a área escura FORA do mapa - zona de perigo com efeito
                let darkness = this.add.graphics();
                darkness.fillStyle(0x000000, 1);
                
                let mapWidth = this.mapSize * this.tileSize;
                let mapHeight = this.mapSize * this.tileSize;
                
                // Bordas pretas com gradiente visual (feito com múltiplas camadas)
                darkness.fillRect(-500, -500, mapWidth + 1000, 500);
                darkness.fillRect(-500, mapHeight, mapWidth + 1000, 500);
                darkness.fillRect(-500, 0, 500, mapHeight);
                darkness.fillRect(mapWidth, 0, 500, mapHeight);
                
                // Adicionar efeito de névoa/sombra nas bordas
                let fog = this.add.graphics();
                fog.fillStyle(0x1a1a2e, 0.3);
                fog.fillRect(-200, -200, mapWidth + 400, 200);
                fog.fillRect(-200, mapHeight, mapWidth + 400, 200);
                fog.fillRect(-200, 0, 200, mapHeight);
                fog.fillRect(mapWidth, 0, 200, mapHeight);
                fog.setDepth(-15);
                
                darkness.setDepth(-20);
                
                // Detalhes atmosféricos (partículas/pontos luminosos nas trevas)
                let atmosphere = this.add.graphics();
                atmosphere.fillStyle(0xffffff, 0.1);
                for (let i = 0; i < 20; i++) {
                    let x = Phaser.Math.Between(-300, mapWidth + 300);
                    let y = Phaser.Math.Between(-300, mapHeight + 300);
                    if (x < 0 || x > mapWidth || y < 0 || y > mapHeight) {
                        atmosphere.fillCircle(x, y, Phaser.Math.Between(1, 3));
                    }
                }
                atmosphere.setDepth(-19);
            }

            generateMap() {
                let g = this.make.graphics({x:0,y:0,add:false});
                
                // ===== TEXTURAS MELHORADAS =====
                // PISO - com gradiente e textura
                g.fillStyle(this.currentTheme.floor).fillRect(0,0,64,64);
                g.fillStyle(0x000000, 0.1).fillRect(0, 0, 64, 64);
                g.fillStyle(0x000000, 0.15).fillRect(8, 8, 8, 8);
                g.fillStyle(0x000000, 0.15).fillRect(24, 24, 8, 8);
                g.fillStyle(0x000000, 0.1).fillRect(40, 40, 8, 8);
                g.lineStyle(1, 0x000000, 0.2).strokeRect(0, 0, 64, 64);
                g.generateTexture('t_floor', 64, 64); 
                g.clear();
                
                // PAREDE - com gradiente e textura de pedra
                g.fillStyle(this.currentTheme.wall).fillRect(0, 0, 64, 64);
                g.fillStyle(0x000000, 0.3);
                for (let i = 0; i < 8; i++) {
                    g.fillRect(Phaser.Math.Between(0, 55), Phaser.Math.Between(0, 55), Phaser.Math.Between(3, 8), Phaser.Math.Between(2, 5));
                }
                g.lineStyle(2, 0x000000, 0.4).strokeRect(0, 0, 64, 64);
                // Efeito de profundidade
                g.fillStyle(0xffffff, 0.1).fillRect(0, 0, 64, 8);
                g.generateTexture('t_wall', 64, 64); 
                g.clear();
                
                if (g) g.destroy();

                // Gerar labirinto com algoritmo melhor
                let grid = Array(this.mapSize).fill().map(() => Array(this.mapSize).fill(1));
                
                let visited = Array(this.mapSize).fill().map(() => Array(this.mapSize).fill(false));
                let stack = [];
                
                let startX = Math.floor(this.mapSize / 2);
                let startY = Math.floor(this.mapSize / 2);
                
                let carve = (x, y) => {
                    visited[y][x] = true;
                    grid[y][x] = 0;
                    
                    let directions = Phaser.Utils.Array.Shuffle([
                        {x: x + 2, y: y, dx: x + 1, dy: y},
                        {x: x - 2, y: y, dx: x - 1, dy: y},
                        {x: x, y: y + 2, dx: x, dy: y + 1},
                        {x: x, y: y - 2, dx: x, dy: y - 1}
                    ]);
                    
                    for (let dir of directions) {
                        if (dir.x >= 0 && dir.x < this.mapSize && dir.y >= 0 && dir.y < this.mapSize && !visited[dir.y][dir.x]) {
                            grid[dir.dy][dir.dx] = 0;
                            carve(dir.x, dir.y);
                        }
                    }
                };
                
                carve(startX, startY);
                
                // Adicionar mais aberturas
                for (let y = 1; y < this.mapSize - 1; y++) {
                    for (let x = 1; x < this.mapSize - 1; x++) {
                        if (Phaser.Math.Between(0, 100) < 20) {
                            grid[y][x] = 0;
                        }
                    }
                }

                let emptyTiles = [];
                let mapWidth = this.mapSize * this.tileSize;
                let mapHeight = this.mapSize * this.tileSize;
                let spawnX = startX * this.tileSize + 32;
                let spawnY = startY * this.tileSize + 32;
                
                // Renderizar mapa
                for(let y=0; y<this.mapSize; y++) {
                    for(let x=0; x<this.mapSize; x++) {
                        let cx = x*this.tileSize+32; 
                        let cy = y*this.tileSize+32;
                        if(grid[y][x]===1) {
                            this.add.image(cx, cy, 't_wall').setDepth(0);
                        } else {
                            this.add.image(cx, cy, 't_floor').setDepth(0);
                            // Adicionar torchlight/decoração em alguns pisos
                            if (Phaser.Math.Between(0, 100) < 5 && grid[y][x] === 0) {
                                let light = this.add.circle(cx, cy, 8, 0xffaa00, 0.2).setDepth(1);
                            }
                            if(Phaser.Math.Distance.Between(cx, cy, spawnX, spawnY) > 300) {
                                emptyTiles.push({x: cx, y: cy});
                            }
                        }
                    }
                }

                if(!this.isBossStage && emptyTiles.length>0) {
                    Phaser.Utils.Array.Shuffle(emptyTiles);
                    let doorPos = emptyTiles.pop();
                    this.createDoor(doorPos.x, doorPos.y);

                    let enemiesToSpawn = this.stage * 4;
                    // Inimigos DENTRO da masmorra
                    for(let i=0; i<enemiesToSpawn; i++) {
                        if(emptyTiles.length===0) break;
                        let pos = emptyTiles.pop();
                        let type = Phaser.Math.Between(0,1) === 0 ? 'orc' : 'wolf';
                        let e = this.enemies.create(pos.x, pos.y, type);
                        e.hp = type === 'orc' ? 6 : 3;
                    }
                    
                    // Inimigos nas BORDAS escuras
                    let edgeEnemies = Math.max(2, Math.floor(this.stage / 2));
                    for(let i=0; i<edgeEnemies; i++) {
                        let side = Phaser.Math.Between(0, 3);
                        let ex, ey;
                        
                        if (side === 0) { // Topo
                            ex = Phaser.Math.Between(-100, mapWidth + 100);
                            ey = -80;
                        } else if (side === 1) { // Baixo
                            ex = Phaser.Math.Between(-100, mapWidth + 100);
                            ey = mapHeight + 80;
                        } else if (side === 2) { // Esquerda
                            ex = -80;
                            ey = Phaser.Math.Between(-100, mapHeight + 100);
                        } else { // Direita
                            ex = mapWidth + 80;
                            ey = Phaser.Math.Between(-100, mapHeight + 100);
                        }
                        
                        let type = Phaser.Math.Between(0, 2) === 0 ? 'orc' : 'wolf';
                        let e = this.enemies.create(ex, ey, type);
                        e.hp = type === 'orc' ? 6 : 3;
                    }
                } else if (this.isBossStage) {
                    // Arena boss limpa
                    let bossPosX = Math.floor(mapWidth / 2);
                    let bossPosY = Math.floor(mapHeight / 2);
                    
                    for(let y = Math.max(0, Math.floor(bossPosY / this.tileSize) - 4); 
                        y < Math.min(this.mapSize, Math.floor(bossPosY / this.tileSize) + 5); y++) {
                        for(let x = Math.max(0, Math.floor(bossPosX / this.tileSize) - 4); 
                            x < Math.min(this.mapSize, Math.floor(bossPosX / this.tileSize) + 5); x++) {
                            let cx = x*this.tileSize+32; 
                            let cy = y*this.tileSize+32;
                            this.add.image(cx, cy, 't_floor').setDepth(0);
                        }
                    }
                }

                return { x: spawnX, y: spawnY };
            }
        }

        const config = {
            type: Phaser.AUTO, 
            width: window.innerWidth, 
            height: window.innerHeight, 
            parent: 'game',
            physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
            scene: [PreloadScene, MainScene], 
            pixelArt: false, 
            antialias: true
        };

        const game = new Phaser.Game(config);
        
        window.addEventListener('resize', () => {
            if (game.isBooted) {
                game.scale.resize(window.innerWidth, window.innerHeight);
            }
        });
    </script>
</body>
</html>