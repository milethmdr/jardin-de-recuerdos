import initSqlJs from 'sql.js';
import type { Database, SqlValue } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

/**
 * Capa de acceso a SQLite (sql.js = SQLite compilado a WebAssembly).
 * La base de datos vive en memoria y se guarda completa en localStorage
 * después de cada escritura, así los datos persisten entre sesiones.
 */

const STORAGE_KEY = 'jardin-recuerdos-sqlite-v1';

let db: Database | null = null;
let baseNueva = false;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function cargarGuardada(): Uint8Array | null {
  try {
    const guardada = localStorage.getItem(STORAGE_KEY);
    return guardada ? base64ToBytes(guardada) : null;
  } catch {
    return null;
  }
}

function crearEsquema(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS recuerdos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo      TEXT    NOT NULL,
      texto       TEXT    NOT NULL DEFAULT '',
      emocion     TEXT    NOT NULL,
      fecha       TEXT    NOT NULL,
      plantado_en TEXT    NOT NULL,
      riegos      INTEGER NOT NULL DEFAULT 0
    );
  `);
  database.run('CREATE INDEX IF NOT EXISTS idx_recuerdos_emocion ON recuerdos (emocion);');
  database.run('CREATE INDEX IF NOT EXISTS idx_recuerdos_fecha ON recuerdos (fecha);');
}

/** Abre la base de datos (desde localStorage si existe) y crea el esquema. */
export async function initDatabase(): Promise<void> {
  if (db) return;

  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const guardada = cargarGuardada();

  if (guardada) {
    try {
      db = new SQL.Database(guardada);
      crearEsquema(db);
      return;
    } catch {
      // La copia guardada estaba dañada: se empieza con un jardín nuevo.
      db = null;
    }
  }

  db = new SQL.Database();
  baseNueva = true;
  crearEsquema(db);
  persistir();
}

/** true solo la primera vez que se crea el jardín (sirve para sembrar ejemplos). */
export function esBaseNueva(): boolean {
  return baseNueva;
}

function getDb(): Database {
  if (!db) {
    throw new Error('La base de datos todavía no está inicializada.');
  }
  return db;
}

/** Guarda la base de datos completa en localStorage. */
export function persistir(): void {
  try {
    const datos = getDb().export();
    localStorage.setItem(STORAGE_KEY, bytesToBase64(datos));
  } catch (error) {
    console.warn('No se pudo guardar el jardín en el navegador:', error);
  }
}

/** Ejecuta INSERT / UPDATE / DELETE y guarda los cambios. */
export function ejecutar(sql: string, params: SqlValue[] = []): void {
  getDb().run(sql, params);
  persistir();
}

/** Ejecuta un SELECT y devuelve las filas como objetos. */
export function consultar<T>(sql: string, params: SqlValue[] = []): T[] {
  const stmt = getDb().prepare(sql);
  try {
    stmt.bind(params);
    const filas: T[] = [];
    while (stmt.step()) {
      filas.push(stmt.getAsObject() as unknown as T);
    }
    return filas;
  } finally {
    stmt.free();
  }
}

/** Id de la última fila insertada. */
export function ultimoId(): number {
  const filas = consultar<{ id: number }>('SELECT last_insert_rowid() AS id');
  return filas[0].id;
}
