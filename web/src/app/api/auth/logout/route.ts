import { NextResponse } from 'next/server';

const isProd = process.env.NODE_ENV === 'production';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Les options de suppression doivent correspondre exactement à celles de la
  // création (même sameSite et secure), sinon Chrome refuse de supprimer le cookie.
  response.cookies.set('access_token', '', {
    path: '/',
    maxAge: 0,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  });
  return response;
}
