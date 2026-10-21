import { safeRedirectPath } from '@ife/domain';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Email confirmation, magic-link and password-recovery callbacks (PKCE).
 * `next` must be a relative in-app path; anything else falls back to /app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get('next'));
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const supabase = await supabaseServer();

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }
  if (!ok) {
    return NextResponse.redirect(new URL('/sign-in?error=link', origin));
  }
  return NextResponse.redirect(new URL(type === 'recovery' ? '/reset-password' : next, origin));
}
