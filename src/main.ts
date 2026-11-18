import './styles/styles.css';
import { initDatabase } from './db/database';
import { JardinView } from './views/jardinView';
import { JardinController } from './controllers/jardinController';

async function arrancar(): Promise<void> {
  const raiz = document.getElementById('app');
  if (!raiz) return;

  const vista = new JardinView(raiz);
  vista.mostrarCargando();

  try {
    await initDatabase();
    new JardinController(vista).iniciar();
  } catch (error) {
    console.error(error);
    vista.mostrarError('No se pudo abrir la base de datos del jardín.');
  }
}

void arrancar();
