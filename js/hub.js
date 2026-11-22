/* Tests hub — the page of ONE exam inside a "tests" category (loaded on demand by examPage).
   Banner  →  tab switch (Full Test / Sectional / PYQ / AI …)  →  section chips  →  one horizontal card per test.
   Which tabs exist, which are live, and which tests are live is all controlled from  Admin → Tests Hub. */
const HCOLS='id,title,kind,exam_id,tab_id,section_name,is_free,is_published,exam_date,shift,languages,syllabus,question_count,total_marks,duration_minutes,mode,sort_order,created_at';
async function hubPage(x,c){
  const[tabs,all]=await Promise.all([q(sb.from('exam_tabs').select('*').eq('exam_id',x.id).order('sort_order')),
    q(sb.from('assessments').select(HCOLS).eq('exam_id',x.id).eq('kind','test').order('sort_order').order('exam_date',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(1000))]);
  if(!all.length)return false;
  hl(c?.slug);
  const live=tabs.filter(t=>t.is_visible),liveIds=new Set(live.map(t=>t.id));
  const shown=live.map(t=>({id:t.id,key:t.key,label:t.label,list:all.filter(a=>a.tab_id===t.id)})).filter(t=>t.list.length);
  const loose=all.filter(a=>!a.tab_id);if(loose.length)shown.push({id:'_other',key:'other',label:'Other tests',list:loose});
  if(!shown.length){app.innerHTML=crumbs([['Home','#/'],...(c?[[c.name,'#/c/'+c.slug]]:[]),[x.name]])+'<div class="empty">No tests are open for this exam yet. Check back soon.</div>';return true}
  const S={tab:null,sec:'',q:'',n:30};
  const saved=ls.get('li_tab_'+x.id,null);S.tab=shown.find(t=>t.id===saved)?.id||shown[0].id;
  const logo=x.cover_url?`<img src="${e(x.cover_url)}" alt="" loading="lazy">`:`<span>${e(x.icon||'🎯')}</span>`;
  app.innerHTML=crumbs([['Home','#/'],...(c?[[c.name,'#/c/'+c.slug]]:[]),[x.name]])+banner({logo,name:x.name,sub:x.tagline||x.description,stats:shown.map(t=>({n:t.list.length,l:t.label})),theme:x.theme})+`
    <div class="hub-bar"><div class="hub-tabs" id="htabs" role="tablist" aria-label="Test types"></div></div>
    <div class="hub-chips" id="hchips" role="group" aria-label="Filter by section"></div>
    <div class="hub-tools" id="htools"><input id="hq" type="search" placeholder="Search tests in ${e(x.name)}…" aria-label="Search tests" autocomplete="off"></div>
    <div class="hub-list" id="hlist" aria-live="polite"></div>`;
  const cur=()=>shown.find(t=>t.id===S.tab),match=a=>(!S.sec||a.section_name===S.sec)&&(!S.q||a.title.toLowerCase().includes(S.q));
  const cardOf=a=>tcardHTML(a,a.section_name?secColor(a.section_name):'var(--acc)');
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
  $('#hlist').addEventListener('click',ev=>{if(ev.target.closest('#hmore')){S.n+=30;draw()}});wireShare($('#hlist'),all);
  return true}
