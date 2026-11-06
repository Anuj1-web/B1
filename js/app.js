const menu=o=>{document.body.classList.toggle('menu-open',o);$('#menuBtn').setAttribute('aria-expanded',o)};
$('#menuBtn').onclick=()=>menu(true);$('#menuX').onclick=$('#scrim').onclick=()=>menu(false);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')menu(false)});
async function route(){
  const p=location.hash.replace(/^#\//,'').split('/');menu(false);scrollTo(0,0);window.exCleanup&&exCleanup();if(typeof settle==='function')settle();
  document.querySelectorAll('nav a').forEach(a=>a.classList.remove('on'));
  app.innerHTML=SK;app.classList.remove('pin');void app.offsetWidth;app.classList.add('pin');
  try{if(!cats.length)await loadCats();
    if(p[0]==='c')await catPage(p[1]);else if(p[0]==='i')await viewer(p[1]);else if(p[0]==='x')await examPage(p[1]);else if(p[0]==='f')await folderPage(p[1]);else if(p[0]==='admin'){await need('js/admin.js?v=7');await need('js/admin-exams.js?v=7');await need('js/admin-tests.js?v=7');await admin()}else if(p[0]==='exam'){await need('js/engine.js?v=7');await exam(p[1])}else if(p[0]==='saved')await saved();else await home()}
  catch(err){console.error(err);app.innerHTML='<div class="empty">Something went wrong loading this page. Check your connection and refresh.</div>'}}
window.addEventListener('hashchange',route);route();
