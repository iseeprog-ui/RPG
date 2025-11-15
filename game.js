(function () {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;

    function clearLoadingText() {
        const loadingElement = document.getElementById("loading");
        if (loadingElement) {
            loadingElement.style.display = "none";
        }
    }

    function draw() {
        if (!ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("RPG DEMO", canvas.width / 2, canvas.height / 2);
    }

    function gameLoop() {
        draw();
        window.requestAnimationFrame(gameLoop);
    }

    window.onload = function () {
        if (!canvas || !ctx) {
            console.error("Unable to initialize canvas context.");
            return;
        }

        clearLoadingText();
        gameLoop();
    };
})();
