/* ---------- ADMIN ---------- */
const fl=(n,l,v='',t='text',x='')=>`<label>${l}<input name="${n}" type="${t}" value="${e(v)}" ${x}></label>`;
const sel=(n,l,o,v='')=>`<label>${l}<select name="${n}">${o.map(([a,b])=>`<option value="${e(a)}" ${a==v?'selected':''}>${e(b)}</option>`).join('')}</select></label>`;
async function checkAdmin(){const{data}=await sb.auth.getSession();sess=data.session;adminOK=false;
  if(sess){const{data:r}=await sb.from('admins').select('user_id').limit(1);adminOK=!!r?.length}}
async function admin(){
  await checkAdmin();
  if(!sess){app.innerHTML=`<div class="panel" style="max-width:420px;margin:50px auto"><h2>Admin sign in</h2><form id="lf" class="f" style="grid-template-columns:1fr;margin-top:14px">${fl('email','Email','','email','required')}${fl('password','Password (min 6)','','password','required minlength=6')}<button class="btn acc">Sign in</button><button type="button" class="btn ghost" id="su">Create account</button></form></div>`;
    $('#lf').onsubmit=async ev=>{ev.preventDefault();const{error}=await sb.auth.signInWithPassword(fd(ev.target));if(error)return toast(error.message,1);admin()};
    $('#su').onclick=async()=>{const f=$('#lf');if(!f.reportValidity())return;const{data,error}=await sb.auth.signUp(fd(f));if(error)return toast(error.message,1);toast(data.session?'Account created':'Check your email to confirm, then sign in');if(data.session)admin()};return}
  if(!adminOK){app.innerHTML=`<div class="panel" style="max-width:520px;margin:50px auto"><h2>No admin access yet</h2><p>You're signed in as <b>${e(sess.user.email)}</b>. If this is the first setup, claim the admin role. It works once, only while no admin exists.</p><button class="btn acc" id="cl">Claim admin</button> <button class="btn ghost" id="so">Sign out</button></div>`;
    $('#cl').onclick=async()=>{const ok=await q(sb.rpc('claim_first_admin'));toast(ok?'You are the admin':'An admin already exists',!ok);admin()};
    $('#so').onclick=async()=>{await sb.auth.signOut();admin()};return}
  app.innerHTML=`<div class="sec"><h2>Admin panel</h2><button class="btn ghost sm" id="so">Sign out</button></div><div class="tabs">${[['cats','Categories'],['items','Content'],['as','Quizzes & Tests']].map(([k,l])=>`<button class="btn ${tab===k?'':'ghost'} sm" data-tab="${k}">${l}</button>`).join('')}</div><div id="ad"></div>`;
  $('#so').onclick=async()=>{await sb.auth.signOut();admin()};
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;admin()});
  await loadCats();({cats:aCats,items:aItems,as:aAs})[tab]()}

async function aCats(){let ed=null;
  const draw=()=>{$('#ad').innerHTML=`<form class="panel f" id="cf"><h3 class="full">${ed?'Edit':'New'} category</h3>${fl('name','Name',ed?.name,'text','required')}${sel('kind','Type',['videos','notes','revision','articles','links','quizzes','tests'].map(x=>[x,x]),ed?.kind)}${fl('icon','Icon (emoji)',ed?.icon||'📚')}${fl('sort_order','Order',ed?.sort_order??cats.length+1,'number')}<label class="full">Description<input name="description" value="${e(ed?.description)}"></label><div class="full"><button class="btn acc">${ed?'Save changes':'Add category'}</button> ${ed?'<button type="button" class="btn ghost" id="cx">Cancel</button>':''}</div></form>
  <div class="panel tw"><table><tr><th>Category<th>Type<th>Order<th>Live<th></tr>${cats.map(c=>`<tr><td>${e(c.icon)} ${e(c.name)}<td>${c.kind}<td>${c.sort_order}<td><input type="checkbox" data-pub="${c.id}" ${c.is_published?'checked':''} style="width:auto"><td><button class="btn ghost sm" data-ed="${c.id}">Edit</button> <button class="btn red sm" data-del="${c.id}">Delete</button></tr>`).join('')}</table></div>`;
    $('#cf').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target);v.sort_order=+v.sort_order||0;
      await q(ed?sb.from('categories').update(v).eq('id',ed.id):sb.from('categories').insert({...v,slug:slug(v.name)+'-'+Math.random().toString(36).slice(2,5)}));toast('Saved');ed=null;await loadCats();draw()};
    $('#cx')?.addEventListener('click',()=>{ed=null;draw()});
    document.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>{ed=cats.find(c=>c.id===b.dataset.ed);draw();scrollTo(0,0)});
    document.querySelectorAll('[data-pub]').forEach(b=>b.onchange=async()=>{await q(sb.from('categories').update({is_published:b.checked}).eq('id',b.dataset.pub));await loadCats()});
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this category and everything inside it?'))return;await q(sb.from('categories').delete().eq('id',b.dataset.del));toast('Deleted');await loadCats();draw()})};draw()}

async function aItems(){let ed=null,fc='';
  const draw=async()=>{const list=await q((fc?sb.from('items').select('*').eq('category_id',fc):sb.from('items').select('*')).order('created_at',{ascending:false}).limit(200));
    $('#ad').innerHTML=`<form class="panel f" id="if"><h3 class="full">${ed?'Edit':'Add'} content</h3>${sel('category_id','Category',cats.map(c=>[c.id,c.icon+' '+c.name]),ed?.category_id||fc)}${sel('type','Format',[['video','Video file (mp4)'],['youtube','YouTube video'],['pdf','PDF notes / sheet'],['article','Written article'],['link','External link']],ed?.type)}${fl('title','Title',ed?.title,'text','required')}${fl('tags','Tags (comma separated)',(ed?.tags||[]).join(', '))}
    <label class="full">URL (paste, or upload below)<input name="url" id="uurl" value="${e(ed?.url)}" placeholder="https://…"></label><label>Upload file (video / PDF)<input type="file" id="upf" accept="video/*,application/pdf"></label>${fl('thumbnail_url','Thumbnail URL',ed?.thumbnail_url)}<label>Upload thumbnail<input type="file" id="upt" accept="image/*"></label>
    <label class="full">Description<textarea name="description">${e(ed?.description)}</textarea></label><label class="full">Article text (for “Written article”)<textarea name="body" style="min-height:140px">${e(ed?.body)}</textarea></label><div class="full"><button class="btn acc">${ed?'Save changes':'Publish content'}</button> ${ed?'<button type="button" class="btn ghost" id="cx">Cancel</button>':''}</div></form>
    <div class="panel"><label>Filter list by category<select id="fc"><option value="">All</option>${cats.map(c=>`<option value="${c.id}" ${c.id==fc?'selected':''}>${e(c.name)}</option>`).join('')}</select></label><div class="tw"><table><tr><th>Title<th>Type<th>♥<th>Live<th></tr>${list.map(i=>`<tr><td>${e(i.title)}<td>${i.type}<td>${i.likes_count}<td><input type="checkbox" data-pub="${i.id}" ${i.is_published?'checked':''} style="width:auto"><td><button class="btn ghost sm" data-ed="${i.id}">Edit</button> <button class="btn red sm" data-del="${i.id}">Delete</button></tr>`).join('')}</table></div></div>`;
    const up=(inp,target)=>inp.onchange=async()=>{const f=inp.files[0];if(!f)return;toast('Uploading…');const p=`${Date.now()}-${f.name.replace(/[^\w.-]/g,'_')}`;
      const{error}=await sb.storage.from('content').upload(p,f);if(error)return toast(error.message,1);$(target).value=sb.storage.from('content').getPublicUrl(p).data.publicUrl;toast('Uploaded — now press Publish')};
    up($('#upf'),'#uurl');up($('#upt'),'[name=thumbnail_url]');
    $('#fc').onchange=ev=>{fc=ev.target.value;draw()};$('#cx')?.addEventListener('click',()=>{ed=null;draw()});
    $('#if').onsubmit=async ev=>{ev.preventDefault();const v=fd(ev.target);v.tags=v.tags.split(',').map(t=>t.trim()).filter(Boolean);['url','thumbnail_url','body','description'].forEach(k=>v[k]=v[k]||null);
      await q(ed?sb.from('items').update(v).eq('id',ed.id):sb.from('items').insert(v));toast('Saved');ed=null;draw()};
    document.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>{ed=list.find(i=>i.id===b.dataset.ed);draw();scrollTo(0,0)});
    document.querySelectorAll('[data-pub]').forEach(b=>b.onchange=()=>q(sb.from('items').update({is_published:b.checked}).eq('id',b.dataset.pub)));
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this item?'))return;await q(sb.from('items').delete().eq('id',b.dataset.del));toast('Deleted');draw()})};draw()}

