import {
  FILTROS_INICIALES,
  actualizar,
  crear,
  eliminar,
  listar,
  obtener,
  regar,
  resumen,
  sembrarEjemplos,
} from '../models/recuerdo';
import type { DatosRecuerdo, Filtros } from '../models/recuerdo';
import { esBaseNueva } from '../db/database';
import type { JardinView } from '../views/jardinView';

/** Coordina el modelo (SQLite) con la vista (DOM). */
export class JardinController {
  private filtros: Filtros = { ...FILTROS_INICIALES };

  constructor(private readonly vista: JardinView) {}

  iniciar(): void {
    this.vista.enlazar({
      onGuardar: (datos, id) => this.guardar(datos, id),
      onEditar: (id) => this.editar(id),
      onRegar: (id) => this.regar(id),
      onEliminar: (id) => this.eliminar(id),
      onFiltrar: (filtros) => {
        this.filtros = filtros;
        this.refrescar();
      },
    });

    // Solo la primera vez que se abre el sitio se siembran 3 recuerdos de ejemplo.
    if (esBaseNueva()) {
      sembrarEjemplos();
    }

    this.refrescar();
  }

  private refrescar(): void {
    this.vista.renderizar(listar(this.filtros), resumen(), this.filtros);
  }

  private guardar(datos: DatosRecuerdo, id: number | null): void {
    try {
      if (id === null) {
        crear(datos);
        this.vista.mostrarMensaje('🌱 ¡Recuerdo plantado!');
      } else {
        actualizar(id, datos);
        this.vista.mostrarMensaje('✏️ Recuerdo actualizado');
      }
      this.refrescar();
    } catch (error) {
      console.error(error);
      this.vista.mostrarMensaje('No se pudo guardar el recuerdo. Inténtalo de nuevo.');
    }
  }

  private editar(id: number): void {
    const recuerdo = obtener(id);
    if (recuerdo) {
      this.vista.abrirFormulario(recuerdo);
    }
  }

  private regar(id: number): void {
    regar(id);
    this.vista.mostrarMensaje('💧 ¡Tu flor agradece el riego!');
    this.refrescar();
  }

  private eliminar(id: number): void {
    eliminar(id);
    this.vista.mostrarMensaje('🍂 Flor arrancada del jardín');
    this.refrescar();
  }
}
