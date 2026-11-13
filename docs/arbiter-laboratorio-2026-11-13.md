# SlotRace · árbitro de carreras (laboratorio, 13 noviembre 2026)

## Estado
El árbitro se desarrolla exclusivamente en \`server/referee-core.mjs\`. **No es un servicio desplegado** ni está conectado a la PWA, Realtime, Auth, tablas de competición o economía. No modifica la DEV 0.15.64 ni los circuitos locales. Esta rama parte de la PR #29 (protocolo de competiciones) y la extiende.

La base de Supabase **juukbnkjboiazqggqcyv** es compartida con Top Down RACE: CraftRace. Durante esta fase se leyó el catálogo de tablas (cuentas, perfiles, wallets) y la lista de Edge Functions (vacía). No se crearon tablas, funciones, políticas ni tokens.

## Qué implementa realmente
- Dos mangas de dos carriles físicos (A y B) con intercambio obligatorio de pilotos, sin permitir que ambos ocupen el mismo carril en la misma manga.
- Cada control entrante debe corresponder a la competición, sesión e identidad autenticada por la puerta de enlace del servidor; rechaza mensajes con resultados, tiempos, ganador, campos extra y secuencias repetidas/desordenadas.
- El cliente envía \`ready\`, \`throttle\`, \`rejoin_request\` y puede solicitar \`pause_request\`, pero un duelo competitivo no admite pausa solicitada unilateralmente. Tampoco puede adelantar el reloj o enviar cruces de meta.
- Un **motor que corre en el servidor** y que debe coincidir con el identificador de físicas y huella del circuito anuncia cruces. El núcleo deriva los milisegundos de ticks propios del servidor, rechaza vueltas inferiores al mínimo y detiene los resultados ante errores del motor.
- Al finalizar las dos mangas ofrece una clasificación **provisional no homologada**; nunca envía premios, créditos ni récords.
- \`replayAsyncAttempt\` reproduce controles de 0 a 100 cada tick sobre un motor del servidor, sin leer los tiempos del dispositivo para decidir la marca. Rechaza saltos de tick y comparaciones inconsistentes. Una coincidencia no prueba que un humano haya conducido.

## Limitaciones críticas: por qué sigue siendo laboratorio
1. El motor inyectado en las pruebas es una **simulación sintética simplificada**. Todavía no incluye la física real de aceleración, inercia, pérdida de adherencia, colisiones, cambios de carril, pendientes ni elevaciones de SlotRace.
2. No existe servicio público ni certificado de procedencia temporal de entradas. Cualquiera puede fabricar una secuencia de aceleraciones offline aunque su replay produzca tiempos coherentes. De ahí \`official:false\` y \`rewardEligible:false\` en todas las salidas.
3. El estado está **en memoria** para pruebas unitarias, no tiene transacciones SQL, idempotencia persistente ni autoridad distribuida. No debe desplegarse directamente como Edge Function sin resolver concurrencia, recuperación y persistencia.
4. \`engineFactory\` y \`step()\` son interfaces de **confianza exclusiva del servidor**; jamás exponerlas como comandos de cliente, ni aceptar geometría, física o cronómetro declarados por la PWA.
5. \`minLapMs\` es un umbral de laboratorio. En producción debe calcularse a partir de un circuito canónico y límites físicos verificados; nunca enviarlo desde el móvil.

## Próximos pasos, en orden
1. Extraer y homologar la **física determinista compartida** del motor real (\`src/app.mjs\`): controlar redondeos, paso fijo, aceleración y frenada, estrés de curvas, descarrilamientos, recuperación y colisiones. Usar circuitos Óvalo, Mónaco, Catalunya y doble ocho como fixtures comparables, con una \`physicsVersion\` inmutable.
2. Canonizar receta desde el servidor: catálogo de piezas, dimensiones, START350 única, conectividad, altura, sentido, curvas, cruces, versión y huella SHA-256 recalculada. No confiar en una huella aportada por el cliente.
3. Construir el **árbitro servidor persistente**, con registros de entradas, secuencias, tiempos y veredictos transaccionales. Recuperación tras caída y reintentos idempotentes sin duplicar vueltas/premios; gestionar desconexión y suspensiones.
4. Integrar la identidad CraftRace Studio con JWT validado en el backend: resolver \`auth.users.id\` en el servidor, nunca \`user_metadata\` o un ID escrito en el mensaje; proteger tablas con RLS. No exponer \`service_role\` ni secretos al cliente.
5. Probar tiempos y física con dispositivos reales, 15/30/60 FPS, cierre y reapertura, latencia y manipulaciones. Medir divergencias de replay antes de permitir premios o clasificaciones públicas.
6. Desplegar primero en entorno de pruebas, habilitar competiciones asíncronas verificadas y después duelos en vivo, torneos y clasificaciones periódicas.

## Criterios de homologación futura
- Reproducir de forma determinista el 100 % de eventos de carrera incluidos deslot, colisiones y pasos por meta, o invalidar cuando no puede verificarse.
- No otorgar crédito ni reconocimiento a sesiones sin identidad verificada, datos incongruentes, marcas imposibles, cambios de versión, carreras suspendidas o replay no comprobado.
- Registrar reglas y circuito inmutables, además de entradas secuenciadas y fallos, para auditorías y resolución de reclamaciones.
- Probar reentradas, secuencias repetidas, carreras simultáneas y fallo del servidor.

## Pruebas
\`\`\`sh
node tests/competition-protocol.cjs
node tests/referee-core.cjs
node tests/event-timing.cjs
node tests/timing-lab.cjs
\`\`\`
La prueba específica incluye identidad falsa, campos extra, inyección de ganador, entradas fuera de rango, reloj servidor, vueltas imposibles, fingerprint incompatible, doble manga, intercambio de carriles y actas que mienten sobre su tiempo. Las comprobaciones se ejecutan automáticamente en \`.github/workflows/referee-core.yml\`.

**Importante:** Las referencias a Hairpin Legends se utilizan para identificar metas de diseño; no se copian sus activos ni su código. Véase \`docs/hairpin-legends-referencia-y-multijugador.md\`.
