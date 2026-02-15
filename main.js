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
    this.bootSpriteController = null;
  }

  async init() {
    const response = await fetch("config/game-config.json");
    this.config = await response.json();

    this.themeParams.applyTheme(this.config.theme);
    this.state = new GameState(this.config);
    this.view360 = new ThreeSixtyView("three-canvas");

    if (this.config.theme.assets.glitch_effect) {
      this.view360.setGlitchImage(this.config.theme.assets.glitch_effect);
    }

    this.hotspots = new HotspotController("hotspots-layer", this.view360);
    this.events = new EventController(this);

    this.setupConfirmationModal();

    if (this.config.meta.menu_bgm) {
      this.audio.playBGM(this.config.meta.menu_bgm);
    }

    const unlockAudio = () => {
      this.audio.unlock();
      if (this.config.meta.menu_bgm && this.audio.bgm.paused) {
        this.audio.playBGM(this.config.meta.menu_bgm);
      }
      document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("click", unlockAudio);

    this.ui.init(
      this.config,
      () => this.playBootAnimation(),
      () => this.goHome(),
    );
  }

  setupConfirmationModal() {
    const modal = document.getElementById("mission-confirm-modal");
    const btnYes = document.getElementById("btn-confirm-yes");
    const btnNo = document.getElementById("btn-confirm-no");

    // Remove qualquer evento anterior
    btnYes.replaceWith(btnYes.cloneNode(true));
    btnNo.replaceWith(btnNo.cloneNode(true));
    
    // Pega as referências novamente após o clone
    const newBtnYes = document.getElementById("btn-confirm-yes");
    const newBtnNo = document.getElementById("btn-confirm-no");

    newBtnYes.onclick = () => {
      console.log("✅ Missão aceita!");
      
      // PRIMEIRO: Para qualquer animação do boot que possa estar rodando
      if (this.bootSpriteController) {
        this.bootSpriteController.stopAnimation();
        this.bootSpriteController = null;
      }
      
      // SEGUNDO: Remove o clone do narrador do boot se existir
      const bootNarrator = document.getElementById("boot-narrator");
      if (bootNarrator) bootNarrator.remove();
      
      // TERCEIRO: Garante que a animação de boot está totalmente escondida
      const bootAnimation = document.getElementById("boot-animation");
      if (bootAnimation) {
        bootAnimation.style.display = "none";
      }
      
      // QUARTO: Remove TODOS os elementos do boot dialog
      const bootDialogContainer = document.getElementById("boot-dialog-container");
      if (bootDialogContainer) {
        bootDialogContainer.innerHTML = "";
        bootDialogContainer.classList.remove("visible");
      }
      
      // QUINTO: Limpa o estado do jogo se necessário
      document.body.classList.remove('at-start');
      
      // SEXTO: Carrega o hub DIRETAMENTE, sem delay
      const hub = this.config.scenes.find((s) => s.type === "menu");
      if (hub) {
        // Primeiro esconde o modal
        modal.style.display = "none";
        
        // Imediatamente carrega a tela de seleção
        this.loadMenuScene(hub);
        
        // Mostra a UI do jogo
        document.getElementById("game-ui").style.display = "block";
        
        // Mostra o diálogo do B.Y.T.E.
        this.ui.showNarrator(
          this.config.narrator.after_accept_text,
          null,
          "byte"
        );
      }
    };

    newBtnNo.onclick = () => {
      console.log("❌ Missão recusada - resetando completamente");
      
      // Primeiro esconde o modal
      modal.style.display = "none";
      
      // Depois reseta (o goToStartScreen já lida com a matrix)
      this.goToStartScreen();
    };
  }

  // Método auxiliar para controlar o matrix de forma segura
  setMatrixState(visible) {
    const matrixBg = document.getElementById("matrix-bg");
    if (!matrixBg) return;
    
    if (visible) {
      matrixBg.classList.remove('hidden-matrix');
      matrixBg.style.opacity = "0.4";
    } else {
      matrixBg.classList.add('hidden-matrix');
      matrixBg.style.opacity = "0";
    }
  }

  playBootAnimation() {
    const bootAnimation = document.getElementById("boot-animation");
    const bootByteContainer = document.querySelector(".boot-byte-container");
    const bootPulse = document.querySelector(".boot-pulse");
    const bootSprite = document.getElementById("boot-byte-sprite");
    const bootDialogContainer = document.getElementById("boot-dialog-container");

    // GARANTE que a matrix está visível
    this.setMatrixState(true);

    // Esconde todas as telas
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("game-ui").style.display = "none";
    document.getElementById("level-select").style.display = "none";

    // Remove COMPLETAMENTE qualquer diálogo residual do boot
    const existingBootNarrator = document.getElementById("boot-narrator");
    if (existingBootNarrator) existingBootNarrator.remove();
    
    // Limpa o container de diálogo
    bootDialogContainer.innerHTML = "";
    bootDialogContainer.classList.remove("visible");

    // Reseta o sprite
    if (bootSprite) {
      bootSprite.style.backgroundPosition = "0% 0%";
      bootSprite.classList.remove('byte-pulsing');
    }

    // Mostra a animação
    bootAnimation.style.display = "flex";
    bootPulse.style.display = "block";
    bootByteContainer.style.display = "none";
    
    if (this.config.meta.start_sound) {
      this.audio.playSFX(this.config.meta.start_sound);
    }

    // Quando a animação do pulso terminar, mostra o B.Y.T.E.
    setTimeout(() => {
      bootPulse.style.display = "none";
      bootByteContainer.style.display = "block";
      
      // Cria o controlador de sprite
      this.bootSpriteController = new BootSpriteController(bootSprite);
      
      // Primeira fase: B.Y.T.E. pulsando suavemente
      this.bootSpriteController.addPulseClass();
      
      // CRIA UM NOVO CLONE DO NARRADOR, LIMPO
      const narratorClone = this.ui.els.narratorArea.cloneNode(true);
      narratorClone.id = "boot-narrator";
      narratorClone.style.position = "relative";
      narratorClone.style.bottom = "0";
      narratorClone.style.left = "0";
      narratorClone.style.transform = "none";
      narratorClone.style.margin = "0 auto";
      narratorClone.style.display = "flex";
      narratorClone.style.width = "100%";

      // Ajusta o dialog-box dentro do clone
      const dialogBox = narratorClone.querySelector(".dialog-box");
      if (dialogBox) {
        dialogBox.style.width = "100%";
        dialogBox.style.maxWidth = "100%";
      }
      
      bootDialogContainer.innerHTML = "";
      bootDialogContainer.appendChild(narratorClone);
      
      // Configura o clone
      const cloneNarratorText = narratorClone.querySelector("#narrator-text");
      const cloneNarratorName = narratorClone.querySelector("#narrator-name");
      const cloneNarratorSprite = narratorClone.querySelector("#narrator-sprite");
      const cloneBtnNext = narratorClone.querySelector("#btn-next-dialog");
      
      // GARANTE QUE O TEXTO COMEÇA VAZIO
      cloneNarratorText.textContent = "";
      
      // Esconde o sprite pequeno do clone
      cloneNarratorSprite.style.display = "none";
      cloneNarratorName.textContent = this.config.narrator.name;
      
      // Mostra o diálogo após 2 segundos de pulsação
      setTimeout(() => {
        // Remove a animação de pulsar
        this.bootSpriteController.removePulseClass();
        
        // Inicia a animação de fala
        this.bootSpriteController.startAnimation();
        
        // Mostra o diálogo com fade in
        bootDialogContainer.classList.add("visible");
        
        // GARANTE QUE O TEXTO ESTÁ LIMPO ANTES DE COMEÇAR
        cloneNarratorText.textContent = "";
        
        let i = 0;
        const typingInterval = setInterval(() => {
          if (i < this.config.narrator.intro_text.length) {
            cloneNarratorText.textContent += this.config.narrator.intro_text.charAt(i);
            i++;
          } else {
            clearInterval(typingInterval);
            // Quando o texto termina, para a animação de sprite
            this.bootSpriteController.stopAnimation();
          }
        }, this.config.narrator.typing_speed);
        
        // Configura o botão próximo - CORREÇÃO AQUI
        cloneBtnNext.onclick = () => {
          clearInterval(typingInterval);
          this.bootSpriteController.stopAnimation();
          
          // PRIMEIRO: Esconde a animação de boot
          bootAnimation.style.display = "none";
          
          // SEGUNDO: Remove o clone do narrador do boot
          const bootNarrator = document.getElementById("boot-narrator");
          if (bootNarrator) bootNarrator.remove();
          
          // TERCEIRO: Mostra o modal de confirmação
          const modal = document.getElementById("mission-confirm-modal");
          modal.style.display = "flex";
          
          // QUARTO: Mantém a matrix visível (já está)
          this.setMatrixState(true);
        };
        
      }, 2000); // 2 segundos de pulsação antes do diálogo
      
    }, 2000);
  }

  showLevelSelectWithNarrator() {
    // PRIMEIRO: Esconde o modal de confirmação
    const modal = document.getElementById("mission-confirm-modal");
    if (modal) {
      modal.style.display = "none";
    }
    
    // SEGUNDO: Esconde a matrix ANTES de qualquer outra coisa
    this.setMatrixState(false);
    
    // TERCEIRO: Remove a classe de tela inicial
    document.body.classList.remove('at-start');
    
    const hub = this.config.scenes.find((s) => s.type === "menu");
    if (hub) {
      this.loadMenuScene(hub);
      
      // Mostra a UI do jogo
      document.getElementById("game-ui").style.display = "block";
      
      // Garante que a cena 360 está escondida
      document.getElementById("scene-container").style.display = "none";
      
      // Adiciona classe para indicar que a tela de cards está ativa
      const gameUI = document.getElementById('game-ui');
      if (gameUI) {
        gameUI.classList.add('cards-active');
      }
      
      // Remove qualquer clone do boot
      const bootNarrator = document.getElementById("boot-narrator");
      if (bootNarrator) bootNarrator.remove();
      
      // Para a animação do sprite
      if (this.bootSpriteController) {
        this.bootSpriteController.stopAnimation();
        this.bootSpriteController = null;
      }
      
      // Mostra o diálogo do B.Y.T.E.
      setTimeout(() => {
        this.ui.showNarrator(
          this.config.narrator.after_accept_text,
          null,
          "byte"
        );
      }, 500);
    }
  }

  goToStartScreen() {
    // Remove a classe quiz-active
    document.body.classList.remove('quiz-active');
    
    // Restaura z-index do narrador
    if (this.ui && this.ui.els.narratorArea) {
        this.ui.els.narratorArea.style.zIndex = "400";
    }
    
    // 1. Para TODOS os áudios
    if (this.audio) {
        this.audio.stopBGM();
        this.audio.bgm.src = "";
        this.audio.bgm.load();
    }
    
    // 2. Limpa efeitos visuais
    this.cleanupSceneEffects();
    
    // 3. Remove qualquer overlay de efeito residual
    this.view360?.stopRedAlert();
    this.view360?.hideGlitchEffect();
    this.view360?.stopVictoryGlow();
    
    // 4. Limpa a cena 360 completamente
    if (this.view360) {
        if (this.view360.sphere) {
            this.view360.scene.remove(this.view360.sphere);
            this.view360.sphere = null;
        }
        this.view360.clearHotspots();
        this.view360.lon = 0;
        this.view360.lat = 0;
        this.view360.updateCamera();
    }
    
    // 5. Limpa hotspots da UI
    if (this.hotspots) {
        this.hotspots.clear();
        this.hotspots.hotspots = [];
    }
    
    // 6. PARA a animação de boot
    const bootAnimation = document.getElementById("boot-animation");
    if (bootAnimation) {
        bootAnimation.style.display = "none";
        const bootByteContainer = document.querySelector(".boot-byte-container");
        if (bootByteContainer) bootByteContainer.style.display = "none";
        
        const bootNarrator = document.getElementById("boot-narrator");
        if (bootNarrator) bootNarrator.remove();
        
        const bootDialogContainer = document.getElementById("boot-dialog-container");
        if (bootDialogContainer) {
            bootDialogContainer.innerHTML = "";
            bootDialogContainer.classList.remove("visible");
        }
        
        const bootSprite = document.getElementById("boot-byte-sprite");
        if (bootSprite) {
            bootSprite.style.backgroundPosition = "0% 0%";
            bootSprite.classList.remove('byte-pulsing');
        }
    }
    
    // 7. Para o controlador de sprite do boot
    if (this.bootSpriteController) {
        this.bootSpriteController.stopAnimation();
        this.bootSpriteController = null;
    }
    
    // 8. RESETA o estado do jogo
    if (this.state) {
        this.state.reset();
    }
    
    // 9. Limpa diálogos do narrador
    if (this.ui) {
        this.ui.els.narratorArea.style.display = "none";
        if (this.ui.typingInterval) {
            clearInterval(this.ui.typingInterval);
            this.ui.typingInterval = null;
        }
        if (this.ui.talkingInterval) {
            clearInterval(this.ui.talkingInterval);
            this.ui.talkingInterval = null;
        }
        this.ui.setSpriteFrame(0, 0);
        this.ui.pendingCallback = null;
    }
    
    // 10. Esconde TODAS as telas
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("game-ui").style.display = "none";
    document.getElementById("level-select").style.display = "none";
    document.getElementById("level-select").classList.remove("active");
    document.getElementById("scene-container").style.display = "none";
    
    // 11. Limpa o container de cards
    const cardsContainer = document.getElementById("cards-container");
    if (cardsContainer) {
        cardsContainer.innerHTML = "";
    }
    
    // 12. Limpa o fundo dinâmico
    const dynamicBg = document.getElementById("dynamic-background");
    if (dynamicBg) {
        dynamicBg.innerHTML = "";
    }
    
    // 13. Remove classes da UI
    const gameUI = document.getElementById('game-ui');
    if (gameUI) {
        gameUI.classList.remove('cards-active');
    }
    
    // 14. Remove classe do body
    document.body.classList.remove('at-start');
    
    // 15. Esconde modais
    document.getElementById("mission-confirm-modal").style.display = "none";
    document.getElementById("quiz-overlay").style.display = "none";
    document.getElementById("tutorial-overlay").style.display = "none";
    
    // 16. Esconde o vilão
    const villainContainer = document.getElementById("villain-container");
    if (villainContainer) {
        villainContainer.style.display = "none";
        villainContainer.classList.remove("visible");
    }
    
    // 17. Esconde o botão home
    const btnHome = document.getElementById("btn-home");
    if (btnHome) {
        btnHome.style.display = "none";
    }

    // 18. Mostra a tela inicial IMEDIATAMENTE (sem setTimeout)
    document.getElementById("start-screen").style.display = "flex";
    document.getElementById("start-screen").classList.add("active");
    
    // 19. Atualiza o título
    if (this.config && this.config.meta) {
        document.getElementById("game-title").textContent = this.config.meta.title;
    }
    
    // 20. RECRIA o botão iniciar
    const btnStart = document.getElementById("btn-start");
    if (btnStart) {
        const newBtnStart = btnStart.cloneNode(true);
        btnStart.parentNode.replaceChild(newBtnStart, btnStart);
        
        newBtnStart.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("🎬 Botão INICIAR SISTEMA clicado!");
            this.playBootAnimation();
        };
    }
    
    // 21. Toca a música do menu
    if (this.config && this.config.meta && this.config.meta.menu_bgm) {
        this.audio.playBGM(this.config.meta.menu_bgm);
    }
    
    // 22. Reativa a matrix background (com transição removida temporariamente)
    const matrixBg = document.getElementById("matrix-bg");
    if (matrixBg) {
        matrixBg.style.transition = "none";
        matrixBg.style.opacity = "0.4";
        // Restaura a transição depois
        setTimeout(() => {
            matrixBg.style.transition = "opacity 0.3s ease";
        }, 50);
    }
    
    console.log("✅ Tela inicial restaurada completamente!");
  }

  loadMenuScene(sceneData) {
    // PRIMEIRO: Remove a classe de tela inicial
    document.body.classList.remove('at-start');
    
    // SEGUNDO: Esconde a matrix ANTES de qualquer coisa
    const matrixBg = document.getElementById("matrix-bg");
    if (matrixBg) {
      matrixBg.style.opacity = "0";
      matrixBg.style.transition = "none"; // Remove transição para evitar flash
    }
    
    // TERCEIRO: Garantir que o botão home está visível
    const btnHome = document.getElementById("btn-home");
    if (btnHome) {
      btnHome.style.display = "flex";
      btnHome.style.pointerEvents = "auto";
      btnHome.style.cursor = "pointer";
      btnHome.style.opacity = "1";
      btnHome.style.visibility = "visible";
      
      btnHome.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🏠 Botão home clicado na SELEÇÃO - voltando para tela INICIAL");
        this.goToStartScreen();
      };
    }
    
    // QUARTO: Limpa o container de cards
    const cardsContainer = document.getElementById("cards-container");
    if (cardsContainer) {
      cardsContainer.innerHTML = "";
    }
    
    // QUINTO: Renderiza os cards
    this.ui.renderLevelSelect(sceneData.cards, sceneData.background, (card) => {
      this.load360Scene(card.targetScene);
    });
    
    // SEXTO: Mostra a tela de seleção
    const levelSelect = document.getElementById("level-select");
    levelSelect.style.display = "flex";
    levelSelect.classList.add("active");
    
    // SÉTIMO: Configura a UI
    const gameUI = document.getElementById('game-ui');
    if (gameUI) {
      gameUI.classList.add('cards-active');
      gameUI.style.display = "block";
    }
    
    // OITAVO: Esconde a cena 360
    document.getElementById("scene-container").style.display = "none";
    
    // NONO: Restaura a transição da matrix depois de tudo carregado
    setTimeout(() => {
      if (matrixBg) {
        matrixBg.style.transition = "opacity 0.3s ease";
      }
    }, 100);
  }

  resetAndPlayScene(sceneId) {
    this.state.resetScene(sceneId);
    this.load360Scene(sceneId);
  }

  load360Scene(sceneId) {
    const scene = this.config.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    // Remove a classe de tela inicial
    document.body.classList.remove('at-start');

    // Garantir que o botão home está visível e configurado
    const btnHome = document.getElementById("btn-home");
    if (btnHome) {
        btnHome.style.display = "flex";
        btnHome.style.pointerEvents = "auto";
        btnHome.style.cursor = "pointer";
        btnHome.style.opacity = "1";
        btnHome.style.visibility = "visible";
        
        // NAS CENAS 360: Voltar para tela de SELEÇÃO de níveis
        btnHome.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("🏠 Botão home clicado na CENA 360 - voltando para SELEÇÃO de níveis");
            
            // Volta para o hub (tela de seleção)
            const hub = this.config.scenes.find((s) => s.type === "menu");
            if (hub) {
                this.loadMenuScene(hub);
                
                // Toca a música do menu
                if (this.config.meta.menu_bgm) {
                    this.audio.playBGM(this.config.meta.menu_bgm);
                }
                
                // Limpa efeitos da cena
                this.cleanupSceneEffects();
                
                // Mostra o diálogo do B.Y.T.E.
                setTimeout(() => {
                    this.ui.showNarrator(
                        this.config.narrator.after_accept_text,
                        null,
                        "byte"
                    );
                }, 500);
            }
        };
    }

    const gameUI = document.getElementById('game-ui');
    if (gameUI) {
        gameUI.classList.remove('cards-active');
    }

    if (scene.audio_ambience) {
        this.audio.playBGM(scene.audio_ambience);
    } else {
        this.audio.stopBGM();
    }

    this.state.enterScene(sceneId, scene.hotspots.length);
    this.ui.showScreen("game-ui");
    
    document.getElementById("scene-container").style.display = "block";
    document.getElementById("level-select").style.display = "none";
    document.getElementById("level-select").classList.remove("active");

    this.view360.loadScene(scene.image);

    if (scene.initial_view) {
        this.view360.setInitialView(scene.initial_view);
    } else {
        this.view360.setInitialView(0, 0);
    }

    if (scene.narrator_intro) this.ui.showNarrator(scene.narrator_intro);

    this.hotspots.loadHotspots(scene, (hotspot) =>
        this.handleHotspotClick(hotspot, scene),
    );

    this.updateUI();
  }

  handleHotspotClick(hotspot, sceneData) {
    if (hotspot.action === "dialog") {
      const isFirstVisit = this.state.registerVisit(hotspot.id);
      this.updateUI();

      const isFullyExplored = this.state.isSceneFullyExplored(sceneData.id);
      const eventNotTriggered = !this.state.eventsTriggered.has(sceneData.id);

      this.ui.showNarrator(
        hotspot.content,
        () => {
          if (isFullyExplored && eventNotTriggered && isFirstVisit) {
            this.ui.showNarrator(
              "🎯 Protocolo de Verificação desbloqueado! Clique no ícone para iniciar.",
              null,
              "byte",
            );
          }
        },
        "byte",
      );
      return;
    }

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

    this.ui.showQuiz(hotspot, (success) => {
      if (success) {
        this.state.addScore(this.config.gameplay.points_quiz_correct);

        if (sceneData.event?.victory_sound) {
          this.audio.playSFX(sceneData.event.victory_sound);
        }

        if (this.events) {
          this.events.villainDefeated(sceneData);
        } else {
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

    const villain = document.getElementById("villain-container");
    if (villain) villain.style.display = "none";
  }

  updateUI() {
    // SEMPRE atualiza o tracker, não apenas quando cena 360 está visível
    const scene = this.config.scenes.find(
        (s) => s.id === this.state.currentSceneId,
    );
    const percent = scene ? this.state.getProgressPercent(scene.hotspots) : 0;
      
    this.ui.updateTracker(this.state.score, percent, this.state.currentSceneId);
  }
}

// Matrix Background Animation com números
function initMatrixBackground() {
  const matrixBg = document.getElementById('matrix-bg');
  if (!matrixBg) return;
  
  matrixBg.innerHTML = '';
  const columns = Math.floor(window.innerWidth / 25);
  
  for (let i = 0; i < columns; i++) {
    const column = document.createElement('div');
    column.className = 'matrix-column';
    column.style.left = i * 25 + 'px';
    column.style.animationDuration = Math.random() * 4 + 3 + 's';
    column.style.animationDelay = Math.random() * 5 + 's';
    column.style.fontSize = Math.random() * 10 + 14 + 'px';
    column.style.color = '#00FF00'; // Cor fixa para garantir visibilidade
    
    // Cria uma coluna com 30 números
    let numbers = '';
    for (let j = 0; j < 30; j++) {
      const char = Math.random() > 0.5 ? '0' : '1';
      numbers += char + '<br>';
    }
    column.innerHTML = numbers;
    
    matrixBg.appendChild(column);
  }
}

// Função para controlar visibilidade da matrix
function setMatrixVisibility(visible) {
  const matrixBg = document.getElementById('matrix-bg');
  if (matrixBg) {
    matrixBg.style.opacity = visible ? '0.4' : '0';
  }
}
// Boot Sprite Animation Controller
class BootSpriteController {
  constructor(spriteElement) {
    this.sprite = spriteElement;
    this.interval = null;
    this.currentFrame = 0;
    this.isAnimating = false;
  }

  startAnimation() {
    if (this.interval) clearInterval(this.interval);
    this.isAnimating = true;
    
    // Velocidade aumentada de 80ms para 50ms (mais rápida)
    this.interval = setInterval(() => {
      if (!this.isAnimating) return;
      
      const col = this.currentFrame % 6;
      const row = Math.floor(this.currentFrame / 6);
      const x = col * 20;
      const y = row * 50.5;
      
      this.sprite.style.backgroundPosition = `${x}% ${y}%`;
      
      this.currentFrame++;
      if (this.currentFrame >= 18) {
        this.currentFrame = 0;
      }
    }, 50); // Reduzido de 80ms para 50ms
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    // Volta para o primeiro frame (boca fechada)
    this.sprite.style.backgroundPosition = '0% 0%';
  }
  
  // Método para remover a classe de pulsar
  removePulseClass() {
    this.sprite.classList.remove('byte-pulsing');
  }
  
  // Método para adicionar a classe de pulsar
  addPulseClass() {
    this.sprite.classList.add('byte-pulsing');
  }
}

window.onload = () => {
  const game = new GameEngine();
  game.init();
  initMatrixBackground();
  
  // Expõe a função globalmente para uso no GameEngine
  window.setMatrixVisibility = setMatrixVisibility;
  
  // Garante que o botão home existe e está configurado
  const btnHome = document.getElementById("btn-home");
  if (btnHome) {
      btnHome.style.display = "none"; // Começa escondido
  }
};