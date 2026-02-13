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

    // Configuração do B.Y.T.E.
    this.defaultNarrator = {
      name: config.narrator.name, // "B.Y.T.E."
      image: config.theme.assets.narrator_image // byte-drone.png
    };
    
    // Configuração do GLITCH (vilão)
    this.villainNarrator = {
      name: config.theme.assets.villain_name || "GLITCH",
      image: config.theme.assets.villain_image || ""
    };

    // Inicializa com B.Y.T.E.
    this.setNarrator("byte");

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

  // Destacar quando exploração completa
  updateTracker(score, percent, sceneId) {
    this.els.score.textContent = score;
    this.els.progress.textContent = percent + "%";
    
    // Quando chegar a 100%, destaca o quiz
    if (percent === 100 && sceneId) {
      this.highlightQuizHotspot();
    }
  }

  // Alterna entre o narrador do vilão e do B.Y.T.E. com base no tipor de fala
  setNarrator(type) {
    if (type === "villain") {
      // VILÃO: NÃO mostra imagem, mostra apenas nome
      this.els.narratorName.textContent = this.villainNarrator.name; // "GLITCH"
      
      // CRÍTICO: Esconde a imagem do vilão na caixa de diálogo
      this.els.narratorImg.style.display = 'none';
      
      // Opcional: Ajusta o layout da caixa de diálogo quando não tem imagem
      this.els.narratorArea.style.justifyContent = 'center';
    } else {
      // B.Y.T.E.: Mostra imagem normalmente
      this.els.narratorName.textContent = this.defaultNarrator.name; // "B.Y.T.E."
      this.els.narratorImg.src = this.defaultNarrator.image;
      this.els.narratorImg.style.display = 'block'; // Mostra a imagem
      this.els.narratorArea.style.justifyContent = 'flex-start';
    }
  }

  // Método para garantir que a imagem do B.Y.T.E. seja restaurada
  showNarrator(text, callback, speaker = "byte") {
    // Sempre mostra a imagem do B.Y.T.E. como padrão
    if (speaker === "byte") {
      this.els.narratorImg.style.display = 'block';
      this.els.narratorArea.style.justifyContent = 'flex-start';
    }
    
    this.setNarrator(speaker);
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

  // Destacar que o quiz foi desbloqueado
  highlightQuizHotspot() {
    // Encontra todos os hotspots de quiz
    const quizHotspots = document.querySelectorAll('.hotspot .fa-clipboard-check, .hotspot .fa-bolt');
    
    quizHotspots.forEach(icon => {
      const hotspotButton = icon.closest('.hotspot-button');
      if (hotspotButton) {
        // Adiciona efeito de brilho e pulsação
        hotspotButton.style.animation = 'pulseQuiz 1.5s infinite';
        hotspotButton.style.boxShadow = '0 0 30px var(--primary-color)';
        hotspotButton.style.borderColor = 'var(--primary-color)';
      }
    });
    
    // Adiciona a animação se não existir
    if (!document.querySelector('#quiz-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'quiz-pulse-style';
      style.textContent = `
        @keyframes pulseQuiz {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
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
