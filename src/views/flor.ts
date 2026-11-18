import type { EmocionInfo } from '../models/recuerdo';

interface Forma {
  petalos: number;
  rx: number;
  ry: number;
  centro: number;
  doble: boolean;
}

/** Cada emoción tiene su propia flor con forma distinta. */
const FORMAS: Record<string, Forma> = {
  alegria: { petalos: 13, rx: 4.5, ry: 14, centro: 11, doble: false }, // girasol
  amor: { petalos: 8, rx: 9, ry: 11, centro: 6, doble: true }, // rosa
  nostalgia: { petalos: 6, rx: 5, ry: 15, centro: 5, doble: false }, // lavanda
  tristeza: { petalos: 5, rx: 8, ry: 11, centro: 5, doble: false }, // nomeolvides
  gratitud: { petalos: 11, rx: 4, ry: 14, centro: 7, doble: false }, // margarita
  esperanza: { petalos: 6, rx: 9, ry: 16, centro: 5, doble: false }, // tulipán
};

const VERDE = '#4caf50';
const VERDE_OSCURO = '#2e7d32';
const TIERRA = '#6b4429';

function hoja(x: number, y: number, escala: number, lado: 1 | -1): string {
  return `<path d="M0,0 C-14,-4 -22,-16 -24,-26 C-10,-24 -2,-14 0,0Z" fill="${VERDE}" stroke="${VERDE_OSCURO}" stroke-width="1" transform="translate(${x} ${y}) scale(${(lado * escala).toFixed(2)} ${escala.toFixed(2)})"/>`;
}

/**
 * Dibuja una planta en SVG.
 * g es el crecimiento (0 a 1): brote → capullo → flor abierta.
 */
export function dibujarFlor(info: EmocionInfo, g: number): string {
  const forma = FORMAS[info.id] ?? FORMAS.alegria;
  const suelo = 150;
  const alto = 34 + 76 * g;
  const cx = 60;
  const cy = suelo - alto;
  const escalaHoja = 0.55 + 0.45 * g;

  let partes = '';

  // Montículo de tierra
  partes += `<ellipse cx="60" cy="152" rx="34" ry="7" fill="${TIERRA}"/>`;
  partes += `<ellipse cx="60" cy="150" rx="26" ry="5" fill="#7d5233"/>`;

  // Tallo
  partes += `<path d="M60,150 C56,${(suelo - alto * 0.35).toFixed(1)} 66,${(suelo - alto * 0.7).toFixed(1)} ${cx},${cy.toFixed(1)}" fill="none" stroke="${VERDE}" stroke-width="4" stroke-linecap="round"/>`;

  // Hojas laterales
  partes += hoja(58, suelo - alto * 0.28, escalaHoja, -1);
  partes += hoja(63, suelo - alto * 0.5, escalaHoja, 1);

  if (g < 0.25) {
    // Brote: dos hojitas en la punta
    partes += `<path d="M0,0 C-8,-2 -13,-9 -14,-16 C-6,-14 -1,-8 0,0Z" fill="${VERDE}" stroke="${VERDE_OSCURO}" stroke-width="1" transform="translate(${cx} ${cy.toFixed(1)})"/>`;
    partes += `<path d="M0,0 C8,-2 13,-9 14,-16 C6,-14 1,-8 0,0Z" fill="${VERDE}" stroke="${VERDE_OSCURO}" stroke-width="1" transform="translate(${cx} ${cy.toFixed(1)})"/>`;
  } else if (g < 0.6) {
    // Capullo cerrado
    partes += `<ellipse cx="${cx}" cy="${(cy - 2).toFixed(1)}" rx="7" ry="10" fill="${info.petalo}" stroke="rgba(0,0,0,.18)" stroke-width="1"/>`;
    partes += `<path d="M${cx - 8},${(cy + 3).toFixed(1)} Q${cx},${(cy + 14).toFixed(1)} ${cx + 8},${(cy + 3).toFixed(1)} Q${cx},${(cy - 3).toFixed(1)} ${cx - 8},${(cy + 3).toFixed(1)}Z" fill="${VERDE}" stroke="${VERDE_OSCURO}" stroke-width="1"/>`;
  } else {
    // Flor abierta: crece de tamaño hasta g = 1
    const t = (g - 0.6) / 0.4;
    const s = 0.55 + 0.45 * t;
    const anillo = (escala: number, desfase: number): string => {
      let p = '';
      for (let i = 0; i < forma.petalos; i++) {
        const angulo = desfase + (i * 360) / forma.petalos;
        const y = -(forma.centro * 0.7 + forma.ry) * escala;
        p += `<ellipse cx="0" cy="${y.toFixed(1)}" rx="${(forma.rx * escala).toFixed(1)}" ry="${(forma.ry * escala).toFixed(1)}" fill="${info.petalo}" stroke="rgba(0,0,0,.16)" stroke-width="0.8" transform="rotate(${angulo.toFixed(1)})"/>`;
      }
      return p;
    };

    partes += `<g transform="translate(${cx} ${cy.toFixed(1)}) scale(${s.toFixed(2)})">`;
    partes += anillo(1, 0);
    if (forma.doble) {
      partes += anillo(0.68, 180 / forma.petalos);
    }
    partes += `<circle r="${forma.centro}" fill="${info.centro}" stroke="rgba(0,0,0,.2)" stroke-width="0.8"/>`;
    if (info.id === 'alegria') {
      // Semillitas del girasol
      for (let i = 0; i < 7; i++) {
        const a = (i * 2 * Math.PI) / 7;
        partes += `<circle cx="${(Math.cos(a) * 5).toFixed(1)}" cy="${(Math.sin(a) * 5).toFixed(1)}" r="1.2" fill="#3b2208"/>`;
      }
    }
    partes += `</g>`;
  }

  return `<svg viewBox="0 0 120 160" role="img" aria-hidden="true" focusable="false">${partes}</svg>`;
}
