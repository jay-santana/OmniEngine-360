class StatsController {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.config = null;
    this.currentStats = null;
  }

  /**
   * Carrega configuração do tema
   */
  loadConfig(themeConfig) {
    this.config = themeConfig?.stats || null;
  }

  /**
   * Calcula estatísticas baseado no estado atual
   */
  calculateStats(sceneId, quizMistakes) {
    if (!this.config) return null;

    const scene = this.game.config.scenes.find((s) => s.id === sceneId);
    if (!scene) return null;

    // Calcula dados básicos
    const hotspots = scene.hotspots.filter((h) => h.action !== "quiz");
    const exploredCount = hotspots.filter((h) =>
      this.game.state.visitedHotspots.has(h.id),
    ).length;

    const totalQuestions =
      scene.hotspots.find((h) => h.action === "quiz")?.questions?.length || 0;

    // Monta stats seguindo a configuração
    this.currentStats = {
      sceneId,
      sceneName: scene.name,
      timeSpent: this.formatTime(this.game.state.getElapsedTime()),
      exploredCount,
      totalHotspots: hotspots.length,
      explorationPercent:
        hotspots.length > 0
          ? Math.round((exploredCount / hotspots.length) * 100)
          : 100,
      quizMistakes,
      totalQuestions,
      accuracy:
        totalQuestions > 0
          ? Math.max(
              0,
              Math.round(
                ((totalQuestions - quizMistakes) / totalQuestions) * 100,
              ),
            )
          : 100,
      score: this.game.state.score,
      rank: this.calculateRank(totalQuestions - quizMistakes, quizMistakes),
      timestamp: Date.now(),
    };

    return this.currentStats;
  }

  /**
   * Calcula rank baseado nos thresholds do JSON
   */
  calculateRank(correct, mistakes) {
    if (!this.config?.rank_thresholds) return "average";

    const accuracy =
      correct + mistakes > 0 ? (correct / (correct + mistakes)) * 100 : 100;

    for (const [rank, thresholds] of Object.entries(
      this.config.rank_thresholds,
    )) {
      if (accuracy >= thresholds.accuracy && mistakes <= thresholds.mistakes) {
        return rank;
      }
    }
    return "poor";
  }

  /**
   * Formata tempo (delega para GameState)
   */
  formatTime(timeString) {
    return timeString; // GameState já formata
  }

  /**
   * Renderiza stats seguindo template do JSON
   */
  renderStats(container, stats) {
    if (!this.config || !container) return;

    container.innerHTML = "";
    container.className = `stats-panel rank-${stats.rank}`;

    // Título da mensagem (do JSON)
    const message = this.config.messages?.[stats.rank] || {
      title: "RELATÓRIO",
      subtitle: "",
    };
    const title = document.createElement("h3");
    title.className = "stats-title";
    title.textContent = message.title;
    container.appendChild(title);

    if (message.subtitle) {
      const subtitle = document.createElement("p");
      subtitle.className = "stats-subtitle";
      subtitle.textContent = message.subtitle;
      container.appendChild(subtitle);
    }

    // Grid de estatísticas (segundo template do JSON)
    const grid = document.createElement("div");
    grid.className = `stats-grid layout-${this.config.layout?.type || "grid"}`;
    grid.style.gap = this.config.layout?.gap || "15px";

    // Para cada item configurado no display
    this.config.display?.forEach((item) => {
      if (!this.shouldDisplay(item, stats)) return;

      const value = this.getStatValue(item.id, stats);
      if (value === null) return;

      const card = document.createElement("div");
      card.className = "stat-card";

      // Ícone (se existir)
      if (item.icon) {
        const icon = document.createElement("i");
        icon.className = `fas ${item.icon}`;
        card.appendChild(icon);
      }

      // Label
      const label = document.createElement("span");
      label.className = "stat-label";
      label.textContent = item.label;
      card.appendChild(label);

      // Valor
      const valueEl = document.createElement("span");
      valueEl.className = "stat-value";
      valueEl.textContent = this.formatValue(value, item);
      valueEl.style.color = this.getStatColor(item, stats.rank);
      card.appendChild(valueEl);

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  /**
   * Verifica se item deve ser exibido
   */
  shouldDisplay(item, stats) {
    if (item.condition === "always") return true;
    if (item.condition === "mistakes > 0") return stats.quizMistakes > 0;
    return true;
  }

  /**
   * Pega valor da estatística
   */
  getStatValue(id, stats) {
    const map = {
      accuracy: stats.accuracy,
      timeSpent: stats.timeSpent,
      explorationPercent: stats.explorationPercent,
      quizMistakes: stats.quizMistakes,
      score: stats.score,
      rank: stats.rank,
    };
    return map[id] !== undefined ? map[id] : null;
  }

  /**
   * Formata valor conforme template
   */
  formatValue(value, item) {
    if (!item.format) return value;

    if (item.id === "rank" && item.messages) {
      return item.messages[value] || value;
    }

    return item.format.replace("{value}", value);
  }

  /**
   * Pega cor da estatística
   */
  getStatColor(item, rank) {
    if (item.color === "rank") {
      return `var(--stats-${rank})`;
    }
    return item.color || "var(--text-color)";
  }
}
