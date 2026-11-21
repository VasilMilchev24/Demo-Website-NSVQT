/**
 * Home page: wires the 3D hero and the "Защо да изберете нас" slides to scroll.
 * The 3D modules are loaded lazily, so text/markup render first and Three.js is fetched in parallel.
 */
import { $, $$, prefersReducedMotion } from '@/scripts/core/dom';
import { gsap, ScrollTrigger } from '@/scripts/core/motion';

/** Labels under the hero counter: [from progress, text]. Verbatim from the original. */
const HERO_STAGES: [number, string][] = [
  [0, 'Стария апартамент'],
  [0.1, 'Изкъртване'],
  [0.22, 'ВиК и ел. инсталации'],
  [0.34, 'Новата дограма'],
  [0.44, 'Замазки и гипсокартон'],
  [0.56, 'Настилки и баня'],
  [0.68, 'Боя и детайли'],
  [0.78, 'Кухня и дърводелски'],
  [0.88, 'Осветление и обзавеждане'],
  [0.97, 'Почистено, готово за нанасяне'],
];

/** Background colour of each "Защо" slide. */
const SLIDE_COLOURS = ['#F3F5F8', '#4CACD8', '#24345C', '#FFFFFF'];

async function initHero(): Promise<void> {
  const hero = $('#geroi');
  if (!hero) return;
  const counter = $('[data-pr]', hero);
  const stageLabel = $('[data-etap]', hero);
  let lastPercent = -1;
  const updateText = (p: number) => {
    const percent = Math.round(p * 100);
    if (percent === lastPercent) return;
    lastPercent = percent;
    if (counter) counter.textContent = String(percent).padStart(2, '0');
    let text = HERO_STAGES[0]![1];
    for (const [from, label] of HERO_STAGES) if (p >= from) text = label;
    if (stageLabel && stageLabel.textContent !== text) stageLabel.textContent = text;
  };
  updateText(0);

  const { createHeroScene } = await import('@/scripts/3d/home/hero-scene');
  const scene = createHeroScene({
    container: $('#geroi-scena'),
    labelsLayer: $('.geroi__belezhki', hero),
    lens: $('.geroi__leshta', hero),
  });
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = Math.min(1, self.progress * 1.06);
      updateText(p);
      scene?.progress(p);
    },
  });
}

async function initWhySlides(): Promise<void> {
  const section = $('#ozhivyava');
  if (!section) return;
  const screens = $$('.ozh-ekran', section);
  const texts = $$('[data-ozh-t]', section);
  const dots = $$('.ozh-tochki i b', section);
  const words = $$('.ozh-duma', section);
  const sticky = $('.ozhivyava__sc', section);
  const number = $('[data-ozh-n]', section);

  const { createToolsScene } = await import('@/scripts/3d/home/tools-scene');
  const tools = createToolsScene($('#ozh-platno'));

  let current = -1;
  const show = (index: number) => {
    if (index === current) return;
    current = index;
    screens.forEach((s, i) => s.classList.toggle('akt', i === index));
    texts.forEach((t, i) => {
      t.hidden = i !== index;
    });
    if (number) number.textContent = String(index + 1).padStart(2, '0');
    if (sticky) {
      sticky.style.backgroundColor = SLIDE_COLOURS[index] ?? '';
      sticky.classList.toggle('ozh-tamno', index === 2);
      sticky.classList.toggle('ozh-nebe', index === 1);
    }
    const screen = screens[index];
    if (!prefersReducedMotion && screen) {
      gsap.fromTo(
        $$('.b', screen),
        { yPercent: 70, opacity: 0, rotate: 4 },
        {
          yPercent: 0,
          opacity: 1,
          rotate: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.035,
          overwrite: true,
        },
      );
    }
    tools?.show(index);
  };
  show(0);

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      const count = screens.length;
      const index = Math.min(count - 1, Math.floor(p * count));
      show(index);
      dots.forEach((d, i) => d.style.setProperty('--p', Math.max(0, Math.min(1, p * count - i)).toFixed(3)));
      const within = p * count - index;
      tools?.progress(index, within);
      const word = words[index];
      if (!prefersReducedMotion && word) {
        word.style.transform = `translateY(${(0.5 - within) * 6}vh) scale(${1 + (within - 0.5) * 0.04})`;
      }
    },
  });
}

void initHero();
void initWhySlides();
