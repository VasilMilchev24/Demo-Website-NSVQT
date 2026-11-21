/**
 * /konstruktor/ form: reads the choices, prices them, keeps them in the URL (shareable link),
 * prefills the contact form link and drives the 3D scene. Ported from the original konstruktor.js.
 */
import { $, $$, prefersReducedMotion } from '../core/dom';
import {
  price,
  euro,
  ITEM_NAMES,
  type ConfiguratorState,
  type HomeKind,
  type Building,
  type FloorKind,
  type MaterialClass,
} from './configurator-pricing';
import {
  createConfiguratorScene,
  type ConfiguratorScene,
  type Scope,
  type View,
} from '../3d/configurator/configurator-scene';

const HOME_NAMES: Record<HomeKind, string> = {
  ednostaen: 'едностаен апартамент',
  dvustaen: 'двустаен апартамент',
  tristaen: 'тристаен апартамент',
  kashta: 'къща',
};
const FLOOR_NAMES: Record<FloorKind, string> = {
  ribena: 'паркет рибена кост',
  laminat: 'ламинат',
  granit: 'гранитогрес',
};
const CLASS_NAMES: Record<MaterialClass, string> = { ikon: 'икономичен', sreden: 'среден', visok: 'висок' };

/** UTF-8 text as Base64 (read by the contact form). */
const toBase64 = (text: string): string => btoa(String.fromCharCode(...new TextEncoder().encode(text)));

export function initConfigurator(): void {
  const form = $<HTMLFormElement>('[data-kn]');
  if (!form) return;
  const holder = $('#kn-platno');
  const rows = $<HTMLTableSectionElement>('[data-pera]');
  const total = $('[data-sbor]');
  const perM2 = $('[data-na-m2]');
  const areaOut = $('[data-plosht-out]');
  const areaBig = $('[data-plosht-n]');
  const inquiry = $<HTMLAnchorElement>('[data-zapitvane]');
  const area = $<HTMLInputElement>('#kn-plosht', form);
  if (!rows || !total || !perM2 || !areaOut || !inquiry || !area) return;

  // The original used an inline onsubmit="return false" (blocked by the CSP); same effect here.
  form.addEventListener('submit', (e) => e.preventDefault());

  const input = (name: string, value: string) =>
    $<HTMLInputElement>(`input[name="${name}"][value="${CSS.escape(value)}"]`, form);

  const read = (): ConfiguratorState => {
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) ?? '');
    return {
      vid: get('vid') as HomeKind,
      plosht: Number(get('plosht')),
      stroeja: get('stroeja') as Building,
      obhvat: data.getAll('obhvat').map(String),
      pod: get('pod') as FloorKind,
      steni: get('steni'),
      kuhnya: get('kuhnya'),
      klas: get('klas') as MaterialClass,
    };
  };

  // Count-up of the total (snaps with reduced motion).
  let shownRange: [number, number] = [0, 0];
  const label = (min: number, max: number) =>
    min + max === 0 ? 'Изберете пера' : `${euro(min)} до ${euro(max)}`;
  const showTotal = (min: number, max: number) => {
    const [fromMin, fromMax] = shownRange;
    shownRange = [min, max];
    if (prefersReducedMotion) {
      total.textContent = label(min, max);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 600);
      const e = 1 - Math.pow(1 - k, 3);
      total.textContent =
        min + max === 0
          ? 'Изберете пера'
          : `${euro(fromMin + (min - fromMin) * e)} до ${euro(fromMax + (max - fromMax) * e)}`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => {
      total.textContent = label(min, max);
    }, 800);
  };

  const render = (): ConfiguratorState => {
    const state = read();
    const p = price(state);

    const cells = p.lines.map((line) => {
      const tr = document.createElement('tr');
      for (const text of [line.name, euro(line.min), euro(line.max)]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      return tr;
    });
    if (!cells.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = 'Изберете поне едно перо.';
      tr.append(td);
      cells.push(tr);
    }
    rows.replaceChildren(...cells);

    showTotal(p.min, p.max);
    perM2.textContent = p.min ? `≈ ${p.perM2[0]} до ${p.perM2[1]} € на м²` : '';
    areaOut.textContent = `${state.plosht} м²`;
    if (areaBig) areaBig.textContent = String(state.plosht);

    const summary = [
      `Жилище: ${HOME_NAMES[state.vid]}, ${state.plosht} м², ${state.stroeja === 'staro' ? 'старо' : 'ново'} строителство`,
      `Ремонт: ${state.obhvat.map((k) => ITEM_NAMES[k]).join(', ') || 'не е избрано'}`,
      `Под: ${FLOOR_NAMES[state.pod]}; клас на материалите: ${CLASS_NAMES[state.klas]}`,
      p.min ? `Ориентировъчно по конструктора: ${euro(p.min)} до ${euro(p.max)}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    inquiry.href = `/kontakti/?konstruktor=${encodeURIComponent(toBase64(summary))}#forma`;
    return state;
  };

  /** Keeps the choices in the address bar, so "Копирай връзката" shares them. */
  const saveToUrl = (s: ConfiguratorState) => {
    const params = new URLSearchParams({
      v: s.vid,
      p: String(s.plosht),
      s: s.stroeja,
      o: s.obhvat.join('.'),
      f: s.pod,
      w: s.steni.slice(1),
      k: s.kuhnya.slice(1),
      c: s.klas,
    });
    history.replaceState(null, '', `${location.pathname}?${params}`);
  };

  const loadFromUrl = () => {
    const params = new URLSearchParams(location.search);
    if (!params.get('v')) return;
    const check = (name: string, value: string | null) => {
      const el = value === null ? null : input(name, value);
      if (el) el.checked = true;
    };
    check('vid', params.get('v'));
    check('stroeja', params.get('s'));
    check('pod', params.get('f'));
    check('steni', '#' + (params.get('w') ?? ''));
    check('kuhnya', '#' + (params.get('k') ?? ''));
    check('klas', params.get('c'));
    const p = params.get('p');
    if (p) area.value = p;
    const o = params.get('o');
    if (o !== null) {
      const selected = o.split('.');
      $$<HTMLInputElement>('input[name="obhvat"]', form).forEach((el) => {
        el.checked = selected.includes(el.value);
      });
    }
  };

  loadFromUrl();
  const scene: ConfiguratorScene | null = holder ? createConfiguratorScene(holder) : null;
  let before = false;

  const viewButtons = $$<HTMLButtonElement>('[data-izgled]');
  const pressView = (active: string) =>
    viewButtons.forEach((b) => {
      if (b.dataset['izgled'] !== 'vartene')
        b.setAttribute('aria-pressed', String(b.dataset['izgled'] === active));
    });

  const update = () => {
    const state = render();
    saveToUrl(state);
    if (scene) {
      scene.scope(state.obhvat as Scope[], before);
      scene.floor(state.pod);
      scene.walls(state.steni);
      scene.kitchen(state.kuhnya);
    }
  };

  form.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.name === 'vid') area.value = target.dataset['plosht'] ?? area.value;
    if (target.name === 'stroeja') {
      // New buildings need no demolition or new windows by default.
      const isNew = target.value === 'novo';
      for (const key of ['izkartvane', 'dograma']) {
        const el = input('obhvat', key);
        if (el) el.checked = !isNew;
      }
    }
    if (target.name === 'obhvat' && before) {
      before = false;
      pressView('sled');
    }
    update();
  });

  $$<HTMLButtonElement>('[data-vsichki]').forEach((button) =>
    button.addEventListener('click', () => {
      const on = button.dataset['vsichki'] === '1';
      $$<HTMLInputElement>('input[name="obhvat"]', form).forEach((el) => {
        el.checked = on;
      });
      update();
    }),
  );

  viewButtons.forEach((button) =>
    button.addEventListener('click', () => {
      const kind = button.dataset['izgled'];
      if (kind === 'vartene') {
        const on = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(on));
        scene?.rotate(on);
        return;
      }
      if (kind === 'predi') {
        before = true;
        pressView('predi');
        update();
        return;
      }
      if (kind === 'sled') {
        before = false;
        pressView('sled');
        update();
        scene?.view('sled' satisfies View);
        return;
      }
      if (kind === 'otgore') {
        pressView(before ? 'predi' : 'sled');
        button.setAttribute('aria-pressed', 'true');
        scene?.view('otgore');
      }
    }),
  );

  update();
}

initConfigurator();
