# Manual de usuario: inventario de bodega

Aplicación v1.6.1. Dirigido al encargado y al operador de una bodega. Describe la versión actual: inventario local, un teléfono como registro operativo y cantidades enteras. No incluye sincronización, facturación ni respaldo/restauración.

## 1. Qué se entrega al operador

El mantenedor debe entregar una app independiente instalada en un teléfono aprobado, identificar la versión y enseñar este flujo. El operador no necesita GitHub, Node, una cuenta Expo ni el computador del desarrollador para operar ese binario. Expo Go y su QR son el método de prueba del equipo de desarrollo; no constituyen la instalación de la empresa.

El piloto debe llevar un registro de referencia en paralelo mientras no exista una restauración de respaldo probada. Los datos de demostración y las pruebas deben mantenerse fuera del inventario real.

## 2. Preparar la bodega por primera vez

1. El encargado elige el teléfono y la persona responsable del inventario. Define una sola unidad de control por producto: por ejemplo, unidades individuales, no mezclar cajas con unidades.
2. El mantenedor instala y prueba la app en ese equipo. El encargado verifica la fecha y hora del teléfono, porque los movimientos usan ese reloj.
3. Abrir **Inicio**. Una instalación nueva debe mostrar la bodega vacía. No tocar **Cargar catálogo demostrativo** para comenzar una operación real.
4. Contar físicamente los productos antes de crear sus fichas. Durante ese conteo, acordar cómo se registrarán las recepciones y despachos para evitar que se pierdan movimientos.
5. Tocar **Escanear**, leer la explicación y permitir la cámara. Si se rechaza el permiso o la etiqueta está dañada, usar **Ingreso manual** y escribir los números bajo las barras.
6. Para un código desconocido, completar **Nuevo producto**: nombre reconocible, precio unitario CLP, stock inicial contado y mínimo de alerta. Guardar y revisar la ficha.
7. Repetir con los artículos del alcance inicial y comprobar cantidades/precios en **Inventario**.
8. Revisar con el encargado que no haya datos de prueba y que el saldo de la app coincida con el conteo. Registrar esa fecha de inicio en el control del piloto.

**El stock inicial ya se registra como una entrada.** No registrar otra entrada por esas mismas unidades al terminar el alta.

## 3. Reconocer las pantallas

| Pantalla | Uso |
| --- | --- |
| Inicio | Ver resumen local, accesos a lectura/manual y alertas de reposición |
| Inventario | Buscar por nombre/código, filtrar críticos/agotados y abrir fichas |
| Escanear | Leer EAN-13, EAN-8 o UPC-A con la cámara; usar linterna si hace falta |
| Ficha del producto | Ver saldo, mínimo y precio; registrar entradas/salidas y consultar movimientos recientes |
| Dashboard | Elegir fechas y ver movimientos del período separados del stock actual; no reemplaza contabilidad |
| Ajustes | Cambiar apariencia, revisar permiso, exportar Excel, abrir diagnóstico y gestionar datos |

## 4. Recibir mercadería: entrada

1. Contar las unidades efectivamente recibidas. Identificar si el código pertenece a la unidad o a una caja; no asumir que son equivalentes.
2. Escanear o escribir el código. Verificar nombre y código en la ficha antes de registrar.
3. Si el artículo no existe, darlo de alta. Si la recepción completa se indicó como stock inicial, no repetirla como entrada.
4. En la ficha, escribir la cantidad recibida y, si procede, una nota breve de referencia, por ejemplo «Recepción OC 125». Evitar datos personales en las notas.
5. Elegir **Entrada** y esperar la confirmación. Revisar nuevo saldo e historial.

Ejemplo: saldo 10, entrada 3 → saldo 13. Escanear repetidamente el envase no agrega unidades: el stock cambia al confirmar el movimiento.

## 5. Despachar mercadería: salida

1. Abrir la ficha por escaneo o búsqueda y confirmar que sea el producto correcto.
2. Escribir la cantidad realmente despachada y la nota de referencia si corresponde.
3. Elegir **Salida** y esperar confirmación. Comprobar saldo e historial antes de atender el siguiente movimiento.
4. Si se rechaza por falta de stock, revisar producto, cantidad, recepciones no registradas y conteo físico. No inventar una entrada para eludir el control.

Ejemplo: saldo 13, salida 8 → saldo 5. Si el mínimo es 5, aparece **STOCK BAJO**. Una salida de 6 con saldo 5 se rechaza y conserva el saldo.

Los botones de cantidades rápidas facilitan escribir unidades; comprobar siempre el tipo de movimiento. Una etiqueta escaneada no equivale a una venta cobrada ni a una factura emitida.

## 6. Interpretar las alertas

| Estado | Regla | Acción del encargado |
| --- | --- | --- |
| AGOTADO | Stock 0 | Verificar físicamente y organizar reposición; no despachar unidades inexistentes |
| STOCK BAJO | Stock mayor que 0 y menor o igual al mínimo | Revisar demanda y planificar reposición |
| EN STOCK | Stock sobre el mínimo | Continuar control habitual |

Son alertas visuales dentro de la app. No se envían correos, avisos push, pedidos automáticos ni notificaciones a proveedores. El encargado debe revisar los críticos regularmente. El mínimo lo define el negocio; no lo calcula la aplicación.

## 7. Buscar, editar y consultar historial

- En **Inventario**, escribir parte del nombre o código. Probar **Todos**, **Críticos** y **Agotados** según la tarea.
- Abrir la ficha y usar **Editar** para cambiar nombre, precio, mínimo o corregir la cantidad. La cantidad se corrige rectificando la recepción mal digitada; hay un solo flujo, sin selector de tipo. Ver sección 8.
- Al modificar el precio, los movimientos anteriores conservan el precio unitario que tenían al registrarse. La valorización del inventario usa el precio actual.
- La ficha muestra los cinco movimientos más recientes de todo el historial. Su botón abre una pantalla dedicada para buscar y elegir fechas. Inicio y Dashboard también tienen acceso al historial, paginado de 50 en 50.
- La app no identifica al trabajador que hizo cada movimiento y no impide editar/eliminar datos por rol. Para un piloto, el encargado debe definir quién puede operar el teléfono.

## Consultar un período y el historial

1. En Dashboard revisar **Período de movimientos**. Al iniciar la app se elige el mes actual; antes de v1.4.0 los indicadores acumulaban todo el historial.
2. Deslizar horizontalmente la barra y tocar Hoy, 7 días, 1M (30 días), 3M, 6M, 1A (12 meses móviles), Este mes, Este año o Todo. Para otro intervalo, tocar **Elegir fechas**, seleccionar Desde/Hasta en el calendario y **Aplicar período**. Cancelar conserva el filtro anterior.
3. Comprobar las fechas escritas. Se incluyen ambos días completos y se usa la hora local del teléfono. Un rango sin operaciones muestra cero entradas/salidas; no implica que la bodega esté vacía.
4. Volver a Inicio: sus entradas y salidas usan las mismas fechas. El stock, alertas y valorización actual no cambian por elegir otro período; no representan stock histórico.
5. Abrir **Historial** desde Inicio/Dashboard o desde la ficha. Buscar por nombre, GTIN o nota, elegir tipo y cargar más páginas. Cada fila incluye fecha, hora e ID. Desde la ficha se restringe a ese producto.
6. Para exportar, confirmar primero el período en Dashboard. El botón de exportación de Ajustes utiliza ese mismo período. Los filtros de búsqueda y tipo del historial no restringen el Excel: exporta todas las entradas, salidas y ajustes de las fechas elegidas.

En **Evolución de movimientos**, tocar o deslizar el gráfico para ver las unidades de cada intervalo en la tarjeta superior, con sus fechas. Elegir **Entradas** o **Salidas** para ver sus gráficos por separado en el mismo apartado. Entradas es verde y Salidas violeta. Al cambiar el período, los montos y unidades de las tarjetas superiores se recalculan con las mismas fechas. La tarjeta de Inicio incluye el rango dentro de su recuadro. Las flechas cambian de intervalo y **Tabla** muestra los mismos valores en una lista desplazable. Los períodos cortos (hasta 120 días) usan días; hasta ocho años, meses; los mayores, años. Los puntos suman unidades de cada intervalo, sin acumular; cero indica ausencia de actividad. No muestran la evolución histórica del stock. Los ajustes no se cuentan como entradas ni salidas. Los totales no dependen del filtro de tipo usado en la vista previa del historial.

La selección es de sesión: al reiniciar el proceso vuelve al mes actual. Las salidas son violetas; no indican pérdidas. Rojo identifica errores, eliminación y stock agotado.

## 8. Equivocaciones y diferencias de conteo

Para corregir una **entrada mal digitada**:

1. Confirmar la cantidad que realmente se recibió e identificar la entrada equivocada.
2. Abrir **Inventario → producto → Editar** y escribir la **Cantidad disponible corregida** (saldo que debe quedar hoy).
3. Si existe una sola entrada, queda seleccionada automáticamente. Si hay varias, tocar **Elegir entrada a corregir** y elegir por fecha, ID y nota en la ventana de selección. Se pueden cargar más entradas; cerrar la ventana sin elegir conserva la selección anterior. La selección no se pierde al borrar o reescribir la cantidad.
4. Revisar ambas vistas previas: cantidad anterior/nueva de esa entrada y stock anterior/nuevo. Escribir el motivo obligatorio, de hasta 160 caracteres.
5. **Guardar cambios**. La entrada rectificada cambia los totales de recepción y el stock; no crea salidas. Se conserva el original y una constancia vinculada en Historial → Ajustes, con fecha y motivo.

Ejemplo: se compraron 15, pero se registraron 20 y no hubo despachos. Corregir el stock a 15 y elegir esa entrada deja **entrada 15, stock 15 y salida 0**. Si se anotaron 15 y realmente eran 20, la rectificación inversa deja entrada 20 y stock 20, sin aumentar salidas.

Con despachos posteriores hay que corregir el saldo actual: si se registró entrada 20 y se despacharon 5, hay stock 15. Si la entrada real era 15, el stock correcto es 10. Escribir 10 rectifica esa entrada a 15 y conserva la salida real de 5. La app no permite dejar una entrada o saldo negativos. Cantidad cero anula su aporte operativo, conservando el original y la constancia.

**Fechas y precios:** la entrada rectificada mantiene su fecha y precio unitario histórico. Los totales y gráficos del período de recepción se recalculan con la cantidad vigente. La constancia figura con la fecha de corrección. Por ejemplo, rectificar hoy una recepción de octubre modifica los totales de octubre, sin crear una recepción o despacho de hoy. Un Excel ya guardado no se actualiza solo: exportar nuevamente para obtener la versión rectificada.

**Un solo flujo de corrección:** se retiró la alternativa Ajuste de conteo del editor. Las constancias de ajustes anteriores siguen visibles y no se eliminan ni reclasifican. Una diferencia física sin recepción mal digitada requiere investigar la causa; no elegir una entrada arbitraria para forzar un saldo.

El botón **Guardar cambios** se habilita cuando la cantidad y, si cambia el saldo, la entrada y el motivo son válidos. **Cancelar** descarta la edición y restablece sus valores. Durante la edición, los botones de Entrada/Salida están deshabilitados para evitar operaciones que alteren la ficha a mitad de la corrección. Si no hay entradas previas, se pueden editar nombre, precio y mínimo conservando la cantidad; una recepción nueva se registra con Entrada fuera del editor.

Sin diferencia de cantidad no se crea un evento. Si la entrada o el stock cambió mientras se editaba, volver a abrir la ficha y seleccionar la entrada actualizada. Todas las escrituras se confirman juntas. Los movimientos y ajustes ya existentes no se convierten automáticamente en rectificaciones ni se borran: investigar antes de decidir cómo tratarlos. La nota no identifica de forma segura al responsable ni sustituye una auditoría firmada.

No usar **Eliminar producto** para corregir cantidades: elimina también su historial. **Vaciar toda la bodega** elimina todos los productos y movimientos del teléfono, después de confirmación. La app no tiene papelera ni restauración.

## 9. Reportes y cierre de jornada

1. Revisar movimientos pendientes y resolver diferencias con el registro de referencia del piloto.
2. Revisar críticos/agotados y comunicar necesidades de reposición por el canal habitual del negocio.
3. En **Ajustes**, tocar **Exportar inventario y movimientos (.xlsx)**.
4. En el diálogo del teléfono, elegir guardar o compartir. Abrir el archivo guardado y verificar que se pueda leer: cerrar el diálogo no garantiza que se haya conservado una copia fuera de la app.
5. Guardar el reporte con fecha en el lugar acordado por la empresa y registrar quién lo revisó. El archivo temporal que genera la app está en caché y no es archivo permanente.

El libro tiene cinco hojas: Resumen, Inventario_actual, Por_producto, Por_dia_producto y Movimientos. Las operaciones se limitan al período compartido visible en Dashboard; el stock es siempre el actual. Se incluyen todas las operaciones del rango hasta 20.000. Si hay más, la app solicita acotar fechas, sin exportar un detalle incompleto. Las sumas de entradas y salidas representan actividad, no utilidad ni saldo neto; el saldo se consulta en inventario.

En **Movimientos**, los ajustes figuran como AJUSTE con motivo, saldos anterior/nuevo y diferencia con signo. Su subtotal de flujo está vacío. Las rectificaciones incluyen ID de entrada, cantidades anterior/nueva y original. Resumen distingue rectificaciones de ajustes de conteo para no duplicar diferencias. Por_producto y Por_dia_producto usan entradas vigentes y salidas reales; la rectificación afecta el período original de recepción.

El reporte no contiene una restauración de SQLite ni puede importarse para recuperar el teléfono. No incluye impuestos, facturas, costos históricos completos ni cálculo de utilidades. No presentarlo como sistema contable.

## 10. Usar sin internet y conservar datos

En una app independiente instalada, escaneo, consulta, alta, movimientos e historial se ejecutan en el teléfono sin internet. Compartir por correo/nube puede necesitar conexión. Cerrar la app o reiniciar el equipo no borra el inventario.

Cada instalación conserva su propia base `bodega.db`. Dos teléfonos no se sincronizan aunque usen el mismo usuario Expo. El código de GitHub no contiene las existencias del negocio. Al pasar de Expo Go a una app independiente se comienza con otro almacenamiento, sin migración automática.

No desinstalar ni borrar datos para resolver un error. Antes de cambiar de equipo o actualizar, consultar al mantenedor; no hay recuperación automática garantizada. Si el teléfono se pierde y no hay un respaldo recuperable externo, no se puede prometer restaurar su inventario.

## 11. Si algo falla

| Problema | Acción |
| --- | --- |
| Cámara no permitida | Usar ingreso manual; habilitar cámara en Ajustes del teléfono si el encargado lo permite |
| Código inválido | Revisar números y tipo; se aceptan GTIN de 8, 12 o 13 dígitos con verificador válido |
| QR o etiqueta Code128 | No están soportados por este flujo; no crear códigos arbitrarios para saltar validación |
| Código válido pero nuevo | Crear ficha tras comprobar que no sea otro envase/unidad del mismo artículo |
| Fallo al guardar/abrir base | Leer mensaje, no asumir éxito, reintentar y verificar saldo/historial; si persiste, detener movimientos y contactar soporte |
| Teléfono sin espacio | Detener operación y pedir asistencia; no borrar datos de la app para liberar espacio |
| Falla exportación | Verificar almacenamiento y opciones de compartir; continuar el registro de referencia, sin llamar al Excel un respaldo |
| Saldo físico distinto | Investigar y autorizar un ajuste; no eliminar fichas para ocultar diferencias |

El encargado comunica a soporte versión de la app, modelo/SO, acción, hora, mensaje y si el saldo cambió. Compartir capturas sin información sensible innecesaria. Si no está claro si un movimiento se guardó, consultar la ficha antes de repetirlo para evitar duplicar la operación.

## 12. Límites de los datos

- Cantidades de movimiento: enteros entre 1 y 99.999. No hay kilos/litros fraccionados ni conversiones automáticas caja/unidad.
- Corrección de stock: entero no negativo seguro (hasta 9.007.199.254.740.991); motivo de 1 a 160 caracteres.
- Stock inicial: de 0 a 99.999; mínimo: de 1 a 99.999; precio CLP: entero de 0 a 99.999.999.
- Nota de movimiento: hasta 80 caracteres guardados. Identificar referencias operativas, no información personal innecesaria.
- Sin lotes, vencimientos, series, ubicaciones, órdenes de compra, múltiples bodegas ni proveedores.
- Sin sesiones/roles, trazabilidad de operador, servidor ni recuperación completa desde la interfaz.

Para organizar un piloto y evaluar el paso a producción, continuar con [Operación y entrega a una empresa](OPERACION_EMPRESA.md).
