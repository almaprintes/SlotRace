# Auditoría de cronometraje — protocolo DEV

Actualización experimental de 9 de noviembre de 2026.

## Qué se mide

- `monotonic-v3` usa un reloj monotónico independiente de FPS.
- `elapsedMs` excluye los intervalos en pausa y la cuenta atrás de reanudación.
- `pauseCount` cuenta pausas reales (botón Pausar o aplicación oculta) después de haber arrancado el crono.
- `pausedMs` suma los milisegundos suspendidos y la preparación antes de «¡YA!».
- `flags` conserva incidencias de rendimiento y divergencias de reloj/física. No se homologa ninguna marca local.

Al finalizar normalmente una carrera no se registra otra pausa. El informe local presenta el número de pausas y los segundos excluidos para poder comparar una prueba de 20 segundos con los resultados.

## Protocolo de campo — iPhone

1. Comprobar en la cabecera la versión DEV 0.15.13 y el circuito, carril y coche usados.
2. Completar tres vueltas normales, sin salir de la PWA: debería indicar `sin pausas`; anotar cualquier aviso de FPS.
3. Completar tres vueltas pausando una vez durante la segunda, esperando unos 20 s y reanudando tras 3-2-1. El informe debería mostrar `1 pausa` y aproximadamente 23 s excluidos (20 s de espera + 3 s de preparación, más el tiempo de interacción). Las marcas no deben incorporar ese intervalo.
4. Repetir alternando la PWA con otra aplicación. Si queda detenida, nunca debe avanzar automáticamente sin cuenta atrás.
5. Comprobar que una vuelta con `physics-time-clamp` no produce récord.
6. Comparar los resultados y registrar el entorno; una ausencia de avisos no certifica por sí sola precisión absoluta de milisegundos.

## Prueba automatizada

`node tests/game-shell.cjs` verifica que 5 s de marcha + 20 s de pausa + 5 s de marcha = 10 s de crono, pero el resumen declara 1 pausa de 20.000 ms. Finalizar una carrera no debe sumar otra pausa.

## Qué queda pendiente

- Pruebas reales con diferentes FPS, calentamiento, suspensión y retorno desde iOS.
- Contrastar el paso físico por meta con una referencia externa independiente.
- En CraftRace, contrastar la telemetría subfotograma DEV con recorridos reales antes de tocar clasificaciones, fantasmas o tiempos publicados.

**No utilizar estos informes como actas oficiales ni comparar marcas de distintas versiones de físicas.**
