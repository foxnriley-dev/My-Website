import type { CaseCapabilities, SafetyHold } from '@ife/contracts';

export interface FeatureSwitches {
  assessment: boolean;
  parts: boolean;
  videos: boolean;
  guides: boolean;
}

/** Server-derived effective capabilities. A model or client can never grant these. */
export function effectiveCaseCapabilities(switches: FeatureSwitches, hold: SafetyHold): CaseCapabilities {
  const notBuilt = (what: string, milestone: number) => ({
    available: false,
    reason: 'not_built' as const,
    message: `${what} is not available in this build yet (planned for milestone ${milestone}). Your case is saved and will be ready for it.`,
  });
  const held = {
    available: false,
    reason: 'safety_hold' as const,
    message: 'Paused for safety. Read the safety notice first.',
  };
  return {
    assessment: hold.active ? held : switches.assessment ? { available: true, reason: 'ok', message: '' } : notBuilt('Diagnosis', 3),
    parts: switches.parts ? { available: true, reason: 'ok', message: '' } : notBuilt('Parts and fitment', 4),
    videos: switches.videos ? { available: true, reason: 'ok', message: '' } : notBuilt('Video resources', 4),
    guide: hold.active ? held : switches.guides ? { available: true, reason: 'ok', message: '' } : notBuilt('Repair guides', 4),
  };
}
