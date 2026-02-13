// engine/EventController.js
class EventController {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.isEventActive = false;
  }

  /**
   * Verifica se o jogador explorou todos os hotspots da cena atual
   * e ativa o evento se necessário
   */
  checkAndTriggerEvent() {
    const scene = this.game.config.scenes.find(
      s => s.id === this.game.state.currentSceneId
    );
    
    if (!scene || !scene.event) return false;
    
    // Verifica se todos os hotspots NÃO-QUIZ foram visitados
    const requiredHotspots = scene.hotspots.filter(h => h.action !== "quiz");
    const visitedCount = requiredHotspots.filter(h => 
      this.game.state.visitedHotspots.has(h.id)
    ).length;
    
    const allVisited = visitedCount === requiredHotspots.length;
    const eventNotTriggered = !this.game.state.eventsTriggered.has(scene.id);
    
    if (allVisited && eventNotTriggered) {
      this.triggerEvent(scene);
      return true;
    }
    
    return false;
  }

  /**
   * Ativa o evento especial da cena
   */
  triggerEvent(scene) {
    this.isEventActive = true;
    
    // Marca o evento como já executado para não repetir
    this.game.state.eventsTriggered.add(scene.id);
    
    // Chama o método específico baseado no tipo de evento
    if (scene.event.type === "villain_appears") {
      this.villainAppears(scene);
    }
  }

  /**
   * CENA DO VILÃO APARECENDO
   */
  villainAppears(scene) {
    // 1. TOCAR ALARME
    if (scene.event.alarm_sound) {
      this.game.audio.playSFX(scene.event.alarm_sound);
    }
    
    // 2. EFEITO DE LUZ VERMELHA
    this.game.view360.startRedAlert();
    
    // 3. EFEITO GLITCH NA TELA
    if (scene.id === "sala_informatica") {
      this.game.view360.showGlitchEffect();
    } else if (scene.id === "cpu_interno") {
      this.game.view360.showSmokeEffect();
    }
    
    // 4. GLITCH FALA (imagem do vilão)
    this.game.ui.showNarrator(
      scene.event.villain_speech,
      () => {
        // Quando clicar em próximo, os efeitos CONTINUAM para o alerta do B.Y.T.E.
        
        // 5. B.Y.T.E. ALERTA (imagem do Robô)
        this.game.ui.showNarrator(
          scene.event.byte_alert,
          () => {
            // Quando clicar em próximo, OS EFEITOS PARAM!
            this.game.view360.stopRedAlert();
            if (scene.id === "sala_informatica") {
              this.game.view360.hideGlitchEffect();
            } else {
              this.game.view360.hideSmokeEffect();
            }
            
            // 6. ABRIR O QUIZ
            const quizHotspot = scene.hotspots.find(h => h.action === "quiz");
            if (quizHotspot) this.game.openQuiz(quizHotspot, scene);
          },
          "byte" // B.Y.T.E. fala
        );
      },
      "villain" // GLITCH fala primeiro
    );
  }

  triggerVillainSequence(scene, quizHotspot) {
    console.log("🎮 Evento do vilão iniciado em:", scene.id);
    
    this.game.state.eventsTriggered.add(scene.id);
    this.isEventActive = true;
    
    // ===== 1. LUZ VERMELHA + ALARME (FADE IN SUAVE) =====
    if (scene.event.alarm_sound) {
      this.game.audio.playSFX(scene.event.alarm_sound);
    }
    this.game.view360.startRedAlert(); // Já tem fade-in pelo CSS
    
    setTimeout(() => {
      
      // ===== 2. EFEITO GLITCH/FUMAÇA (FADE IN) =====
      if (scene.id === "sala_informatica") {
        console.log("🎮 Ativando efeito glitch na Sala de Informática");
        this.game.view360.showGlitchEffect();
      } else if (scene.id === "cpu_interno") {
        console.log("🎮 Ativando efeito de fumaça na CPU");
        this.game.view360.showSmokeEffect();
      }
      
      setTimeout(() => {
        
        // ===== 3. GLITCH APARECE (FADE IN + SCALE) =====
        this.showVillainSprite();
        
        setTimeout(() => {
          
          // ===== 4. GLITCH FALA =====
          this.game.ui.showNarrator(
            scene.event.villain_speech,
            () => {
              
              // ===== 5. B.Y.T.E. ALERTA =====
              this.game.ui.showNarrator(
                scene.event.byte_alert,
                () => {
                  
                  // ===== 6. EFEITOS PARAM (FADE OUT) =====
                  this.game.view360.stopRedAlert();
                  
                  if (scene.id === "sala_informatica") {
                    this.game.view360.hideGlitchEffect();
                  } else if (scene.id === "cpu_interno") {
                    this.game.view360.hideSmokeEffect();
                  }
                  
                  // ===== 7. GLITCH DESAPARECE (FADE OUT) =====
                  this.hideVillainSprite();
                  
                  // ===== 8. QUIZ ABRE =====
                  if (quizHotspot) {
                    this.game.openQuiz(quizHotspot, scene);
                  }
                },
                "byte"
              );
            },
            "villain"
          );
        }, 800);
      }, 1500);
    }, 2000);
  }

   /**
   * CENA DO VILÃO DERROTADO
   */
  villainDefeated(scene) {
    this.isEventActive = false;
    
    if (scene.event.victory_sound) {
      this.game.audio.playSFX(scene.event.victory_sound);
    }
    
    // MOSTRA O GLITCH GRANDE NA TELA
    this.showVillainSprite();
    
    // ===== LUZ SERENA PULSANDO =====
    this.game.view360.startVictoryGlow();
    
    // NÃO remove o glitch effect ainda - ele vai sumindo gradualmente
    // Mas MUDA o foco para a luz serena
    
    // GLITCH derrotado - fala com voz distorcida
    this.game.ui.showNarrator(
      scene.event.villain_defeat,
      () => {
        // Quando clicar em próximo:
        
        // ===== LUZ SERENA PARA =====
        this.game.view360.stopVictoryGlow();
        
        // Esconde o GLITCH da tela
        this.hideVillainSprite();
        
        // B.Y.T.E. comemora
        this.game.ui.showNarrator(
          scene.event.victory_message,
          () => {
            this.game.goHome();
          },
          "byte"
        );
      },
      "villain"
    );
  }

  // ===== MÉTODOS PARA CONTROLAR O GLITCH GRANDE =====
  showVillainSprite() {
    const villainContainer = document.getElementById('villain-container');
    if (villainContainer) {
      villainContainer.style.display = 'block';
      // Força reflow para a transição funcionar
      void villainContainer.offsetWidth;
      villainContainer.classList.add('visible');
    }
  }

  hideVillainSprite() {
    const villainContainer = document.getElementById('villain-container');
    if (villainContainer) {
      villainContainer.classList.remove('visible');
      
      setTimeout(() => {
        villainContainer.style.display = 'none';
      }, 1400); // Espera a transição terminar
    }
  }
}


