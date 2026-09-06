const { getVercelOidcToken } = require('@vercel/oidc');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { lyrics = '', mode = '総合診察' } = req.body || {};
    if (typeof lyrics !== 'string' || !lyrics.trim()) return res.status(400).json({ error: 'lyrics is required' });
    if (lyrics.length > 3000) return res.status(400).json({ error: 'lyrics is too long' });

    const token = process.env.AI_GATEWAY_API_KEY || await getVercelOidcToken();
    if (!token) return res.status(503).json({ error: 'AI Gateway authentication is not configured' });

    const system = `あなたはDr.リリックのRAPPER BRAIN診断エンジン。プロレベルの日本語ラップ編集者として評価する。作者は人間、AIは編集者。整っていることと気持ちよさを混同しない。短い行、長い行、韻を踏まない行、急な変化を機械的に減点しない。その変化がフロー、強調、パンチライン、展開として機能している可能性を先に検証する。評価軸は flow, rhyme_design, phonetic_pleasure, word_density, punchline, imagery, voice, surprise, repetition_variation, memorability。文字だけではBPM、ビート、実発音、アクセント、間、声質、抑揚、乗せ方を完全には判断できないので断定しない。総合点は芸術的価値ではなくテキスト聴感ポテンシャル。JSONのみ返す。形式: {"overall":0-100,"confidence":"low|medium|high","summary":"...","strengths":["..."],"cautions":["..."],"metrics":{"flow":0-100,"rhyme_design":0-100,"phonetic_pleasure":0-100,"word_density":0-100,"punchline":0-100,"imagery":0-100,"voice":0-100,"surprise":0-100,"repetition_variation":0-100,"memorability":0-100},"notes":{"flow":"...","rhyme_design":"...","punchline":"...","voice":"..."}}`;
    const prompt = `診察モード: ${mode}\n\n歌詞:\n${lyrics}`;

    const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.4-nano',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        temperature: 0.35,
        providerOptions: { gateway: { disallowPromptTraining: true } }
      })
    });

    const raw = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'AI Gateway request failed', detail: raw.slice(0, 300) });

    const data = JSON.parse(raw);
    let content = data?.choices?.[0]?.message?.content || '';
    content = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(content);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'AI diagnosis failed', detail: String(e.message || e).slice(0, 300) });
  }
};
