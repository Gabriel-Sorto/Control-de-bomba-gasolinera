# Control de bomba gasolinera · Gasolinera Azul

Aplicación para que los usuarios que trabajan en gasolineras lleven el control de sus ventas durante sus turnos. Desarrollada con React Native y Expo, con vista previa web para pruebas en PC.

## Obtener el proyecto

```bash
git clone https://github.com/Gabriel-Sorto/Control-de-bomba-gasolinera.git
cd Control-de-bomba-gasolinera
```

Para abrir la vista previa sin instalar dependencias, ejecuta `node preview.mjs` y visita http://127.0.0.1:4173. Para desarrollar, ejecuta `npm install` y después `npm start`. También se incluye `pnpm-lock.yaml` para instalaciones reproducibles con pnpm.

## Estructura

- `App.js`: pantallas, navegación y formularios.
- `src/domain.js`: reglas de ventas, turnos, caja fuerte y arqueo.
- `src/repository.js`: persistencia local mediante AsyncStorage.
- `tests/domain.test.js`: pruebas automáticas de las reglas de negocio.
- `assets/`: tono de confirmación.
- `web-preview/`: versión web compilada para la primera prueba.
- `VALIDACION.md`: alcance de las verificaciones realizadas.

Primera prueba móvil en React Native + Expo, con interfaz azul y blanca. No requiere SQLite, servidor ni cuenta en la nube. No incluye un APK compilado.

## Vista previa rápida sin instalar dependencias

Con Node.js instalado, ejecuta `INICIAR-PRUEBA.cmd` o `node preview.mjs`. Abre http://127.0.0.1:4173 y deja la terminal abierta. Esta vista ya compilada permite probar el flujo desde tu PC sin ejecutar `npm install`. El código fuente de React Native es la aplicación principal; `web-preview/` es una copia compilada y debe regenerarse cuando cambies el código. Usa `npx expo export --platform web --output-dir web-preview` después de instalar las dependencias.

## Cómo ejecutarla en Windows

1. Instala Node.js LTS (22 o superior) si no lo tienes.
2. Abre una terminal en esta carpeta.
3. Ejecuta `npm install`.
4. Si Expo muestra diferencias de versiones, ejecuta `npx expo install --fix` para alinear las dependencias con el SDK del proyecto.
5. Ejecuta `npm start`.
6. Abre Expo Go compatible con SDK 55 en tu teléfono Android y escanea el QR. PC y teléfono deben estar en la misma red. Si la red bloquea la conexión, prueba `npx expo start --tunnel` (requiere internet).

También puedes usar `npm run web` y probarla en el navegador. El comando `npm run android` requiere emulador Android configurado o dispositivo conectado. La primera instalación y la carga de Expo requieren conexión; las operaciones y el almacenamiento de la aplicación no consultan un servidor.

## Primera prueba sugerida

### Caja fuerte

Cuando las ventas en efectivo pendientes de guardar llegan a **$200**, el monto de la cabecera se muestra rojo y aparece la recomendación de guardar el dinero en caja fuerte. Se pueden seguir registrando ventas normalmente. No se cuentan cobros POS ni el fondo inicial.

Pulsa **Dinero guardado en caja** después de guardar físicamente el efectivo. Se registra todo el monto pendiente de ventas (por ejemplo $220), con fecha y hora; la cabecera vuelve al azul y se reinicia el contador de efectivo pendiente. Puedes registrar un guardado antes de llegar a $200. Las ventas y sus totales permanecen intactos.

La pestaña **Caja** muestra cada guardado, su monto y hora, la suma guardada y el efectivo pendiente. La información persiste al reiniciar, se conserva al cerrar el turno y aparece en el resumen compartido y PDF. Los turnos anteriores sin guardados se siguen leyendo normalmente.

En el arqueo cuenta únicamente el dinero fuera de la caja fuerte, incluido el fondo inicial. El efectivo esperado al cierre es **ventas en efectivo + fondo - guardados**. Las anulaciones posteriores no reescriben los guardados: ajustan el saldo pendiente. Si producen un saldo negativo, Caja muestra el ajuste para revisarlo en el arqueo.

Para probar: registra $200 en efectivo, observa el aviso, registra $20 adicionales y pulsa el botón. Debe aparecer un guardado de $220 y desaparecer el aviso. Otros $200 en efectivo vuelven a activarlo. Recarga la aplicación y revisa el registro en Caja.

### Operaciones de turno

- Nombre libre y PIN **1234**. Selecciona una bomba del 1 al 8 y fondo de $20.
- Registra $10 en efectivo y $15 con tarjeta. Verifica $25 de venta y $30 de efectivo a entregar (incluye fondo).
- Prueba monto exacto, galones y Deshacer antes de 5 segundos.
- Anula una venta desde Bitácora con un motivo y verifica sus totales.
- Recarga o reinicia: debe conservarse el turno.
- Cierra con el efectivo contado, revisa la diferencia y abre el corte desde Historial.
- Comparte el resumen con el selector de aplicaciones del teléfono: elige WhatsApp si está instalado. Exporta PDF para compartir el detalle completo. En navegador, Exportar PDF abre la impresión: elige Guardar como PDF.

## Funcionalidades

La selección Regular/Especial/Diésel y el precio aparecen únicamente en la pestaña **Galones**. Las ventas nuevas con botones o monto exacto registran solo dinero y pago, sin combustible, precio ni galones estimados. Las ventas por galones sí conservan combustible, precio y volumen, y calculan su importe automáticamente. Esto funciona tanto con efectivo como con POS. Los registros de versiones anteriores se conservan tal como se guardaron, incluidos sus volúmenes estimados; no se recalcula su historial.

Apertura por nombre/PIN de prueba, ocho bombas, fondo y totalizador opcional; reloj y contadores en vivo; botones $5/$10/$15/$20/$30/$50; montos exactos; galones; Regular/Especial/Diésel; efectivo/POS; precios editables; vibración y tono de confirmación (según dispositivo); deshacer de cinco segundos; bitácora con anulaciones justificadas; cierre con arqueo y diferencia; archivo con búsqueda por fecha/persona/bomba/ID; resumen compartible y PDF con bitácora.

Los precios iniciales son ficticios: Regular $3.85, Especial $4.10 y Diésel $3.60 por galón. Sustitúyelos en Ajustes. Dólares se guardan como centavos enteros. Galones se muestran con tres decimales; los totales se suman sin redondear cada volumen. Los importes calculados por galones se redondean al centavo. Los cambios de precio no recalculan ventas anteriores. El totalizador es una lectura de referencia, no una fuente automática de ventas.

## Persistencia y futura base de datos

`src/repository.js` concentra `load()` y `save()` usando AsyncStorage. La aplicación espera a que cada escritura termine antes de confirmar y bloquea escrituras simultáneas. Ante error de guardado, mantiene el estado anterior y muestra el error. Ante error de lectura inicial, no reemplaza los datos existentes.

Para migrar a SQLite, implementa este mismo contrato con tablas Usuarios, Turnos, Ventas y Precios_Dia, transacciones y migración de los datos ya guardados. `src/domain.js` contiene las operaciones y cálculos independientes de la interfaz. Cada venta almacena modo, pago y datos de anulación; combustible, precio y volumen son nulos en ventas nuevas por monto. Los cierres bloquean ventas y anulaciones.

Esta es una prueba local: el PIN compartido no autentica usuarios reales, no hay roles aplicados ni cifrado, respaldo en nube o auditoría inviolable. Los datos se pierden al borrar almacenamiento o desinstalar. Guarda los PDFs antes. El ajuste de sonido es temporal; los precios, turnos y ventas sí persisten. No uses esta versión como registro contable definitivo.

## Verificación

`npm test` ejecuta pruebas de cálculos, validación, anulaciones, cierre y serialización con el ejecutor integrado de Node. `npx expo export --platform web` comprueba que Metro genere el paquete web. La prueba en teléfono es necesaria para vibración, sonido, compartir archivos e impresión nativos.

Documentación oficial del SDK utilizado: https://docs.expo.dev/versions/v55.0.0/

## Enfoque en ventas

La cabecera, el arqueo y el resumen compartido/PDF muestran dinero y cantidad de ventas, sin contador acumulado de galones. El ingreso por galones permanece: elige combustible, introduce el volumen y registra el importe calculado. La bitácora conserva los galones y el precio de cada venta ingresada de esa manera, para poder revisar su cálculo.
