import type { IconName } from '@/components/ui/icons';

/** The five "Как работим" steps (home cards). Verbatim from the original. */
export interface Step {
  n: string;
  title: string;
  short: string;
  href: string;
  icon: IconName;
}

export const steps: Step[] = [
  {
    n: '01',
    title: 'Оглед и консултация',
    short: 'Започваме с оглед на жилището и разговор за вашите идеи и очаквания.',
    href: '/kak-rabotim/ogled-i-konsultirane/',
    icon: 'inspect',
  },
  {
    n: '02',
    title: 'Детайлна оферта',
    short: 'На база на огледа подготвяме подробна оферта с описание на предвидените работи и техните цени.',
    href: '/kak-rabotim/oferta/',
    icon: 'offer',
  },
  {
    n: '03',
    title: 'Договор',
    short: 'Уточняваме сроковете, последователността на дейностите и отговорностите на страните.',
    href: '/kak-rabotim/dogovor/',
    icon: 'contract',
  },
  {
    n: '04',
    title: 'Професионално изпълнение',
    short: 'Организираме и координираме отделните етапи на ремонта.',
    href: '/kak-rabotim/izpalnenie/',
    icon: 'tools',
  },
  {
    n: '05',
    title: 'Финално почистване',
    short: 'След приключване на договорените дейности извършваме финалните проверки и професионално почистване.',
    href: '/kak-rabotim/finalno-pochistvane/',
    icon: 'sparkle',
  },
];
