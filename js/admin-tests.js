/* Quiz & test builder (admin) — loaded with the admin panel */
let edA=null,edQ=null;
const MODES=[['mixed','Combined test — no sections, one timer'],['single_timer','Sections — one timer for the whole test'],['sectional_timer','Sections — separate timer for each section']];
const MLAB={mixed:'Combined',single_timer:'Sections · one timer',sectional_timer:'Sections · sectional timers'};
const OLB='ABCDEF';

async function aAs(){
  const draw=async()=>{
    await settle();const list=await q(sb.from('assessments').select('*,questions(count),sections(count)').order('created_at',{ascending:false}));
    const qc=cats.filter(c=>['quizzes','tests'].includes(c.kind)),A=edA;
    $('#ad').innerHTML=`<form class="panel f" id="af"><h3 class="full">${A?'Edit settings':'New quiz or test'}</h3>
    ${sel('category_id','Category',(qc.length?qc:cats).map(c=>[c.id,c.icon+' '+c.name]),A?.category_id)}${placeHTML(A?.category_id||(qc[0]||cats[0])?.id,A?.folder_id)}
    ${sel('kind','Kind',[['quiz','Quiz — one question at a time, instant feedback'],['test','Test — exam window with question palette']],A?.kind)}
    ${fl('title','Title',A?.title,'text','required')}${fl('sort_order','Position in folder (1 = first)',A?.sort_order??0,'number')}
    ${sel('mode','Test format (tests only)',MODES,A?.mode)}
    ${fl('duration_minutes','Total time in minutes (blank = no limit)',A?.duration_minutes??'','number','min=1')}
    ${fl('pass_percent','Pass mark %',A?.pass_percent??40,'number','min=0 max=100')}
    ${fl('negative_marking','Marks deducted per wrong answer',A?.negative_marking??0,'number','step=0.25 min=0')}
    ${sel('shuffle_questions','Shuffle question order',[['false','No'],['true','Yes']],String(!!A?.shuffle_questions))}
    <label class="full">Description<input name="description" value="${e(A?.description)}"></label>
    <label class="full">Extra instructions shown before the start<textarea name="instructions">${e(A?.instructions)}</textarea></label>
    <p class="full" style="margin:0;color:var(--mute);font-size:.85rem">“Separate timer for each section” ignores the total time above and uses each section's own time. “One timer” keeps sections as groups only.</p>
    <div class="full"><button class="btn acc">${A?'Save changes':'Create'}</button> ${A?'<button type="button" class="btn ghost" id="xa">Cancel</button>':''}</div></form>
    ${list.map(a=>`<div class="panel"><div class="ah"><div><b>${e(a.title)}</b> <span class="tag">${a.kind}</span> ${a.kind==='test'?`<span class="tag">${MLAB[a.mode]}</span>`:''} <small>${a.questions[0].count} questions${a.sections[0].count?` · ${a.sections[0].count} sections`:''}</small><br>${loc(a.folder_id)}</div>
    <div class="acts" style="margin:0"><label style="display:inline"><input type="checkbox" data-pub="${a.id}" ${a.is_published?'checked':''} style="width:auto"> Live</label><button class="btn ghost sm" data-m="${a.id}">${openQ===a.id?'Close':'Manage'}</button><button class="btn ghost sm" data-ea="${a.id}">Settings</button><a class="btn ghost sm" href="#/exam/${a.id}" target="_blank">Preview</a><button class="btn red sm" data-del="${a.id}">Delete</button></div></div><div id="m${a.id}"></div></div>`).join('')||'<div class="empty">No quizzes or tests yet. Create one above.</div>'}`;
    $('#af').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target);if(!placeCheck(v))return;
      Object.assign(v,{sort_order:+v.sort_order||0,duration_minutes:+v.duration_minutes||null,pass_percent:+v.pass_percent,negative_marking:+v.negative_marking||0,shuffle_questions:v.shuffle_questions==='true',description:v.description||null,instructions:v.instructions||null});
      if(v.kind==='quiz')v.mode='mixed';
      await q(A?sb.from('assessments').update(v).eq('id',A.id):sb.from('assessments').insert(v));toast('Saved');edA=null;draw()};
    bindPlace($('#af'));
    $('#xa')?.addEventListener('click',()=>{edA=null;draw()});
    document.querySelectorAll('[data-pub]').forEach(b=>b.onchange=()=>q(sb.from('assessments').update({is_published:b.checked}).eq('id',b.dataset.pub)));
    document.querySelectorAll('[data-ea]').forEach(b=>b.onclick=()=>{edA=list.find(a=>a.id===b.dataset.ea);draw();scrollTo(0,0)});
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this and all its sections, questions and question images?'))return;
      const urls=await filesUnder({assess:[b.dataset.del]});await q(sb.from('assessments').delete().eq('id',b.dataset.del));await dropFiles(urls);if(openQ===b.dataset.del)openQ=null;draw()});
    document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{openQ=openQ===b.dataset.m?null:b.dataset.m;edQ=null;draw()});
    const open=list.find(a=>a.id===openQ);if(open)manage(open,draw)};
  draw()}

async function manage(a,redraw){
  const box=$('#m'+a.id);if(!box)return;
  const[qd,sc,at]=await Promise.all([q(sb.from('questions').select('*,question_keys(correct_index,explanation)').eq('assessment_id',a.id).order('sort_order')),
    q(sb.from('sections').select('*').eq('assessment_id',a.id).order('sort_order')),q(sb.from('attempts').select('score,total').eq('assessment_id',a.id))]);
  const key=x=>[].concat(x.question_keys)[0]||{},secOn=a.kind==='test'&&a.mode!=='mixed',timed=a.mode==='sectional_timer';
  const marks=qd.reduce((n,x)=>n+Number(x.marks),0),avg=at.length?Math.round(at.reduce((n,x)=>n+(x.total?x.score/x.total*100:0),0)/at.length):0;
  const warn=[];if(secOn&&!sc.length)warn.push('Add at least one section, or switch the format to Combined.');
  if(timed)sc.filter(s=>!s.duration_minutes).forEach(s=>warn.push(`Section “${s.title}” has no time set, so it will be untimed.`));
  if(secOn&&qd.some(x=>!sc.some(s=>s.id===x.section_id)))warn.push('Some questions have no section. They will appear in a “General” section.');
  const time=timed?(sc.reduce((n,s)=>n+(s.duration_minutes||0),0)||0)+' min (sum of sections)':a.duration_minutes?a.duration_minutes+' min':'no limit';
  const groups=secOn?[...sc.map(s=>({s,items:qd.filter(x=>x.section_id===s.id)})),{s:null,items:qd.filter(x=>!sc.some(s=>s.id===x.section_id))}].filter(g=>g.s||g.items.length):[{s:null,items:qd}];
  let n=0;const E=edQ?qd.find(x=>x.id===edQ):null,EK=E?key(E):{};
  box.innerHTML=`<hr class="hr"><p class="sum"><b>${qd.length}</b> questions · <b>${+marks.toFixed(2)}</b> marks · time: <b>${time}</b> · ${at.length} attempts${at.length?` (average ${avg}%)`:''}</p>
  ${warn.map(w=>`<p class="warnb">⚠ ${e(w)}</p>`).join('')}
  ${secOn?`<h4>Sections</h4><div class="tw"><table><tr><th>#<th>Section<th>${timed?'Time (min)':'Time'}<th>Questions<th></tr>${sc.map((s,i)=>`<tr><td>${i+1}<td>${e(s.title)}<td>${timed?(s.duration_minutes||'—'):'one shared timer'}<td>${qd.filter(x=>x.section_id===s.id).length}<td><button class="btn ghost sm" data-up="${s.id}" ${i?'':'disabled'}>↑</button> <button class="btn ghost sm" data-dn="${s.id}" ${i<sc.length-1?'':'disabled'}>↓</button> <button class="btn red sm" data-ds="${s.id}">Delete</button></tr>`).join('')}</table></div>
  <form class="f" id="sf" style="margin-top:10px">${fl('title','New section name','','text','required')}${timed?fl('duration_minutes','Section time (minutes)','','number','min=1 required'):''}<div style="align-self:end"><button class="btn acc sm">Add section</button></div></form>`:''}
  <h4>${E?'Edit question':'Add a question'}</h4>
  <form class="f" id="qf">${secOn?sel('section_id','Section',[['','— No section —'],...sc.map(s=>[s.id,s.title])],E?.section_id||''):''}${fl('marks','Marks',E?.marks??1,'number','step=0.5 min=0')}
  <label class="full">Question<textarea name="question" required>${e(E?.question)}</textarea></label>
  <label class="full">Figure or diagram for this question (optional) — paste a link or upload<input name="image_url" id="qimg" value="${e(E?.image_url)}" placeholder="https://…"></label>
  <label>Upload image<input type="file" id="qup" accept="image/*"></label><div id="qprev" style="align-self:end">${E?.image_url?`<img class="qthumb" src="${e(E.image_url)}" alt="Preview">`:''}</div>
  ${[0,1,2,3,4,5].map(i=>fl('o'+i,'Option '+OLB[i]+(i>1?' (optional)':''),E?.options?.[i]||'','text',i<2?'required':'')).join('')}
  ${sel('c','Correct answer',OLB.split('').map((l,i)=>[i,l]),KEY(EK))}
  <label class="full">Explanation (shown in review and in quizzes)<textarea name="explanation">${e(EK.explanation)}</textarea></label>
  <div class="full"><button class="btn acc sm">${E?'Save question':'Add question'}</button> ${E?'<button type="button" class="btn ghost sm" id="xq">Cancel</button>':''}</div></form>
  <details style="margin-top:12px"><summary>Bulk add (one per line)</summary><p><small>Question | A | B | C | D | correct letter | explanation | section name (optional)</small></p><textarea id="bulk"></textarea><button class="btn sm acc" id="bb">Import lines</button></details>
  <h4>Questions</h4>${groups.map(g=>`${secOn?`<div class="gh">${e(g.s?.title||'No section')} <small>${g.items.length} questions${timed&&g.s?` · ${g.s.duration_minutes||'no'} min`:''}</small></div>`:''}
  ${g.items.map(x=>{n++;const k=key(x);return `<div class="qc"><div><b>Q${n}.</b> ${e(x.question)} <small>(${x.marks} mark${x.marks==1?'':'s'})</small></div>${x.image_url?`<img class="qthumb" src="${e(x.image_url)}" alt="Question figure" loading="lazy">`:''}<ol type="A" class="qo">${x.options.map((o,i)=>`<li class="${i===k.correct_index?'ok':''}">${e(o)}${i===k.correct_index?' ✔':''}</li>`).join('')}</ol>${k.explanation?`<div class="note">💡 ${e(k.explanation)}</div>`:'<div class="note">No explanation added</div>'}<div class="acts" style="margin:6px 0 0"><button class="btn ghost sm" data-eq="${x.id}">Edit</button><button class="btn red sm" data-dq="${x.id}">Delete</button></div></div>`}).join('')||'<div class="empty">No questions here yet.</div>'}`).join('')}`;
  const done=m=>{toast(m);redraw()};
  $('#qf').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target),raw=[0,1,2,3,4,5].map(i=>(v['o'+i]||'').trim()),opts=raw.filter(Boolean);
    if(!raw[+v.c])return toast('The correct answer points to an empty option',1);
    const row={assessment_id:a.id,section_id:v.section_id||null,image_url:(v.image_url||'').trim()||null,question:v.question,options:opts,marks:+v.marks||1},key={correct_index:opts.indexOf(raw[+v.c]),explanation:v.explanation||null};
    await guarded((async()=>{if(E){await q(sb.from('questions').update(row).eq('id',E.id));await q(sb.from('question_keys').upsert({question_id:E.id,...key}))}
    else{const[r]=await q(sb.from('questions').insert({...row,sort_order:qd.length}).select('id'));await q(sb.from('question_keys').insert({question_id:r.id,...key}))}})());
    const junk=[E?.image_url,...PEND];PEND.clear();await dropFiles(junk);
    edQ=null;done('Question saved')};
  const prev=()=>{const u=$('#qimg').value.trim();$('#qprev').innerHTML=u?`<img class="qthumb" src="${e(u)}" alt="Preview">`:''};$('#qimg').oninput=prev;
  $('#qup').onchange=async ev=>{const f=ev.target.files[0];if(!f)return;if(await upFile(f,'questions/',$('#qimg'))){prev();toast('Image uploaded — now save the question (the old image is removed when you save)')}};
  $('#xq')?.addEventListener('click',()=>{edQ=null;redraw()});
  $('#sf')&&($('#sf').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target);await q(sb.from('sections').insert({assessment_id:a.id,title:v.title,duration_minutes:+v.duration_minutes||null,sort_order:sc.length}));done('Section added')});
  const swap=async(id,d)=>{const i=sc.findIndex(s=>s.id===id),o=sc[i+d];if(!o)return;await q(sb.from('sections').update({sort_order:d>0?i+1:i-1}).eq('id',id));await q(sb.from('sections').update({sort_order:i}).eq('id',o.id));redraw()};
  box.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>swap(b.dataset.up,-1));box.querySelectorAll('[data-dn]').forEach(b=>b.onclick=()=>swap(b.dataset.dn,1));
  box.querySelectorAll('[data-ds]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this section? Its questions stay but lose their section.'))return;await q(sb.from('sections').delete().eq('id',b.dataset.ds));done('Section deleted')});
  box.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{edQ=b.dataset.eq;redraw();setTimeout(()=>$('#qf')?.scrollIntoView({behavior:'smooth'}),300)});
  box.querySelectorAll('[data-dq]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this question and its image?'))return;const x=qd.find(z=>z.id===b.dataset.dq);await q(sb.from('questions').delete().eq('id',b.dataset.dq));await dropFiles([x?.image_url]);done('Question deleted')});
  $('#bb').onclick=async()=>{const rows=$('#bulk').value.split('\n').map(l=>l.split('|').map(s=>s.trim())).filter(r=>r.length>=6&&r[0]);if(!rows.length)return toast('No valid lines found',1);
    const qs=rows.map((r,i)=>({assessment_id:a.id,section_id:sc.find(s=>s.title.toLowerCase()===(r[7]||'').toLowerCase())?.id||null,question:r[0],options:r.slice(1,5).filter(Boolean),marks:1,sort_order:qd.length+i}));
    const ins=await q(sb.from('questions').insert(qs).select('id,sort_order'));ins.sort((x,y)=>x.sort_order-y.sort_order);
    await q(sb.from('question_keys').insert(ins.map((x,i)=>({question_id:x.id,correct_index:Math.max(0,OLB.indexOf((rows[i][5]||'A').toUpperCase())),explanation:rows[i][6]||null}))));done(rows.length+' questions added')}}
const KEY=k=>k.correct_index??0;
