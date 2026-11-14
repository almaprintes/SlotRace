# Top Down RACE: SlotRace — arquitectura del duelo en directo
**Decisión de arquitectura · 13 de noviembre de 2026 · DEV 0.15.70**

## Objetivo y reglas inalterables
Dos pilotos humanos, cada uno en su dispositivo y con su cuenta CraftRace Studio, compiten simultáneamente en un mismo circuito construido con piezas de SlotRace. Se ven ambos coches y cada piloto controla **únicamente el suyo**.

- Dos mangas con **intercambio físico de carriles**. El anfitrión empieza en A y el invitado en B; se invierten en la segunda.
- Carriles separados: **sin PT82 no hay choque entre rivales**, ni cambio arbitrario de carril. Un coche puede doblar al otro, pero cada uno permanece en su ranura.
- Con PT82/X350, el contacto físico real se resuelve según el motor validado en 0.15.69: choque por alcance, sanciones 5/2,5 s según impacto grave; choque compartido en cruce 3 s para cada uno; reposiciones equivalentes después del obstáculo, misma animación, sin solapamientos.
- Descarrilamientos por velocidad, inercia y recuperación individuales del coche se conservan. Nada de inventar un motor diferente para el multijugador definitivo.
- Dos mangas, el mismo número de vueltas, salida sincronizada y vencedor por **menor tiempo total válido**. Nicks auténticos y coches identificados en la clasificación.
- Duelos en directo y retos diferidos son modalidades distintas. En diferido no existen colisiones entre coches; el retado no ve tiempos previos pero sí el coche grabado durante la carrera, como duelo visual. El modelo de sala debe preservar el tipo de carrera.

## Arquitectura propuesta

\`\`\`mermaid
flowchart TD
  A[SlotRace móvil del anfitrión] -->|Inputs numerados: gas y cambio de guía| S[Servicio de simulación autoritativa]
  B[SlotRace móvil del invitado] -->|Inputs numerados: gas y cambio de guía| S
  S -->|Snapshots y eventos firmados| A
  S -->|Snapshots y eventos firmados| B
  A -->|Identidad y sala| C[Supabase Auth + Postgres + Realtime]
  B -->|Identidad y sala| C
  S -->|Resultado y hash de simulación| C
  C --> R[Historial, recompensas y competiciones]
\`\`\`

### 1. Identidad y salas
- **Auth**: usuario real de \`auth.users.id\`; nick de \`public.craft_accounts.nickname\`; no usar datos editables de \`user_metadata\` como autorización.
- Supabase \`slotrace_live_rooms\`: ID UUID, código corto, host, invitado, nicks de la sesión, estado, vencimiento y reglas.
- Acceso privado mediante código; **RLS** y políticas en \`realtime.messages\`. Solo los dos miembros pueden observar o emitir eventos del canal privado. No enviar claves secretas al cliente.
- Para la versión completa: persistir \`track_recipe_id\`, \`track_hash\`, \`direction\`, \`physics_version\`, \`timing_version\`, \`vehicle_class\`, \`target_laps\`, \`ruleset\` y \`created_at\`.
- Validar la receta al crear la sala, y enviar al invitado exactamente la misma pista, sentido y elevaciones. No depender de que ambos hayan construido manualmente la misma geometría.

### 2. Conducción y latencia
- Cliente emite **comandos de mando** (gatillo cuantizado 0–100%, cambios de carril permitidos, botones) con \`seq\`, número de tick y firma de sesión.
- Simulador central recibe inputs y avanza con paso fijo (propuesta: 60 Hz); es autoridad sobre posiciones, descarrilamientos, contactos, vueltas y sanciones.
- Para suavidad: snapshots con tick/posición/velocidad/estado a 10–20 Hz, interpolación del rival con un búfer de 100–150 ms y predicción/reconciliación de la conducción propia.
- Supabase Realtime sirve bien para **presencia, sala, chat/estado y prototipado**. No equivale por sí mismo a un servidor autoritativo de física con tick fijo y baja latencia. La autoridad definitiva requerirá un servicio de sesión persistente (WebSocket con simulador en proceso), evaluando coste y escalabilidad antes de desplegarlo.
- No utilizar \`Date.now()\` de cada móvil para homologar la salida. Distribuir \`start_tick\` o sincronización de reloj calculada con servidor y medir con tiempo monotónico.
- Al perder conexión: detener los inputs; congelar o neutralizar ese coche según una política reproducible; reconexión por token de miembro y snapshot; cancelar/invalidar si la pérdida supera el plazo. Nunca continuar simulando con un mando permanentemente acelerado.

### 3. Reglamentación e integridad
- Reusar los módulos existentes \`timing-core\`, \`rear-contact\`, \`recovery-core\`, \`track\` y el estado de físicas ya probado. **Extraer** la lógica física de \`src/app.mjs\` a un núcleo portable e independiente del DOM; no copiar y divergir dos motores.
- Resolver PT82 desde el mismo estado de los dos coches en el mismo tick: choques compartidos solo si se cruzan desde guías distintas; alcance por detrás aunque estén sobre la PT82 usa regla de alcance.
- Registrar inputs, eventos, hashes por tick y metadatos de la versión física. El servidor debe validar vueltas y resultados antes de conceder premios oficiales; nunca aceptar un total enviado unilateralmente por el cliente.
- Resultado final inmutable e idempotente con los dos tiempos por manga, sanciones y estado de homologación.
- Evitar pagos duplicados por reconexión, revanchas y múltiples pestañas.

### 4. Estados de sala definitivos
\`created → waiting → ready → countdown → heat1 → intermission → countdown → heat2 → finished\`.
Salidas excepcionales: \`disconnected → reconnecting\`, \`abandoned\`, \`expired\`, \`void\`. Solo el servidor puede avanzar el estado de carrera. Ambos deben estar listos para cada manga; el intercambio de carriles es obligatorio.

## Alcance de la beta DEV 0.15.70
**Se trata únicamente de una prueba técnica entre dos móviles, no del multijugador definitivo**.

Implementado en rama \`feat/live-duel-beta-0.15.70\`:
- Cuentas existentes CraftRace Studio, salas privadas de dos usuarios, código y enlace de invitación, nicks.
- Canal privado Supabase Realtime con presencia, estado y retransmisión del coche; anfitrión lanza cada manga.
- Un **óvalo prefijado común**, sin PT82; tres vueltas por manga, dos mangas y cambio de carriles.
- Un simulador de interacción **reducido e independiente**, no reutiliza todavía el motor completo de físicas/cronometraje. Sus tiempos y descarrilamientos son **no homologados**; no concede créditos.
- La redacción de interfaz distingue siempre beta y carrera completa. No usar como base de récords ni premios.

### Prueba de dos dispositivos
1. Ambos inician sesión con **cuentas diferentes** y nicks distintos.
2. Anfitrión entra en \`live.html\`, crea sala y comparte código; invitado abre \`live.html?room=CODIGO\` e introduce o confirma.
3. Deben verse ambos nicks y conexión activa en ambas pantallas. Intentar un tercer dispositivo y verificar rechazo del código.
4. Anfitrión lanza primera manga. Verificar cuenta atrás, control individual, transmisión de posiciones, deslot individual y las tres vueltas de cada piloto.
5. Terminar la manga en ambos móviles. Ejecutar intercambio A ↔ B y completar segunda manga.
6. Confirmar que el nombre ganador y los totales coinciden en ambos dispositivos. Registrar calidad de conexión, congelaciones, discrepancias y errores.
7. Repetir con una desconexión deliberada y observar **fallo seguro**, sin adjudicar un resultado oficial.

### Criterios de aceptación de la beta
- Las dos cuentas se autentican y se conectan a una misma sala privada.
- Cada móvil puede controlar solo su vehículo y ver al rival.
- Ambos coches conservan carriles distintos en manga 1 y los intercambian en manga 2.
- Se muestra el mismo vencedor por suma de dos mangas.
- No se alteran guardados, inventarios, resultados y física del juego principal.
- No se afirman exactitud de latencia, física final, servidor autoritativo ni homologación antes de pruebas reales de dos dispositivos.

## Etapas siguientes
**Fase A (ahora)**: estabilizar prueba de conectividad, reparar nicks de resultados y recompensas locales de test con límites de servidor.
**Fase B**: sustituir el motor reducido por un núcleo compartido de la física actual, extraído y probado con escenarios de 0.15.69.
**Fase C**: servidor autoritativo con inputs secuenciados y snapshots; sincronización y reconexión; homologar circuitos sin PT82.
**Fase D**: integrar PT82 y contactos entre pilotos con sanciones y reincorporaciones idénticas a la versión local.
**Fase E**: resultados oficiales, clasificaciones, recompensas homologadas, invitaciones, revancha y campeonatos.

No incorporar el modo asíncrono de retos a la sala en directo; usar un módulo independiente sin colisiones pero compatible con el catálogo de circuitos y el modelo de resultados.
