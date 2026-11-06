/* Exams & folders manager (admin) — loaded with the admin panel */
const AD={exams:[],folders:[]};
const cmp=(a,b)=>(a.sort_order-b.sort_order)||String(a.created_at).localeCompare(String(b.created_at));
async function loadTree(){[AD.exams,AD.folders]=await Promise.all([q(sb.from('exams').select('*').order('sort_order')),q(sb.from('folders').select('*').order('sort_order'))])}
function fpath(id){const out=[];let f=AD.folders.find(x=>x.id===id);while(f){out.unshift(f.name);f=AD.folders.find(x=>x.id===f.parent_id)}return out.join(' › ')}
const loc=fid=>{if(!fid)return '<small>Unfiled</small>';const f=AD.folders.find(x=>x.id===fid),x=AD.exams.find(z=>z.id===f?.exam_id);return `<small>${e(x?.name||'?')} › ${e(fpath(fid))}</small>`};
function ordered(exId){const out=[],walk=(pid,d)=>AD.folders.filter(f=>f.exam_id===exId&&(f.parent_id||null)===pid).sort(cmp).forEach(f=>{out.push({f,d});walk(f.id,d+1)});walk(null,0);return out}
function descOf(id){const s=new Set([id]);let added=true;while(added){added=false;AD.folders.forEach(f=>{if(f.parent_id&&s.has(f.parent_id)&&!s.has(f.id)){s.add(f.id);added=true}})}return s}

/* ---- pickers used by the Content and Quizzes & Tests forms ---- */
const exOpts=(catId,sel)=>'<option value="">— None (unfiled) —</option>'+AD.exams.filter(x=>x.category_id===catId).map(x=>`<option value="${x.id}" ${x.id===sel?'selected':''}>${e(x.icon)} ${e(x.name)}</option>`).join('');
const folderOpts=(exId,sel)=>exId?'<option value="">— choose a folder —</option>'+ordered(exId).map(({f,d})=>`<option value="${f.id}" ${f.id===sel?'selected':''}>${'— '.repeat(d)}${e(f.icon||'')} ${e(f.name)}</option>`).join(''):'<option value="">—</option>';
function placeHTML(catId,fid){const f=AD.folders.find(x=>x.id===fid),exId=f?.exam_id||'';
  return `<label>Exam<select name="place_exam" id="pex">${exOpts(catId,exId)}</select></label><label>Folder (batch / chapter / group)<select name="folder_id" id="pfo">${folderOpts(exId,fid)}</select></label>`}
function bindPlace(form){const c=form.querySelector('[name=category_id]'),ex=form.querySelector('#pex'),fo=form.querySelector('#pfo');
  c.addEventListener('change',()=>{ex.innerHTML=exOpts(c.value,'');fo.innerHTML=folderOpts('','')});
  ex.onchange=()=>{fo.innerHTML=folderOpts(ex.value,'')}}
function placeCheck(v){
  if(v.place_exam&&!v.folder_id){toast('Choose a folder inside the exam, or set Exam to “None”',1);return false}
  if(v.folder_id){const f=AD.folders.find(x=>x.id===v.folder_id),x=AD.exams.find(z=>z.id===f?.exam_id);if(x)v.category_id=x.category_id}else v.folder_id=null;
  delete v.place_exam;return true}

/* ---- how much sits under an exam or folder (for the delete warning) ---- */
async function underCounts(exId,fid){
  const ids=fid?[...descOf(fid)]:AD.folders.filter(f=>f.exam_id===exId).map(f=>f.id);
  const[it,as]=ids.length?await Promise.all([q(sb.from('items').select('id').in('folder_id',ids)),q(sb.from('assessments').select('id').in('folder_id',ids))]):[[],[]];
  return{folders:fid?ids.length-1:ids.length,items:it.length,tests:as.length}}
const countText=c=>`${c.folders} folder(s), ${c.items} content item(s) and ${c.tests} quiz/test(s)`;

/* ---- the Exams & Folders tab ---- */
let exCat='',exOpen=null,edE=null,edF=null,fParent='';
async function aEx(){
  const draw=async()=>{
    await settle();await loadTree();if(!exCat||!cats.some(c=>c.id===exCat))exCat=cats[0]?.id||'';
    const list=AD.exams.filter(x=>x.category_id===exCat),E=edE,open=list.find(x=>x.id===exOpen),F=edF;
    let ci={},ca={},rows='';
    if(open){const ids=AD.folders.filter(f=>f.exam_id===open.id).map(f=>f.id);
      if(ids.length){const[it,as]=await Promise.all([q(sb.from('items').select('folder_id').in('folder_id',ids)),q(sb.from('assessments').select('folder_id').in('folder_id',ids))]);
        it.forEach(x=>ci[x.folder_id]=(ci[x.folder_id]||0)+1);as.forEach(x=>ca[x.folder_id]=(ca[x.folder_id]||0)+1)}
      const ord=ordered(open.id),sibs=f=>AD.folders.filter(x=>x.exam_id===f.exam_id&&(x.parent_id||null)===(f.parent_id||null)).sort(cmp);
      rows=ord.map(({f,d})=>{const sb2=sibs(f),i=sb2.findIndex(x=>x.id===f.id),kids=AD.folders.filter(x=>x.parent_id===f.id).length;
        return `<tr><td style="padding-left:${8+d*22}px">${d?'↳ ':''}${e(f.icon||'📁')} <b>${e(f.name)}</b><td><small>${kids} folders · ${ci[f.id]||0} items · ${ca[f.id]||0} tests</small><td><input type="checkbox" data-fpub="${f.id}" ${f.is_published?'checked':''} style="width:auto"><td class="nw"><button class="btn ghost sm" data-fup="${f.id}" ${i?'':'disabled'} aria-label="Move up">↑</button> <button class="btn ghost sm" data-fdn="${f.id}" ${i<sb2.length-1?'':'disabled'} aria-label="Move down">↓</button> <button class="btn ghost sm" data-fsub="${f.id}">+ Sub</button> <button class="btn ghost sm" data-fe="${f.id}">Edit</button> <button class="btn red sm" data-fd="${f.id}">Delete</button></tr>`}).join('')}
    const banned=F?descOf(F.id):new Set();
    $('#ad').innerHTML=`<div class="panel"><label>Category<select id="xc">${cats.map(c=>`<option value="${c.id}" ${c.id===exCat?'selected':''}>${e(c.icon)} ${e(c.name)}</option>`).join('')}</select></label>
    <p class="sum" style="margin:8px 0 0">Students open a category, pick an <b>exam</b>, then move through <b>folders</b> (batches, chapters, test groups…) to reach the content.</p></div>
    <form class="panel f" id="ef"><h3 class="full">${E?'Edit exam':'Add an exam to this category'}</h3>${fl('name','Exam name (e.g. SSC CGL, Railway NTPC)',E?.name,'text','required')}${fl('icon','Icon (emoji)',E?.icon||'🎯')}${fl('sort_order','Order',E?.sort_order??list.length,'number')}
    <label class="full">Short description (optional)<input name="description" value="${e(E?.description)}"></label>
    <label class="full">Cover image URL (optional)<input name="cover_url" id="cvu" value="${e(E?.cover_url)}" placeholder="https://…"></label><label>Upload cover image<input type="file" id="cvf" accept="image/*"></label>
    <div class="full"><button class="btn acc">${E?'Save exam':'Add exam'}</button> ${E?'<button type="button" class="btn ghost" id="xe">Cancel</button>':''}</div></form>
    <div class="panel tw"><table><tr><th>Exam<th>Folders<th>Live<th></tr>${list.map(x=>`<tr><td>${e(x.icon)} <b>${e(x.name)}</b><td>${AD.folders.filter(f=>f.exam_id===x.id).length}<td><input type="checkbox" data-xpub="${x.id}" ${x.is_published?'checked':''} style="width:auto"><td class="nw"><button class="btn ${x.id===exOpen?'':'ghost'} sm" data-xm="${x.id}">${x.id===exOpen?'Close':'Folders'}</button> <button class="btn ghost sm" data-xe="${x.id}">Edit</button> <select class="cps" data-cp="${x.id}" aria-label="Copy structure to another category"><option value="">Copy to…</option>${cats.filter(c=>c.id!==exCat).map(c=>`<option value="${c.id}">${e(c.name)}</option>`).join('')}</select> <button class="btn red sm" data-xd="${x.id}">Delete</button></tr>`).join('')||'<tr><td colspan="4"><div class="empty">No exams in this category yet. Add one above.</div></tr>'}</table></div>
    ${open?`<div class="panel" id="fm"><h3>Folders in ${e(open.icon)} ${e(open.name)}</h3><p class="sum">Build any structure you like — for example <i>Batch 2026 › Algebra</i> or <i>Full Tests</i>. Folders can sit inside folders. Add videos, notes and tests to a folder from the Content or Quizzes &amp; Tests tab.</p>
    <form class="f" id="ff">${fl('name','Folder name',F?.name,'text','required')}${fl('icon','Icon (emoji)',F?.icon||'📁')}${sel('parent_id','Inside',[['','Top level of this exam'],...ordered(open.id).filter(({f})=>!banned.has(f.id)).map(({f,d})=>[f.id,'— '.repeat(d)+f.name])],F?F.parent_id||'':fParent)}
    <div style="align-self:end"><button class="btn acc sm">${F?'Save folder':'Add folder'}</button> ${F?'<button type="button" class="btn ghost sm" id="xf">Cancel</button>':''}</div></form>
    <div class="tw" style="margin-top:12px"><table><tr><th>Folder<th>Contents<th>Live<th></tr>${rows||'<tr><td colspan="4"><div class="empty">No folders yet. Add the first one above.</div></tr>'}</table></div></div>`:''}`;
    const B=(s,f)=>document.querySelectorAll(s).forEach(f),again=m=>{toast(m);draw()};
    $('#xc').onchange=ev=>{exCat=ev.target.value;exOpen=null;edE=edF=null;draw()};
    $('#xe')?.addEventListener('click',()=>{edE=null;draw()});$('#xf')?.addEventListener('click',()=>{edF=null;fParent='';draw()});
    $('#cvf').onchange=async()=>{const f=$('#cvf').files[0];if(!f)return;if(await upFile(f,'covers/',$('#cvu')))toast('Uploaded — now save the exam (the old cover is removed when you save)')};
    $('#ef').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target);Object.assign(v,{sort_order:+v.sort_order||0,description:v.description||null,cover_url:v.cover_url||null});
      if(E){await q(sb.from('exams').update(v).eq('id',E.id));const junk=[E.cover_url,...PEND];PEND.clear();await dropFiles(junk);edE=null;again('Exam saved')}
      else{const[r]=await q(sb.from('exams').insert({...v,category_id:exCat}).select('id'));const junk=[...PEND];PEND.clear();await dropFiles(junk);exOpen=r.id;again('Exam added — now add its folders below')}};
    B('[data-xpub]',b=>b.onchange=()=>q(sb.from('exams').update({is_published:b.checked}).eq('id',b.dataset.xpub)));
    B('[data-xm]',b=>b.onclick=()=>{exOpen=exOpen===b.dataset.xm?null:b.dataset.xm;edF=null;fParent='';draw()});
    B('[data-xe]',b=>b.onclick=()=>{edE=list.find(x=>x.id===b.dataset.xe);draw();scrollTo(0,0)});
    B('[data-xd]',b=>b.onclick=async()=>{const x=list.find(z=>z.id===b.dataset.xd),c=await underCounts(x.id);
      if(!confirm(`Delete the exam “${x.name}”?\n\nThis permanently removes ${countText(c)} inside it, together with their uploaded files.`))return;
      const urls=await filesUnder({exams:[x.id],folders:AD.folders.filter(f=>f.exam_id===x.id).map(f=>f.id)});
      await q(sb.from('exams').delete().eq('id',x.id));await dropFiles(urls);if(exOpen===x.id)exOpen=null;again('Exam deleted')});
    B('[data-cp]',s=>s.onchange=async()=>{if(!s.value)return;const t=cats.find(c=>c.id===s.value),x=list.find(z=>z.id===s.dataset.cp);
      if(!confirm(`Copy the folder structure of “${x.name}” to ${t.name}? Only the empty folders are copied, not the content.`)){s.value='';return}
      await q(sb.rpc('copy_exam',{p_exam:x.id,p_category:t.id}));s.value='';again(`Structure copied to ${t.name}`)});
    if(open){
      $('#ff').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target),pid=v.parent_id||null,sibs=AD.folders.filter(x=>x.exam_id===open.id&&(x.parent_id||null)===pid).length;
        if(F){await q(sb.from('folders').update({name:v.name,icon:v.icon||'📁',parent_id:pid,...((F.parent_id||null)!==pid?{sort_order:sibs}:{})}).eq('id',F.id));edF=null;again('Folder saved')}
        else{await q(sb.from('folders').insert({exam_id:open.id,parent_id:pid,name:v.name,icon:v.icon||'📁',sort_order:sibs}));again('Folder added')}fParent=''};
      B('[data-fpub]',b=>b.onchange=()=>q(sb.from('folders').update({is_published:b.checked}).eq('id',b.dataset.fpub)));
      B('[data-fe]',b=>b.onclick=()=>{edF=AD.folders.find(x=>x.id===b.dataset.fe);draw();$('#fm')?.scrollIntoView({behavior:'smooth'})});
      B('[data-fsub]',b=>b.onclick=()=>{edF=null;fParent=b.dataset.fsub;draw().then(()=>{$('#ff')?.scrollIntoView({behavior:'smooth'});$('#ff [name=name]')?.focus()})});
      B('[data-fd]',b=>b.onclick=async()=>{const f=AD.folders.find(x=>x.id===b.dataset.fd),c=await underCounts(open.id,f.id);
        if(!confirm(`Delete the folder “${f.name}”?\n\nThis permanently removes ${countText(c)} inside it, together with their uploaded files.`))return;
        const urls=await filesUnder({folders:[...descOf(f.id)]});await q(sb.from('folders').delete().eq('id',f.id));await dropFiles(urls);again('Folder deleted')});
      const swap=async(id,dir)=>{const f=AD.folders.find(x=>x.id===id),sib=AD.folders.filter(x=>x.exam_id===f.exam_id&&(x.parent_id||null)===(f.parent_id||null)).sort(cmp),i=sib.findIndex(x=>x.id===id),j=i+dir;if(j<0||j>=sib.length)return;
        [sib[i],sib[j]]=[sib[j],sib[i]];await Promise.all(sib.map((x,n)=>x.sort_order===n?null:q(sb.from('folders').update({sort_order:n}).eq('id',x.id))).filter(Boolean));draw()};
      B('[data-fup]',b=>b.onclick=()=>swap(b.dataset.fup,-1));B('[data-fdn]',b=>b.onclick=()=>swap(b.dataset.fdn,1))}};
  return draw()}
