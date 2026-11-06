const CFG={url:'https://qhqukohdvafmfavukknu.supabase.co',key:'sb_publishable_gMyJ6TfiY2d-Jh0Qk0btWA_vxlowVN0'};
const sb=supabase.createClient(CFG.url,CFG.key);
const $=s=>document.querySelector(s),app=$('#app');
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KC={videos:'#ef5b5b',notes:'#0e8f7e',revision:'#e8b100',articles:'#3b6fd4',links:'#7a5af8',quizzes:'#d9468f',tests:'#10243a'};
const TI={video:'🎬',youtube:'▶️',pdf:'📄',article:'📰',link:'🔗'};
const ls={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const cid=(()=>{let c=ls.get('li_cid');if(!c){c=crypto.randomUUID();ls.set('li_cid',c)}return c})();
let cats=[],sess=null,adminOK=false,tab='cats',openQ=null;
function toast(m,err){const t=$('#toast');t.textContent=m;t.className=err?'err':'';t.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display='none',3200)}
async function q(p){const{data,error}=await p;if(error){toast(error.message,1);throw error}return data}
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const yt=u=>(u||'').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/)?.[1];
/* what kind of player a link needs: YouTube / Vimeo / Google Drive are embedded, everything else is a plain file */
const ytStart=u=>{const m=String(u||'').match(/[?&#](?:t|start)=(?:(\d+)h)?(?:(\d+)m)?(\d+)?s?(?:&|#|$)/);return m?(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0):0};
function embedOf(u){u=String(u||'').trim();if(!u)return null;
  const y=yt(u);if(y)return{kind:'youtube',id:y,start:ytStart(u),src:`https://www.youtube-nocookie.com/embed/${y}?rel=0&playsinline=1${ytStart(u)?'&start='+ytStart(u):''}`,watch:`https://www.youtube.com/watch?v=${y}`};
  let m=u.match(/vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/)?(\d{6,})/);if(m)return{kind:'embed',src:`https://player.vimeo.com/video/${m[1]}`,watch:u};
  m=u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);if(m)return{kind:'embed',src:`https://drive.google.com/file/d/${m[1]}/preview`,watch:u};
  return null}
/* the player to use for an item: the LINK decides (so a YouTube link saved under "Video file" still works) */
function mediaOf(i){const em=['video','youtube'].includes(i.type)?embedOf(i.url):null;if(em)return em;return{kind:i.type==='youtube'?'badlink':i.type}}
const thumbOf=i=>i.thumbnail_url||(['video','youtube'].includes(i.type)&&yt(i.url)?`https://i.ytimg.com/vi/${yt(i.url)}/hqdefault.jpg`:'');
const fd=f=>Object.fromEntries(new FormData(f));
$('#theme').onclick=()=>{const d=document.documentElement,dark=d.dataset.theme?d.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;d.dataset.theme=dark?'light':'dark';ls.set('li_theme',d.dataset.theme)};
if(ls.get('li_theme'))document.documentElement.dataset.theme=ls.get('li_theme');


const need=src=>need.c[src]||(need.c[src]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>{delete need.c[src];no(new Error('Could not load '+src))};document.head.appendChild(s)}));need.c={};

const ICOLS='id,category_id,folder_id,title,description,type,url,body,thumbnail_url,tags,is_published,created_at,duration,sort_order';
const SK='<div class="sk-wrap"><div class="sk h"></div><div class="sk r"></div><div class="sk r"></div></div>';
