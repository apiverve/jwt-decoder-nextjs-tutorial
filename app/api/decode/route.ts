import { createHash } from 'node:crypto';
import { callApi, fail, fromCache, guard, respond, toCache } from '@/lib/apiverve';

// POST /api/decode { token }: one JWT Decoder call, cached for 10 minutes.
// The cache key is a SHA-256 hash of the token, so tokens are never kept in memory as-is.
const TTL_MS = 10 * 60_000;
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? '').trim();
  if (!token) return fail('Paste a JWT to decode');
  if (token.length > 8000) return fail('That token is too long');
  if (!JWT_SHAPE.test(token)) return fail('A JWT has three parts separated by dots: header.payload.signature');

  const key = `jwt:${createHash('sha256').update(token).digest('hex')}`;
  const hit = fromCache(key, TTL_MS);
  if (hit) return Response.json(hit);

  const blocked = guard(request);
  if (blocked) return blocked;

  return respond(async () => {
    const data = await callApi('jwtdecoder', { json: { token } });
    toCache(key, data);
    return data;
  });
}
