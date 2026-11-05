/* Quiz & test engine — loaded on demand for #/exam/<id> */
let st=null;
const OL='ABCDEF';
const SN={nv:'Not visited',na:'Not answered',a:'Answered',mr:'Marked for review',amr:'Answered & marked for review'};
const shuf=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
window.exCleanup=()=>{if(st?.tick)clearInterval(st.tick);st=null;document.body.classList.remove('focus');window.onbeforeunload=null};

async function exam(id){
  const a=(await q(sb.from('assessments').select('*').eq('id',id).limit(1)))[0];
  if(!a){app.innerHTML='<div class="empty">This quiz or test was not found, or is not live yet.</div>';return}
  const [secs,qs]=await Promise.all([q(sb.from('sections').select('*').eq('assessment_id',id).order('sort_order')),
    q(sb.from('questions').select('id,section_id,question,options,marks,sort_order').eq('assessment_id',id).order('sort_order'))]);
  if(!qs.length){app.innerHTML='<div class="empty">No questions have been added yet. Check back soon.</div>';return}
  intro(a,secs,qs)}

function build(a,secs,qs,saved){
  const useSec=a.kind==='test'&&a.mode!=='mixed'&&secs.length>0;let S;
  if(useSec){S=secs.map(s=>({id:s.id,title:s.title,dur:s.duration_minutes,qs:qs.filter(x=>x.section_id===s.id)}));
    const rest=qs.filter(x=>!secs.some(s=>s.id===x.section_id));if(rest.length)S.push({id:null,title:'General',dur:null,qs:rest});S=S.filter(s=>s.qs.length)}
  else S=[{id:null,title:'All questions',dur:null,qs:[...qs]}];
  if(saved?.order){const pos=Object.fromEntries(saved.order.map((id,i)=>[id,i]));S.forEach(s=>s.qs.sort((x,y)=>pos[x.id]-pos[y.id]))}
  else if(a.shuffle_questions)S.forEach(s=>s.qs=shuf(s.qs));
  return{S,Q:S.flatMap((s,si)=>s.qs.map(x=>({...x,si}))),m:useSec?a.mode:'mixed'}}

function intro(a,secs,qs){
  const{S,Q,m}=build(a,secs,qs,null),tot=Q.reduce((n,x)=>n+Number(x.marks),0);
  let saved=a.kind==='test'?ls.get('li_ex_'+a.id,null):null;
  if(saved&&!(saved.order?.length===Q.length&&saved.order.every(i=>Q.some(x=>x.id===i))))saved=null;
  const time=m==='sectional_timer'?(S.reduce((n,s)=>n+(s.dur||0),0)||'No')+' min (timed per section)':a.duration_minutes?a.duration_minutes+' min':'No time limit';
  const rules=['Pick one option per question. Your answers are saved as you go.',
    a.negative_marking>0?`Each wrong answer deducts ${a.negative_marking} mark(s). Unanswered questions score zero.`:'There is no negative marking.',
    ...(a.kind==='quiz'?['You see the correct answer and explanation right after each question.']:
      ['Use the question palette to jump to any question.','“Mark for review” flags a question to revisit. Marked questions with an answer still count.']),
    m==='sectional_timer'?'Every section has its own timer. When it ends you move on automatically and cannot go back.':'',
    m==='single_timer'?'One timer runs for the whole test. You can switch between sections freely.':'',
    saved?'':'',a.instructions||''].filter(Boolean);
  app.innerHTML=`<p><a href="#/">← Home</a></p><div class="panel" style="max-width:760px;margin:10px auto"><h1 style="font-size:clamp(1.6rem,4vw,2.4rem)">${e(a.title)}</h1><p style="color:var(--mute)">${e(a.description)}</p>
  <div class="stats"><div><b>${Q.length}</b>Questions</div><div><b>${+tot.toFixed(2)}</b>Total marks</div><div><b>${e(time)}</b>Time</div><div><b>${a.pass_percent}%</b>To pass</div></div>
  ${S.length>1?`<div class="tw"><table><tr><th>Section<th>Questions<th>Time</tr>${S.map(s=>`<tr><td>${e(s.title)}<td>${s.qs.length}<td>${m==='sectional_timer'?(s.dur?s.dur+' min':'No limit'):'—'}</tr>`).join('')}</table></div>`:''}
  <h3 style="margin:16px 0 6px">Before you begin</h3><ul>${rules.map(r=>`<li>${e(r)}</li>`).join('')}</ul>
  <div class="acts">${saved?'<button class="btn acc" id="rs">Resume where I left off</button>':''}<button class="btn ${saved?'ghost':'acc'}" id="go">${saved?'Start over':'Start '+a.kind}</button></div></div>`;
  $('#go').onclick=()=>begin(a,secs,qs,false);if(saved)$('#rs').onclick=()=>begin(a,secs,qs,true)}

function secStart(si){return st.S.slice(0,si).reduce((n,s)=>n+s.qs.length,0)}
function secTimer(){const d=st.S[st.sec].dur;st.secEnd=st.m==='sectional_timer'&&d?Date.now()+d*60000:null}
function begin(a,secs,qs,resume){
  const saved=resume?ls.get('li_ex_'+a.id,null):null;if(!resume)ls.set('li_ex_'+a.id,null);
  st={a,...build(a,secs,qs,saved),ans:{},vis:new Set(),mark:new Set(),cur:0,sec:0,start:Date.now(),end:null,secEnd:null,fb:{},done:false};
  if(saved)Object.assign(st,{ans:saved.ans||{},mark:new Set(saved.mark),vis:new Set(saved.vis),cur:saved.cur,sec:saved.sec,start:saved.start,end:saved.end,secEnd:saved.secEnd});
  else{if(st.m!=='sectional_timer'&&a.duration_minutes)st.end=Date.now()+a.duration_minutes*60000;secTimer()}
  document.body.classList.add('focus');window.onbeforeunload=()=>true;scrollTo(0,0);
  a.kind==='quiz'?quizUI():testUI();st.tick=setInterval(tick,500);tick()}
function persist(){if(st.a.kind!=='test')return;ls.set('li_ex_'+st.a.id,{order:st.Q.map(x=>x.id),ans:st.ans,mark:[...st.mark],vis:[...st.vis],cur:st.cur,sec:st.sec,start:st.start,end:st.end,secEnd:st.secEnd})}

function tick(){if(!st||st.done)return;const now=Date.now(),parts=[];let low=false;
  if(st.end){const l=Math.max(0,Math.ceil((st.end-now)/1000));parts.push(`${st.m==='sectional_timer'?'':'⏱ '}${mmss(l)}`);low=low||l<60;if(l<=0)return finish(true)}
  if(st.secEnd){const l=Math.max(0,Math.ceil((st.secEnd-now)/1000));parts.push(`⏱ Section ${mmss(l)}`);low=low||l<60;if(l<=0)return nextSec(true)}
  const el=$('#tm');if(el){el.textContent=parts.join('  ·  ')||'No time limit';el.classList.toggle('warn',low)}}

/* ---------- test window ---------- */
function stat(i){const id=st.Q[i].id,an=id in st.ans,mk=st.mark.has(id);return mk?(an?'amr':'mr'):an?'a':st.vis.has(id)?'na':'nv'}
function testUI(){
  app.innerHTML=`<div class="ex"><div class="ex-top"><b>${e(st.a.title)}</b><span id="tm" class="tm"></span><button class="btn red sm" id="sub">Submit test</button></div><div class="ex-tabs" id="tabs"></div>
  <div class="ex-main"><section class="ex-q" id="qa"></section><aside class="ex-pal"><div id="leg" class="leg"></div><div id="pal" class="pal"></div></aside></div><div class="ex-foot" id="ft"></div></div>`;
  const root=$('.ex');
  $('#sub').onclick=()=>submitAsk();
  root.onchange=ev=>{if(ev.target.name==='o'){st.ans[st.Q[st.cur].id]=+ev.target.value;persist();paint(true)}};
  root.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const d=b.dataset,x=st.Q[st.cur];
    if(d.j!==undefined)go(+d.j);else if(d.s!==undefined)go(secStart(+d.s));
    else if(d.act==='prev')go(st.cur-1);
    else if(d.act==='save')go(Math.min(st.cur+1,rangeOf().hi-1));
    else if(d.act==='mark'){st.mark.has(x.id)?st.mark.delete(x.id):st.mark.add(x.id);go(Math.min(st.cur+1,rangeOf().hi-1))}
    else if(d.act==='clear'){delete st.ans[x.id];persist();paint()}
    else if(d.act==='sec')nextSec(false)};
  paint()}
function rangeOf(){const s=st.Q[st.cur].si,lo=st.m==='mixed'?0:secStart(s);return{lo,hi:st.m==='mixed'?st.Q.length:lo+st.S[s].qs.length}}
function go(j){if(j<0||j>=st.Q.length)return;st.cur=j;st.sec=st.Q[j].si;persist();paint()}
function paint(keepScroll){
  const i=st.cur,x=st.Q[i],s=st.S[x.si],{lo,hi}=rangeOf();st.vis.add(x.id);
  $('#tabs').innerHTML=st.S.length>1?st.S.map((t,si)=>`<button class="stab${si===x.si?' on':''}" data-s="${si}" ${st.m==='sectional_timer'&&si!==x.si?'disabled':''}>${st.m==='sectional_timer'&&si<x.si?'🔒 ':''}${e(t.title)}</button>`).join(''):'';
  const neg=st.a.negative_marking>0?` / −${st.a.negative_marking}`:'';
  $('#qa').innerHTML=`<div class="qh"><span>Question ${i-lo+1} of ${hi-lo}${st.S.length>1?' · '+e(s.title):''}</span><span class="mk">+${x.marks}${neg}</span></div><div class="qt">${e(x.question)}</div>
  <div class="opts">${x.options.map((o,k)=>`<label class="opt${st.ans[x.id]===k?' sel':''}"><input type="radio" name="o" value="${k}" ${st.ans[x.id]===k?'checked':''}><span class="ol">${OL[k]}</span><span>${e(o)}</span></label>`).join('')}</div>`;
  const cnt={nv:0,na:0,a:0,mr:0,amr:0};let pal='';
  for(let j=lo;j<hi;j++){const t=stat(j);cnt[t]++;pal+=`<button class="pn p-${t}${j===i?' cur':''}" data-j="${j}" aria-label="Question ${j-lo+1}: ${SN[t]}">${j-lo+1}</button>`}
  $('#pal').innerHTML=pal;
  $('#leg').innerHTML=Object.keys(SN).map(t=>`<span><i class="pn p-${t}">${cnt[t]}</i>${SN[t]}</span>`).join('');
  const mk=st.mark.has(x.id),secBtn=st.m==='sectional_timer'&&i===hi-1&&x.si<st.S.length-1;
  $('#ft').innerHTML=`<div><button class="btn ghost" data-act="mark">${mk?'Unmark review & next':'Mark for review & next'}</button> <button class="btn ghost" data-act="clear" ${x.id in st.ans?'':'disabled'}>Clear response</button></div>
  <div><button class="btn ghost" data-act="prev" ${i===lo?'disabled':''}>Previous</button> ${secBtn?'<button class="btn" data-act="sec">Submit section</button>':`<button class="btn acc" data-act="save" ${i===hi-1?'disabled':''}>Save &amp; next</button>`}</div>`;
  if(!keepScroll)scrollTo(0,0)}
function nextSec(auto){
  if(st.sec>=st.S.length-1)return finish(auto);
  if(!auto&&!confirm('Submit this section and move on? You cannot come back to it.'))return;
  st.sec++;st.cur=secStart(st.sec);secTimer();persist();paint();if(auto)toast('Section time is over — moving to the next section')}
function submitAsk(){
  const n=Object.keys(st.ans).length,t=st.Q.length;
  if(confirm(`Submit now?\n\nAnswered: ${n}\nNot answered: ${t-n}\nMarked for review: ${st.mark.size}`))finish(false)}

/* ---------- quiz window ---------- */
function quizUI(){
  app.innerHTML=`<div class="ex quiz"><div class="ex-top"><b>${e(st.a.title)}</b><span id="tm" class="tm"></span><button class="btn ghost sm" id="sub">Finish</button></div><div class="pbar"><i id="pb"></i></div>
  <div class="ex-single"><section class="ex-q" id="qa"></section><div class="ex-foot" id="ft"></div></div></div>`;
  $('#sub').onclick=()=>{if(confirm('Finish the quiz now?'))finish(false)};
  $('.ex').onclick=async ev=>{const o=ev.target.closest('[data-k]'),b=ev.target.closest('[data-act]'),x=st.Q[st.cur];
    if(o&&!st.fb[x.id]){const k=+o.dataset.k;st.ans[x.id]=k;
      const{data,error}=await sb.rpc('check_answer',{p_question:x.id,p_choice:k});
      st.fb[x.id]=error||!data?{correct:null}:data;qpaint()}
    else if(b?.dataset.act==='next'){st.cur<st.Q.length-1?(st.cur++,qpaint()):finish(false)}};
  qpaint()}
function qpaint(){
  const i=st.cur,x=st.Q[i],fb=st.fb[x.id],ch=st.ans[x.id],score=Object.values(st.fb).filter(f=>f.correct).length;
  $('#pb').style.width=(i/st.Q.length*100)+'%';
  $('#qa').innerHTML=`<div class="qh"><span>Question ${i+1} of ${st.Q.length}</span><span class="mk">Correct so far: ${score}</span></div><div class="qt">${e(x.question)}</div>
  <div class="opts">${x.options.map((o,k)=>`<button class="opt${fb?(k===fb.correct_index?' ok':k===ch?' bad':''):''}" data-k="${k}" ${fb?'disabled':''}><span class="ol">${OL[k]}</span><span>${e(o)}</span></button>`).join('')}</div>
  ${fb?`<div class="fb ${fb.correct?'ok':'bad'}"><b>${fb.correct===null?'Answer saved.':fb.correct?'Correct!':'Not quite.'}</b>${fb.explanation?'<br>'+e(fb.explanation):''}</div>`:''}`;
  $('#ft').innerHTML=`<span></span><button class="btn acc" data-act="next">${fb?(i<st.Q.length-1?'Next question':'See results'):(i<st.Q.length-1?'Skip':'Finish')}</button>`;
  scrollTo(0,0)}

/* ---------- submit & results ---------- */
async function finish(auto){
  if(!st||st.done)return;st.done=true;clearInterval(st.tick);window.onbeforeunload=null;
  const took=Math.round((Date.now()-st.start)/1000);
  app.innerHTML=`<div class="load">${auto?'Time is up. ':''}Submitting your answers…</div>`;
  const{data,error}=await sb.rpc('submit_attempt',{p_assessment:st.a.id,p_answers:st.ans,p_time:took,p_client:cid});
  if(error||!data){app.innerHTML='<div class="empty"><p>We could not submit your answers. They are saved on this device.</p><button class="btn acc" id="rt">Try again</button></div>';st.done=false;$('#rt').onclick=()=>finish(false);return}
  ls.set('li_ex_'+st.a.id,null);document.body.classList.remove('focus');result(data,took)}

function result(r,took){
  const a=st.a,rev=Object.fromEntries(r.review.map(x=>[x.id,x])),pct=r.total?Math.max(0,r.score/r.total*100):0,acc=r.correct+r.wrong?Math.round(r.correct/(r.correct+r.wrong)*100):0;
  const neg=+a.negative_marking||0;
  const secRows=st.S.length>1?st.S.map(s=>{let c=0,w=0,k=0,sc=0,pos=0;s.qs.forEach(x=>{const v=rev[x.id];pos+=+x.marks;if(v.chosen==null)k++;else if(v.chosen===v.correct_index){c++;sc+=+x.marks}else{w++;sc-=neg}});
    return `<tr><td>${e(s.title)}<td>${c}<td>${w}<td>${k}<td>${+sc.toFixed(2)} / ${+pos.toFixed(2)}</tr>`}).join(''):'';
  app.innerHTML=`<div class="panel res"><div class="badge2 ${r.pass?'pass':'fail'}">${r.pass?'Passed':'Not passed yet'}</div><h1>${+r.score.toFixed(2)} <small>/ ${+r.total.toFixed(2)}</small></h1><p style="color:var(--mute)">${e(a.title)} · ${Math.round(pct)}% (pass mark ${a.pass_percent}%)</p>
  <div class="stats"><div><b>${r.correct}</b>Correct</div><div><b>${r.wrong}</b>Wrong</div><div><b>${r.skipped}</b>Skipped</div><div><b>${acc}%</b>Accuracy</div><div><b>${mmss(took)}</b>Time taken</div></div>
  ${secRows?`<div class="tw"><table><tr><th>Section<th>Correct<th>Wrong<th>Skipped<th>Marks</tr>${secRows}</table></div>`:''}
  <div class="acts"><button class="btn acc" id="again">Try again</button><a class="btn ghost" href="#/">Back to home</a></div></div>
  <div class="sec"><h2>Review your answers</h2><div class="tags" id="rf">${[['all','All'],['wrong','Wrong'],['skip','Skipped'],['right','Correct']].map(([k,l],i)=>`<span class="tag${i?'':' on'}" data-f="${k}" tabindex="0">${l}</span>`).join('')}</div></div><div id="rl"></div>`;
  const draw=f=>{$('#rl').innerHTML=st.Q.map((x,n)=>{const v=rev[x.id],t=v.chosen==null?'skip':v.chosen===v.correct_index?'right':'wrong';if(f!=='all'&&f!==t)return'';
    return `<div class="panel rv ${t}"><div class="qh"><span>Q${n+1}${st.S.length>1?' · '+e(st.S[x.si].title):''}</span><span class="mk">${t==='right'?'+'+x.marks:t==='wrong'?'−'+neg:'0'}</span></div><div class="qt">${e(x.question)}</div>
    ${x.options.map((o,k)=>`<div class="opt ${k===v.correct_index?'ok':k===v.chosen?'bad':''}"><span class="ol">${OL[k]}</span><span>${e(o)}${k===v.correct_index?' ✔':''}${k===v.chosen&&k!==v.correct_index?' (your answer)':''}</span></div>`).join('')}
    ${v.explanation?`<div class="fb"><b>Explanation</b><br>${e(v.explanation)}</div>`:''}</div>`}).join('')||'<div class="empty">Nothing in this filter.</div>'};
  draw('all');
  $('#rf').onclick=ev=>{const t=ev.target.closest('.tag');if(!t)return;document.querySelectorAll('#rf .tag').forEach(x=>x.classList.toggle('on',x===t));draw(t.dataset.f)};
  const id=a.id;$('#again').onclick=()=>{exCleanup();exam(id)};scrollTo(0,0)}
