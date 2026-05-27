import { NextResponse } from 'next/server';

const SEVEN_DAYS = 7 * 24 * 60 * 60;
const isProd = process.env.NODE_ENV === 'production';

export async function POST(request: Request) {
  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token requis' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  // Non-httpOnly : l'intercepteur Axios côté client en a besoin pour construire
  // le header Authorization. En prod, secure:true + sameSite:'none' permettent
  // au cookie de traverser le contexte cross-site (Vercel ↔ Render via Bearer).
  response.cookies.set('access_token', token, {
    path: '/',
    maxAge: SEVEN_DAYS,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    httpOnly: false,
  });

  return response;
}
