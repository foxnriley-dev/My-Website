import type {
  CaseIntake,
  HoldCode,
  MachineCategory,
  PowerType,
  RiskQuestionId,
  SafetyHold,
  SafetyHoldReason,
} from '@ife/contracts';

export interface RiskQuestion {
  id: RiskQuestionId;
  prompt: string;
  help: string;
  /** Hold raised when the answer is "yes". */
  hold: HoldCode;
  appliesTo: (category: MachineCategory, power: PowerType | null) => boolean;
}

const isFuelish = (p: PowerType | null) => p !== 'electric';

/**
 * Asked at intake and re-evaluated on every material update. None of these ask
 * the owner to approach moving or hot parts; "Cannot safely check" is always offered.
 */
export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: 'fuel_leak_or_smell',
    prompt: 'Is there leaking fuel, or a strong fuel smell?',
    help: 'Look from a safe distance. Do not start the engine to check.',
    hold: 'fuel_leak',
    appliesTo: (_c, p) => isFuelish(p),
  },
  {
    id: 'smoke_or_burning',
    prompt: 'Have you seen smoke, flames, or smelled burning?',
    help: 'Include smoke from wiring, the engine, brakes or a battery.',
    hold: 'smoke_or_fire',
    appliesTo: () => true,
  },
  {
    id: 'battery_damage',
    prompt: 'Is a battery swollen, cracked, leaking, hot, hissing, or damaged after a drop?',
    help: 'This includes e-bike, scooter and power-tool style battery packs.',
    hold: 'battery_damage',
    // Cars, motorcycles and small engines have batteries too.
    appliesTo: () => true,
  },
  {
    id: 'exposed_wiring_or_sparks',
    prompt: 'Are there exposed wires, melted insulation, or sparks?',
    help: 'Do not touch damaged wiring to check.',
    hold: 'electrical_hazard',
    appliesTo: () => true,
  },
  {
    id: 'brakes_or_steering',
    prompt: 'Are the brakes, throttle return, or steering not working normally?',
    help: 'For example: soft or no brakes, throttle sticking open, steering binding or loose.',
    hold: 'brakes_or_steering',
    appliesTo: (c) => c !== 'small_engine',
  },
  {
    id: 'overheating_or_pressure',
    prompt: 'Is anything overheating, boiling over, or under pressure (like a hot radiator)?',
    help: 'Never open a hot radiator or pressurized cap.',
    hold: 'overheating_or_pressure',
    appliesTo: (_c, p) => p !== 'electric',
  },
];

export function riskQuestionsFor(category: MachineCategory, power: PowerType | null): RiskQuestion[] {
  return RISK_QUESTIONS.filter((q) => q.appliesTo(category, power));
}

const HOLD_DETAILS: Record<HoldCode, Omit<SafetyHoldReason, 'source' | 'code'>> = {
  fuel_leak: {
    title: 'Possible fuel leak',
    guidance: [
      'Do not start or run the engine.',
      'Keep sparks, flames, cigarettes and running electrical tools away.',
      'Move to fresh air if you can smell fuel strongly. Clean up spills only if it is safe.',
    ],
    specialistRecommended: false,
  },
  smoke_or_fire: {
    title: 'Smoke, burning or fire reported',
    guidance: [
      'Stop using the machine and move away from it.',
      'If there are flames or the smoke is increasing, leave the area and call 911.',
      'Do not reconnect power or restart it until the cause is found.',
    ],
    specialistRecommended: true,
  },
  battery_damage: {
    title: 'Damaged or unstable battery',
    guidance: [
      'Stop charging and using it. Do not open, puncture or try to repair the battery pack.',
      'If it is hot, swelling, hissing or smoking, move away and call 911.',
      'Store it away from anything flammable and contact a battery specialist or the maker.',
    ],
    specialistRecommended: true,
  },
  electrical_hazard: {
    title: 'Exposed wiring or sparking',
    guidance: [
      'Disconnect the power source only if you can do it without touching damaged parts.',
      'Do not touch exposed or melted wiring.',
    ],
    specialistRecommended: false,
  },
  brakes_or_steering: {
    title: 'Brakes, throttle or steering problem',
    guidance: [
      'Do not ride or drive it until this is fixed and checked.',
      'Brake, throttle and steering faults can cause a crash even at low speed.',
    ],
    specialistRecommended: true,
  },
  overheating_or_pressure: {
    title: 'Overheating or pressure risk',
    guidance: [
      'Shut it off and let it cool completely before touching anything.',
      'Never open a hot radiator, coolant reservoir or pressurized cap.',
    ],
    specialistRecommended: false,
  },
};

/**
 * Conservative wording screen for free-text descriptions. A match raises the
 * hold even if the matching risk question was answered "no" — text and answers
 * that disagree must be clarified, not silently resolved.
 */
const TEXT_PATTERNS: Array<{ code: HoldCode; re: RegExp }> = [
  { code: 'fuel_leak', re: /\b(fuel|gas|gasoline|petrol)\b[^.]{0,30}\b(leak\w*|drip\w*|pouring|spill\w*|smell\w*)|\b(leak\w*|drip\w*)\b[^.]{0,20}\b(fuel|gas|gasoline|petrol)\b/i },
  { code: 'smoke_or_fire', re: /\b(smok(e|ing|y)|flames?|caught fire|on fire|burning smell|smells? (like )?burn\w*)\b/i },
  { code: 'battery_damage', re: /\bbatter(y|ies)\b[^.]{0,40}\b(swell\w*|swollen|puff\w*|bulg\w*|hiss\w*|crack\w*|leak\w*|hot|melt\w*|smok\w*)|\b(swollen|puffy|bulging)\b[^.]{0,20}\bbatter(y|ies)\b/i },
  { code: 'electrical_hazard', re: /\b(sparks?|sparking|arcing|melted (wire|wiring|insulation)|exposed wir\w*|bare wir\w*|shock(ed)?)\b/i },
  {
    code: 'brakes_or_steering',
    re: /\b(no brakes?|lost (my |the )?brakes?|brakes?\b[^.]{0,20}\b(fail\w*|gone|not working|don'?t work|do not work|stopped working|spongy|went soft)|steering\b[^.]{0,20}\b(lock\w*|stuck|fail\w*|loose|binding)|throttle\b[^.]{0,20}\b(stuck|sticks|sticking|stays open))\b/i,
  },
];

/** Excluded from DIY guidance regardless of plan — always specialist handoff. */
export const EXCLUDED_TASK_PATTERNS: Array<{ code: string; re: RegExp; reason: string }> = [
  { code: 'battery_pack_opening', re: /\b(open|rebuild|repack)\w*\b[^.]{0,20}\bbattery pack\b/i, reason: 'Opening battery packs' },
  { code: 'high_voltage', re: /\b(high[- ]voltage|hybrid battery|orange cables?)\b/i, reason: 'High-voltage systems' },
  { code: 'airbag', re: /\b(airbags?|srs)\b/i, reason: 'Airbag systems' },
];

export function screenText(text: string): HoldCode[] {
  const found = new Set<HoldCode>();
  for (const { code, re } of TEXT_PATTERNS) if (re.test(text)) found.add(code);
  return [...found];
}

export function evaluateSafety(
  intake: CaseIntake,
  category: MachineCategory,
  power: PowerType | null,
): SafetyHold {
  const reasons = new Map<HoldCode, SafetyHoldReason>();
  const questions = riskQuestionsFor(category, power);
  const unresolved: RiskQuestionId[] = [];

  for (const q of questions) {
    const answer = intake.risk[q.id];
    if (answer === 'yes') {
      reasons.set(q.hold, { code: q.hold, source: 'risk_answer', ...HOLD_DETAILS[q.hold] });
    } else if (answer !== 'no') {
      // unknown / skipped / cannot_safely_check / unanswered — uncertainty, not safety.
      unresolved.push(q.id);
    }
  }

  const text = [intake.symptoms.concern, intake.symptoms.recentWork, intake.symptoms.previousAttempts].join('\n');
  for (const code of screenText(text)) {
    if (!reasons.has(code)) reasons.set(code, { code, source: 'description', ...HOLD_DETAILS[code] });
  }

  return { active: reasons.size > 0, reasons: [...reasons.values()], unresolvedChecks: unresolved };
}
