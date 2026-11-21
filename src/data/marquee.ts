/** Words + 3D object icons of the tilted marquee ribbon (home, /uslugi/). Verbatim from the original. */
export interface MarqueeItem {
  word: string;
  /** Outlined word style. */
  outline?: boolean;
  /** Icon file in /assets/img/predmeti/ (without "-160.webp"). */
  icon: string;
}

export const marqueeItems: MarqueeItem[] = [
  { word: 'Изкъртване', icon: 'chuk' },
  { word: 'Дограма', outline: true, icon: 'prozorets' },
  { word: 'ВиК', icon: 'smesitel' },
  { word: 'Ел. инсталации', icon: 'kontakt' },
  { word: 'Замазки', outline: true, icon: 'malaj' },
  { word: 'Плочки', icon: 'plochki' },
  { word: 'Боя', icon: 'valyak' },
  { word: 'Паркет', outline: true, icon: 'parket' },
  { word: 'Осветление', icon: 'lampa' },
  { word: 'Обзавеждане', icon: 'fotyoil' },
  { word: 'Почистване', outline: true, icon: 'sprei' },
  { word: 'Готово за нанасяне', icon: 'klyuch-vrata' },
];
