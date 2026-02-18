class HotspotController {
  constructor(containerId, threeView) {
    this.container = document.getElementById(containerId);
    this.threeView = threeView;
    this.hotspots = [];
  }

  // Função auxiliar para converter "20,30" em {yaw: 20, pitch: 30}
  parsePosition(posInput) {
    if (typeof posInput === "string") {
      const parts = posInput.split(",").map(Number);
      return { yaw: parts[0] || 0, pitch: parts[1] || 0 };
    }
    return posInput; // Já é objeto
  }

  loadHotspots(sceneData, onClick, gameState) {
    this.clear();
    if (!sceneData.hotspots) return;

    sceneData.hotspots.forEach((h) => {
      const positionData = this.parsePosition(h.position);
      const el = document.createElement("div");
      const posClass = h.labelPosition || "top";
      el.className = `hotspot ${posClass}`;

      el.setAttribute('data-hotspot-id', h.id);

      if (h.action !== "quiz" && gameState?.visitedHotspots?.has(h.id)) {
        el.classList.add('visited');
      }

      if (h.action === "quiz" && gameState?.completedModules?.has(sceneData.id)) {
        el.classList.add('quiz-completed');
      }

      const btn = document.createElement("div");
      btn.className = "hotspot-button";
      const iconName = h.icon || "question-circle";
      btn.innerHTML = `<i class="fas fa-${iconName}"></i>`;
      el.appendChild(btn);

      if (h.label) {
        const label = document.createElement("div");
        label.className = "hotspot-label";
        label.innerHTML = h.label;
        el.appendChild(label);
      }

      // Evento de Clique
      el.onclick = (e) => {
        e.stopPropagation();
        onClick(h);
      };

      this.container.appendChild(el);
      this.threeView.addHotspotToTracking(el, positionData);
      this.hotspots.push(el);
    });
  }

  clear() {
    this.container.innerHTML = "";
    this.threeView.clearHotspots();
    this.hotspots = [];
  }
}
