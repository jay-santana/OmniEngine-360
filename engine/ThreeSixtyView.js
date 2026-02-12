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

    this.initInput();
    this.animate();
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
}
