(()=>{
  const nav=document.createElement('nav');
  nav.className='quick-nav';
  nav.setAttribute('aria-label','クイック移動');
  nav.innerHTML=`
    <button type="button" data-target="top"><span>⌂</span><b>トップ</b></button>
    <button type="button" data-target="clinic"><span>✎</span><b>診察室</b></button>
    <button type="button" data-target="results"><span>◉</span><b>診察結果</b></button>
    <button type="button" data-target="compare"><span>⇄</span><b>比較</b></button>
    <button type="button" data-action="record"><span>↗</span><b>記録</b></button>`;
  document.body.appendChild(nav);

  function visible(el){return !!el && !el.classList.contains('hidden') && el.getClientRects().length>0}
  function jump(id){
    const el=id==='top'?document.querySelector('main'):document.getElementById(id);
    if(!el)return;
    if(id==='results'&&!visible(el))return pulse('results');
    if(id==='compare'&&!visible(el))return pulse('compare');
    el.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function pulse(target){
    const b=nav.querySelector(`[data-target="${target}"]`);if(!b)return;
    b.classList.remove('nav-unavailable');void b.offsetWidth;b.classList.add('nav-unavailable');
    setTimeout(()=>b.classList.remove('nav-unavailable'),700);
  }
  nav.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.action==='record'){
      const record=document.getElementById('growthOpen');
      if(record)record.click();
      return;
    }
    jump(b.dataset.target);
  });

  const sections=['clinic','results','compare'].map(id=>document.getElementById(id)).filter(Boolean);
  const io=new IntersectionObserver(entries=>{
    const hit=entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    if(hit){nav.querySelector(`[data-target="${hit.target.id}"]`)?.classList.add('active');}
  },{rootMargin:'-20% 0px -55% 0px',threshold:[0,.15,.4,.7]});
  sections.forEach(x=>io.observe(x));
})();