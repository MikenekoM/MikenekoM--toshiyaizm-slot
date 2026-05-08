(function registerSlotAudio(global) {
  const storageKey = "toshiyaizm-slot-audio-muted-v1";

  function create() {
    let context = null;
    let muted = localStorage.getItem(storageKey) === "1";

    function ensureContext() {
      if (!context) {
        const AudioContextCtor = global.AudioContext || global.webkitAudioContext;
        if (!AudioContextCtor) return null;
        context = new AudioContextCtor();
      }
      if (context.state === "suspended") context.resume();
      return context;
    }

    function tone({ frequency = 440, duration = 0.08, gain = 0.04, type = "square", slide = 0 }) {
      if (muted) return;
      const audioContext = ensureContext();
      if (!audioContext) return;
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), now + duration);
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    }

    const patterns = {
      lever: () => tone({ frequency: 160, duration: 0.07, gain: 0.035, type: "sawtooth", slide: 220 }),
      stop: () => tone({ frequency: 340, duration: 0.04, gain: 0.03, type: "square" }),
      strongStop: () => tone({ frequency: 170, duration: 0.12, gain: 0.055, type: "sawtooth", slide: -70 }),
      prebonus: () => tone({ frequency: 82, duration: 0.22, gain: 0.04, type: "triangle", slide: -20 }),
      bonusStart: () => tone({ frequency: 523, duration: 0.16, gain: 0.055, type: "triangle", slide: 260 }),
      battleImpact: () => tone({ frequency: 96, duration: 0.18, gain: 0.07, type: "sawtooth", slide: -45 }),
      continue: () => tone({ frequency: 659, duration: 0.18, gain: 0.055, type: "triangle", slide: 330 }),
      revival: () => {
        tone({ frequency: 120, duration: 0.16, gain: 0.04, type: "triangle", slide: -45 });
        global.setTimeout(() => tone({ frequency: 740, duration: 0.18, gain: 0.055, type: "triangle", slide: 280 }), 130);
      },
      end: () => tone({ frequency: 140, duration: 0.3, gain: 0.05, type: "triangle", slide: -80 }),
      milestone: () => tone({ frequency: 880, duration: 0.26, gain: 0.055, type: "triangle", slide: 320 }),
    };

    return {
      play(id) {
        patterns[id]?.();
      },
      isMuted() {
        return muted;
      },
      setMuted(value) {
        muted = Boolean(value);
        localStorage.setItem(storageKey, muted ? "1" : "0");
      },
      toggleMuted() {
        this.setMuted(!muted);
        return muted;
      },
    };
  }

  global.ToshiyaSlotAudio = { create };
})(globalThis);
