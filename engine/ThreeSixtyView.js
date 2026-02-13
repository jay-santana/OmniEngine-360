class ThreeSixtyView {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      95,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.sphere = null;
    this.isUserInteracting = false;
    this.onMouseDownMouseX = 0;
    this.onMouseDownMouseY = 0;
    this.lon = 0;
    this.onMouseDownLon = 0;
    this.lat = 0;
    this.onMouseDownLat = 0;
    this.phi = 0;
    this.theta = 0;

    this.hotspots = []; // Array para guardar { element, vector } igual ao original

    // Referências para elementos de efeito
    this.redAlertDiv = null;
    this.glitchDiv = null; // <-- USAR GLITCH EM VEZ DE STATIC
    this.smokeDiv = null;

    // Carrega a imagem do glitch do theme assets
    this.glitchImage = null; // Será setado depois pelo GameEngine

    this.initInput();
    this.animate();
    window.addEventListener("resize", () => this.onWindowResize());
  }

  setInitialView(viewInput) {
    let yaw = 0;
    let pitch = 0;

    // 1. Verifica se é String ("90,1")
    if (typeof viewInput === "string") {
      const parts = viewInput.split(",").map(Number);
      yaw = parts[0] || 0;
      pitch = parts[1] || 0;
    }
    // 2. Verifica se é Objeto ({yaw: 90, pitch: 1})
    else if (viewInput && typeof viewInput === "object") {
      yaw = viewInput.yaw || 0;
      pitch = viewInput.pitch || 0;
    }

    // 3. Aplica na Câmera
    this.lon = yaw;
    this.lat = pitch;

    // Força a atualização imediata da câmera para não ter "pulo" visual
    this.updateCamera();
  }

  loadScene(imageUrl) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imageUrl, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      if (this.sphere) this.scene.remove(this.sphere);
      const geometry = new THREE.SphereGeometry(500, 60, 40);
      geometry.scale(-1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      this.sphere = new THREE.Mesh(geometry, material);
      this.scene.add(this.sphere);
    });
  }

  // LÓGICA ORIGINAL RESTAURADA
  addHotspotToTracking(element, positionData) {
    // Converte graus para radianos
    const yawRad = THREE.MathUtils.degToRad(positionData.yaw);
    const pitchRad = THREE.MathUtils.degToRad(positionData.pitch);
    const radius = 400; // Raio fixo igual ao original

    // Calcula posição XYZ esférica
    const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
    const y = radius * Math.sin(pitchRad);
    const z = -radius * Math.cos(pitchRad) * Math.cos(yawRad);

    const positionVector = new THREE.Vector3(x, y, z);

    this.hotspots.push({
      element: element,
      vector: positionVector,
    });
  }

  clearHotspots() {
    this.hotspots = [];
  }

  updateHotspots() {
    // Usa a lógica de projeção original
    this.hotspots.forEach((h) => {
      const position = h.vector.clone();
      position.project(this.camera);

      const cameraDir = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDir);
      const hotspotDir = h.vector.clone().normalize();

      // Verifica se está na frente da câmera (Dot Product)
      // Valor > 0.2 garante que não apareça distorcido nas bordas
      const isVisible = cameraDir.dot(hotspotDir) > 0.2;

      if (isVisible) {
        const x = (position.x * 0.5 + 0.5) * this.canvas.clientWidth;
        const y = (-(position.y * 0.5) + 0.5) * this.canvas.clientHeight;

        h.element.style.display = "block";
        h.element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      } else {
        h.element.style.display = "none";
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.updateCamera();
    this.updateHotspots();
    this.renderer.render(this.scene, this.camera);
  }

  updateCamera() {
    this.lat = Math.max(-85, Math.min(85, this.lat));
    this.phi = THREE.MathUtils.degToRad(90 - this.lat);
    this.theta = THREE.MathUtils.degToRad(this.lon);

    this.camera.target = new THREE.Vector3();
    this.camera.target.x = 500 * Math.sin(this.phi) * Math.cos(this.theta);
    this.camera.target.y = 500 * Math.cos(this.phi);
    this.camera.target.z = 500 * Math.sin(this.phi) * Math.sin(this.theta);
    this.camera.lookAt(this.camera.target);
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;

    // Atualiza a proporção da câmera
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    // Atualiza o tamanho do renderizador
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    //Recalcula tamanho dos hotspots se necessário
    this.updateHotspots();
  }

  initInput() {
    document.addEventListener("mousedown", (e) => {
      this.isUserInteracting = true;
      this.onMouseDownMouseX = e.clientX;
      this.onMouseDownMouseY = e.clientY;
      this.onMouseDownLon = this.lon;
      this.onMouseDownLat = this.lat;
    });
    document.addEventListener("mousemove", (e) => {
      if (this.isUserInteracting) {
        this.lon =
          (this.onMouseDownMouseX - e.clientX) * 0.1 + this.onMouseDownLon;
        this.lat =
          (e.clientY - this.onMouseDownMouseY) * 0.1 + this.onMouseDownLat;
      }
    });
    document.addEventListener(
      "mouseup",
      () => (this.isUserInteracting = false),
    );

    // Touch events (para celular, igual ao original)
    document.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isUserInteracting = true;
        this.onMouseDownMouseX = e.touches[0].clientX;
        this.onMouseDownMouseY = e.touches[0].clientY;
        this.onMouseDownLon = this.lon;
        this.onMouseDownLat = this.lat;
      }
    });
    document.addEventListener("touchmove", (e) => {
      if (this.isUserInteracting && e.touches.length === 1) {
        this.lon =
          (this.onMouseDownMouseX - e.touches[0].clientX) * 0.2 +
          this.onMouseDownLon;
        this.lat =
          (e.touches[0].clientY - this.onMouseDownMouseY) * 0.2 +
          this.onMouseDownLat;
      }
    });
    document.addEventListener(
      "touchend",
      () => (this.isUserInteracting = false),
    );
  }

  // Receber a imagem do glitch do config
  setGlitchImage(src) {
    this.glitchImage = src;
  }

  // ========== EFEITOS VISUAIS COM GLITCH ==========

  startRedAlert() {
    // 1. PRIMEIRO: Remove se já existir
    this.stopRedAlert();

    // 2. DEPOIS: Cria novo
    this.redAlertDiv = document.createElement("div");
    this.redAlertDiv.id = "red-alert-overlay"; // Adiciona ID para CSS
    this.redAlertDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 0, 0, 0.2);
      pointer-events: none;
      z-index: 14;
      animation: pulseRed 0.5s infinite alternate;
    `;
    document.body.appendChild(this.redAlertDiv);

    if (!document.querySelector("#red-alert-style")) {
      const style = document.createElement("style");
      style.id = "red-alert-style";
      style.textContent = `
        @keyframes pulseRed {
          from { background-color: rgba(255, 0, 0, 0.1); }
          to { background-color: rgba(255, 0, 0, 0.4); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  stopRedAlert() {
    if (this.redAlertDiv) {
      this.redAlertDiv.remove();
      this.redAlertDiv = null;
    }
  }

  // EFEITO GLITCH USANDO O ASSET DO CONFIG
  showGlitchEffect() {
    // Remove glitch existente
    this.hideGlitchEffect();

    // Container principal
    this.glitchDiv = document.createElement("div");
    this.glitchDiv.id = "glitch-effect-overlay";
    this.glitchDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 16;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1);
    `;

    // Cores reduzidas: preto, branco, ciano, verde, vermelho
    const colors = [
      { bg: "rgba(0, 0, 0, 0.9)", shadow: "black" },
      { bg: "rgba(255, 255, 255, 0.95)", shadow: "cyan" },
      { bg: "rgba(0, 255, 255, 0.7)", shadow: "cyan" },
      { bg: "rgba(0, 255, 0, 0.7)", shadow: "lime" },
      { bg: "rgba(255, 0, 0, 0.8)", shadow: "red" },
    ];

    // Função para criar linhas - ESQUERDA, DIREITA e CENTRO
    const createLines = (count, positionType) => {
      for (let i = 0; i < count; i++) {
        const line = document.createElement("div");
        const color = colors[Math.floor(Math.random() * colors.length)];
        const height =
          Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 3) + 2;

        // LARGURA VARIÁVEL - NUNCA 100%
        let width, left, right;

        switch (positionType) {
          case "left":
            width = Math.floor(Math.random() * 60) + 20;
            left = "0";
            right = "auto";
            break;
          case "right":
            width = Math.floor(Math.random() * 60) + 20;
            right = "0";
            left = "auto";
            break;
          case "center":
            width = Math.floor(Math.random() * 70) + 20;
            left = Math.floor(Math.random() * (80 - width)) + 10 + "%";
            right = "auto";
            break;
        }

        line.style.cssText = `
          position: absolute;
          top: ${Math.floor(Math.random() * 100)}%;
          height: ${height}px;
          width: ${width}%;
          left: ${left || "auto"};
          right: ${right || "auto"};
          background-color: ${color.bg};
          box-shadow: 0 0 ${height * 3}px ${color.shadow};
          opacity: ${Math.random() * 0.5 + 0.3};
          animation: glitchOptimized ${Math.random() * 0.15 + 0.03}s infinite alternate;
        `;

        this.glitchDiv.appendChild(line);
      }
    };

    // Distribuição balanceada
    createLines(40, "left");
    createLines(40, "right");
    createLines(30, "center");

    // Append ANTES do fade in =====
    document.body.appendChild(this.glitchDiv);

    // Força reflow e aplica fade in
    setTimeout(() => {
      this.glitchDiv.style.opacity = "1";
    }, 10);

    // CSS simplificado com uma única animação
    if (!document.querySelector("#glitch-optimized-style")) {
      const style = document.createElement("style");
      style.id = "glitch-optimized-style";
      style.textContent = `
        @keyframes glitchOptimized {
          0% { opacity: 0.1; transform: translateX(0); }
          25% { opacity: 0.9; transform: translateX(-2px); }
          50% { opacity: 0.4; transform: translateX(2px); }
          75% { opacity: 0.8; transform: translateX(-1px); }
          100% { opacity: 0.2; transform: translateX(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  hideGlitchEffect() {
    if (this.glitchDiv) {
      // Fade out suave
      this.glitchDiv.style.transition = "opacity 0.6s ease";
      this.glitchDiv.style.opacity = "0";

      setTimeout(() => {
        if (this.glitchDiv) {
          this.glitchDiv.remove();
          this.glitchDiv = null;
        }
      }, 600);
      //
    }
  }

  // Mantém showStaticEffect como alias para compatibilidade
  showStaticEffect() {
    this.showGlitchEffect();
  }

  hideStaticEffect() {
    this.hideGlitchEffect();
  }

  // Efeito de luz serena (vitória)
  startVictoryGlow() {
    this.stopVictoryGlow();

    // Overlay de luz serena
    this.victoryGlowDiv = document.createElement("div");
    this.victoryGlowDiv.style.position = "fixed";
    this.victoryGlowDiv.style.top = "0";
    this.victoryGlowDiv.style.left = "0";
    this.victoryGlowDiv.style.width = "100%";
    this.victoryGlowDiv.style.height = "100%";
    this.victoryGlowDiv.style.background =
      "radial-gradient(circle at center, rgba(0, 255, 255, 0.3) 0%, rgba(0, 100, 255, 0.2) 50%, transparent 100%)";
    this.victoryGlowDiv.style.pointerEvents = "none";
    this.victoryGlowDiv.style.zIndex = "14";
    this.victoryGlowDiv.style.animation =
      "victoryPulse 2s infinite ease-in-out";
    this.victoryGlowDiv.style.mixBlendMode = "screen";
    document.body.appendChild(this.victoryGlowDiv);

    // Adiciona brilho sereno na imagem do vilão (derrotado)
    const villainSprite = document.getElementById("villain-sprite");
    if (villainSprite) {
      villainSprite.style.animation = "villainDefeated 3s infinite ease-in-out";
      villainSprite.style.filter =
        "drop-shadow(0 0 40px #00ffff) grayscale(50%)";
    }

    if (!document.querySelector("#victory-glow-style")) {
      const style = document.createElement("style");
      style.id = "victory-glow-style";
      style.textContent = `
        @keyframes victoryPulse {
          0% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
          100% { opacity: 0.2; transform: scale(1); }
        }
        
        @keyframes villainDefeated {
          0% { transform: translateY(0px) scale(0.95); opacity: 0.8; }
          50% { transform: translateY(-10px) scale(1); opacity: 1; }
          100% { transform: translateY(0px) scale(0.95); opacity: 0.8; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  stopVictoryGlow() {
    if (this.victoryGlowDiv) {
      this.victoryGlowDiv.remove();
      this.victoryGlowDiv = null;
    }

    // Restaura animação normal do vilão
    const villainSprite = document.getElementById("villain-sprite");
    if (villainSprite) {
      villainSprite.style.animation = "villainFloat 3s infinite ease-in-out";
      villainSprite.style.filter = "drop-shadow(0 0 30px #ff0000)";
      villainSprite.style.opacity = "1";
    }
  }
}
