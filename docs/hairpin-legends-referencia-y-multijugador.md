# SlotRace · Hairpin Legends como referencia y arquitectura multijugador

**13/11/2026 · Documento DEV. Sin publicación ni despliegue.**

## Análisis competitivo
Hairpin Legends es una referencia prioritaria para comparar construcción de circuitos (rampas, peraltes y cambios de carril), progresión, estilos de IA, torneos y multijugador. Las fichas del juego anuncian características que podrían pertenecer a versiones futuras: **no confundir las funciones anunciadas con funcionalidades verificadas en una demo**. Analizarlo para mejorar nuestro producto, nunca copiar código ni gráficos.

El valor propio que queremos conservar en SlotRace: montaje físico con piezas limitadas, asistente geométrico de cierre, cajas con planos, catálogo con autoría y competiciones con reglas comprobables.

## Lo que existe hoy
- Dos carriles, A y B, definidos por la pieza física de salida/meta; los duelos contra IA usan dos mangas con intercambio.
- Reloj de futuro evento en src/event-timing.mjs, con etiquetas de prueba local y clasificación, y resumen de dos mangas en src/race-results.mjs.
- Auth compartida de CraftRace Studio en Supabase. El nombre que manda el cliente NO prueba identidad.
- No existe servidor autoritativo, matchmaking, sincronización de carreras ni clasificación oficial. Esta entrega no los simula ni modifica la PWA.

## Dos formatos, una base de reglas
**1. async_time_trial:** muchos jugadores pueden competir de forma asíncrona en un circuito idéntico, pero la subida de actas locales es solo una petición de verificación. Para clasificaciones públicas, premios o récords hay que verificar entradas, resultados y simulación en servidor.

**2. live_duel:** dos pilotos compiten simultáneamente en dos carriles y disputan dos mangas intercambiados. Para un campeonato con más pilotos se usan rondas eliminatorias o ligas; no se admiten doce coches en dos carriles.

## Contrato técnico V1
- src/competition-protocol.mjs incluye defineCompetition, planLiveDuel, createClientIntent y prepareLocalSubmission.
- Cada reglamento fija competición, formato, ID y revisión de circuito, huella SHA-256, motor de físicas, versión del reloj y modalidad. Cambiar cualquiera de estos elementos exige nueva edición/revisión oficial.
- La huella enviada por el cliente debe comprobarse en servidor recalculándola sobre una **receta canónica**. Una cadena de 64 caracteres no constituye una prueba.
- En directo el cliente solo puede enviar intenciones ready, throttle (0–100), pause_request y rejoin_request. No admite resultados, vueltas, posiciones, créditos ni ganancias como mensajes.
- Las secuencias de red y el emisor autenticado se validarán **en el servidor**; el contrato JS no evita replays ni suplantaciones por sí solo.
- Un acta local se etiqueta siempre pending-server-validation y official:false. Ninguna comprobación desde la PWA confiere rango oficial.
- Todo esto permanece aislado del juego actual y de la versión DEV 0.15.64.

## Arquitectura futura de Supabase
- **Auth/RLS:** auth.users.id como identidad; comprobar owner en servidor y proteger registros de propietario, dirección de carrera y premios.
- **Postgres:** competitions (reglas congeladas), competition_entries, competition_attempts (idempotencia), competition_verdicts (validación y motivos), live_heat_assignments (carriles) y race_events (log secuenciado).
- **Realtime:** transporte y notificación. No usar Realtime como árbitro de físicas, tiempo, victoria ni monedas.
- **Árbitro:** servidor determinista que recibe entradas, reconstruye la simulación, verifica circuito/revisión, sesiones, física, cronómetro, antitrampas y publica veredictos. En directo el servidor es la fuente del estado; las visualizaciones del cliente son predictivas.
- **Reconexion/pausa:** decisión explícita por competición. El cierre, paso a segundo plano y regreso no inventan tiempo ni reinician una manga sin autorización.

## Camino recomendado
1. **Ahora:** contrato independiente, pruebas automáticas, documentación; sin UI, backend ni despliegue.
2. Vincular la receta canónica y las versiones reales al inicio de la carrera y a su acta; mantener inalterados los circuitos históricos locales.
3. Construir verificador y replay determinista; probar 15/30/60 FPS, colisiones, pausas, cruces y cambios de carril.
4. Activar eventos asíncronos en entorno de pruebas con veredicto servidor y ranking provisional distinguido del oficial.
5. Implantar duelos autoritativos en vivo (dos usuarios, dos mangas, cambio de carriles), tras estudiar latencia y coste.
6. Añadir campeonatos periódicos, torneos y catálogo competitivo; comparar de nuevo la demo de Hairpin Legends.

## Criterios de aceptación
- En dos mangas ambos jugadores nunca comparten un carril por error.
- Ningún cliente puede declarar tiempos, vueltas, posiciones, premios o victorias oficiales.
- Mensajes duplicados, antiguas secuencias y reintentos no generan ventajas ni premios dobles.
- Variantes de trazado, físicas o reglas no se mezclan en una misma clasificación.
- Recuperaciones y congelaciones de pantalla no inventan una vuelta.
- Ningún tiempo local se homologa sin verificación independiente.

Referencia complementaria: docs/roadmap-competiciones-tiempos.md, docs/chronometry-field-validation.md y docs/CRAFT_ACCOUNT.md.
