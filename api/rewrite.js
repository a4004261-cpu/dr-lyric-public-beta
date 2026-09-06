const { getVercelOidcToken } = require('@vercel/oidc');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { lyrics = '', mode = '総合診察', diagnosis = null } = req.body || {};
    if (typeof lyrics !== 'string' || !lyrics.trim()) return res.status(400).json({ error: 'lyrics is required' });
    if (lyrics.length > 3000) return res.status(400).json({ error: 'lyrics is too long' });
    const token = process.env.AI_GATEWAY_API_KEY || await getVercelOidcToken();
    if (!token) return res.status(503).json({ error: 'AI Gateway authentication is not configured' });

    const system = `あなたはDr.リリックのRAPPER BRAIN完全編集エンジン。作者は人間、AIは編集者。歌詞全体を見て、必要な箇所だけ編集する。作品の意味、視点、人格、世界観、核となる言葉、パンチラインを最大限維持する。実在アーティストの模倣は禁止。整っていることを目的にせず、意図的な長短、崩し、反復、韻を踏まない行、急な変化を武器として残す。改善が不要な行は原文をそのまま残す。
最重要原則として「毒 / EDGE」と「痺れ / MAGNETISM」を保護する。EDGEとは暴言や過激さではなく、作者固有の危うさ、鋭さ、予想外の切り口、感情を引っかく言葉、その人にしか書けない一行。MAGNETISMとは引用したくなる、記憶に残る、もう一度聴きたくなる吸引力。診断のsignature_linesは原則として保護する。技術的に整えることでEDGEまたはMAGNETISMが落ちるなら原文維持を優先する。無菌的・説明的・無難な文章へ均すことを禁止する。
ただし過激さを増やすこと自体を目的にしない。既視感のある暴言やショック表現を追加してEDGEを作ったことにしない。必要なら周囲を研いで、元から存在する強い一行をより目立たせる。
変更は必ず理由を説明し、変更前後のメリットと代償を数値化する。metric_deltaは変更によって予想される各軸の差分。改善だけでなく悪化は負数で返す。edgeとmagnetismも必須評価対象。severityはその変更の必要性/改善優先度、confidenceはその判断の確信度。行番号は原文の1始まり。edited_lyricsは完成した全文。JSONのみ返す。
形式: {"edited_lyrics":"...","summary":"...","changes":[{"line":1,"before":"...","after":"...","reason":"...","severity":0-100,"confidence":0-100,"metric_delta":{"flow":0,"rhyme_design":0,"phonetic_pleasure":0,"word_density":0,"punchline":0,"imagery":0,"voice":0,"surprise":0,"repetition_variation":0,"memorability":0,"edge":0,"magnetism":0}}]}`;
    const diagnosisText = diagnosis ? JSON.stringify(diagnosis).slice(0, 6500) : 'なし';
    const prompt = `診察モード: ${mode}\n既存診断: ${diagnosisText}\n\n原文:\n${lyrics}\n\n重要: 変更のための変更はしない。原文が強い場合は残す。signature_linesやEDGEの高い行を綺麗に均さない。変更箇所だけchangesへ入れる。`;
    const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-5.4-nano',messages:[{role:'system',content:system},{role:'user',content:prompt}],temperature:0.48,providerOptions:{gateway:{disallowPromptTraining:true}}})});
    const raw = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'AI Gateway request failed', detail: raw.slice(0, 300) });
    const data = JSON.parse(raw);
    let content = data?.choices?.[0]?.message?.content || '';
    content = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(content);
    if (typeof parsed.edited_lyrics !== 'string' || !parsed.edited_lyrics.trim()) throw new Error('Invalid AI response');
    if (!Array.isArray(parsed.changes)) parsed.changes = [];
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'AI rewrite failed', detail: String(e.message || e).slice(0, 300) });
  }
};
