/* Tests hub manager (admin) — loaded with the admin panel.
   Everything the student sees on an exam's test page is controlled here:
   the header look and defaults, which tabs exist and are live (✓), which sections have how many tests, and every test. */
let hubEx='',hubTabF='all',hubPg=0;const HSEL=new Set(),HPER=40;
const THEMES=[['indigo','Indigo'],['purple','Purple'],['teal','Teal'],['rose','Rose'],['amber','Amber'],['slate','Slate']];
const HT_COLS='id,title,tab_id,section_name,is_free,is_published,question_count,total_marks,duration_minutes,mode,sort_order,exam_date,shift,source_key,created_at';
const hubNum=n=>+(+n||0).toFixed(2);
const num=v=>v===''||v==null||isNaN(+v)?null:+v;

async function aHub(){
  const tc=cats.filter(c=>c.kind==='tests');
  if(!tc.length){$('#ad').innerHTML='<div class="panel"><h3>Tests Hub</h3><p class="sum">Create a category of type <b>tests</b> first (Categories tab). Exams inside it get the tabbed test page.</p></div>';return}
  let T={tabs:[],tests:[],presets:[]};
  const exs=()=>AD.exams.filter(x=>tc.some(c=>c.id===x.category_id));
  const load=async()=>{
    await loadTree();if(!exs().some(x=>x.id===hubEx))hubEx=exs()[0]?.id||'';
    const presets=await q(sb.from('exam_presets').select('*').order('code'));
    if(!hubEx){T={tabs:[],tests:[],presets};return}
    const[tabs,tests]=await Promise.all([q(sb.from('exam_tabs').select('*').eq('exam_id',hubEx).order('sort_order')),q(sb.from('assessments').select(HT_COLS).eq('exam_id',hubEx).order('sort_order').order('created_at',{ascending:false}).limit(2000))]);
    T={tabs,tests,presets}};
  const tabName=id=>T.tabs.find(t=>t.id===id)?.label||'Other tests';
  const inTab=a=>hubTabF==='all'||(hubTabF==='_none'?!a.tab_id:a.tab_id===hubTabF);

  const paint=()=>{
    const X=AD.exams.find(x=>x.id===hubEx),list=T.tests,live=list.filter(a=>a.is_published).length;
    const filtered=list.filter(inTab),pages=Math.max(1,Math.ceil(filtered.length/HPER));if(hubPg>=pages)hubPg=pages-1;
    const rows=filtered.slice(hubPg*HPER,hubPg*HPER+HPER);
    /* sections: how many tests each has, and are they live */
    const secs={};filtered.forEach(a=>{const k=a.section_name||'';if(!k)return;(secs[k]=secs[k]||{n:0,live:0}).n++;if(a.is_published)secs[k].live++});
    $('#ad').innerHTML=`<div class="panel"><label>Exam<select id="hx">${tc.map(c=>`<optgroup label="${e(c.icon)} ${e(c.name)}">${exs().filter(x=>x.category_id===c.id).map(x=>`<option value="${x.id}" ${x.id===hubEx?'selected':''}>${e(x.icon)} ${e(x.name)}${x.is_published?'':' (hidden)'}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <p class="sum" style="margin:8px 0 0">${X?`<b>${list.length}</b> tests · <b>${live}</b> live · <a href="#/x/${X.id}" target="_blank" rel="noopener">open the student page ↗</a>`:'Add an exam in the Exams &amp; Folders tab first.'}</p></div>
    ${X?`<form class="panel f" id="hxf"><h3 class="full">Exam page &amp; defaults</h3>${fl('name','Exam name',X.name,'text','required')}${fl('icon','Icon (emoji)',X.icon||'🎯')}${fl('code','Short code (CGL, NTPC …)',X.code||'')}${sel('theme','Banner colour',THEMES,X.theme||'indigo')}
      <label class="full">Tagline under the name (optional)<input name="tagline" value="${e(X.tagline)}" placeholder="e.g. 265 tests · English, Hindi"></label>${fl('languages','Languages shown on test cards',X.languages||'')}
      ${fl('default_full_minutes','Default time — full test (min)',X.default_full_minutes??'','number','min=1')}${fl('default_sectional_minutes','Default time — sectional (min; blank = by share of questions)',X.default_sectional_minutes??'','number','min=1')}
      ${fl('default_marks','Default marks per question',X.default_marks??'','number','step=0.25 min=0')}${fl('default_negative','Default negative marks per wrong answer',X.default_negative??'','number','step=0.0001 min=0')}
      <div class="full"><button class="btn acc sm">Save exam settings</button> <button type="button" class="btn ghost sm" id="hpre">Fill from exam preset</button> <small id="hprn" style="color:var(--mute)"></small></div></form>
    <div class="panel"><h3>Tabs on the student page</h3><p class="sum">The ✓ decides whether a tab is live. A live tab only appears once it has at least one live test.</p>
      <div class="tw"><table><tr><th>Tab name<th>Tests<th>Live tests<th>Live tab<th></tr>${T.tabs.map((t,i)=>{const n=list.filter(a=>a.tab_id===t.id),l=n.filter(a=>a.is_published).length;
        return `<tr><td><input data-tl="${t.id}" value="${e(t.label)}" style="min-width:150px"><td>${n.length}<td>${l}<td><input type="checkbox" data-tv="${t.id}" ${t.is_visible?'checked':''} style="width:auto" aria-label="Tab live"><td class="nw"><button class="btn ghost sm" data-tu="${t.id}" ${i?'':'disabled'} aria-label="Move up">↑</button> <button class="btn ghost sm" data-td="${t.id}" ${i<T.tabs.length-1?'':'disabled'} aria-label="Move down">↓</button> <button class="btn red sm" data-tx="${t.id}">Delete</button></tr>`}).join('')}
        ${list.some(a=>!a.tab_id)?`<tr><td><i>Other tests</i> <small>(no tab)</small><td>${list.filter(a=>!a.tab_id).length}<td>${list.filter(a=>!a.tab_id&&a.is_published).length}<td colspan="2"><small>Move them into a tab below</small></tr>`:''}</table></div>
      <form class="f" id="htf" style="margin-top:10px">${fl('label','New tab (e.g. PYQ Sectional, Mock Series)','','text','required')}<div style="align-self:end"><button class="btn acc sm">Add tab</button></div></form></div>
    <div class="panel"><h3>Sections ${hubTabF==='all'?'(all tabs)':'in “'+e(hubTabF==='_none'?'Other tests':tabName(hubTabF))+'”'}</h3>${Object.keys(secs).length?`<p class="sum">Tick or untick a section to make all its tests live or hidden at once.</p><div class="tw"><table><tr><th>Section<th>Tests<th>Live<th>Live ✓</tr>${Object.entries(secs).map(([k,v])=>`<tr><td>${e(k)}<td>${v.n}<td>${v.live}<td><input type="checkbox" data-sv="${e(k)}" ${v.live===v.n?'checked':''} data-part="${v.live&&v.live<v.n?1:0}" style="width:auto" aria-label="${e(k)} live"></tr>`).join('')}</table></div>`:'<p class="sum">No sectional tests here yet. Sections appear when you publish sectional tests from the Library import tab.</p>'}</div>
    <div class="panel"><div class="ah"><h3>Tests</h3><div class="acts" style="margin:0"><select id="hf" style="width:auto"><option value="all">All tabs (${list.length})</option>${T.tabs.map(t=>`<option value="${t.id}" ${hubTabF===t.id?'selected':''}>${e(t.label)} (${list.filter(a=>a.tab_id===t.id).length})</option>`).join('')}${list.some(a=>!a.tab_id)?`<option value="_none" ${hubTabF==='_none'?'selected':''}>Other tests</option>`:''}</select></div></div>
      <div class="acts hbulk"><span class="sum" style="margin:0"><b id="hsn">${HSEL.size}</b> selected</span><button class="btn ghost sm" data-b="live">Make live</button><button class="btn ghost sm" data-b="hide">Hide</button><select id="hmv" style="width:auto"><option value="">Move to tab…</option>${T.tabs.map(t=>`<option value="${t.id}">${e(t.label)}</option>`).join('')}<option value="_none">Other tests (no tab)</option></select><button class="btn red sm" data-b="del">Delete</button></div>
      <div class="tw"><table><tr><th><input type="checkbox" id="hall" style="width:auto" aria-label="Select all on this page"><th>Test<th>Tab<th>Section<th>Qs<th>Marks<th>Min<th>Free<th>Live ✓<th></tr>${rows.map(a=>`<tr><td><input type="checkbox" data-s="${a.id}" ${HSEL.has(a.id)?'checked':''} style="width:auto"><td style="min-width:220px">${e(a.title)}${a.exam_date?`<br><small>${e(fmtDate(a.exam_date))}${a.shift?' · Shift '+e(a.shift):''}</small>`:''}<td><small>${e(tabName(a.tab_id))}</small><td><small>${e(a.section_name||'—')}</small><td>${a.question_count}<td>${hubNum(a.total_marks)}<td><input type="number" data-m="${a.id}" value="${a.duration_minutes??''}" min="1" style="width:70px" aria-label="Minutes"><td><input type="checkbox" data-f="${a.id}" ${a.is_free?'checked':''} style="width:auto"><td><input type="checkbox" data-l="${a.id}" ${a.is_published?'checked':''} style="width:auto"><td class="nw"><button class="btn ghost sm" data-q="${a.id}">Questions</button> <a class="btn ghost sm" href="#/exam/${a.id}" target="_blank" rel="noopener">Preview</a> <button class="btn red sm" data-x="${a.id}">Delete</button></tr>`).join('')||'<tr><td colspan="10"><div class="empty">No tests here yet. Use the Library import tab to publish tests from your question library.</div></tr>'}</table></div>
      ${pages>1?`<div class="acts"><button class="btn ghost sm" id="hpv" ${hubPg?'':'disabled'}>← Prev</button><span class="sum" style="margin:0;align-self:center">Page ${hubPg+1} of ${pages}</span><button class="btn ghost sm" id="hnx" ${hubPg<pages-1?'':'disabled'}>Next →</button></div>`:''}<div id="hqbox"></div></div>`:''}
    <details class="panel"><summary><b>Exam presets</b> — default time, marks and negative marking by exam name</summary><p class="sum">A new exam picks the preset whose keyword is in its name. Rows marked “check” are from memory: verify them against the official notice.</p>
      <div class="tw"><table><tr><th>Code<th>Name<th>Keywords (comma)<th>Full min<th>Sect. min<th>Marks/Q<th>Negative<th>Checked<th></tr>${T.presets.map(p=>`<tr data-pr="${p.id}"><td><input value="${e(p.code)}" data-k="code" style="width:78px"><td><input value="${e(p.label)}" data-k="label" style="width:120px"><td><input value="${e(p.match_words.join(', '))}" data-k="match_words" style="width:130px"><td><input type="number" value="${p.full_minutes}" data-k="full_minutes" style="width:64px"><td><input type="number" value="${p.sectional_minutes??''}" data-k="sectional_minutes" style="width:64px" placeholder="auto"><td><input type="number" step="0.25" value="${p.marks_per_question}" data-k="marks_per_question" style="width:64px"><td><input type="number" step="0.0001" value="${p.negative_marking}" data-k="negative_marking" style="width:76px"><td><input type="checkbox" data-k="verified" ${p.verified?'checked':''} style="width:auto" title="${e(p.note||'')}"><td class="nw"><button class="btn ghost sm" data-ps="${p.id}">Save</button> <button class="btn red sm" data-pd="${p.id}">Delete</button></tr>`).join('')}</table></div>
      <form class="f" id="hpf" style="margin-top:10px">${fl('code','New code (e.g. MTS)','','text','required')}${fl('label','Name','','text','required')}${fl('match_words','Keywords (comma separated)','','text','required')}${fl('full_minutes','Full test minutes','60','number','required min=1')}${fl('marks_per_question','Marks per question','1','number','step=0.25')}${fl('negative_marking','Negative marks','0.25','number','step=0.0001')}<div style="align-self:end"><button class="btn acc sm">Add preset</button></div></form></details>`;
    bind()};

  const rerun=async(m)=>{if(m)toast(m);await load();paint()};
  const upd=(t,id,v)=>q(sb.from(t).update(v).eq('id',id));
  const bind=()=>{
    const B=(s,f)=>document.querySelectorAll(s).forEach(f);
    $('#hx').onchange=ev=>{hubEx=ev.target.value;hubTabF='all';hubPg=0;HSEL.clear();rerun()};
    if(!hubEx)return;
    const X=AD.exams.find(x=>x.id===hubEx);
    $('#hxf').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target);
      const row={name:v.name.trim(),icon:v.icon||'🎯',code:(v.code||'').trim().toUpperCase()||null,theme:v.theme,tagline:v.tagline||null,languages:v.languages||null,default_full_minutes:num(v.default_full_minutes),default_sectional_minutes:num(v.default_sectional_minutes),default_marks:num(v.default_marks),default_negative:num(v.default_negative)};
      await q(sb.from('exams').update(row).eq('id',X.id));rerun('Exam settings saved')};
    $('#hpre').onclick=async()=>{const r=await q(sb.rpc('exam_preset_for',{p_name:$('#hxf [name=name]').value}));const p=r?.[0];
      if(!p){$('#hprn').textContent='No preset matches this exam name. Add one in “Exam presets” below.';return}
      const set=(n,v)=>{$('#hxf [name='+n+']').value=v??''};set('code',p.code);set('default_full_minutes',p.full_minutes);set('default_sectional_minutes',p.sectional_minutes);set('default_marks',p.marks_per_question);set('default_negative',p.negative_marking);
      $('#hprn').textContent=`Filled from preset “${p.label}”${p.verified?'':' (not yet checked against the official notice)'} — press Save.`};
    /* tabs */
    B('[data-tl]',i=>i.onchange=async()=>{const v=i.value.trim();if(!v){i.value=T.tabs.find(t=>t.id===i.dataset.tl).label;return}await upd('exam_tabs',i.dataset.tl,{label:v});toast('Tab renamed');await load();paint()});
    B('[data-tv]',i=>i.onchange=async()=>{await upd('exam_tabs',i.dataset.tv,{is_visible:i.checked});await load();paint()});
    const mv=async(id,d)=>{const t=T.tabs,i=t.findIndex(x=>x.id===id),o=t[i+d];if(!o)return;[t[i],t[i+d]]=[o,t[i]];await Promise.all(t.map((x,n)=>x.sort_order===n+1?null:upd('exam_tabs',x.id,{sort_order:n+1})).filter(Boolean));await load();paint()};
    B('[data-tu]',b=>b.onclick=()=>mv(b.dataset.tu,-1));B('[data-td]',b=>b.onclick=()=>mv(b.dataset.td,1));
    B('[data-tx]',b=>b.onclick=async()=>{const t=T.tabs.find(x=>x.id===b.dataset.tx),n=T.tests.filter(a=>a.tab_id===t.id).length;
      if(!confirm(`Delete the tab “${t.label}”?${n?`\n\nIts ${n} test${n>1?'s':''} stay${n>1?'':'s'} on the site under “Other tests”.`:''}`))return;
      await q(sb.from('exam_tabs').delete().eq('id',t.id));if(hubTabF===t.id)hubTabF='all';rerun('Tab deleted')});
    $('#htf').onsubmit=async ev=>{ev.preventDefault();const label=fd(ev.target).label.trim();let key=slug(label)||'tab',k=key,n=2;while(T.tabs.some(t=>t.key===k))k=key+'-'+n++;
      await q(sb.from('exam_tabs').insert({exam_id:hubEx,key:k,label,sort_order:T.tabs.length+1}));rerun('Tab added')};
    /* sections: one tick for all tests of that section */
    B('[data-sv]',i=>{i.indeterminate=i.dataset.part==='1';i.onchange=async()=>{const ids=T.tests.filter(a=>inTab(a)&&(a.section_name||'')===i.dataset.sv).map(a=>a.id);
      for(const part of chunk(ids,80))await q(sb.from('assessments').update({is_published:i.checked}).in('id',part));rerun(`${ids.length} test${ids.length>1?'s':''} ${i.checked?'live':'hidden'}`)}});
    /* tests table */
    $('#hf').onchange=ev=>{hubTabF=ev.target.value;hubPg=0;HSEL.clear();paint()};
    $('#hpv')&&($('#hpv').onclick=()=>{hubPg--;paint()});$('#hnx')&&($('#hnx').onclick=()=>{hubPg++;paint()});
    const upT=(id,v)=>{const a=T.tests.find(z=>z.id===id);Object.assign(a,v)};
    B('[data-l]',i=>i.onchange=async()=>{await upd('assessments',i.dataset.l,{is_published:i.checked});upT(i.dataset.l,{is_published:i.checked});paint()});
    B('[data-f]',i=>i.onchange=async()=>{await upd('assessments',i.dataset.f,{is_free:i.checked});upT(i.dataset.f,{is_free:i.checked})});
    B('[data-m]',i=>i.onchange=async()=>{const m=num(i.value);await upd('assessments',i.dataset.m,{duration_minutes:m});upT(i.dataset.m,{duration_minutes:m});toast('Time saved')});
    const sync=()=>{$('#hsn').textContent=HSEL.size};
    B('[data-s]',i=>i.onchange=()=>{i.checked?HSEL.add(i.dataset.s):HSEL.delete(i.dataset.s);sync()});
    $('#hall').onchange=ev=>{rows().forEach(a=>ev.target.checked?HSEL.add(a.id):HSEL.delete(a.id));B('[data-s]',i=>i.checked=ev.target.checked);sync()};
    const rows=()=>T.tests.filter(inTab).slice(hubPg*HPER,hubPg*HPER+HPER);
    B('[data-b]',b=>b.onclick=async()=>{const ids=[...HSEL];if(!ids.length)return toast('Tick some tests first',1);
      if(b.dataset.b==='del'){const n=ids.length;if(!confirm(`Delete ${n} test${n>1?'s':''} with all questions and images?\n\nThis cannot be undone.`))return;
        const urls=await filesUnder({assess:ids});for(const part of chunk(ids,40))await q(sb.from('assessments').delete().in('id',part));await dropFiles(urls);HSEL.clear();return rerun(`${n} test${n>1?'s':''} deleted`)}
      for(const part of chunk(ids,80))await q(sb.from('assessments').update({is_published:b.dataset.b==='live'}).in('id',part));rerun(`${ids.length} test${ids.length>1?'s':''} ${b.dataset.b==='live'?'live':'hidden'}`)});
    $('#hmv').onchange=async ev=>{const v=ev.target.value,ids=[...HSEL];if(!v)return;if(!ids.length){ev.target.value='';return toast('Tick some tests first',1)}
      for(const part of chunk(ids,80))await q(sb.from('assessments').update({tab_id:v==='_none'?null:v}).in('id',part));HSEL.clear();rerun(`${ids.length} test${ids.length>1?'s':''} moved`)};
    B('[data-x]',b=>b.onclick=async()=>{const a=T.tests.find(z=>z.id===b.dataset.x);if(!confirm(`Delete “${a.title}” with all its questions and images?`))return;
      const urls=await filesUnder({assess:[a.id]});await q(sb.from('assessments').delete().eq('id',a.id));await dropFiles(urls);HSEL.delete(a.id);rerun('Test deleted')});
    B('[data-q]',b=>b.onclick=async()=>{const box=$('#hqbox'),a=T.tests.find(z=>z.id===b.dataset.q);if(box.dataset.a===a.id){box.innerHTML='';box.dataset.a='';rerun();return}
      box.dataset.a=a.id;box.innerHTML=`<hr class="hr"><h4>${e(a.title)}</h4><div id="m${a.id}"></div><div class="acts"><button class="btn ghost sm" id="hqc">Close questions</button></div>`;
      const re=()=>manage(a,re);await re();$('#hqc').onclick=()=>{box.innerHTML='';box.dataset.a='';rerun()};box.scrollIntoView({behavior:'smooth'})});
    /* presets */
    B('[data-ps]',b=>b.onclick=async()=>{const tr=b.closest('tr'),v={};tr.querySelectorAll('[data-k]').forEach(i=>{const k=i.dataset.k;v[k]=i.type==='checkbox'?i.checked:i.value});
      Object.assign(v,{code:v.code.trim().toUpperCase(),match_words:v.match_words.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),full_minutes:+v.full_minutes||60,sectional_minutes:num(v.sectional_minutes),marks_per_question:num(v.marks_per_question)??1,negative_marking:num(v.negative_marking)??0});
      if(!v.match_words.length)return toast('Add at least one keyword',1);await q(sb.from('exam_presets').update(v).eq('id',b.dataset.ps));rerun('Preset saved')});
    B('[data-pd]',b=>b.onclick=async()=>{if(!confirm('Delete this preset? Exams already created keep their own values.'))return;await q(sb.from('exam_presets').delete().eq('id',b.dataset.pd));rerun('Preset deleted')});
    $('#hpf').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target);
      await q(sb.from('exam_presets').insert({code:v.code.trim().toUpperCase(),label:v.label.trim(),match_words:v.match_words.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),full_minutes:+v.full_minutes||60,marks_per_question:num(v.marks_per_question)??1,negative_marking:num(v.negative_marking)??0}));rerun('Preset added')};
  };
  await load();paint()}
