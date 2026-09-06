(()=>{
  const clamp=n=>Math.max(0,Math.min(100,Math.round(Number(n)||0)));
  const esc=s=>{const d=document.createElement('div');d.textContent=String(s??'');return d.innerHTML};
  function render(data){
    const root=document.querySelector('#deepResult');
    const lyrics=document.querySelector('#lyrics');
    if(!root||!lyrics)return;
    root.querySelector('.lyric-map')?.remove();
    const lines=lyrics.value.split('\n').filter(x=>x.trim());
    if(!lines.length)return;
    const ai=Array.isArray(data.line_map)?data.line_map:[];
    const signatures=new Map((data.signature_lines||[]).map(x=>[Number(x.line),x]));
    const issues=new Map((data.priority_issues||[]).map(x=>[Number(x.line),x]));
    const points=lines.map((text,i)=>{
      const n=i+1,a=ai.find(x=>Number(x.line)===n)||{},sig=signatures.get(n),issue=issues.get(n);
      let impact=a.impact!=null?clamp(a.impact):sig?clamp((Number(sig.edge||0)+Number(sig.magnetism||0))/2):issue?clamp(100-Number(issue.severity||0)*.45):60;
      return {n,text,impact,label:a.label||'',reason:a.reason||'',sig,issue};
    });
    const max=Math.max(...points.map(x=>x.impact)),min=Math.min(...points.map(x=>x.impact));
    const box=document.createElement('section');box.className='lyric-map';
    box.innerHTML=`<div class="lyric-map-head"><div><small>LYRIC MAP / SONG DYNAMICS</small><b>曲のピークと谷</b></div><span>高得点競争ではなく、聴き手の感情が動く場所を見る</span></div><div class="lyric-map-chart">${points.map(p=>{const peak=p.impact===max&&points.length>1,valley=p.impact===min&&points.length>1;const tag=p.sig?'🔥 保護':peak?'⚡ PEAK':valley?'▽ VALLEY':p.label||'';return `<button type="button" class="lyric-map-row ${p.sig?'protected':''} ${valley?'valley':''}" data-line="${p.n}"><span class="map-line">${p.n}</span><span class="map-text">${esc(p.text)}</span><span class="map-track"><i style="width:${p.impact}%"></i></span><strong>${p.impact}</strong>${tag?`<em>${esc(tag)}</em>`:''}</button>`}).join('')}</div><details class="lyric-map-note"><summary>このマップの読み方</summary><p>山があること自体が正解ではありません。静かな谷が次のパンチを強くすることもあります。AIは均一化せず、ピーク・余白・崩しが作品内で機能しているかを見る補助線として表示します。</p></details>`;
    const edge=root.querySelector('.edge-panel');
    if(edge)edge.insertAdjacentElement('afterend',box);else root.appendChild(box);
    box.querySelectorAll('.lyric-map-row').forEach(btn=>btn.onclick=()=>{const n=Number(btn.dataset.line),issue=issues.get(n),sig=signatures.get(n),a=ai.find(x=>Number(x.line)===n)||{};const reason=a.reason||sig?.magnetism_reason||sig?.edge_reason||issue?.reason||'この行は全体の流れの中で確認する価値があります。';btn.classList.toggle('open');let detail=btn.nextElementSibling;if(detail?.classList.contains('map-detail')){detail.remove();return}detail=document.createElement('div');detail.className='map-detail';detail.innerHTML=`<b>LINE ${n} 診察メモ</b><p>${esc(reason)}</p>${issue?`<small>改善優先度 ${clamp(issue.severity)}/100 ・ AI確信度 ${clamp(issue.confidence)}/100</small>`:sig?`<small>EDGE ${clamp(sig.edge)}/100 ・ 引力 ${clamp(sig.magnetism)}/100</small>`:''}`;btn.insertAdjacentElement('afterend',detail)});
  }
  const timer=setInterval(()=>{if(typeof window.renderDeep==='function'){clearInterval(timer);const old=window.renderDeep;window.renderDeep=function(data){old(data);render(data)}}},20);
})();