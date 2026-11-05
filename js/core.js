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
const yt=u=>(u||'').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];
const fd=f=>Object.fromEntries(new FormData(f));
$('#theme').onclick=()=>{const d=document.documentElement,dark=getComputedStyle(d).getPropertyValue('--bg').trim()==='#0d1824';d.dataset.theme=dark?'light':'dark';ls.set('li_theme',d.dataset.theme)};
if(ls.get('li_theme'))document.documentElement.dataset.theme=ls.get('li_theme');

