document.addEventListener('DOMContentLoaded',()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 initHero(reduced);
 if(reduced){document.querySelectorAll('[data-reveal]').forEach(x=>x.classList.add('is-visible'));return;}
 const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.12});
 document.querySelectorAll('[data-reveal]').forEach(x=>io.observe(x));
});

// Hero slideshow + parallax, modelled on the Shopify Impulse theme hero.
function initHero(reduced){
 const hero=document.querySelector('[data-slideshow]');if(!hero)return;
 const slides=[...hero.querySelectorAll('.hero-slide')],outTimers=[],speed=+hero.dataset.speed||7000;
 let cur=0,timer=null,paused=false;
 hero.toggleAttribute('data-ready',true);
 function go(i){
  if(i===cur)return;const prev=slides[cur],next=slides[i];
  prev.classList.remove('is-selected');prev.classList.add('animate-out');
  clearTimeout(outTimers[cur]);outTimers[cur]=setTimeout(()=>prev.classList.remove('animate-out'),600);
  clearTimeout(outTimers[i]);next.classList.remove('animate-out');next.classList.add('is-selected');
  cur=i;
 }
 // Auto-advance every `speed` ms; hold while a slide's link has keyboard focus.
 function schedule(){clearTimeout(timer);if(!paused)timer=setTimeout(()=>{go((cur+1)%slides.length);schedule()},speed)}
 if(!reduced&&slides.length>1){
  hero.addEventListener('focusin',()=>{paused=true;clearTimeout(timer)});
  hero.addEventListener('focusout',e=>{if(!hero.contains(e.relatedTarget)){paused=false;schedule()}});
  schedule();
 }
 if(reduced)return;
 // Parallax: the image drifts up by 15% of the hero's height as it scrolls through the viewport.
 const layers=hero.querySelectorAll('[data-parallax]');let ticking=false;
 function parallax(){
  ticking=false;const r=hero.getBoundingClientRect(),vh=innerHeight,progress=(vh-r.top)/(vh+r.height);
  if(progress<-.1||progress>1.1)return;
  const y=Math.min(Math.max(progress,0),1)*r.height*.15;
  layers.forEach(el=>el.style.transform=`translate3d(0,${-y}px,0)`);
 }
 addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(parallax)}},{passive:true});
 addEventListener('resize',parallax);parallax();
}
