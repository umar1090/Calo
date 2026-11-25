import type { ActivityType, Intensity } from '../types';

export interface ActivityMeta {
  type: ActivityType;
  label: string;
  defaultIntensity: Intensity;
  /** MET values (Compendium of Physical Activities, Ainsworth et al. 2011), rounded. */
  met: Record<Intensity, number>;
  /** Counts toward the muscle-strengthening guideline. */
  strength: boolean;
  /** Impact activity that helps build bone (running, jumping, court sports). */
  boneLoading: boolean;
  /** Distance can be logged and is used to work out pace. */
  distance: boolean;
  /** Steps can be logged (converted to distance). */
  steps: boolean;
  sport: boolean;
}

const a = (
  type: ActivityType,
  label: string,
  defaultIntensity: Intensity,
  met: [number, number, number],
  flags: Partial<Pick<ActivityMeta, 'strength' | 'boneLoading' | 'distance' | 'steps' | 'sport'>> = {},
): ActivityMeta => ({
  type,
  label,
  defaultIntensity,
  met: { light: met[0], moderate: met[1], vigorous: met[2] },
  strength: flags.strength ?? false,
  boneLoading: flags.boneLoading ?? false,
  distance: flags.distance ?? false,
  steps: flags.steps ?? false,
  sport: flags.sport ?? false,
});

export const ACTIVITIES: Record<ActivityType, ActivityMeta> = {
  walking: a('walking', 'Walking', 'moderate', [2.8, 3.5, 5], { distance: true, steps: true }),
  running: a('running', 'Running / jogging', 'vigorous', [6, 8, 10], { boneLoading: true, distance: true }),
  cycling: a('cycling', 'Cycling', 'moderate', [4, 6.8, 8.5], { distance: true }),
  swimming: a('swimming', 'Swimming', 'moderate', [5, 6, 9.8], { distance: true }),
  hiking: a('hiking', 'Hiking / trekking', 'moderate', [5.3, 6, 7.8], { boneLoading: true, distance: true }),
  gym: a('gym', 'Gym / weights', 'moderate', [3.5, 5, 6], { strength: true, boneLoading: true }),
  bodyweight: a('bodyweight', 'Bodyweight workout', 'moderate', [3.5, 5, 8], { strength: true, boneLoading: true }),
  hiit: a('hiit', 'HIIT / circuit', 'vigorous', [5, 7, 9], { strength: true, boneLoading: true }),
  yoga: a('yoga', 'Yoga', 'light', [2.5, 3.3, 4], { strength: true }),
  stretching: a('stretching', 'Stretching / mobility', 'light', [2.3, 2.8, 3]),
  skipping: a('skipping', 'Skipping rope', 'vigorous', [8.8, 11, 12.3], { boneLoading: true }),
  stairs: a('stairs', 'Stair climbing', 'moderate', [4, 6, 8.8], { boneLoading: true }),
  aerobics: a('aerobics', 'Zumba / aerobics', 'moderate', [5, 6.5, 7.3], { boneLoading: true }),
  dance: a('dance', 'Dance', 'moderate', [4, 5.5, 7.3], { boneLoading: true }),
  martial_arts: a('martial_arts', 'Martial arts', 'vigorous', [5.3, 7, 10.3], { boneLoading: true, sport: true }),
  cricket: a('cricket', 'Cricket', 'moderate', [3, 4.8, 6], { boneLoading: true, sport: true }),
  football: a('football', 'Football', 'vigorous', [5, 7, 9], { boneLoading: true, sport: true }),
  basketball: a('basketball', 'Basketball', 'vigorous', [4.5, 6.5, 8], { boneLoading: true, sport: true }),
  badminton: a('badminton', 'Badminton', 'moderate', [4.5, 5.5, 7], { boneLoading: true, sport: true }),
  tennis: a('tennis', 'Tennis', 'moderate', [5, 7.3, 8], { boneLoading: true, sport: true }),
  table_tennis: a('table_tennis', 'Table tennis', 'moderate', [3, 4, 5], { sport: true }),
  volleyball: a('volleyball', 'Volleyball', 'moderate', [3, 4, 6], { boneLoading: true, sport: true }),
  kabaddi: a('kabaddi', 'Kabaddi', 'vigorous', [5, 7, 8], { boneLoading: true, sport: true }),
  household: a('household', 'Housework / gardening', 'light', [2.5, 3.5, 4.5]),
  other_sport: a('other_sport', 'Other sport / active play', 'moderate', [4, 6, 8], { boneLoading: true, sport: true }),
};

/** MET by speed (km/h) from the Compendium; each row is [minimum speed, MET]. */
const SPEED_MET: Partial<Record<ActivityType, [number, number][]>> = {
  walking: [[0, 2], [3.2, 2.8], [4, 3], [4.8, 3.5], [5.6, 4.3], [6.4, 5], [7.2, 7], [8, 8.3]],
  running: [[0, 6], [8, 8.3], [8.4, 9], [9.7, 9.8], [10.8, 10.5], [11.3, 11], [12.1, 11.5], [12.9, 11.8], [13.8, 12.3], [14.5, 12.8], [16.1, 14.5]],
  cycling: [[0, 4], [16, 6.8], [19, 8], [22, 10], [25, 12], [30, 15.8]],
  swimming: [[0, 6], [1.8, 8.3], [3, 10]],
};

export function metForSpeed(type: ActivityType, kmh: number): number | undefined {
  const table = SPEED_MET[type];
  if (!table || !(kmh > 0)) return undefined;
  let met = table[0][1];
  for (const [min, m] of table) if (kmh >= min) met = m;
  return met;
}

/** Walking stride is about 41.5% of height. */
export function stepsToKm(steps: number, heightCm: number): number {
  return Math.round(((steps * heightCm * 0.415) / 100 / 1000) * 100) / 100;
}

export function intensityForMet(met: number): Intensity {
  if (met < 3) return 'light';
  if (met < 6) return 'moderate';
  return 'vigorous';
}
