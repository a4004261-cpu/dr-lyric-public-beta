(()=>{
  const KEY='dr_lyric_growth_v1';
  const MAX_SESSIONS=50;
  let lastDiagnosis=null;

  function load(){
    try{return JSON.parse(localStorage.getItem(KEY))||{sessions:[],accepted:0,rejected:0,completed:0}}catch{return{sessions:[],accepted:0,rejected:0,completed:0}}
  }
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));renderRecord()}
  function clamp(n){return Math.max(0,Math.min(100,Math.round(Number(n)||0)))}
  function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0}
  function metricNames(){return{flow:'FLOW',rhyme_design:'韻設計',phonetic_pleasure:'音の気持ちよさ',word_density:'言葉の密度',punchline:'パンチ',imagery:'映像性',voice:'VOICE',surprise:'意外性',repetition_variation:'反復と変化',memorability:'記憶性',edge:'毒 / EDGE',magnetism:'痺れ / 引力'}}
  function profile(){
    const s=load(),recent=s.sessions.slice(-20),names=metricNames(),keys=Object.keys(names),means={};
    keys.forEach(k=>means[k]=clamp(avg(recent.map(x=>Number(x.metrics?.[k]||0)))));
    const ranked=keys.filter(k=>means[k]>0).sort((a,b)=>means[b]-means[a]);
    const n=recent.length,split=Math.max(1,Math.min(5,Math.floor(n/2)||1));
    const first=recent.slice(0,split),last=recent.slice(-split),trend={};
    keys.forEach(k=>trend[k]=Math.round(avg(last.map(x=>Number(x.metrics?.[k]||0)))-avg(first.map(x=>Number(x.metrics?.[k]||0))));
    const total=s.accepted+s.rejected;
    return{
      sessions:n,
      completed:s.completed||0,
      averages:means,
      strongest:ranked.slice(0,3),
      weakest:ranked.slice(-3).reverse(),
      trend,
      editorPreference:total?{acceptRate:Math.round(s.accepted/total*100),preserveRate:Math.round(s.rejected/total*100)}:{acceptRate:0,preserveRate:0},
      instruction:'過去スコアは作風の参考。平均へ矯正せず、ユーザー固有の強みと意図的な崩しを守る。AI編集の拒否率が高い場合は原文維持をより優先する。'
    };
  }
  function recordDiagnosis(data){
    if(!data||!data.metrics)return;
    lastDiagnosis=data;
    const s=load(),now=Date.now(),last=s.sessions.at(-1);
    const sig=JSON.stringify([clamp(data.overall),data.metrics]);
    if(last&&now-last.ts<30000&&last.sig===sig)return;
    s.sessions.push({ts:now,overall:clamp(data.overall),metrics:data.metrics,sig});
    s.sessions=s.sessions.slice(-MAX_SESSIONS);
    save(s);
  }
  function decision(kind){const s=load();if(kind==='accepted')s.accepted++;if(kind==='rejected')s.rejected++;save(s)}
  function complete(){
    if(!lastDiagnosis)return;
    const s=load();s.completed=(s.completed||0)+1;save(s);
    const b=document.querySelector('#markComplete');if(b){b.textContent='✓ 完成として記録済み';b.disabled=true}
  }
  function trendText(v){return v>0?`+${v} ↑`:v<0?`${v} ↓`:'±0'}
  function renderRecord(){
    const panel=document.querySelector('#growthPanelBody');if(!panel)return;
    const s=load(),p=profile(),names=metricNames(),recent=s.sessions;
    if(!recent.length){panel.innerHTML='<div class="growth-empty"><b>まだカルテは空です。</b><p>AI深層診察を使うと、スコア推移と作風傾向がこの端末にだけ蓄積されます。</p></div>';return}
    const latest=recent.at(-1),first=recent[0];
    const overallDelta=latest.overall-first.overall;
    const strongest=p.strongest[0],weakest=p.weakest[0];
    panel.innerHTML=`<div class="growth-grid"><div><small>診察回数</small><strong>${s.sessions.length}</strong></div><div><small>完成記録</small><strong>${s.completed||0}</strong></div><div><small>現在値</small><strong>${latest.overall}<i>/100</i></strong></div><div><small>初回比</small><strong>${overallDelta>=0?'+':''}${overallDelta}</strong></div></div>
      <div class="growth-focus"><div><small>いまの武器</small><b>${strongest?names[strongest]:'分析中'} ${strongest?clamp(p.averages[strongest]):''}</b></div><div><small>次に磨く場所</small><b>${weakest?names[weakest]:'分析中'} ${weakest?clamp(p.averages[weakest]):''}</b></div></div>
      <div class="growth-bars">${['flow','rhyme_design','punchline','imagery','edge','magnetism'].map(k=>`<div><span>${names[k]}</span><i><u style="width:${clamp(p.averages[k])}%"></u></i><b>${clamp(p.averages[k])}</b><em>${trendText(p.trend[k])}</em></div>`).join('')}</div>
      <div class="growth-editor"><small>AIとの付き合い方</small><p>AI編集を採用 ${s.accepted} / 原文を守った ${s.rejected}</p>${s.accepted+s.rejected?`<b>原文維持率 ${p.editorPreference.preserveRate}%</b>`:'<b>比較を使うと、あなたの編集判断も学習材料になります。</b>'}</div>
      <p class="growth-privacy">歌詞本文は履歴保存しません。ここに残すのは診断指標と編集判断だけで、ブラウザ内に保存されます。</p>`;
  }
  function buildUI(){
    const header=document.querySelector('header');if(!header||document.querySelector('#growthOpen'))return;
    const btn=document.createElement('button');btn.id='growthOpen';btn.className='growth-open';btn.textContent='MY RECORD';header.appendChild(btn);
    const modal=document.createElement('div');modal.id='growthPanel';modal.className='growth-panel hidden';modal.innerHTML=`<div class="growth-shell"><div class="growth-head"><div><small>MY LYRIC RECORD</small><h2>あなたのリリックの成長</h2></div><button id="growthClose" aria-label="閉じる">×</button></div><div id="growthPanelBody"></div></div>`;document.body.appendChild(modal);
    btn.onclick=()=>{modal.classList.remove('hidden');renderRecord()};
    modal.querySelector('#growthClose').onclick=()=>modal.classList.add('hidden');
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden')});
    renderRecord();
  }
  function injectActions(){
    const deep=document.querySelector('#deepResult');
    if(deep&&!deep.classList.contains('hidden')&&lastDiagnosis&&!deep.querySelector('#markComplete')){
      const b=document.createElement('button');b.id='markComplete';b.className='record-complete';b.textContent='🎤 この状態を完成として記録';b.onclick=complete;deep.appendChild(b);
    }
    const compare=document.querySelector('#compare');const apply=document.querySelector('#applyRewrite');
    if(compare&&apply&&!compare.querySelector('#keepOriginal')){
      const keep=document.createElement('button');keep.id='keepOriginal';keep.className='keep-original';keep.textContent='原文を残す';
      keep.onclick=()=>{decision('rejected');keep.textContent='✓ 原文を残す判断を記録';keep.disabled=true};
      apply.insertAdjacentElement('beforebegin',keep);
      apply.addEventListener('click',()=>decision('accepted'),{once:false});
    }
  }

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:input?.url||'';
    if(['/api/diagnose','/api/rewrite','/api/repair'].some(x=>url.includes(x))&&init?.body){
      try{const body=JSON.parse(init.body);body.styleProfile=profile();init={...init,body:JSON.stringify(body)}}catch{}
    }
    const res=await nativeFetch(input,init);
    if(url.includes('/api/diagnose')&&res.ok){
      try{const data=await res.clone().json();recordDiagnosis(data);setTimeout(injectActions,0)}catch{}
    }
    if(url.includes('/api/rewrite'))setTimeout(injectActions,0);
    return res;
  };

  const obs=new MutationObserver(()=>injectActions());
  document.addEventListener('DOMContentLoaded',()=>{buildUI();obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})});
  if(document.readyState!=='loading'){buildUI();obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})}
})();