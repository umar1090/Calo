import type { ActivityType, Equipment, FitnessLevel, Intensity } from '../types';

export interface ActivityMeta {
  type: ActivityType;
  label: string;
  defaultIntensity: Intensity;
  met: Record<Intensity, number>;
  strength: boolean;
  boneLoading: boolean;
  requires?: Equipment[];
  /** Body areas this activity loads heavily (used with reported limitations). */
  loads: LimitationKey[];
  sport: boolean;
}

export type LimitationKey = 'knee' | 'back' | 'shoulder' | 'ankle' | 'wrist' | 'breathing' | 'heart';

/** MET values from the Compendium of Physical Activities (Ainsworth et al., 2011), rounded. */
export const ACTIVITIES: Record<ActivityType, ActivityMeta> = {
  walking: { type: 'walking', label: 'Walking', defaultIntensity: 'moderate', met: { light: 2.8, moderate: 3.5, vigorous: 5 }, strength: false, boneLoading: false, loads: [], sport: false },
  running: { type: 'running', label: 'Running / jogging', defaultIntensity: 'vigorous', met: { light: 6, moderate: 8, vigorous: 10 }, strength: false, boneLoading: true, loads: ['knee', 'ankle', 'breathing', 'heart'], sport: false },
  cycling: { type: 'cycling', label: 'Cycling', defaultIntensity: 'moderate', met: { light: 4, moderate: 6.8, vigorous: 8.5 }, strength: false, boneLoading: false, loads: [], sport: false },
  basketball: { type: 'basketball', label: 'Basketball', defaultIntensity: 'vigorous', met: { light: 4.5, moderate: 6.5, vigorous: 8 }, strength: false, boneLoading: true, loads: ['knee', 'ankle', 'wrist'], sport: true },
  football: { type: 'football', label: 'Football', defaultIntensity: 'vigorous', met: { light: 5, moderate: 7, vigorous: 9 }, strength: false, boneLoading: true, loads: ['knee', 'ankle'], sport: true },
  cricket: { type: 'cricket', label: 'Cricket', defaultIntensity: 'moderate', met: { light: 3, moderate: 4.8, vigorous: 6 }, strength: false, boneLoading: true, loads: ['shoulder'], sport: true },
  badminton: { type: 'badminton', label: 'Badminton', defaultIntensity: 'moderate', met: { light: 4.5, moderate: 5.5, vigorous: 7 }, strength: false, boneLoading: true, loads: ['shoulder', 'ankle'], sport: true },
  swimming: { type: 'swimming', label: 'Swimming', defaultIntensity: 'moderate', met: { light: 5, moderate: 6, vigorous: 9.8 }, strength: false, boneLoading: false, loads: ['shoulder'], sport: false },
  gym: { type: 'gym', label: 'Gym / weights', defaultIntensity: 'moderate', met: { light: 3.5, moderate: 5, vigorous: 6 }, strength: true, boneLoading: true, requires: ['gym_access', 'dumbbells'], loads: ['back', 'shoulder', 'wrist'], sport: false },
  bodyweight: { type: 'bodyweight', label: 'Bodyweight workout', defaultIntensity: 'moderate', met: { light: 3.5, moderate: 5, vigorous: 8 }, strength: true, boneLoading: true, loads: ['wrist'], sport: false },
  yoga: { type: 'yoga', label: 'Yoga', defaultIntensity: 'light', met: { light: 2.5, moderate: 3.3, vigorous: 4 }, strength: true, boneLoading: false, loads: [], sport: false },
  stretching: { type: 'stretching', label: 'Stretching / mobility', defaultIntensity: 'light', met: { light: 2.3, moderate: 2.8, vigorous: 3 }, strength: false, boneLoading: false, loads: [], sport: false },
  dance: { type: 'dance', label: 'Dance', defaultIntensity: 'moderate', met: { light: 4, moderate: 5.5, vigorous: 7.3 }, strength: false, boneLoading: true, loads: ['knee', 'ankle'], sport: false },
  other_sport: { type: 'other_sport', label: 'Other sport / active play', defaultIntensity: 'moderate', met: { light: 4, moderate: 6, vigorous: 8 }, strength: false, boneLoading: true, loads: [], sport: true },
};

export interface Exercise {
  id: string;
  name: string;
  focus: 'legs' | 'push' | 'pull' | 'core' | 'full' | 'bone' | 'mobility' | 'balance';
  equipment: Equipment[]; // any one of these is enough; [] = none needed
  minLevel: FitnessLevel;
  dose: Record<FitnessLevel, string>;
  minutes: number;
  avoidFor: LimitationKey[];
  cue: string;
  boneLoading?: boolean;
  /** Not suggested to under-18s (e.g. heavy barbell work without coaching). */
  adultsOnly?: boolean;
}

export const EXERCISES: Exercise[] = [
  { id: 'squat', name: 'Bodyweight squats', focus: 'legs', equipment: [], minLevel: 'beginner', dose: { beginner: '2 × 10', intermediate: '3 × 15', advanced: '4 × 20' }, minutes: 5, avoidFor: ['knee'], cue: 'Sit back as if onto a chair, chest up, knees in line with toes.' },
  { id: 'chair-sit', name: 'Sit-to-stand from a chair', focus: 'legs', equipment: [], minLevel: 'beginner', dose: { beginner: '2 × 8', intermediate: '3 × 12', advanced: '3 × 15' }, minutes: 4, avoidFor: [], cue: 'Stand up without using your hands, sit down slowly.' },
  { id: 'lunge', name: 'Reverse lunges', focus: 'legs', equipment: [], minLevel: 'intermediate', dose: { beginner: '2 × 6 each leg', intermediate: '3 × 10 each leg', advanced: '3 × 14 each leg' }, minutes: 6, avoidFor: ['knee'], cue: 'Step back, lower gently, push through the front heel.' },
  { id: 'glute-bridge', name: 'Glute bridges', focus: 'legs', equipment: [], minLevel: 'beginner', dose: { beginner: '2 × 12', intermediate: '3 × 15', advanced: '3 × 20 (single leg)' }, minutes: 4, avoidFor: [], cue: 'Squeeze your glutes at the top, keep ribs down.' },
  { id: 'wall-pushup', name: 'Wall push-ups', focus: 'push', equipment: [], minLevel: 'beginner', dose: { beginner: '2 × 10', intermediate: '3 × 15', advanced: '3 × 20' }, minutes: 4, avoidFor: ['shoulder', 'wrist'], cue: 'Body in one straight line from head to heels.' },
  { id: 'knee-pushup', name: 'Push-ups (knees or full)', focus: 'push', equipment: [], minLevel: 'intermediate', dose: { beginner: '2 × 5 on knees', intermediate: '3 × 8', advanced: '4 × 15' }, minutes: 5, avoidFor: ['shoulder', 'wrist'], cue: 'Lower your chest between your hands, elbows at about 45°.' },
  { id: 'band-row', name: 'Band or towel rows', focus: 'pull', equipment: ['resistance_band'], minLevel: 'beginner', dose: { beginner: '2 × 12', intermediate: '3 × 15', advanced: '4 × 15' }, minutes: 5, avoidFor: [], cue: 'Pull elbows back and squeeze shoulder blades together.' },
  { id: 'db-row', name: 'Dumbbell rows', focus: 'pull', equipment: ['dumbbells', 'gym_access'], minLevel: 'beginner', dose: { beginner: '2 × 10 each arm (light)', intermediate: '3 × 10 each arm', advanced: '4 × 10 each arm' }, minutes: 6, avoidFor: ['back'], cue: 'Support yourself on a bench or chair, flat back, pull to your hip.' },
  { id: 'superman', name: 'Superman holds', focus: 'pull', equipment: [], minLevel: 'beginner', dose: { beginner: '2 × 8 (2 s hold)', intermediate: '3 × 10 (3 s hold)', advanced: '3 × 12 (5 s hold)' }, minutes: 4, avoidFor: ['back'], cue: 'Lift arms and legs gently, look at the floor.' },
  { id: 'db-press', name: 'Dumbbell shoulder press', focus: 'push', equipment: ['dumbbells', 'gym_access'], minLevel: 'intermediate', dose: { beginner: '2 × 8 (light)', intermediate: '3 × 10', advanced: '4 × 10' }, minutes: 5, avoidFor: ['shoulder', 'back'], cue: 'Brace your core, press straight up without arching your back.' },
  { id: 'goblet-squat', name: 'Goblet squats', focus: 'legs', equipment: ['dumbbells', 'gym_access'], minLevel: 'intermediate', dose: { beginner: '2 × 8 (light)', intermediate: '3 × 10', advanced: '4 × 12' }, minutes: 6, avoidFor: ['knee', 'back'], cue: 'Hold the weight at your chest, sit down between your heels.' },
  { id: 'plank', name: 'Plank', focus: 'core', equipment: [], minLevel: 'beginner', dose: { beginner: '3 × 15 s', intermediate: '3 × 30 s', advanced: '3 × 60 s' }, minutes: 4, avoidFor: ['shoulder', 'wrist'], cue: 'Forearms down, straight line from shoulders to heels.' },
  { id: 'dead-bug', name: 'Dead bugs', focus: 'core', equipment: [], minLevel: 'beginner', dose: { beginner: '2 × 6 each side', intermediate: '3 × 10 each side', advanced: '3 × 12 each side' }, minutes: 4, avoidFor: [], cue: 'Lower back stays pressed to the floor as you move opposite arm and leg.' },
  { id: 'bird-dog', name: 'Bird dogs', focus: 'core', equipment: [], minLevel: 'beginner', dose: { beginner: '2 × 6 each side', intermediate: '3 × 10 each side', advanced: '3 × 12 each side' }, minutes: 4, avoidFor: [], cue: 'Reach long through opposite hand and foot, keep hips level.' },
  { id: 'jumping-jacks', name: 'Jumping jacks', focus: 'bone', equipment: [], minLevel: 'beginner', dose: { beginner: '3 × 20 s', intermediate: '3 × 40 s', advanced: '4 × 45 s' }, minutes: 4, avoidFor: ['knee', 'ankle', 'heart'], cue: 'Land softly on the balls of your feet.', boneLoading: true },
  { id: 'skipping', name: 'Skipping rope', focus: 'bone', equipment: ['skipping_rope'], minLevel: 'beginner', dose: { beginner: '5 × 30 s', intermediate: '6 × 45 s', advanced: '8 × 60 s' }, minutes: 6, avoidFor: ['knee', 'ankle', 'heart'], cue: 'Small, quick hops; rest as long as you need between rounds.', boneLoading: true },
  { id: 'hop-jumps', name: 'Squat jumps / hopping', focus: 'bone', equipment: [], minLevel: 'intermediate', dose: { beginner: '2 × 6', intermediate: '3 × 8', advanced: '3 × 12' }, minutes: 4, avoidFor: ['knee', 'ankle', 'heart'], cue: 'Jump up, land softly with bent knees.', boneLoading: true },
  { id: 'step-ups', name: 'Step-ups on a stair', focus: 'legs', equipment: [], minLevel: 'beginner', dose: { beginner: '2 × 8 each leg', intermediate: '3 × 12 each leg', advanced: '3 × 15 each leg' }, minutes: 5, avoidFor: ['knee'], cue: 'Push through the whole foot on the step; hold a railing if you need.', boneLoading: true },
  { id: 'single-leg-stand', name: 'Single-leg balance', focus: 'balance', equipment: [], minLevel: 'beginner', dose: { beginner: '3 × 20 s each leg', intermediate: '3 × 40 s each leg', advanced: '3 × 60 s eyes closed' }, minutes: 3, avoidFor: [], cue: 'Stand near a wall for support if needed.' },
  { id: 'surya-namaskar', name: 'Surya namaskar', focus: 'full', equipment: [], minLevel: 'beginner', dose: { beginner: '4 rounds, slow', intermediate: '8 rounds', advanced: '12 rounds' }, minutes: 8, avoidFor: ['wrist', 'back'], cue: 'Move with your breath; skip any pose that hurts.' },
  { id: 'cat-cow', name: 'Cat–cow stretch', focus: 'mobility', equipment: [], minLevel: 'beginner', dose: { beginner: '10 slow rounds', intermediate: '10 slow rounds', advanced: '12 slow rounds' }, minutes: 2, avoidFor: [], cue: 'Round and arch your back gently with your breath.' },
  { id: 'hamstring-stretch', name: 'Hamstring & hip stretch', focus: 'mobility', equipment: [], minLevel: 'beginner', dose: { beginner: '2 × 30 s each side', intermediate: '2 × 30 s each side', advanced: '2 × 45 s each side' }, minutes: 3, avoidFor: [], cue: 'Ease in until you feel a stretch, never pain.' },
  { id: 'shoulder-rolls', name: 'Shoulder & neck mobility', focus: 'mobility', equipment: [], minLevel: 'beginner', dose: { beginner: '1 minute', intermediate: '1 minute', advanced: '1 minute' }, minutes: 2, avoidFor: [], cue: 'Slow circles, both directions.' },
  { id: 'childs-pose', name: "Child's pose (balasana)", focus: 'mobility', equipment: [], minLevel: 'beginner', dose: { beginner: '1 minute', intermediate: '1–2 minutes', advanced: '2 minutes' }, minutes: 2, avoidFor: ['knee'], cue: 'Breathe slowly into your back.' },
  { id: 'deadlift-heavy', name: 'Barbell deadlift', focus: 'pull', equipment: ['gym_access'], minLevel: 'advanced', dose: { beginner: '—', intermediate: '3 × 6', advanced: '4 × 5' }, minutes: 8, avoidFor: ['back'], cue: 'Only with good technique; brace and keep the bar close.', adultsOnly: true },
];

const LIMITATION_WORDS: Record<LimitationKey, string[]> = {
  knee: ['knee', 'acl', 'meniscus', 'patella'],
  back: ['back', 'spine', 'disc', 'sciatica', 'lumbar'],
  shoulder: ['shoulder', 'rotator'],
  ankle: ['ankle', 'foot', 'feet', 'heel', 'achilles', 'shin'],
  wrist: ['wrist', 'hand', 'elbow', 'carpal'],
  breathing: ['asthma', 'breath', 'wheez'],
  heart: ['heart', 'cardiac', 'blood pressure', 'hypertension', ' bp', 'chest pain'],
};

export function parseLimitations(text: string | undefined): LimitationKey[] {
  if (!text) return [];
  const t = ` ${text.toLowerCase()} `;
  return (Object.keys(LIMITATION_WORDS) as LimitationKey[]).filter((k) => LIMITATION_WORDS[k].some((w) => t.includes(w)));
}

export const LEVEL_ORDER: Record<FitnessLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 };
