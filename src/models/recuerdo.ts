import { consultar, ejecutar, ultimoId } from '../db/database';
import type { SqlValue } from 'sql.js';

export type Emocion = 'alegria' | 'amor' | 'nostalgia' | 'tristeza' | 'gratitud' | 'esperanza';

export interface EmocionInfo {
  id: Emocion;
  nombre: string;
  emoji: string;
  flor: string;
  petalo: string;
  centro: string;
}

export const EMOCIONES: EmocionInfo[] = [
  { id: 'alegria', nombre: 'Alegría', emoji: '😄', flor: 'Girasol', petalo: '#ffc933', centro: '#7a4a12' },
  { id: 'amor', nombre: 'Amor', emoji: '💗', flor: 'Rosa', petalo: '#f06292', centro: '#b0245a' },
  { id: 'nostalgia', nombre: 'Nostalgia', emoji: '🌙', flor: 'Lavanda', petalo: '#a78bfa', centro: '#5b3fb0' },
  { id: 'tristeza', nombre: 'Tristeza', emoji: '🌧️', flor: 'Nomeolvides', petalo: '#6cb2f5', centro: '#f5d76e' },
  { id: 'gratitud', nombre: 'Gratitud', emoji: '🙏', flor: 'Margarita', petalo: '#fdfdf5', centro: '#f2b705' },
  { id: 'esperanza', nombre: 'Esperanza', emoji: '🌅', flor: 'Tulipán', petalo: '#ff8a5b', centro: '#c2410c' },
];

export function infoEmocion(id: string): EmocionInfo {
  return EMOCIONES.find((e) => e.id === id) ?? EMOCIONES[0];
}

export interface Recuerdo {
  id: number;
  titulo: string;
  texto: string;
  emocion: Emocion;
  fecha: string; // fecha del recuerdo (YYYY-MM-DD)
  plantado_en: string; // momento en que se plantó (ISO)
  riegos: number;
}

export interface DatosRecuerdo {
  titulo: string;
  texto: string;
  emocion: Emocion;
  fecha: string;
}

export type Orden = 'recientes' | 'antiguos' | 'regados';

export interface Filtros {
  emocion: Emocion | 'todas';
  desde: string;
  hasta: string;
  busqueda: string;
  orden: Orden;
}

export const FILTROS_INICIALES: Filtros = {
  emocion: 'todas',
  desde: '',
  hasta: '',
  busqueda: '',
  orden: 'recientes',
};

/* ---------- CRUD ---------- */

export function crear(datos: DatosRecuerdo): number {
  ejecutar(
    `INSERT INTO recuerdos (titulo, texto, emocion, fecha, plantado_en, riegos)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [datos.titulo, datos.texto, datos.emocion, datos.fecha, new Date().toISOString()],
  );
  return ultimoId();
}

export function listar(filtros: Filtros = FILTROS_INICIALES): Recuerdo[] {
  const condiciones: string[] = [];
  const params: SqlValue[] = [];

  if (filtros.emocion !== 'todas') {
    condiciones.push('emocion = ?');
    params.push(filtros.emocion);
  }
  if (filtros.desde) {
    condiciones.push('fecha >= ?');
    params.push(filtros.desde);
  }
  if (filtros.hasta) {
    condiciones.push('fecha <= ?');
    params.push(filtros.hasta);
  }
  const busqueda = filtros.busqueda.trim();
  if (busqueda) {
    condiciones.push('(titulo LIKE ? OR texto LIKE ?)');
    params.push(`%${busqueda}%`, `%${busqueda}%`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const orden =
    filtros.orden === 'antiguos'
      ? 'fecha ASC, id ASC'
      : filtros.orden === 'regados'
        ? 'riegos DESC, fecha DESC'
        : 'fecha DESC, id DESC';

  return consultar<Recuerdo>(`SELECT * FROM recuerdos ${where} ORDER BY ${orden}`, params);
}

export function obtener(id: number): Recuerdo | undefined {
  return consultar<Recuerdo>('SELECT * FROM recuerdos WHERE id = ?', [id])[0];
}

export function actualizar(id: number, datos: DatosRecuerdo): void {
  ejecutar('UPDATE recuerdos SET titulo = ?, texto = ?, emocion = ?, fecha = ? WHERE id = ?', [
    datos.titulo,
    datos.texto,
    datos.emocion,
    datos.fecha,
    id,
  ]);
}

export function eliminar(id: number): void {
  ejecutar('DELETE FROM recuerdos WHERE id = ?', [id]);
}

/** Regar una flor: sube su contador de riegos y la hace crecer más rápido. */
export function regar(id: number): void {
  ejecutar('UPDATE recuerdos SET riegos = riegos + 1 WHERE id = ?', [id]);
}

/* ---------- Estadísticas ---------- */

export interface Resumen {
  total: number;
  porEmocion: Record<string, number>;
}

export function resumen(): Resumen {
  const filas = consultar<{ emocion: string; n: number }>(
    'SELECT emocion, COUNT(*) AS n FROM recuerdos GROUP BY emocion',
  );
  const porEmocion: Record<string, number> = {};
  let total = 0;
  for (const fila of filas) {
    porEmocion[fila.emocion] = fila.n;
    total += fila.n;
  }
  return { total, porEmocion };
}

/* ---------- Crecimiento ---------- */

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_PARA_FLORECER = 14;

/** Devuelve un valor de 0 a 1: edad en días + 2 días extra por cada riego. */
export function crecimiento(r: Recuerdo): number {
  const dias = Math.max(0, (Date.now() - Date.parse(r.plantado_en)) / DIA_MS);
  return Math.min(1, (dias + r.riegos * 2) / DIAS_PARA_FLORECER);
}

export function etapa(g: number): string {
  if (g < 0.25) return 'Brote';
  if (g < 0.6) return 'Capullo';
  if (g < 1) return 'Floreciendo';
  return 'En plena flor';
}

/* ---------- Datos de ejemplo (solo la primera vez) ---------- */

function fechaLocal(diasAtras: number): string {
  const d = new Date(Date.now() - diasAtras * DIA_MS);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function hoy(): string {
  return fechaLocal(0);
}

export function sembrarEjemplos(): void {
  const ejemplos: Array<DatosRecuerdo & { diasPlantado: number; riegos: number }> = [
    {
      titulo: 'Las tardes en casa de la abuela',
      texto: 'El olor a pan recién hecho y las historias que contaba mientras caía el sol.',
      emocion: 'nostalgia',
      fecha: fechaLocal(400),
      diasPlantado: 16,
      riegos: 3,
    },
    {
      titulo: 'Mi primer día en la universidad',
      texto: 'Estaba nervioso, pero conocí a personas que hoy son mis mejores amigos.',
      emocion: 'esperanza',
      fecha: fechaLocal(120),
      diasPlantado: 7,
      riegos: 1,
    },
    {
      titulo: 'Un “gracias” inesperado',
      texto: 'Un desconocido me ayudó con mis cosas bajo la lluvia y no quiso aceptar nada a cambio.',
      emocion: 'gratitud',
      fecha: fechaLocal(10),
      diasPlantado: 1,
      riegos: 0,
    },
  ];

  for (const e of ejemplos) {
    const plantado = new Date(Date.now() - e.diasPlantado * DIA_MS).toISOString();
    ejecutar(
      `INSERT INTO recuerdos (titulo, texto, emocion, fecha, plantado_en, riegos)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [e.titulo, e.texto, e.emocion, e.fecha, plantado, e.riegos],
    );
  }
}
