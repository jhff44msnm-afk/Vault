# VAULT — Bóveda Financiera Personal

App de finanzas personales (React + Vite): Panel, Movimientos, Pagos, Metas, Inversión, Pensión, Seguros y Documentos. Los datos se guardan en `localStorage` de tu navegador — nada se envía a ningún servidor (excepto, si tú lo activas, las consultas de precio a Alpha Vantage).

## Estructura

```
src/
  components/   → un archivo por sección (Dashboard, Pagos, Inversion, etc.) + ui.jsx (botones, tarjetas, inputs)
  hooks/        → useVaultData.js (carga/guarda en localStorage, migra datos de versiones anteriores)
  services/     → financeApi.js (precios en vivo opcionales vía Alpha Vantage)
  utils/        → constants.js (colores, categorías) y calculations.js (fechas, totales, datos por defecto)
  App.jsx       → arma las pestañas y la navegación
  main.jsx      → punto de entrada de React
public/
  manifest.webmanifest, sw.js → hacen que la app se pueda "instalar" como PWA
```

## Lectura de estados de cuenta (Date · Description · Amount · Balance)

El módulo `src/utils/statementParser.js` lee las cuatro columnas de un estado de cuenta PDF:

- **Date** — acepta `MM/DD`, `MM/DD/YY`, `MM/DD/YYYY`, `MM-DD-YY` e ISO. Cuando la fecha no trae año (común en estados de cuenta: solo `05/01`), el año se infiere del período del documento (`Statement from 05/01/26 Thru 05/31/26`), incluyendo el cruce de año diciembre→enero.
- **Description** — todo lo que no es fecha, monto ni balance; se limpia y se recorta.
- **Amount** — maneja `$1,234.56`, paréntesis `(12.34)`, signo final `4.31-` y montos sub-dólar sin cero inicial (`.28-`).
- **Balance** — se captura el saldo corrido de cada línea. Además, el **delta del balance** (`saldo actual − saldo anterior`) se usa como verificación autoritativa del signo del monto, de modo que un cargo vs. un abono nunca se confunden.

La lógica está separada de la extracción del PDF para poder probarla; validada contra un estado de cuenta real, los totales de depósitos/retiros y el saldo final coinciden exactamente con el resumen impreso del banco.

## 1. Probarla en tu computadora (opcional pero recomendado)

Necesitas [Node.js](https://nodejs.org) instalado (versión 18 o más reciente).

```bash
npm install
npm run dev
```

Abre la URL que te muestre la terminal (normalmente `http://localhost:5173`).

## 2. Subirla a GitHub

```bash
git init
git add .
git commit -m "VAULT inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

## 3. Ajustar la ruta base (importante)

Abre `vite.config.js` y cambia esta línea para que coincida **exactamente** (mayúsculas y guiones incluidos) con el nombre de tu repositorio:

```js
base: "/TU-REPO/",
```

Si vas a publicarla como sitio raíz (`tu-usuario.github.io`, sin subcarpeta), usa `base: "/"`.

Vuelve a hacer commit y push de ese cambio.

## 4. Activar GitHub Pages

1. En tu repositorio en GitHub: **Settings → Pages**.
2. En "Build and deployment", elige **Source: GitHub Actions** (no "Deploy from a branch").
3. Listo — el workflow en `.github/workflows/deploy.yml` ya está incluido. Cada vez que hagas push a `main`, se construye y publica solo.
4. Revisa la pestaña **Actions** del repo para ver el progreso. Cuando termine, la URL aparecerá en **Settings → Pages** (algo como `https://tu-usuario.github.io/tu-repo/`).

## 5. Iconos de la PWA (pendiente)

El manifest espera dos imágenes que tú agregues en `public/`:

- `public/icon-192.png` (192×192 px)
- `public/icon-512.png` (512×512 px)

Puedes usar el mismo logo/ícono que usaste en tu PWA anterior de Plan Vault, o generar uno nuevo. Sin estos archivos la app funciona igual, solo no tendrá ícono propio al "Agregar a inicio" en tu iPhone.

## 6. Instalarla en tu iPhone

Una vez publicada, abre la URL de GitHub Pages en Safari → botón de compartir → **Agregar a pantalla de inicio**.

## 7. Precios en vivo (opcional)

En la app, toca el ícono ⚙️ (Configuración) y pega una API key gratuita de [alphavantage.co](https://www.alphavantage.co/support/#api-key). Se guarda solo en tu dispositivo. El plan gratuito limita a unas 5 consultas por minuto.

## 8. Migración de datos

Si ya tenías la versión anterior de VAULT (la de un solo artifact, con `salary` y gastos por intervalo de días) abierta en el mismo navegador/dispositivo, la app detecta esos datos antiguos en `localStorage` la primera vez que cargues esta versión y los migra automáticamente — te avisará con un banner y te pedirá confirmar el día de pago de cada pago recurrente.

## 9. Respaldo de tus datos

En ⚙️ Configuración puedes exportar un archivo `.json` con todo tu historial, y volver a importarlo (por ejemplo, si cambias de teléfono).
