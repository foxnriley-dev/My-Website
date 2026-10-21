import type { Tx } from '../db';

/** Audit metadata must never include raw symptoms, photos, VINs, tokens or secrets. */
export async function audit(
  tx: Tx,
  e: { userId: string | null; actor: 'user' | 'system' | 'admin'; action: string; entityType: string; entityId?: string | null; requestId?: string | null; metadata?: Record<string, string | number | boolean | null> },
): Promise<void> {
  await tx`
    insert into app.audit_events (user_id, actor, action, entity_type, entity_id, request_id, metadata)
    values (${e.userId}, ${e.actor}, ${e.action}, ${e.entityType}, ${e.entityId ?? null}, ${e.requestId ?? null}, ${tx.json(e.metadata ?? {})})`;
}
