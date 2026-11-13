# SlotRace · jugador, IA y árbitro: física compartida y circuitos exigentes
13 de noviembre de 2026 · Rama de revisión. No desplegada.

## Implementado
- La IA ya no acelera y frena mediante una fórmula de velocidad diferente: decide el porcentaje de gatillo y usa el mismo núcleo de aceleración, inercia, adherencia, muelle trasero, derrape y descarrilamiento que el jugador.
- La IA conserva estado propio: velocidad, desplazamiento y velocidad lateral de la trasera, estrés, progresión de curva, penalizaciones y recuperación.
- El cálculo de la progresión de cada curva es compartido entre PWA, IA y servidor; las uniones de piezas consecutivas no reinician el esfuerzo de curva.
- La decisión de gatillo sensible a pista, anticipo de curvas y distancia al coche precedente es compartida entre el navegador y el servidor. El rival CPU del servidor decide su acelerador sin aceptar órdenes de control dirigidas a él.
- La detección de meta y el intercambio de carriles del árbitro permanecen independientes de los valores declarados por el móvil. Todo se mantiene marcado como NO OFICIAL, sin créditos ni récords.

## Comprobaciones automáticas
La batería específica de GitHub ha superado el protocolo, replay, IA real en PT/82, física compartida y geometría compleja. Se probaron dos mangas con cambio A/B, repetición exacta de resultados y comparación del mismo coche físico cuando acelera como CPU o a partir de sus decisiones de gatillo:

1. Mónaco Slot, 59 piezas: desde la receta original de pruebas.
2. Catalunya Slot, 60 piezas: diseño ya presente en el código del juego.
3. Doble óvalo elevado, 16 piezas: con puentes y cruces reales.
4. Ocho con meta, 16 piezas: variante cerrada y elevada a partir de la receta base.

Los circuitos antiguos sin salida/meta se han convertido SOLO en memoria de los tests, sustituyendo una recta S350 por START350 de igual longitud, o usando equivalencia de longitudes en el ocho. Los JSON originales y partidas de usuarios permanecen intactos.

IMPORTANTE: No existe una receta identificada inequívocamente como el circuito personal Doble Ocho entre las fixtures del repositorio ni los archivos recuperados. Las pruebas de Ocho y Doble óvalo NO son una certificación de ese circuito concreto.

## Límites aún pendientes
- La PWA usa dt variable por requestAnimationFrame; el servidor usa pasos fijos de 10 ms. Compartir ecuaciones no garantiza iguales trayectorias hasta migrar el integrador del navegador y medir iOS real.
- El árbitro físico aún no reproduce colisiones entre coches ni conflictos en la PT/82. La PT/82 sigue funcionando en juego local, pero el servidor competitivo la rechaza.
- Falta un árbitro persistente con entradas verificadas, reloj del servidor, antitrampas, reconexión e identidad autenticada. Ningún replay local sirve todavía para premiar créditos o adjudicar récords oficiales.
- Las plataformas JavaScript pueden diferir en último bit de ciertas funciones numéricas; el servidor debe ser la autoridad oficial.

## Alternativa de producto recomendada: carreras fantasma
Antes de emparejar a dos pilotos en directo, habilitar carreras contra el fantasma de otro jugador: replay de su secuencia de aceleración sobre el mismo circuito, revisión, dirección y física. Su conducción local responde sin latencia de red y permite competiciones atractivas mientras maduramos el servidor en vivo. Los fantasmas competitivos deben provenir únicamente de intentos comprobados en servidor.

## Próximos hitos
1. Integrador de física con paso fijo en la PWA, sin alterar cronómetro monotónico, pausas ni interpolación de cruces, y pruebas 15/30/60 FPS reales.
2. Subsistema común de detección de impactos, adelantamientos tras descarrilamiento y recuperación sin coches superpuestos.
3. Simulación competitiva segura de cambio de carril PT/82 y choques simultáneos; incluir la receta exacta de Doble Ocho cuando esté disponible.
4. Activar eventos de tiempos y fantasmas primero; multijugador online sincrónico solo tras medir latencia y validar el antitrampas.

Cambios exclusivamente en rama GitHub apilada sobre PR #32, #31 y #29. Sin despliegue de PWA ni escrituras en Supabase.