/* Subject shelf — the page of ONE exam inside Video Lessons, Notes & PDFs or Revision Sheets (loaded on demand by examPage).
   Banner  →  subject tabs  →  chapter chips  →  strips grouped chapter by chapter.
   Subjects are the exam's top-level folders, chapters are the folders inside a subject. Only what is Live is shown. */
const LCOLS='id,category_id,folder_id,title,description,type,url,thumbnail_url,is_published,created_at,duration,sort_order';
const byOrder=(a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(a.name).localeCompare(String(b.name),undefined,{numeric:true})||String(a.created_at).localeCompare(String(b.created_at));
const bySubject=(a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(a.created_at).localeCompare(String(b.created_at));
const byItem=(a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(a.created_at).localeCompare(String(b.created_at));

async function shelfPage(x,c){
  const fs=await q(sb.from('folders').select('id,name,icon,parent_id,sort_order,created_at').eq('exam_id',x.id).limit(3000));
  if(!fs.length)return false;
  hl(c?.slug);
  /* the live folder tree (a folder whose parent is hidden is hidden too) */
  const kids={},ok=new Set();fs.forEach(f=>{(kids[f.parent_id||'']=kids[f.parent_id||'']||[]).push(f)});Object.values(kids).forEach(l=>l.sort(byOrder));(kids['']||[]).sort(bySubject);   /* subjects: the admin's order; chapters: 1, 2, 10 … */
  const reach=f=>{ok.add(f.id);(kids[f.id]||[]).forEach(reach)};(kids['']||[]).forEach(reach);
  const ids=[...ok];let items=[];
  for(let i=0;i<ids.length;i+=60)for(let off=0;;off+=1000){const part=await q(sb.from('items').select(LCOLS).in('folder_id',ids.slice(i,i+60)).range(off,off+999));items=items.concat(part);if(part.length<1000)break}
  /* each subject → its chapters (a chapter and anything inside it, in order); items placed straight in the subject come first */
  const subjects=(kids['']||[]).map(s=>{const groups=[],own=items.filter(i=>i.folder_id===s.id).sort(byItem);
    if(own.length)groups.push({id:s.id,title:'',items:own});
    const walk=(f,path)=>{const l=items.filter(i=>i.folder_id===f.id).sort(byItem);if(l.length)groups.push({id:f.id,title:path.join(' › '),items:l});(kids[f.id]||[]).forEach(ch=>walk(ch,[...path,ch.name]))};
    (kids[s.id]||[]).forEach(ch=>walk(ch,[ch.name]));
    return{id:s.id,name:s.name,icon:s.icon,groups,n:groups.reduce((t,g)=>t+g.items.length,0)}}).filter(s=>s.n);
  const th=x.theme||KIND_THEME[c.kind]||'indigo',k=(HUB_THEME[th]||HUB_THEME.indigo)[1],noun=NOUN[c.kind]||['item','items'],total=subjects.reduce((t,s)=>t+s.n,0);
  const logo=x.cover_url?`<img src="${e(x.cover_url)}" alt="" loading="lazy">`:`<span>${e(x.icon||c.icon||'📚')}</span>`;
  const head=crumbs([['Home','#/'],...(c?[[c.name,'#/c/'+c.slug]]:[]),[x.name]])+banner({logo,name:x.name,sub:x.tagline||x.description,stats:[{n:total,l:total===1?noun[0][0].toUpperCase()+noun[0].slice(1):noun[1][0].toUpperCase()+noun[1].slice(1)},{n:subjects.length,l:subjects.length===1?'Subject':'Subjects'}],theme:th});
  if(!subjects.length){app.innerHTML=head+`<div class="empty">No ${noun[1]} are live in this exam yet. Check back soon.</div>`;return true}
  const S={sub:null,chap:'',q:'',n:40},saved=ls.get('li_stab_'+x.id,null);S.sub=subjects.find(s=>s.id===saved)?.id||subjects[0].id;
  app.innerHTML=head+`<div class="hub-bar"><div class="hub-tabs" id="htabs" role="tablist" aria-label="Subjects"></div></div>
    <div class="hub-chips" id="hchips" role="group" aria-label="Filter by chapter"></div>
    <div class="hub-tools" id="htools"><input id="hq" type="search" placeholder="Search in ${e(x.name)}…" aria-label="Search" autocomplete="off"></div>
    <div id="hlist" aria-live="polite"></div>`;
  const cur=()=>subjects.find(s=>s.id===S.sub),match=i=>!S.q||(i.title+' '+(i.description||'')).toLowerCase().includes(S.q);
  const draw=()=>{
    const s=cur(),multi=s.groups.length>1;
    $('#htabs').innerHTML=subjects.map(z=>`<button type="button" role="tab" class="htab${z.id===S.sub?' on':''}" aria-selected="${z.id===S.sub}" data-t="${z.id}">${e(z.name)} <small>${z.n}</small></button>`).join('');
    const chaps=s.groups.filter(g=>g.title);
    $('#hchips').innerHTML=chaps.length>1?`<button type="button" class="hchip${S.chap?'':' on'}" data-c="">All chapters</button>`+chaps.map(g=>`<button type="button" class="hchip${S.chap===g.id?' on':''}" data-c="${g.id}">${e(g.title)} <small>${g.items.length}</small></button>`).join(''):'';
    $('#htools').hidden=s.n<9;
    /* chapter by chapter, up to S.n strips, then “Show more” */
    let left=S.n,shown=0,html='';const rest=[];
    for(const g of s.groups){if(S.chap&&g.id!==S.chap)continue;const l=g.items.filter(match);if(!l.length)continue;
      if(left<=0){rest.push(...l);continue}
      const part=l.slice(0,left);left-=part.length;shown+=part.length;rest.push(...l.slice(part.length));
      html+=`<div class="sec chap"><h2>${e(g.title||(multi?'General':s.name))}</h2><small>${l.length} ${l.length===1?noun[0]:noun[1]}</small></div><div class="hub-list">${part.map(i=>istripHTML(i,k)).join('')}</div>`}
    $('#hlist').innerHTML=(html||`<div class="empty">Nothing matches${S.q?' “'+e(S.q)+'”':''}.</div>`)+(rest.length?`<div style="display:grid;margin-top:14px"><button type="button" class="btn ghost hub-more" id="hmore">Show more <small>(${rest.length} left)</small></button></div>`:'')};
  draw();
  $('#htabs').onclick=ev=>{const b=ev.target.closest('[data-t]');if(!b)return;S.sub=b.dataset.t;S.chap='';S.n=40;ls.set('li_stab_'+x.id,S.sub);draw()};
  $('#hchips').onclick=ev=>{const b=ev.target.closest('[data-c]');if(!b)return;S.chap=b.dataset.c;S.n=40;draw()};
  let tm;$('#hq').oninput=ev=>{clearTimeout(tm);tm=setTimeout(()=>{S.q=ev.target.value.trim().toLowerCase();S.n=40;draw()},180)};
  $('#hlist').addEventListener('click',ev=>{if(ev.target.closest('#hmore')){S.n+=40;draw()}});
  return true}
