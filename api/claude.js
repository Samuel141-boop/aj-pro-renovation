/**
 * AJ PRO RÉNOVATION — Proxy serverless Vercel pour l'API Anthropic Claude
 * ─────────────────────────────────────────────────────────────────────
 * Forwarde les requêtes JSON depuis le frontend vers https://api.anthropic.com/v1/messages
 * en gardant la clé API secrète côté serveur (process.env.ANTHROPIC_API_KEY).
 *
 * Pour activer :
 *   Vercel Dashboard → Project → Settings → Environment Variables
 *   → Add ANTHROPIC_API_KEY = sk-ant-...
 *   → Redeploy
 *
 * Si la variable n'est pas définie, retourne un 503 explicite (le frontend
 * bascule alors automatiquement sur le fallback local quote-fusion).
 */

export default async function handler(req, res) {
  // CORS — pas strictement nécessaire (même origine sur Vercel) mais utile pour debug
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY not configured',
      hint: 'Le frontend va basculer sur l\'analyse locale (quote-fusion). Pour activer l\'IA réelle : ajouter la variable ANTHROPIC_API_KEY dans Vercel Project → Settings → Environment Variables, puis redeploy.'
    });
  }

  try {
    // Le body arrive déjà parsé par Vercel (Content-Type: application/json)
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    // Forward vers l'API Anthropic
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); }
    catch { json = { error: 'Invalid JSON from Anthropic', raw: text.slice(0, 500) }; }

    return res.status(upstream.status).json(json);

  } catch (err) {
    return res.status(500).json({
      error: 'Proxy error',
      message: err.message || String(err)
    });
  }
}
