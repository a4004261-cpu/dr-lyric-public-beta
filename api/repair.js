const { getVercelOidcToken } = require('@vercel/oidc');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      line = '',
      contextBefore = '',
      contextAfter = '',
      mode = '総合診察',
      vowelSuffix = '',
      moraCount = 0,
      wholeLyrics = '',
      averageMora = 0,
      listeningPotential = 0,
      metrics = {}
    } = req.body || {};

    if (typeof line !== 'string' || !line.trim()) return res.status(400).json({ error: 'line is required' });
    if (line.length > 500) return res.status(400).json({ error: 'line is too long' });

    const token = process.env.AI_GATEWAY_API_KEY || await getVercelOidcToken();
    if (!token) return res.status(503).json({ error: 'AI Gateway authentication is not configured' });

    const system = `あなたはDr.リリックのRAPPER BRAIN治療エンジン。作者は人間、AIは編集者。指定された1行だけを改善し、意味・視点・人格・世界観・パンチライン・前後関係を最大限維持する。作品全体を書き直さない。実在する特定アーティストを模倣しない。整っていることと気持ちよさを混同しない。短い行、長い行、韻を踏まない行、急な変化を機械的に直さない。その変化がフロー、強調、パンチライン、展開として機能しているなら残す。行の長さを揃えること自体を目的にしない。不自然な韻を避ける。FLOW、RHYME、PUNCH、COHESIONのどれかを改善するために別の重要要素を壊さない。原文の方が強い場合は原文維持型を明確に推奨する。原文維持型、韻強化型、フロー調整型の3案をJSONのみで返す。形式: {"suggestions":[{"role":"原文維持型","text":"..."},{"role":"韻強化型","text":"..."},{"role":"フロー調整型","text":"..."}]}`;

    const prompt = `モード: ${mode}\n歌詞全体:\n${String(wholeLyrics).slice(0, 1800)}\n\n前の行: ${String(contextBefore).slice(0, 500)}\n治療対象: ${line}\n次の行: ${String(contextAfter).slice(0, 500)}\n語尾母音目安: ${vowelSuffix}\n対象行モーラ目安: ${moraCount}\n全体平均モーラ目安: ${Number(averageMora).toFixed(1)}\n暫定テキスト聴感ポテンシャル: ${listeningPotential}/100\n暫定指標: ${JSON.stringify(metrics).slice(0, 500)}\n\n重要: 数字は参考情報に過ぎない。対象行の意図的な崩し、パンチ、人格、意外性を先に守る。修正によってパンチや個性が弱くなるなら、原文維持を優先する。`;

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
        temperature: 0.65,
        providerOptions: { gateway: { disallowPromptTraining: true } }
      })
    });

    const raw = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'AI Gateway request failed', detail: raw.slice(0, 300) });

    const data = JSON.parse(raw);
    let content = data?.choices?.[0]?.message?.content || '';
    content = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length < 3) throw new Error('Invalid AI response');

    return res.status(200).json({ suggestions: parsed.suggestions.slice(0, 3) });
  } catch (e) {
    return res.status(500).json({ error: 'AI treatment failed', detail: String(e.message || e).slice(0, 300) });
  }
};
