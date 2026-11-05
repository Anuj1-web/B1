/* Polish & interactivity: scroll progress, header lift, back-to-top, card glow + tilt, footer year */
(()=>{
  const sp=document.getElementById('sp'),tt=document.getElementById('totop'),hd=document.querySelector('header');
  document.getElementById('yr').textContent=new Date().getFullYear();
  const onScroll=()=>{const h=document.documentElement,max=h.scrollHeight-h.clientHeight;
    sp.style.transform=`scaleX(${max>0?Math.min(1,scrollY/max):0})`;hd.classList.toggle('lift',scrollY>8);tt.classList.toggle('show',scrollY>480)};
  addEventListener('scroll',onScroll,{passive:true});addEventListener('hashchange',()=>setTimeout(onScroll,120));onScroll();
  tt.onclick=()=>scrollTo({top:0,behavior:'smooth'});
  const fine=matchMedia('(hover:hover) and (pointer:fine)').matches,calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(fine&&!calm){
    document.addEventListener('pointermove',ev=>{const c=ev.target.closest?.('.card,.cat');if(!c||document.body.classList.contains('focus'))return;
      const r=c.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width,y=(ev.clientY-r.top)/r.height;
      c.style.setProperty('--mx',(x*100).toFixed(1)+'%');c.style.setProperty('--my',(y*100).toFixed(1)+'%');
      c.style.setProperty('--ry',((x-.5)*5).toFixed(2)+'deg');c.style.setProperty('--rx',((.5-y)*5).toFixed(2)+'deg')},{passive:true});
    document.addEventListener('pointerout',ev=>{const c=ev.target.closest?.('.card,.cat');
      if(c&&!c.contains(ev.relatedTarget)){c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg')}},{passive:true})}
})();
