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
        baseMaxHp: 100,
        maxHp: 100,
        hp: 100,
        baseDamage: 30,
        attackDamage: 30,
        exp: 0,
        level: 1,
        expToNextLevel: 100,
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
    let interactRequested = false;
    let lastTimestamp = 0;
    let inventoryOpen = false;
    const inventory = [];
    const inventorySlots = [];

    const itemsOnMap = [
        {
            id: "potion-1",
            name: "Healing Potion",
            type: "potion",
            description: "Restores 40 HP",
            x: tileSize * 4.5,
            y: tileSize * 3.5,
            width: 18,
            height: 18,
            color: "#5ac8fa",
            healAmount: 40
        },
        {
            id: "sword-1",
            name: "Iron Sword",
            type: "equipment",
            description: "+10 Attack",
            x: tileSize * 14.5,
            y: tileSize * 10.5,
            width: 18,
            height: 18,
            color: "#d4af37",
            bonuses: { attackDamage: 10 }
        },
        {
            id: "armor-1",
            name: "Leather Armor",
            type: "equipment",
            description: "+25 Max HP",
            x: tileSize * 7.5,
            y: tileSize * 15.5,
            width: 18,
            height: 18,
            color: "#c97c5d",
            bonuses: { maxHp: 25 }
        }
    ];

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

        if (key === "e") {
            interactRequested = true;
            return;
        }

        if (key === "i" && !event.repeat) {
            inventoryOpen = !inventoryOpen;
            return;
        }

        if (key === "h" && !event.repeat) {
            usePotionHotkey();
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

    function handleCanvasClick(event) {
        if (!inventoryOpen) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        for (let i = 0; i < inventorySlots.length; i += 1) {
            const slot = inventorySlots[i];
            if (
                clickX >= slot.x &&
                clickX <= slot.x + slot.width &&
                clickY >= slot.y &&
                clickY <= slot.y + slot.height
            ) {
                activateInventoryItem(slot.item, slot.inventoryIndex);
                break;
            }
        }
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
                damageTimer: enemyTemplate.damageTimer,
                expValue: 50
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
                grantExperience(enemies[i].expValue || 35);
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
                enemy.hp -= player.attackDamage;
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

    function drawItems() {
        if (!ctx) {
            return;
        }

        itemsOnMap.forEach((item) => {
            ctx.fillStyle = item.color;
            ctx.fillRect(item.x, item.y, item.width, item.height);
            ctx.strokeStyle = "#1a1a1a";
            ctx.strokeRect(item.x, item.y, item.width, item.height);
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

        const xpBarY = y + barHeight + 12;
        const xpRatio = player.expToNextLevel > 0 ? player.exp / player.expToNextLevel : 0;

        ctx.fillStyle = "#222222";
        ctx.fillRect(x, xpBarY, barWidth, barHeight);

        ctx.fillStyle = "#4d7cff";
        ctx.fillRect(x, xpBarY, Math.min(1, Math.max(0, xpRatio)) * barWidth, barHeight);

        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(x, xpBarY, barWidth, barHeight);

        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        const textStartY = xpBarY + barHeight + 14;
        ctx.fillText(`HP: ${Math.ceil(player.hp)} / ${player.maxHp}`, x, textStartY);
        ctx.fillText(`Lvl ${player.level}  EXP: ${player.exp} / ${player.expToNextLevel}`, x, textStartY + 14);
        ctx.fillText("[I] Inventory  [H] Use Potion", x, textStartY + 28);
    }

    function drawInventoryPanel() {
        inventorySlots.length = 0;
        if (!ctx || !canvas || !inventoryOpen) {
            return;
        }

        const panelWidth = 260;
        const panelHeight = 240;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        const headerHeight = 30;

        ctx.fillStyle = "rgba(20, 20, 20, 0.85)";
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px sans-serif";
        ctx.fillText("Inventory", panelX + 16, panelY + 22);

        ctx.font = "12px sans-serif";
        ctx.fillText("Click items to use/equip. H uses potion.", panelX + 16, panelY + headerHeight + 8);

        const slotSize = 44;
        const padding = 16;
        const columns = 3;

        inventory.forEach((item, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            const slotX = panelX + padding + col * (slotSize + padding);
            const slotY = panelY + headerHeight + 16 + row * (slotSize + padding);

            ctx.fillStyle = "rgba(60, 60, 60, 0.9)";
            ctx.fillRect(slotX - 4, slotY - 4, slotSize + 8, slotSize + 8);

            ctx.fillStyle = item.color || "#cccccc";
            ctx.fillRect(slotX, slotY, slotSize, slotSize);
            ctx.strokeStyle = "#000000";
            ctx.strokeRect(slotX, slotY, slotSize, slotSize);

            if (item.type === "equipment" && item.equipped) {
                ctx.strokeStyle = "#32cd32";
                ctx.lineWidth = 3;
                ctx.strokeRect(slotX - 2, slotY - 2, slotSize + 4, slotSize + 4);
                ctx.lineWidth = 1;
            }

            ctx.fillStyle = "#ffffff";
            ctx.font = "10px sans-serif";
            ctx.fillText(item.name, slotX, slotY + slotSize + 12);

            inventorySlots.push({
                x: slotX,
                y: slotY,
                width: slotSize,
                height: slotSize,
                item,
                inventoryIndex: index
            });
        });
    }

    function draw() {
        if (!ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMap();
        drawItems();
        drawAttackBox();
        drawEnemies();
        drawPlayer();
        drawHud();
        drawInteractionPrompt();
        drawInventoryPanel();
    }

    function update(delta) {
        movePlayer(delta);
        updateAttack(delta);
        updateEnemies(delta);
        handleItemPickup();
        interactRequested = false;
    }

    function findOverlappingItem() {
        for (let i = 0; i < itemsOnMap.length; i += 1) {
            const item = itemsOnMap[i];
            if (
                rectanglesOverlap(
                    player.x,
                    player.y,
                    player.width,
                    player.height,
                    item.x,
                    item.y,
                    item.width,
                    item.height
                )
            ) {
                return { item, index: i };
            }
        }
        return null;
    }

    function handleItemPickup() {
        if (!interactRequested) {
            return;
        }

        const overlap = findOverlappingItem();
        if (!overlap) {
            return;
        }

        const { item, index } = overlap;
        const inventoryItem = {
            id: item.id,
            name: item.name,
            type: item.type,
            description: item.description,
            color: item.color,
            healAmount: item.healAmount,
            bonuses: item.bonuses,
            equipped: false
        };
        itemsOnMap.splice(index, 1);
        inventory.push(inventoryItem);
    }

    function activateInventoryItem(item, index) {
        if (item.type === "potion") {
            if (player.hp >= player.maxHp) {
                return;
            }
            player.hp = Math.min(player.maxHp, player.hp + (item.healAmount || 30));
            inventory.splice(index, 1);
            return;
        }

        if (item.type === "equipment") {
            item.equipped = !item.equipped;
            refreshPlayerStats();
        }
    }

    function usePotionHotkey() {
        const potionIndex = inventory.findIndex((item) => item.type === "potion");
        if (potionIndex === -1) {
            return;
        }
        activateInventoryItem(inventory[potionIndex], potionIndex);
    }

    function calculateEquipmentBonuses() {
        let bonusHp = 0;
        let bonusDamage = 0;

        inventory.forEach((item) => {
            if (item.type === "equipment" && item.equipped && item.bonuses) {
                bonusHp += item.bonuses.maxHp || 0;
                bonusDamage += item.bonuses.attackDamage || 0;
            }
        });

        return { bonusHp, bonusDamage };
    }

    function refreshPlayerStats() {
        const previousMaxHp = player.maxHp;
        const previousRatio = previousMaxHp > 0 ? player.hp / previousMaxHp : 1;
        const { bonusHp, bonusDamage } = calculateEquipmentBonuses();
        player.maxHp = player.baseMaxHp + bonusHp;
        player.attackDamage = player.baseDamage + bonusDamage;
        player.hp = Math.min(
            player.maxHp,
            Math.max(0, Math.round(player.maxHp * previousRatio))
        );
    }

    function grantExperience(amount) {
        player.exp += amount;
        while (player.exp >= player.expToNextLevel) {
            player.exp -= player.expToNextLevel;
            levelUp();
        }
    }

    function levelUp() {
        player.level += 1;
        player.baseMaxHp += 20;
        player.baseDamage += 5;
        player.expToNextLevel = Math.floor(player.expToNextLevel * 1.5);
        refreshPlayerStats();
        player.hp = player.maxHp;
    }

    function drawInteractionPrompt() {
        if (!ctx || !canvas) {
            return;
        }

        const overlap = findOverlappingItem();
        if (!overlap) {
            return;
        }

        const message = `Press E to pick up ${overlap.item.name}`;
        ctx.font = "14px sans-serif";
        const textWidth = ctx.measureText(message).width;
        const padding = 16;
        const boxWidth = Math.min(canvas.width - 40, textWidth + padding * 2);
        const boxHeight = 40;
        const boxX = 20;
        const boxY = canvas.height - boxHeight - 20;

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(message, boxX + padding, boxY + boxHeight - 14);
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
        canvas.addEventListener("click", handleCanvasClick);
        refreshPlayerStats();
        window.requestAnimationFrame(gameLoop);
    };
})();
