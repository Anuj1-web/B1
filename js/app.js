const menu=o=>{document.body.classList.toggle('menu-open',o);$('#menuBtn').setAttribute('aria-expanded',o)};
$('#menuBtn').onclick=()=>menu(true);$('#menuX').onclick=$('#scrim').onclick=()=>menu(false);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')menu(false)});
async function route(){
  const p=location.hash.replace(/^#\//,'').split('/');menu(false);scrollTo(0,0);window.exCleanup&&exCleanup();
  document.querySelectorAll('nav a').forEach(a=>a.classList.remove('on'));
  app.innerHTML='<div class="load">Loading…</div>';
  try{if(!cats.length)await loadCats();
    if(p[0]==='c')await catPage(p[1]);else if(p[0]==='i')await viewer(p[1]);else if(p[0]==='admin'){await need('js/admin.js');await need('js/admin-tests.js');await admin()}else if(p[0]==='exam'){await need('js/engine.js');await exam(p[1])}else if(p[0]==='saved')await saved();else await home()}
  catch(err){console.error(err);app.innerHTML='<div class="empty">Something went wrong loading this page. Check your connection and refresh.</div>'}}
window.addEventListener('hashchange',route);route();
