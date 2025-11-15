(function () {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;
    const STORAGE_KEY = "rpg-demo-save";
    const saveNotification = {
        message: "",
        timer: 0,
        error: false
    };

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

    const animationFrameCount = 10;
    const animationSpeed = 8;
    let animationTimer = 0;

    const pixelArtLibrary = createPixelArt(animationFrameCount);
    const heroSprite = pixelArtLibrary.sprites.player.hero;
    const enemySpriteLibrary = pixelArtLibrary.sprites.enemies;
    const npcSpriteLibrary = pixelArtLibrary.sprites.npcs;
    const itemSpriteLibrary = pixelArtLibrary.sprites.items;
    const tileAnimations = pixelArtLibrary.tiles;
    const effectSprites = pixelArtLibrary.effects;

    const player = {
        x: tileSize * 2,
        y: tileSize * 2,
        width: heroSprite.pixelWidth * heroSprite.scale,
        height: heroSprite.pixelHeight * heroSprite.scale,
        spriteKey: "hero",
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
        attackHitSet: new Set(),
        isMoving: false
    };
    player.sprite = heroSprite;

    const enemies = [];
    const enemyArchetypes = {
        brute: {
            type: "brute",
            spriteKey: "brute",
            sprite: enemySpriteLibrary.brute,
            width: enemySpriteLibrary.brute.pixelWidth * enemySpriteLibrary.brute.scale,
            height: enemySpriteLibrary.brute.pixelHeight * enemySpriteLibrary.brute.scale,
            speed: 70,
            hp: 120,
            contactDamage: 10,
            damageInterval: 0.85,
            expValue: 80
        },
        wisp: {
            type: "wisp",
            spriteKey: "wisp",
            sprite: enemySpriteLibrary.wisp,
            width: enemySpriteLibrary.wisp.pixelWidth * enemySpriteLibrary.wisp.scale,
            height: enemySpriteLibrary.wisp.pixelHeight * enemySpriteLibrary.wisp.scale,
            speed: 110,
            hp: 55,
            contactDamage: 6,
            damageInterval: 0.6,
            expValue: 60
        }
    };
    const keysPressed = new Set();
    let attackRequested = false;
    let interactRequested = false;
    let lastTimestamp = 0;
    let inventoryOpen = false;
    const inventory = [];
    const inventorySlots = [];

    const npcs = [
        {
            id: "elder",
            name: "Elder Rowan",
            x: tileSize * 8.5,
            y: tileSize * 6.5,
            width: 28,
            height: 32,
            spriteKey: "elder",
            questToGive: "defeatEnemies",
            dialogues: {
                offerQuest: [
                    "The woods are crawling with beasts...",
                    "Please defeat three of them before they reach the village!"
                ],
                questInProgress: [
                    "Stay vigilant, hero.",
                    "Three beasts still stalk our paths."
                ],
                questTurnIn: [
                    "Your bravery saved us all!",
                    "Take this reward as a token of our gratitude."
                ],
                questCompleted: [
                    "Thanks to you, our people can breathe easier."
                ]
            }
        },
        {
            id: "scholar",
            name: "Scholar Mira",
            x: tileSize * 16.5,
            y: tileSize * 4.5,
            width: 26,
            height: 32,
            spriteKey: "scholar",
            questToGive: "retrieveRelic",
            prerequisiteQuestId: "defeatEnemies",
            dialogues: {
                prerequisite: [
                    "The Elder still needs your aid.",
                    "Return once the village is safe."
                ],
                offerQuest: [
                    "With the beasts gone, I can resume my research...",
                    "Could you bring me the Ancient Relic from the ruins?"
                ],
                questInProgress: [
                    "The relic should be east of here, shimmering with arcane light."
                ],
                questTurnIn: [
                    "Splendid! The relic is intact.",
                    "This knowledge will aid us all."
                ],
                questCompleted: [
                    "Thank you again. Its secrets are wondrous!"
                ]
            }
        }
    ];

    npcs.forEach((npc) => {
        npc.sprite = npcSpriteLibrary[npc.spriteKey] || npcSpriteLibrary.elder;
        if (npc.sprite) {
            npc.width = npc.sprite.pixelWidth * npc.sprite.scale;
            npc.height = npc.sprite.pixelHeight * npc.sprite.scale;
        }
    });

    const dialogueState = {
        active: false,
        npc: null,
        lines: [],
        index: 0,
        questToActivate: null,
        questToComplete: null
    };

    const quests = {
        defeatEnemies: {
            id: "defeatEnemies",
            description: "Defeat 3 beasts threatening the village.",
            targetType: "enemyKill",
            targetCount: 3,
            currentCount: 0,
            isCompleted: false,
            isActive: false,
            requiresTurnIn: true,
            readyToTurnIn: false,
            rewardExp: 120
        },
        retrieveRelic: {
            id: "retrieveRelic",
            description: "Bring the Ancient Relic to Scholar Mira.",
            targetType: "itemPickup",
            targetCount: 1,
            currentCount: 0,
            isCompleted: false,
            isActive: false,
            requiresTurnIn: true,
            readyToTurnIn: false,
            itemId: "ancient-relic",
            rewardExp: 160
        }
    };

    let trackedQuestId = null;

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
            healAmount: 40,
            spriteKey: "potion"
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
            bonuses: { attackDamage: 10 },
            spriteKey: "sword"
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
            bonuses: { maxHp: 25 },
            spriteKey: "armor"
        },
        {
            id: "ancient-relic",
            name: "Ancient Relic",
            type: "quest",
            description: "A shimmering relic pulsing with energy.",
            x: tileSize * 18.5,
            y: tileSize * 5.5,
            width: 18,
            height: 18,
            color: "#8a2be2",
            spriteKey: "relic"
        }
    ];

    itemsOnMap.forEach((item) => {
        item.spriteKey = item.spriteKey || "potion";
        item.sprite = resolveItemSprite(item);
        if (item.sprite) {
            const displaySize = item.sprite.pixelWidth * item.sprite.scale;
            item.width = displaySize;
            item.height = displaySize;
        }
    });

    function resolveItemSpriteKey(item) {
        if (!item) {
            return "potion";
        }
        if (item.spriteKey && itemSpriteLibrary[item.spriteKey]) {
            return item.spriteKey;
        }
        if (item.id) {
            if (itemSpriteLibrary[item.id]) {
                return item.id;
            }
            if (item.id.includes("relic")) {
                return "relic";
            }
            if (item.id.includes("sword")) {
                return "sword";
            }
            if (item.id.includes("armor")) {
                return "armor";
            }
        }
        if (item.type && itemSpriteLibrary[item.type]) {
            return item.type;
        }
        if (item.type === "quest" && item.id && item.id.includes("relic")) {
            return "relic";
        }
        if (item.type === "equipment" && item.id && item.id.includes("sword")) {
            return "sword";
        }
        if (item.type === "equipment" && item.id && item.id.includes("armor")) {
            return "armor";
        }
        return "potion";
    }

    function resolveItemSprite(item) {
        const key = resolveItemSpriteKey(item);
        return itemSpriteLibrary[key] || itemSpriteLibrary.potion;
    }

    function createBlankFrame(width, height, fill = null) {
        return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
    }

    function setPixel(frame, x, y, color) {
        if (!frame || !frame[y]) {
            return;
        }
        if (x < 0 || y < 0 || y >= frame.length || x >= frame[0].length) {
            return;
        }
        frame[y][x] = color;
    }

    function fillRectInFrame(frame, startX, startY, width, height, color) {
        for (let y = startY; y < startY + height; y += 1) {
            for (let x = startX; x < startX + width; x += 1) {
                setPixel(frame, x, y, color);
            }
        }
    }

    function drawFrame(frame, originX, originY, scale, flipHorizontal = false, opacity = 1) {
        if (!ctx || !frame) {
            return;
        }

        const height = frame.length;
        const width = frame[0]?.length || 0;
        if (width === 0 || height === 0) {
            return;
        }

        const previousAlpha = ctx.globalAlpha;
        if (opacity !== 1) {
            ctx.globalAlpha = opacity;
        }

        for (let row = 0; row < height; row += 1) {
            const pixels = frame[row];
            for (let col = 0; col < width; col += 1) {
                const color = pixels[col];
                if (!color) {
                    continue;
                }

                const targetCol = flipHorizontal ? width - 1 - col : col;
                const drawX = originX + targetCol * scale;
                const drawY = originY + row * scale;
                ctx.fillStyle = color;
                ctx.fillRect(drawX, drawY, scale, scale);
            }
        }

        if (opacity !== 1) {
            ctx.globalAlpha = previousAlpha;
        }
    }

    function drawSprite(sprite, frameIndex, x, y, width, height, options = {}) {
        if (!sprite || !sprite.frames || sprite.frames.length === 0) {
            return;
        }

        const frames = sprite.frames;
        const frame = frames[frameIndex % frames.length];
        const scale = sprite.scale || 1;
        const drawWidth = sprite.pixelWidth * scale;
        const drawHeight = sprite.pixelHeight * scale;
        const anchorX = options.anchorX ?? sprite.anchorX ?? 0.5;
        const anchorY = options.anchorY ?? sprite.anchorY ?? 1;
        const offsetX = (options.offsetX ?? sprite.offsetX ?? 0) * scale;
        const offsetY = (options.offsetY ?? sprite.offsetY ?? 0) * scale;

        const originX = x + width * anchorX - drawWidth * anchorX + offsetX;
        const originY = y + height * anchorY - drawHeight * anchorY + offsetY;

        drawFrame(frame, originX, originY, scale, options.flipHorizontal || false, options.opacity ?? 1);
    }

    function tintColor(hex, amount) {
        const normalized = hex.replace("#", "");
        if (normalized.length !== 6) {
            return hex;
        }

        let r = parseInt(normalized.slice(0, 2), 16);
        let g = parseInt(normalized.slice(2, 4), 16);
        let b = parseInt(normalized.slice(4, 6), 16);

        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));

        return `#${r.toString(16).padStart(2, "0")}${g
            .toString(16)
            .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }

    function buildFrameSet(frames, options = {}) {
        const height = frames[0]?.length || 0;
        const width = height > 0 ? frames[0][0].length : 0;
        return {
            frames,
            pixelWidth: width,
            pixelHeight: height,
            scale: options.scale ?? 1,
            anchorX: options.anchorX ?? 0.5,
            anchorY: options.anchorY ?? 0.5,
            offsetX: options.offsetX ?? 0,
            offsetY: options.offsetY ?? 0
        };
    }

    function createPixelArt(frameCount) {
        const hero = buildFrameSet(createHeroFrames(), { scale: 2, anchorX: 0.5, anchorY: 1 });
        const brute = buildFrameSet(createBruteFrames(), { scale: 2, anchorX: 0.5, anchorY: 1 });
        const wisp = buildFrameSet(createWispFrames(), { scale: 2, anchorX: 0.5, anchorY: 1 });
        const elder = buildFrameSet(createElderFrames(), { scale: 2, anchorX: 0.5, anchorY: 1 });
        const scholar = buildFrameSet(createScholarFrames(), { scale: 2, anchorX: 0.5, anchorY: 1 });
        const potion = buildFrameSet(createPotionFrames(), { scale: 2, anchorX: 0.5, anchorY: 0.5 });
        const sword = buildFrameSet(createSwordFrames(), { scale: 2, anchorX: 0.5, anchorY: 0.5 });
        const armor = buildFrameSet(createArmorFrames(), { scale: 2, anchorX: 0.5, anchorY: 0.5 });
        const relic = buildFrameSet(createRelicFrames(), { scale: 2, anchorX: 0.5, anchorY: 0.5 });
        const floor = buildFrameSet(createFloorFrames(), { scale: 2, anchorX: 0, anchorY: 0 });
        const wall = buildFrameSet(createWallFrames(), { scale: 2, anchorX: 0, anchorY: 0 });
        const slash = buildFrameSet(createSlashFrames(), { scale: 2, anchorX: 0.5, anchorY: 0.5 });

        return {
            sprites: {
                player: { hero },
                enemies: { brute, wisp },
                npcs: { elder, scholar },
                items: { potion, sword, armor, relic }
            },
            tiles: { floor, wall },
            effects: { slash }
        };

        function createHeroFrames() {
            const width = 16;
            const height = 16;
            const baseHair = "#3d2c8d";
            const hairHighlight = "#5c43c5";
            const skin = "#f0c5a0";
            const skinShadow = "#d7a982";
            const tunic = "#2f6fe0";
            const tunicShadow = "#244fb3";
            const trim = "#ffd85a";
            const boots = "#4a3626";
            const bootsShadow = "#352417";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, null);
                const walkCycle = Math.sin((frameIndex / frameCount) * Math.PI * 2);
                const armCycle = Math.sin((frameIndex / frameCount) * Math.PI * 2 + Math.PI / 2);
                const bobOffset = Math.round(Math.sin((frameIndex / frameCount) * Math.PI * 2) * 1);
                const leftLegOffset = Math.round(walkCycle * 2);
                const rightLegOffset = -Math.round(walkCycle * 2);
                const leftArmOffset = Math.round(armCycle * 2);
                const rightArmOffset = -Math.round(armCycle * 2);

                // Hair and head
                fillRectInFrame(frame, 5, 1 + bobOffset, 6, 1, hairHighlight);
                fillRectInFrame(frame, 5, 2 + bobOffset, 6, 2, baseHair);
                fillRectInFrame(frame, 5, 4 + bobOffset, 6, 3, skin);
                fillRectInFrame(frame, 6, 5 + bobOffset, 4, 2, skinShadow);
                setPixel(frame, 6, 5 + bobOffset, skin);
                setPixel(frame, 9, 5 + bobOffset, skin);
                setPixel(frame, 6, 6 + bobOffset, "#000000");
                setPixel(frame, 9, 6 + bobOffset, "#000000");

                // Beard/shadow under chin
                fillRectInFrame(frame, 5, 7 + bobOffset, 6, 1, skinShadow);

                // Torso
                fillRectInFrame(frame, 5, 8 + bobOffset, 6, 1, trim);
                fillRectInFrame(frame, 5, 9 + bobOffset, 6, 3, tunic);
                fillRectInFrame(frame, 5, 10 + bobOffset, 3, 2, tunicShadow);

                // Belt
                fillRectInFrame(frame, 5, 12 + bobOffset, 6, 1, trim);

                // Legs
                fillRectInFrame(frame, 6 + leftLegOffset, 13 + bobOffset, 2, 2, bootsShadow);
                fillRectInFrame(frame, 6 + leftLegOffset, 15 + bobOffset, 2, 1, boots);
                fillRectInFrame(frame, 8 + rightLegOffset, 13 + bobOffset, 2, 2, boots);
                fillRectInFrame(frame, 8 + rightLegOffset, 15 + bobOffset, 2, 1, bootsShadow);

                // Arms
                fillRectInFrame(frame, 4 + leftArmOffset, 9 + bobOffset, 1, 3, tunicShadow);
                fillRectInFrame(frame, 11 + rightArmOffset, 9 + bobOffset, 1, 3, tunic);
                setPixel(frame, 4 + leftArmOffset, 12 + bobOffset, skin);
                setPixel(frame, 11 + rightArmOffset, 12 + bobOffset, skinShadow);

                frames.push(frame);
            }

            return frames;
        }

        function createBruteFrames() {
            const width = 16;
            const height = 16;
            const armor = "#6f4f28";
            const armorShadow = "#53371c";
            const cloth = "#9b4f4f";
            const eyes = "#ffbe3b";
            const horn = "#c7c1b0";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, null);
                const sway = Math.sin((frameIndex / frameCount) * Math.PI * 2);
                const stomp = Math.sin((frameIndex / frameCount) * Math.PI * 2 + Math.PI / 2);
                const torsoShift = Math.round(sway * 1);
                const hornTilt = Math.round(sway * 1);
                const step = Math.round(stomp * 2);

                // Head and horns
                fillRectInFrame(frame, 4 + torsoShift, 1, 8, 4, armorShadow);
                setPixel(frame, 3 + torsoShift, 1 + hornTilt, horn);
                setPixel(frame, 12 + torsoShift, 1 - hornTilt, horn);
                setPixel(frame, 6 + torsoShift, 3, eyes);
                setPixel(frame, 9 + torsoShift, 3, eyes);

                // Mouth line
                fillRectInFrame(frame, 6 + torsoShift, 4, 4, 1, "#2a1b10");

                // Torso armor
                fillRectInFrame(frame, 4 + torsoShift, 5, 8, 5, armor);
                fillRectInFrame(frame, 4 + torsoShift, 8, 8, 2, armorShadow);

                // Cloth
                fillRectInFrame(frame, 5 + torsoShift, 10, 6, 2, cloth);

                // Legs
                fillRectInFrame(frame, 5 + torsoShift, 12, 3, 2, armorShadow);
                fillRectInFrame(frame, 5 + torsoShift, 14, 3, 1, armor);
                fillRectInFrame(frame, 8 + torsoShift, 12, 3, 2, armor);
                fillRectInFrame(frame, 8 + torsoShift, 14, 3, 1, armorShadow);

                // Arms swinging
                fillRectInFrame(frame, 3 + torsoShift - step, 6, 1, 5, armorShadow);
                fillRectInFrame(frame, 12 + torsoShift + step, 6, 1, 5, armor);

                frames.push(frame);
            }

            return frames;
        }

        function createWispFrames() {
            const width = 16;
            const height = 16;
            const base = "#2ad4ff";
            const core = "#a6f7ff";
            const aura = "#12304f";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, null);
                const pulse = (Math.sin((frameIndex / frameCount) * Math.PI * 2) + 1) / 2;
                const radius = 5 + Math.round(pulse * 1.5);
                const offset = Math.round(Math.sin((frameIndex / frameCount) * Math.PI * 2) * 1);

                for (let y = 0; y < height; y += 1) {
                    for (let x = 0; x < width; x += 1) {
                        const dx = x - 8;
                        const dy = y - (8 + offset);
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= radius - 2) {
                            setPixel(frame, x, y, core);
                        } else if (distance <= radius) {
                            setPixel(frame, x, y, base);
                        } else if (distance <= radius + 1) {
                            setPixel(frame, x, y, pulse > 0.5 ? tintColor(base, -60) : aura);
                        }
                    }
                }

                frames.push(frame);
            }

            return frames;
        }

        function createElderFrames() {
            const width = 16;
            const height = 16;
            const robe = "#7a90d9";
            const robeShadow = "#5668b1";
            const beard = "#f3f1e6";
            const face = "#dfc2a2";
            const staff = "#8b5a2b";
            const gem = "#8fe7ff";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, null);
                const sway = Math.sin((frameIndex / frameCount) * Math.PI * 2);
                const robeShift = Math.round(sway);

                // Hood and head
                fillRectInFrame(frame, 5, 1, 6, 2, robeShadow);
                fillRectInFrame(frame, 6, 3, 4, 1, robe);
                fillRectInFrame(frame, 6, 4, 4, 2, face);
                fillRectInFrame(frame, 6, 6, 4, 2, beard);
                setPixel(frame, 6, 5, "#000000");
                setPixel(frame, 9, 5, "#000000");

                // Staff
                fillRectInFrame(frame, 3 + robeShift, 4, 1, 9, staff);
                setPixel(frame, 3 + robeShift, 3, gem);

                // Robe body
                fillRectInFrame(frame, 5 + robeShift, 8, 6, 6, robe);
                fillRectInFrame(frame, 5 + robeShift, 10, 6, 2, robeShadow);
                fillRectInFrame(frame, 5 + robeShift, 12, 6, 1, robe);

                frames.push(frame);
            }

            return frames;
        }

        function createScholarFrames() {
            const width = 16;
            const height = 16;
            const robe = "#c188c9";
            const robeShadow = "#9b65a5";
            const hair = "#3b1b59";
            const face = "#f1d0b2";
            const book = "#f6e37b";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, null);
                const bob = Math.sin((frameIndex / frameCount) * Math.PI * 2) * 0.7;
                const bobOffset = Math.round(bob);

                fillRectInFrame(frame, 5, 1 + bobOffset, 6, 2, hair);
                fillRectInFrame(frame, 6, 3 + bobOffset, 4, 2, face);
                setPixel(frame, 6, 4 + bobOffset, "#000000");
                setPixel(frame, 9, 4 + bobOffset, "#000000");
                fillRectInFrame(frame, 6, 5 + bobOffset, 4, 1, face);

                // Collar
                fillRectInFrame(frame, 6, 6 + bobOffset, 4, 1, robeShadow);

                // Book held in hands
                fillRectInFrame(frame, 3, 9 + bobOffset, 4, 3, book);
                fillRectInFrame(frame, 3, 9 + bobOffset, 4, 1, tintColor(book, -40));

                fillRectInFrame(frame, 5, 7 + bobOffset, 6, 6, robe);
                fillRectInFrame(frame, 5, 9 + bobOffset, 6, 2, robeShadow);

                frames.push(frame);
            }

            return frames;
        }

        function createPotionFrames() {
            const width = 12;
            const height = 12;
            const glass = "#b0eaff";
            const liquid = "#4ed2ff";
            const highlight = "#ffffff";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, null);
                const wave = (Math.sin((frameIndex / frameCount) * Math.PI * 2) + 1) / 2;
                const liquidHeight = 5 + Math.round(wave * 2);

                // Bottle outline
                fillRectInFrame(frame, 4, 0, 4, 1, glass);
                fillRectInFrame(frame, 3, 1, 6, 1, tintColor(glass, -30));
                fillRectInFrame(frame, 2, 2, 8, 6, tintColor(glass, -10));
                fillRectInFrame(frame, 2, 2, 8, liquidHeight, liquid);
                setPixel(frame, 3, 2, highlight);
                setPixel(frame, 7, 3, highlight);

                frames.push(frame);
            }

            return frames;
        }

        function createSwordFrames() {
            const width = 12;
            const height = 12;
            const blade = "#d2d7e0";
            const hilt = "#8b5a2b";
            const gem = "#ffd966";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, null);
                const sparklePos = (frameIndex % frameCount) / frameCount;
                const highlightRow = Math.floor(sparklePos * 6) + 2;

                // Blade
                fillRectInFrame(frame, 5, 1, 2, 7, blade);
                fillRectInFrame(frame, 5, highlightRow, 2, 1, tintColor(blade, 40));

                // Crossguard and handle
                fillRectInFrame(frame, 3, 8, 6, 1, hilt);
                fillRectInFrame(frame, 5, 9, 2, 3, tintColor(hilt, -10));
                setPixel(frame, 6, 11, gem);

                frames.push(frame);
            }

            return frames;
        }

        function createArmorFrames() {
            const width = 12;
            const height = 12;
            const metal = "#b0b8c4";
            const shadow = "#7d8591";
            const glow = "#5ec2ff";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, null);
                const pulse = (Math.sin((frameIndex / frameCount) * Math.PI * 2) + 1) / 2;

                fillRectInFrame(frame, 2, 2, 8, 2, metal);
                fillRectInFrame(frame, 2, 4, 8, 4, shadow);
                fillRectInFrame(frame, 3, 4, 6, 3, metal);
                fillRectInFrame(frame, 4, 5, 4, 1, tintColor(metal, 30));
                const glowStrength = pulse > 0.5 ? glow : tintColor(glow, -40);
                setPixel(frame, 4, 3, glowStrength);
                setPixel(frame, 7, 3, glowStrength);

                frames.push(frame);
            }

            return frames;
        }

        function createRelicFrames() {
            const width = 12;
            const height = 12;
            const core = "#b26bff";
            const aura = "#f4d4ff";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, null);
                const shimmer = (Math.sin((frameIndex / frameCount) * Math.PI * 2) + 1) / 2;
                const radius = 3 + Math.round(shimmer * 2);

                for (let y = 0; y < height; y += 1) {
                    for (let x = 0; x < width; x += 1) {
                        const dx = x - width / 2;
                        const dy = y - height / 2;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= radius - 1) {
                            setPixel(frame, x, y, core);
                        } else if (distance <= radius + 0.5) {
                            setPixel(frame, x, y, aura);
                        }
                    }
                }

                frames.push(frame);
            }

            return frames;
        }

        function createFloorFrames() {
            const width = 16;
            const height = 16;
            const base = "#1b1b1b";
            const highlight = "#262626";
            const sparkle = "#2f4858";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, base);
                const offset = frameIndex % frameCount;

                for (let y = 0; y < height; y += 1) {
                    for (let x = 0; x < width; x += 1) {
                        if ((x + y + offset) % 6 === 0) {
                            setPixel(frame, x, y, highlight);
                        }
                        if ((x * 3 + y * 5 + offset) % 19 === 0) {
                            setPixel(frame, x, y, sparkle);
                        }
                    }
                }

                frames.push(frame);
            }

            return frames;
        }

        function createWallFrames() {
            const width = 16;
            const height = 16;
            const stone = "#3d3d3d";
            const mortar = "#2a2a2a";
            const shine = "#515151";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, mortar);
                const shineOffset = frameIndex % frameCount;

                for (let y = 0; y < height; y += 1) {
                    for (let x = 0; x < width; x += 1) {
                        if ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0) {
                            setPixel(frame, x, y, stone);
                        }
                        if ((x + shineOffset) % 8 === 0 && y % 4 === 0) {
                            setPixel(frame, x, y, shine);
                        }
                    }
                }

                frames.push(frame);
            }

            return frames;
        }

        function createSlashFrames() {
            const width = 16;
            const height = 16;
            const core = "#ffbf3d";
            const glow = "#ffe9a3";
            const ember = "#f26e1b";

            const frames = [];

            for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
                const frame = createBlankFrame(width, height, null);
                const progress = frameIndex / (frameCount - 1 || 1);
                const rays = 8;
                const radius = 3 + progress * 5;

                for (let ray = 0; ray < rays; ray += 1) {
                    const angle = (Math.PI * 2 * ray) / rays + progress * 0.4;
                    for (let step = 0; step < radius; step += 0.5) {
                        const px = Math.round(width / 2 + Math.cos(angle) * step);
                        const py = Math.round(height / 2 + Math.sin(angle) * step);
                        if (step < radius * 0.4) {
                            setPixel(frame, px, py, core);
                        } else if (step < radius * 0.8) {
                            setPixel(frame, px, py, glow);
                        } else {
                            setPixel(frame, px, py, ember);
                        }
                    }
                }

                frames.push(frame);
            }

            return frames;
        }
    }

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
            if (dialogueState.active) {
                return;
            }
            attackRequested = true;
            return;
        }

        if (key === "e") {
            interactRequested = true;
            return;
        }

        if (key === "i" && !event.repeat) {
            if (dialogueState.active) {
                return;
            }
            inventoryOpen = !inventoryOpen;
            return;
        }

        if (key === "h" && !event.repeat) {
            usePotionHotkey();
            return;
        }

        if (key === "p" && !event.repeat) {
            saveGame();
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
        if (dialogueState.active) {
            return;
        }

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

        const isMoving = moveX !== 0 || moveY !== 0;
        if (isMoving) {
            const length = Math.hypot(moveX, moveY);
            moveX /= length;
            moveY /= length;
            player.direction.x = moveX;
            player.direction.y = moveY;
        }

        player.isMoving = isMoving;

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
        const spawnPoints = [
            { x: tileSize * 10, y: tileSize * 6 },
            { x: tileSize * 15, y: tileSize * 12 },
            { x: tileSize * 5, y: tileSize * 14 },
            { x: tileSize * 17, y: tileSize * 8 }
        ];

        const enemyTypes = Object.keys(enemyArchetypes);
        spawnPoints.forEach((point, index) => {
            const archetype = enemyArchetypes[enemyTypes[index % enemyTypes.length]];
            if (!archetype) {
                return;
            }

            enemies.push({
                x: point.x,
                y: point.y,
                width: archetype.width,
                height: archetype.height,
                speed: archetype.speed,
                hp: archetype.hp,
                maxHp: archetype.hp,
                contactDamage: archetype.contactDamage,
                damageInterval: archetype.damageInterval,
                damageTimer: 0,
                expValue: archetype.expValue,
                sprite: archetype.sprite,
                spriteKey: archetype.spriteKey,
                type: archetype.type
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
                handleEnemyDefeated(enemies[i]);
                grantExperience(enemies[i].expValue || 35);
                enemies.splice(i, 1);
            }
        }
    }

    function handleEnemyDefeated(enemy) {
        updateQuestProgress("enemyKill", { amount: 1 });
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

        const frameIndex = Math.floor((animationTimer * (animationSpeed / 2)) % animationFrameCount);
        const floorFrame = tileAnimations.floor.frames[frameIndex];
        const wallFrame = tileAnimations.wall.frames[frameIndex];
        const floorScale = tileSize / tileAnimations.floor.pixelWidth;
        const wallScale = tileSize / tileAnimations.wall.pixelWidth;

        for (let row = 0; row < mapRows; row += 1) {
            for (let col = 0; col < mapCols; col += 1) {
                const tile = map[row][col];
                const x = col * tileSize;
                const y = row * tileSize;
                if (tile === 1) {
                    drawFrame(wallFrame, x, y, wallScale);
                } else {
                    drawFrame(floorFrame, x, y, floorScale);
                }
            }
        }
    }

    function drawAttackBox() {
        if (!ctx || !player.isAttacking) {
            return;
        }

        const attackBox = computeAttackHitbox();
        const slashSprite = effectSprites.slash;
        if (slashSprite) {
            const normalized = Math.max(
                0,
                Math.min(1, 1 - player.attackTimer / player.attackDuration)
            );
            const frameIndex = Math.min(
                slashSprite.frames.length - 1,
                Math.floor(normalized * (slashSprite.frames.length - 1))
            );
            drawSprite(slashSprite, frameIndex, attackBox.x, attackBox.y, attackBox.width, attackBox.height, {
                anchorX: 0.5,
                anchorY: 0.5
            });
        } else {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.fillRect(attackBox.x, attackBox.y, attackBox.width, attackBox.height);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.strokeRect(attackBox.x, attackBox.y, attackBox.width, attackBox.height);
        }
    }

    function drawPlayer() {
        if (!ctx) {
            return;
        }

        const sprite = player.sprite || heroSprite;
        const moving = player.isMoving;
        if (sprite) {
            const speedMultiplier = moving ? animationSpeed : animationSpeed / 3;
            const frameIndex = Math.floor((animationTimer * speedMultiplier) % animationFrameCount);
            const facingLeft = player.direction.x < 0 && Math.abs(player.direction.x) >= Math.abs(player.direction.y);
            drawSprite(sprite, frameIndex, player.x, player.y, player.width, player.height, {
                anchorX: 0.5,
                anchorY: 1,
                flipHorizontal: facingLeft
            });
        } else {
            ctx.fillStyle = "#ffcc00";
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.strokeRect(player.x, player.y, player.width, player.height);
        }
    }

    function drawEnemies() {
        if (!ctx) {
            return;
        }

        const frameIndex = Math.floor((animationTimer * animationSpeed) % animationFrameCount);
        enemies.forEach((enemy) => {
            const sprite = enemy.sprite || enemySpriteLibrary[enemy.spriteKey] || enemySpriteLibrary.brute;
            if (sprite) {
                const facingLeft = enemy.x + enemy.width / 2 > player.x + player.width / 2;
                drawSprite(sprite, frameIndex, enemy.x, enemy.y, enemy.width, enemy.height, {
                    anchorX: 0.5,
                    anchorY: 1,
                    flipHorizontal: facingLeft
                });
            } else {
                ctx.fillStyle = "#a83232";
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 2;
                ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }

            if (enemy.hp < enemy.maxHp) {
                const barWidth = enemy.width;
                const barHeight = 4;
                const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
                ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
                ctx.fillRect(enemy.x, enemy.y - barHeight - 2, barWidth, barHeight);
                ctx.fillStyle = "#ff5555";
                ctx.fillRect(enemy.x, enemy.y - barHeight - 2, barWidth * ratio, barHeight);
            }
        });
    }

    function drawItems() {
        if (!ctx) {
            return;
        }

        const frameIndex = Math.floor((animationTimer * animationSpeed) % animationFrameCount);
        itemsOnMap.forEach((item) => {
            const sprite = item.sprite || resolveItemSprite(item);
            if (sprite) {
                drawSprite(sprite, frameIndex, item.x, item.y, item.width, item.height, {
                    anchorX: 0,
                    anchorY: 0
                });
            } else {
                ctx.fillStyle = item.color;
                ctx.fillRect(item.x, item.y, item.width, item.height);
                ctx.strokeStyle = "#1a1a1a";
                ctx.strokeRect(item.x, item.y, item.width, item.height);
            }
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

        const glossWidth = Math.max(12, barWidth * 0.15);
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(x, y, glossWidth, barHeight);
        ctx.fillRect(x, xpBarY, glossWidth, barHeight);

        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(x, xpBarY, barWidth, barHeight);

        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        const textStartY = xpBarY + barHeight + 14;
        ctx.fillText(`HP: ${Math.ceil(player.hp)} / ${player.maxHp}`, x, textStartY);
        ctx.fillText(`Lvl ${player.level}  EXP: ${player.exp} / ${player.expToNextLevel}`, x, textStartY + 14);
        ctx.fillText("[I] Inventory  [H] Use Potion", x, textStartY + 28);

        const heroIconSprite = player.sprite || heroSprite;
        if (heroIconSprite) {
            const iconFrame = Math.floor((animationTimer * (animationSpeed / 3)) % animationFrameCount);
            const iconSize = 32;
            drawSprite(heroIconSprite, iconFrame, x - iconSize - 12, y + barHeight, iconSize, iconSize, {
                anchorX: 0,
                anchorY: 1
            });
        }

        const potionSprite = itemSpriteLibrary.potion;
        if (potionSprite) {
            const potionFrame = Math.floor((animationTimer * animationSpeed) % animationFrameCount);
            const iconSize = 20;
            const iconX = x + ctx.measureText("[I] Inventory  ").width + 12;
            const iconY = textStartY + 26;
            drawSprite(potionSprite, potionFrame, iconX, iconY, iconSize, iconSize, {
                anchorX: 0,
                anchorY: 0.5
            });
        }
    }

    function determineTrackedQuest() {
        if (trackedQuestId) {
            const quest = quests[trackedQuestId];
            if (quest && (!quest.isCompleted || quest.readyToTurnIn)) {
                return quest;
            }
        }

        const questList = Object.values(quests);
        const readyQuest = questList.find((quest) => quest.readyToTurnIn && !quest.isCompleted);
        if (readyQuest) {
            trackedQuestId = readyQuest.id;
            return readyQuest;
        }

        const activeQuest = questList.find((quest) => quest.isActive);
        if (activeQuest) {
            trackedQuestId = activeQuest.id;
            return activeQuest;
        }

        return null;
    }

    function drawQuestTracker() {
        if (!ctx || !canvas) {
            return;
        }

        const quest = determineTrackedQuest();
        if (!quest) {
            return;
        }

        const panelWidth = 260;
        const panelHeight = 90;
        const panelX = 20;
        const panelY = 120;

        ctx.fillStyle = "rgba(15, 15, 15, 0.75)";
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        ctx.fillStyle = "#ffffff";
        ctx.font = "14px sans-serif";
        ctx.fillText("Quest", panelX + 12, panelY + 20);

        ctx.font = "12px sans-serif";
        drawWrappedText(quest.description, panelX + 12, panelY + 38, panelWidth - 24, 16);

        const progressText = quest.readyToTurnIn
            ? "Return to the quest giver"
            : `${quest.currentCount}/${quest.targetCount} completed`;
        ctx.fillText(progressText, panelX + 12, panelY + panelHeight - 14);
    }

    function drawDialogueWindow() {
        if (!ctx || !canvas || !dialogueState.active || dialogueState.lines.length === 0) {
            return;
        }

        const windowWidth = canvas.width - 80;
        const windowHeight = 140;
        const windowX = 40;
        const windowY = canvas.height - windowHeight - 30;

        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px sans-serif";
        const npcName = dialogueState.npc ? dialogueState.npc.name : "";
        if (npcName) {
            ctx.fillText(npcName, windowX + 16, windowY + 28);
        }

        const textY = windowY + 54;
        ctx.font = "14px sans-serif";
        const currentLine = dialogueState.lines[Math.min(dialogueState.index, dialogueState.lines.length - 1)];
        drawWrappedText(currentLine, windowX + 16, textY, windowWidth - 32, 18);

        ctx.font = "12px sans-serif";
        ctx.fillText("Press E to continue", windowX + windowWidth - 150, windowY + windowHeight - 12);
    }

    function drawWrappedText(text, startX, startY, maxWidth, lineHeight) {
        if (!ctx) {
            return;
        }

        const words = (text || "").split(" ");
        let line = "";
        let y = startY;

        for (let i = 0; i < words.length; i += 1) {
            const testLine = line.length > 0 ? `${line} ${words[i]}` : words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line.length > 0) {
                ctx.fillText(line, startX, y);
                line = words[i];
                y += lineHeight;
            } else {
                line = testLine;
            }
        }

        if (line.length > 0) {
            ctx.fillText(line, startX, y);
        }
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

            ctx.fillStyle = "rgba(26, 26, 26, 0.85)";
            ctx.fillRect(slotX, slotY, slotSize, slotSize);
            ctx.strokeStyle = "#000000";
            ctx.strokeRect(slotX, slotY, slotSize, slotSize);

            const sprite = resolveItemSprite(item);
            if (sprite) {
                const frameIndex = Math.floor((animationTimer * animationSpeed) % animationFrameCount);
                drawSprite(sprite, frameIndex, slotX, slotY, slotSize, slotSize, {
                    anchorX: 0.5,
                    anchorY: 0.5
                });
            } else {
                ctx.fillStyle = item.color || "#cccccc";
                ctx.fillRect(slotX + 6, slotY + 6, slotSize - 12, slotSize - 12);
            }

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

    function drawNpcs() {
        if (!ctx) {
            return;
        }

        const frameIndex = Math.floor((animationTimer * (animationSpeed / 2)) % animationFrameCount);
        npcs.forEach((npc) => {
            const sprite = npc.sprite || npcSpriteLibrary[npc.spriteKey];
            if (sprite) {
                drawSprite(sprite, frameIndex, npc.x, npc.y, npc.width, npc.height, {
                    anchorX: 0.5,
                    anchorY: 1
                });
            } else {
                ctx.fillStyle = npc.color || "#888888";
                ctx.fillRect(npc.x, npc.y, npc.width, npc.height);
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 2;
                ctx.strokeRect(npc.x, npc.y, npc.width, npc.height);
            }
        });
    }

    function draw() {
        if (!ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMap();
        drawItems();
        drawNpcs();
        drawEnemies();
        drawPlayer();
        drawAttackBox();
        drawHud();
        drawQuestTracker();
        drawInteractionPrompt();
        drawDialogueWindow();
        drawInventoryPanel();
        drawSaveNotification();
    }

    function update(delta) {
        animationTimer += delta;
        if (animationTimer > 1000) {
            animationTimer = animationTimer % 1000;
        }
        movePlayer(delta);
        updateAttack(delta);
        updateEnemies(delta);
        processInteractions();
        updateSaveNotification(delta);
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
        const overlap = findOverlappingItem();
        if (!overlap) {
            return false;
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
            equipped: false,
            spriteKey: resolveItemSpriteKey(item)
        };
        itemsOnMap.splice(index, 1);
        inventory.push(inventoryItem);
        updateQuestProgress("itemPickup", { itemId: inventoryItem.id });
        return true;
    }

    function findNearbyNpc() {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        for (let i = 0; i < npcs.length; i += 1) {
            const npc = npcs[i];
            const npcCenterX = npc.x + npc.width / 2;
            const npcCenterY = npc.y + npc.height / 2;
            const distance = Math.hypot(playerCenterX - npcCenterX, playerCenterY - npcCenterY);

            if (distance <= 48) {
                return npc;
            }
        }

        return null;
    }

    function processInteractions() {
        if (!interactRequested) {
            return;
        }

        if (dialogueState.active) {
            advanceDialogue();
            interactRequested = false;
            return;
        }

        const nearbyNpc = findNearbyNpc();
        if (nearbyNpc) {
            startDialogueWithNpc(nearbyNpc);
            interactRequested = false;
            return;
        }

        handleItemPickup();
        interactRequested = false;
    }

    function startDialogueWithNpc(npc) {
        dialogueState.active = false;
        dialogueState.questToActivate = null;
        dialogueState.questToComplete = null;
        inventoryOpen = false;

        const lines = buildNpcDialogue(npc);
        if (!lines || lines.length === 0) {
            return;
        }

        dialogueState.active = true;
        dialogueState.npc = npc;
        dialogueState.lines = lines;
        dialogueState.index = 0;
    }

    function buildNpcDialogue(npc) {
        const prerequisiteId = npc.prerequisiteQuestId;
        if (prerequisiteId) {
            const prerequisite = quests[prerequisiteId];
            if (prerequisite && !prerequisite.isCompleted) {
                return npc.dialogues.prerequisite || npc.dialogues.default || [];
            }
        }

        const questId = npc.questToGive;
        if (!questId) {
            return npc.dialogues.default || [];
        }

        const quest = quests[questId];
        if (!quest) {
            return npc.dialogues.default || [];
        }

        if (quest.isCompleted) {
            return npc.dialogues.questCompleted || npc.dialogues.default || [];
        }

        if (quest.readyToTurnIn) {
            dialogueState.questToComplete = questId;
            return npc.dialogues.questTurnIn || npc.dialogues.questCompleted || npc.dialogues.default || [];
        }

        if (quest.isActive) {
            return npc.dialogues.questInProgress || npc.dialogues.default || [];
        }

        dialogueState.questToActivate = questId;
        return npc.dialogues.offerQuest || npc.dialogues.default || [];
    }

    function advanceDialogue() {
        if (!dialogueState.active) {
            return;
        }

        dialogueState.index += 1;
        if (dialogueState.index >= dialogueState.lines.length) {
            concludeDialogue();
        }
    }

    function concludeDialogue() {
        if (!dialogueState.active) {
            return;
        }

        const questToActivate = dialogueState.questToActivate;
        const questToComplete = dialogueState.questToComplete;

        dialogueState.active = false;
        dialogueState.npc = null;
        dialogueState.lines = [];
        dialogueState.index = 0;
        dialogueState.questToActivate = null;
        dialogueState.questToComplete = null;

        if (questToActivate) {
            activateQuest(questToActivate);
        }

        if (questToComplete) {
            completeQuest(questToComplete);
        }
    }

    function activateQuest(questId) {
        const quest = quests[questId];
        if (!quest || quest.isActive || quest.isCompleted) {
            return;
        }

        quest.isActive = true;
        quest.currentCount = 0;
        quest.readyToTurnIn = false;
        trackedQuestId = questId;
    }

    function completeQuest(questId) {
        const quest = quests[questId];
        if (!quest || quest.isCompleted) {
            return;
        }

        quest.isCompleted = true;
        quest.isActive = false;
        quest.readyToTurnIn = false;

        if (quest.itemId) {
            const itemIndex = inventory.findIndex((inventoryItem) => inventoryItem.id === quest.itemId);
            if (itemIndex !== -1) {
                inventory.splice(itemIndex, 1);
            }
        }

        if (quest.rewardExp) {
            grantExperience(quest.rewardExp);
        }

        if (trackedQuestId === questId) {
            trackedQuestId = null;
        }
    }

    function updateQuestProgress(type, details = {}) {
        Object.values(quests).forEach((quest) => {
            if (!quest || quest.isCompleted || !quest.isActive) {
                return;
            }

            if (quest.targetType !== type) {
                return;
            }

            if (type === "itemPickup" && quest.itemId && quest.itemId !== details.itemId) {
                return;
            }

            const amount = details.amount || 1;
            quest.currentCount = Math.min(quest.targetCount, quest.currentCount + amount);

            if (quest.currentCount >= quest.targetCount) {
                if (quest.requiresTurnIn) {
                    quest.readyToTurnIn = true;
                    trackedQuestId = quest.id;
                } else {
                    completeQuest(quest.id);
                }
            }
        });
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
            return;
        }

        if (item.type === "quest") {
            return;
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

    function serializeInventory() {
        return inventory.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            description: item.description,
            color: item.color,
            healAmount: item.healAmount,
            bonuses: item.bonuses,
            equipped: Boolean(item.equipped),
            spriteKey: item.spriteKey
        }));
    }

    function serializeItemsOnMap() {
        return itemsOnMap.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            description: item.description,
            color: item.color,
            healAmount: item.healAmount,
            bonuses: item.bonuses,
            spriteKey: item.spriteKey,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height
        }));
    }

    function serializeEnemies() {
        return enemies.map((enemy) => ({
            x: enemy.x,
            y: enemy.y,
            width: enemy.width,
            height: enemy.height,
            speed: enemy.speed,
            hp: enemy.hp,
            contactDamage: enemy.contactDamage,
            damageInterval: enemy.damageInterval,
            damageTimer: enemy.damageTimer,
            expValue: enemy.expValue,
            spriteKey: enemy.spriteKey,
            type: enemy.type
        }));
    }

    function serializeQuests() {
        const questState = {};
        Object.keys(quests).forEach((questId) => {
            const quest = quests[questId];
            questState[questId] = {
                currentCount: quest.currentCount,
                isCompleted: quest.isCompleted,
                isActive: quest.isActive,
                readyToTurnIn: quest.readyToTurnIn
            };
        });
        return questState;
    }

    function buildPlayerSaveState() {
        return {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height,
            speed: player.speed,
            baseMaxHp: player.baseMaxHp,
            maxHp: player.maxHp,
            hp: player.hp,
            baseDamage: player.baseDamage,
            attackDamage: player.attackDamage,
            exp: player.exp,
            level: player.level,
            expToNextLevel: player.expToNextLevel,
            direction: { x: player.direction.x, y: player.direction.y },
            spriteKey: player.spriteKey
        };
    }

    function showSaveNotification(message, isError = false) {
        saveNotification.message = message;
        saveNotification.timer = 2.5;
        saveNotification.error = isError;
    }

    function saveGame() {
        if (!window.localStorage) {
            showSaveNotification("Saving not supported", true);
            return;
        }

        const saveData = {
            player: buildPlayerSaveState(),
            inventory: serializeInventory(),
            itemsOnMap: serializeItemsOnMap(),
            enemies: serializeEnemies(),
            quests: serializeQuests(),
            trackedQuestId
        };

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
            // sendSaveToServer(saveData); // Example: sync with optional Flask backend.
            showSaveNotification("Game saved", false);
        } catch (error) {
            console.error("Failed to save game", error);
            showSaveNotification("Save failed", true);
        }
    }

    async function sendSaveToServer(saveData, playerId = "demo-player") {
        try {
            await fetch("http://localhost:5000/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    player_id: playerId,
                    data: saveData
                })
            });
        } catch (error) {
            console.warn("Failed to sync save with server", error);
        }
    }

    function loadGame() {
        if (!window.localStorage) {
            return false;
        }

        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return false;
        }

        try {
            const data = JSON.parse(raw);
            if (!data.player) {
                return false;
            }

            player.x = data.player.x ?? player.x;
            player.y = data.player.y ?? player.y;
            player.width = data.player.width ?? player.width;
            player.height = data.player.height ?? player.height;
            player.speed = data.player.speed ?? player.speed;
            player.baseMaxHp = data.player.baseMaxHp ?? player.baseMaxHp;
            player.baseDamage = data.player.baseDamage ?? player.baseDamage;
            player.level = data.player.level ?? player.level;
            player.exp = data.player.exp ?? player.exp;
            player.expToNextLevel = data.player.expToNextLevel ?? player.expToNextLevel;
            player.direction.x = data.player.direction?.x ?? player.direction.x;
            player.direction.y = data.player.direction?.y ?? player.direction.y;
            if (data.player.spriteKey) {
                player.spriteKey = data.player.spriteKey;
            }
            player.sprite = pixelArtLibrary.sprites.player[player.spriteKey] || heroSprite;

            const savedInventory = Array.isArray(data.inventory) ? data.inventory : [];
            inventory.length = 0;
            savedInventory.forEach((item) => {
                inventory.push({
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    description: item.description,
                    color: item.color,
                    healAmount: item.healAmount,
                    bonuses: item.bonuses,
                    equipped: Boolean(item.equipped),
                    spriteKey: resolveItemSpriteKey(item)
                });
            });

            if (Array.isArray(data.itemsOnMap)) {
                itemsOnMap.length = 0;
                data.itemsOnMap.forEach((item) => {
                    const spriteKey = resolveItemSpriteKey(item);
                    const sprite = resolveItemSprite({ ...item, spriteKey });
                    const displaySize = sprite ? sprite.pixelWidth * sprite.scale : item.width || 18;
                    itemsOnMap.push({
                        id: item.id,
                        name: item.name,
                        type: item.type,
                        description: item.description,
                        color: item.color,
                        healAmount: item.healAmount,
                        bonuses: item.bonuses,
                        spriteKey,
                        sprite,
                        x: item.x,
                        y: item.y,
                        width: displaySize,
                        height: displaySize
                    });
                });
            }

            const savedEnemies = Array.isArray(data.enemies) ? data.enemies : [];
            enemies.length = 0;
            savedEnemies.forEach((enemy) => {
                const spriteKey = enemy.spriteKey || enemy.type || "brute";
                const archetype = enemyArchetypes[spriteKey] || enemyArchetypes[enemy.type];
                const sprite = enemySpriteLibrary[spriteKey] || archetype?.sprite || enemySpriteLibrary.brute;
                const width = typeof enemy.width === "number" ? enemy.width : sprite.pixelWidth * (sprite.scale || 1);
                const height = typeof enemy.height === "number" ? enemy.height : sprite.pixelHeight * (sprite.scale || 1);
                enemies.push({
                    x: enemy.x,
                    y: enemy.y,
                    width,
                    height,
                    speed: enemy.speed ?? archetype?.speed ?? 70,
                    hp: enemy.hp ?? archetype?.hp ?? 60,
                    maxHp: enemy.maxHp ?? archetype?.hp ?? enemy.hp,
                    contactDamage: enemy.contactDamage ?? archetype?.contactDamage ?? 6,
                    damageInterval: enemy.damageInterval ?? archetype?.damageInterval ?? 0.8,
                    damageTimer: enemy.damageTimer ?? 0,
                    expValue: enemy.expValue ?? archetype?.expValue ?? 50,
                    spriteKey,
                    sprite,
                    type: enemy.type || archetype?.type || spriteKey
                });
            });

            if (data.quests) {
                Object.keys(quests).forEach((questId) => {
                    const quest = quests[questId];
                    const savedQuest = data.quests[questId];
                    if (!savedQuest) {
                        return;
                    }
                    quest.currentCount = savedQuest.currentCount ?? quest.currentCount;
                    quest.isCompleted = Boolean(savedQuest.isCompleted);
                    quest.isActive = Boolean(savedQuest.isActive);
                    quest.readyToTurnIn = Boolean(savedQuest.readyToTurnIn);
                });
            }

            trackedQuestId = data.trackedQuestId ?? trackedQuestId;

            refreshPlayerStats();
            if (typeof data.player.maxHp === "number") {
                player.maxHp = data.player.maxHp;
            }
            if (typeof data.player.hp === "number") {
                player.hp = Math.min(player.maxHp, Math.max(0, data.player.hp));
            }
            if (typeof data.player.attackDamage === "number") {
                player.attackDamage = data.player.attackDamage;
            }

            player.attackCooldownTimer = 0;
            player.attackTimer = 0;
            player.attackHitSet = new Set();

            return true;
        } catch (error) {
            console.error("Failed to load save data", error);
            window.localStorage.removeItem(STORAGE_KEY);
            return false;
        }
    }

    function updateSaveNotification(delta) {
        if (saveNotification.timer > 0) {
            saveNotification.timer = Math.max(0, saveNotification.timer - delta);
        }
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
        if (!ctx || !canvas || dialogueState.active) {
            return;
        }

        let message = "";
        const nearbyNpc = findNearbyNpc();
        if (nearbyNpc) {
            message = `Press E to talk to ${nearbyNpc.name}`;
        } else {
            const overlap = findOverlappingItem();
            if (overlap) {
                message = `Press E to pick up ${overlap.item.name}`;
            }
        }

        if (!message) {
            return;
        }

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

    function drawSaveNotification() {
        if (!ctx || !canvas || saveNotification.timer <= 0 || !saveNotification.message) {
            return;
        }

        const message = saveNotification.message;
        ctx.font = "14px sans-serif";
        const textWidth = ctx.measureText(message).width;
        const padding = 12;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = 34;
        const boxX = canvas.width - boxWidth - 24;
        const boxY = 24;

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        ctx.strokeStyle = saveNotification.error ? "#ff6b6b" : "#5ad45a";
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(message, boxX + padding, boxY + boxHeight - 12);
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
        const saveButton = document.getElementById("saveButton");
        if (saveButton) {
            saveButton.addEventListener("click", () => saveGame());
        }

        const loaded = loadGame();
        if (!loaded) {
            spawnEnemies();
        } else if (enemies.length === 0) {
            spawnEnemies();
        }
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        canvas.addEventListener("click", handleCanvasClick);
        refreshPlayerStats();
        window.requestAnimationFrame(gameLoop);
    };
})();
