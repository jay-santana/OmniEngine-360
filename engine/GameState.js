class GameState {
  constructor(config) {
    this.config = config;
    this.score = 0;
    this.visitedHotspots = new Set();
    this.eventsTriggered = new Set();
    this.currentSceneId = null;
    this.totalHotspotsInScene = 0;
    this.sceneStartTime = 0;
    this.quizMistakes = 0;
    // NOVO: Rastrear módulos concluídos
    this.completedModules = new Set();
  }

  completeModule(sceneId) {
    this.completedModules.add(sceneId);
    
    // Conta quantos módulos NÃO-HUB existem no jogo (cenas tipo "360")
    const totalModules = this.config.scenes.filter(s => s.type === "360").length;
    
    return this.completedModules.size === totalModules;
  }

  // --- RESET COMPLETO COM PONTUAÇÃO ---
  resetScene(sceneId, deductQuizPoints = false) {
    // 1. Remove evento do vilão
    this.eventsTriggered.delete(sceneId);
    this.completedModules.delete(sceneId);

    // 2. Limpa hotspots visitados e SUBTRAI os pontos deles
    const sceneConfig = this.config.scenes.find((s) => s.id === sceneId);
    if (sceneConfig && sceneConfig.hotspots) {
      sceneConfig.hotspots.forEach((hotspot) => {
        if (this.visitedHotspots.has(hotspot.id)) {
          this.visitedHotspots.delete(hotspot.id);

          // Subtrai os 10 pontos de cada hotspot visitado
          if (hotspot.action !== "quiz") {
            this.score = Math.max(
              0,
              this.score - this.config.gameplay.points_per_hotspot,
            );
          }
        }
      });
    }

    // 3. Subtrai os pontos do Quiz (se a missão foi concluída)
    if (deductQuizPoints) {
      this.score = Math.max(
        0,
        this.score - this.config.gameplay.points_quiz_correct,
      );
    }

    // 4. Reseta cronômetro e erros
    this.quizMistakes = 0;
    if (this.currentSceneId === sceneId) {
      this.sceneStartTime = Date.now();
    }

    // 5. Atualiza a tela imediatamente (Zera o placar visual)
    this.notifyTracker();
  }

  reset() {
    this.score = 0;
    this.visitedHotspots.clear();
    this.eventsTriggered.clear();
    this.currentSceneId = null;
    this.totalHotspotsInScene = 0;
    this.sceneStartTime = 0;
    this.quizMistakes = 0;
    this.completedModules.clear(); // NOVO - Limpa módulos concluídos
    this.notifyTracker();
  }

  enterScene(sceneId, totalHotspots) {
    this.currentSceneId = sceneId;
    this.totalHotspotsInScene = totalHotspots;
    this.sceneStartTime = Date.now();
    this.quizMistakes = 0;
    this.notifyTracker();
  }

  registerVisit(hotspotId) {
    if (!this.visitedHotspots.has(hotspotId)) {
      this.visitedHotspots.add(hotspotId);
      this.score += this.config.gameplay.points_per_hotspot;

      const hotspotElement = document.querySelector(`[data-hotspot-id="${hotspotId}"]`);
        if (hotspotElement) {
          hotspotElement.classList.add('visited');
        }
      this.notifyTracker();
      return true;
    }
    return false;
  }

  addScore(points) {
    this.score += points;
    this.notifyTracker(); // Garante atualização visual
  }

  // Função auxiliar para atualizar a UI
  notifyTracker() {
    window.dispatchEvent(
      new CustomEvent("updatetracker", {
        detail: { score: this.score, progress: this.getSceneProgress() },
      }),
    );
  }

  getProgressPercent(hotspotsList) {
    const required = hotspotsList.filter((h) => h.action !== "quiz");
    if (required.length === 0) return 100;

    const visitedCount = required.filter((h) =>
      this.visitedHotspots.has(h.id),
    ).length;

    return Math.floor((visitedCount / required.length) * 100);
  }

  getSceneProgress() {
    if (!this.currentSceneId) return 0;
    const scene = this.config.scenes.find((s) => s.id === this.currentSceneId);
    if (scene) return this.getProgressPercent(scene.hotspots);
    return 0;
  }

  isSceneFullyExplored(sceneId) {
    const scene = this.config.scenes.find((s) => s.id === sceneId);
    if (!scene) return false;
    const dialogHotspots = scene.hotspots.filter((h) => h.action !== "quiz");
    const visitedCount = dialogHotspots.filter((h) =>
      this.visitedHotspots.has(h.id),
    ).length;
    return visitedCount === dialogHotspots.length;
  }

  getElapsedTime() {
    if (!this.sceneStartTime) return "0s";
    const delta = Date.now() - this.sceneStartTime;
    const minutes = Math.floor(delta / 60000);
    const seconds = ((delta % 60000) / 1000).toFixed(0);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }
}
