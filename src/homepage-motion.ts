/** Decorative homepage motion; content stays visible without script support. */
const marketing = document.querySelector<HTMLElement>('#marketing');
if (marketing && document.body.dataset.screen === 'homepage' && 'IntersectionObserver' in window) {
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
 const pending = new Set<HTMLElement>(Array.from(marketing.querySelectorAll<HTMLElement>(
  '.marketing-hero-copy,.marketing-hero-art,.marketing-game-preview,.marketing-game-intro,' +
  '.marketing-features article,.marketing-style-copy,.marketing-section-heading,' +
  '.marketing-style-grid figure,.marketing-fun-grid figure,.marketing-screenshot-grid figure,.marketing-download,.marketing-footer',
 )));
 const active = new Set<Animation>();
 const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
   if (!entry.isIntersecting) continue;
   const element = entry.target as HTMLElement;
   observer.unobserve(element);
   pending.delete(element);
   if (reducedMotion.matches || typeof element.animate !== 'function') continue;
   const card = element.matches('.marketing-style-grid figure,.marketing-fun-grid figure,.marketing-screenshot-grid figure');
   const visual = card || element.matches('.marketing-hero-art,.marketing-game-preview');
   const index = card ? Array.from(element.parentElement!.children).indexOf(element) : 0;
   const animation = element.animate([
    {opacity: 0.2, translate: `0 ${visual ? 36 : 22}px`, scale: visual ? 0.96 : 1},
    {opacity: 1, translate: '0 -3px', scale: 1, offset: 0.8},
    {opacity: 1, translate: '0 0', scale: 1},
   ], {duration: 760, delay: index * 85, easing: 'cubic-bezier(.22,1,.36,1)'});
   active.add(animation);
   animation.addEventListener('finish', () => active.delete(animation), {once: true});
  }
 }, {threshold: 0.08});
 const update = () => {
  observer.disconnect();
  for (const animation of active) animation.cancel();
  active.clear();
  if (!reducedMotion.matches) for (const element of pending) observer.observe(element);
 };
 reducedMotion.addEventListener('change', update);
 update();
}
export {};
