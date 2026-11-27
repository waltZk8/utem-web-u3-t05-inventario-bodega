# Guía del informe y exposición

**No es un informe listo para entregar.** Completar observaciones, mediciones, identidad, firmas y enlaces; el README no sustituye el PDF.

## Siete secciones obligatorias

1. **Portada:** título T05, nombres completos y RUT, asignatura/sigla, docente, fecha y enlaces visibles/clicables a video, presentación y [fork](https://github.com/HectorEstepa/utem-web-u3-t05-inventario-bodega). RUT y firmas pueden mantenerse privadamente en la entrega al docente.
2. **Índice:** secciones y páginas reales tras exportar.
3. **Introducción:** quién controla la bodega, problema y alcance. Si no hubo validación con negocio real, declarar caso hipotético.
4. **Desarrollo, máximo cinco páginas:** distribución sugerida abajo.
5. **Conclusión:** resultados observados, aprendizajes y pendientes. Redactar tras pruebas físicas; no afirmar mejoras sin resultados.
6. **Declaración de uso de IA generativa:** seis campos completos y firmas.
7. **Bibliografía:** mínimo seis fuentes verificables, APA 7 y citadas en el desarrollo.

| Página de desarrollo | Contenido | Evidencia por agregar |
| --- | --- | --- |
| 1 | Caso, alcance y flujo escaneo → consulta → ficha/alta | Figura 1: flujo referenciado en texto |
| 2 | Cámara, permiso, rechazo, alternativa y ciclo de vida | Figura 2: captura física |
| 3 | SQLite, transacción, validación y asincronía | Código 1 legible y prueba de salida rechazada |
| 4 | Stock normal/bajo/agotado y reapertura | Figura 3: capturas físicas |
| 5 | Medición, decisión y limitaciones | Tabla 1: resultados y condiciones reales |

El límite no incluye secciones formales. Usar fuente 11 o 12, interlineado 1,15 o 1,5, márgenes uniformes, justificado y numeración desde introducción. Tablas, figuras y código deben llevar número, título y referencia desde el texto.

## Conceptos de la unidad y citas sugeridas

- **Permisos y ciclo de vida:** explicar cuándo se solicita cámara, rechazo y suspensión fuera del primer plano (Expo, s. f.-a; Meta Platforms, Inc., s. f.-a).
- **Asincronía y persistencia:** `async/await`, `try/catch` y transacción que conserva saldo e historial consistentes (Expo, s. f.-b; SQLite, s. f.).
- **Interfaz y estado:** lista virtualizada y stock derivado de saldo/mínimo (Meta Platforms, Inc., s. f.-b; React, s. f.).
- **Despliegue:** distinguir bundle JS, Expo Go y APK instalado; acompañar rendimiento con evidencia del teléfono.

## Declaración de uso de IA generativa

Esta base describe la asistencia de esta revisión. Agregar herramientas y tareas previas del grupo, cuya historia no consta aquí. No firmar sin revisar.

| Campo obligatorio | Base para completar y validar |
| --- | --- |
| Herramientas utilizadas | Codex, agente basado en GPT-6, revisión del 26 de noviembre de 2026. Agregar herramientas/versiones realmente utilizadas antes. |
| Para qué se usó | Contraste con pauta, revisión/corrección de código, validaciones y migraciones, pruebas, README y guías, consulta de documentación oficial. Confirmar cambios incorporados. |
| Qué NO se usó | La IA no hizo pruebas físicas, no grabó voces del equipo, no obtuvo mediciones físicas ni firmó. Completar partes íntegramente propias del grupo, distinguiendo código de la base del fork. |
| Verificación realizada | Registrar pruebas, resultados, commit, versión de Node y verificaciones Expo. Agregar modelo, SO y evidencia de pruebas físicas. No declarar pendientes como hechos. |
| Modificaciones | Explicar qué cambió el equipo de la propuesta IA y por qué. La revisión corrigió verificadores, validaciones y migraciones, añadió pruebas y ajustó afirmaciones sin evidencia; el grupo debe comprender y confirmar los cambios. |
| Firma | Nombre completo, RUT y firma de cada integrante en el PDF final. Pendiente. |

## Bibliografía de apoyo en APA 7

Estas seis páginas técnicas fueron consultadas y se relacionan arriba con su aplicación. La pauta y el repositorio de origen también deben identificarse cuando se utilicen. Las referencias no sustituyen resultados propios.

1. Expo. (s. f.-a). *Camera (SDK 58).* https://docs.expo.dev/versions/v58.0.0/sdk/camera/
2. Expo. (s. f.-b). *SQLite (SDK 58).* https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/
3. Meta Platforms, Inc. (s. f.-a). *AppState.* React Native. https://reactnative.dev/docs/appstate
4. Meta Platforms, Inc. (s. f.-b). *FlatList.* React Native. https://reactnative.dev/docs/flatlist
5. React. (s. f.). *Conditional rendering.* https://react.dev/learn/conditional-rendering
6. SQLite. (s. f.). *Transaction.* https://www.sqlite.org/lang_transaction.html

Revisar datos editoriales/fecha al preparar la versión final; son páginas mantenidas. Conservar SDK 58 en referencias Expo. Para el algoritmo GTIN añadir explicación oficial GS1 si se desarrolla ese punto; un dígito válido no certifica una asignación comercial.

## Video: propuesta de siete minutos

- 0:00–1:00: problema, alcance y procedencia del código.
- 1:00–3:00: permiso, código desconocido, alta y entrada en teléfono real.
- 3:00–4:30: salida, alerta, rechazo por saldo y reapertura.
- 4:30–6:00: medición propia y explicación de transacción.
- 6:00–7:00: hallazgos y límites.

Repartir equilibradamente las voces, usar apoyo visual y explicar sin leer. Cada integrante debe poder defender `useState`, `useRef`, `async/await`, GTIN, transacciones y la métrica mostrada. Probar video en incógnito y abrir PDF en otro equipo antes de enviar.
