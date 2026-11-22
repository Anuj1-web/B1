/* Library import (admin) — loaded with the admin panel.
   Reads the TEST-WISE question library on the admin's PC through the read-only "Website Bridge" (qbank_bridge.py), lets the
   admin preview and fix every question, then publishes the test as one Full test and / or one Sectional test per section.
   Pictures are uploaded to the "content" bucket; if anything fails midway everything made so far is undone. */
const LB={base:'http://127.0.0.1:8765',tok:ls.get('li_bridge_tok',''),ok:false,libs:null,libEx:ls.get('li_lib_ex',''),test:null,ed:{},editing:null,P:null,plan:[],tabs:[],pub:{},busy:false,imgs:new Map(),filt:''};
const LBK=u=>LB.base+u;
class BridgeError extends Error{constructor(kind,msg,status){super(msg);this.kind=kind;this.status=status}}
async function bridge(path,blob){
  let r;try{r=await fetch(LBK(path),{headers:{'X-Bridge-Token':LB.tok},targetAddressSpace:'loopback'})}
  catch{throw new BridgeError('down','Cannot reach the bridge at 127.0.0.1:8765.')}
  if(r.status===403)throw new BridgeError('origin','This website is not on the bridge’s allowed list.',403);
  if(r.status===401)throw new BridgeError('token','The token is wrong or missing.',401);
  if(!r.ok){let m='';try{m=(await r.json()).error}catch{}throw new BridgeError('http',m||('Bridge error '+r.status),r.status)}
  return blob?r.blob():r.json()}
const bridgeHelp=err=>{const o=location.origin;
  return err.kind==='down'?`<b>The bridge is not reachable.</b> Start it on your PC (double-click <code>start_bridge.bat</code>) and keep its window open. If Chrome asks to allow access to devices on your network, choose <b>Allow</b>. If it still fails, run this once and start it again:<br><code>python qbank_bridge.py --allow ${e(o)}</code>`
   :err.kind==='origin'?`<b>The bridge blocked this website.</b> Run this once, then start the bridge again:<br><code>python qbank_bridge.py --allow ${e(o)}</code>`
   :err.kind==='token'?'<b>Wrong token.</b> Copy the TOKEN line shown in the bridge window (or from <code>QuestionLibrary\\bridge_token.txt</code>).':e(err.message)};

/* ---------- pictures: fetched from the bridge only when they scroll into view ---------- */
async function bImg(url){if(!LB.imgs.has(url)){const p=bridge(url,true).then(b=>({blob:b,obj:URL.createObjectURL(b)}));p.catch(()=>LB.imgs.delete(url));LB.imgs.set(url,p)}return LB.imgs.get(url)}
function hydrate(root){
  const io=new IntersectionObserver(es=>es.forEach(en=>{if(!en.isIntersecting)return;const im=en.target;io.unobserve(im);
    bImg(im.dataset.b).then(r=>{im.src=r.obj;im.removeAttribute('data-b')}).catch(()=>{im.removeAttribute('data-b');im.classList.add('lqbad');im.title='This picture could not be loaded from the library'})}),{rootMargin:'400px'});
  root.querySelectorAll('img[data-b]').forEach(i=>io.observe(i))}
const BLANK='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const bimg=(u,cls='lqimg',alt='Question picture')=>`<img class="${cls}" src="${BLANK}" data-b="${e(u)}" alt="${e(alt)}">`;
const pool=async(items,n,fn)=>{let i=0,err=null;await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(i<items.length&&!err){const k=i++;try{await fn(items[k],k)}catch(x){err=x}}}));if(err)throw err};

/* ---------- the question as the admin sees it: library data + the admin's own fixes ---------- */
const qv=x=>{const d=LB.ed[x.uid]||{};return{...x,stem:d.stem??x.stem,options:d.options||x.options,answer:d.answer!==undefined?d.answer:x.answer,solution:d.solution??x.solution,hi:d.hi!==undefined?d.hi:x.hi,marks:d.marks??null,exclude:!!d.exclude}};
const hiAny=h=>!!h&&!!((h.stem||'').trim()||(h.solution||'').trim()||(h.options||[]).some(o=>(o||'').trim()));
const hasPic=x=>x.render||x.figures.some(f=>f.exists&&!f.option);
const hasOptPic=x=>x.figures.some(f=>f.exists&&f.option);
const qProblems=x=>{const v=qv(x),p=[];if(v.exclude)return p;
  if(v.answer==null)p.push('no correct answer chosen');
  if(!v.stem.trim()&&!hasPic(x))p.push('no question text or picture');
  if(!v.options.some(o=>o.trim())&&!hasOptPic(x)&&x.render?.mode!=='whole')p.push('no options');return p};
const qWarn=x=>{const w=[];if(x.figures.some(f=>!f.exists))w.push('a picture file is missing on disk');if(x.needs_attention&&!x.flags.every(f=>f==='no_answer'))w.push('flagged in the library: '+x.flags.filter(f=>f!=='no_answer').join(', '));return w};
const srcKey=(code,key,sec)=>`lib:${code||'X'}:${key}${sec?':'+sec:''}`.replace(/\s+/g,'_');

async function aLib(){
  const root=$('#ad');
  const connect=async(tok)=>{LB.tok=(tok??LB.tok).trim();try{const ping=await bridge('/api/ping');if(!ping.authed)throw new BridgeError('token','The token is wrong or missing.',401);
      LB.libs=(await bridge('/api/library')).exams;LB.ok=true;ls.set('li_bridge_tok',LB.tok);return null}catch(err){LB.ok=false;LB.libs=null;return err instanceof BridgeError?err:new BridgeError('down',String(err.message||err))}};
  const loadPub=async()=>{const rows=await q(sb.from('assessments').select('id,exam_id,tab_id,source_key,is_published,title').like('source_key','lib:%').limit(5000));LB.pub={};rows.forEach(r=>(LB.pub[r.source_key]=LB.pub[r.source_key]||[]).push(r))};
  const statusOf=(code,t)=>{const full=LB.pub[srcKey(code,t.key)],sec=Object.keys(LB.pub).filter(k=>k.startsWith(srcKey(code,t.key)+':')).length;return{full:!!full,sec}};

  const head=(err)=>`<div class="panel"><div class="ah"><h3>Question library connection</h3>${LB.ok?`<div class="acts" style="margin:0"><button class="btn ghost sm" id="lre">↻ Reload library</button><button class="btn ghost sm" id="ldis">Disconnect</button></div>`:''}</div>
    ${LB.ok?`<p class="sum"><span class="dot ok"></span> Connected to the bridge · <b>${LB.libs.reduce((n,x)=>n+x.tests.length,0)}</b> tests in <b>${LB.libs.length}</b> exam${LB.libs.length==1?'':'s'}.</p>`
    :`<ol class="lsteps"><li>On your PC double-click <code>start_bridge.bat</code> (next to the question library app) and keep the window open.</li><li>First time only: allow this website — run <code>python qbank_bridge.py --allow ${e(location.origin)}</code>, then start the bridge again.</li><li>Paste the <b>TOKEN</b> shown in the bridge window and press Connect.</li></ol>
    <form class="f" id="lcf" style="margin-top:10px"><label>Bridge token<input name="tok" value="${e(LB.tok)}" placeholder="paste the token" autocomplete="off" spellcheck="false"></label><div style="align-self:end"><button class="btn acc">Connect</button></div></form>
    ${err?`<p class="warnb" role="alert">${bridgeHelp(err)}</p>`:''}`}</div>`;

  const drawLib=()=>{
    const X=LB.libs.find(x=>String(x.id)===String(LB.libEx))||LB.libs[0];if(X)LB.libEx=X.id;
    const tests=(X?.tests||[]).filter(t=>!LB.filt||t.title.toLowerCase().includes(LB.filt));
    return `<div class="panel"><div class="f" style="grid-template-columns:minmax(200px,1fr) minmax(200px,1fr)"><label>Library exam<select id="lex">${LB.libs.map(x=>`<option value="${x.id}" ${x.id===X?.id?'selected':''}>${e(x.name)} (${x.tests.length} tests)</option>`).join('')}</select></label><label>Search tests<input id="lfi" value="${e(LB.filt)}" placeholder="title, date or shift"></label></div>
      <div class="tw" style="margin-top:12px"><table><tr><th>Test<th>Date · shift<th>Qs<th>Sections<th>Check<th>On the website<th></tr>${tests.map(t=>{const s=statusOf(X.code,t);
        return `<tr><td style="min-width:180px"><b>${e(t.title)}</b><td><small>${e([t.date,t.shift?'S'+t.shift:''].filter(Boolean).join(' · ')||'—')}</small><td>${t.questions}<td><small>${t.sections.map(z=>`${e(z.name)} ${z.questions}`).join(' · ')}</small><td>${t.attention?`<span class="tag" title="Questions flagged in the library">⚠ ${t.attention}</span>`:'<span style="color:#2e9e5b">✓</span>'}<td>${s.full||s.sec?`<small>${s.full?'Full ✓':''}${s.full&&s.sec?' · ':''}${s.sec?s.sec+' sectional ✓':''}</small>`:'<small style="color:var(--mute)">not published</small>'}<td><button class="btn ${s.full||s.sec?'ghost':'acc'} sm" data-o="${t.id}">${s.full||s.sec?'Open':'Preview & publish'}</button></tr>`}).join('')||'<tr><td colspan="7"><div class="empty">No tests found.</div></tr>'}</table></div></div>`};

  const draw=async(err)=>{
    root.innerHTML=head(err)+(LB.ok?`<div id="lbody">${LB.test?'':drawLib()}</div><div id="lws"></div>`:'');
    if(!LB.ok){$('#lcf').onsubmit=async ev=>{ev.preventDefault();const b=ev.target.querySelector('button');b.disabled=true;const er=await connect(fd(ev.target).tok);if(er){draw(er);return}await loadPub();draw()}}
    else{
      $('#lre').onclick=async()=>{LB.imgs.clear();const er=await connect();if(er)return draw(er);await loadPub();LB.test=null;toast('Library reloaded');draw()};
      $('#ldis').onclick=()=>{LB.ok=false;LB.tok='';ls.set('li_bridge_tok','');LB.test=null;draw()};
      if(LB.test)return workspace();
      bindOpen()}};
  const bindOpen=()=>{$('#lex').onchange=ev=>{LB.libEx=ev.target.value;ls.set('li_lib_ex',LB.libEx);draw()};$('#lfi').oninput=ev=>{LB.filt=ev.target.value.trim().toLowerCase();const pos=ev.target.selectionStart;$('#lbody').innerHTML=drawLib();const i=$('#lfi');i.focus();i.setSelectionRange(pos,pos);bindOpen()};
    root.querySelectorAll('[data-o]').forEach(b=>b.onclick=async()=>{b.disabled=true;b.textContent='Loading…';
      try{LB.test=await bridge('/api/test/'+b.dataset.o);LB.ed={};LB.editing=null;LB.libX=LB.libs.find(x=>String(x.id)===String(LB.libEx));await initPublish();draw();scrollTo(0,0)}
      catch(err){toast(err.message||'Could not load the test',1);b.disabled=false;b.textContent='Preview & publish'}})};

  /* ======================= publish settings + plan ======================= */
  const siteExams=()=>AD.exams.filter(x=>cats.find(c=>c.id===x.category_id)?.kind==='tests');
  const guessExam=()=>{const code=(LB.libX?.code||'').toUpperCase(),n=(LB.libX?.name||'').toLowerCase(),L=siteExams();
    return (L.find(x=>x.code&&x.code.toUpperCase()===code)||L.find(x=>n&&(x.name.toLowerCase().includes(code.toLowerCase())||n.includes(x.name.toLowerCase()))))?.id||'__new'};
  const DEFTABS=[['full','Full Test'],['sectional','Sectional'],['pyq','PYQ'],['ai','AI Generated'],['topic','Topic-wise']];
  const liveQs=()=>LB.test.questions.map(qv).filter(v=>!v.exclude);
  async function loadTabs(){const id=LB.P.examId;LB.tabs=id&&id!=='__new'?await q(sb.from('exam_tabs').select('*').eq('exam_id',id).order('sort_order')):DEFTABS.map(([key,label],i)=>({id:key,key,label,sort_order:i}))}
  const tabKeyOk=k=>LB.tabs.some(t=>t.key===k);
  function applyExamDefaults(){const P=LB.P,X=AD.exams.find(x=>x.id===P.examId)||{};
    P.fullMin=X.default_full_minutes||60;P.marks=X.default_marks??1;P.neg=X.default_negative??0;P.langs=(LB.test?.has_hindi||LB.test?.questions.some(q=>q.hi))?'English, Hindi':'English';P.secDefault=X.default_sectional_minutes||null;
    P.fullTab=tabKeyOk(ls.get('li_pub_fulltab','full'))?ls.get('li_pub_fulltab','full'):'full';P.secTab=tabKeyOk(ls.get('li_pub_sectab','sectional'))?ls.get('li_pub_sectab','sectional'):'sectional'}
  async function initPublish(){
    const t=LB.test,X=LB.libX,hasDate=!!t.date;
    LB.P={examId:guessExam(),newName:X?.name||'',newCat:cats.find(c=>c.kind==='tests')?.id||'',full:true,sec:t.sections.length>0&&!t.sectional,timer:'single_timer',live:true,free:true,compress:true,syllabus:'',date:t.date||'',shift:t.shift||'',secInc:Object.fromEntries(t.sections.map(s=>[s.name,true])),secLabel:{}};
    if(t.sectional)LB.P.full=false;
    await loadTabs();applyExamDefaults();buildPlan()}
  const labelOf=n=>LB.P.secLabel[n]||n;   /* the section's name on the website (can differ from the library's) */
  const examName=()=>LB.P.examId==='__new'?(LB.P.newName||'New exam'):(AD.exams.find(x=>x.id===LB.P.examId)?.name||'Exam');
  const dateTag=()=>{const P=LB.P,d=fmtDate(P.date);return d?` (${d}${P.shift?', Shift-'+P.shift:''})`:''};
  function buildPlan(){
    const P=LB.P,t=LB.test,qs=liveQs(),old=Object.fromEntries(LB.plan.map(r=>[r.id,r])),out=[];
    const totalQ=qs.length||1,nm=examName();
    const base=P.date?`${nm} - Full Test${dateTag()}`:`${nm} - ${t.title}`;
    out.push({id:'full',kind:'full',title:old.full?.title||base,minutes:old.full?.minutes||P.fullMin,on:P.full,n:qs.length});
    t.sections.forEach(s=>{const n=qs.filter(v=>v.section===s.name).length,id='sec:'+s.name,mins=P.secDefault||Math.max(1,Math.round(P.fullMin*n/totalQ));
      out.push({id,kind:'sec',section:s.name,title:old[id]?.title||(P.date?`${nm} - ${labelOf(s.name)}${dateTag()}`:`${nm} - ${labelOf(s.name)} - ${t.title}`),minutes:old[id]?.minutes||mins,on:P.sec&&P.secInc[s.name]&&n>0,n})});
    LB.plan=out}
  const resetPlan=()=>{LB.plan=[];buildPlan()};
  const problems=()=>{const out=[];LB.test.questions.forEach(x=>{const p=qProblems(x);if(p.length)out.push(`Q${x.pos} (${x.uid}): ${p.join(', ')}`)});
    const P=LB.P;if(!LB.plan.some(r=>r.on))out.push('Choose at least one thing to publish (full test or a section).');
    if(P.examId==='__new'&&!P.newName.trim())out.push('Type a name for the new exam.');if(P.examId==='__new'&&!P.newCat)out.push('Choose a category for the new exam.');if(!P.examId)out.push('Choose the website exam to publish into.');
    LB.plan.filter(r=>r.on).forEach(r=>{if(!r.title.trim())out.push('A title is empty.');if(!(+r.minutes>0))out.push(`“${r.title}” needs a time in minutes.`)});return out};

  /* ======================= workspace ======================= */
  const qCard=x=>{const v=qv(x),prob=qProblems(x),warn=qWarn(x),ed=LB.editing===x.uid,fig=x.figures.filter(f=>f.exists&&!f.option),opt=l=>x.figures.find(f=>f.exists&&f.option===l);
    if(ed)return `<div class="lq editing" data-u="${e(x.uid)}"><form class="f lqf"><label class="full">Question (use [b]bold[/b] [i]italic[/i] [u]underline[/u])<textarea name="stem" rows="3">${e(v.stem)}</textarea></label>
      ${[0,1,2,3].map(i=>`<label>Option ${'ABCD'[i]}<input name="o${i}" value="${e(v.options[i]||'')}">${opt('abcd'[i])?bimg(opt('abcd'[i]).url,'lqopt','Option '+'ABCD'[i]):''}</label>`).join('')}
      <label>Correct answer<select name="ans"><option value="">— choose —</option>${'ABCD'.split('').map((l,i)=>`<option value="${i}" ${v.answer===i?'selected':''}>${l}</option>`).join('')}</select></label><label>Marks (blank = default)<input name="marks" type="number" step="0.25" min="0" value="${v.marks??''}"></label>
      <label class="full">Solution / explanation<textarea name="sol" rows="2">${e(v.solution||'')}</textarea></label>
      <details class="full" ${hiAny(v.hi)?'open':''}><summary><b>हिन्दी version</b> <small>(optional — students can switch language)</small></summary><div class="f" style="margin-top:8px">
        <label class="full">प्रश्न<textarea name="hstem" rows="3" lang="hi">${e(v.hi?.stem||'')}</textarea></label>
        ${[0,1,2,3].map(i=>`<label>विकल्प ${'ABCD'[i]}<input name="ho${i}" lang="hi" value="${e(v.hi?.options?.[i]||'')}"></label>`).join('')}
        <label class="full">हल / स्पष्टीकरण<textarea name="hsol" rows="2" lang="hi">${e(v.hi?.solution||'')}</textarea></label></div></details>
      <div class="full"><button class="btn acc sm">Save question</button> <button type="button" class="btn ghost sm" data-c="1">Cancel</button> ${LB.ed[x.uid]?'<button type="button" class="btn ghost sm" data-r="1">Undo my changes</button>':''}</div></form></div>`;
    return `<div class="lq${v.exclude?' off':''}${prob.length?' bad':''}" data-u="${e(x.uid)}"><div class="lqh"><b>Q${x.pos}</b><small>${e(x.uid)}</small>${LB.ed[x.uid]?'<span class="tag">edited</span>':''}${x.status==='approved'?'<span class="tag" title="Proof-read in the library">✓ proof-read</span>':''}
      <span class="lqa"><button class="btn ghost sm" data-e="1">Edit</button><label class="lqx"><input type="checkbox" data-x="1" ${v.exclude?'checked':''}> Leave out</label></span></div>
      ${prob.map(p=>`<div class="lqp err">⚠ ${e(p)} — edit it, or leave the question out.</div>`).join('')}${warn.map(w=>`<div class="lqp">⚠ ${e(w)}</div>`).join('')}
      ${x.passage?.text||x.passage?.figures?.length?`<div class="psg"><b>Passage</b><div class="pt">${rich(x.passage.text||'')}</div>${x.passage.text_hi?`<div class="pt" lang="hi" style="margin-top:8px">${rich(x.passage.text_hi)}</div>`:''}${(x.passage.figures||[]).map(u=>bimg(u,'lqimg','Passage figure')).join('')}</div>`:''}
      ${x.render?.mode==='whole'&&!LB.ed[x.uid]?.stem?`<div class="lqp info">The whole question is a picture in the library, so it is shown as a picture.</div>${bimg(x.render.url)}`:`${v.stem?`<div class="lqt">${rich(v.stem)}</div>`:''}${x.render?bimg(x.render.url):''}`}
      ${fig.map(f=>bimg(f.url,'lqimg','Figure')).join('')}
      <ol type="A" class="lqo">${v.options.map((o,i)=>`<li class="${v.answer===i?'ok':''}">${o?rich(o):''}${opt('abcd'[i])?bimg(opt('abcd'[i]).url,'lqopt','Option '+'ABCD'[i]):''}${!o&&!opt('abcd'[i])?'<i class="oem">(shown in the picture)</i>':''}${v.answer===i?' ✔':''}</li>`).join('')}</ol>
      ${v.solution?`<div class="note">💡 ${rich(v.solution)}</div>`:''}
      ${hiAny(v.hi)?`<div class="lqhi" lang="hi"><small>हिन्दी</small>${v.hi.stem?`<div class="lqt">${rich(v.hi.stem)}</div>`:''}${(v.hi.options||[]).some(Boolean)?`<ol type="A" class="lqo">${v.hi.options.map(o=>`<li>${rich(o)}</li>`).join('')}</ol>`:''}${v.hi.solution?`<div class="note">💡 ${rich(v.hi.solution)}</div>`:''}</div>`:''}</div>`};
  const planHTML=()=>{const P=LB.P,nTab=LB.tabs;
    return `<div class="lplan"><table><tr><th>Publish<th>What<th>Title on the website<th>Qs<th>Minutes<th>Tab</tr>${LB.plan.map(r=>`<tr class="${r.on?'':'off'}"><td><input type="checkbox" data-pon="${e(r.id)}" ${r.on?'checked':''} style="width:auto" aria-label="Publish ${e(r.title)}"><td>${r.kind==='full'?'<b>Full test</b>':`Sectional<br><input data-pl="${e(r.section)}" value="${e(labelOf(r.section))}" style="width:150px;margin-top:4px" aria-label="Section name on the website" title="Section name shown on the website">`}<td><input data-pt="${e(r.id)}" value="${e(r.title)}" style="min-width:260px"><td>${r.n}<td><input type="number" data-pm="${e(r.id)}" value="${r.minutes}" min="1" style="width:76px" aria-label="Minutes"><td><small>${e(nTab.find(t=>t.key===(r.kind==='full'?P.fullTab:P.secTab))?.label||'—')}</small></tr>`).join('')}</table></div>`};

  async function workspace(){
    const t=LB.test,P=LB.P,qs=t.questions,ex=siteExams(),nQ=liveQs().length,prob=problems(),catsT=cats.filter(c=>c.kind==='tests');
    const secBlocks=t.sections.map(s=>`<details class="lsec" open><summary><b>${e(s.name)}</b> <small>${qs.filter(x=>x.section===s.name&&!qv(x).exclude).length} of ${s.questions} questions</small></summary>${qs.filter(x=>x.section===s.name).map(qCard).join('')}</details>`).join('');
    $('#lbody').innerHTML='';
    $('#lws').innerHTML=`<div class="panel"><div class="ah"><div><button class="btn ghost sm" id="lback">← Back to the library</button></div><div><b>${e(t.title)}</b> <small>${e(LB.libX?.name||'')} · ${qs.length} questions · ${t.sections.length} section${t.sections.length==1?'':'s'}</small></div></div></div>
    <form class="panel f" id="lps"><h3 class="full">1 · Where to publish</h3>
      <label>Website exam<select name="examId">${ex.map(x=>`<option value="${x.id}" ${P.examId===x.id?'selected':''}>${e(x.icon)} ${e(x.name)} — ${e(cats.find(c=>c.id===x.category_id)?.name||'')}</option>`).join('')}<option value="__new" ${P.examId==='__new'?'selected':''}>＋ Create a new exam…</option></select></label>
      ${P.examId==='__new'?`${fl('newName','New exam name',P.newName,'text','required')}${sel('newCat','In category',catsT.map(c=>[c.id,c.icon+' '+c.name]),P.newCat)}`:''}
      <label>Full test goes to tab<select name="fullTab">${LB.tabs.map(x=>`<option value="${x.key}" ${P.fullTab===x.key?'selected':''}>${e(x.label)}</option>`).join('')}</select></label><label>Sectional tests go to tab<select name="secTab">${LB.tabs.map(x=>`<option value="${x.key}" ${P.secTab===x.key?'selected':''}>${e(x.label)}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" name="full" ${P.full?'checked':''}><span>Publish as a <b>Full test</b></span></label><label class="chk"><input type="checkbox" name="sec" ${P.sec?'checked':''}><span>Publish <b>each section</b> as a Sectional test</span></label>
      ${t.sections.length>1?`<div class="full lsc">${t.sections.map(s=>`<label class="chk"><input type="checkbox" data-si="${e(s.name)}" ${P.secInc[s.name]?'checked':''}><span>${e(s.name)} <small>(${qs.filter(x=>x.section===s.name&&!qv(x).exclude).length})</small></span></label>`).join('')}</div>`:''}
      <h3 class="full">2 · Time, marks and rules</h3>
      ${fl('fullMin','Full test time (minutes)',P.fullMin,'number','min=1')}${sel('timer','Full test timer',[['single_timer','One timer for the whole test'],['sectional_timer','Separate timer for each section']],P.timer)}
      ${fl('marks','Marks per question',P.marks,'number','step=0.25 min=0')}${fl('neg','Negative marks per wrong answer',P.neg,'number','step=0.0001 min=0')}${fl('langs','Languages shown',P.langs)}
      ${fl('date','Exam date',P.date,'date')}${fl('shift','Shift',P.shift)}
      <label class="full">Syllabus / note shown with the test (optional)<input name="syllabus" value="${e(P.syllabus)}"></label>
      <div class="full lhint">Times start from the exam's defaults (Tests Hub → Exam page &amp; defaults). Change them here for this test only, or per row in the plan below.</div></form>
    <div class="panel"><h3>3 · What will be created</h3>${planHTML()}<div class="acts"><button class="btn ghost sm" id="lrp">Reset titles and times</button></div></div>
    <div class="panel"><div class="ah"><h3>4 · Check the questions</h3><span class="sum" style="margin:0"><b>${nQ}</b> of ${qs.length} questions will be published${qs.length-nQ?` · ${qs.length-nQ} left out`:''}</span></div>
      <p class="sum">Pictures and options come straight from your library. Use <b>Edit</b> to fix text or the answer, or <b>Leave out</b> to skip a question. Nothing in your library is changed.</p>${secBlocks}</div>
    <div class="panel lpub" id="lpub"><div id="lprob">${prob.length?`<div class="warnb" role="alert"><b>Fix before publishing:</b><ul>${prob.slice(0,12).map(p=>`<li>${e(p)}</li>`).join('')}${prob.length>12?`<li>…and ${prob.length-12} more</li>`:''}</ul></div>`:'<p class="sum" style="color:#2e9e5b">✓ Everything looks ready.</p>'}</div>
      <div class="f" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))"><label class="chk"><input type="checkbox" id="lfree" ${P.free?'checked':''}><span>Free test</span></label><label class="chk"><input type="checkbox" id="lcmp" ${P.compress?'checked':''}><span>Compress pictures (smaller, faster)</span></label></div>
      <div class="acts"><button class="btn acc" id="lgo" ${prob.length?'disabled':''}>Publish live</button><button class="btn ghost" id="ldr" ${prob.length?'disabled':''}>Save as draft</button></div>
      <div id="lpg" class="upst" hidden role="status" aria-live="polite"></div></div>`;
    hydrate($('#lws'));bindWs()}

  const refresh=async(keepScroll)=>{const y=scrollY;await workspace();if(keepScroll)scrollTo(0,y)};
  function bindWs(){
    const W=$('#lws');
    $('#lback').onclick=()=>{LB.test=null;LB.editing=null;draw()};
    $('#lps').onchange=async ev=>{const n=ev.target.name,P=LB.P;if(!n)return;const v=ev.target.type==='checkbox'?ev.target.checked:ev.target.value;
      if(n==='examId'){P.examId=v;await loadTabs();applyExamDefaults();resetPlan();return refresh(true)}
      if(['full','sec'].includes(n)){P[n]=v;buildPlan();return refresh(true)}
      if(['fullMin','marks','neg'].includes(n)){P[n]=v===''?'':+v;if(n==='fullMin'){P.fullMin=+v||60;resetPlan()}else buildPlan();return refresh(true)}
      if(n==='newName'||n==='newCat'){P[n]=v;if(n==='newName')resetPlan();return refresh(true)}
      if(n==='fullTab')ls.set('li_pub_fulltab',v);if(n==='secTab')ls.set('li_pub_sectab',v);
      P[n]=v;if(n==='date'||n==='shift')resetPlan();else buildPlan();refresh(true)};
    W.querySelectorAll('[data-si]').forEach(i=>i.onchange=()=>{LB.P.secInc[i.dataset.si]=i.checked;buildPlan();refresh(true)});
    W.querySelectorAll('[data-pon]').forEach(i=>i.onchange=()=>{const r=LB.plan.find(x=>x.id===i.dataset.pon);r.on=i.checked;if(r.kind==='full')LB.P.full=i.checked;else{LB.P.secInc[r.section]=i.checked}refresh(true)});
    W.querySelectorAll('[data-pt]').forEach(i=>i.onchange=()=>{LB.plan.find(x=>x.id===i.dataset.pt).title=i.value.trim();updateProb()});
    W.querySelectorAll('[data-pl]').forEach(i=>i.onchange=()=>{const sec=i.dataset.pl,old=labelOf(sec),v=i.value.trim()||sec;LB.P.secLabel[sec]=v;const r=LB.plan.find(x=>x.id==='sec:'+sec);if(r)r.title=r.title.split(old).join(v);refresh(true)});
    W.querySelectorAll('[data-pm]').forEach(i=>i.onchange=()=>{LB.plan.find(x=>x.id===i.dataset.pm).minutes=+i.value||0;updateProb()});
    $('#lrp').onclick=()=>{resetPlan();refresh(true)};
    $('#lfree').onchange=ev=>LB.P.free=ev.target.checked;$('#lcmp').onchange=ev=>LB.P.compress=ev.target.checked;
    /* per-question: edit / leave out / undo  (the workspace is redrawn often, the delegated listeners are attached once) */
    if(!W._bound){W._bound=true;
    W.addEventListener('click',ev=>{const card=ev.target.closest('.lq');if(!card)return;const uid=card.dataset.u,x=LB.test.questions.find(z=>z.uid===uid);
      if(ev.target.closest('[data-e]')){LB.editing=uid;redrawQ(x)}
      else if(ev.target.closest('[data-c]')){LB.editing=null;redrawQ(x)}
      else if(ev.target.closest('[data-r]')){delete LB.ed[uid];LB.editing=null;redrawQ(x);buildPlan();refresh(true)}});
    W.addEventListener('change',ev=>{const cb=ev.target.closest('[data-x]');if(!cb)return;const card=cb.closest('.lq'),uid=card.dataset.u;(LB.ed[uid]=LB.ed[uid]||{}).exclude=cb.checked;buildPlan();refresh(true)});
    W.addEventListener('submit',ev=>{const f=ev.target.closest('.lqf');if(!f)return;ev.preventDefault();const uid=f.closest('.lq').dataset.u,x=LB.test.questions.find(z=>z.uid===uid),v=fd(f),d=LB.ed[uid]=LB.ed[uid]||{};
      d.stem=v.stem;d.options=[v.o0,v.o1,v.o2,v.o3].map(s=>(s||'').trim());d.answer=v.ans===''?null:+v.ans;d.solution=(v.sol||'').trim();d.marks=v.marks===''?null:+v.marks;
      const hh={stem:(v.hstem||'').trim(),options:[v.ho0,v.ho1,v.ho2,v.ho3].map(z=>(z||'').trim()),solution:(v.hsol||'').trim()};d.hi=hiAny(hh)?hh:null;LB.editing=null;buildPlan();refresh(true)})}
    $('#lgo').onclick=()=>publish(true);$('#ldr').onclick=()=>publish(false)}
  const redrawQ=x=>{const old=document.querySelector(`.lq[data-u="${CSS.escape(x.uid)}"]`);if(!old)return;const n=document.createElement('div');n.innerHTML=qCard(x);old.replaceWith(n.firstElementChild);hydrate($('#lws'))};
  const updateProb=()=>{const prob=problems();$('#lgo').disabled=$('#ldr').disabled=!!prob.length;$('#lprob').innerHTML=prob.length?`<div class="warnb" role="alert"><b>Fix before publishing:</b><ul>${prob.slice(0,12).map(p=>`<li>${e(p)}</li>`).join('')}</ul></div>`:'<p class="sum" style="color:#2e9e5b">✓ Everything looks ready.</p>'};

  /* ======================= publishing ======================= */
  const ext2=m=>({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[m]||'png');
  async function shrink(blob){try{const bm=await createImageBitmap(blob),s=Math.min(1,1100/bm.width),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bm.width*s));c.height=Math.max(1,Math.round(bm.height*s));
      const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(bm,0,0,c.width,c.height);bm.close?.();
      const out=await new Promise(r=>c.toBlob(r,'image/webp',.9));if(out&&out.size<blob.size)return out}catch{}return blob}
  const progress=(msg,pct,cls='')=>{const b=$('#lpg');if(!b)return;b.hidden=false;b.className='upst '+cls;b.innerHTML=msg+(pct==null?'':`<div class="lbar"><i style="width:${Math.round(pct)}%"></i></div>`)};

  /* what a question needs from the bridge (picture URLs) and what text it carries */
  const qParts=x=>{const v=qv(x),wholeUsed=x.render?.mode==='whole'&&!LB.ed[x.uid]?.stem;
    const imgs=[];if(x.render&&(wholeUsed||x.render.mode==='diagram'))imgs.push(x.render.url);x.figures.filter(f=>f.exists&&!f.option).forEach(f=>imgs.push(f.url));
    const opt=[null,null,null,null];x.figures.filter(f=>f.exists&&f.option).forEach(f=>{opt['abcd'.indexOf(f.option)]=f.url});
    const pimg=(x.passage?.figures||[])[0]||null;
    const hi=hiAny(v.hi)?v.hi:null;
    return{v,wholeUsed,imgs,opt,pimg,hi,text:wholeUsed?'':v.stem.trim()}};

  async function publish(live){
    if(LB.busy)return;const prob=problems();if(prob.length)return toast('Fix the problems listed first',1);
    const P=LB.P,t=LB.test,plan=LB.plan.filter(r=>r.on),X0=LB.libX,code=X0?.code||'X';
    const warn=[];t.questions.filter(x=>!qv(x).exclude).forEach(x=>{if(qWarn(x).length)warn.push(`Q${x.pos}`)});
    const nq=plan.reduce((n,r)=>n+r.n,0);
    if(!await askAdmin(`${live?'Publish':'Save as draft'}: ${plan.length} test${plan.length>1?'s':''}?`,`${plan.map(r=>`• ${r.title} (${r.n} Q, ${r.minutes} min)`).join('\n')}\n\n${live?'They go live on the website right away.':'They stay hidden until you tick Live in Tests Hub.'}${warn.length?`\n\nNote: ${warn.length} question${warn.length>1?'s have':' has'} a warning (${warn.slice(0,6).join(', ')}${warn.length>6?'…':''}).`:''}`,live?'Publish':'Save draft'))return;
    LB.busy=true;window.onbeforeunload=()=>true;$('#lgo').disabled=$('#ldr').disabled=true;
    const made=[],uploaded=[],retired=[];let examId=P.examId,newExam=null;
    try{
      /* 1. the website exam (and its tabs) */
      progress('Preparing the exam…',2);
      if(examId==='__new'){const[r]=await q(sb.from('exams').insert({category_id:P.newCat,name:P.newName.trim(),icon:'🎯',is_published:true,sort_order:AD.exams.length,...(code!=='X'?{code}:{})}).select('id'));examId=r.id;newExam=r.id}
      const tabs=await q(sb.from('exam_tabs').select('id,key').eq('exam_id',examId)),tabId=k=>tabs.find(z=>z.key===k)?.id||null;
      const exRow=(await q(sb.from('exams').select('category_id').eq('id',examId).limit(1)))[0];
      /* 2. tests published earlier from this library test: take them off the site for now (restored if anything fails) */
      const keys=plan.map(r=>srcKey(code,t.key,r.kind==='sec'?r.section:null));
      const same=await q(sb.from('assessments').select('id,source_key,is_published,title').eq('exam_id',examId).in('source_key',keys));
      if(same.length){if(!await askAdmin('Replace the tests already published?',`${same.length} of these tests are already on the website:\n${same.map(s=>'• '+s.title).join('\n')}\n\nThey are replaced by the new version. Students' saved results from the old version are removed with them.`,'Replace','Cancel',true)){throw new Error('__cancel')}
        const oldUrls=await filesUnder({assess:same.map(s=>s.id)});
        for(const s of same){await q(sb.from('assessments').update({source_key:'old:'+s.id,is_published:false}).eq('id',s.id));retired.push({...s,urls:oldUrls})}}
      /* 3. pictures: each one uploaded once, even if a full test and a sectional test both use it */
      const urlMap=new Map();const qsAll=t.questions.filter(x=>!qv(x).exclude).map(x=>({x,p:qParts(x)}));
      qsAll.forEach(({p})=>{[...p.imgs,...p.opt.filter(Boolean),p.pimg].filter(Boolean).forEach(u=>urlMap.set(u,null))});
      const list=[...urlMap.keys()];let done=0;const dir=`tests/${slug(code)}/${slug(t.key)}`;
      await pool(list,4,async(u,i)=>{let tries=0;for(;;){try{const{blob}=await bImg(u);const small=P.compress?await shrink(blob):blob,ty=small.type||blob.type,name=`${dir}/${String(i+1).padStart(3,'0')}-${Math.random().toString(36).slice(2,7)}.${ext2(ty)}`;
            const{error}=await sb.storage.from(BK).upload(name,small,{contentType:ty,cacheControl:'31536000',upsert:false});if(error)throw error;uploaded.push(name);urlMap.set(u,pubUrl(name));break}
          catch(err){if(++tries>2)throw new Error('Could not upload a picture: '+(err.message||err));await new Promise(r=>setTimeout(r,600*tries))}}
        done++;progress(`Uploading pictures… ${done} of ${list.length}`,5+done/Math.max(1,list.length)*70)});
      /* 4. the tests, their sections, questions and answer keys */
      let made_n=0;
      for(const r of plan){
        progress(`Creating “${e(r.title)}”…`,78+made_n/plan.length*20);
        const isFull=r.kind==='full',qs=qsAll.filter(({x})=>isFull||x.section===r.section),secList=isFull?t.sections.filter(s=>qs.some(({x})=>x.section===s.name)):[];
        const sectional=isFull&&P.timer==='sectional_timer',secMin=s=>{const row=LB.plan.find(z=>z.id==='sec:'+s.name);return row?.minutes||Math.max(1,Math.round(r.minutes*qs.filter(({x})=>x.section===s.name).length/Math.max(1,qs.length)))};
        const total=sectional?secList.reduce((n,s)=>n+secMin(s),0):+r.minutes;
        const row={category_id:exRow.category_id,exam_id:examId,tab_id:tabId(isFull?P.fullTab:P.secTab),kind:'test',title:r.title.trim(),mode:sectional?'sectional_timer':isFull?'single_timer':'mixed',duration_minutes:total,
          pass_percent:null,negative_marking:+P.neg||0,is_published:live,is_free:P.free,section_name:isFull?null:labelOf(r.section),exam_date:P.date||null,shift:P.shift||null,languages:P.langs||null,syllabus:P.syllabus||null,
          source_key:srcKey(code,t.key,isFull?null:r.section),sort_order:(+t.num||0)*100+(isFull?0:t.sections.findIndex(s=>s.name===r.section)+1),shuffle_questions:false};
        const[a]=await q(sb.from('assessments').insert(row).select('id'));made.push(a.id);
        const secId={};if(isFull&&secList.length){const ins=await q(sb.from('sections').insert(secList.map((s,i)=>({assessment_id:a.id,title:labelOf(s.name),duration_minutes:sectional?secMin(s):null,sort_order:i}))).select('id,sort_order'));ins.forEach(z=>secId[secList[z.sort_order].name]=z.id)}
        const ordered=isFull?[...qs].sort((m,n)=>secList.findIndex(s=>s.name===m.x.section)-secList.findIndex(s=>s.name===n.x.section)||m.x.pos-n.x.pos):[...qs].sort((m,n)=>m.x.pos-n.x.pos);
        for(const part of chunk(ordered.map((o,i)=>({...o,i})),60)){
          const rows=part.map(({x,p,i})=>{const pub=u=>u?urlMap.get(u):null,im=p.imgs.map(pub).filter(Boolean),oi=p.opt.map(pub),opts=[0,1,2,3].map(k=>p.v.options[k]||'');
            return{assessment_id:a.id,section_id:isFull?(secId[x.section]||null):null,question:p.text,options:opts,marks:p.v.marks??(+P.marks||1),sort_order:i,
              image_url:im[0]||null,images:im.slice(1),option_images:oi.some(Boolean)?oi:null,passage:x.passage?.text||null,passage_image_url:pub(p.pimg),qbank_uid:x.uid,
              question_hi:(p.hi?.stem&&!p.wholeUsed)?p.hi.stem:null,options_hi:p.hi?.options?.some(Boolean)?[0,1,2,3].map(k=>p.hi.options[k]||''):null,passage_hi:x.passage?.text_hi||null}});
          const ins=await q(sb.from('questions').insert(rows).select('id,sort_order'));const byOrd=Object.fromEntries(ins.map(z=>[z.sort_order,z.id]));
          await q(sb.from('question_keys').insert(part.map(({x,p},k)=>({question_id:byOrd[rows[k].sort_order],correct_index:p.v.answer,explanation:(p.v.solution||'').trim()||null,explanation_hi:(p.hi?.solution||'').trim()||null}))))}
        made_n++}
      /* 5. all good: the old versions can go */
      for(const s of retired){await q(sb.from('assessments').delete().eq('id',s.id))}
      if(retired.length)await dropFiles(retired[0].urls);
      window.onbeforeunload=null;LB.busy=false;await loadTree();await loadPub();
      toast(live?`✅ ${plan.length} test${plan.length>1?'s':''} published`:`✅ ${plan.length} draft${plan.length>1?'s':''} saved`);
      LB.done={examId,live,n:plan.length,q:nq};$('#lws').innerHTML=`<div class="panel lok"><h3>${live?'Published':'Saved as drafts'} ✅</h3><p class="sum"><b>${plan.length}</b> test${plan.length>1?'s are':' is'} ${live?'live':'saved (hidden)'} in <b>${e(AD.exams.find(x=>x.id===examId)?.name||'the exam')}</b>.</p>
        <div class="acts"><a class="btn acc" href="#/x/${examId}" target="_blank" rel="noopener">Open the student page ↗</a><button class="btn ghost" id="lmh">Manage in Tests Hub</button><button class="btn ghost" id="lnx">Publish another test</button></div></div>`;
      $('#lmh').onclick=()=>{hubEx=examId;tab='hub';admin()};$('#lnx').onclick=()=>{LB.test=null;LB.plan=[];draw()};scrollTo(0,0)
    }catch(err){
      /* undo everything made so far */
      window.onbeforeunload=null;LB.busy=false;let undo='';
      try{if(made.length)for(const part of chunk(made,40))await sb.from('assessments').delete().in('id',part);
        for(const s of retired)await sb.from('assessments').update({source_key:s.source_key,is_published:s.is_published}).eq('id',s.id);
        if(newExam)await sb.from('exams').delete().eq('id',newExam);
        if(uploaded.length)for(const part of chunk(uploaded,100))await sb.storage.from(BK).remove(part)}catch(u){undo=' (some clean-up failed: '+(u.message||u)+' — use “Clean unused files” to tidy up)'}
      if(err.message==='__cancel'){progress('Cancelled. Nothing was changed.','');$('#lgo').disabled=$('#ldr').disabled=false;return}
      progress(`❌ Publishing failed: ${e(err.message||String(err))}. Everything that was started has been undone${undo}. You can press Publish again.`,null,'bad');$('#lgo').disabled=$('#ldr').disabled=false}}

  /* in-page confirm (the page may be in full screen etc.; also testable) */
  function askAdmin(title,msg,ok='OK',cancel='Cancel',danger){return new Promise(res=>{const d=document.createElement('div');d.className='dlg';
    d.innerHTML=`<div class="dbox" role="dialog" aria-modal="true" aria-label="${e(title)}" style="max-width:520px"><h3>${e(title)}</h3><p style="white-space:pre-line;max-height:50vh;overflow:auto">${e(msg)}</p><div class="acts"><button class="btn ghost" data-r="0">${e(cancel)}</button><button class="btn ${danger?'red':'acc'}" data-r="1">${e(ok)}</button></div></div>`;
    const done=v=>{d.remove();res(v)};d.onclick=ev=>{const b=ev.target.closest('[data-r]');if(b)done(b.dataset.r==='1');else if(ev.target===d)done(false)};document.body.appendChild(d);d.querySelector('[data-r="1"]').focus()})}

  /* start: try the saved token silently */
  if(LB.tok&&!LB.ok){const er=await connect();if(!er)await loadPub();return draw(er)}
  if(LB.ok)await loadPub();
  draw()}
