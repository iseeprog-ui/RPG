(function () {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;

    const tileSize = 32;
    const mapLayout = [
        "1111111111111111111111111",
        "1000000000000000000000001",
        "1011110001111000111100101",
        "1010010001001000100000101",
        "1010010001001000100000101",
        "1010011111001111101110101",
        "1010000000000000001010101",
        "1010111111111111101010101",
        "1010100000010000101010101",
        "1010101111011110101010101",
        "1010101000010010101010101",
        "1010101011111010101010101",
        "1010101000000010100010101",
        "1010101111111010111010101",
        "1010000000000010000010101",
        "1011111111111011111010101",
        "1000000000001000000010001",
        "1011111111111011111111101",
        "1111111111111111111111111"
    ];
    const map = mapLayout.map((row) => row.split("").map((cell) => Number(cell)));
    const mapRows = map.length;
    const mapCols = map[0].length;

    const player = {
        x: tileSize * 2,
        y: tileSize * 2,
        width: 24,
        height: 24,
        speed: 160,
        maxHp: 100,
        hp: 100,
        direction: { x: 1, y: 0 },
        isAttacking: false,
        attackDuration: 0.15,
        attackTimer: 0,
        attackCooldown: 0.5,
        attackCooldownTimer: 0,
        attackHitSet: new Set()
    };

    const enemies = [];
    const keysPressed = new Set();
    let attackRequested = false;
    let lastTimestamp = 0;

    function clearLoadingText() {
        const loadingElement = document.getElementById("loading");
        if (loadingElement) {
            loadingElement.style.display = "none";
        }
    }

    function handleKeyDown(event) {
        const key = event.key.toLowerCase();
        if (
            key.startsWith("arrow") ||
            key === "w" ||
            key === "a" ||
            key === "s" ||
            key === "d" ||
            event.code === "Space"
        ) {
            event.preventDefault();
        }

        if (event.code === "Space") {
            attackRequested = true;
            return;
        }

        keysPressed.add(key);
    }

    function handleKeyUp(event) {
        if (event.code === "Space") {
            return;
        }
        keysPressed.delete(event.key.toLowerCase());
    }

    function isWallTile(row, col) {
        if (row < 0 || row >= mapRows || col < 0 || col >= mapCols) {
            return true;
        }
        return map[row][col] === 1;
    }

    function isRectColliding(x, y, width, height) {
        const left = x;
        const right = x + width;
        const top = y;
        const bottom = y + height;

        const leftTile = Math.floor(left / tileSize);
        const rightTile = Math.floor((right - 1) / tileSize);
        const topTile = Math.floor(top / tileSize);
        const bottomTile = Math.floor((bottom - 1) / tileSize);

        for (let row = topTile; row <= bottomTile; row += 1) {
            for (let col = leftTile; col <= rightTile; col += 1) {
                if (isWallTile(row, col)) {
                    return true;
                }
            }
        }

        return false;
    }

    function moveEntity(entity, deltaX, deltaY) {
        if (deltaX !== 0) {
            const nextX = entity.x + deltaX;
            if (!isRectColliding(nextX, entity.y, entity.width, entity.height)) {
                entity.x = nextX;
            }
        }

        if (deltaY !== 0) {
            const nextY = entity.y + deltaY;
            if (!isRectColliding(entity.x, nextY, entity.width, entity.height)) {
                entity.y = nextY;
            }
        }
    }

    function movePlayer(delta) {
        let moveX = 0;
        let moveY = 0;

        const up = keysPressed.has("arrowup") || keysPressed.has("w");
        const down = keysPressed.has("arrowdown") || keysPressed.has("s");
        const left = keysPressed.has("arrowleft") || keysPressed.has("a");
        const right = keysPressed.has("arrowright") || keysPressed.has("d");

        if (up) {
            moveY -= 1;
        }
        if (down) {
            moveY += 1;
        }
        if (left) {
            moveX -= 1;
        }
        if (right) {
            moveX += 1;
        }

        if (moveX !== 0 || moveY !== 0) {
            const length = Math.hypot(moveX, moveY);
            moveX /= length;
            moveY /= length;
            player.direction.x = moveX;
            player.direction.y = moveY;
        }

        const deltaX = moveX * player.speed * delta;
        const deltaY = moveY * player.speed * delta;

        moveEntity(player, deltaX, deltaY);
    }

    function rectanglesOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return (
            ax < bx + bw &&
            ax + aw > bx &&
            ay < by + bh &&
            ay + ah > by
        );
    }

    function spawnEnemies() {
        const enemyTemplate = {
            width: 26,
            height: 26,
            speed: 70,
            hp: 60,
            contactDamage: 8,
            damageInterval: 0.8,
            damageTimer: 0
        };

        const spawnPoints = [
            { x: tileSize * 10, y: tileSize * 6 },
            { x: tileSize * 15, y: tileSize * 12 },
            { x: tileSize * 5, y: tileSize * 14 }
        ];

        spawnPoints.forEach((point) => {
            enemies.push({
                x: point.x,
                y: point.y,
                width: enemyTemplate.width,
                height: enemyTemplate.height,
                speed: enemyTemplate.speed,
                hp: enemyTemplate.hp,
                contactDamage: enemyTemplate.contactDamage,
                damageInterval: enemyTemplate.damageInterval,
                damageTimer: enemyTemplate.damageTimer
            });
        });
    }

    function updateEnemies(delta) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        enemies.forEach((enemy) => {
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;

            let dirX = playerCenterX - enemyCenterX;
            let dirY = playerCenterY - enemyCenterY;
            const distance = Math.hypot(dirX, dirY);

            if (distance > 0) {
                dirX /= distance;
                dirY /= distance;
            }

            const deltaX = dirX * enemy.speed * delta;
            const deltaY = dirY * enemy.speed * delta;

            moveEntity(enemy, deltaX, deltaY);

            if (enemy.damageTimer > 0) {
                enemy.damageTimer = Math.max(0, enemy.damageTimer - delta);
            }

            if (rectanglesOverlap(player.x, player.y, player.width, player.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
                if (enemy.damageTimer === 0 && player.hp > 0) {
                    player.hp = Math.max(0, player.hp - enemy.contactDamage);
                    enemy.damageTimer = enemy.damageInterval;
                }
            }
        });

        for (let i = enemies.length - 1; i >= 0; i -= 1) {
            if (enemies[i].hp <= 0) {
                enemies.splice(i, 1);
            }
        }
    }

    function computeAttackHitbox() {
        const attackRange = 28;
        const attackWidth = player.width;
        const attackHeight = player.height;
        const dirX = player.direction.x;
        const dirY = player.direction.y;

        let attackX = player.x;
        let attackY = player.y;

        if (Math.abs(dirX) > Math.abs(dirY)) {
            attackX += dirX > 0 ? player.width : -attackRange;
            attackY += (player.height - attackHeight) / 2;
        } else {
            attackY += dirY > 0 ? player.height : -attackRange;
            attackX += (player.width - attackWidth) / 2;
        }

        return {
            x: attackX,
            y: attackY,
            width: attackWidth,
            height: attackHeight
        };
    }

    function updateAttack(delta) {
        if (player.attackCooldownTimer > 0) {
            player.attackCooldownTimer = Math.max(0, player.attackCooldownTimer - delta);
        }

        if (!player.isAttacking && attackRequested && player.attackCooldownTimer === 0) {
            player.isAttacking = true;
            player.attackTimer = player.attackDuration;
            player.attackCooldownTimer = player.attackCooldown;
            player.attackHitSet = new Set();
        }

        attackRequested = false;

        if (!player.isAttacking) {
            return;
        }

        player.attackTimer -= delta;
        const attackBox = computeAttackHitbox();

        enemies.forEach((enemy) => {
            if (!player.attackHitSet.has(enemy) && rectanglesOverlap(attackBox.x, attackBox.y, attackBox.width, attackBox.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
                enemy.hp -= 30;
                player.attackHitSet.add(enemy);
            }
        });

        if (player.attackTimer <= 0) {
            player.isAttacking = false;
        }
    }

    function drawMap() {
        if (!ctx) {
            return;
        }

        for (let row = 0; row < mapRows; row += 1) {
            for (let col = 0; col < mapCols; col += 1) {
                const tile = map[row][col];
                const x = col * tileSize;
                const y = row * tileSize;

                if (tile === 1) {
                    ctx.fillStyle = "#3a3a3a";
                } else {
                    ctx.fillStyle = "#1a1a1a";
                }

                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
    }

    function drawAttackBox() {
        if (!ctx || !player.isAttacking) {
            return;
        }

        const attackBox = computeAttackHitbox();
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(attackBox.x, attackBox.y, attackBox.width, attackBox.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.strokeRect(attackBox.x, attackBox.y, attackBox.width, attackBox.height);
    }

    function drawPlayer() {
        if (!ctx) {
            return;
        }

        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(player.x, player.y, player.width, player.height);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, player.width, player.height);
    }

    function drawEnemies() {
        if (!ctx) {
            return;
        }

        enemies.forEach((enemy) => {
            ctx.fillStyle = "#a83232";
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });
    }

    function drawHud() {
        if (!ctx) {
            return;
        }

        const barWidth = 200;
        const barHeight = 16;
        const x = 20;
        const y = 20;
        const healthRatio = player.hp / player.maxHp;

        ctx.fillStyle = "#000000";
        ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

        ctx.fillStyle = "#444444";
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = "#32cd32";
        ctx.fillRect(x, y, barWidth * healthRatio, barHeight);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);

        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.fillText(`HP: ${Math.ceil(player.hp)} / ${player.maxHp}`, x, y + barHeight + 14);
    }

    function draw() {
        if (!ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMap();
        drawAttackBox();
        drawEnemies();
        drawPlayer();
        drawHud();
    }

    function update(delta) {
        movePlayer(delta);
        updateAttack(delta);
        updateEnemies(delta);
    }

    function gameLoop(timestamp) {
        const delta = (timestamp - lastTimestamp) / 1000 || 0;
        lastTimestamp = timestamp;

        update(delta);
        draw();
        window.requestAnimationFrame(gameLoop);
    }

    window.onload = function () {
        if (!canvas || !ctx) {
            console.error("Unable to initialize canvas context.");
            return;
        }

        clearLoadingText();
        spawnEnemies();
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.requestAnimationFrame(gameLoop);
    };
})();
