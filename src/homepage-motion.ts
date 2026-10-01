/** Decorative homepage motion; content stays visible without script support. */
const marketing = document.querySelector<HTMLElement>('#marketing');
if (marketing && document.body.dataset.screen === 'homepage' && 'IntersectionObserver' in window) {
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
 const pending = new Set<HTMLElement>(Array.from(marketing.querySelectorAll<HTMLElement>(
  '.marketing-hero-copy,.marketing-hero-art,.marketing-game-preview,.marketing-game-intro,' +
  '.marketing-features article,.marketing-style-copy,.marketing-section-heading,' +
  '.marketing-style-grid figure,.marketing-fun-grid figure,.marketing-screenshot-grid,.marketing-download',
 )));
 const active = new Set<Animation>();
 const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
   if (!entry.isIntersecting) continue;
   const element = entry.target as HTMLElement;
   observer.unobserve(element);
   pending.delete(element);
   if (reducedMotion.matches || typeof element.animate !== 'function') continue;
   const card = element.matches('.marketing-style-grid figure,.marketing-fun-grid figure');
   const index = card ? Array.from(element.parentElement!.children).indexOf(element) : 0;
   const animation = element.animate([
    {opacity: 0.35, translate: '0 20px'},
    {opacity: 1, translate: '0 0'},
   ], {duration: 580, delay: index * 55, easing: 'cubic-bezier(.22,1,.36,1)'});
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
