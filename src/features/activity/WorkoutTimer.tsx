import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { Card, CardHeader, ProgressRing, Segmented, Stepper } from '@/components/ui/primitives';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function beep(freq = 880) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
    navigator.vibrate?.(120);
  } catch {
    /* audio is optional */
  }
}

export function WorkoutTimer({ onLog, presetMinutes }: { onLog: (minutes: number) => void; presetMinutes?: { minutes: number; key: number } }) {
  const [mode, setMode] = useState<'countdown' | 'stopwatch' | 'interval'>('stopwatch');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [countdownMin, setCountdownMin] = useState(20);
  const [work, setWork] = useState(40);
  const [rest, setRest] = useState(20);
  const [rounds, setRounds] = useState(8);
  const startedAt = useRef<number | null>(null);
  const base = useRef(0);
  const lastPhase = useRef('');

  useEffect(() => {
    if (presetMinutes) {
      setMode('countdown');
      setCountdownMin(presetMinutes.minutes);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetMinutes?.key]);

  useEffect(() => {
    if (!running) return;
    startedAt.current = performance.now();
    const id = window.setInterval(() => {
      setElapsed(base.current + (performance.now() - (startedAt.current ?? 0)) / 1000);
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const total = mode === 'countdown' ? countdownMin * 60 : mode === 'interval' ? rounds * (work + rest) : Infinity;
  const done = elapsed >= total;

  useEffect(() => {
    if (done && running) {
      setRunning(false);
      base.current = total;
      setElapsed(total);
      beep(660);
    }
  }, [done, running, total]);

  // Interval phase tracking
  let phase = '';
  let phaseLeft = 0;
  let round = 0;
  if (mode === 'interval') {
    const cycle = work + rest;
    const t = Math.min(elapsed, total - 0.001);
    round = Math.floor(t / cycle) + 1;
    const within = t % cycle;
    phase = within < work ? 'Work' : 'Rest';
    phaseLeft = within < work ? work - within : cycle - within;
  }
  useEffect(() => {
    if (mode === 'interval' && running && phase && phase !== lastPhase.current) {
      if (lastPhase.current) beep(phase === 'Work' ? 880 : 520);
      lastPhase.current = phase;
    }
  }, [phase, running, mode]);

  function toggle() {
    if (running) {
      base.current = elapsed;
      setRunning(false);
    } else {
      if (done) reset();
      setRunning(true);
    }
  }
  function reset() {
    setRunning(false);
    base.current = 0;
    lastPhase.current = '';
    setElapsed(0);
  }

  const display = mode === 'countdown' ? mmss(Math.max(0, total - elapsed)) : mode === 'interval' ? mmss(Math.max(0, phaseLeft)) : mmss(elapsed);
  const progress = mode === 'stopwatch' ? (elapsed % 60) / 60 : elapsed / total;
  const minutesDone = Math.max(1, Math.round(elapsed / 60));

  return (
    <Card aria-label="Workout timer">
      <CardHeader icon={<Timer className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Timer" title="Time your session" />
      <Segmented
        label="Timer mode"
        size="sm"
        value={mode}
        onChange={(m) => {
          setMode(m);
          reset();
        }}
        options={[
          { value: 'stopwatch', label: 'Stopwatch' },
          { value: 'countdown', label: 'Countdown' },
          { value: 'interval', label: 'Intervals' },
        ]}
      />
      <div className="mt-5 flex flex-col items-center">
        <ProgressRing value={progress} size={176} stroke={12} color={phase === 'Rest' ? '#5F909C' : '#DE925C'} track="#F3ECDF" label="Timer progress">
          <span className="num font-display text-4xl font-semibold" aria-live="off">
            {display}
          </span>
          <span className="mt-1 text-xs font-semibold text-forest-500">
            {mode === 'interval' ? `${phase || 'Work'} · round ${Math.min(round || 1, rounds)}/${rounds}` : done ? 'Done. Well moved!' : running ? 'Keep going' : 'Ready'}
          </span>
        </ProgressRing>
        <div className="mt-5 flex gap-3">
          <button className="btn-icon h-12 w-12 border border-cream-300 bg-white" onClick={reset} aria-label="Reset timer">
            <RotateCcw className="h-5 w-5" />
          </button>
          <button className="btn h-12 bg-clay-400 px-8 text-white hover:bg-clay-500" onClick={toggle}>
            {running ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
            {running ? 'Pause' : done ? 'Restart' : elapsed > 0 ? 'Resume' : 'Start'}
          </button>
        </div>
      </div>
      {!running && elapsed === 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-4">
          {mode === 'countdown' && <Stepper label="minutes" value={countdownMin} onChange={setCountdownMin} min={1} max={180} format={(n) => `${n} min`} />}
          {mode === 'interval' && (
            <>
              <div className="text-center">
                <p className="mb-1 text-xs text-forest-500">Work</p>
                <Stepper label="work seconds" value={work} onChange={setWork} min={10} max={300} step={5} format={(n) => `${n}s`} />
              </div>
              <div className="text-center">
                <p className="mb-1 text-xs text-forest-500">Rest</p>
                <Stepper label="rest seconds" value={rest} onChange={setRest} min={5} max={300} step={5} format={(n) => `${n}s`} />
              </div>
              <div className="text-center">
                <p className="mb-1 text-xs text-forest-500">Rounds</p>
                <Stepper label="rounds" value={rounds} onChange={setRounds} min={1} max={30} />
              </div>
            </>
          )}
        </div>
      )}
      {elapsed >= 60 && !running && (
        <button className="btn-secondary mt-5 w-full" onClick={() => onLog(minutesDone)}>
          Log {minutesDone} minute{minutesDone === 1 ? '' : 's'} of activity
        </button>
      )}
    </Card>
  );
}
