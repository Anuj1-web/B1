/* ---------- ADMIN ---------- */
/* Storage hygiene: when a file / image is replaced, or the thing that owns it is deleted, the old file is also removed from the
   'content' bucket. A file is only removed when no other row still points at it, and only if it lives in our own bucket. */
const BK='content',PEND=new Set();
const pubUrl=p=>sb.storage.from(BK).getPublicUrl(p).data.publicUrl;
const pathOf=u=>{if(!u)return null;const b=pubUrl('x').slice(0,-1);if(!String(u).startsWith(b))return null;try{return decodeURIComponent(String(u).slice(b.length).split('?')[0])}catch{return null}};
const REFS=[['items','url'],['items','thumbnail_url'],['exams','cover_url'],['questions','image_url']];
async function refCount(u){const r=await Promise.all(REFS.map(([t,c])=>sb.from(t).select('id',{count:'exact',head:true}).eq(c,u)));return r.some(x=>x.error)?1:r.reduce((n,x)=>n+(x.count||0),0)}
async function dropFiles(urls){
  const ps=[...new Set(urls.map(pathOf).filter(Boolean))],gone=[];
  for(const p of ps)if(!await refCount(pubUrl(p)))gone.push(p);
  if(!gone.length)return;
  const{error}=await sb.storage.from(BK).remove(gone);
  if(error)setTimeout(()=>toast('Saved, but an old file could not be removed from storage: '+error.message,1),350);
  else setTimeout(()=>toast(`🗑 ${gone.length} old file${gone.length>1?'s':''} removed from storage`),350)}
/* upload into the form field; a previous upload that was never saved is removed straight away */
async function upFile(f,prefix,field){
  toast('Uploading…');const p=`${prefix}${Date.now()}-${f.name.replace(/[^\w.-]/g,'_')}`;
  const{error}=await sb.storage.from(BK).upload(p,f,{contentType:mimeOf(f),cacheControl:'31536000'});if(error){toast(error.message,1);return false}
  const old=field.value;field.value=pubUrl(p);
  if(PEND.has(old)){PEND.delete(old);dropFiles([old])}
  PEND.add(field.value);return true}

/* ---------- video / media helpers ---------- */
const MIME={mp4:'video/mp4',m4v:'video/mp4',mov:'video/mp4',webm:'video/webm',ogv:'video/ogg',pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
const extOf=n=>(String(n).split('.').pop()||'').toLowerCase();
/* .mov is stored as video/mp4 so Chrome / Firefox will play it (they refuse video/quicktime) */
const mimeOf=f=>MIME[extOf(f.name)]||f.type||'application/octet-stream';
/* link -> format.  Only touches the file-like formats, never "article" / "link" */
function guessType(u,cur){u=String(u||'').trim();if(!u||!['video','youtube','pdf'].includes(cur))return cur;
  if(embedOf(u))return'youtube';const p=u.split(/[?#]/)[0].toLowerCase();
  if(p.endsWith('.pdf'))return'pdf';if(/\.(mp4|m4v|webm|ogv|mov)$/.test(p))return'video';return cur}
/* H.265 / HEVC is the usual reason a phone video shows a black picture: look for the codec tag in the file header / trailer */
async function sniffCodec(f){const N=4*1024*1024,parts=[f.slice(0,N)];if(f.size>N)parts.push(f.slice(Math.max(N,f.size-N)));
  const txt=(await Promise.all(parts.map(p=>p.arrayBuffer()))).map(b=>new TextDecoder('latin1').decode(new Uint8Array(b))).join('');return{hevc:/hvc1|hev1/.test(txt)}}
/* open the file locally: can this browser read it?  how long is it?  grab a frame for the poster */
function probeVideo(f){return new Promise(res=>{const u=URL.createObjectURL(f),v=document.createElement('video');v.muted=true;v.preload='metadata';v.playsInline=true;let done=false;
  const fin=r=>{if(done)return;done=true;clearTimeout(t);URL.revokeObjectURL(u);v.removeAttribute('src');try{v.load()}catch{}res(r)},t=setTimeout(()=>fin({ok:null}),9000);
  v.onerror=()=>fin({ok:false});
  v.onloadedmetadata=()=>{const dur=v.duration,w=v.videoWidth,h=v.videoHeight;if(!w)return fin({ok:false,dur});
    v.onseeked=()=>{try{const c=document.createElement('canvas'),s=Math.min(1,640/w);c.width=Math.round(w*s);c.height=Math.round(h*s);c.getContext('2d').drawImage(v,0,0,c.width,c.height);c.toBlob(b=>fin({ok:true,dur,poster:b}),'image/jpeg',.82)}catch{fin({ok:true,dur})}};
    v.currentTime=Math.min(1,(dur||1)/3)||.001};
  v.src=u})}
const lenLabel=s=>s>=3600?`${Math.floor(s/3600)} h ${Math.round(s%3600/60)} min`:s>=90?`${Math.round(s/60)} min`:`${Math.max(1,Math.round(s))} sec`;
/* after save: drop whatever was uploaded but not kept.  after cancel / leaving the form: drop all unsaved uploads */
const settle=async()=>{const l=[...PEND];PEND.clear();if(l.length)await dropFiles(l)};
/* every uploaded file that sits under a category / exam / folders / quizzes (collected BEFORE the rows are deleted) */
async function filesUnder({cat,exams=[],folders=[],assess=[]}){
  const out=[],add=r=>r.forEach(x=>[x.url,x.thumbnail_url,x.image_url].forEach(u=>u&&out.push(u)));
  exams.forEach(id=>{const x=AD.exams.find(z=>z.id===id);if(x?.cover_url)out.push(x.cover_url)});
  const jobs=[];
  if(cat)jobs.push(q(sb.from('items').select('url,thumbnail_url').eq('category_id',cat)).then(add));
  if(folders.length)jobs.push(q(sb.from('items').select('url,thumbnail_url').in('folder_id',folders)).then(add));
  const aids=new Set(assess),aq=[];
  if(cat)aq.push(q(sb.from('assessments').select('id').eq('category_id',cat)));
  if(folders.length)aq.push(q(sb.from('assessments').select('id').in('folder_id',folders)));
  (await Promise.all([...aq,...jobs]).then(r=>r.slice(0,aq.length))).forEach(r=>r.forEach(x=>aids.add(x.id)));
  if(aids.size)add(await q(sb.from('questions').select('image_url').in('assessment_id',[...aids])));
  return out}
const fl=(n,l,v='',t='text',x='')=>`<label>${l}<input name="${n}" type="${t}" value="${e(v)}" ${x}></label>`;
const sel=(n,l,o,v='')=>`<label>${l}<select name="${n}">${o.map(([a,b])=>`<option value="${e(a)}" ${a==v?'selected':''}>${e(b)}</option>`).join('')}</select></label>`;
async function checkAdmin(){const{data}=await sb.auth.getSession();sess=data.session;adminOK=false;
  if(sess){const{data:r}=await sb.from('admins').select('user_id').limit(1);adminOK=!!r?.length}}
async function admin(){
  await settle();await checkAdmin();
  if(!sess){app.innerHTML=`<div class="panel" style="max-width:420px;margin:50px auto"><h2>Admin sign in</h2><form id="lf" class="f" style="grid-template-columns:1fr;margin-top:14px">${fl('email','Email','','email','required')}${fl('password','Password (min 6)','','password','required minlength=6')}<button class="btn acc">Sign in</button><button type="button" class="btn ghost" id="su">Create account</button></form></div>`;
    $('#lf').onsubmit=async ev=>{ev.preventDefault();const{error}=await sb.auth.signInWithPassword(fd(ev.target));if(error)return toast(error.message,1);admin()};
    $('#su').onclick=async()=>{const f=$('#lf');if(!f.reportValidity())return;const{data,error}=await sb.auth.signUp(fd(f));if(error)return toast(error.message,1);toast(data.session?'Account created':'Check your email to confirm, then sign in');if(data.session)admin()};return}
  if(!adminOK){app.innerHTML=`<div class="panel" style="max-width:520px;margin:50px auto"><h2>No admin access yet</h2><p>You're signed in as <b>${e(sess.user.email)}</b>. If this is the first setup, claim the admin role. It works once, only while no admin exists.</p><button class="btn acc" id="cl">Claim admin</button> <button class="btn ghost" id="so">Sign out</button></div>`;
    $('#cl').onclick=async()=>{const ok=await q(sb.rpc('claim_first_admin'));toast(ok?'You are the admin':'An admin already exists',!ok);admin()};
    $('#so').onclick=async()=>{await sb.auth.signOut();admin()};return}
  app.innerHTML=`<div class="sec"><h2>Admin panel</h2><button class="btn ghost sm" id="so">Sign out</button></div><div class="tabs">${[['cats','Categories'],['ex','Exams & Folders'],['items','Content'],['as','Quizzes & Tests']].map(([k,l])=>`<button class="btn ${tab===k?'':'ghost'} sm" data-tab="${k}">${l}</button>`).join('')}</div><div id="ad"></div>`;
  $('#so').onclick=async()=>{await sb.auth.signOut();admin()};
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;admin()});
  await loadCats();await loadTree();({cats:aCats,ex:aEx,items:aItems,as:aAs})[tab]()}

async function aCats(){let ed=null;
  const draw=()=>{$('#ad').innerHTML=`<form class="panel f" id="cf"><h3 class="full">${ed?'Edit':'New'} category</h3>${fl('name','Name',ed?.name,'text','required')}${sel('kind','Type',['videos','notes','revision','articles','links','quizzes','tests'].map(x=>[x,x]),ed?.kind)}${fl('icon','Icon (emoji)',ed?.icon||'📚')}${fl('sort_order','Order',ed?.sort_order??cats.length+1,'number')}<label class="full">Description<input name="description" value="${e(ed?.description)}"></label><div class="full"><button class="btn acc">${ed?'Save changes':'Add category'}</button> ${ed?'<button type="button" class="btn ghost" id="cx">Cancel</button>':''}</div></form>
  <div class="panel tw"><p class="sum">Ticked categories appear on the home screen <b>and</b> in the header menu: <b id="lc">${cats.filter(c=>c.is_published).length}</b> of ${cats.length} are live.</p><table><tr><th>Category<th>Type<th>Order<th>Live (home + menu)<th></tr>${cats.map(c=>`<tr><td>${e(c.icon)} ${e(c.name)}<td>${c.kind}<td>${c.sort_order}<td><input type="checkbox" data-pub="${c.id}" ${c.is_published?'checked':''} style="width:auto"><td><button class="btn ghost sm" data-ed="${c.id}">Edit</button> <button class="btn red sm" data-del="${c.id}">Delete</button></tr>`).join('')}</table></div>`;
    $('#cf').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target);v.sort_order=+v.sort_order||0;
      await q(ed?sb.from('categories').update(v).eq('id',ed.id):sb.from('categories').insert({...v,slug:slug(v.name)+'-'+Math.random().toString(36).slice(2,5)}));toast('Saved');ed=null;await loadCats();draw()};
    $('#cx')?.addEventListener('click',()=>{ed=null;draw()});
    document.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>{ed=cats.find(c=>c.id===b.dataset.ed);draw();scrollTo(0,0)});
    document.querySelectorAll('[data-pub]').forEach(b=>b.onchange=async()=>{await q(sb.from('categories').update({is_published:b.checked}).eq('id',b.dataset.pub));await loadCats();$('#lc').textContent=cats.filter(c=>c.is_published).length});
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this category and everything inside it, including its uploaded files?'))return;
      const id=b.dataset.del,exs=AD.exams.filter(x=>x.category_id===id).map(x=>x.id),fs=AD.folders.filter(f=>exs.includes(f.exam_id)).map(f=>f.id),urls=await filesUnder({cat:id,exams:exs,folders:fs});
      await q(sb.from('categories').delete().eq('id',id));await dropFiles(urls);toast('Deleted');await loadCats();draw()})};draw()}

async function aItems(){let ed=null,fc='';
  const draw=async()=>{await settle();const list=await q((fc?sb.from('items').select('*').eq('category_id',fc):sb.from('items').select('*')).order('created_at',{ascending:false}).limit(200));
    $('#ad').innerHTML=`<form class="panel f" id="if"><h3 class="full">${ed?'Edit':'Add'} content</h3>${sel('category_id','Category',cats.map(c=>[c.id,c.icon+' '+c.name]),ed?.category_id||fc)}${placeHTML(ed?.category_id||fc||cats[0]?.id,ed?.folder_id)}${sel('type','Format',[['video','Video file (mp4)'],['youtube','YouTube / Vimeo / Google Drive video link'],['pdf','PDF notes / sheet'],['article','Written article'],['link','External link']],ed?.type)}${fl('title','Title',ed?.title,'text','required')}${fl('duration','Length label (e.g. 42 min, 18 pages)',ed?.duration)}${fl('sort_order','Position in folder (1 = first)',ed?.sort_order??0,'number')}${fl('tags','Tags (comma separated)',(ed?.tags||[]).join(', '))}
    <label class="full">URL (paste, or upload below)<input name="url" id="uurl" value="${e(ed?.url)}" placeholder="https://…"></label><label>Upload file (video / PDF)<input type="file" id="upf" accept="video/*,application/pdf"></label>${fl('thumbnail_url','Thumbnail URL',ed?.thumbnail_url)}<label>Upload thumbnail<input type="file" id="upt" accept="image/*"></label>
    <label class="full">Description<textarea name="description">${e(ed?.description)}</textarea></label><label class="full">Article text (for “Written article”)<textarea name="body" style="min-height:140px">${e(ed?.body)}</textarea></label><div class="full"><button class="btn acc">${ed?'Save changes':'Publish content'}</button> ${ed?'<button type="button" class="btn ghost" id="cx">Cancel</button>':''}</div></form>
    <div class="panel"><label>Filter list by category<select id="fc"><option value="">All</option>${cats.map(c=>`<option value="${c.id}" ${c.id==fc?'selected':''}>${e(c.name)}</option>`).join('')}</select></label><div class="tw"><table><tr><th>Title<th>Type<th>Location<th>♥<th>Live<th></tr>${list.map(i=>`<tr><td>${e(i.title)}<td>${i.type}<td>${loc(i.folder_id)}<td>${i.likes_count}<td><input type="checkbox" data-pub="${i.id}" ${i.is_published?'checked':''} style="width:auto"><td><button class="btn ghost sm" data-ed="${i.id}">Edit</button> <button class="btn red sm" data-del="${i.id}">Delete</button></tr>`).join('')}</table></div></div>`;
    const up=(inp,target)=>inp.onchange=async()=>{const f=inp.files[0];if(!f)return;if(await upFile(f,'',$(target)))toast('Uploaded — now press Publish (the old file is removed when you save)')};
    bindPlace($('#if'));up($('#upt'),'[name=thumbnail_url]');
    const T=$('[name=type]'),U=$('#uurl'),TH=$('[name=thumbnail_url]');
    /* pasting a link switches the Format automatically (a YouTube link under "Video file" used to give a black box) */
    const autoType=()=>{const g=guessType(U.value,T.value);if(g!==T.value){T.value=g;toast('Format switched to “'+T.options[T.selectedIndex].text+'” to match the link')}};
    U.addEventListener('input',autoType);U.addEventListener('change',autoType);
    $('#upf').onchange=async ev=>{const inp=ev.target,f=inp.files[0];if(!f)return;
      const x=extOf(f.name),isVid=f.type.startsWith('video/')||['mp4','m4v','mov','webm','ogv'].includes(x),isPdf=x==='pdf'||f.type==='application/pdf';
      if(!isVid&&!isPdf){toast('Please choose an MP4 / WebM video or a PDF file',1);inp.value='';return}
      let info=null;
      if(isVid){toast('Checking the video…');const[sn,pr]=await Promise.all([sniffCodec(f),probeVideo(f)]);info=pr;
        if(sn.hevc||pr.ok===false){
          if(!confirm((sn.hevc?'This video is encoded as H.265 (HEVC).':'This browser could not read the picture of this video.')+'\n\nMany browsers and phones show a BLACK screen for this kind of file. Convert it to H.264 MP4 first (for example with HandBrake, preset “Fast 1080p30”) and upload that instead.\n\nUpload it anyway?')){inp.value='';return}}}
      if(!await upFile(f,'',U))return;
      T.value=isVid?'video':'pdf';
      if(isVid){const D=$('[name=duration]');if(!D.value&&info?.dur)D.value=lenLabel(info.dur);
        /* poster frame: fill an empty thumbnail, or replace one that was auto-made for the previous video */
        if(info?.poster&&(!TH.value||(pathOf(TH.value)||'').startsWith('thumbs/')))await upFile(new File([info.poster],'poster.jpg',{type:'image/jpeg'}),'thumbs/',TH)}
      toast(info?.poster?'Uploaded, thumbnail created — now press Publish':'Uploaded — now press Publish (the old file is removed when you save)')};
    $('#fc').onchange=ev=>{fc=ev.target.value;draw()};$('#cx')?.addEventListener('click',()=>{ed=null;draw()});
    $('#if').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target);if(!placeCheck(v))return;v.url=(v.url||'').trim();v.type=guessType(v.url,v.type);
      if(['video','youtube','pdf'].includes(v.type)&&!v.url){toast(v.type==='pdf'?'Add a PDF link or upload a PDF first':'Add a video link or upload a video file first',1);return}
      if(v.type==='youtube'&&!embedOf(v.url)){toast('That does not look like a YouTube, Vimeo or Google Drive video link',1);return}
      v.sort_order=+v.sort_order||0;v.duration=v.duration||null;v.tags=v.tags.split(',').map(t=>t.trim()).filter(Boolean);['url','thumbnail_url','body','description'].forEach(k=>v[k]=v[k]||null);
      const old=ed?[ed.url,ed.thumbnail_url]:[];
      await q(ed?sb.from('items').update(v).eq('id',ed.id):sb.from('items').insert(v));
      const junk=[...old,...PEND];PEND.clear();await dropFiles(junk);toast('Saved');ed=null;draw()};
    document.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>{ed=list.find(i=>i.id===b.dataset.ed);draw();scrollTo(0,0)});
    document.querySelectorAll('[data-pub]').forEach(b=>b.onchange=()=>q(sb.from('items').update({is_published:b.checked}).eq('id',b.dataset.pub)));
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this item and its uploaded files?'))return;const it=list.find(i=>i.id===b.dataset.del);
      await q(sb.from('items').delete().eq('id',b.dataset.del));await dropFiles([it?.url,it?.thumbnail_url]);toast('Deleted');draw()})};draw()}

