# SlotRace · DEV 0.5.4 — más velocidad, derrape y trompos animados

Proyecto independiente de Top Down RACE. Prototipo web **jugable en móvil**, desplegado con **GitHub Actions + GitHub Pages** y sin backend.

**Enlace:** https://almaprintes.github.io/SlotRace/


## DEV 0.5.4 — conducción más expresiva

- **Más velocidad de carrera:** velocidad objetivo máxima virtual de 950 a **1.150 mm/s** (+21 %).
- **Curvas menos castigadoras:** límite básico R2 pasa de 610 a 690 mm/s y la tolerancia de salida de ×1,10 a ×1,20. En una misma curva el umbral efectivo aumenta aproximadamente un 23 %; sigue dependiendo del carril y el radio.
- **Derrape controlado:** cuando el coche circula al 72–100 % del límite efectivo de curva, la carrocería se inclina gradualmente, la parte trasera desliza ligeramente (hasta 12 mm virtuales) y aparecen estelas breves. **No cambia el centro de la ranura ni el recorrido contabilizado.**
- **Trompo visible:** cuando se sobrepasa el límite, el coche se desplaza hacia fuera, da dos vueltas completas y vuelve progresivamente a la misma posición. Queda inmovilizado durante los **3 segundos** de penalización; el reloj sigue corriendo y la vuelta sigue siendo válida.
- **La animación no modifica la posición real del coche:** no permite atravesar, adelantar ni saltarse tramos o checkpoints. El efecto es visual y la física sigue siendo provisional.
- Se añade `tests/drift-spin.cjs` con verificaciones de velocidad, derrape sin salida, giro, regreso a la ranura, conservación de distancia y vuelta, cronómetro y penalización.

La versión de la pantalla de carga y la cabecera es **DEV 0.5.4**. Prueba en Safari: https://almaprintes.github.io/SlotRace/?v=0.5.4

## DEV 0.5.3 — rueda táctil de sintonización

El mando pasa a ser una **rueda estrecha de 66–70 px**, vertical, con estrías visuales. El jugador desliza el pulgar **arriba** para aumentar la alimentación del coche y **abajo** para reducirla. Cada avance de 7 px produce una muesca de **5 puntos porcentuales**; hay 20 muescas desde 0 hasta 100 %.

A un lado, fuera de la zona donde va el pulgar, se encuentra una **pantalla de porcentaje grande** con barra vertical y marcas 0/25/50/75/100. La rueda emite un **clic sintetizado localmente** por cada muesca: tono agudo al subir (1260 Hz) y grave al bajar (670 Hz). El botón **🔊 CLIC / 🔇 MUDO** permite silenciarlo sin cambiar el mando; su preferencia se conserva en el navegador. En Safari iOS, el sonido se activa durante la primera interacción táctil compatible; si el dispositivo o navegador no permite audio, el mando sigue funcionando en silencio.

**Al soltar, el gas cae a cero**, como en un mando Scalextric con retorno. No hace clic 20 veces al soltarse: los clics únicamente acompañan los movimientos del pulgar. La física continúa utilizando la potencia real de 0–100 %.

## DEV 0.5.3 — corrección del cruce

- Los raíles se dibujan como **una superficie continua**, evitando superposición de bordes y sombras en las juntas de rectas y curvas.
- Solo existe una **máscara de puente de aproximadamente 370 mm de longitud** centrada en el cruce: el tramo elevado no repinta toda la diagonal ni esconde el coche fuera del cruce.
- El coche del carril inferior se pinta antes de esa máscara corta y queda oculto **solo al pasar por debajo**; el de la sección superior se pinta después y permanece visible.
- Las piezas y el recorrido siguen siendo los mismos. Puente y soportes siguen siendo un prototipo visual, no una simulación tridimensional real.

### Pruebas
```sh
node smoke.cjs
node tests/analog-trigger.cjs
node tests/bridge-occlusion.cjs
```

GitHub Actions las ejecuta antes de publicar en Pages. Para probar en móvil: https://almaprintes.github.io/SlotRace/?v=0.5.3 y comprobar que en la carga y la cabecera figure **DEV 0.5.3**.

## Novedades de DEV 0.5.2

- **El coche circula realmente por debajo del puente en la vista cenital.** La renderización se divide en tres capas: pista inferior, coche del tramo inferior y puente elevado por encima. Cuando el coche llega a una sección elevada, se dibuja después del puente y permanece visible sobre él.
- El nivel visual se deduce de **qué tramo de la trayectoria recorre el coche**, nunca de cuál de las dos vías aparece más cerca en la pantalla. Así se distinguen correctamente dos puntos que se solapan en el cruce.
- El coche inferior queda momentáneamente oculto por el puente y vuelve a verse al salir. El HUD muestra «COCHE PASANDO POR DEBAJO DEL PUENTE» durante ese paso.
- Se ha revisado la física a porcentajes bajos: **25 % de gatillo ya hace avanzar el coche** desde parado. La respuesta gradual con inercia reduce al retroceder el dedo, en vez de comportarse como un interruptor.
- Las pruebas automatizadas `tests/bridge-occlusion.cjs` y `tests/analog-trigger.cjs` verifican el orden de dibujo y el acelerador progresivo, además de las pruebas geométricas. GitHub Actions exige que pasen las tres antes de publicar.

**Prueba en móvil:** https://almaprintes.github.io/SlotRace/?v=0.5.2 . La pantalla de carga y la cabecera deben mostrar `DEV 0.5.2`.

## Novedades de DEV 0.5.1

- Sustituye el control binario «MANTENER PARA ACELERAR» y su deslizador separado por **un solo gatillo táctil grande**, que se rellena conforme se regula el gas.
- Desliza **hacia arriba o hacia la derecha para acelerar** y vuelve hacia abajo o izquierda para reducir, sin soltar el dedo.
- La escala aparece graduada en **0, 25, 50, 75 y 100 %**, con el porcentaje exacto en grande y sincronizado con el indicador del HUD.
- Una pulsación quieta inicia en **0 %**, no en 100 %. Al soltar el dedo o cancelar el contacto, el gas vuelve a cero. La pausa y el paso a segundo plano también lo liberan.
- La simulación del coche utiliza directamente el porcentaje continuo del control táctil; no se convierte a un booleano 0/100. El teclado puede seguir acelerando con espacio/flecha arriba a modo alternativo.
- Añade `tests/analog-trigger.cjs`, que prueba gestos verticales y horizontales, valores intermedios, marcha atrás del gesto, suelta, varios dedos y aceleración parcial. GitHub Actions exige pasar la prueba antes de publicar.

**Para probarlo:** abre https://almaprintes.github.io/SlotRace/?v=0.5.1, comprueba que aparezca DEV 0.5.1 en la pantalla de carga y en la cabecera, pulsa Correr y desliza el dedo dentro del botón graduado.

## Novedades de DEV 0.5.0

- **Pantalla de carga de inicio** con logotipo, estado de preparación y **DEV 0.5.0** en grande. Sólo desaparece después del primer fotograma dibujado. Si ocurre un error, ofrece volver a cargar.
- **Versión visible en la cabecera del móvil** después de la carga, para saber exactamente qué desarrollo se está probando.
- **Ocho de 18 piezas como circuito inicial** al entrar por primera vez en esta versión: 4 rectas largas, 5 curvas R2 derechas, 4 rectas largas, 5 curvas R2 izquierdas.
- El ocho **cierra con exactitud matemática** y el cruce queda en el medio de las dos diagonales, entre las rectas centrales.
- **Puente automático virtual**, a 65 mm, dibujado sobre la segunda diagonal con sombras y dos soportes. Permite probar la carrera del ocho. **La elevación está representada visualmente, todavía no es una simulación 3D detallada ni un modelo de soporte comercial.**
- La mesa conserva retícula de 25 mm (marcas de 100 mm), y ajuste de la cámara para girar el iPhone sin el redimensionado continuo anterior.
- **Migración sin borrar el trabajo:** en la primera apertura de DEV 0.5.0, el circuito de la versión 0.4 se conserva como borrador recuperable. Los récords antiguos permanecen locales. Una vez en 0.5, el circuito actual se guarda en una clave nueva.

### Cómo comprobar la versión
Abre https://almaprintes.github.io/SlotRace/?v=0.5.0 . Debes ver **DEV 0.5.0** durante la carga y después en la parte derecha de la cabecera. Si no sale, la publicación de GitHub Actions aún no se ha actualizado o el navegador conserva recursos antiguos.

## Corrección del ocho de 225° (0.4.4)

**El error original estaba en las dimensiones del motor**, no en el planteamiento de la construcción del usuario: el motor usaba **370 mm como radio del eje** de una curva R2 de 45°, pero esa medida corresponde aproximadamente al radio de su **borde exterior**. La pista de Scalextric Sport mide unos 156 mm de ancho, por lo que el eje central ronda los 292 mm. El radio usado era demasiado grande.

Para reproducir **matemáticamente** la plantilla de ocho del usuario, este prototipo digital utiliza un radio R2 virtual calibrado de `2 * 350 * (√2 − 1) = 289,94949366 mm`. Esta es una **calibración del juego**, no una especificación de fabricante certificada. El radio provisional R1 pasa a 136 mm de eje, en lugar de utilizar su borde exterior de 214 mm.

La nueva plantilla **«Ocho 225°»** monta **2 rectas → 5 curvas derechas → 4 rectas → 5 curvas izquierdas → 2 rectas** (ocho rectas y diez curvas). El resultado vuelve al origen con error inferior a 0,001 mm y diferencia angular nula, y demuestra el equilibrio de los giros de 225° y −225°.

**El ocho queda geométricamente CERRADO pero todavía no es apto para carreras**, porque el cruce central está a un mismo nivel y necesita puente y soportes. El motor ahora reconoce ese cruce aunque coincida exactamente con el conector inicial. No lo homologa ni engaña al usuario con un carril atravesado.

Referencias:
- Radio exterior aproximado R2 de 14,57 pulgadas: https://westsidetrains.com/store/scale/132/r2-curve-45-degrees-2pkg-1-32-scalextric/
- Pista Sport de 156 mm de ancho: https://www.slotcar-boutique.com/en/251-scalextric-track

## Cierre matemáticamente exacto

El editor distingue **posiciones** y **orientaciones** de los conectores. En un recorrido cerrado, los extremos deben tener un error menor de 3 mm y 1°; no se estiran rectas ni curvas para hacerlos coincidir. El panel indica el **desfase en milímetros** y la **diferencia angular en grados**.

El botón **«Cerrar exacto»**, visible junto a «Correr», busca una continuación con piezas reales y disponibles. Primero prueba insertar piezas y, si hace falta, sustituir hasta tres tramos recientes. Si encuentra una solución sin cruces al mismo nivel, la coloca con autoguardado y permite **deshacer**. Si no la encuentra, deja el diseño intacto. No resuelve cruces físicos con falsas conexiones: esos necesitan un puente o una disposición diferente.

El circuito de pruebas y ocho curvas de 45° cierran por cálculo exacto. Las curvas simétricas derecha/izquierda se comprueban como imágenes especulares mediante pruebas automáticas. El programa ahora detecta intersecciones incluso en diseños **abiertos**.

La mesa visual se ajusta al tamaño de la construcción cuando las piezas sobrepasan la superficie inicial, **sin cambiar las dimensiones de las piezas ni sus conectores**.

## Qué cambia en 0.4

- Mesa visible, de madera con tapete verde, tablero de 220 × 145 cm virtuales, sombras, marco y piezas modulares que se ven sobre ella.
- Piezas físicas digitales de **dos carriles**, separadas por uniones visibles; cada módulo lleva sus ranuras de guiado y carriles metálicos dibujados.
- Catálogo inicial de rectas de 350 y 175 mm, curvas de R2 de 45° a izquierda/derecha, y curvas R1 de 45°; todas con inventario finito.
- Los extremos se unen **geométricamente** al añadir módulos desde la caja. También puedes arrastrar una pieza desde el asa **⠿** de la caja, dejarla suelta sobre el tapete, girarla, moverla y acercarla al extremo amarillo de la pista para que encaje.
- La selección de un tramo sobre la mesa permite sustituirlo o quitarlo, rehaciendo los encajes a continuación. Los módulos sueltos consumen inventario y se devuelven a la caja al retirarlos.
- **Deshacer/rehacer**, zoom con botones, pan con un dedo y zoom con pinza.
- Óvalo inicial de 12 piezas; cuando la geometría se cierra realmente y no sale del tablero, queda habilitada la validación local.
- Pantalla de carreras separada con coche y mesa siempre visibles, gatillo de pulsación continua / deslizador analógico, vueltas y tiempos por carril.
- Si pruebas una pista abierta, **la construcción se guarda como borrador** y se monta el óvalo para empezar. El botón «Recuperar trazado» permite volver a ella.
- Estado guardado en el almacenamiento local del navegador. La navegación privada puede borrarlo al cerrar la sesión.

## Controles

1. **Mesa:** toca una pieza en la caja inferior para añadirla al extremo amarillo; se encaja automáticamente en el tramo anterior. Para colocarla físicamente en la mesa, arrástrala desde **⠿** y suéltala donde quieras sobre el tapete.
2. Toca un módulo de pista para **seleccionarlo**, luego toca otro módulo de la caja para sustituirlo, o pulsa «Quitar». Si está **suelto**, puedes arrastrarlo, girarlo con «⟳ Girar» y acercarlo al extremo amarillo para encajarlo.
3. Usa **↶/↷** para deshacer/rehacer; **Óvalo** para empezar con una pista cerrada; **Vaciar** para empezar desde cero.
4. Arrastra sobre la mesa para desplazar la cámara y pellizca para ampliar/reducir. Los botones +/−/⌖ hacen lo mismo.
5. Pulsa **Correr** para entrar al pilotaje; **MANTENER PARA ACELERAR** equivale a apretar el gatillo a fondo. El deslizador permite ajustar la aceleración, y regresa a cero cuando sueltas el dedo.
6. Puedes pausar, cambiar de carril mientras está pausado y regresar a la mesa. Las vueltas terminadas y los mejores tiempos se guardan por configuración de pista.

## Dimensiones y límites

Se han tomado referencias de pista Scalextric Sport 1:32: recta estándar de 350 mm; curva R2 de 45° con radio de referencia de 370 mm; ancho aproximado de pista 156 mm y separación entre ranuras de 78 mm.

**Es un modelo digital experimental, no una reproducción certificada ni una licencia de Scalextric.** Falta verificar contra una pieza física real el radio exacto al eje de cada ranura y el perfil de los conectores.

Fuentes de referencia:
- [Scalextric C8198 · recta 350 mm y curva R2 45°](https://uk.scalextric.com/products/scalextric-standard-straight-and-r2-curve-track-extension-pack-c8198)
- [Scalextric Sport 2025 · catálogo de accesorios y radios](https://arwico.ch/media/mageworx/downloads/attachment/file/s/c/scalextric_2025_catalogue.pdf)
- [Scalextric Track · pista 156 mm, ranuras 78 mm](https://www.slotcar-boutique.com/en/251-scalextric-track)

### Aún pendiente para un Scalextric completo

- Ensamblaje de **varios tramos independientes**, unión desde ambos extremos de cada tramo, ramales/cambios de pista y manipulación completamente libre de cada módulo integrado. Ahora se pueden mover **piezas sueltas** y encajarlas únicamente al extremo amarillo del tramo principal.
- Puentes, ocho, elevaciones y soportes físicos.
- Física calibrada de modelos de coche, mando físico, IA y carrera de dos mangas.
- Carrera oficial, récords globales, economía, colección, Supabase y multijugador.
- Comprobación visual/táctil en iPhone y Android reales y medición de FPS.

No se han implementado piezas móviles ilimitadas ni se han declarado récords oficiales.

## Prueba local

Abre la carpeta desde un servidor estático (los módulos ES no funcionan necesariamente bajo `file://`).

```bash
python3 -m http.server 8080
# http://localhost:8080/
node smoke.cjs
```

El workflow `.github/workflows/pages.yml` ejecuta `node smoke.cjs` antes de publicar en GitHub Pages.

## Separación del juego público

Este repositorio no modifica `almaprintes/TopdownCraftrace` ni emplea el backend de TDR. Las mejoras se prueban exclusivamente en SlotRace.
