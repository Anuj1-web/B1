async function loadCats(){cats=await q(sb.from('categories').select('*').order('sort_order'));
  const links=cats.filter(c=>c.is_published).map(c=>`<a href="#/c/${e(c.slug)}" data-s="${e(c.slug)}">${e(c.icon)} ${e(c.name)}</a>`).join('');
  $('#nav').innerHTML=links;$('#mnav').innerHTML=`<a href="#/">🏠 Home</a>${links}<a href="#/saved">🔖 Saved</a>`}

const KL={video:'Video',youtube:'Video',pdf:'PDF',article:'Article',link:'Link'},KA={video:'▶ Play',youtube:'▶ Play',pdf:'Open',article:'Read',link:'Open'};
function card(i){const c=cats.find(x=>x.id===i.category_id),k=KC[c?.kind]||'#0e8f7e',mine=ls.get('li_liked',[]).includes(i.id)?'♥ Liked':ls.get('li_saved',[]).includes(i.id)?'🔖 Saved':'';
  return `<article class="card entry" tabindex="0" role="link" data-go="#/i/${i.id}" style="--k:${k}"><div class="th" style="${thumbOf(i)?`background-image:url('${e(thumbOf(i))}')`:''}">${thumbOf(i)?'':TI[i.type]}<span class="badge">${KL[i.type]}</span></div><div class="cb"><h3>${e(i.title)}</h3><p>${e(i.description)}</p><div class="meta"><span>${KL[i.type]}${i.duration?' · '+e(i.duration):''}</span><span>${mine}</span></div></div><span class="go chev">${KA[i.type]}</span></article>`}
function aCard(a){const n=a.questions?.[0]?.count||0,k=a.kind==='test'?'#10243a':'#d9468f';
  return `<article class="card entry" tabindex="0" role="link" data-go="#/exam/${a.id}" style="--k:${k}"><div class="th">${a.kind==='test'?'🏆':'🧠'}<span class="badge">${a.kind}</span></div><div class="cb"><h3>${e(a.title)}</h3><p>${e(a.description)}</p><div class="meta"><span>${n} questions${a.duration_minutes?` · ${a.duration_minutes} min`:''}</span><span>${a.kind==='test'&&a.mode==='sectional_timer'?'Sectional timers':a.kind==='test'&&a.mode==='single_timer'?'Sections':'Pass '+a.pass_percent+'%'}</span></div></div><span class="btn sm acc go">Start</span></article>`}
app.addEventListener('click',ev=>{
  const g=ev.target.closest('[data-go]');if(g&&!ev.target.closest('button,a'))location.hash=g.dataset.go});
app.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.dataset.go)location.hash=ev.target.dataset.go});

async function home(){
  const [items,as]=await Promise.all([q(sb.from('items').select(ICOLS).order('created_at',{ascending:false}).limit(60)),q(sb.from('assessments').select('category_id'))]);
  const cnt={};items.forEach(i=>cnt[i.category_id]=(cnt[i.category_id]||0)+1);as.forEach(a=>cnt[a.category_id]=(cnt[a.category_id]||0)+1);
  const live=cats.filter(c=>c.is_published);
  /* “Fresh on the shelf”: 4 newest items are rendered; CSS shows 2 on phones and up to 4 on larger screens */
  app.innerHTML=`<section class="herobox"><span class="pill">✨ Free study hub</span><h1>Learn a little, <em>every day.</em></h1><p>Video lessons, notes, revision sheets, quizzes and tests — all in one calm place.</p>
  ${sbar('Search notes, videos, chapters, tests…',1)}
  <div class="chips" id="chips">${live.slice(0,6).map(c=>`<a class="chip" href="#/c/${e(c.slug)}">${e(c.icon)} ${e(c.name)}</a>`).join('')}</div></section>
  <div id="browse"><div class="sec"><h2>Explore</h2></div>
  <div class="grid cats">${live.map(c=>`<a class="cat" style="--k:${KC[c.kind]||'#4f46e5'}" href="#/c/${e(c.slug)}"><div class="ic">${e(c.icon)}</div><h3>${e(c.name)}</h3><small>${e(c.description||'')}${c.description?' · ':''}${cnt[c.id]||0} items</small></a>`).join('')}</div>
  <div class="sec"><h2>Fresh on the shelf</h2></div><div class="grid rows" id="latest">${items.slice(0,4).map(card).join('')||'<div class="empty">Nothing here yet. Add content from the admin page.</div>'}</div></div>
  <div id="sres" class="sres" hidden></div>`;
  wireSearch(()=>({type:'all'}),'#browse,#chips')}

async function catPage(s){
  const c=cats.find(x=>x.slug===s);if(!c){app.innerHTML='<div class="empty">Section not found.</div>';return}
  hl(s);
  const [exs,items,as]=await Promise.all([q(sb.from('exams').select('*').eq('category_id',c.id).order('sort_order')),
    q(sb.from('items').select(ICOLS).eq('category_id',c.id).is('folder_id',null).order('sort_order').order('created_at',{ascending:false})),
    q(sb.from('assessments').select('*,questions(count)').eq('category_id',c.id).is('folder_id',null).order('sort_order').order('created_at',{ascending:false}))]);
  const fs=exs.length?await q(sb.from('folders').select('exam_id').in('exam_id',exs.map(x=>x.id)).is('parent_id',null)):[];
  const tags=[...new Set(items.flatMap(i=>i.tags||[]))];let tg='',tx='';const k=KC[c.kind]||'#0e8f7e';
  app.innerHTML=crumbs([['Home','#/'],[c.name]])+`<div class="hero" style="padding:8px 0 10px"><h1 style="font-size:clamp(1.8rem,5vw,3rem)">${e(c.icon)} ${e(c.name)}</h1><p>${e(c.description||'')}</p></div>
  ${sbar('Search in '+c.name+' — chapters, videos, tests…')}<div id="browse">${exs.length?`<div class="sec"><h2>Choose your exam</h2></div><div class="grid rows cats">${exs.map(x=>tile('#/x/'+x.id,x.icon||'🎯',x.cover_url,x.name,x.description||plural(fs.filter(f=>f.exam_id===x.id).length,'batch / folder'),k)).join('')}</div>`:''}
  ${items.length||as.length?`<div class="sec"><h2>${exs.length?'Other content':'All content'}</h2></div>
  ${tags.length?`<div class="tags" id="tg">${tags.map(t=>`<span class="tag" tabindex="0" data-t="${e(t)}">${e(t)}</span>`).join('')}</div>`:''}<div class="grid rows" id="list"></div>`:''}
  ${exs.length||items.length||as.length?'':'<div class="empty">Nothing in this section yet. Check back soon.</div>'}</div><div id="sres" class="sres" hidden></div>`;
  wireSearch(()=>({type:'cat',cat:c.id,exams:exs.map(x=>x.id),label:c.name}),'#browse');
  if(!$('#list'))return;
  const draw=()=>{const f=items.filter(i=>(!tg||(i.tags||[]).includes(tg))&&(!tx||(i.title+(i.description||'')).toLowerCase().includes(tx)));
    $('#list').innerHTML=(f.map(card).join('')+as.map(aCard).join(''))||'<div class="empty" style="grid-column:1/-1">No matches.</div>'};
  draw();
  $('#tg')?.addEventListener('click',ev=>{const t=ev.target.closest('.tag');if(!t)return;tg=tg===t.dataset.t?'':t.dataset.t;document.querySelectorAll('.tag').forEach(x=>x.classList.toggle('on',x.dataset.t===tg));draw()})}

async function viewer(id){
  const i=(await q(sb.from('items').select(ICOLS).eq('id',id).limit(1)))[0];if(!i){app.innerHTML='<div class="empty">Item not found.</div>';return}
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

