class UIController {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.els = {
      title: document.getElementById("game-title"),
      narratorArea: document.getElementById("narrator-area"),
      narratorText: document.getElementById("narrator-text"),
      narratorSprite: document.getElementById("narrator-sprite"),
      narratorName: document.getElementById("narrator-name"),
      levelSelect: document.getElementById("level-select"),
      cardsContainer: document.getElementById("cards-container"),
      score: document.getElementById("score-display"),
      progress: document.getElementById("exploration-display"),
      quizOverlay: document.getElementById("quiz-overlay"),
      startScreen: document.getElementById("start-screen"),
      btnNext: document.getElementById("btn-next-dialog"),
      btnHome: document.getElementById("btn-home"),
      btnAudio: document.getElementById("btn-audio"),
      volumeSlider: document.getElementById("volume-slider"),
      btnInfo: document.getElementById("btn-info"),
      tutorialOverlay: document.getElementById("tutorial-overlay"),
      btnCloseTutorial: document.getElementById("btn-close-tutorial"),
    };
    this.typingInterval = null;
    this.pendingCallback = null;
    this.narratorAnimator = null;
  }

  init(config, onStartClick, onHomeClick) {
    this.config = config;
    this.els.title.textContent = config.meta.title;
    this.els.narratorName.textContent = config.narrator.name;

    this.narratorAnimator = new SpriteAnimator(
      this.els.narratorSprite,
      config.theme.assets.narrator_sprite_config,
    );

    this.defaultNarrator = {
      name: config.narrator.name,
      image: config.theme.assets.narrator_image,
    };

    this.villainNarrator = {
      name: config.theme.assets.villain_name || "GLITCH",
      image: config.theme.assets.villain_image || "",
    };

    document.getElementById("btn-start").onclick = onStartClick;

    if (this.els.btnHome) {
      this.els.btnHome.onclick = onHomeClick;
    }

    // Monitora mudanças na tela de cards
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === "style" ||
          mutation.attributeName === "class"
        ) {
          const levelSelect = document.getElementById("level-select");
          const gameUI = document.getElementById("game-ui");

          if (levelSelect && gameUI) {
            const isCardsVisible =
              levelSelect.style.display !== "none" &&
              levelSelect.style.display !== "" &&
              levelSelect.classList.contains("active");

            if (isCardsVisible) {
              gameUI.classList.add("cards-active");
            } else {
              gameUI.classList.remove("cards-active");
            }
          }
        }
      });
    });

    const levelSelect = document.getElementById("level-select");
    if (levelSelect) {
      observer.observe(levelSelect, { attributes: true });
    }

    if (this.els.btnNext) {
      this.els.btnNext.onclick = () => {
        if (this.isTyping) {
          if (this.typingInterval) clearInterval(this.typingInterval);
          this.typingInterval = null;
          this.game.audio.stopSpeech();
          this.els.narratorText.textContent = this.currentFullText;
          this.isTyping = false;
          if (this.narratorAnimator) {
            this.narratorAnimator.stop();
          }
        } else {
          this.els.narratorArea.style.display = "none";
          this.game.audio.stopSpeech();
          if (this.pendingCallback) {
            const callback = this.pendingCallback;
            this.pendingCallback = null;
            callback();
          }
        }
      };
    }

    if (this.els.volumeSlider) {
      this.els.volumeSlider.addEventListener("input", (e) => {
        const vol = e.target.value;
        this.game.audio.setGlobalVolume(vol);
        if (vol == 0) {
          this.els.btnAudio.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else {
          this.els.btnAudio.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
      });
    }

    if (this.els.btnAudio) {
      this.els.btnAudio.onclick = () => {
        if (this.game.audio.globalVolume > 0) {
          this.game.audio.lastVol = this.game.audio.globalVolume;
          this.game.audio.setGlobalVolume(0);
          this.els.volumeSlider.value = 0;
          this.els.btnAudio.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else {
          const vol = this.game.audio.lastVol || 0.5;
          this.game.audio.setGlobalVolume(vol);
          this.els.volumeSlider.value = vol;
          this.els.btnAudio.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
      };
    }

    if (this.els.btnInfo) {
      this.els.btnInfo.onclick = () => {
        this.els.tutorialOverlay.style.display = "flex";
        this.els.tutorialOverlay.style.zIndex = "10001";
      };
    }

    if (this.els.btnCloseTutorial) {
      this.els.btnCloseTutorial.onclick = () => {
        this.els.tutorialOverlay.style.display = "none";
      };
    }
  }

  stopTypingAnimation() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
    this.isTyping = false;
    if (this.currentFullText && this.els.narratorText) {
      this.lastTypingPosition = this.els.narratorText.textContent.length;
    }
    if (this.narratorAnimator) {
      this.narratorAnimator.stop();
    }
  }

  resumeTyping() {
    if (!this.currentFullText || this.lastTypingPosition === undefined) return;
    if (this.lastTypingPosition >= this.currentFullText.length) return;
    if (this.els.narratorArea.style.display !== 'flex') return;
    
    // Determina o speaker
    const speaker = this.els.narratorName.textContent === this.villainNarrator.name ? 'villain' : 'byte';
    
    // Retoma a digitação
    this.isTyping = true;
    let i = this.lastTypingPosition;
    
    if (speaker === 'byte' && this.narratorAnimator) {
      this.narratorAnimator.play();
    }
    
    this.typingInterval = setInterval(() => {
      this.els.narratorText.textContent += this.currentFullText.charAt(i);
      
      if (i % 2 === 0 && this.game.audio.globalVolume > 0) {
        const tone = speaker === 'villain' ? 'low' : 'high';
        this.game.audio.playTypingBeep(tone);
      }
      
      i++;
      if (i >= this.currentFullText.length) {
        clearInterval(this.typingInterval);
        this.isTyping = false;
        this.lastTypingPosition = undefined;
        if (speaker === 'byte' && this.narratorAnimator) {
          this.narratorAnimator.stop();
        }
      }
    }, this.config.narrator.typing_speed);
  }

  // --- O Local central que controla a troca de telas ---
  showScreen(screenId) {
    // 1. Sempre que mudarmos de tela visualmente, paramos qualquer fala anterior
    this.game.audio.stopSpeech();

    // 2. Paramos a animação de digitação e do sprite
    this.stopTypingAnimation();

    // 3. Esconde a caixa de diálogo para não ficar "sobra" de texto da tela anterior
    if (this.els.narratorArea) {
      this.els.narratorArea.style.display = "none";
    }

    // Lógica original de troca de classes
    document
      .querySelectorAll(".screen")
      .forEach((s) => (s.style.display = "none"));
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.remove("active"));

    const target = document.getElementById(screenId);
    if (target) {
      target.style.display = "flex";
      setTimeout(() => target.classList.add("active"), 10);
    }

    if (screenId === "game-ui") {
      document.getElementById("game-ui").style.display = "block";
    }
  }

  runBootSequence(audioController, onComplete, customText) {
    const textToShow = customText || this.config.narrator.intro_text;
    const els = {
      animation: document.getElementById("boot-animation"),
      byteContainer: document.querySelector(".boot-byte-container"),
      pulse: document.querySelector(".boot-pulse"),
      sprite: document.getElementById("boot-byte-sprite"),
      dialogContainer: document.getElementById("boot-dialog-container"),
      matrix: document.getElementById("matrix-bg"),
    };

    if (els.matrix) {
      els.matrix.classList.remove("hidden-matrix");
      els.matrix.style.opacity = "0.4";
    }

    const existingNarrator = document.getElementById("boot-narrator");
    if (existingNarrator) existingNarrator.remove();
    els.dialogContainer.innerHTML = "";
    els.dialogContainer.classList.remove("visible");

    if (els.sprite) {
      els.sprite.style.backgroundPosition = "0% 0%";
      els.sprite.classList.remove("byte-pulsing");
    }

    els.animation.style.display = "flex";
    els.pulse.style.display = "block";
    els.byteContainer.style.display = "none";

    setTimeout(() => {
      els.pulse.style.display = "none";
      els.byteContainer.style.display = "block";

      const bootAnimator = new SpriteAnimator(els.sprite, {
        ...this.config.theme.assets.narrator_sprite_config,
        fps: 12,
      });

      bootAnimator.addClass("byte-pulsing");

      const narratorClone = this.els.narratorArea.cloneNode(true);
      this._setupBootDialogClone(narratorClone);

      els.dialogContainer.appendChild(narratorClone);

      const cloneText = narratorClone.querySelector("#narrator-text");
      const cloneBtn = narratorClone.querySelector("#btn-next-dialog");

      setTimeout(() => {
        bootAnimator.removeClass("byte-pulsing");
        bootAnimator.play();
        els.dialogContainer.classList.add("visible");
        audioController.speak(textToShow, "byte");
        cloneText.textContent = "";

        let i = 0;
        const interval = setInterval(() => {
          if (i < textToShow.length) {
            cloneText.textContent += textToShow.charAt(i);
            if (i % 2 === 0) audioController.playTypingBeep("high");
            i++;
          } else {
            clearInterval(interval);
            bootAnimator.stop();
          }
        }, this.config.narrator.typing_speed);

        cloneBtn.onclick = () => {
          if (i < textToShow.length) {
            clearInterval(interval);
            cloneText.textContent = textToShow;
            bootAnimator.stop();
            i = textToShow.length;
            audioController.stopSpeech();
          } else {
            clearInterval(interval);
            bootAnimator.stop();
            els.animation.style.display = "none";
            audioController.stopSpeech();

            if (document.getElementById("boot-narrator")) {
              document.getElementById("boot-narrator").remove();
            }
            if (onComplete) onComplete();
          }
        };
      }, 2000);
    }, 2000);
  }

  _setupBootDialogClone(clone) {
    clone.id = "boot-narrator";
    clone.style.position = "relative";
    clone.style.bottom = "0";
    clone.style.left = "0";
    clone.style.transform = "none";
    clone.style.margin = "0 auto";
    clone.style.display = "flex";
    clone.style.width = "100%";

    const sprite = clone.querySelector("#narrator-sprite");
    if (sprite) sprite.style.display = "none";

    const name = clone.querySelector("#narrator-name");
    if (name) name.textContent = this.config.narrator.name;

    const text = clone.querySelector("#narrator-text");
    if (text) text.textContent = "";
  }

  updateTracker(score, percent, sceneId) {
    this.els.score.textContent = score;
    this.els.progress.textContent = percent + "%";

    if (percent === 100 && sceneId) {
      this.highlightQuizHotspot();
    }
  }

  showNarrator(text, callback, speaker = "byte") {
    if (speaker === "villain") {
      this.els.narratorName.textContent = this.villainNarrator.name;
      this.els.narratorSprite.style.display = "none";
      this.els.narratorArea.style.justifyContent = "center";
    } else {
      this.els.narratorName.textContent = this.defaultNarrator.name;
      this.els.narratorSprite.style.display = "block";
      this.els.narratorSprite.style.backgroundImage = `url('${this.defaultNarrator.image}')`;
      this.els.narratorArea.style.justifyContent = "flex-start";

      if (this.narratorAnimator) {
        this.narratorAnimator.stop();
      }
    }

    // Garante que para a fala anterior antes de começar a nova
    this.game.audio.speak(text, speaker);

    this.pendingCallback = callback;
    this.els.narratorArea.style.display = "flex";
    this.els.narratorText.textContent = "";
    this.currentFullText = text;
    this.isTyping = true;

    if (speaker === "byte" && this.narratorAnimator) {
      this.narratorAnimator.play();
    }

    let i = 0;
    if (this.typingInterval) clearInterval(this.typingInterval);

    this.typingInterval = setInterval(() => {
      this.els.narratorText.textContent += text.charAt(i);

      if (i % 2 === 0 && this.game.audio.globalVolume > 0) {
        const tone = speaker === "villain" ? "low" : "high";
        this.game.audio.playTypingBeep(tone);
      }

      i++;
      if (i >= text.length) {
        clearInterval(this.typingInterval);
        this.isTyping = false;
        if (speaker === "byte" && this.narratorAnimator) {
          this.narratorAnimator.stop();
        }
      }
    }, this.config.narrator.typing_speed);
  }

  renderLevelSelect(cards, backgroundSrc, onSelect) {
    this.updateBackground(backgroundSrc);
    this.els.cardsContainer.innerHTML = "";
    cards.forEach((card) => {
      const el = document.createElement("div");
      el.className = "level-card";
      el.innerHTML = `
                <img src="${card.image}">
                <p><strong>${card.label}</strong><br><small>${card.description}</small></p>
            `;
      el.onclick = () => onSelect(card);
      this.els.cardsContainer.appendChild(el);
    });
    this.showScreen("level-select");
  }

  updateBackground(src) {
    const container = document.getElementById("dynamic-background");
    if (!container || !src) return;

    container.innerHTML = "";

    if (src.endsWith(".mp4") || src.endsWith(".webm")) {
      const video = document.createElement("video");
      video.src = src;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      container.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = src;
      container.appendChild(img);
    }
  }

  highlightQuizHotspot() {
    const quizHotspots = document.querySelectorAll(
      ".hotspot .fa-clipboard-check, .hotspot .fa-bolt",
    );

    quizHotspots.forEach((icon) => {
      const hotspotButton = icon.closest(".hotspot-button");
      if (hotspotButton) {
        hotspotButton.style.animation = "pulseQuiz 1.5s infinite";
        // hotspotButton.style.boxShadow = "0 0 30px var(--primary-color)";
        // hotspotButton.style.borderColor = "var(--primary-color)";
      }
    });

    if (!document.querySelector("#quiz-pulse-style")) {
      const style = document.createElement("style");
      style.id = "quiz-pulse-style";
      style.textContent = `
        @keyframes pulseQuiz {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.08); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  showQuiz(quizData, onCompleteQuiz) {
    this.els.quizOverlay.style.display = "flex";
    this.els.quizOverlay.style.zIndex = "10000";

    const qElement = document.getElementById("quiz-question");
    const optsElement = document.getElementById("quiz-options");

    document.body.classList.add("quiz-active");

    let poolDePerguntas = [...quizData.questions];

    for (let i = poolDePerguntas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [poolDePerguntas[i], poolDePerguntas[j]] = [
        poolDePerguntas[j],
        poolDePerguntas[i],
      ];
    }

    const limite = quizData.questions_count || poolDePerguntas.length;
    const selectedQuestions = poolDePerguntas.slice(0, limite);

    let currentQuestionIndex = 0;
    let mistakesInThisQuiz = 0;

    const totalQuestions = selectedQuestions.length;

    const renderQuestion = () => {
      if (currentQuestionIndex >= totalQuestions) {
        this.showMissionReport(
          mistakesInThisQuiz,
          totalQuestions,
          onCompleteQuiz,
        );
        return;
      }

      const q = selectedQuestions[currentQuestionIndex];

      qElement.textContent = `<span style="color: var(--accent-color);">Questão ${currentQuestionIndex + 1}/${totalQuestions}:</span> ${q.text}`;
      optsElement.innerHTML = "";

      const shuffledOptions = [...q.options];
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [
          shuffledOptions[j],
          shuffledOptions[i],
        ];
      }

      shuffledOptions.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-opt";
        btn.textContent = opt.text;

        btn.onclick = () => {
          const allBtns = optsElement.querySelectorAll("button");
          allBtns.forEach((b) => (b.disabled = true));

          if (opt.correct) {
            btn.classList.add("correct");

            this.showNarrator(
              q.feedback_correct || this.config.gameplay.default_quiz_correct,
              () => {
                currentQuestionIndex++;
                renderQuestion();
              },
              "byte",
            );
          } else {
            btn.classList.add("wrong");
            mistakesInThisQuiz++;

            this.showNarrator(
              q.feedback_wrong || this.config.gameplay.default_quiz_wrong,
              () => {
                allBtns.forEach((b) => {
                  if (!b.classList.contains("wrong")) b.disabled = false;
                });
              },
              "byte",
            );
          }
        };
        optsElement.appendChild(btn);
      });
    };

    renderQuestion();
  }

  showMissionReport(mistakes, totalQuestions, onCloseReport) {
    const qElement = document.getElementById("quiz-question");
    const optsElement = document.getElementById("quiz-options");

    this.els.quizOverlay.style.display = "flex";
    this.els.quizOverlay.style.zIndex = "10000";

    const scene = this.game?.state?.currentSceneId;
    const hotspots =
      this.game?.config?.scenes?.find((s) => s.id === scene)?.hotspots || [];
    const totalHotspots = hotspots.filter((h) => h.action !== "quiz").length;
    const exploredHotspots = this.game?.state
      ? hotspots.filter((h) => this.game.state.visitedHotspots.has(h.id)).length
      : 0;

    const timeSpent = this.game?.state?.getElapsedTime() || "0s";
    const correctAnswers = totalQuestions - mistakes;
    const accuracy =
      totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;

    qElement.textContent = "RELATÓRIO DE MISSÃO";
    optsElement.innerHTML = "";

    const container = document.createElement("div");
    container.style.cssText = `
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 10px;
        border: 1px solid var(--primary-color);
    `;

    container.classList.add("mission-report-container");

    const statsGrid = document.createElement("div");
    statsGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        width: 100%;
    `;

    const timeCard = document.createElement("div");
    timeCard.style.cssText = `
        background: var(--glass-bg);
        border: 1px solid var(--primary-color);
        border-radius: 10px;
        padding: 15px;
        text-align: center;
        backdrop-filter: blur(5px);
    `;
    timeCard.innerHTML = `
        <div style="color: var(--accent-color); font-size: 0.8rem; margin-bottom: 5px;">⏱️ TEMPO</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: var(--primary-color);">${timeSpent}</div>
    `;

    const scoreCard = document.createElement("div");
    scoreCard.style.cssText = timeCard.style.cssText;
    scoreCard.innerHTML = `
        <div style="color: var(--accent-color); font-size: 0.8rem; margin-bottom: 5px;">🎯 PONTOS</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: var(--primary-color);">${this.game?.state?.score || 0}</div>
    `;

    const explorationCard = document.createElement("div");
    explorationCard.style.cssText = timeCard.style.cssText;
    explorationCard.innerHTML = `
        <div style="color: var(--accent-color); font-size: 0.8rem; margin-bottom: 5px;">🔍 EXPLORAÇÃO</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${exploredHotspots}/${totalHotspots}</div>
        <div style="font-size: 0.7rem; opacity: 0.7;">locais</div>
    `;

    const quizCard = document.createElement("div");
    quizCard.style.cssText = timeCard.style.cssText;
    quizCard.innerHTML = `
        <div style="color: var(--accent-color); font-size: 0.8rem; margin-bottom: 5px;">❓ QUIZ</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${correctAnswers}/${totalQuestions}</div>
        <div style="font-size: 0.7rem; opacity: 0.7;">acertos</div>
    `;

    statsGrid.appendChild(timeCard);
    statsGrid.appendChild(scoreCard);
    statsGrid.appendChild(explorationCard);
    statsGrid.appendChild(quizCard);

    const divider = document.createElement("div");
    divider.style.cssText = `
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
        margin: 10px 0;
    `;

    const statusCard = document.createElement("div");
    statusCard.style.cssText = `
        background: var(--glass-bg);
        border: 1px solid ${accuracy === 100 ? "var(--success-color)" : accuracy >= 70 ? "var(--accent-color)" : "var(--error-color)"};
        border-radius: 10px;
        padding: 20px;
        text-align: center;
        backdrop-filter: blur(5px);
        width: 100%;
    `;

    statusCard.innerHTML = `
        <div style="font-size: 1.3rem; font-weight: bold; color: ${accuracy === 100 ? "var(--success-color)" : accuracy >= 70 ? "var(--accent-color)" : "var(--error-color)"}; margin-bottom: 5px;">
            ${accuracy === 100 ? "🏆 PERFEITO!" : accuracy >= 70 ? "📊 ESTÁVEL" : "⚠️ INSTÁVEL"}
        </div>
        <div style="font-size: 1rem; opacity: 0.9;">Precisão: ${accuracy}%</div>
        <div style="font-size: 0.9rem; opacity: 0.7; margin-top: 5px;">
            ${mistakes === 0 ? "Nenhum erro" : `${mistakes} erro(s)`}
        </div>
    `;

    const closeBtn = document.createElement("button");
    closeBtn.className = "cta-button";
    closeBtn.textContent = "FINALIZAR MISSÃO";
    closeBtn.style.cssText = `
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
    `;

    closeBtn.onclick = () => {
      document.body.classList.remove("quiz-active");

      this.els.quizOverlay.style.display = "none";

      const quizHotspot = document.querySelector('.hotspot .fa-clipboard-check, .hotspot .fa-bolt');
      if (quizHotspot) {
        quizHotspot.closest('.hotspot').classList.add('quiz-completed');
      }
      onCloseReport(true);
    };

    container.appendChild(statsGrid);
    container.appendChild(divider);
    container.appendChild(statusCard);

    const btnWrapper = document.createElement("div");
    btnWrapper.style.cssText =
      "display: flex; justify-content: center; width: 100%; margin-top: 10px;";
    btnWrapper.appendChild(closeBtn);
    container.appendChild(btnWrapper);

    optsElement.appendChild(container);
  }
}
