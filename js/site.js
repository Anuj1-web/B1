async function loadCats(){cats=await q(sb.from('categories').select('*').order('sort_order'));
  const links=cats.filter(c=>c.is_published).map(c=>`<a href="#/c/${e(c.slug)}" data-s="${e(c.slug)}">${e(c.icon)} ${e(c.name)}</a>`).join('');
  $('#nav').innerHTML=links;$('#mnav').innerHTML=`<a href="#/">🏠 Home</a>${links}<a href="#/saved">🔖 Saved</a>`}


/* ---------- shared by the Tests hub, the Quizzes / Tests category pages and the search results ---------- */
const HUB_THEME={fuchsia:['#4a1259','#c026d3'],indigo:['#1b1a63','#4f46e5'],purple:['#3a1873','#7c3aed'],teal:['#0a3a44','#0e9f8e'],rose:['#66122d','#e11d48'],amber:['#563706','#d97706'],slate:['#18212f','#475569']};
/* every section has its own header colour */
const KIND_THEME={tests:'indigo',quizzes:'rose',videos:'fuchsia',notes:'teal',revision:'amber',articles:'slate',links:'purple'};
const kindAccent=kind=>(HUB_THEME[KIND_THEME[kind]]||HUB_THEME.indigo)[1];
const HIC={
  q:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8"/><path d="M12 17h.01"/></svg>',
  m:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  t:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  g:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  d:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  s:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/></svg>'};
const SEC_COLORS=['#4f46e5','#0e9f8e','#e11d48','#d97706','#7c3aed','#0284c7','#16a34a','#c2410c'];
const secColor=n=>{let h=0;for(const ch of String(n||''))h=(h*31+ch.charCodeAt(0))>>>0;return SEC_COLORS[h%SEC_COLORS.length]};
const numFmt=n=>+(+n||0).toFixed(2);
/* gradient header (logo, name, line, counts) — the same look for exam hubs and category pages */
function banner(o){const th=HUB_THEME[o.theme]||HUB_THEME.indigo;
  return `<section class="hub-ban${o.cat?' cat':''}" style="--h1:${th[0]};--h2:${th[1]}"><div class="hub-logo">${o.logo}</div><div class="hub-tt"><h1>${e(o.name)}</h1>${o.sub?`<p>${e(o.sub)}</p>`:''}</div>${(o.stats||[]).length?`<div class="hub-st">${o.stats.map(t=>`<div><b>${t.n}</b><span>${e(t.l)}</span></div>`).join('')}</div>`:''}</section>`}
/* one horizontal strip for a test or quiz */
function tcardHTML(a,k){
  const saved=a.kind==='test'?ls.get('li_ex_'+a.id,null):null,best=ls.get('li_best_'+a.id,null),when=[fmtDate(a.exam_date),a.shift?'Shift '+a.shift:''].filter(Boolean).join(', ');
  const n=a.question_count||a.questions?.[0]?.count||0,mins=a.duration_minutes?a.duration_minutes+' Mins':'No time limit';
  return `<article class="tcard" style="--k:${k||'var(--acc)'}"><div class="tc-main"><div class="tc-head">${a.is_free!==false?'<span class="tfree">Free</span>':''}${a.is_published===false?'<span class="tdraft">Draft</span>':''}<h3>${e(a.title)}</h3></div>
    <div class="tc-meta"><span>${HIC.q}${n} Questions</span>${+a.total_marks>0?`<span>${HIC.m}${numFmt(a.total_marks)} Marks</span>`:''}<span>${HIC.t}${e(mins)}</span>${best?`<span class="tbest" title="Your best score on this device">Best ${best.pct}%</span>`:''}</div></div>
    <a class="btn ${saved?'ghost':'acc'} tc-go" href="#/exam/${a.id}">${saved?'Resume':'Start Now'}<i aria-hidden="true"> →</i></a>
    <div class="tc-foot"><span class="tc-l">${a.languages?`<span>${HIC.g}${e(a.languages)}</span>`:''}${when?`<span>${HIC.d}${e(when)}</span>`:''}${!a.languages&&!when&&a.description?`<span>${e(a.description)}</span>`:''}</span><button type="button" class="tc-share" data-sh="${a.id}" aria-label="Share ${e(a.title)}">${HIC.s}Share</button></div></article>`}
/* one horizontal strip for a lesson / note / sheet / link (Video Lessons, Notes & PDFs, Revision Sheets) */
const IGO={video:'Watch',youtube:'Watch',pdf:'Open PDF',article:'Read',link:'Open'};
function istripHTML(i,k){const th=thumbOf(i),vid=['video','youtube'].includes(i.type);
  return `<a class="tcard icard" href="#/i/${i.id}" style="--k:${k||'var(--acc)'}"><span class="ithumb${vid?' vid':''}"${th?` style="background-image:url('${e(th)}')"`:''} aria-hidden="true">${th?'':(TI[i.type]||'📄')}</span>
    <div class="tc-head"><span class="itype">${KL[i.type]||'Item'}</span><h3>${e(i.title)}</h3></div>
    <div class="tc-meta">${i.duration?`<span>${HIC.t}${e(i.duration)}</span>`:''}${i.description?`<span class="idesc">${e(i.description)}</span>`:''}</div>
    <span class="btn acc tc-go">${IGO[i.type]||'Open'}<i aria-hidden="true"> →</i></span></a>`}
/* the Share button of a strip */
function wireShare(root,list){root.addEventListener('click',async ev=>{const b=ev.target.closest('[data-sh]');if(!b)return;const a=list.find(z=>z.id===b.dataset.sh);if(!a)return;const u=location.href.split('#')[0]+'#/exam/'+a.id;
  try{navigator.share?await navigator.share({title:a.title,url:u}):(await navigator.clipboard.writeText(u),toast('Test link copied'))}catch{}})}

const KL={video:'Video',youtube:'Video',pdf:'PDF',article:'Article',link:'Link'},KA={video:'▶ Play',youtube:'▶ Play',pdf:'Open',article:'Read',link:'Open'};
function card(i){const c=cats.find(x=>x.id===i.category_id),k=KC[c?.kind]||'#0e8f7e',mine=ls.get('li_liked',[]).includes(i.id)?'♥ Liked':ls.get('li_saved',[]).includes(i.id)?'🔖 Saved':'';
  return `<article class="card entry" tabindex="0" role="link" data-go="#/i/${i.id}" style="--k:${k}"><div class="th" style="${thumbOf(i)?`background-image:url('${e(thumbOf(i))}')`:''}">${thumbOf(i)?'':TI[i.type]}<span class="badge">${KL[i.type]}</span></div><div class="cb"><h3>${e(i.title)}</h3><p>${e(i.description)}</p><div class="meta"><span>${KL[i.type]}${i.duration?' · '+e(i.duration):''}</span><span>${mine}</span></div></div><span class="go chev">${KA[i.type]}</span></article>`}
function aCard(a){const n=a.question_count||a.questions?.[0]?.count||0,k=a.kind==='test'?'#10243a':'#d9468f';
  return `<article class="card entry" tabindex="0" role="link" data-go="#/exam/${a.id}" style="--k:${k}"><div class="th">${a.kind==='test'?'🏆':'🧠'}<span class="badge">${a.kind}</span></div><div class="cb"><h3>${e(a.title)}</h3><p>${e(a.description)}</p><div class="meta"><span>${n} questions${a.duration_minutes?` · ${a.duration_minutes} min`:''}</span><span>${a.kind==='test'&&a.mode==='sectional_timer'?'Sectional timers':a.kind==='test'&&a.mode==='single_timer'?'Sections':a.pass_percent!=null?'Pass '+a.pass_percent+'%':''}</span></div></div><span class="btn sm acc go">Start</span></article>`}
app.addEventListener('click',ev=>{
  const g=ev.target.closest('[data-go]');if(g&&!ev.target.closest('button,a'))location.hash=g.dataset.go});
app.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.dataset.go)location.hash=ev.target.dataset.go});

async function home(){
  const [items,as]=await Promise.all([q(sb.from('items').select('category_id').limit(5000)),q(sb.from('assessments').select('category_id').limit(5000))]);
  const cnt={};items.forEach(i=>cnt[i.category_id]=(cnt[i.category_id]||0)+1);as.forEach(a=>cnt[a.category_id]=(cnt[a.category_id]||0)+1);
  const live=cats.filter(c=>c.is_published);
  app.innerHTML=`<section class="herobox"><span class="pill">✨ Free study hub</span><h1>Learn a little, <em>every day.</em></h1><p>Video lessons, notes, revision sheets, quizzes and tests — all in one calm place.</p>
  ${sbar('Search notes, videos, chapters, tests…',1)}
  <div class="chips" id="chips">${live.slice(0,6).map(c=>`<a class="chip" href="#/c/${e(c.slug)}">${e(c.icon)} ${e(c.name)}</a>`).join('')}</div></section>
  <div id="browse"><div class="sec"><h2>Explore</h2></div>
  <div class="grid cats">${live.map(c=>`<a class="cat" style="--k:${KC[c.kind]||'#4f46e5'}" href="#/c/${e(c.slug)}"><div class="ic">${e(c.icon)}</div><h3>${e(c.name)}</h3><small>${c.description?`<span class="cd">${e(c.description)} · </span>`:''}${cnt[c.id]||0} item${(cnt[c.id]||0)===1?'':'s'}</small></a>`).join('')}</div>
</div>
  <div id="sres" class="sres" hidden></div>`;
  wireSearch(()=>({type:'all'}),'#browse,#chips')}

async function catPage(s){
  const c=cats.find(x=>x.slug===s);if(!c){app.innerHTML='<div class="empty">Section not found.</div>';return}
  hl(s);
  const [exs,items,as]=await Promise.all([q(sb.from('exams').select('*').eq('category_id',c.id).order('sort_order')),
    q(sb.from('items').select(ICOLS).eq('category_id',c.id).is('folder_id',null).order('sort_order').order('created_at',{ascending:false})),
    q(sb.from('assessments').select('*,questions(count)').eq('category_id',c.id).is('folder_id',null).is('exam_id',null).order('sort_order').order('created_at',{ascending:false}))]);
  const[fs,tc]=exs.length?await Promise.all([q(sb.from('folders').select('id,exam_id,name,sort_order').in('exam_id',exs.map(x=>x.id)).is('parent_id',null).order('sort_order')),q(sb.from('assessments').select('exam_id,tab_id').in('exam_id',exs.map(x=>x.id)).limit(5000))]):[[],[]];
  const tcount={};tc.forEach(a=>tcount[a.exam_id]=(tcount[a.exam_id]||0)+1);
  if(['tests','quizzes','videos','notes','revision'].includes(c.kind))return catStrips(c,exs,items,as,fs,tc,tcount);
  const tags=[...new Set(items.flatMap(i=>i.tags||[]))];let tg='',tx='';const k=KC[c.kind]||'#0e8f7e';
  app.innerHTML=crumbs([['Home','#/'],[c.name]])+`<div class="hero" style="padding:8px 0 10px"><h1 style="font-size:clamp(1.8rem,5vw,3rem)">${e(c.icon)} ${e(c.name)}</h1><p>${e(c.description||'')}</p></div>
  ${sbar('Search in '+c.name+' — chapters, videos, tests…')}<div id="browse">${exs.length?`<div class="sec"><h2>Choose your exam</h2></div><div class="grid rows cats">${exs.map(x=>tile('#/x/'+x.id,x.icon||'🎯',x.cover_url,x.name,x.description||(tcount[x.id]?plural(tcount[x.id],'test'):plural(fs.filter(f=>f.exam_id===x.id).length,'batch / folder')),k)).join('')}</div>`:''}
  ${items.length||as.length?`<div class="sec"><h2>${exs.length?'Other content':'All content'}</h2></div>
  ${tags.length?`<div class="tags" id="tg">${tags.map(t=>`<span class="tag" tabindex="0" data-t="${e(t)}">${e(t)}</span>`).join('')}</div>`:''}<div class="grid rows" id="list"></div>`:''}
  ${exs.length||items.length||as.length?'':'<div class="empty">Nothing in this section yet. Check back soon.</div>'}</div><div id="sres" class="sres" hidden></div>`;
  wireSearch(()=>({type:'cat',cat:c.id,exams:exs.map(x=>x.id),label:c.name}),'#browse');
  if(!$('#list'))return;
  const draw=()=>{const f=items.filter(i=>(!tg||(i.tags||[]).includes(tg))&&(!tx||(i.title+(i.description||'')).toLowerCase().includes(tx)));
    $('#list').innerHTML=(f.map(card).join('')+as.map(aCard).join(''))||'<div class="empty" style="grid-column:1/-1">No matches.</div>'};
  draw();
  $('#tg')?.addEventListener('click',ev=>{const t=ev.target.closest('.tag');if(!t)return;tg=tg===t.dataset.t?'':t.dataset.t;document.querySelectorAll('.tag').forEach(x=>x.classList.toggle('on',x.dataset.t===tg));draw()})}

/* Category pages (Video Lessons, Notes & PDFs, Revision Sheets, Quizzes, Tests): gradient header in the section's own colour,
   then one horizontal strip per exam / quiz (phones get the same strips, stacked) */
const NOUN={videos:['video','videos'],notes:['note','notes'],revision:['sheet','sheets']};
async function catStrips(c,exs,items,as,fs,tc,tcount){
  const k=kindAccent(c.kind),isC=!!NOUN[c.kind],exIds=exs.map(x=>x.id);
  const[tabs,allF,allI]=await Promise.all([exs.length&&!isC?q(sb.from('exam_tabs').select('id,exam_id,label,sort_order,is_visible').in('exam_id',exIds).order('sort_order')):[],
    exs.length&&isC?q(sb.from('folders').select('id,exam_id').in('exam_id',exIds).limit(5000)):[],
    exs.length&&isC?q(sb.from('items').select('folder_id').eq('category_id',c.id).not('folder_id','is',null).limit(5000)):[]]);
  const per={},ipe={},f2e=Object.fromEntries(allF.map(f=>[f.id,f.exam_id]));
  tc.forEach(a=>{const p=per[a.exam_id]=per[a.exam_id]||{};p[a.tab_id||'_']=(p[a.tab_id||'_']||0)+1});
  allI.forEach(i=>{const x=f2e[i.folder_id];if(x)ipe[x]=(ipe[x]||0)+1});
  const shown=isC?exs.filter(x=>ipe[x.id]):exs;     /* an exam with nothing live yet is not shown */
  const xcard=x=>{const fn=fs.filter(f=>f.exam_id===x.id),n=tcount[x.id]||0,p=per[x.id]||{},ni=ipe[x.id]||0,
      tsum=tabs.filter(t=>t.exam_id===x.id&&t.is_visible&&p[t.id]).map(t=>`<span>${p[t.id]} ${e(t.label)}</span>`).join(''),
      subj=fn.map(f=>f.name).join(' · ');
    const meta=isC?`<span>${HIC.m}${ni} ${ni===1?NOUN[c.kind][0]:NOUN[c.kind][1]}</span>${fn.length?`<span>${plural(fn.length,'subject')}</span>`:''}`
      :`${n?`<span>${HIC.m}${plural(n,'test')}</span>`:`<span>${HIC.m}${plural(fn.length,'batch / folder')}</span>`}${n&&x.languages?`<span>${HIC.g}${e(x.languages)}</span>`:''}`;
    return `<a class="tcard xcard" href="#/x/${x.id}" style="--k:${k}"><span class="xlogo">${x.cover_url?`<img src="${e(x.cover_url)}" alt="" loading="lazy">`:e(x.icon||'🎯')}</span>
      <div class="tc-head"><h3>${e(x.name)}</h3></div><div class="tc-meta">${meta}</div>
      <span class="btn acc tc-go">${isC?'Open':'View tests'}<i aria-hidden="true"> →</i></span>${(isC?subj:tsum)||x.description?`<div class="tc-foot"><span class="tc-l">${isC?(subj?`<span class="tabsum"><span>${e(subj)}</span></span>`:''):tsum?`<span class="tabsum">${tsum}</span>`:`<span>${e(x.description)}</span>`}</span></div>`:''}</a>`};
  const totalI=Object.values(ipe).reduce((n,v)=>n+v,0)+items.length,totalTests=tc.length+as.length;
  const stats=isC?[...(shown.length?[{n:shown.length,l:shown.length===1?'Exam':'Exams'}]:[]),{n:totalI,l:totalI===1?NOUN[c.kind][0][0].toUpperCase()+NOUN[c.kind][0].slice(1):NOUN[c.kind][1][0].toUpperCase()+NOUN[c.kind][1].slice(1)}]
    :c.kind==='tests'?[...(exs.length?[{n:exs.length,l:exs.length===1?'Exam':'Exams'}]:[]),{n:totalTests,l:totalTests===1?'Test':'Tests'}]:[{n:as.length,l:as.length===1?'Quiz':'Quizzes'}];
  app.innerHTML=crumbs([['Home','#/'],[c.name]])+banner({cat:1,logo:`<span>${e(c.icon)}</span>`,name:c.name,sub:c.description,stats,theme:KIND_THEME[c.kind]})+sbar('Search in '+c.name+' — exams, chapters, lessons…')+
  `<div id="browse">${shown.length?`<div class="sec"><h2>Choose your exam</h2></div><div class="hub-list">${shown.map(xcard).join('')}</div>`:''}
  ${as.length?`<div class="sec"><h2>${exs.length?'Other tests':c.kind==='quizzes'?'All quizzes':'All tests'}</h2></div><div class="hub-list" id="aslist">${as.map(a=>tcardHTML(a,k)).join('')}</div>`:''}
  ${items.length?`<div class="sec"><h2>${shown.length?'More to explore':'All '+(isC?NOUN[c.kind][1]:'content')}</h2></div><div class="hub-list">${items.map(i=>istripHTML(i,k)).join('')}</div>`:''}
  ${shown.length||as.length||items.length?'':'<div class="empty">Nothing in this section is live yet. Check back soon.</div>'}</div><div id="sres" class="sres" hidden></div>`;
  wireSearch(()=>({type:'cat',cat:c.id,exams:exs.map(x=>x.id),label:c.name}),'#browse');wireShare($('#browse'),as)}

async function viewer(id){
  const i=(await q(rawFrom('items').select(ICOLS).eq('id',id).limit(1)))[0];if(!i){app.innerHTML='<div class="empty">Item not found.</div>';return}
  const c=cats.find(x=>x.id===i.category_id),trail=i.folder_id?await folderTrail(i.folder_id):null,rel=await q((i.folder_id?sb.from('items').select(ICOLS).eq('folder_id',i.folder_id):sb.from('items').select(ICOLS).eq('category_id',i.category_id)).neq('id',id).order('sort_order').limit(8));
  const rv=ls.get('li_recent',[]).filter(x=>x!==id);rv.unshift(id);ls.set('li_recent',rv.slice(0,20));
  let liked=ls.get('li_liked',[]).includes(id),saved=ls.get('li_saved',[]).includes(id);
  const m=mediaOf(i);let media='';
  if(m.kind==='youtube'||m.kind==='embed')media=`<div class="player"><div class="pnote">Loading video… <a href="${e(m.watch)}" target="_blank" rel="noopener">Open it in a new tab</a></div><iframe src="${e(m.src)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;picture-in-picture;fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="${e(i.title)}"></iframe></div><div class="acts"><a class="btn ghost sm" href="${e(m.watch)}" target="_blank" rel="noopener">${m.kind==='youtube'?'Watch on YouTube ↗':'Open video in new tab ↗'}</a></div>`;
  else if(m.kind==='badlink')media='<div class="empty">This video link isn’t supported. Paste a YouTube, Vimeo or Google Drive link, or upload an MP4 file.</div>';
  else if(m.kind==='video')media=`<div class="player" id="pl"><video id="vp" src="${e(i.url)}${String(i.url).includes('#')?'':'#t=0.1'}" controls playsinline preload="metadata" ${i.thumbnail_url?`poster="${e(i.thumbnail_url)}"`:''}></video></div><div id="vwarn"></div><div class="acts"><label>Speed <select id="sp" style="width:auto;display:inline-block">${[.5,.75,1,1.25,1.5,2].map(s=>`<option ${s==1?'selected':''}>${s}</option>`).join('')}</select></label><button class="btn ghost sm" id="pip">Picture in picture</button></div>`;
  else if(i.type==='pdf')media=`<div class="pdf"><iframe src="${e(i.url)}#toolbar=1&view=FitH" title="${e(i.title)}"></iframe></div>`;
  else if(i.type==='article')media=`<div class="art">${e(i.body)}</div>`;
  else media=`<div class="empty"><p>This opens an external page.</p><a class="btn acc" target="_blank" rel="noopener" href="${e(i.url)}">Open link</a></div>`;
  app.innerHTML=`${trail?crumbs([...trail.crumbs,[i.title]]):crumbs([['Home','#/'],[c?.name||'Back',c?`#/c/${c.slug}`:'#/'],[i.title]])}<div class="view"><div><h1 style="font-size:clamp(1.6rem,4vw,2.4rem)">${e(i.title)}</h1><div class="tags">${(i.tags||[]).map(t=>`<span class="tag">${e(t)}</span>`).join('')}</div>${media}
  <div class="acts"><button class="btn ghost sm" id="lk">♥ Like</button><button class="btn ghost sm" id="sv">🔖 Save</button><button class="btn ghost sm" id="sh">Share</button>${i.url&&['pdf','video'].includes(i.type)?`<a class="btn ghost sm" href="${e(i.url)}" download target="_blank" rel="noopener">Download</a><a class="btn ghost sm" href="${e(i.url)}" target="_blank" rel="noopener">Open full screen</a>`:''}</div>
  <p style="color:var(--mute);max-width:70ch">${e(i.description)}</p></div>
  <aside><h3 style="margin-bottom:8px">More in ${e(trail?.name||c?.name||'this section')}</h3>${rel.map(r=>`<a class="mini" href="#/i/${r.id}" style="--k:${KC[c?.kind]||'#0e8f7e'}"><div class="t" ${thumbOf(r)?`style="background-image:url('${e(thumbOf(r))}')"`:''}>${thumbOf(r)?'':TI[r.type]}</div><div><b>${e(r.title)}</b><br><small>${KL[r.type]}</small></div></a>`).join('')||'<small>Nothing else yet.</small>'}</aside></div>`;
  const paint=()=>{$('#lk').classList.toggle('liked',liked);$('#sv').textContent=saved?'🔖 Saved':'🔖 Save';$('#lk').textContent=liked?'♥ Liked':'♥ Like'};paint();
  $('#lk').onclick=async()=>{const l=ls.get('li_liked',[]),on=!liked;await q(sb.rpc('set_like',{p_item:id,p_client:cid,p_on:on}));liked=on;ls.set('li_liked',on?[...l,id]:l.filter(x=>x!==id));paint()};
  $('#sv').onclick=()=>{let s=ls.get('li_saved',[]);saved?s=s.filter(x=>x!==id):s.push(id);ls.set('li_saved',s);saved=!saved;paint();toast(saved?'Saved to your bookmarks':'Removed from bookmarks')};
  $('#sh').onclick=async()=>{const u=location.href;try{navigator.share?await navigator.share({title:i.title,url:u}):(await navigator.clipboard.writeText(u),toast('Link copied'))}catch{}};
  const vp=$('#vp');if(vp){
    const dl=`<a class="btn acc sm" href="${e(i.url)}" target="_blank" rel="noopener" download>Download video</a>`;
    vp.addEventListener('error',()=>{$('#pl').innerHTML=`<div class="pfail"><div><b>This video can’t be played here</b><p>The file may be missing, or it uses a format this browser can’t play (for example H.265 / HEVC).</p>${dl}</div></div>`});
    vp.addEventListener('loadedmetadata',()=>{if(vp.videoWidth===0&&vp.duration>0)$('#vwarn').innerHTML=`<div class="notice">This browser can play the sound but not the picture of this video (it is probably H.265 / HEVC). ${dl}</div>`});
    const k='li_pos_'+id;vp.onloadedmetadata=()=>{const p=ls.get(k,0);if(p>5&&p<vp.duration-5)vp.currentTime=p};vp.ontimeupdate=()=>ls.set(k,Math.floor(vp.currentTime));
    $('#sp').onchange=ev=>vp.playbackRate=+ev.target.value;$('#pip').onclick=()=>document.pictureInPictureEnabled?vp.requestPictureInPicture():toast('Not supported here',1)}}

async function saved(){const ids=ls.get('li_saved',[]);const items=ids.length?await q(sb.from('items').select(ICOLS).in('id',ids)):[];
  app.innerHTML=`<div class="sec"><h2>🔖 Your saved items</h2></div><div class="grid rows">${items.map(card).join('')||'<div class="empty" style="grid-column:1/-1">Nothing saved yet. Tap “Save” on any item.</div>'}</div>`}

