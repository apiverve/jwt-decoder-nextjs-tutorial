'use client';

import { useCallback, useEffect, useState } from 'react';
import { SAMPLE_TOKEN } from './sample';

type Decoded = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  algorithm: string;
  isExpired: boolean;
  notYetValid: boolean;
  expiresAt: string | null;
  issuedAt: string | null;
  expiresIn: number | null;
  tokenAge?: string | null; // paid plans
  securityAnalysis?: { issues?: string[]; isLongLived?: boolean; hasExpiration?: boolean } | null; // paid plans
  warning?: string;
};
type ApiError = { error: string; code?: string };

// Registered claim names from RFC 7519, explained in words.
const CLAIMS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expires',
  nbf: 'Not before',
  iat: 'Issued at',
  jti: 'Token ID',
  name: 'Name',
  email: 'Email',
  scope: 'Scope',
  role: 'Role'
};
const TIME_CLAIMS = new Set(['exp', 'nbf', 'iat', 'auth_time']);

function when(seconds: number) {
  const d = new Date(seconds * 1000);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function duration(seconds: number) {
  const abs = Math.abs(seconds);
  if (abs < 3600) return `${Math.round(abs / 60)} min`;
  if (abs < 86400 * 2) return `${Math.round(abs / 3600)} h`;
  if (abs < 86400 * 365) return `${Math.round(abs / 86400)} days`;
  return `${(abs / (86400 * 365)).toFixed(1)} years`;
}

function show(v: unknown) {
  return typeof v === 'string' ? v : JSON.stringify(v);
}

export default function JwtApp() {
  const [token, setToken] = useState(SAMPLE_TOKEN);
  const [data, setData] = useState<Decoded | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const decode = useCallback(async (t: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t })
      });
      const body = await res.json();
      if (!res.ok) throw body;
      setData(body);
    } catch (e) {
      setData(null);
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    decode(SAMPLE_TOKEN);
  }, [decode]);

  if (error?.code === 'missing_key') {
    return (
      <main className="page">
        <section className="sheet missing">
          <h1>Add your API key</h1>
          <p>
            This decoder needs an APIVerve API key. Get a free one at{' '}
            <a href="https://dashboard.apiverve.com/signup?api=jwtdecoder" target="_blank" rel="noreferrer">
              dashboard.apiverve.com
            </a>
            , set <code>APIVERVE_API_KEY</code> in <code>.env</code> or your Vercel project, and reload.
          </p>
        </section>
      </main>
    );
  }

  const [h, p, s] = token.trim().split('.');
  const status = !data ? null : data.isExpired ? 'expired' : data.notYetValid ? 'early' : 'valid';

  return (
    <main className="page">
      <header className="mast">
        <h1>
          JWT <em>Decoder</em>
        </h1>
        <p>Paste a JSON Web Token to read its header, claims and expiry in plain words.</p>
      </header>

      <div className="layout">
        <section className="sheet">
          <label className="label" htmlFor="token">
            Encoded token
          </label>
          <textarea id="token" value={token} onChange={(e) => setToken(e.target.value)} spellCheck={false} rows={8} />
          <div className="colored" aria-hidden>
            <span className="h">{h}</span>.<span className="p">{p}</span>
            {s !== undefined && (
              <>
                .<span className="s">{s}</span>
              </>
            )}
          </div>
          <div className="actions">
            <button className="primary" onClick={() => decode(token)} disabled={busy || !token.trim()}>
              {busy ? 'Decoding…' : 'Decode'}
            </button>
            <button
              className="ghost"
              onClick={() => {
                setToken(SAMPLE_TOKEN);
                decode(SAMPLE_TOKEN);
              }}
            >
              Use sample
            </button>
          </div>
          {error && <p className="err">{error.error}</p>}
        </section>

        {data && (
          <section className="sheet result">
            <div className={`status ${status}`}>
              <strong>{status === 'expired' ? 'Expired' : status === 'early' ? 'Not valid yet' : 'Not expired'}</strong>
              <span>
                {data.expiresIn != null && !data.isExpired && `expires in ${duration(data.expiresIn)}`}
                {data.isExpired && data.expiresAt && `expired ${new Date(data.expiresAt).toLocaleDateString()}`}
                {data.expiresAt == null && 'no expiry claim'}
              </span>
            </div>

            <div className="pills">
              <span className="pill">{data.algorithm || 'none'}</span>
              {typeof data.header.typ === 'string' && <span className="pill">{data.header.typ}</span>}
              {typeof data.header.kid === 'string' && <span className="pill">kid {data.header.kid}</span>}
              {data.tokenAge && <span className="pill">{data.tokenAge} old</span>}
            </div>

            <h2>Claims</h2>
            <dl className="claims">
              {Object.entries(data.payload).map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {CLAIMS[k] || k} <code>{k}</code>
                  </dt>
                  <dd>{TIME_CLAIMS.has(k) && typeof v === 'number' ? when(v) : show(v)}</dd>
                </div>
              ))}
            </dl>

            {data.securityAnalysis?.issues && data.securityAnalysis.issues.length > 0 && (
              <>
                <h2>Worth a look</h2>
                <ul className="issues">
                  {data.securityAnalysis.issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </>
            )}

            <h2>Header</h2>
            <pre>{JSON.stringify(data.header, null, 2)}</pre>

            <p className="note">Decoding reads a token; it doesn’t prove who signed it. Verify the signature on your server before trusting the claims.</p>
          </section>
        )}
      </div>

      <footer className="foot">
        Built with the <a href="https://apiverve.com/marketplace/jwtdecoder">JWT Decoder</a> API from APIVerve.
      </footer>
    </main>
  );
}
