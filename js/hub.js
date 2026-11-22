/* Tests hub — the page of ONE exam inside a "tests" category (loaded on demand by examPage).
   Banner  →  tab switch (Full Test / Sectional / PYQ / AI …)  →  section chips  →  one horizontal card per test.
   Which tabs exist, which are live, and which tests are live is all controlled from  Admin → Tests Hub. */
const HUB_THEME={indigo:['#1b1a63','#4f46e5'],purple:['#3a1873','#7c3aed'],teal:['#0a3a44','#0e9f8e'],rose:['#66122d','#e11d48'],amber:['#563706','#d97706'],slate:['#18212f','#475569']};
const HIC={
  q:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8"/><path d="M12 17h.01"/></svg>',
  m:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  t:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  g:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  d:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  s:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/></svg>'};
const HCOLS='id,title,kind,exam_id,tab_id,section_name,is_free,is_published,exam_date,shift,languages,syllabus,question_count,total_marks,duration_minutes,mode,sort_order,created_at';
const SEC_COLORS=['#4f46e5','#0e9f8e','#e11d48','#d97706','#7c3aed','#0284c7','#16a34a','#c2410c'];
const secColor=n=>{let h=0;for(const ch of String(n||''))h=(h*31+ch.charCodeAt(0))>>>0;return SEC_COLORS[h%SEC_COLORS.length]};
const numFmt=n=>+(+n||0).toFixed(2);

async function hubPage(x,c){
  const[tabs,all]=await Promise.all([q(sb.from('exam_tabs').select('*').eq('exam_id',x.id).order('sort_order')),
    q(sb.from('assessments').select(HCOLS).eq('exam_id',x.id).eq('kind','test').order('sort_order').order('exam_date',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(1000))]);
  if(!all.length)return false;
  hl(c?.slug);
  const live=tabs.filter(t=>t.is_visible),liveIds=new Set(live.map(t=>t.id));
  const shown=live.map(t=>({id:t.id,key:t.key,label:t.label,list:all.filter(a=>a.tab_id===t.id)})).filter(t=>t.list.length);
  const loose=all.filter(a=>!a.tab_id);if(loose.length)shown.push({id:'_other',key:'other',label:'Other tests',list:loose});
  if(!shown.length){app.innerHTML=crumbs([['Home','#/'],...(c?[[c.name,'#/c/'+c.slug]]:[]),[x.name]])+'<div class="empty">No tests are open for this exam yet. Check back soon.</div>';return true}
  const th=HUB_THEME[x.theme]||HUB_THEME.indigo,S={tab:null,sec:'',q:'',n:30};
  const saved=ls.get('li_tab_'+x.id,null);S.tab=shown.find(t=>t.id===saved)?.id||shown[0].id;
  const logo=x.cover_url?`<img src="${e(x.cover_url)}" alt="" loading="lazy">`:`<span>${e(x.icon||'🎯')}</span>`;
  app.innerHTML=crumbs([['Home','#/'],...(c?[[c.name,'#/c/'+c.slug]]:[]),[x.name]])+`<section class="hub-ban" style="--h1:${th[0]};--h2:${th[1]}">
    <div class="hub-logo">${logo}</div><div class="hub-tt"><h1>${e(x.name)}</h1>${x.tagline||x.description?`<p>${e(x.tagline||x.description)}</p>`:''}</div>
    <div class="hub-st">${shown.map(t=>`<div><b>${t.list.length}</b><span>${e(t.label)}</span></div>`).join('')}</div></section>
    <div class="hub-bar"><div class="hub-tabs" id="htabs" role="tablist" aria-label="Test types"></div></div>
    <div class="hub-chips" id="hchips" role="group" aria-label="Filter by section"></div>
    <div class="hub-tools" id="htools"><input id="hq" type="search" placeholder="Search tests in ${e(x.name)}…" aria-label="Search tests" autocomplete="off"></div>
    <div class="hub-list" id="hlist" aria-live="polite"></div>`;
  const cur=()=>shown.find(t=>t.id===S.tab),match=a=>(!S.sec||a.section_name===S.sec)&&(!S.q||a.title.toLowerCase().includes(S.q));
  const cardOf=a=>{
    const k=a.section_name?secColor(a.section_name):'var(--acc)',saved=ls.get('li_ex_'+a.id,null),best=ls.get('li_best_'+a.id,null),when=[fmtDate(a.exam_date),a.shift?'Shift '+a.shift:''].filter(Boolean).join(', ');
    const mins=a.duration_minutes?a.duration_minutes+' Mins':'No time limit';
    return `<article class="tcard" style="--k:${k}"><div class="tc-main"><div class="tc-head">${a.is_free?'<span class="tfree">Free</span>':''}${!a.is_published?'<span class="tdraft">Draft</span>':''}<h3>${e(a.title)}</h3></div>
      <div class="tc-meta"><span>${HIC.q}${a.question_count} Questions</span><span>${HIC.m}${numFmt(a.total_marks)} Marks</span><span>${HIC.t}${e(mins)}</span>${best?`<span class="tbest" title="Your best score on this device">Best ${best.pct}%</span>`:''}</div></div>
      <a class="btn ${saved?'ghost':'acc'} tc-go" href="#/exam/${a.id}">${saved?'Resume':'Start Now'}<i aria-hidden="true"> →</i></a>
      <div class="tc-foot"><span class="tc-l">${a.languages?`<span>${HIC.g}${e(a.languages)}</span>`:''}${when?`<span>${HIC.d}${e(when)}</span>`:''}</span><button type="button" class="tc-share" data-sh="${a.id}" aria-label="Share ${e(a.title)}">${HIC.s}Share</button></div></article>`};
  const draw=()=>{
    const t=cur();
    $('#htabs').innerHTML=shown.map(z=>`<button type="button" role="tab" class="htab${z.id===S.tab?' on':''}" aria-selected="${z.id===S.tab}" data-t="${z.id}">${e(z.label)} <small>${z.list.length}</small></button>`).join('');
    const secs=[...new Set(t.list.map(a=>a.section_name).filter(Boolean))];
    $('#hchips').innerHTML=secs.length>1?`<button type="button" class="hchip${S.sec?'':' on'}" data-s="">All</button>`+secs.map(s=>`<button type="button" class="hchip${S.sec===s?' on':''}" data-s="${e(s)}">${e(s)} <small>${t.list.filter(a=>a.section_name===s).length}</small></button>`).join(''):'';
    $('#htools').hidden=t.list.length<9;
    const f=t.list.filter(match);
    $('#hlist').innerHTML=(f.slice(0,S.n).map(cardOf).join('')+(f.length>S.n?`<button type="button" class="btn ghost hub-more" id="hmore">Show ${Math.min(30,f.length-S.n)} more <small>(${f.length-S.n} left)</small></button>`:''))||`<div class="empty">No tests match${S.q?' “'+e(S.q)+'”':''}.</div>`};
  draw();
  $('#htabs').onclick=ev=>{const b=ev.target.closest('[data-t]');if(!b)return;S.tab=b.dataset.t;S.sec='';S.n=30;ls.set('li_tab_'+x.id,S.tab);draw()};
  $('#hchips').onclick=ev=>{const b=ev.target.closest('[data-s]');if(!b)return;S.sec=b.dataset.s;S.n=30;draw()};
  let tm;$('#hq').oninput=ev=>{clearTimeout(tm);tm=setTimeout(()=>{S.q=ev.target.value.trim().toLowerCase();S.n=30;draw()},180)};
  $('#hlist').onclick=async ev=>{
    if(ev.target.closest('#hmore')){S.n+=30;draw();return}
    const b=ev.target.closest('[data-sh]');if(!b)return;const a=all.find(z=>z.id===b.dataset.sh),u=location.href.split('#')[0]+'#/exam/'+a.id;
    try{navigator.share?await navigator.share({title:a.title,url:u}):(await navigator.clipboard.writeText(u),toast('Test link copied'))}catch{}};
  return true}
