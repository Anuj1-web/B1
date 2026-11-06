/* Search — used on the home page (whole site) and on category / exam / folder pages (that section only).
   While a search is active the normal page content is hidden and only the matching results are shown. */
const sbar=(ph,hero)=>`<form class="search sbar${hero?' inhero':''}" id="sf" role="search"><input id="sq" type="search" placeholder="${e(ph)}" aria-label="Search" autocomplete="off" enterkeyhint="search"><button class="btn acc" type="submit">Search</button></form>`;
const subIds=(all,id)=>{const o=[id];for(let i=0;i<o.length;i++)all.filter(z=>z.parent_id===o[i]).forEach(z=>o.push(z.id));return o};

/* sc = {type:'all'} | {type:'cat',cat,exams:[ids]} | {type:'exam',exam,ids:[folder ids]} | {type:'folder',ids:[subtree incl. self],sub:[subtree excl. self]} */
async function searchAll(t,sc){
  const z=t.replace(/[%,()\\*]/g,' ').replace(/\s+/g,' ').trim();
  if(!z)return'';
  const pat='%'+z+'%',tx=`title.ilike.${pat},description.ilike.${pat}`,ids=sc.ids||[];
  const scoped=b=>sc.type==='all'?b:sc.type==='cat'?b.eq('category_id',sc.cat):ids.length?b.in('folder_id',ids):null;
  const go=b=>b?q(b):Promise.resolve([]);
  const exB=sc.type==='all'?sb.from('exams').select('*').ilike('name',pat).limit(20):sc.type==='cat'?sb.from('exams').select('*').eq('category_id',sc.cat).ilike('name',pat).limit(20):null;
  const foB=sc.type==='all'?sb.from('folders').select('*').ilike('name',pat).limit(40)
    :sc.type==='cat'?(sc.exams.length?sb.from('folders').select('*').in('exam_id',sc.exams).ilike('name',pat).limit(40):null)
    :sc.type==='exam'?sb.from('folders').select('*').eq('exam_id',sc.exam).ilike('name',pat).limit(40)
    :(sc.sub.length?sb.from('folders').select('*').in('id',sc.sub).ilike('name',pat).limit(40):null);
  const[items,as,exs,fs]=await Promise.all([
    go(scoped(sb.from('items').select(ICOLS).or(tx).order('created_at',{ascending:false}).limit(40))),
    go(scoped(sb.from('assessments').select('*,questions(count)').or(tx).limit(30))),
    go(exB),go(foB)]);
  /* where each matching folder lives: Exam › Batch › … */
  const exIds=[...new Set(fs.map(f=>f.exam_id))];
  const[exAll,fAll]=exIds.length?await Promise.all([q(sb.from('exams').select('id,name,category_id').in('id',exIds)),q(sb.from('folders').select('id,name,parent_id,exam_id').in('exam_id',exIds))]):[[],[]];
  const kOf=cid=>KC[cats.find(c=>c.id===cid)?.kind]||'#0e8f7e';
  const where=f=>{const ex=exAll.find(x=>x.id===f.exam_id),p=[];let cur=fAll.find(x=>x.id===f.parent_id);while(cur){p.unshift(cur.name);cur=fAll.find(x=>x.id===cur.parent_id)}return[ex?.name,...p].filter(Boolean).join(' › ')};
  const sect=(h,n,body,cls)=>n?`<div class="sh"><b>${h}</b><span>${n}</span></div><div class="grid ${cls}">${body}</div>`:'';
  const total=items.length+as.length+exs.length+fs.length;
  const head=`<div class="sres-head"><h2>${total?`${plural(total,'result')} for`:'No results for'} “${e(t)}”</h2><button class="btn ghost sm" type="button" id="sclr">✕ Clear</button></div>`;
  if(!total)return head+`<div class="empty">Nothing matched${sc.label?' in '+e(sc.label):''}. Try a different word or check the spelling.</div>`;
  return head
    +sect('Exams',exs.length,exs.map(x=>tile('#/x/'+x.id,x.icon||'🎯',x.cover_url,x.name,cats.find(c=>c.id===x.category_id)?.name||'Exam',kOf(x.category_id))).join(''),'rows cats')
    +sect('Folders &amp; chapters',fs.length,fs.map(f=>tile('#/f/'+f.id,f.icon||'📁',null,f.name,where(f)||'Folder',kOf(exAll.find(x=>x.id===f.exam_id)?.category_id))).join(''),'rows cats')
    +sect('Videos, notes &amp; more',items.length,items.map(card).join(''),'rows')
    +sect('Quizzes &amp; tests',as.length,as.map(aCard).join(''),'rows')}

/* wires the search box on a page. scopeFn() returns the scope; hideSel = selector of the normal content to hide while searching */
function wireSearch(scopeFn,hideSel){
  const inp=$('#sq'),out=$('#sres');if(!inp||!out)return;
  const hide=[...document.querySelectorAll(hideSel)];let tmr,n=0;
  const show=on=>{hide.forEach(h=>h.hidden=on);out.hidden=!on;if(!on)out.innerHTML=''};
  const run=async()=>{
    const t=inp.value.trim(),my=++n;
    if(!t){show(false);return}
    show(true);if(!out.firstChild)out.innerHTML='<div class="load">Searching…</div>';
    let html;try{html=await searchAll(t,await scopeFn())}catch(err){console.error(err);html='<div class="empty">Search failed. Check your connection and try again.</div>'}
    if(my===n)out.innerHTML=html};
  $('#sf').onsubmit=ev=>{ev.preventDefault();clearTimeout(tmr);run()};
  inp.oninput=()=>{clearTimeout(tmr);tmr=setTimeout(run,280)};
  out.addEventListener('click',ev=>{if(ev.target.closest('#sclr')){inp.value='';run();inp.focus()}});
}
