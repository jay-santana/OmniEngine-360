class EventController {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.isEventActive = false;
    this.villainInterval = null;
  }

  checkAndTriggerEvent() {
    const scene = this.game.config.scenes.find(
      (s) => s.id === this.game.state.currentSceneId,
    );
    if (!scene || !scene.event) return false;

    const requiredHotspots = scene.hotspots.filter((h) => h.action !== "quiz");
    const visitedCount = requiredHotspots.filter((h) =>
      this.game.state.visitedHotspots.has(h.id),
    ).length;

    const allVisited = visitedCount === requiredHotspots.length;
    const eventNotTriggered = !this.game.state.eventsTriggered.has(scene.id);

    if (allVisited && eventNotTriggered) {
      this.triggerEvent(scene);
      return true;
    }
    return false;
  }

  triggerEvent(scene) {
    this.isEventActive = true;
    this.game.state.eventsTriggered.add(scene.id);
    if (scene.event.type === "villain_appears") {
      this.triggerVillainSequence(scene);
    }
  }

  triggerVillainSequence(scene, quizHotspot) {
    console.log("🎮 Evento do vilão iniciado em:", scene.id);
    this.game.state.eventsTriggered.add(scene.id);
    this.isEventActive = true;

    if (scene.event.alarm_sound) {
      this.game.audio.playAlarm(scene.event.alarm_sound);
    }
    this.game.view360.startRedAlert();

    setTimeout(() => {
      this.game.view360.showGlitchEffect();
      setTimeout(() => {
        this.showVillainSprite();
        setTimeout(() => {
          this.game.ui.showNarrator(
            scene.event.villain_speech,
            () => {
              this.game.ui.showNarrator(
                scene.event.byte_alert,
                () => {
                  this.game.view360.stopRedAlert();
                  this.game.view360.hideGlitchEffect();
                  this.hideVillainSprite();
                  this.game.audio.stopAlarm();

                  if (quizHotspot) {
                    this.game.openQuiz(quizHotspot, scene);
                  }
                },
                "byte",
              );
            },
            "villain",
          );
        }, 800);
      }, 1500);
    }, 2000);
  }

  villainDefeated(scene) {
    this.isEventActive = false;

    // --- REMOVI O SOM DAQUI! (Antes ele tocava aqui no começo) ---

    this.showVillainSprite();
    this.game.view360.startVictoryGlow();

    // 1. O Glitch fala a derrota ("Nããão! Dados... organizados...")
    this.game.ui.showNarrator(
      scene.event.villain_defeat,
      () => {
        // --- TUDO AQUI ACONTECE SÓ DEPOIS QUE O GLITCH TERMINA ---

        this.game.view360.stopVictoryGlow();
        this.hideVillainSprite();

        // 2. AGORA SIM: Toca o som de vitória (Junto com o Byte)
        if (scene.event.victory_sound) {
          this.game.audio.playSFX(scene.event.victory_sound);
        }

        // 3. O Byte fala a vitória ("Ameaça neutralizada!")
        this.game.ui.showNarrator(
          scene.event.victory_message,
          () => {
            // --- ÚNICA MUDANÇA AQUI ---
            // Verifica se é o último módulo
            const isLastModule = this.game.state.completeModule(scene.id);
            
            if (isLastModule) {
              // Se for o último, vai para a sequência final
              this.game.playFinalSequence();
            } else {
              // Se não for, volta ao hub normalmente
              // Reset da cena e volta para o Menu
              console.log("Reiniciando dados da cena:", scene.id);
              this.game.state.resetScene(scene.id, true);

              const hub = this.game.config.scenes.find((s) => s.type === "menu");
              if (hub) {
                this.game.loadMenuScene(hub);

                if (this.game.config.meta.menu_bgm) {
                  this.game.audio.playBGM(this.game.config.meta.menu_bgm);
                }

                setTimeout(() => {
                  this.game.ui.showNarrator(
                    this.game.config.narrator.select_module_text,
                    null,
                    "byte",
                  );
                }, 500);
              }
            }
          },
          "byte",
        );
      },
      "villain",
    );
  }

  showVillainSprite() {
    const villainContainer = document.getElementById("villain-container");
    const villainSprite = document.getElementById("villain-sprite");

    if (villainContainer && villainSprite) {
      villainContainer.style.display = "block";
      void villainContainer.offsetWidth;
      villainContainer.classList.add("visible");

      if (!this.villainAnimator) {
        this.villainAnimator = new SpriteAnimator(
          villainSprite,
          this.game.config.theme.assets.villain_sprite_config,
        );
      }
      this.villainAnimator.play();
    }
  }

  hideVillainSprite() {
    const villainContainer = document.getElementById("villain-container");
    if (this.villainAnimator) {
      this.villainAnimator.stop();
    }
    if (villainContainer) {
      villainContainer.classList.remove("visible");
      setTimeout(() => {
        villainContainer.style.display = "none";
      }, 1400);
    }
  }

  startVillainAnimation() {
    if (this.villainAnimator) this.villainAnimator.play();
  }

  stopVillainAnimation() {
    if (this.villainAnimator) this.villainAnimator.stop();
  }

  resetEvents() {
    if (this.villainInterval) {
      clearInterval(this.villainInterval);
      this.villainInterval = null;
    }
    this.isEventActive = false;
    this.hideVillainSprite();
    this.game.audio.stopAlarm();
    const highestTimeoutId = setTimeout(() => {});
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
  }
}
