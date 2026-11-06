/* Student navigation: category → exam → folders (batch / chapter / group …) → content */
const crumbs=a=>`<div class="crumbs">${a.map(([l,h],i)=>i===a.length-1?`<b>${e(l)}</b>`:`<a href="${h}">${e(l)}</a><i>›</i>`).join('')}</div>`;
const hl=s=>document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.dataset.s===s));
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const metaOf=(f,i,a)=>[f&&plural(f,'folder'),i&&plural(i,'item'),a&&plural(a,'test')].filter(Boolean).join(' · ')||'Empty for now';
function tile(href,ic,cover,name,meta,k){
  return `<a class="cat frow" style="--k:${k||'#0e8f7e'}" href="${href}">${cover?`<div class="cov" style="background-image:url('${e(cover)}')"></div>`:`<div class="ic">${e(ic)}</div>`}<div class="ft"><h3>${e(name)}</h3><small>${e(meta)}</small></div><span class="chev2">›</span></a>`}

async function direct(ids){
  const c={f:{},i:{},a:{}};if(!ids.length)return c;
  const[it,as]=await Promise.all([q(sb.from('items').select('folder_id').in('folder_id',ids)),q(sb.from('assessments').select('folder_id').in('folder_id',ids))]);
  it.forEach(x=>c.i[x.folder_id]=(c.i[x.folder_id]||0)+1);as.forEach(x=>c.a[x.folder_id]=(c.a[x.folder_id]||0)+1);return c}

async function folderTrail(fid){
  const f=(await q(sb.from('folders').select('*').eq('id',fid).limit(1)))[0];if(!f)return null;
  const[x,all]=await Promise.all([q(sb.from('exams').select('*').eq('id',f.exam_id).limit(1)),q(sb.from('folders').select('id,name,parent_id').eq('exam_id',f.exam_id))]);
  const ex=x[0],c=cats.find(k=>k.id===ex?.category_id),chain=[];let cur=f;
  while(cur){chain.unshift(cur);cur=all.find(z=>z.id===cur.parent_id)}
  return{folder:f,exam:ex,cat:c,all,name:f.name,crumbs:[['Home','#/'],...(c?[[c.name,'#/c/'+c.slug]]:[]),...(ex?[[ex.name,'#/x/'+ex.id]]:[]),...chain.map(z=>[z.name,'#/f/'+z.id])]}}

async function examPage(id){
  const x=(await q(sb.from('exams').select('*').eq('id',id).limit(1)))[0];
  if(!x){app.innerHTML='<div class="empty">This exam was not found or is not live.</div>';return}
  const c=cats.find(k=>k.id===x.category_id),k=KC[c?.kind]||'#0e8f7e';hl(c?.slug);
  const fs=await q(sb.from('folders').select('*').eq('exam_id',id).order('sort_order').order('created_at'));
  const tops=fs.filter(f=>!f.parent_id),cnt=await direct(tops.map(f=>f.id));
  app.innerHTML=crumbs([['Home','#/'],...(c?[[c.name,'#/c/'+c.slug]]:[]),[x.name]])+`<div class="hero" style="padding:8px 0 10px"><h1 style="font-size:clamp(1.8rem,5vw,3rem)">${e(x.icon)} ${e(x.name)}</h1><p>${e(x.description||'')}</p></div>
  ${sbar('Search in '+x.name+' — chapters, videos, tests…')}<div id="browse"><div class="grid rows cats">${tops.map(f=>tile('#/f/'+f.id,f.icon||'📁',null,f.name,metaOf(fs.filter(z=>z.parent_id===f.id).length,cnt.i[f.id],cnt.a[f.id]),k)).join('')||'<div class="empty" style="grid-column:1/-1">Nothing has been added to this exam yet.</div>'}</div></div><div id="sres" class="sres" hidden></div>`;
  wireSearch(()=>({type:'exam',exam:id,ids:fs.map(f=>f.id),label:x.name}),'#browse')}

async function folderPage(id){
  const t=await folderTrail(id);
  if(!t){app.innerHTML='<div class="empty">This folder was not found or is not live.</div>';return}
  const f=t.folder,k=KC[t.cat?.kind]||'#0e8f7e';hl(t.cat?.slug);
  const kids=t.all.filter(z=>z.parent_id===id);
  const[full,items,as]=await Promise.all([kids.length?q(sb.from('folders').select('*').in('id',kids.map(z=>z.id)).order('sort_order').order('created_at')):[],
    q(sb.from('items').select(ICOLS).eq('folder_id',id).order('sort_order').order('created_at')),
    q(sb.from('assessments').select('*,questions(count)').eq('folder_id',id).order('sort_order').order('created_at'))]);
  const cnt=await direct(full.map(z=>z.id)),subs=full.length?await q(sb.from('folders').select('parent_id').in('parent_id',full.map(z=>z.id))):[];
  const content=items.map(card).join('')+as.map(aCard).join('');
  app.innerHTML=crumbs(t.crumbs)+`<div class="hero" style="padding:8px 0 10px"><h1 style="font-size:clamp(1.6rem,5vw,2.6rem)">${e(f.icon||'📁')} ${e(f.name)}</h1></div>
  ${sbar('Search in '+f.name+'…')}<div id="browse">${full.length?`<div class="grid rows cats">${full.map(z=>tile('#/f/'+z.id,z.icon||'📁',null,z.name,metaOf(subs.filter(s=>s.parent_id===z.id).length,cnt.i[z.id],cnt.a[z.id]),k)).join('')}</div>`:''}
  ${content?`${full.length?'<div class="sec"><h2>In this folder</h2></div>':''}<div class="grid rows">${content}</div>`:''}
  ${full.length||content?'':'<div class="empty">Nothing here yet. Check back soon.</div>'}</div><div id="sres" class="sres" hidden></div>`;
  const sub=subIds(t.all,id);
  wireSearch(()=>({type:'folder',ids:sub,sub:sub.filter(x=>x!==id),label:f.name}),'#browse')}
