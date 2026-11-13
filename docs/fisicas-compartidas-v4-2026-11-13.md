# SlotRace · física compartida v4 y arbitraje experimental
Fecha: 13/11/2026. Rama de desarrollo; NO publicada.

## Hecho
- src/physics-v4.mjs contiene las ecuaciones puras de rear-physics-v4 (aceleración e inercia, fuerza lateral por radio/carril, progresión del esfuerzo en curva, muelle y amortiguador traseros, estrés y descarrilamiento).
- src/app.mjs importa y utiliza ese núcleo, en lugar de mantener fórmulas de conducción duplicadas. El bucle visual y la versión pública no se han cambiado.
- server/track-identity.mjs valida una receta con exactamente una START350, geometría cerrada, elevaciones e inventario físico, y obtiene una SHA-256 de geometría canónica, sentido y versión de físicas. Rotar el índice de piezas hasta la meta no altera la huella.
- server/physics-engine.mjs utiliza los dos carriles reales de src/track.mjs y calcula movimiento a intervalos de 10 ms. No usa tiempos enviados por la PWA.
- server/referee-core.mjs permite que un motor fiable comunique la fracción del tick en que cruza un coche. El tiempo del servidor se interpola dentro del tick.
- Dos mangas intercambian los carriles; clasificación y actas permanecen NO OFICIALES.
- Tests automáticos: tests/shared-physics-v4.cjs, tests/shared-app-physics-contract.cjs, tests/referee-core.cjs, tests/competition-protocol.cjs.

## Límites actuales (importantes)
1. El motor servidor aún NO modela las colisiones ni el cambio de carril PT/82, y por eso rechaza la pieza PT/82 para las competiciones. El juego local conserva su funcionamiento.
2. La PWA sigue usando tiempo de fotograma variable y la versión de servidor da pasos fijos. Compartir ecuaciones no garantiza aún el mismo recorrido paso a paso entre ambos. Tampoco se han homologado 15/30/60 FPS reales en iOS.
3. Las funciones matemáticas trascendentes pueden variar en última precisión entre motores JavaScript; el servidor será la única autoridad cuando haya carreras online.
4. Un replay físico coherente NO demuestra conducción humana ni que los controles hayan llegado en tiempo real. No basta para conceder créditos o récords.
5. Las rutinas de la IA usan por ahora una respuesta de velocidad distinta. Para competir oficialmente, la IA deberá generar solo decisiones de aceleración y usar el mismo núcleo físico que el jugador.
6. No hay infraestructura desplegada: sin token validado en un árbitro remoto, sin almacenamiento transaccional de entradas, sin reconciliación en red y sin premios.

## Mejor ruta propuesta
1. Validar equivalencia de dinámica y cruces en Óvalo, Mónaco, Catalunya y Ocho. Después habilitar paso fijo en la PWA con pruebas de rendimiento móvil y correcciones visuales suaves.
2. Priorizar eventos de tiempos asíncronos, sin récords ni créditos oficiales, antes que multijugador sincronizado. Reducimos problemas de latencia, servidores y batería.
3. Para duelos en vivo, simulación autoritativa en servidor + predicción inmediata en móvil + reconciliación con estados numerados; no dos árbitros.
4. Extraer colisiones y PT/82 como subsistema determinista con resolución simultánea y pruebas de reentrada. Nadie puede reaparecer encima de un coche que va por delante.
5. Cuando el reloj, los replays, la identidad y el control antiabuso estén certificados, habilitar clasificación pública y economía.

## Seguridad de la entrega
No se ha modificado ninguna tabla, política ni función de Supabase, y no se ha desplegado ningún cambio de la PWA. Ningún tiempo o premio generado por el laboratorio se certifica. Todo está aislado en una rama y depende de las PR previas #29 y #31. El fallo anterior de la tienda pack-bridge sigue registrado como incidencia #30.
