import { z } from 'zod';
import { ClientPlatform } from './common';

export const Meta = z.object({
  apiVersion: z.literal('v1'),
  serverTime: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  /** Installed native versions below this receive `client_outdated`. */
  minClientVersion: z.record(ClientPlatform, z.string()),
  capabilities: z.object({
    assessment: z.boolean(),
    deepDiagnostic: z.boolean(),
    parts: z.boolean(),
    videos: z.boolean(),
    guides: z.boolean(),
    billing: z.boolean(),
    inviteRequired: z.boolean(),
  }),
  demoMode: z.boolean(),
});
export type Meta = z.infer<typeof Meta>;
