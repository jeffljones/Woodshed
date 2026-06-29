// Practice console (DESIGN.md §14 step 7, D): a Web Audio metronome + tuning reference tones.
// No data, no network — works offline, opened as a modal from the header.
let ctx: AudioContext | null = null;
function audio(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// A short shaped tone (metronome click) or a sustained reference pitch.
function tone(freq: number, dur: number, when = 0, gain = 0.2, type: OscillatorType = 'sine'): void {
  const ac = audio(); const t = ac.currentTime + when;
  const osc = ac.createOscillator(); const g = ac.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t); osc.stop(t + dur + 0.03);
}

const STRINGS: [string, number][] = [
  ['E2', 82.41], ['A2', 110.0], ['D3', 146.83], ['G3', 196.0], ['B3', 246.94], ['E4', 329.63],
];

export function openPractice(): void {
  let bpm = 100, beatsPerBar = 4, running = false;
  let nextNoteTime = 0, beat = 0, timer = 0;
  const LOOKAHEAD = 25, AHEAD = 0.12; // ms poll, seconds scheduled ahead

  const backdrop = document.createElement('div'); backdrop.className = 'share-backdrop';
  const sheet = document.createElement('div'); sheet.className = 'share-sheet practice';

  const title = document.createElement('h2'); title.className = 'share-title'; title.textContent = 'Practice';

  // ---- metronome ----
  const bpmVal = document.createElement('b'); bpmVal.className = 'bpm-val';
  const dots = document.createElement('div'); dots.className = 'beat-dots';
  function buildDots() {
    dots.innerHTML = '';
    for (let i = 0; i < beatsPerBar; i++) { const d = document.createElement('span'); d.className = 'beat-dot'; dots.appendChild(d); }
  }
  function flash(i: number) {
    const ds = dots.children;
    for (let k = 0; k < ds.length; k++) ds[k].classList.toggle('on', k === i);
  }
  function schedule() {
    const ac = audio();
    while (nextNoteTime < ac.currentTime + AHEAD) {
      const accent = beat % beatsPerBar === 0;
      tone(accent ? 1600 : 1000, 0.03, nextNoteTime - ac.currentTime, accent ? 0.32 : 0.18, 'square');
      const at = beat % beatsPerBar;
      window.setTimeout(() => running && flash(at), Math.max(0, (nextNoteTime - ac.currentTime) * 1000));
      nextNoteTime += 60 / bpm; beat++;
    }
    timer = window.setTimeout(schedule, LOOKAHEAD);
  }
  const startBtn = document.createElement('button');
  function setBpm(v: number) { bpm = Math.max(40, Math.min(240, v)); bpmVal.textContent = String(bpm); }
  function start() { if (running) return; running = true; beat = 0; nextNoteTime = audio().currentTime + 0.06; schedule(); startBtn.textContent = '⏸ Stop'; startBtn.classList.add('on'); }
  function stop() { running = false; clearTimeout(timer); flash(-1); startBtn.textContent = '▶ Start'; startBtn.classList.remove('on'); }
  startBtn.className = 'metro-start'; startBtn.textContent = '▶ Start';
  startBtn.onclick = () => (running ? stop() : start());

  const down = document.createElement('button'); down.textContent = '−'; down.onclick = () => setBpm(bpm - 4);
  const up = document.createElement('button'); up.textContent = '+'; up.onclick = () => setBpm(bpm + 4);
  const bpmRow = document.createElement('div'); bpmRow.className = 'metro-row';
  const lab = document.createElement('span'); lab.className = 'metro-lab'; lab.append(bpmVal, document.createTextNode(' BPM'));
  bpmRow.append(down, lab, up, startBtn);

  // beats-per-bar selector
  const sigRow = document.createElement('div'); sigRow.className = 'metro-sig';
  for (const n of [2, 3, 4, 6]) {
    const b = document.createElement('button'); b.textContent = n + '/4'; b.className = n === beatsPerBar ? 'on' : '';
    b.onclick = () => { beatsPerBar = n; buildDots(); beat = 0; [...sigRow.children].forEach((c, i) => c.classList.toggle('on', [2,3,4,6][i] === n)); };
    sigRow.appendChild(b);
  }

  const metroH = document.createElement('div'); metroH.className = 'practice-sub'; metroH.textContent = 'Metronome';

  // ---- tuner ----
  const tuneH = document.createElement('div'); tuneH.className = 'practice-sub'; tuneH.textContent = 'Tuning (tap a string)';
  const tuneRow = document.createElement('div'); tuneRow.className = 'tune-row';
  for (const [name, freq] of STRINGS) {
    const t = document.createElement('button'); t.textContent = name; t.onclick = () => tone(freq, 1.6, 0, 0.22, 'sine');
    tuneRow.appendChild(t);
  }

  const closeBtn = document.createElement('button'); closeBtn.className = 'share-close'; closeBtn.textContent = 'Done';
  function close() { stop(); backdrop.remove(); }
  closeBtn.onclick = close;

  setBpm(bpm); buildDots();
  sheet.append(title, metroH, bpmRow, sigRow, dots, tuneH, tuneRow, closeBtn);
  backdrop.append(sheet);
  backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
  document.body.append(backdrop);
}
