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

/* ---------- question text: bold / italic / underline and the question library's maths markup ----------
   Understands  [b] [i] [u]  tags, plain <b> <i> <u> <sub> <sup> <br> tags, the library's invisible style marks, and the maths markup
   \frac{a}{b}  \sqrt{x}  \sqrt[n]{x}  \overline{x}  x^{2}  x_{1}  (drawn as real fractions / roots).  Everything else is escaped. */
const _MS={'\\times':'×','\\div':'÷','\\pm':'±','\\circ':'°','\\degree':'°','\\leq':'≤','\\le':'≤','\\geq':'≥','\\ge':'≥','\\neq':'≠','\\ne':'≠','\\pi':'π','\\theta':'θ','\\infty':'∞','\\cdot':'·','\\angle':'∠','\\triangle':'△','\\therefore':'∴','\\approx':'≈','\\alpha':'α','\\beta':'β','\\gamma':'γ','\\Delta':'Δ','\\rightarrow':'→','\\Rightarrow':'⇒'};
function parseMath(s){const n=s.length;
  const grp=i=>parse(i+1,true);
  function parse(i,stop){const nodes=[];let buf='';const flush=()=>{if(buf){nodes.push(['t',buf]);buf=''}};
    while(i<n){const ch=s[i];
      if(ch==='}'&&stop){flush();return[nodes,i+1]}
      if(ch==='\\'){
        if(s.startsWith('\\frac{',i)){flush();let a,b=[];[a,i]=grp(i+5);if(i<n&&s[i]==='{')[b,i]=grp(i);nodes.push(['frac',a,b]);continue}
        if(s.startsWith('\\overline{',i)){flush();let a;[a,i]=grp(i+9);nodes.push(['over',a]);continue}
        if(s.startsWith('\\sqrt',i)){flush();i+=5;let idx=null,a=[];if(i<n&&s[i]==='['){let j=s.indexOf(']',i);if(j<0)j=n;idx=parseMath(s.slice(i+1,j));i=j+1}if(i<n&&s[i]==='{')[a,i]=grp(i);nodes.push(['sqrt',a,idx]);continue}
        const m=/^\\[A-Za-z]+/.exec(s.slice(i,i+12));if(m&&_MS[m[0]]!==undefined){buf+=_MS[m[0]];i+=m[0].length;continue}
        if(i+1<n&&'\\{}%$'.includes(s[i+1])){buf+=s[i+1];i+=2;continue}
        buf+='\\';i++;continue}
      if((ch==='^'||ch==='_')&&s[i+1]==='{'){flush();let a;[a,i]=grp(i+1);nodes.push([ch==='^'?'sup':'sub',a]);continue}
      buf+=ch;i++}
    flush();return[nodes,i]}
  return parse(0,false)[0]}
const SQRT_SVG='<svg class="mr" viewBox="0 0 12 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0.6 11.5 L3 10 L6 18.6 L11.4 0.8" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const mathHTML=nodes=>nodes.map(nd=>nd[0]==='t'?e(nd[1]):nd[0]==='sup'?`<sup>${mathHTML(nd[1])}</sup>`:nd[0]==='sub'?`<sub>${mathHTML(nd[1])}</sub>`
  :nd[0]==='frac'?`<span class="mf"><span class="mn">${mathHTML(nd[1])}</span><span class="md">${mathHTML(nd[2])}</span></span>`
  :nd[0]==='over'?`<span class="mo">${mathHTML(nd[1])}</span>`
  :`<span class="ms">${nd[2]?`<sup class="mi">${mathHTML(nd[2])}</sup>`:''}${SQRT_SVG}<span class="mb">${mathHTML(nd[1])}</span></span>`).join('');
const _STY={'\x01':'[b]','\x02':'[/b]','\x03':'[i]','\x04':'[/i]','\x05':'[u]','\x06':'[/u]'};
const rich=s=>{s=String(s??'').replace(/[\x01-\x06]/g,m=>_STY[m]);
  let h=/\\[A-Za-z{}%$\\]|[\^_]\{/.test(s)?mathHTML(parseMath(s)):e(s);
  const o={};
  h=h.replace(/\[(\/?)([biu])\]|&lt;(\/?)(b|i|u|sub|sup|strong|em|br)\s*\/?&gt;/gi,(m,c1,t1,c2,t2)=>{
    const t=(t1||t2).toLowerCase(),c=c1||c2;if(t==='br')return c?'':'<br>';
    if(c){if(!o[t])return'';o[t]--;return`</${t}>`}o[t]=(o[t]||0)+1;return`<${t}>`});
  for(const t in o)while(o[t]>0){h+=`</${t}>`;o[t]--}
  return h};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate=d=>{const m=String(d||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${+m[3]} ${MON[+m[2]-1]} ${m[1]}`:''};
/* where "back" goes from a test: its exam hub, else its folder, else home */
const backOf=a=>a.exam_id?'#/x/'+a.exam_id:a.folder_id?'#/f/'+a.folder_id:'#/';
