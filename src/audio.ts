type Sound = 'impulsion' | 'fibre' | 'paquets' | 'empty' | 'reload' | 'reloadEnd' | 'impact' | 'hurt' | 'pickup' | 'relay' | 'enemy';
type Preset = [number, number, number, number, OscillatorType];

const music = new Audio();
music.loop = true;
music.preload = 'none';
let musicObjectUrl: string | undefined;
let context: AudioContext | undefined;
let effectsVolume = 0.5;
let musicVolume = 0.15;
music.volume = musicVolume;

export function selectMusic(file: File) {
  music.pause();
  if (musicObjectUrl) URL.revokeObjectURL(musicObjectUrl);
  musicObjectUrl = URL.createObjectURL(file);
  music.src = musicObjectUrl;
}

export function setVolume(channel: 'music' | 'effects', value: number) {
  if (channel === 'music') music.volume = musicVolume = value;
  else effectsVolume = value;
}

export function startAudio() {
  context ??= new AudioContext();
  void context.resume();
  if (music.src) void music.play().catch(() => {});
}

export function pauseAudio() {
  music.pause();
  void context?.suspend();
}

export function sound(name: Sound) {
  if (!context || effectsVolume === 0) return;
  if (context.state === 'suspended') void context.resume();
  const presets: Record<Sound, Preset> = {
    impulsion: [900, 130, 0.17, 0.42, 'sawtooth'],
    fibre: [1700, 210, 0.32, 0.5, 'sawtooth'],
    paquets: [360, 65, 0.38, 0.52, 'square'],
    empty: [130, 95, 0.08, 0.13, 'square'],
    reload: [520, 290, 0.11, 0.12, 'triangle'],
    reloadEnd: [380, 800, 0.15, 0.12, 'triangle'],
    impact: [800, 110, 0.14, 0.38, 'square'],
    hurt: [170, 65, 0.25, 0.21, 'sawtooth'],
    pickup: [550, 1150, 0.21, 0.14, 'sine'],
    relay: [200, 850, 0.58, 0.2, 'triangle'],
    enemy: [380, 105, 0.2, 0.09, 'square'],
  };
  const [start, end, duration, gain, waveform] = presets[name];
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(start, now);
  oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
  envelope.gain.setValueAtTime(Math.max(0.001, gain * effectsVolume), now);
  envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}
