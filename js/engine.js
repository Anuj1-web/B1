/* Quiz & test engine — loaded on demand for #/exam/<id> */
let st=null;
const OL='ABCDEF';
const SN={nv:'Not visited',na:'Not answered',a:'Answered',mr:'Marked for review',amr:'Answered & marked for review'};
const shuf=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
window.exCleanup=()=>{if(st?.tick)clearInterval(st.tick);if(st?.rvKey)document.removeEventListener('keydown',st.rvKey);st=null;document.body.classList.remove('focus','pal-open');window.onbeforeunload=null;exitFS()};

/* ---------- full screen (hides the browser bars where the browser allows it) ---------- */
const FSE=document.documentElement,fsOK=!!(document.fullscreenEnabled||document.webkitFullscreenEnabled);
const inFS=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
function enterFS(){try{const f=FSE.requestFullscreen||FSE.webkitRequestFullscreen;if(f&&!inFS()){const p=f.call(FSE,{navigationUI:'hide'});p&&p.catch&&p.catch(()=>{})}}catch{}}
function exitFS(){try{if(inFS()){const p=(document.exitFullscreen||document.webkitExitFullscreen).call(document);p&&p.catch&&p.catch(()=>{})}}catch{}}
const toggleFS=()=>inFS()?exitFS():enterFS();

/* ---------- in-page confirm dialog (a native confirm() can knock the browser out of full screen) ---------- */
function ask(title,msg,ok='OK',cancel='Cancel',danger){
  return new Promise(res=>{const d=document.createElement('div');d.className='dlg';
    d.innerHTML=`<div class="dbox" role="dialog" aria-modal="true" aria-label="${e(title)}"><h3>${e(title)}</h3><p>${e(msg).replace(/\n/g,'<br>')}</p><div class="acts"><button class="btn ghost" data-r="0">${e(cancel)}</button><button class="btn ${danger?'red':'acc'}" data-r="1">${e(ok)}</button></div></div>`;
    const done=v=>{document.removeEventListener('keydown',key,true);d.remove();res(v)};
    const key=ev=>{if(ev.key==='Escape'){ev.stopPropagation();done(false)}};
    d.onclick=ev=>{const b=ev.target.closest('[data-r]');if(b)done(b.dataset.r==='1');else if(ev.target===d)done(false)};
    document.addEventListener('keydown',key,true);document.body.appendChild(d);d.querySelector('[data-r="1"]').focus()})}
function lightbox(src){const d=document.createElement('div');d.className='lb';d.innerHTML=`<img src="${e(src)}" alt="Enlarged figure"><button aria-label="Close">✕</button>`;d.onclick=()=>d.remove();document.body.appendChild(d)}
document.addEventListener('click',ev=>{const i=ev.target.closest('[data-zoom]');if(i)lightbox(i.src)});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){document.querySelector('.lb')?.remove();document.body.classList.remove('pal-open')}});
const figure=x=>x.image_url?`<figure class="qimg"><img src="${e(x.image_url)}" alt="Figure for this question" data-zoom loading="lazy"><figcaption>Tap the figure to enlarge</figcaption></figure>`:'';

async function exam(id){
  const a=(await q(sb.from('assessments').select('*').eq('id',id).limit(1)))[0];
  if(!a){app.innerHTML='<div class="empty">This quiz or test was not found, or is not live yet.</div>';return}
  const [secs,qs]=await Promise.all([q(sb.from('sections').select('*').eq('assessment_id',id).order('sort_order')),
    q(sb.from('questions').select('id,section_id,question,options,marks,sort_order,image_url').eq('assessment_id',id).order('sort_order'))]);
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
  app.innerHTML=`<p><a href="${a.folder_id?'#/f/'+a.folder_id:'#/'}">← Back</a></p><div class="panel" style="max-width:760px;margin:10px auto"><h1 style="font-size:clamp(1.6rem,4vw,2.4rem)">${e(a.title)}</h1><p style="color:var(--mute)">${e(a.description)}</p>
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
  document.body.classList.add('focus');window.onbeforeunload=()=>true;scrollTo(0,0);if(a.kind==='test')enterFS();
  a.kind==='quiz'?quizUI():testUI();st.tick=setInterval(tick,500);tick()}
function persist(){if(st.a.kind!=='test')return;ls.set('li_ex_'+st.a.id,{order:st.Q.map(x=>x.id),ans:st.ans,mark:[...st.mark],vis:[...st.vis],cur:st.cur,sec:st.sec,start:st.start,end:st.end,secEnd:st.secEnd})}

function tick(){if(!st||st.done)return;const now=Date.now(),parts=[];let low=false;
  if(st.end){const l=Math.max(0,Math.ceil((st.end-now)/1000));parts.push(`${st.m==='sectional_timer'?'':'⏱ '}${mmss(l)}`);low=low||l<60;if(l<=0)return finish(true)}
  if(st.secEnd){const l=Math.max(0,Math.ceil((st.secEnd-now)/1000));parts.push(`⏱ Section ${mmss(l)}`);low=low||l<60;if(l<=0)return nextSec(true)}
  const el=$('#tm');if(el){el.textContent=parts.join('  ·  ')||'No time limit';el.classList.toggle('warn',low)}}

/* ---------- test window ---------- */
function stat(i){const id=st.Q[i].id,an=id in st.ans,mk=st.mark.has(id);return mk?(an?'amr':'mr'):an?'a':st.vis.has(id)?'na':'nv'}
function testUI(){
  app.innerHTML=`<div class="ex"><div class="ex-top"><b>${e(st.a.title)}</b><span id="tm" class="tm"></span>${fsOK?'<button class="ib fsb" id="fsb" aria-label="Toggle full screen" title="Full screen">⛶</button>':''}<button class="btn red sm" id="sub">Submit test</button><button class="ib pbtn" id="pbtn" aria-label="Open question palette" aria-expanded="false">☰</button></div><div class="ex-tabs" id="tabs"></div>
  <div class="ex-main"><section class="ex-q" id="qa"></section><aside class="ex-pal" id="xpal" aria-label="Question palette"><div class="phead"><b>Question palette</b><button class="ib" id="pclose" aria-label="Close palette">✕</button></div><div id="leg" class="leg"></div><div id="pal" class="pal"></div><div class="pacts"><button class="btn ghost" id="quit">Quit test</button><button class="btn red" id="sub2">Submit test</button></div></aside></div><div class="pscrim" id="pscrim"></div><div class="ex-foot" id="ft"></div></div>`;
  const root=$('.ex');
  const pal=o=>{document.body.classList.toggle('pal-open',o);$('#pbtn').setAttribute('aria-expanded',o)};
  $('#sub').onclick=$('#sub2').onclick=()=>{pal(false);submitAsk()};$('#quit').onclick=()=>{pal(false);quitTest()};if($('#fsb'))$('#fsb').onclick=toggleFS;$('#pbtn').onclick=()=>pal(true);$('#pclose').onclick=$('#pscrim').onclick=()=>pal(false);
  root.onchange=ev=>{if(ev.target.name==='o'){st.ans[st.Q[st.cur].id]=+ev.target.value;persist();paint(true)}};
  root.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const d=b.dataset,x=st.Q[st.cur];
    if(d.j!==undefined){pal(false);go(+d.j)}else if(d.s!==undefined)go(secStart(+d.s));
    else if(d.act==='prev')go(st.cur-1);
    else if(d.act==='save')go(Math.min(st.cur+1,rangeOf().hi-1));
    else if(d.act==='mark'){st.mark.has(x.id)?st.mark.delete(x.id):st.mark.add(x.id);persist();paint(true)}
    else if(d.act==='clear'){delete st.ans[x.id];persist();paint()}
    else if(d.act==='sec')nextSec(false)};
  paint()}
function rangeOf(){const s=st.Q[st.cur].si,lo=st.m==='mixed'?0:secStart(s);return{lo,hi:st.m==='mixed'?st.Q.length:lo+st.S[s].qs.length}}
function go(j){if(j<0||j>=st.Q.length)return;st.cur=j;st.sec=st.Q[j].si;persist();paint()}
function paint(keepScroll){
  const i=st.cur,x=st.Q[i],s=st.S[x.si],{lo,hi}=rangeOf();st.vis.add(x.id);
  $('#tabs').innerHTML=st.S.length>1?st.S.map((t,si)=>`<button class="stab${si===x.si?' on':''}" data-s="${si}" ${st.m==='sectional_timer'&&si!==x.si?'disabled':''}>${st.m==='sectional_timer'&&si<x.si?'🔒 ':''}${e(t.title)}</button>`).join(''):'';
  const neg=st.a.negative_marking>0?` / −${st.a.negative_marking}`:'';
  $('#qa').innerHTML=`<div class="qh"><span>Question ${i-lo+1} of ${hi-lo}${st.S.length>1?' · '+e(s.title):''}</span><span class="mk">+${x.marks}${neg}</span></div><div class="qt">${e(x.question)}</div>${figure(x)}
  <div class="opts">${x.options.map((o,k)=>`<label class="opt${st.ans[x.id]===k?' sel':''}"><input type="radio" name="o" value="${k}" ${st.ans[x.id]===k?'checked':''}><span class="ol">${OL[k]}</span><span>${e(o)}</span></label>`).join('')}</div>`;
  const cnt={nv:0,na:0,a:0,mr:0,amr:0};let pal='';
  for(let j=lo;j<hi;j++){const t=stat(j);cnt[t]++;pal+=`<button class="pn p-${t}${j===i?' cur':''}" data-j="${j}" aria-label="Question ${j-lo+1}: ${SN[t]}">${j-lo+1}</button>`}
  $('#pal').innerHTML=pal;
  $('#leg').innerHTML=Object.keys(SN).map(t=>`<span><i class="pn p-${t}">${cnt[t]}</i>${SN[t]}</span>`).join('');
  const mk=st.mark.has(x.id),secBtn=st.m==='sectional_timer'&&i===hi-1&&x.si<st.S.length-1;
  $('#ft').innerHTML=`<button class="btn ghost navb" data-act="prev" ${i===lo?'disabled':''} aria-label="Previous question">←</button>
  <div class="mid"><button class="btn ghost sm" data-act="clear" ${x.id in st.ans?'':'disabled'}>Clear response</button><button class="btn ghost sm${mk?' on':''}" data-act="mark" aria-pressed="${mk}">${mk?'★ Marked for review':'☆ Mark for review'}</button></div>
  ${secBtn?'<button class="btn navb wide" data-act="sec">Submit section →</button>':`<button class="btn acc navb" data-act="save" ${i===hi-1?'disabled':''} aria-label="Next question">→</button>`}`;
  if(!keepScroll)scrollTo(0,0)}
async function nextSec(auto){
  if(st.sec>=st.S.length-1)return finish(auto);
  if(!auto&&!await ask('Submit this section?','You will move on to the next section and cannot come back to this one.','Submit section','Stay'))return;
  if(!st||st.done)return;
  st.sec++;st.cur=secStart(st.sec);secTimer();persist();paint();if(auto)toast('Section time is over — moving to the next section')}
async function submitAsk(){
  const n=Object.keys(st.ans).length,t=st.Q.length;
  if(await ask('Submit test?',`Answered: ${n}\nNot answered: ${t-n}\nMarked for review: ${st.mark.size}`,'Submit test','Keep working'))finish(false)}
async function quitTest(){
  if(!await ask('Quit this test?','Your answers will NOT be submitted and this attempt will be discarded.','Quit test','Keep going',true))return;
  if(!st)return;const a=st.a;ls.set('li_ex_'+a.id,null);exCleanup();location.hash=a.folder_id?'#/f/'+a.folder_id:'#/'}

/* ---------- quiz window ---------- */
function quizUI(){
  app.innerHTML=`<div class="ex quiz"><div class="ex-top"><b>${e(st.a.title)}</b><span id="tm" class="tm"></span><button class="btn ghost sm" id="sub">Finish</button></div><div class="pbar"><i id="pb"></i></div>
  <div class="ex-single"><section class="ex-q" id="qa"></section><div class="ex-foot" id="ft"></div></div></div>`;
  $('#sub').onclick=async()=>{if(await ask('Finish the quiz?','Unanswered questions will count as skipped.','Finish','Keep going'))finish(false)};
  $('.ex').onclick=async ev=>{const o=ev.target.closest('[data-k]'),b=ev.target.closest('[data-act]'),x=st.Q[st.cur];
    if(o&&!st.fb[x.id]){const k=+o.dataset.k;st.ans[x.id]=k;
      const{data,error}=await sb.rpc('check_answer',{p_question:x.id,p_choice:k});
      st.fb[x.id]=error||!data?{correct:null}:data;qpaint()}
    else if(b?.dataset.act==='next'){st.cur<st.Q.length-1?(st.cur++,qpaint()):finish(false)}};
  qpaint()}
function qpaint(){
  const i=st.cur,x=st.Q[i],fb=st.fb[x.id],ch=st.ans[x.id],score=Object.values(st.fb).filter(f=>f.correct).length;
  $('#pb').style.width=(i/st.Q.length*100)+'%';
  $('#qa').innerHTML=`<div class="qh"><span>Question ${i+1} of ${st.Q.length}</span><span class="mk">Correct so far: ${score}</span></div><div class="qt">${e(x.question)}</div>${figure(x)}
  <div class="opts">${x.options.map((o,k)=>`<button class="opt${fb?(k===fb.correct_index?' ok':k===ch?' bad':''):''}" data-k="${k}" ${fb?'disabled':''}><span class="ol">${OL[k]}</span><span>${e(o)}</span></button>`).join('')}</div>
  ${fb?`<div class="fb ${fb.correct?'ok':'bad'}"><b>${fb.correct===null?'Answer saved.':fb.correct?'Correct!':'Not quite.'}</b>${fb.explanation?'<br>'+e(fb.explanation):''}</div>`:''}`;
  $('#ft').innerHTML=`<span></span><button class="btn acc" data-act="next">${fb?(i<st.Q.length-1?'Next question':'See results'):(i<st.Q.length-1?'Skip':'Finish')}</button>`;
  scrollTo(0,0)}

/* ---------- submit & results ---------- */
async function finish(auto){
  if(!st||st.done)return;st.done=true;clearInterval(st.tick);window.onbeforeunload=null;exitFS();
  const took=Math.round((Date.now()-st.start)/1000);
  app.innerHTML=`<div class="load">${auto?'Time is up. ':''}Submitting your answers…</div>`;
  const{data,error}=await sb.rpc('submit_attempt',{p_assessment:st.a.id,p_answers:st.ans,p_time:took,p_client:cid});
  if(error||!data){app.innerHTML='<div class="empty"><p>We could not submit your answers. They are saved on this device.</p><button class="btn acc" id="rt">Try again</button></div>';st.done=false;$('#rt').onclick=()=>finish(false);return}
  ls.set('li_ex_'+st.a.id,null);document.body.classList.remove('focus');result(data,took)}

function result(r,took){
  document.body.classList.remove('focus','pal-open');st.res={r,took};
  const a=st.a,rev=Object.fromEntries(r.review.map(x=>[x.id,x])),pct=r.total?Math.max(0,r.score/r.total*100):0,acc=r.correct+r.wrong?Math.round(r.correct/(r.correct+r.wrong)*100):0;
  const neg=+a.negative_marking||0;
  const secRows=st.S.length>1?st.S.map(s=>{let c=0,w=0,k=0,sc=0,pos=0;s.qs.forEach(x=>{const v=rev[x.id];pos+=+x.marks;if(v.chosen==null)k++;else if(v.chosen===v.correct_index){c++;sc+=+x.marks}else{w++;sc-=neg}});
    return `<tr><td>${e(s.title)}<td>${c}<td>${w}<td>${k}<td>${+sc.toFixed(2)} / ${+pos.toFixed(2)}</tr>`}).join(''):'';
  app.innerHTML=`<div class="panel res"><div class="badge2 ${r.pass?'pass':'fail'}">${r.pass?'Passed':'Not passed yet'}</div><h1>${+r.score.toFixed(2)} <small>/ ${+r.total.toFixed(2)}</small></h1><p style="color:var(--mute)">${e(a.title)} · ${Math.round(pct)}% (pass mark ${a.pass_percent}%)</p>
  <div class="stats"><div><b>${r.correct}</b>Correct</div><div><b>${r.wrong}</b>Wrong</div><div><b>${r.skipped}</b>Skipped</div><div><b>${acc}%</b>Accuracy</div><div><b>${mmss(took)}</b>Time taken</div></div>
  ${secRows?`<div class="tw"><table><tr><th>Section<th>Correct<th>Wrong<th>Skipped<th>Marks</tr>${secRows}</table></div>`:''}
  <div class="acts"><button class="btn acc" id="again">Try again</button><button class="btn ghost" id="rvw">Review your answers</button><a class="btn ghost" href="${a.folder_id?'#/f/'+a.folder_id:'#/'}">Back</a></div></div>`;
  const id=a.id;$('#again').onclick=()=>{exCleanup();exam(id)};$('#rvw').onclick=()=>review(r,took);scrollTo(0,0)}

/* ---------- review mode: same layout as the test window, one question at a time ---------- */
function review(r,took,start=0){
  const a=st.a,rev=Object.fromEntries(r.review.map(x=>[x.id,x])),neg=+a.negative_marking||0;
  const kind=x=>{const v=rev[x.id];return v.chosen==null?'skip':v.chosen===v.correct_index?'right':'wrong'};
  const LAB={right:'Correct',wrong:'Wrong',skip:'Not answered'};
  let cur=Math.min(Math.max(start,0),st.Q.length-1);
  document.body.classList.add('focus');
  app.innerHTML=`<div class="ex rvw"><div class="ex-top"><b>${e(a.title)} · Review</b><button class="ib" id="rvx">← Results</button><button class="ib pbtn" id="pbtn" aria-label="Open question palette" aria-expanded="false">☰</button></div>
  <div class="ex-main"><section class="ex-q" id="qa"></section><aside class="ex-pal" id="xpal" aria-label="Question palette"><div class="phead"><b>Question palette</b><button class="ib" id="pclose" aria-label="Close palette">✕</button></div><div class="leg" id="leg"></div><div id="pal"></div></aside></div><div class="pscrim" id="pscrim"></div><div class="ex-foot" id="ft"></div></div>`;
  const pal=o=>{document.body.classList.toggle('pal-open',o);$('#pbtn').setAttribute('aria-expanded',o)};
  const leave=()=>{document.removeEventListener('keydown',st.rvKey);st.rvKey=null;document.body.classList.remove('pal-open');result(r,took)};
  const goTo=j=>{if(j<0||j>=st.Q.length)return;cur=j;draw();$('.ex-main').scrollTop=0};
  st.rvKey=ev=>{if(ev.target.closest&&ev.target.closest('.dlg'))return;if(ev.key==='ArrowRight')goTo(cur+1);else if(ev.key==='ArrowLeft')goTo(cur-1)};
  document.addEventListener('keydown',st.rvKey);
  $('#rvx').onclick=leave;$('#pbtn').onclick=()=>pal(true);$('#pclose').onclick=$('#pscrim').onclick=()=>pal(false);
  $('.rvw').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;
    if(b.dataset.j!==undefined){pal(false);goTo(+b.dataset.j)}else if(b.dataset.act==='prev')goTo(cur-1);else if(b.dataset.act==='next')goTo(cur+1)};
  function draw(){
    const x=st.Q[cur],v=rev[x.id],t=kind(x),s=st.S[x.si],lo=secStart(x.si);
    $('#qa').innerHTML=`<div class="qh"><span>Question ${cur-lo+1} of ${s.qs.length}${st.S.length>1?' · '+e(s.title):''}</span><span class="rst ${t}">${LAB[t]} · ${t==='right'?'+'+x.marks:t==='wrong'?'−'+neg:'0'}</span></div><div class="qt">${e(x.question)}</div>${figure(x)}
    <div class="opts rvo">${x.options.map((o,k)=>{const ok=k===v.correct_index,mine=k===v.chosen;
      return `<div class="opt${ok?' ok':mine?' bad':''}"><span class="ol">${ok?'✔':mine?'✕':OL[k]}</span><span>${e(o)}${ok?'<em class="you"> — correct answer</em>':''}${mine&&!ok?'<em class="you"> — your answer</em>':''}${mine&&ok?'<em class="you"> — your answer</em>':''}</span></div>`}).join('')}</div>
    ${t==='skip'?'<div class="fb">You did not answer this question.</div>':''}
    <div class="fb ${t==='right'?'ok':t==='wrong'?'bad':''}" style="${v.explanation?'':'display:none'}"><b>Explanation</b><br>${e(v.explanation||'')}</div>`;
    let p='';st.S.forEach((sec,si)=>{const l0=secStart(si);if(st.S.length>1)p+=`<div class="pgh">${e(sec.title)}</div>`;
      p+='<div class="pal">'+sec.qs.map((q2,n)=>{const j=l0+n;return `<button class="pn p-${kind(q2)}${j===cur?' cur':''}" data-j="${j}" aria-label="Question ${n+1}: ${LAB[kind(q2)]}">${n+1}</button>`}).join('')+'</div>'});
    $('#pal').innerHTML=p;
    $('#leg').innerHTML=`<span><i class="pn p-right">✔</i>Correct</span><span><i class="pn p-wrong">✕</i>Wrong</span><span><i class="pn p-skip"></i>Not answered</span>`;
    $('#ft').innerHTML=`<button class="btn ghost navb" data-act="prev" ${cur===0?'disabled':''} aria-label="Previous question">←</button><div class="mid"><span class="rcount">${cur+1} / ${st.Q.length}</span></div><button class="btn acc navb" data-act="next" ${cur===st.Q.length-1?'disabled':''} aria-label="Next question">→</button>`}
  draw();scrollTo(0,0)}
