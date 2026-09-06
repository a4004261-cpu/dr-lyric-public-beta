const { getVercelOidcToken } = require('@vercel/oidc');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { lyrics = '', mode = '総合診察', styleProfile = null } = req.body || {};
    if (typeof lyrics !== 'string' || !lyrics.trim()) return res.status(400).json({ error: 'lyrics is required' });
    if (lyrics.length > 3000) return res.status(400).json({ error: 'lyrics is too long' });
    const token = process.env.AI_GATEWAY_API_KEY || await getVercelOidcToken();
    if (!token) return res.status(503).json({ error: 'AI Gateway authentication is not configured' });

    const system = `あなたはDr.リリックのRAPPER BRAIN診断エンジン。プロレベルの日本語ラップ編集者として評価する。作者は人間、AIは編集者。整っていることと気持ちよさを混同しない。短い行、長い行、韻を踏まない行、急な変化を機械的に減点しない。その変化がフロー、強調、パンチライン、展開として機能している可能性を先に検証する。
評価軸は flow, rhyme_design, phonetic_pleasure, word_density, punchline, imagery, voice, surprise, repetition_variation, memorability, edge, magnetism。
edgeは「毒 / EDGE」。単なる暴言・攻撃性・下品さ・危険表現ではない。言葉の鋭さ、危うさ、固有性、感情を引っかく力、予想外の切り口、その作者にしか書けない傷跡のような一行を評価する。magnetismは「痺れ / 引力」。聴き手を惹きつけ、引用したくなり、もう一度聴きたくなる言葉の吸引力を評価する。過激さそのものを高得点にしない。既視感のある強い言葉、安易な暴言、ショック目的だけの表現はEDGEではない。
styleProfileがある場合は過去の診断平均・強み・弱み・編集判断を作風の参考にする。ただし平均値へ矯正しない。過去の弱点が今回の意図的表現として機能しているなら減点しない。原文維持率が高いユーザーには特に、個性を壊す断定的な修正を避ける。過去データより今回の作品そのものを優先する。
技術的に粗くてもEDGEやmagnetismが強い一行は保護対象。逆に整っていても無難・予測可能・誰でも書ける表現ならその弱さを指摘する。文字だけではBPM、ビート、実発音、アクセント、間、声質、抑揚、乗せ方を完全には判断できないので断定しない。総合点は芸術的価値ではなくテキスト聴感ポテンシャル。
明確な改善余地がある場合だけ priority_issues を最大3件返す。severity は改善優先度であり「ダメ度」ではない。confidence はAIがその指摘にどれだけ確信を持つか。意図的な崩しの可能性が高い場合はconfidenceを下げる。lineは1始まりの行番号。metricは最も関係する評価軸。
signature_linesには作品の中で特に殺してはいけない最大3行を返す。edge_reasonはなぜその言葉に毒・固有性があるか、magnetism_reasonはなぜ惹きつけるかを簡潔に説明する。該当がなければ空配列。JSONのみ返す。
形式: {"overall":0-100,"confidence":"low|medium|high","summary":"...","strengths":["..."],"cautions":["..."],"priority_issues":[{"line":1,"severity":0-100,"confidence":0-100,"metric":"flow|rhyme_design|phonetic_pleasure|word_density|punchline|imagery|voice|surprise|repetition_variation|memorability|edge|magnetism","title":"...","reason":"...","advice":"..."}],"signature_lines":[{"line":1,"edge":0-100,"magnetism":0-100,"edge_reason":"...","magnetism_reason":"..."}],"metrics":{"flow":0-100,"rhyme_design":0-100,"phonetic_pleasure":0-100,"word_density":0-100,"punchline":0-100,"imagery":0-100,"voice":0-100,"surprise":0-100,"repetition_variation":0-100,"memorability":0-100,"edge":0-100,"magnetism":0-100},"notes":{"flow":"...","rhyme_design":"...","punchline":"...","voice":"...","edge":"...","magnetism":"..."}}`;
    const profileText = styleProfile ? JSON.stringify(styleProfile).slice(0, 3500) : '初回利用のため履歴なし';
    const prompt = `診察モード: ${mode}\nユーザー作風プロフィール: ${profileText}\n\n歌詞:\n${lyrics}`;
    const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-5.4-nano',messages:[{role:'system',content:system},{role:'user',content:prompt}],temperature:0.35,providerOptions:{gateway:{disallowPromptTraining:true}}})});
    const raw = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'AI Gateway request failed', detail: raw.slice(0, 300) });
    const data = JSON.parse(raw);
    let content = data?.choices?.[0]?.message?.content || '';
    content = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    return res.status(200).json(JSON.parse(content));
  } catch (e) {
    return res.status(500).json({ error: 'AI diagnosis failed', detail: String(e.message || e).slice(0, 300) });
  }
};
