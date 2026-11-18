import {
  EMOCIONES,
  crecimiento,
  etapa,
  hoy,
  infoEmocion,
} from '../models/recuerdo';
import type { DatosRecuerdo, Emocion, Filtros, Orden, Recuerdo, Resumen } from '../models/recuerdo';
import { dibujarFlor } from './flor';

export interface Manejadores {
  onGuardar(datos: DatosRecuerdo, id: number | null): void;
  onEditar(id: number): void;
  onRegar(id: number): void;
  onEliminar(id: number): void;
  onFiltrar(filtros: Filtros): void;
}

function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatearFecha(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  if (!a || !m || !d) return iso;
  return new Date(a, m - 1, d).toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export class JardinView {
  private handlers: Manejadores | null = null;
  private emocionActiva: Emocion | 'todas' = 'todas';
  private editandoId: number | null = null;
  private idPorBorrar: number | null = null;
  private temporizadorMensaje: number | undefined;

  constructor(private readonly root: HTMLElement) {}

  /* ---------- Utilidades ---------- */

  private $<T extends HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`No se encontró el elemento ${selector}`);
    return el;
  }

  private get handlersSeguros(): Manejadores {
    if (!this.handlers) throw new Error('La vista no está enlazada a un controlador.');
    return this.handlers;
  }

  /* ---------- Montaje inicial ---------- */

  mostrarCargando(): void {
    this.root.innerHTML = `
      <div class="cargando" role="status">
        <div class="cargando-brote">🌱</div>
        <p>Preparando el jardín…</p>
      </div>`;
  }

  mostrarError(mensaje: string): void {
    this.root.innerHTML = `
      <div class="cargando" role="alert">
        <div class="cargando-brote">🥀</div>
        <p>${esc(mensaje)}</p>
        <button class="btn btn-primario" type="button" onclick="location.reload()">Reintentar</button>
      </div>`;
  }

  enlazar(handlers: Manejadores): void {
    this.handlers = handlers;
    this.montar();
  }

  private montar(): void {
    const opcionesEmocion = EMOCIONES.map(
      (e, i) => `
        <label class="opcion">
          <input type="radio" name="emocion" value="${e.id}" ${i === 0 ? 'checked' : ''} />
          <span><span class="opcion-emoji" aria-hidden="true">${e.emoji}</span> ${e.nombre}<small>${e.flor}</small></span>
        </label>`,
    ).join('');

    this.root.innerHTML = `
      <header class="cabecera">
        <div class="cabecera-texto">
          <p class="sobretitulo">Un rincón para lo que no quieres olvidar</p>
          <h1>El Jardín de los <em>Recuerdos</em></h1>
          <p class="lema">Planta un recuerdo, riégalo y míralo crecer como una flor.</p>
        </div>
        <button class="btn btn-primario btn-plantar" type="button" data-accion="nuevo">
          <span aria-hidden="true">🌱</span> Plantar un recuerdo
        </button>
      </header>

      <main class="contenido">
        <section class="panel" aria-label="Filtros del jardín">
          <div class="chips" id="chips" role="group" aria-label="Filtrar por emoción"></div>
          <div class="filtros">
            <label class="campo campo-busqueda">
              <span>Buscar</span>
              <input type="search" id="f-busqueda" placeholder="Palabra en el título o el texto…" autocomplete="off" />
            </label>
            <label class="campo">
              <span>Desde</span>
              <input type="date" id="f-desde" />
            </label>
            <label class="campo">
              <span>Hasta</span>
              <input type="date" id="f-hasta" />
            </label>
            <label class="campo">
              <span>Ordenar por</span>
              <select id="f-orden">
                <option value="recientes">Recuerdo más reciente</option>
                <option value="antiguos">Recuerdo más antiguo</option>
                <option value="regados">Más regados</option>
              </select>
            </label>
            <button class="btn btn-suave" type="button" data-accion="limpiar">Limpiar</button>
          </div>
        </section>

        <p class="conteo" id="conteo" aria-live="polite"></p>
        <section class="jardin" id="jardin" aria-label="Tus recuerdos"></section>
      </main>

      <footer class="pie">
        <p>Tus recuerdos viven en una base de datos SQLite dentro de tu navegador. 🌿</p>
      </footer>

      <dialog id="dlg-form" aria-labelledby="dlg-titulo">
        <form id="form" class="dialogo" novalidate>
          <h2 id="dlg-titulo">Plantar un recuerdo</h2>

          <label class="campo">
            <span>Título</span>
            <input type="text" name="titulo" id="in-titulo" maxlength="80" required placeholder="Ej. El día que vi el mar" />
          </label>

          <label class="campo">
            <span>¿Qué quieres recordar?</span>
            <textarea name="texto" id="in-texto" rows="4" maxlength="500" placeholder="Escribe una frase, un detalle, un olor, una voz…"></textarea>
          </label>

          <label class="campo">
            <span>Fecha del recuerdo</span>
            <input type="date" name="fecha" id="in-fecha" required />
          </label>

          <fieldset class="emociones">
            <legend>¿Qué sentiste? Cada emoción da una flor distinta</legend>
            <div class="opciones">${opcionesEmocion}</div>
          </fieldset>

          <p class="error-form" id="error-form" role="alert" hidden></p>

          <div class="dialogo-acciones">
            <button class="btn btn-suave" type="button" data-accion="cerrar-form">Cancelar</button>
            <button class="btn btn-primario" type="submit" id="btn-guardar">Plantar</button>
          </div>
        </form>
      </dialog>

      <dialog id="dlg-borrar" aria-labelledby="borrar-titulo">
        <div class="dialogo">
          <h2 id="borrar-titulo">¿Arrancar esta flor?</h2>
          <p id="borrar-texto"></p>
          <p class="aviso">Esta acción no se puede deshacer.</p>
          <div class="dialogo-acciones">
            <button class="btn btn-suave" type="button" data-accion="cerrar-borrar">Conservar</button>
            <button class="btn btn-peligro" type="button" data-accion="confirmar-borrar">Sí, arrancar</button>
          </div>
        </div>
      </dialog>

      <div class="toast" id="toast" role="status" aria-live="polite"></div>
    `;

    this.registrarEventos();
  }

  /* ---------- Eventos ---------- */

  private registrarEventos(): void {
    this.root.addEventListener('click', (ev) => {
      const objetivo = ev.target as HTMLElement;

      // Clic sobre el fondo oscuro de un <dialog> = cerrarlo
      if (objetivo instanceof HTMLDialogElement) {
        objetivo.close();
        return;
      }

      const chip = objetivo.closest<HTMLElement>('[data-filtro-emocion]');
      if (chip) {
        this.emocionActiva = chip.dataset.filtroEmocion as Emocion | 'todas';
        this.emitirFiltros();
        return;
      }

      const boton = objetivo.closest<HTMLElement>('[data-accion]');
      if (!boton) return;
      const id = Number(boton.dataset.id);

      switch (boton.dataset.accion) {
        case 'nuevo':
          this.abrirFormulario();
          break;
        case 'cerrar-form':
          this.$<HTMLDialogElement>('#dlg-form').close();
          break;
        case 'regar':
          this.handlersSeguros.onRegar(id);
          break;
        case 'editar':
          this.handlersSeguros.onEditar(id);
          break;
        case 'eliminar':
          this.pedirConfirmacionBorrado(id, boton.dataset.titulo ?? '');
          break;
        case 'cerrar-borrar':
          this.$<HTMLDialogElement>('#dlg-borrar').close();
          break;
        case 'confirmar-borrar':
          if (this.idPorBorrar !== null) {
            this.handlersSeguros.onEliminar(this.idPorBorrar);
            this.idPorBorrar = null;
          }
          this.$<HTMLDialogElement>('#dlg-borrar').close();
          break;
        case 'limpiar':
          this.limpiarFiltros();
          break;
      }
    });

    const filtrosPanel = this.$<HTMLElement>('.panel');
    filtrosPanel.addEventListener('input', () => this.emitirFiltros());
    filtrosPanel.addEventListener('change', () => this.emitirFiltros());

    this.$<HTMLFormElement>('#form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      this.enviarFormulario();
    });
  }

  private leerFiltros(): Filtros {
    return {
      emocion: this.emocionActiva,
      busqueda: this.$<HTMLInputElement>('#f-busqueda').value,
      desde: this.$<HTMLInputElement>('#f-desde').value,
      hasta: this.$<HTMLInputElement>('#f-hasta').value,
      orden: this.$<HTMLSelectElement>('#f-orden').value as Orden,
    };
  }

  private emitirFiltros(): void {
    this.handlersSeguros.onFiltrar(this.leerFiltros());
  }

  private limpiarFiltros(): void {
    this.emocionActiva = 'todas';
    this.$<HTMLInputElement>('#f-busqueda').value = '';
    this.$<HTMLInputElement>('#f-desde').value = '';
    this.$<HTMLInputElement>('#f-hasta').value = '';
    this.$<HTMLSelectElement>('#f-orden').value = 'recientes';
    this.emitirFiltros();
  }

  /* ---------- Formulario ---------- */

  abrirFormulario(recuerdo?: Recuerdo): void {
    this.editandoId = recuerdo ? recuerdo.id : null;

    this.$<HTMLElement>('#dlg-titulo').textContent = recuerdo ? 'Editar recuerdo' : 'Plantar un recuerdo';
    this.$<HTMLElement>('#btn-guardar').textContent = recuerdo ? 'Guardar cambios' : 'Plantar';
    this.$<HTMLInputElement>('#in-titulo').value = recuerdo?.titulo ?? '';
    this.$<HTMLTextAreaElement>('#in-texto').value = recuerdo?.texto ?? '';

    const fecha = this.$<HTMLInputElement>('#in-fecha');
    fecha.max = hoy();
    fecha.value = recuerdo?.fecha ?? hoy();

    const emocion = recuerdo?.emocion ?? EMOCIONES[0].id;
    const radio = this.root.querySelector<HTMLInputElement>(`input[name="emocion"][value="${emocion}"]`);
    if (radio) radio.checked = true;

    const error = this.$<HTMLElement>('#error-form');
    error.hidden = true;
    error.textContent = '';

    this.$<HTMLDialogElement>('#dlg-form').showModal();
    this.$<HTMLInputElement>('#in-titulo').focus();
  }

  private enviarFormulario(): void {
    const titulo = this.$<HTMLInputElement>('#in-titulo').value.trim();
    const texto = this.$<HTMLTextAreaElement>('#in-texto').value.trim();
    const fecha = this.$<HTMLInputElement>('#in-fecha').value;
    const marcada = this.root.querySelector<HTMLInputElement>('input[name="emocion"]:checked');
    const error = this.$<HTMLElement>('#error-form');

    let mensaje = '';
    if (!titulo) {
      mensaje = 'Dale un título a tu recuerdo.';
    } else if (!fecha) {
      mensaje = 'Elige la fecha del recuerdo.';
    } else if (fecha > hoy()) {
      mensaje = 'La fecha del recuerdo no puede estar en el futuro.';
    }

    if (mensaje) {
      error.textContent = mensaje;
      error.hidden = false;
      return;
    }

    const datos: DatosRecuerdo = {
      titulo,
      texto,
      fecha,
      emocion: (marcada?.value ?? EMOCIONES[0].id) as Emocion,
    };

    this.$<HTMLDialogElement>('#dlg-form').close();
    this.handlersSeguros.onGuardar(datos, this.editandoId);
    this.editandoId = null;
  }

  /* ---------- Borrado ---------- */

  private pedirConfirmacionBorrado(id: number, titulo: string): void {
    this.idPorBorrar = id;
    this.$<HTMLElement>('#borrar-texto').textContent = `Vas a arrancar «${titulo}» de tu jardín.`;
    this.$<HTMLDialogElement>('#dlg-borrar').showModal();
  }

  /* ---------- Mensajes ---------- */

  mostrarMensaje(texto: string): void {
    const toast = this.$<HTMLElement>('#toast');
    toast.textContent = texto;
    toast.classList.add('visible');
    window.clearTimeout(this.temporizadorMensaje);
    this.temporizadorMensaje = window.setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  /* ---------- Render ---------- */

  renderizar(recuerdos: Recuerdo[], resumen: Resumen, filtros: Filtros): void {
    this.emocionActiva = filtros.emocion;
    this.sincronizarCampos(filtros);
    this.renderizarChips(resumen);

    const hayFiltros =
      filtros.emocion !== 'todas' || filtros.busqueda.trim() !== '' || filtros.desde !== '' || filtros.hasta !== '';

    const conteo = this.$<HTMLElement>('#conteo');
    conteo.textContent =
      resumen.total === 0
        ? ''
        : hayFiltros
          ? `Mostrando ${recuerdos.length} de ${resumen.total} recuerdos`
          : `${resumen.total} ${resumen.total === 1 ? 'flor' : 'flores'} en tu jardín`;

    const jardin = this.$<HTMLElement>('#jardin');

    if (recuerdos.length === 0) {
      jardin.innerHTML =
        resumen.total === 0
          ? `<div class="vacio">
               <div class="vacio-icono" aria-hidden="true">🪴</div>
               <h2>Tu jardín está vacío</h2>
               <p>Planta tu primer recuerdo y míralo florecer.</p>
               <button class="btn btn-primario" type="button" data-accion="nuevo">🌱 Plantar un recuerdo</button>
             </div>`
          : `<div class="vacio">
               <div class="vacio-icono" aria-hidden="true">🔍</div>
               <h2>Ninguna flor coincide</h2>
               <p>Prueba con otros filtros o límpialos para ver todo el jardín.</p>
               <button class="btn btn-suave" type="button" data-accion="limpiar">Limpiar filtros</button>
             </div>`;
      return;
    }

    jardin.innerHTML = recuerdos.map((r) => this.tarjeta(r)).join('');
  }

  private sincronizarCampos(filtros: Filtros): void {
    const campos: Array<[string, string]> = [
      ['#f-busqueda', filtros.busqueda],
      ['#f-desde', filtros.desde],
      ['#f-hasta', filtros.hasta],
      ['#f-orden', filtros.orden],
    ];
    for (const [selector, valor] of campos) {
      const el = this.$<HTMLInputElement | HTMLSelectElement>(selector);
      if (el.value !== valor) el.value = valor;
    }
  }

  private renderizarChips(resumen: Resumen): void {
    const chip = (id: string, etiqueta: string, n: number): string => {
      const activo = this.emocionActiva === id;
      return `<button type="button" class="chip${activo ? ' activo' : ''}" data-filtro-emocion="${id}" aria-pressed="${activo}">
                ${etiqueta} <b>${n}</b>
              </button>`;
    };

    this.$<HTMLElement>('#chips').innerHTML =
      chip('todas', 'Todas', resumen.total) +
      EMOCIONES.map((e) => chip(e.id, `${e.emoji} ${e.nombre}`, resumen.porEmocion[e.id] ?? 0)).join('');
  }

  private tarjeta(r: Recuerdo): string {
    const info = infoEmocion(r.emocion);
    const g = crecimiento(r);
    const pct = Math.round(g * 100);
    const retraso = -((r.id % 5) * 1.3);

    return `
      <article class="tarjeta" style="--petalo:${info.petalo}">
        <div class="parcela" style="--retraso:${retraso}s">${dibujarFlor(info, g)}</div>
        <div class="cuerpo">
          <div class="meta">
            <span class="etiqueta">${info.emoji} ${info.nombre} · ${info.flor}</span>
            <time datetime="${esc(r.fecha)}">${esc(formatearFecha(r.fecha))}</time>
          </div>
          <h3>${esc(r.titulo)}</h3>
          ${r.texto ? `<p class="texto">${esc(r.texto)}</p>` : ''}
          <div class="crecimiento">
            <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Crecimiento de la flor"><span style="width:${pct}%"></span></div>
            <small>${etapa(g)} · ${pct}%</small>
          </div>
          <div class="acciones">
            <button class="btn btn-agua" type="button" data-accion="regar" data-id="${r.id}" aria-label="Regar «${esc(r.titulo)}»">💧 Regar <span class="contador">${r.riegos}</span></button>
            <button class="btn btn-suave" type="button" data-accion="editar" data-id="${r.id}" aria-label="Editar «${esc(r.titulo)}»">✏️ Editar</button>
            <button class="btn btn-peligro-suave" type="button" data-accion="eliminar" data-id="${r.id}" data-titulo="${esc(r.titulo)}" aria-label="Arrancar «${esc(r.titulo)}»">🗑️</button>
          </div>
        </div>
      </article>`;
  }
}
