# Revisión frente a la pauta de Unidad 3

Fecha: 26 de noviembre de 2026. Fuente: `WEBMOVIL_TRABAJO3.html`, facilitada por el equipo. La pauta se usa como criterio de evaluación; este archivo no sustituye el PDF.

## Resultado

El código incorpora el alcance mínimo del **T05: inventario de bodega con lectura de código de barras**. Las pruebas verifican reglas y operaciones de datos. **La entrega académica aún no está completa:** no se encontraron video, PDF, capturas de teléfono ni resultados propios registrados de medición. No es posible asignar una nota responsable con esos componentes pendientes.

| Criterio | Evidencia | Estado |
| --- | --- | --- |
| Escaneo | EAN-8, UPC-A, EAN-13, validación y bloqueo de lecturas repetidas | Implementado; falta prueba física |
| Alta | Código desconocido abre formulario; validación también en datos | Implementado y reglas probadas |
| Entrada y salida | Saldo e historial en transacción; rechazo de salida excesiva | Verificado con SQLite de Node |
| Stock bajo | Agotado con 0; bajo con stock ≤ mínimo; normal sobre mínimo | Pruebas unitarias; falta captura |
| Persistencia | SQLite; prueba que cierra y reabre archivo real | Verificado en escritorio; falta reinicio físico |
| Permisos | Explicación, rechazo, Ajustes, alternativa y error de cámara | Implementado; falta ciclo real |
| Teléfono físico | No se encontraron capturas o grabaciones | **Pendiente** |
| Medición propia | M1–M3 instrumentadas; sin valores registrados | **Pendiente** |
| Decisión y limitación | SQLite/transacciones, CLP, estado derivado; límites en README | Documentado; contrastar con medición |
| Video y participación: 30 puntos | Hay presentación HTML; video no encontrado | **Pendiente** |
| Informe: siete secciones | No hay PDF | **Pendiente** |
| Declaración IA: seis campos y firmas | Guía incluida | **Validar, completar y firmar** |
| Bibliografía: seis fuentes APA 7 | Seis referencias verificadas en guía | Citar e incorporar al PDF |

## Correcciones

- Dependencias alineadas al catálogo oficial: Expo 58.1, React Native 0.88.1, FileSystem 58.0.15, Sharing 58.0.24 y TypeScript 6.0.3; tipos Node explícitos y lockfile actualizado.
- Dos verificadores del catálogo demo corregidos; datos identificados como ficticios.
- Validación GTIN, stock inicial y mínimo en datos; UPC-A normalizado para evitar duplicados.
- Migraciones atómicas y rechazo de bases de versión futura.
- Recuperación de errores de apertura de base y montaje de cámara.
- Consultas antiguas no sobrescriben búsquedas recientes; errores de carga demo visibles.
- Limpieza de datos de M1; etiquetas M2/M3 y afirmaciones de rendimiento ajustadas a su alcance real.
- README del fork, pruebas de integración, CI y presentación coherente con la evidencia disponible.

## Antes de entregar

1. Ejecutar [pruebas físicas](PRUEBAS_DISPOSITIVO.md), registrar dispositivo/entorno y conservar evidencias.
2. Registrar una medición propia real e interpretar su alcance y limitaciones.
3. Confirmar integrantes, caso y autoría. Citar el origen del fork y explicar el código presentado.
4. Completar el informe según [la guía](GUIA_INFORME.md): portada, índice, introducción, desarrollo, conclusión, declaración IA y bibliografía.
5. Grabar **5 a 10 minutos**, con voz humana, participación equilibrada y apoyo visual. Mostrar la app en un teléfono.
6. Completar la presentación: buscar `[MEDIR]`, `[modelo]`, `[versión]` y `[N]`. Sustituir por evidencia antes de grabar.
7. Portada del PDF con enlaces clicables a **video, presentación y repositorio**. Verificarlos sin sesión; en Drive compartir el video, no una carpeta.
8. Revisar siete secciones, desarrollo ≤ 5 páginas, fuente 11 o 12, interlineado 1,15 o 1,5, márgenes uniformes, justificado, páginas numeradas desde introducción y tablas/figuras/código numerados, titulados y referenciados.
9. Revisar ortografía en español de Chile. Firmar declaración IA y completar nombre y RUT de cada integrante en PDF y cuerpo del correo.
10. Según pauta: **un solo PDF** a `c.munozs@utem.cl`, antes del **27 de noviembre de 2026, 23:59, hora de Chile**, asunto `[WEB] U3 - Apellido1 Apellido2 Apellido3`, ajustado al número real de integrantes. Enlaces sueltos en correo no reemplazan portada.

La revisión no envía correo, no firma por el equipo ni atribuye pruebas físicas que no se ejecutaron.

## Verificación técnica de esta revisión

La versión 1.4.0 agrega salidas violetas, período compartido con calendario, historial con búsqueda/paginación y cinco hojas Excel con datos diarios y por producto. El stock actual se mantiene separado del flujo por fechas. La nueva suite tiene 20 pruebas, incluidas fronteras de fecha, paginación estable y lectura del Excel generado. Los casos P16–P21 del protocolo físico siguen pendientes; no se atribuye validación nativa por el resultado de pruebas Node.

La documentación operativa se amplió con [manual de usuario](MANUAL_USUARIO.md) y [operación para empresas](OPERACION_EMPRESA.md). Se distingue el piloto actual de una puesta en producción, se documenta la base local y se conserva como pendiente el respaldo/restauración. Se sustituyó el `SafeAreaView` obsoleto y se declararon solo Android/iOS como plataformas de la app.

En Windows con Node 24.20.0: TypeScript sin errores, 14 pruebas aprobadas y exportación de bundles JavaScript Android/iOS correcta. `expo install --check` no detectó desajustes tanto con el catálogo local como con el catálogo en línea. Se añadió CI para repetir instalación, tipos, pruebas, compatibilidad y exportación en GitHub. La primera corrida remota detectó versiones más recientes que el catálogo local; se actualizaron las dependencias y se volvió a verificar. La creación de un APK y ejecución física siguen pendientes.

La auditoría npm detectó tres avisos moderados derivados de `minimatch` a través de `@expo/fingerprint` y Expo (GHSA-g3hv-75wg-m249); no encontró avisos altos o críticos. La solución automática propuesta retrocede a Expo 52: no se aplicó porque rompería la compatibilidad con SDK 58. Queda pendiente una actualización compatible de esa dependencia de las herramientas de Expo; no se afirma que la auditoría esté libre de avisos.

## Revisión v1.5.0: evolución y correcciones de cantidad

Gráfico nativo adaptable con selección táctil, tabla, fechas y períodos móviles. Ajustes ADJ desde Editar, motivo obligatorio y saldos anterior/nuevo, sin inflar flujos. Esquema v3 conserva IDs y secuencia; guardado atómico con protección ante saldo obsoleto. Excel incluye correcciones sin valorizarlas como recepción/despacho. Suite de 24 pruebas y exportación Android/iOS; interacción física pendiente, ver P22–P27.

## Rectificaciones v1.6.0

Corregir entrada rectifica cantidad vigente de una recepción elegida y stock en la misma transacción, conservando cantidad original, fecha, precio y constancia vinculada. No crea OUT. Las consultas de resumen, series y Excel usan la cantidad efectiva; la corrección afecta el período original. Ajuste de conteo conserva la semántica previa, separado de rectificaciones. Esquema v4 añade campos sin reconstruir v3 ni perder sus ajustes. Suite: 27 pruebas, con caso 20→15→20→0, despachos existentes, precio histórico, XLSX, rollback y migración v3→v4. Pruebas físicas pendientes P28–P34.

## Editor simplificado v1.6.1

Se retiró el selector de dos tipos en Editar. La selección de entrada permanece montada al variar la cantidad, el caso de entrada única se resuelve automáticamente y múltiples entradas se eligen en un modal con FlatList. Cancelar descarta el borrador; validaciones controlan Guardar; recepción/despacho quedan bloqueados durante edición. Sin cambios de esquema ni reglas de rectificación. Los ajustes anteriores se conservan. Validación nativa pendiente.
