# Auditoría del sentido de carrera · DEV 0.15.7

El campo `direction` de las recetas v1 y `driveDirection` de la partida local representa el avance relativo al orden de montaje. La interfaz ahora informa del sentido **físico** visto desde arriba, sin reescribir valores históricos ni claves de récord o carriles.

El motor suma los ángulos de las curvas (eje Y hacia abajo): +360° indica que la secuencia de piezas gira en sentido horario; −360°, antihorario. El «Ocho» suma 0°, con un lóbulo en cada sentido, y no admite una descripción global horaria. El jugador puede elegir «Horario» al iniciar un montaje nuevo; la elección se mantiene hasta que se cierra y entonces se convierte a la dirección real.

## Recetas comprobadas
- Mónaco Slot, 59 piezas del JSON del 08/11/2026: suma −360°, `direction:-1` ya hace que el coche avance en horario. Cierre compatible con la flexión permitida.
- Catalunya Slot, 60 piezas del catálogo: suma −360°, por eso el plano para nuevas instalaciones pasa a `direction:-1`.
- Óvalo SR-Precision: suma +360°, `direction:1` significa horario.
- Ocho con puente: suma 0°, se etiqueta «Mixto · original/inverso».

Las demás pistas guardadas solo en la PWA del usuario no pueden auditarse remotamente sin exportarlas; el juego ahora calculará automáticamente sus etiquetas desde la geometría al cargarlas. No se modifica ninguna pista ya instalada ni sus tiempos; los Catalunya antiguos pueden mostrar correctamente «Antihorario» hasta que el propietario cambie la marcha desde el taller.

Las pruebas `tests/orientation.cjs` y `tests/game-shell.cjs` mantienen cobertura de estos casos y la intención horaria antes de cerrar un circuito nuevo.
