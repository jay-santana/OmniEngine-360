class UIController {
  constructor() {
    this.els = {
      title: document.getElementById("game-title"),
      narratorArea: document.getElementById("narrator-area"),
      narratorText: document.getElementById("narrator-text"),
      narratorImg: document.getElementById("narrator-img"),
      narratorName: document.getElementById("narrator-name"),
      levelSelect: document.getElementById("level-select"),
      cardsContainer: document.getElementById("cards-container"),
      score: document.getElementById("score-display"),
      progress: document.getElementById("exploration-display"),
      quizOverlay: document.getElementById("quiz-overlay"),
      startScreen: document.getElementById("start-screen"),
      // NOVOS BOTÕES
      btnNext: document.getElementById("btn-next-dialog"),
      btnHome: document.getElementById("btn-home"),
    };
    this.typingInterval = null;
    this.pendingCallback = null; // Guarda a ação para executar ao fechar o diálogo
  }

  // Agora o init recebe também o onHomeClick
  init(config, onStartClick, onHomeClick) {
    this.config = config;
    this.els.title.textContent = config.meta.title;
    this.els.narratorName.textContent = config.narrator.name;
    this.els.narratorImg.src = config.theme.assets.narrator_image;

    document.getElementById("btn-start").onclick = onStartClick;

    // --- CONFIGURAÇÃO DO BOTÃO HOME ---
    if (this.els.btnHome) {
      this.els.btnHome.onclick = onHomeClick;
    }

    // --- CONFIGURAÇÃO DO BOTÃO NEXT (DO NARRADOR) ---
    if (this.els.btnNext) {
      this.els.btnNext.onclick = () => {
        // 1. Para a digitação se ainda estiver rolando
        if (this.typingInterval) clearInterval(this.typingInterval);

        // 2. Esconde o diálogo (desbloqueia a visão)
        this.els.narratorArea.style.display = "none";

        // 3. Executa a função de retorno (se houver) e limpa
        if (this.pendingCallback) {
          const callback = this.pendingCallback;
          this.pendingCallback = null;
          callback();
        }
      };
    }
  }

  showScreen(screenId) {
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

  updateTracker(score, percent) {
    this.els.score.textContent = score;
    this.els.progress.textContent = percent + "%";
  }

  // --- Narrador ---
  showNarrator(text, callback) {
    // Guarda o callback para ser executado quando clicar no botão "Próximo"
    this.pendingCallback = callback;

    this.els.narratorArea.style.display = "flex";
    this.els.narratorText.textContent = "";

    let i = 0;
    if (this.typingInterval) clearInterval(this.typingInterval);

    this.typingInterval = setInterval(() => {
      this.els.narratorText.textContent += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(this.typingInterval);
      }
    }, this.config.narrator.typing_speed);
  }

  renderLevelSelect(cards, backgroundSrc, onSelect) {
    // 1. Atualiza o fundo (Vídeo ou Imagem)
    this.updateBackground(backgroundSrc);

    // 2. Renderiza os cards normalmente
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

  // --- NOVO MÉTODO PARA GERENCIAR VÍDEO/IMAGEM ---
  updateBackground(src) {
    const container = document.getElementById("dynamic-background");
    if (!container || !src) return;

    container.innerHTML = ""; // Limpa o fundo anterior

    // Verifica se é vídeo (MP4 ou WEBM)
    if (src.endsWith(".mp4") || src.endsWith(".webm")) {
      const video = document.createElement("video");
      video.src = src;
      video.autoplay = true;
      video.loop = true;
      video.muted = true; // OBRIGATÓRIO para autoplay funcionar no Chrome/Edge
      video.playsInline = true; // OBRIGATÓRIO para funcionar no iPhone
      container.appendChild(video);
    }
    // Se não for vídeo, assume que é imagem
    else {
      const img = document.createElement("img");
      img.src = src;
      container.appendChild(img);
    }
  }

  showQuiz(quizData, onAnswer) {
    this.els.quizOverlay.style.display = "flex";
    const qElement = document.getElementById("quiz-question");
    const optsElement = document.getElementById("quiz-options");
    const feedElement = document.getElementById("quiz-feedback");

    let currentQuestionIndex = 0;

    const renderQuestion = () => {
      const q = quizData.questions[currentQuestionIndex];
      qElement.textContent = q.text;
      optsElement.innerHTML = "";
      feedElement.textContent = "";

      q.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-opt";
        btn.textContent = opt.text;
        btn.onclick = () => {
          if (opt.correct) {
            btn.classList.add("correct");
            feedElement.textContent = q.feedback_correct;
            feedElement.style.color = "var(--success-color)";
            setTimeout(() => {
              onAnswer(true);
              this.els.quizOverlay.style.display = "none";
            }, 2000);
          } else {
            btn.classList.add("wrong");
            feedElement.textContent = q.feedback_wrong;
            feedElement.style.color = "var(--error-color)";
            onAnswer(false);
          }
        };
        optsElement.appendChild(btn);
      });
    };

    renderQuestion();
  }
}
