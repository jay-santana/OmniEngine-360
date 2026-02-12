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

  loadHotspots(sceneData, onClick) {
    this.clear();
    if (!sceneData.hotspots) return;

    sceneData.hotspots.forEach((h) => {
      // Converte a posição corretamente
      const positionData = this.parsePosition(h.position);

      // 1. Cria o container (ponto zero)
      const el = document.createElement("div");

      // Adiciona classes. Se não tiver labelPosition, usa 'top' como fallback
      // Importante: Adiciona as classes EXATAS que o CSS espera
      const posClass = h.labelPosition || "top";
      el.className = `hotspot ${posClass}`;

      // 2. Cria o Botão (Círculo)
      const btn = document.createElement("div");
      btn.className = "hotspot-button";
      // Usa o ícone do JSON ou um padrão
      const iconName = h.icon || "question-circle";
      btn.innerHTML = `<i class="fas fa-${iconName}"></i>`;
      el.appendChild(btn);

      // 3. Cria o Rótulo (Label), se houver texto
      // Verifica 'labelText' (padrão antigo) OU 'label' (novo padrão)
      const textContent = h.labelText || h.label;

      if (textContent) {
        const label = document.createElement("div");
        label.className = "hotspot-label";
        label.innerHTML = textContent; // innerHTML permite tags como <b>
        el.appendChild(label);
      }

      // Evento de Clique
      el.onclick = (e) => {
        e.stopPropagation();
        onClick(h);
      };

      this.container.appendChild(el);

      // Adiciona ao ThreeView usando os dados convertidos
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
