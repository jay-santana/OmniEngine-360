class GameEngine {
  constructor() {
    this.config = null;
    this.themeParams = new ThemeController();
    this.audio = new AudioController();
    this.ui = new UIController();
    this.state = null;
    this.view360 = null;
    this.hotspots = null;
  }

  async init() {
    const response = await fetch("config/game-config.json");
    this.config = await response.json();

    this.themeParams.applyTheme(this.config.theme);
    this.state = new GameState(this.config);
    this.view360 = new ThreeSixtyView("three-canvas");
    this.hotspots = new HotspotController("hotspots-layer", this.view360);

    // --- LÓGICA DE ÁUDIO INICIAL ---

    // 1. Tenta tocar o áudio do menu imediatamente
    if (this.config.meta.menu_bgm) {
      this.audio.playBGM(this.config.meta.menu_bgm);
    }

    // 2. Hack para navegadores que bloqueiam autoplay:
    // No primeiro clique em QUALQUER lugar da página, destrava o áudio
    const unlockAudio = () => {
      this.audio.unlock();
      // Se a música do menu deveria estar tocando mas não está, toca agora
      if (this.config.meta.menu_bgm && this.audio.bgm.paused) {
        this.audio.playBGM(this.config.meta.menu_bgm);
      }
      // Remove o evento para não rodar a cada clique
      document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("click", unlockAudio);

    // 3. Inicializa a UI
    this.ui.init(
      this.config,
      () => this.startGame(), // Botão Iniciar
      () => this.goHome(), // Botão Home
    );
  }

  startGame() {
    // Toca som de efeito (SFX)
    if (this.config.meta.start_sound)
      this.audio.playSFX(this.config.meta.start_sound);

    // NOTA: Não paramos o BGM aqui. Ele continua tocando durante
    // a narração e a seleção de cards, conforme seu pedido.

    this.ui.showScreen("game-ui");
    this.ui.showNarrator(this.config.narrator.intro_text);

    const hub = this.config.scenes.find((s) => s.type === "menu");
    if (hub) this.loadMenuScene(hub);
  }

  goHome() {
    const hub = this.config.scenes.find((s) => s.type === "menu");
    if (hub) {
      this.loadMenuScene(hub);
      document.getElementById("scene-container").style.display = "none";
      document.getElementById("narrator-area").style.display = "none";

      // Volta a tocar a música do menu ao ir para Home
      if (this.config.meta.menu_bgm) {
        this.audio.playBGM(this.config.meta.menu_bgm);
      }
    }
  }

  loadMenuScene(sceneData) {
    this.ui.renderLevelSelect(sceneData.cards, sceneData.background, (card) => {
      this.load360Scene(card.targetScene);
    });
  }

  load360Scene(sceneId) {
    const scene = this.config.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    // --- TROCA DE ÁUDIO ---
    // Aqui acontece a mágica: Quando seleciona o módulo,
    // se a cena tiver um 'audio_ambience', o AudioController vai trocar.
    // Se não tiver áudio na cena, o áudio do menu continuaria (ou você pode forçar parar).
    if (scene.audio_ambience) {
      this.audio.playBGM(scene.audio_ambience);
    } else {
      // Se a cena não tem áudio, silencia o do menu
      this.audio.stopBGM();
    }

    this.state.enterScene(sceneId, scene.hotspots.length);
    this.ui.showScreen("game-ui");
    document.getElementById("scene-container").style.display = "block";

    this.view360.loadScene(scene.image);

    if (scene.initial_view) {
      this.view360.setInitialView(scene.initial_view);
    } else {
      this.view360.setInitialView(0, 0);
    }
    // ------------------------------------------------------

    if (scene.audio_ambience) this.audio.playBGM(scene.audio_ambience);
    if (scene.narrator_intro) this.ui.showNarrator(scene.narrator_intro);

    this.hotspots.loadHotspots(scene, (hotspot) =>
      this.handleHotspotClick(hotspot, scene),
    );

    this.updateUI();
  }

  handleHotspotClick(hotspot, sceneData) {
    const isFirstVisit = this.state.registerVisit(hotspot.id);
    this.updateUI();

    if (hotspot.action === "dialog") {
      this.ui.showNarrator(hotspot.content);
    } else if (hotspot.action === "quiz") {
      if (this.state.canUnlockQuiz(sceneData.hotspots)) {
        this.ui.showQuiz(hotspot, (isCorrect) => {
          if (isCorrect) {
            this.state.addScore(this.config.gameplay.points_quiz_correct);
            this.ui.showNarrator(
              "Excelente! Módulo recuperado. Voltando ao Hub...",
              () => this.goHome(),
            );
          } else {
            this.state.addScore(this.config.gameplay.points_quiz_retry);
          }
          this.updateUI();
        });
      } else {
        this.ui.showNarrator(
          hotspot.locked_message || "Acesso negado. Explore mais.",
        );
      }
    }
  }

  updateUI() {
    const scene = this.config.scenes.find(
      (s) => s.id === this.state.currentSceneId,
    );
    const percent = scene ? this.state.getProgressPercent(scene.hotspots) : 0;
    this.ui.updateTracker(this.state.score, percent);
  }
}

window.onload = () => {
  const game = new GameEngine();
  game.init();
};
