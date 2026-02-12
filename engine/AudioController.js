class AudioController {
  constructor() {
    this.bgm = new Audio();
    this.bgm.loop = true;
    this.bgm.volume = 0.5;
    // Guardamos se o áudio está bloqueado pelo navegador
    this.isLocked = true;
  }

  // Tenta desbloquear o áudio no primeiro clique do usuário
  unlock() {
    if (this.isLocked) {
      // Tenta tocar um som mudo ou dar play/pause para destravar o contexto
      this.bgm
        .play()
        .then(() => {
          this.isLocked = false;
        })
        .catch((e) => {
          // Ainda bloqueado, continua tentando no próximo clique
          console.log("Aguardando interação do usuário para áudio...");
        });
    }
  }

  playBGM(src) {
    if (!src) return;

    // Se a música for a mesma, não faz nada (continua tocando)
    // Usamos endsWith para comparar o final do caminho (ex: 'menu.mp3')
    if (this.bgm.src && this.bgm.src.endsWith(src)) {
      if (this.bgm.paused) this.bgm.play().catch((e) => console.log(e));
      return;
    }

    this.bgm.src = src;
    this.bgm.play().catch((e) => {
      console.warn(
        "Autoplay bloqueado. O áudio iniciará na primeira interação.",
      );
    });
  }

  stopBGM() {
    this.bgm.pause();
    this.bgm.currentTime = 0;
  }

  playSFX(src) {
    if (!src) return;
    const sfx = new Audio(src);
    sfx.volume = 0.8;
    sfx.play().catch((e) => console.warn("SFX bloqueado"));
  }
}
