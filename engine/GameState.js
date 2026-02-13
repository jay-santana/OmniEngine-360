class GameState {
  constructor(config) {
    this.config = config;
    this.score = 0;
    this.visitedHotspots = new Set();
    this.eventsTriggered = new Set();
    this.currentSceneId = null;
    this.totalHotspotsInScene = 0;
    this.sceneStartTime = 0; // Marca quando entrou na cena
    this.quizMistakes = 0; // Conta erros no quiz atual
  }

  reset() {
    this.score = 0;
    this.visitedHotspots.clear();
    this.eventsTriggered.clear(); // <-- NOVO - Reset completo
  }

  enterScene(sceneId, totalHotspots) {
    this.currentSceneId = sceneId;
    this.totalHotspotsInScene = totalHotspots;
    this.sceneStartTime = Date.now();
    this.quizMistakes = 0;

    window.dispatchEvent(
      new CustomEvent("updatetracker", {
        detail: { score: this.score, progress: this.getSceneProgress() },
      }),
    );
  }

  registerVisit(hotspotId) {
    if (!this.visitedHotspots.has(hotspotId)) {
      this.visitedHotspots.add(hotspotId);
      this.addScore(this.config.gameplay.points_per_hotspot);

      window.dispatchEvent(
        new CustomEvent("updatetracker", {
          detail: { score: this.score, progress: this.getSceneProgress() },
        }),
      );

      return true; // Primeira visita
    }
    return false;
  }

  addScore(points) {
    this.score += points;
  }

  getSceneProgress() {
    if (this.totalHotspotsInScene === 0) return 100;
    return 0;
  }

  canUnlockQuiz(hotspotsList) {
    if (!this.config.gameplay.require_exploration_to_quiz) return true;

    // Verifica se todos os hotspots (exceto o próprio quiz) foram visitados
    const required = hotspotsList.filter((h) => h.action !== "quiz");
    const visitedCount = required.filter((h) =>
      this.visitedHotspots.has(h.id),
    ).length;

    return visitedCount === required.length;
  }

  getProgressPercent(hotspotsList) {
    const required = hotspotsList.filter((h) => h.action !== "quiz");
    if (required.length === 0) return 100;
    const visitedCount = required.filter((h) =>
      this.visitedHotspots.has(h.id),
    ).length;
    return Math.floor((visitedCount / required.length) * 100);
  }

  // Método para resetar UMA cena específica
  resetScene(sceneId) {
    // Remove apenas os hotspots visitados DESTA cena
    const scene = this.config.scenes.find((s) => s.id === sceneId);
    if (scene) {
      scene.hotspots.forEach((h) => {
        this.visitedHotspots.delete(h.id);
      });
    }
    // Remove o evento disparado desta cena
    this.eventsTriggered.delete(sceneId);
  }

  isSceneFullyExplored(sceneId) {
    const scene = this.config.scenes.find((s) => s.id === sceneId);
    if (!scene) return false;

    // Pega APENAS os hotspots de diálogo (ignora o quiz)
    const dialogHotspots = scene.hotspots.filter((h) => h.action === "dialog");

    // Se não tem nenhum hotspot de diálogo, já está explorado
    if (dialogHotspots.length === 0) return true;

    // Conta quantos já foram visitados
    const visitedCount = dialogHotspots.filter((h) =>
      this.visitedHotspots.has(h.id),
    ).length;
    // Retorna TRUE se TODOS foram visitados
    return visitedCount === dialogHotspots.length;
  }

  // Método para contar quantos diálogos faltam
  getRemainingExploration(sceneId) {
    const scene = this.config.scenes.find((s) => s.id === sceneId);
    if (!scene) return 0;

    const dialogHotspots = scene.hotspots.filter((h) => h.action === "dialog");
    const visitedCount = dialogHotspots.filter((h) =>
      this.visitedHotspots.has(h.id),
    ).length;

    return dialogHotspots.length - visitedCount;
  }

  getElapsedTime() {
    if (!this.sceneStartTime) return "0s";
    const delta = Date.now() - this.sceneStartTime;
    const minutes = Math.floor(delta / 60000);
    const seconds = ((delta % 60000) / 1000).toFixed(0);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }
}
