class AudioController {
  constructor() {
    this.bgm = new Audio();
    this.bgm.loop = true;
    this.bgm.volume = 0.5;
    this.isLocked = true;
  }

  unlock() {
    if (this.isLocked) {
      this.bgm
        .play()
        .then(() => {
          this.isLocked = false;
        })
        .catch((e) => {
          console.log("Aguardando interação do usuário para áudio...");
        });
    }
  }

  // --- NOVO MÉTODO PARA O SLIDER DE VOLUME ---
  setGlobalVolume(val) {
    this.bgm.volume = val;
    this.globalVolume = val;
  }

  playBGM(src) {
    if (!src) return;
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
    // Usa o volume global se definido, senão usa 0.8
    sfx.volume = this.globalVolume !== undefined ? this.globalVolume : 0.8;
    sfx.play().catch((e) => console.warn("SFX bloqueado"));
  }
}
