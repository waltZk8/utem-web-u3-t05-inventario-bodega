# Pruebas en teléfono físico

**Pendiente de ejecutar por el equipo.** Registro para completar; no demuestra pruebas realizadas. Conservar capturas/grabaciones sin datos personales innecesarios.

## Entorno

| Dato | Valor real |
| --- | --- |
| Fecha, hora, responsable | Pendiente |
| Modelo físico, SO y versión | Pendiente |
| Versión de app y commit | Pendiente |
| Expo Go/desarrollo o APK/release | Pendiente |
| Batería, ahorro, temperatura, otras apps | Pendiente |
| Archivos o enlaces de evidencia | Pendiente |

## Casos funcionales

Registrar pasa/falla, resultado observado y evidencia. No marcar como hecho sin ejecutar.

| Caso | Acción | Resultado esperado | Resultado / evidencia |
| --- | --- | --- | --- |
| P01 | Abrir con base vacía | Carga y luego vacío con acción para agregar | Pendiente |
| P02 | Abrir escáner y denegar cámara | Explicación previa; alternativa manual disponible | Pendiente |
| P03 | Rechazar definitivamente y volver desde Ajustes del sistema | Acceso a Ajustes y permiso consultado al volver | Pendiente |
| P04 | Permitir y escanear un envase real | Una sola ficha/alta por lectura | Pendiente |
| P05 | Ingresar `4006381333932` | Error de verificador; ningún producto nuevo | Pendiente |
| P06 | Ingresar código desconocido `4006381333931` en base de prueba | Alta con código precargado y aviso | Pendiente |
| P07 | Crear stock 10, mínimo 5, precio 1290 | Saldo 10 e historial inicial | Pendiente |
| P08 | Entrada 3, salida 8 | Saldo 5 y STOCK BAJO | Pendiente |
| P09 | Salida 6 con saldo 5 | Rechazo; mismo saldo e historial | Pendiente |
| P10 | Salida 5 | Saldo 0 y AGOTADO | Pendiente |
| P11 | Cerrar proceso, activar modo avión y reabrir APK | Producto, saldo e historial conservados | Pendiente |
| P12 | Cámara a segundo plano y volver | Cámara suspendida fuera de primer plano y recuperada al volver | Pendiente |
| P13 | Buscar y cambiar filtros rápidamente | Última búsqueda gobierna resultados; vacío explicado | Pendiente |
| P14 | Cambiar tema y aumentar letra | Controles usables, sin información importante cortada | Pendiente |
| P15 | Exportar y abrir Excel | Cinco hojas, ceros iniciales y montos correctos | Pendiente |
| P16 | Dashboard: Hoy, Mes y rango del calendario; volver a Inicio | Fechas visibles y mismos flujos en ambas pantallas; stock actual sin cambiar | Pendiente |
| P17 | Elegir un rango sin operaciones | Flujos en cero e historial vacío, con existencias actuales conservadas | Pendiente |
| P18 | Abrir calendario, cambiar fechas y cancelar | El período aplicado sigue igual; rango invertido no puede aplicarse | Pendiente |
| P19 | Historial: buscar código/nota, filtrar tipo y cargar más | Fechas completas, ID, sin duplicados al paginar y vuelta correcta a ficha | Pendiente |
| P20 | Exportar el mismo rango desde Dashboard y Ajustes | Cinco hojas con las mismas fechas, totales por producto/día y filas que concuerdan con resumen | Pendiente |
| P21 | Cambiar a oscuro/alto contraste y revisar entradas/salidas | Salidas violetas legibles; rojo reservado a errores/estados críticos | Pendiente |

Si el código ya existe, usar otro envase o una base de prueba para P06. No borrar inventario real para reproducir casos.

## Medición propia

En **Ajustes → Diagnóstico y benchmark**, ejecutar M1 al menos tres veces en las mismas condiciones. Hay 5.000 registros temporales independientes del inventario, 30 búsquedas por motor y limpieza al finalizar.

| Corrida | SQLite p50 / p95 / peor (ms) | AsyncStorage p50 / p95 / peor (ms) | Evidencia |
| --- | --- | --- | --- |
| 1 | Pendiente | Pendiente | Pendiente |
| 2 | Pendiente | Pendiente | Pendiente |
| 3 | Pendiente | Pendiente | Pendiente |

Si se usa M2, anotar número de muestras por cámara o ingreso manual: mide consulta SQLite, no tiempo óptico de escaneo. M3 mide parte del inicio JS hasta el contenedor, no apertura desde tocar el icono.

En el informe explicar:

- Número, unidad, teléfono y entorno; tabla numerada y captura.
- M1 usa cachés calientes y ejecuta SQLite antes de AsyncStorage. Orden, temperatura y desarrollo pueden influir; la razón no es universal.
- AsyncStorage se compara leyendo/parseando un arreglo completo; una caché o índice propio cambiaría la comparación.
- Qué decisión apoyan los resultados y qué límites tuvo el experimento. Si no coinciden con la hipótesis, informar lo observado.

Un fallo también es evidencia: registrar mensaje, pasos para reproducir, intentos y limitación restante.

## Casos nuevos v1.5.0 (pendientes en dispositivo)

| Caso | Acción | Resultado esperado | Estado |
| --- | --- | --- | --- |
| P22 | En pantalla de 320–390 px, deslizar períodos y cambiar 1M/3M/6M/1A/Todo | Fechas visibles; gráfico se adapta; Inicio comparte rango | Pendiente |
| P23 | Tocar y arrastrar líneas; comparar con Tabla y flechas | Coinciden fechas y unidades; sin bloqueo del scroll fuera del gráfico | Pendiente |
| P24 | Rango vacío, un solo día, período >120 días y >8 años | Ceros válidos, un punto utilizable, agrupación día/mes/año explícita | Pendiente |
| P25 | Editar cantidad 10→8 con motivo; luego 8→0 y 0→5 | Stock actualizado; Ajuste con saldos, motivo y fecha; entradas/salidas sin cambio | Pendiente |
| P26 | Guardar sin motivo, cantidad vacía, cancelar, guardar sin variar cantidad y doble toque | Error legible sin cambios parciales; cancelar/sin diferencia no crean ajuste; doble toque no duplica | Pendiente |
| P27 | Actualizar sobre v2 con datos; exportar corrección y abrir Excel | Se conservan fichas/IDs; AJUSTE con saldos, motivo, diferencia y sin subtotal de flujo; probar ambos temas y lector de pantalla | Pendiente |

## Ajuste visual v1.5.1

- Comprobar en ambos temas que las salidas son violetas en Inicio, Dashboard, ficha e historial.
- Inicio: fechas y montos deben estar dentro de la misma tarjeta, incluso en pantalla estrecha.
- Dashboard: seleccionar Entradas/Salidas cambia una sola línea, título, escala, tooltip y Tabla.
- Elegir un rango sin actividad: ambos totales CLP y unidades son cero, al igual que los puntos. Elegir Todo los restablece; Inicio coincide al volver.
- El stock actual permanece identificado como actual, separado de los totales del período.
- Verificar la versión en Ajustes: 1.5.1; reiniciar Metro desde la carpeta actualizada.

Estado: interacción física pendiente.

## Rectificación de entradas v1.6.0 — pendiente en teléfono

| Caso | Acción | Resultado esperado |
| --- | --- | --- |
| P28 | Alta 20 a $1.000; Editar stock 15 → Corregir entrada → elegir alta → motivo → guardar | Entrada vigente 15/$15.000; stock 15/$15.000; salidas 0. Original 20 conservado y constancia con ID/motivo |
| P29 | Rectificar la misma entrada 15→20 y luego 20→0 | Totales, gráficos e inventario coinciden; ninguna salida añadida |
| P30 | Entrada 20, despacho 5; rectificar stock de 15 a 10 | Entrada vigente 15; salida real 5; stock 10 |
| P31 | Rectificar recepción de otro mes; exportar ambos períodos | Flujo corregido en fecha original; constancia en fecha de corrección; precio histórico conservado |
| P32 | No elegir entrada, motivo vacío, selección obsoleta o corrección que excede la entrada | Rechazo sin cambios parciales ni evento duplicado |
| P33 | Abrir Editar en v1.6.1 | Una sola corrección, sin selector de tipo; ajustes antiguos conservados |
| P34 | Actualizar desde v3 con ajustes existentes y consultar entradas antiguas por páginas | No se pierden datos ni saldos; selección por ID/fecha funciona; no se reinterpretan salidas anteriores |

Las comprobaciones automáticas usan SQLite real de Node; no sustituyen estas pruebas nativas.

## Editor simplificado v1.6.1 — validación física pendiente

- Una entrada: selección automática; cambiar 20→15, borrar el campo, reescribirlo y volver a 20 no pierde la selección ni reinicia la consulta.
- Varias entradas: selector en modal, lista paginada independiente; elegir conserva el formulario y cerrar sin elegir conserva la selección previa.
- Cancelar y reabrir: cantidad, motivo y datos vuelven al estado guardado, sin escribir movimientos.
- Cantidad vacía, entrada insuficiente, sin selección o motivo vacío: guardar deshabilitado con indicaciones visibles; entradas/salidas bloqueadas durante edición.
- Verificar teclado, desplazamiento y toques en Android/iOS; se retiró el botón que envolvía todo el formulario y la lista vertical anidada.
- Sin entradas: editar metadatos sin cambiar cantidad; mostrar explicación para la cantidad.

27 pruebas de reglas de datos, TypeScript y bundles no sustituyen estas interacciones nativas.
