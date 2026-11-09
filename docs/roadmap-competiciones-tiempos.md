# SlotRace · plan de arquitectura 2026-11-09
## Objetivo
Fusionar una experiencia sencilla de montaje con competiciones rigurosas: circuitos virtuales construidos con piezas, carreras por carriles y eventos locales/online. Análisis basado en repositorios externos públicos consultados el 09/11/2026.

### Referencias y límites de licencia
- [SlotForge Circuit](https://github.com/theDutchmanJames/SlotForgeCircuit): encaje de piezas, dimensiones y longitudes por carril, creación de piezas, exportación. Licencia **Source-Available 1.0, No Software Sales or Paid Access**. Solo aprender conceptos: no copiar código ni diseños para SlotRace monetizable sin permiso escrito.
- [zariweyo/slot-race](https://github.com/zariweyo/slot-race): `TrackCompiler.ts` convierte piezas semánticas JSON a muestras geométricas, alturas, cruces y capas de visualización; `TrackStorage.ts` utiliza IndexedDB. No se ha encontrado archivo LICENSE: no reutilizar el código.
- [Open Lap](https://github.com/tkem/openlap), Apache 2.0: prácticas, clasificación, sectores, bandera amarilla, control de salidas.
- [YATSS](https://github.com/tekrantz57/YATSS), MIT: cronometraje, mangas y rotaciones, almacenamiento recuperable y auditoría del estado de carrera. Su recuperación explícita reanuda pausada; tras reinicio no inventa vueltas ni usa un reloj anterior.
- [cluening/tracks](https://github.com/cluening/tracks), MIT: catálogo de piezas y construcción sencilla en web.

### Hallazgo crítico en la DEV 0.15.8
`src/app.mjs` computa `dt = Math.min(.05,(now-state.latest)/1000)` y luego `state.seconds += dt`. Al superar 50 ms entre fotogramas, el tiempo registrado queda por debajo del tiempo real. También hay que estudiar el efecto de throttling, reanudación y velocidades de simulación. **NO homologar todavía récords competitivos.** Los récords actuales son históricos locales y deben permanecer separados.

### Primer entregable
`src/event-timing.mjs` es un motor independiente de pruebas para FUTUROS eventos, sin afectar aún al cronómetro de conducción existente:
- Reloj monotónico sin truncado de deltas, pausa/reanudación explícitas, flags de lag y regresión.
- Registro de cruces/validación mínima, vueltas rechazadas y claves de pista/versión física.
- Recuperación pausada; primer cruce tras reinicio sirve como referencia, nunca como una vuelta inventada.
- Clasificación por mejor tiempo (clasificatoria) o vueltas válidas y tiempo de llegada (carrera).
- `source:"local-unverified"`: ni el reloj del cliente ni las banderas locales sustituyen validación autoritativa.
- `tests/event-timing.cjs` cubre lag, pausas, crash recovery, checkpoints y rankings.

### Próximas etapas y criterios
1. **Geometría precompilada (inspirada en PixiJS):** identificar cuáles muestras, cruces, alturas y carriles se recalculan, cachear solo trazados inmutables, medir FPS/P95 iPhone y evitar cambiar la física. Tests Mónaco, Catalunya y Doble óvalo antes y después del cacheado.
2. **Constructor (conceptos de SlotForge):** selección sin desplazarse en exceso, encaje asistido, selección de tramo y medición visible de huecos. No importar activos de terceros.
3. **Reloj oficial v2:** integrar tras auditoría con pruebas de fotogramas lentos y pausas; registrar eventos de salida/meta y puntos de control como datos inmutables. Mantener versión de físicas, plataforma, tramo, carril, circuito y completitud.
4. **Eventos v1:** entrenamientos, clasificación, mangas con intercambio de carril, resultados e historial, estados de protesta/revisión. Habilitar solo competición local mientras no exista validación en servidor.
5. **Competiciones online:** autoridad en Supabase/servidor; comprobar progresión, firmas de sesión, reglas, saltos de frames, replays y controles anti-trampa. Nunca fiarse únicamente de timestamps JS enviados por la PWA.
6. **Persistencia resiliente:** diario en IndexedDB, confirmación atómica de vueltas, recuperación pausada tras cierre y sello de revisión. No reanudar una manga tras la reconexión sin decisión del piloto/director; al recuperar no inventar tiempo.
7. **Publicación oficial:** auditoría comparativa entre reloj y simulación en dispositivos reales; política de pausas/abandono; control de versiones de física; pruebas con 30/60/120 FPS y caída de frames.

### Condición de seguridad
Esta entrega **no cambia ni reescribe** las seis pistas locales del usuario ni sus récords. No se habilitan rankings públicos ni premios hasta confirmar medición y verificación.
