# Operación y entrega a una empresa

Este documento distingue la capacidad disponible de los requisitos para un uso real. Es un plan de puesta en marcha y mantenimiento, no una certificación de producción ni evidencia de pruebas físicas ejecutadas.

## 1. Modelo de operación actual

Una bodega, un teléfono operativo y una base local por instalación. El encargado conserva un registro de referencia durante el piloto. No hay servidor ni mecanismos para que dos teléfonos compartan saldo. Varias personas pueden tomar físicamente el mismo equipo, pero la app no identifica quién opera ni aplica permisos por rol.

| Componente | Qué contiene | Dónde vive / quién lo administra |
| --- | --- | --- |
| Repositorio GitHub | Código y documentación | Cuenta/organización del mantenedor; no guarda stock por sí mismo |
| Cuenta Expo/EAS | Desarrollo, compilación y distribución configuradas | Mantenedor autorizado; no es la cuenta del bodeguero |
| App independiente | Código instalado para operar | Teléfono de la empresa |
| SQLite `bodega.db` | Productos, stock y movimientos | Espacio privado de esa app en ese teléfono |
| AsyncStorage | Preferencias visuales | Almacenamiento de esa app |
| Excel exportado | Reporte con inventario/resumen y movimientos del período | Primero caché del teléfono; después, destino donde el usuario lo guarde |

La base usa el directorio predeterminado de `expo-sqlite`, elegido por el sistema y la instalación. No se debe fijar una ruta Android/iOS universal en documentación. El mantenedor puede consultar `db.databasePath`. Las tablas se crean al abrir la app, sin instalar un servidor de bases de datos.

En Expo Go, los datos pertenecen al entorno de desarrollo para ese proyecto. Una APK/app iOS independiente utiliza su propio espacio: no prometer que hereda datos de Expo Go, ni que dos proyectos/forks comparten almacenamiento por tener el mismo nombre de archivo.

## 2. Responsabilidades antes de entregar

| Responsable | Tarea |
| --- | --- |
| Empresa | Definir unidad de conteo, mínimos, responsables, dispositivo y registro de referencia |
| Mantenedor | Conservar código/versión, configurar proyecto Expo de la empresa o del equipo autorizado y generar instalación firmada |
| Mantenedor + encargado | Validar teléfono, permisos, apertura sin computador, movimientos, persistencia y exportación |
| Encargado | Autorizar conteo inicial, capacitar operadores, revisar diferencias y alertas |
| Empresa + mantenedor | Acordar canal de soporte, responsables de incidentes, actualizaciones y política de datos |

No entregar el usuario/contraseña personal de un desarrollador al operador. El responsable de compilación debe gestionar acceso y credenciales de firma según la organización; no guardarlas en GitHub. La integración GitHub–Expo puede automatizar compilaciones, pero no aporta sincronización de inventario.

## 3. Instalación y distribución

1. Preparar una compilación independiente a partir de un commit identificado. El perfil EAS `preview` de este proyecto produce APK Android; no es publicación en una tienda.
2. Para Android, entregar el instalador firmado/enlace y las instrucciones del canal autorizado por la empresa. Comprobar el equipo real antes de usar datos del negocio.
3. Para iOS, preparar una distribución iOS firmada y el canal adecuado. El flujo de distribución interna puede requerir registrar dispositivos y credenciales Apple. No distribuir el QR de Metro como sustituto de este proceso.
4. Registrar versión visible, commit, dispositivo, SO, fecha, responsables y ubicación del instalador aprobado.
5. Apagar Metro y el computador. Abrir la app instalada y ejecutar las pruebas sin conexión; comprobar también cierre forzado y reinicio del teléfono.

Fuentes del procedimiento técnico: [primera compilación EAS](https://docs.expo.dev/build/setup/) y [distribución interna](https://docs.expo.dev/build/internal-distribution/). Los canales/cuentas se configuran antes de compilar; este repositorio no contiene una compilación empresarial firmada ni una cuenta EAS ya creada para el usuario final.

## 4. Prueba de aceptación del piloto

Completar con resultados reales, no marcar por anticipado. Usar datos de prueba antes del conteo inicial.

| Verificación | Resultado esperado | Resultado / evidencia |
| --- | --- | --- |
| App instalada, computador apagado | Abre sin Metro/Expo Go | Pendiente |
| Modo avión | Alta, consulta y movimientos funcionan | Pendiente |
| Cámara permitida y denegada | Escaneo o alternativa manual utilizables | Pendiente |
| Entrada/salida | Saldo e historial correctos, una confirmación por operación | Pendiente |
| Salida mayor al saldo | Rechazo sin alterar existencias | Pendiente |
| Saldo al mínimo y a cero | Alertas textuales y visuales correctas | Pendiente |
| Cierre forzado y reinicio | Saldo e historial conservados | Pendiente |
| Reporte guardado fuera de caché | Archivo legible y período y límite de 20.000 operaciones comprendidos | Pendiente |
| Pantalla/teclado/letra grande | Datos y acciones importantes accesibles | Pendiente |
| Procedimiento de incidente | Operador sabe a quién llamar y cómo continuar el registro | Pendiente |

Registrar además el rendimiento en el equipo objetivo con [el protocolo de medición](PRUEBAS_DISPOSITIVO.md). Ni pruebas unitarias ni bundles generados sustituyen esta aceptación física.

## 5. Resguardo, recuperación y continuidad

### Lo que existe hoy

- Persistencia SQLite local y migraciones atómicas de esquema.
- Exportación Excel por período: hasta 20.000 operaciones completas; por encima de ese límite se rechaza y se solicita acotar fechas. No hay truncamiento silencioso.
- Reintento visible de errores y transacciones para saldo/historial.

### Lo que falta

No hay botón de respaldo SQLite, restauración/importación, copia programada, sincronización ni recuperación de desastre. El reporte Excel no permite restaurar la app. Las copias automáticas de Android/iOS no están verificadas como mecanismo de recuperación de este proyecto.

Por eso, hasta que exista una copia completa con restauración probada, realizar solo un piloto acompañado del registro de referencia. Guardar reportes fuera del dispositivo ayuda a consultar información, pero puede cubrir solo un período elegido y no recupera la base automáticamente.

La política de producción debe definir quién crea copias, frecuencia según el volumen, destino independiente del teléfono, acceso, retención, verificación y responsables de restaurarlas. Una copia solo se considera operativa después de restaurarla en otro entorno y comparar productos, saldos e historial. Es un requisito pendiente de implementación y ensayo.

**Nota para el mantenedor:** SQLite usa WAL. Copiar el archivo principal abierto puede omitir cambios en `bodega.db-wal`; tampoco se debe borrar `-wal` o `-shm` para «arreglar» la base. Un futuro respaldo debe usar una API consistente de SQLite y una restauración validada/versionada. Ver [documentación SQLite de Expo](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/) y [WAL de SQLite](https://sqlite.org/wal.html).

### Ante un incidente

| Incidente | Respuesta actual |
| --- | --- |
| Teléfono perdido/dañado | Detener uso de esa base, continuar con el registro de referencia y avisar al encargado. No prometer recuperación sin copia recuperable. |
| App borrada o datos eliminados | No hay recuperación desde la interfaz. Conservar reportes externos e investigar con soporte; una instalación nueva empieza vacía. |
| Disco lleno/error al guardar | Detener movimientos si el estado no es claro. Comprobar saldo/historial antes de repetir. No borrar la base para liberar espacio. |
| Datos mezclados con catálogo demo | Revisar origen con el encargado; no vaciar una bodega real como limpieza rápida. La carga demo no puede deshacerse como grupo. |
| Dos teléfonos usados como si compartieran stock | Suspender esa práctica y conciliar físicamente con el encargado. No unir Excel ni copiar bases suponiendo una sincronización automática. |

## 6. Actualizaciones y cambios de teléfono

Conservar identificador de aplicación, firma, versión y esquema; probar una actualización sobre una copia/entorno de prueba antes de aplicarla al dispositivo operativo. Instalar sobre la app existente puede conservar datos si identidad y plataforma lo permiten, pero no se garantiza aquí una reversión de migraciones ni conservación en cualquier cambio de distribución.

El esquema actual es v4; la migración conserva productos, movimientos e identificadores e incorpora saldos anterior/nuevo, cantidades originales/vigentes y vínculo de rectificación de entradas. Las rectificaciones recalculan los reportes del período original; no son cierres contables bloqueados. Los ajustes anteriores no se reclasifican automáticamente. La migración es transaccional y no necesita vaciar la bodega. Una base ya migrada no se debe abrir con versiones antiguas; una base con versión superior se rechaza. No intentar abrirla con una versión antigua para forzar una reversión. No hay herramienta de migración Expo Go→binario o teléfono A→B disponible para el operador. Planificar esos cambios con respaldo/restauración probados antes de comprometer datos reales.

El mantenedor entrega notas de versión y una ventana de actualización; el encargado verifica saldos, apertura offline y reportes al terminar. Evitar desinstalar para «actualizar».

## 7. Acceso y datos

El inventario local no implementa login empresarial, PIN propio, roles ni identificación del operador. Quien puede usar la app en el teléfono puede acceder a sus funciones, incluida eliminación tras confirmación. El historial es modificable por eliminación del producto/bodega y no es una auditoría inmutable.

La configuración no activa cifrado SQLCipher de la base. No atribuir cifrado de aplicación a SQLite estándar; el bloqueo/cifrado del dispositivo es una capa distinta, gestionada por la empresa. Evitar introducir datos personales en nombres/notas y definir quién recibe los Excel exportados.

## 8. Brechas para producción

| Prioridad | Capacidad pendiente | Criterio de aceptación propuesto |
| --- | --- | --- |
| Antes de ser registro principal | Respaldo completo y restauración | Recuperar productos, stock e historial en otro equipo y comprobar integridad |
| Antes de ser registro principal | Distribución/actualización controladas y soporte | Instalación firmada, responsable, versión, pruebas físicas y procedimiento de incidente documentados |
| Según operación y acceso | Usuarios, roles y auditoría del operador | Solo usuarios autorizados modifican datos; cada acción atribuible y las anulaciones quedan trazadas |
| Antes de varios teléfonos | Backend, autenticación, sincronización offline y conflictos | Dos equipos realizan cambios concurrentes sin perder ni duplicar movimientos |
| Según el negocio | Ajustes auditables, lotes, vencimientos, unidades y bodegas | Flujos definidos y verificados con el usuario real |
| Mantenimiento | Revisión de dependencias y avisos | Cambios compatibles, pruebas y revisión de los avisos registrados |

Profesionalizar el producto incluye implementar y verificar esas capacidades cuando el negocio las requiere. La documentación no convierte funciones pendientes en disponibles ni sustituye una aceptación del cliente.
