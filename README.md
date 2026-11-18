# 🌸 El Jardín de los Recuerdos

Un sitio web donde **plantas recuerdos** (un título, un texto, una fecha y una emoción) y los ves **crecer como flores digitales**. Cada emoción tiene su propia flor: girasol (alegría), rosa (amor), lavanda (nostalgia), nomeolvides (tristeza), margarita (gratitud) y tulipán (esperanza).

Las flores pasan por etapas —**brote → capullo → floreciendo → plena flor**— según el tiempo que lleva plantado el recuerdo y las veces que lo has **regado** 💧.

- 🌐 **Sitio desplegado (Vercel):** _pega aquí tu URL de Vercel_
- 🐙 **Repositorio:** _pega aquí tu URL de GitHub_

## ✨ Funcionalidades

| Operación | Cómo se usa en el sitio |
| --- | --- |
| **Crear** | Botón **🌱 Plantar un recuerdo** (título, texto, fecha y emoción). |
| **Leer** | Cada recuerdo aparece como una tarjeta con su flor, en el jardín. |
| **Actualizar** | **✏️ Editar** cambia el contenido; **💧 Regar** suma un riego y hace crecer la flor. |
| **Eliminar** | **🗑️** arranca la flor (con confirmación). |
| **Filtrar** | Por emoción, rango de fechas, texto de búsqueda y orden (reciente, antiguo, más regados). |

Los datos **persisten al recargar la página**. La primera vez que se abre el sitio se plantan 3 recuerdos de ejemplo.

## 🗄️ Cómo usa SQLite

Vercel es *serverless* (sistema de archivos de solo lectura), así que se usa la **Opción B** del laboratorio:

- [`sql.js`](https://github.com/sql-js/sql.js) es SQLite compilado a WebAssembly y corre **dentro del navegador**.
- La base de datos se exporta como bytes y se guarda en **`localStorage`** después de cada escritura (`INSERT`, `UPDATE`, `DELETE`).
- Al abrir el sitio, se vuelve a cargar esa base de datos guardada.

Tabla principal:

```sql
CREATE TABLE recuerdos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo      TEXT    NOT NULL,
  texto       TEXT    NOT NULL DEFAULT '',
  emocion     TEXT    NOT NULL,   -- alegria | amor | nostalgia | tristeza | gratitud | esperanza
  fecha       TEXT    NOT NULL,   -- fecha del recuerdo (YYYY-MM-DD)
  plantado_en TEXT    NOT NULL,   -- cuándo se plantó (ISO), define el crecimiento
  riegos      INTEGER NOT NULL DEFAULT 0
);
```

> Como la base vive en el navegador, cada visitante tiene **su propio jardín** (no se comparte entre dispositivos).

## 🧰 Tecnologías

- [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [sql.js](https://github.com/sql-js/sql.js) (SQLite en el navegador)
- SVG generado por código para las flores, HTML y CSS (sin frameworks)
- [Vercel](https://vercel.com/) para el despliegue y [GitHub](https://github.com/) para el código

## 📁 Estructura

```
jardin-de-recuerdos/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
├── public/
│   └── favicon.svg
└── src/
    ├── main.ts                        ← arranque de la app
    ├── db/database.ts                 ← conexión SQLite (sql.js) y persistencia en localStorage
    ├── models/recuerdo.ts             ← lógica de datos: CRUD, filtros, crecimiento
    ├── views/
    │   ├── jardinView.ts              ← interfaz (tarjetas, filtros, diálogos)
    │   └── flor.ts                    ← dibujo de las flores en SVG
    ├── controllers/jardinController.ts ← coordina modelo y vista
    └── styles/styles.css
```

Patrón **MVC**: el *modelo* habla con SQLite, la *vista* dibuja el DOM y el *controlador* los conecta.

## ▶️ Cómo ejecutarlo en tu computadora

Necesitas [Node.js](https://nodejs.org/) 18 o superior.

```bash
npm install        # instala dependencias
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # genera la carpeta dist/ (revisa tipos con TypeScript)
npm run preview    # prueba la versión de producción
```

## 🚀 Cómo desplegarlo en Vercel

1. Sube el proyecto a un repositorio **público** de GitHub.
2. En [vercel.com](https://vercel.com/) elige **Add New → Project** e importa el repositorio.
3. Vercel detecta **Vite** automáticamente (Build Command: `npm run build`, Output Directory: `dist`).
4. Pulse **Deploy**. Cada `git push` a `main` vuelve a desplegar el sitio.
