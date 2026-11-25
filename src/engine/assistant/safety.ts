/**
 * Detects messages the assistant must handle with a fixed, safe response
 * instead of normal coaching (and instead of sending them to an LLM).
 */

export type SafetyConcern = 'crisis' | 'disordered_eating' | 'compensation' | 'medical' | 'supplement' | 'extreme_diet';

const PATTERNS: { kind: SafetyConcern; re: RegExp }[] = [
  { kind: 'crisis', re: /\b(suicid\w*|kill (my ?self|me)|end (my|it all)|self[- ]?harm|hurt(ing)? my ?self|cut(ting)? my ?self|don'?t want to (live|be alive)|want to die)\b/i },
  {
    kind: 'disordered_eating',
    re: /\b(starv\w*|stop(ped)? eating|not eat(ing)? (anything|at all|for \w+)|eat(ing)? nothing|skip(ping)? (all )?(my )?meals? (to|so)|purg\w*|throw(ing)? up after|make my ?self (throw up|vomit|sick)|vomit\w* after|laxative\w*|binge\w*|hate my body|disgusted with my ?self|feel (so |really )?fat|i'?m (so |too )?fat|too fat|only (drink|have) water|water fast\w*|eat(ing)? (only )?(one|1) meal a day to lose|(?:[1-7]\d\d|[1-9]\d) ?(k?cals?|calories) a day)\b/i,
  },
  {
    kind: 'compensation',
    re: /\b(burn (it|this|that|them|those|these|all of (it|that))? ?off|work (it|this|that) off|make up for (eating|what i ate|it)|compensate|exercise (it )?off|run (it )?off|undo (the|what i ate|my)|earn (my|the) (food|meal|dinner))\b/i,
  },
  { kind: 'extreme_diet', re: /\b(lose \d+ ?(kg|kgs|kilo\w*|pounds|lbs)( in| within)? (a |one |\d+ )?(day|days|week|weeks|month)|crash diet|lose weight (really )?fast|lose weight quickly|flat (belly|stomach) in|detox diet|(?:8|9|10)00 calorie diet|fast(ing)? for (\d+|two|three|several) days)\b/i },
  {
    kind: 'medical',
    re: /\b(diabet\w*|blood sugar|sugar level\w*|insulin|metformin|thyroid|hypothyroid\w*|pcos|pcod|kidney|renal|dialysis|liver|fatty liver|hypertension|blood pressure|high bp|low bp|cholesterol|heart (disease|problem|condition|attack)|cancer|chemo\w*|anemi\w*|anaemi\w*|haemoglobin|hemoglobin|gout|uric acid|ibs|celiac|coeliac|crohn\w*|ulcer\w*|gastritis|acid reflux|gerd|pregnan\w*|breastfeed\w*|lactat\w*|medication\w*|medicine\w*|tablets?|diagnos\w*|symptom\w*|allergic reaction|food poisoning)\b/i,
  },
  { kind: 'supplement', re: /\b(protein powder|whey|supplement\w*|creatine|steroid\w*|fat burner\w*|diet pill\w*|weight loss pill\w*|mass gainer|pre[- ]?workout|slimming (tea|pill)\w*)\b/i },
];

export function detectSafetyConcern(text: string): SafetyConcern | null {
  for (const { kind, re } of PATTERNS) if (re.test(text)) return kind;
  return null;
}

export const HELPLINES = {
  teleManas: 'Tele-MANAS (free, 24×7 mental health support in India): 14416 or 1-800-891-4416',
  emergency: 'In an emergency, call 112',
};
