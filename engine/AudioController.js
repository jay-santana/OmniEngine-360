class AudioController {
  constructor() {
    this.bgm = new Audio();
    this.bgm.loop = true;
    this.bgm.volume = 0.2; // Começa baixo

    this.currentAlarm = null; // --- NOVO: Controle de alarme

    this.isLocked = true;
    this.synth = window.speechSynthesis;
    this.audioCtx = null;
    this.globalVolume = 0.5;
  }

  unlock() {
    if (this.isLocked) {
      this.bgm
        .play()
        .then(() => {
          this.isLocked = false;
          if (!this.audioCtx) {
            this.audioCtx = new (
              window.AudioContext || window.webkitAudioContext
            )();
          }
        })
        .catch((e) => {
          console.log("Aguardando interação...");
        });
    }
  }

  setGlobalVolume(val) {
    this.globalVolume = parseFloat(val);
    // Mixagem: Música a 25% do volume mestre
    this.bgm.volume = Math.min(1, this.globalVolume * 0.25);

    // --- NOVO: Atualiza volume do alarme se estiver tocando ---
    if (this.currentAlarm) {
      this.currentAlarm.volume = Math.min(1, this.globalVolume * 0.3);
    }
  }

  // --- NOVO: Tocar Alarme em Loop ---
  playAlarm(src) {
    if (!src) return;
    this.stopAlarm(); // Para anterior

    this.currentAlarm = new Audio(src);
    this.currentAlarm.loop = true; // LOOP INFINITO
    this.currentAlarm.volume = Math.min(1, this.globalVolume * 0.3);
    this.currentAlarm.play().catch((e) => console.warn("Alarme bloqueado"));
  }

  stopAlarm() {
    if (this.currentAlarm) {
      this.currentAlarm.pause();
      this.currentAlarm = null;
    }
  }

  playBGM(src) {
    if (!src) return;
    if (this.bgm.src && this.bgm.src.endsWith(src)) {
      if (this.bgm.paused) this.bgm.play().catch((e) => console.log(e));
      return;
    }
    this.bgm.src = src;
    this.bgm.volume = Math.min(1, this.globalVolume * 0.25);
    this.bgm.play().catch((e) => console.warn("Autoplay bloqueado."));
  }

  stopBGM() {
    this.bgm.pause();
  }

  playSFX(src) {
    if (!src) return;
    const sfx = new Audio(src);
    sfx.volume = Math.min(1, this.globalVolume * 0.7);
    sfx.play().catch((e) => console.warn("SFX bloqueado"));
  }

  playTypingBeep(tone = "high") {
    if (!this.audioCtx || this.globalVolume <= 0) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;

    if (tone === "low") {
      osc.type = "square";
      osc.frequency.setValueAtTime(120, now);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
    }

    gainNode.gain.setValueAtTime(this.globalVolume * 0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  speak(text, character) {
    if (this.globalVolume <= 0) return;
    if (this.synth.speaking) this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = Math.min(1, this.globalVolume * 2);
    utterance.lang = "pt-BR";

    const voices = this.synth.getVoices();
    const voice =
      voices.find((v) => v.name.includes("Google") && v.lang.includes("pt")) ||
      voices.find((v) => v.lang.includes("pt"));
    if (voice) utterance.voice = voice;

    if (character === "villain") {
      utterance.pitch = 0.7;
      utterance.rate = 1.0;
    } else {
      utterance.pitch = 1.2;
      utterance.rate = 1.2;
    }

    this.synth.speak(utterance);
  }

  stopSpeech() {
    if (this.synth.speaking) this.synth.cancel();
  }
}
