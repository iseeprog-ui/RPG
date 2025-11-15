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
        speed: 160
    };

    const keysPressed = new Set();
    let lastTimestamp = 0;

    function clearLoadingText() {
        const loadingElement = document.getElementById("loading");
        if (loadingElement) {
            loadingElement.style.display = "none";
        }
    }

    function handleKeyDown(event) {
        const key = event.key.toLowerCase();
        if (key.startsWith("arrow") || key === "w" || key === "a" || key === "s" || key === "d") {
            event.preventDefault();
        }
        keysPressed.add(key);
    }

    function handleKeyUp(event) {
        keysPressed.delete(event.key.toLowerCase());
    }

    function isWallTile(row, col) {
        if (row < 0 || row >= mapRows || col < 0 || col >= mapCols) {
            return true;
        }
        return map[row][col] === 1;
    }

    function isColliding(nextX, nextY) {
        const left = nextX;
        const right = nextX + player.width;
        const top = nextY;
        const bottom = nextY + player.height;

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

        if (moveX !== 0 && moveY !== 0) {
            const factor = Math.SQRT1_2;
            moveX *= factor;
            moveY *= factor;
        }

        const deltaX = moveX * player.speed * delta;
        const deltaY = moveY * player.speed * delta;

        if (deltaX !== 0) {
            const nextX = player.x + deltaX;
            if (!isColliding(nextX, player.y)) {
                player.x = nextX;
            }
        }

        if (deltaY !== 0) {
            const nextY = player.y + deltaY;
            if (!isColliding(player.x, nextY)) {
                player.y = nextY;
            }
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

    function draw() {
        if (!ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMap();
        drawPlayer();
    }

    function update(delta) {
        movePlayer(delta);
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
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.requestAnimationFrame(gameLoop);
    };
})();
