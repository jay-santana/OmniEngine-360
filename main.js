class GameEngine {
  constructor() {
    this.config = null;
    this.themeParams = new ThemeController();
    this.audio = new AudioController();
    this.ui = new UIController(this);
    this.state = null;
    this.view360 = null;
    this.hotspots = null;
    this.events = null;
    this.stats = null;
  }

  async init() {
    const response = await fetch("config/game-config.json");
    this.config = await response.json();

    this.themeParams.applyTheme(this.config.theme);
    this.state = new GameState(this.config);
    this.view360 = new ThreeSixtyView("three-canvas");

    // PASSA A IMAGEM DO GLITCH PARA O ThreeSixtyView
    if (this.config.theme.assets.glitch_effect) {
      this.view360.setGlitchImage(this.config.theme.assets.glitch_effect);
    }

    this.hotspots = new HotspotController("hotspots-layer", this.view360);
    this.events = new EventController(this);

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
      this.cleanupSceneEffects(); // Limpa efeitos visuais e de áudio da cena anterior
      this.state.reset(); // Reseta o estado do jogo, incluindo eventos
    }
  }

  loadMenuScene(sceneData) {
    this.ui.renderLevelSelect(sceneData.cards, sceneData.background, (card) => {
      this.load360Scene(card.targetScene);
    });
  }

  // Método para reiniciar UMA cena específica
  resetAndPlayScene(sceneId) {
    // Reseta o progresso DESTA cena
    this.state.resetScene(sceneId);
    // Carrega a cena novamente
    this.load360Scene(sceneId);
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

    // NÃO reseta automaticamente - mantém progresso
    // Se quiser SEMPRE resetar ao entrar, descomente a linha abaixo:
    // this.state.resetScene(sceneId);

    this.updateUI();
  }

  handleHotspotClick(hotspot, sceneData) {
    // --- HOTSPOT DE DIÁLOGO (EXPLORAÇÃO) ---
    if (hotspot.action === "dialog") {
      // Registra a visita
      const isFirstVisit = this.state.registerVisit(hotspot.id);
      this.updateUI();

      // Verifica se este é o ÚLTIMO hotspot
      const isFullyExplored = this.state.isSceneFullyExplored(sceneData.id);
      const eventNotTriggered = !this.state.eventsTriggered.has(sceneData.id);

      // MOSTRA O DIÁLOGO e PASSA um callback para QUANDO terminar
      this.ui.showNarrator(
        hotspot.content, // Mensagem do hotspot (Ada, Mouse, etc.)
        () => {
          // ESTE CÓDIGO EXECUTA QUANDO CLICAR EM "PRÓXIMO"

          // Se acabou de completar a exploração E evento ainda não aconteceu
          if (isFullyExplored && eventNotTriggered && isFirstVisit) {
            // SÓ AGORA mostra a mensagem de desbloqueio!
            this.ui.showNarrator(
              "🎯 Protocolo de Verificação desbloqueado! Clique no ícone para iniciar.",
              null, // Sem callback adicional
              "byte",
            );
          }
        },
        "byte", // B.Y.T.E. fala
      );

      return;
    }

    // --- HOTSPOT DE QUIZ ---
    if (hotspot.action === "quiz") {
      const isFullyExplored = this.state.isSceneFullyExplored(sceneData.id);

      if (!isFullyExplored) {
        this.ui.showNarrator(
          hotspot.locked_message ||
            "Acesso negado. Complete a exploração primeiro.",
          null,
          "byte",
        );
        return;
      }

      if (!this.state.eventsTriggered.has(sceneData.id)) {
        this.events.triggerVillainSequence(sceneData, hotspot);
      } else {
        this.openQuiz(hotspot, sceneData);
      }
    }
  }

  openQuiz(hotspot, sceneData) {
    console.log("📝 Abrindo quiz");

    if (!hotspot || !hotspot.questions) {
      console.error("❌ Quiz hotspot inválido!", hotspot);
      return;
    }

    // Passamos o callback que será chamado APENAS quando fechar o relatório
    this.ui.showQuiz(hotspot, (success) => {
      if (success) {
        // Adiciona pontos pelo sucesso (podemos ajustar para dar pontos por questão se preferir,
        // mas aqui dá o prêmio "Bônus de Vitória" cheio)
        this.state.addScore(this.config.gameplay.points_quiz_correct);

        if (sceneData.event?.victory_sound) {
          this.audio.playSFX(sceneData.event.victory_sound);
        }

        if (this.events) {
          this.events.villainDefeated(sceneData);
        } else {
          // Fallback
          this.ui.showNarrator(
            sceneData.event?.villain_defeat || "Nããão! Derrotado!",
            () => {
              this.ui.showNarrator(
                sceneData.event?.victory_message || "Sistema restaurado!",
                () => this.goHome(),
                "byte",
              );
            },
            "villain",
          );
        }
      }
      this.updateUI();
    });
  }

  cleanupSceneEffects() {
    this.view360?.stopRedAlert();
    this.view360?.hideStaticEffect();
    this.view360?.hideSmokeEffect();

    const villain = document.getElementById("villain-container");
    if (villain) villain.style.display = "none";
  }

  updateUI() {
    const scene = this.config.scenes.find(
      (s) => s.id === this.state.currentSceneId,
    );
    const percent = scene ? this.state.getProgressPercent(scene.hotspots) : 0;
    // PASSA o sceneId para o UIController
    this.ui.updateTracker(this.state.score, percent, this.state.currentSceneId);
  }
}

window.onload = () => {
  const game = new GameEngine();
  game.init();
};
