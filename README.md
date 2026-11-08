# SlotRace DEV 0.14.56 · Rayos X sin falsos túneles en suelo → rampa

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.56

- **Corrección global:** Rayos X deja de confundir el conector suelo-rampa con una vía que pasa bajo otra. No hay silueta turquesa al iniciar una subida que pertenece a la misma pista.
- **Causa real:** anteriormente la máscara usaba la huella de todo el tramo elevado, incluyendo sus conectores, en lugar de calcular únicamente los cruces validados.
- **Nueva máscara exacta:** se obtiene mediante la intersección de los polígonos de tramos superiores e inferiores de diferentes piezas no adyacentes y marcados como cruces de altura válidos. Soporta curvas coincidentes, túneles largos y cruces con rampas, sin recortes arbitrarios de 40 u 80 mm.
- **Rendimiento:** la triangulación convexa y el trazado `Path2D` se generan una vez por instancia de circuito. Al dibujar cada fotograma se aplica una única máscara cacheada.
- **Intocable:** físicas, simulación, sprite del coche, caché de pianos, puentes normales, patrones de la mesa y las recetas.
- **Regresión:** `node tests/xray.cjs` valida que los tramos sin cruces verificados no produzcan Rayos X, así como los puentes con superposición real.

---

# SlotRace DEV 0.14.55 · Nuevo tapete Gris técnico

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.55

- **Tercera opción en Ajustes → Color del tapete:** Gris técnico + acero, con degradado grafito oscuro, retícula fina plateada y rotulación gris tenue. Disponible junto al vino oscuro y el cian profundo, que se conservan sin cambios.
- **Contraste:** el nuevo color distingue con claridad las escapatorias verdes de los pianos rojos y blancos y del plástico del circuito.
- **Sin pérdida de progreso:** la selección usa `tableTheme` en el guardado local existente, sin modificar recetas ni perfiles. El vino sigue siendo el predeterminado para quienes aún no hayan elegido tema.
- **Rendimiento:** mantiene la textura de mesa cacheada; solo la invalida al cambiar de tema o tamaño, no en cada fotograma.
- **Comprobación:** la prueba `tests/analog-trigger.cjs` verifica selección, estado visual, persistencia y retorno a otro tema. La batería automática general sigue activa.

---

# SlotRace DEV 0.14.54 · Tapetes vino y cian con entramado dorado

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.54

- **Nuevo acabado predeterminado:** tapete vino oscuro y sobrio con retícula dorada atenuada. Las escapatorias verdes destacan claramente del fondo.
- **Alternativa cian profundo:** segunda paleta azul cian con las mismas líneas doradas, elegible desde Ajustes → Color del tapete.
- **Personalización persistente:** el tema se guarda en localStorage y se aplica al taller y a la mesa de carrera. No forma parte de las recetas ni afecta a otros jugadores.
- **Gráficos de bajo coste:** la textura estática de la mesa solo se regenera al cambiar el tema o el tamaño del tablero; el motor conserva el caché anterior y no altera los pianos, escapatorias ni coches.
- **Detalles sobrios:** los rótulos del tapete son dorado tenue, la cuadrícula es menos intrusiva y la madera de los bordes se mantiene.
- **Regresión:** tests de cambio de tema y persistencia incorporados al harness `tests/analog-trigger.cjs`; CI de GitHub Actions sin cambios de física.

---

# SlotRace DEV 0.14.53 · Escapatorias integradas con el asfalto

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.53

- **Adiós a las gotas verdes:** el borde interior de cada escapatoria queda ligeramente bajo el canto plástico de la pista; ya no hay una banda de color separada del asfalto.
- **Perfil de frenada asimétrico:** la anchura crece durante la entrada, se mantiene en el vértice y desaparece progresivamente por la salida. Se extiende unos milímetros por las rectas adyacentes para evitar que parezca un objeto colocado bajo la curva.
- **Material más creíble:** verde asfalto mate y oscuro, franja interior de transición tenue y contorno exterior sin brillo ni sombra. El patrón rojo/blanco de los pianos permanece intacto.
- **Se adapta al espacio punto a punto:** la anchura se calcula para cada muestra y se recorta ante otras pistas; también respeta el interior de la mesa de carrera y evita invadir la madera.
- **Coste de render controlado:** geometría precalculada y trazados Canvas `Path2D` en caché por circuito, sentido y dimensiones de la mesa. No modifica curvas, coches, físicas ni recetas.
- **Pruebas:** `node tests/smart-runoffs.cjs` valida continuidad, perfiles, obstáculos, marco y ambos sentidos; mantiene las comprobaciones anteriores.

---

# SlotRace DEV 0.14.52 · Escapatorias inteligentes por riesgo de curva

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.14.52

- **Aparecen solo cuando hay motivo para frenar:** en una R1 después de al menos 350 mm de recta consecutiva, o en una R2 después de 600 mm. R3 y R4 no se decoran. Las rectas consecutivas se acumulan.
- **Entrada real de carrera:** se evalúa el sentido horario o antihorario elegido. Al invertirlo, se recalculan automáticamente las escapatorias sin modificar la receta.
- **Exterior y forma natural:** una banda verde de anchura variable acompaña la entrada, el vértice y una pequeña salida de curva. Curvas R1/R2 enlazadas forman una única zona, no duplicados sobre cada pieza.
- **Espacio libre obligatorio:** se examina la huella de todas las piezas no conectadas directamente; si una banda invade otra pista, se reduce al 70 % y, si sigue sin caber, se suprime. En zonas elevadas y rampas no se crea decoración.
- **Ligero y compatible:** zonas precalculadas y guardadas en caché por circuito y sentido de marcha; un Path2D verde y un contorno por vista. Se dibujan bajo el plástico, las ranuras, los pianos y los puentes. No cambia físicas, coches, récords, inventario ni recetas.
- **Regresiones:** nueva prueba `tests/smart-runoffs.cjs`, además de todas las comprobaciones existentes en GitHub Actions.

---

# SlotRace DEV 0.14.51 · Pianos de curva automáticos

**Tras publicar:** https://almaprintes.github.io/SlotRace/?v=0.14.51

- **Rojo y blanco, sin piezas extra:** dos bandas estrechas en los bordes de todas las curvas SR-Precision, radios R1–R4 y ambos sentidos. Las rectas se mantienen limpias.
- **Patrón continuo:** franjas alternas cada 30 mm del arco, sin reiniciar en las uniones de curvas consecutivas del mismo sentido.
- **Rendimiento:** geometría derivada de los puntos existentes de la pista; dos trazados `Path2D` por circuito, cacheados y reutilizados a 60 FPS.
- **Puentes y Rayos X:** los pianos superiores se repintan únicamente dentro del recorte de cruces reales; la base y sus pianos inferiores permanecen intactos fuera del cruce.
- **Construcción:** también aparecen en piezas sueltas y tramos unidos magnéticamente, sin cambios en colisiones, ranuras, recetas o tiempos.
- **Pruebas:** `node tests/kerbs.cjs` más batería existente de GitHub Actions.

---

# SlotRace DEV 0.14.41 · Cierre flexible real inferior a 10 mm

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.41

- **Holgura de cierre:** si los dos conectores del mismo tramo distan menos de 10 mm, por longitud que falta o que sobra, y la orientación difiere como máximo 1°, el botón Cerrar acepta el circuito sin pedir una pieza de ajuste adicional.
- **Flexión repartida:** la discrepancia se distribuye mediante una transición suave a lo largo de toda la pista, en los puntos y módulos que usa tanto el render como la física. El último conector queda exactamente en la meta; no se crea un salto entre carriles ni se modifican los identificadores nominales de las piezas.
- **Diagnóstico visible:** Medir hueco enseña distancia total, desfase lateral y ángulo en una banda sobre el canvas, incluso si el panel antiguo está oculto por CSS. Los conectores medidos se señalan sobre la mesa. Se eliminó el límite artificial de 800 mm para poder diagnosticar cualquier circuito grande.
- **Cierre sin trucos:** una separación igual o mayor que 10 mm, una diferencia angular mayor que 1° o un circuito con intersecciones de distinta altura incorrectamente construidas siguen sin autorizar un cierre jugable.
- **Validación:** pruebas con dos recetas de huecos reales de 9,85 mm y 9,11 mm, una con exceso y la otra con defecto, más continuidad de ambos carriles y límite estricto de 10 mm.
- **Conservación:** montajes y récords anteriores siguen guardados; la flexión mínima se reproduce al reconstruir el trazado a partir de la receta original.

**Pendiente:** validación táctil y visual del circuito Catalunya Slot en iPhone.

---

# SlotRace DEV 0.14.40 · Piezas al centro y selección alterna

**Abrir:** https://almaprintes.github.io/SlotRace/?v=0.14.40

- **Un toque en el estante:** cualquier recta, curva o especial se coloca como pieza **suelta** en el centro útil de la vista actual. El centro geométrico de la pieza, no el conector inicial, coincide con el centro visible. Funciona a cualquier zoom y después de desplazamientos grandes.
- **Sin montaje automático:** tocar el catálogo ya no añade módulos al final del circuito; el montaje comienza con «Iniciar montaje» y continúa al acercar imanes o pulsar «Encajar».
- **Selección alterna:** primer toque sobre una pieza = seleccionarla sola; segundo toque a la misma pieza = tramo completo conectado; tercero = pieza individual, y así sucesivamente. Funciona en el trazado principal y en grupos magnéticos sueltos.
- **Cámara estable:** sacar una pieza no desplaza ni cambia el zoom.
- **Regresiones:** se preservan las geometrías, las pistas elevadas, las uniones magnéticas, los récords, las recetas y la superficie de trabajo ampliable. Las pruebas incluyen cámara desplazada y cruces con varias capas.

**Verificar en iPhone:** localización de la nueva pieza en el área útil y alternancia de la selección táctil.

---

# SlotRace DEV 0.14.40 · Mesa infinita para Catalunya Slot

**Abrir DEV:** https://almaprintes.github.io/SlotRace/?v=0.14.40

- **Construcción sin bordes:** el editor ya no impide colocar, arrastrar ni soltar módulos fuera del tapete original. Las medidas y los imanes conservan su geometría real, incluso a cientos de metros virtuales del origen.
- **Tapete continuo:** el tablero del constructor se representa como una superficie verde sin marco. La retícula se dibuja únicamente en la zona visible y adapta su densidad al zoom, evitando calcular miles de líneas en iPhone.
- **Cámara desacoplada del tamaño del circuito:** ampliar la construcción no reduce automáticamente las piezas en pantalla. Desplaza la vista para continuar trabajando en otra zona.
- **Ver todo (⌗):** encuadra la pista, las piezas sueltas y la imagen de referencia; admite zoom lejano y reserva espacio para las herramientas de montaje.
- **Recuperación:** al abrir un circuito guardado que supera la mesa inicial, se aplica el encuadre general. Los proyectos y recetas existentes no se modifican.
- **Catalunya Slot:** escribe ese nombre en el campo de circuito y guarda tu montaje; no se sobrescriben otros circuitos y no se genera una receta ficticia.
- **Sin cambios de físicas, puentes, Rayos X, tiempos ni inventario.** El área expandida es virtual, no un archivo de imagen gigante, por lo que tampoco aumenta el tamaño del canvas de memoria del iPhone.

**Pruebas:** óvalo métrico de más de 40 m, colocación de piezas a 65 m de distancia, zoom invariable al ampliar, encuadre de todo el conjunto y retícula de coste acotado.

---

# SlotRace DEV 0.14.38 · Letras A/B en la pista y estado de carril

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.14.38

- **Meta/salida:** dos insignias pequeñas A (azul cian) y B (rosa), impresas junto a las ranuras, dentro del borde exterior del asfalto. Se pintan en el constructor y en carrera, y no bloquean los raíles ni generan costuras adicionales.
- **Nomenclatura física estable:** A siempre marca el interior en la salida/meta y B el exterior, aunque el jugador invierta el sentido de marcha. El cálculo es compartido con la versión 0.14.37.
- **HUD en carrera:** indicador visible «OCUPAS CARRIL A/B» con el color correspondiente, también durante cambios manuales y automáticos mediante PT/82.
- **Resultados:** mantiene los tonos identificativos de los tiempos de A (cian) y B (rosa), reforzados en el pie del HUD. Las letras, además del color, evitan depender exclusivamente de la percepción cromática.
- **Preservación:** sin cambios en físicas, capas de puentes, Rayos X, tiempos, claves de récord, recetas ni partidas guardadas.
- **Pruebas:** se comprueban ambos sellos en el canvas, el sentido reversible, el HUD y los circuitos abiertos.

**Revisar en iPhone:** legibilidad de las dos letras junto a meta y el indicador de carril en horizontal/vertical.

---

# SlotRace DEV 0.14.37 · Carril A / Carril B

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.37

- **Carril A:** ranura interior en la línea de salida/meta; **Carril B:** la otra ranura. La referencia geométrica es el primer giro después de meta, incluso en circuitos con bucles opuestos.
- La designación física no cambia al invertir el sentido horario/antihorario. El HUD, botón Cambiar, resultados por vuelta y biblioteca de récords muestran A/B correctamente.
- **Sin migración destructiva:** las claves de récords antiguas y sus arrays [0,1] siguen intactos; los tiempos se ordenan en pantalla según la ranura real y el sentido registrado.
- **PT/82:** la salida de prueba se fija en Carril A interior; el récord de dos vueltas utiliza clave v2, independiente de las pruebas antiguas que podían arrancar en otra ranura.
- Sin modificaciones en geometrías, físicas, Rayos X, puentes, recetas ni partidas locales.

**Por validar en iPhone:** lectura de A/B en meta y cambio de nomenclatura al seleccionar el sentido inverso.

---

# SlotRace DEV 0.14.36 · PT/82 en Especiales

**DEV:** https://almaprintes.github.io/SlotRace/?v=0.14.36

- La pieza **X350 · Cambio PT/82** se incluye en la pestaña **Especiales**, con conexiones exteriores y longitud de 350 mm compatibles con la recta virtual S350.
- **Máximo una PT/82** por construcción, incluso en modo desarrollo con inventario ilimitado. El control se aplica tanto a piezas montadas como a las sueltas.
- Dos carriles en **X** y conducción automática a lo largo de la pieza. Los circuitos que la llevan ocultan y bloquean el cambio manual. El resto conserva el botón.
- **Prueba oficial de dos vueltas consecutivas:** primera y segunda vuelta se recorren con intercambios obligatorios. Solo la suma de ambas constituye récord. La clasificación tiene una clave propia y no modifica los registros de carriles tradicionales.
- **Regla de dos coches:** función determinista de detección de choque simultáneo en el centro de la X. Si dos coches entran en conflicto, ambos descarrilan y reaparecen justo pasado el cruce en sus carriles de destino, con 3 s de recuperación. La función está probada como base para carreras de dos coches; el modo de juego actual solo controla uno.
- La geometría, físicas, pistas elevadas, modo Rayos X, piezas antiguas, recetas, archivos locales y récords anteriores se conservan.

**Pendiente de validar en dispositivo:** aspecto de la PT/82, paso del coche por la X y carrera de dos vueltas. La integración de un segundo coche simultáneo es posterior.

---

# SlotRace DEV 0.14.35 — Cambio de carril fluido

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.35

- **Un toque durante la carrera:** el botón Carril ya no exige pausar y tampoco reinicia distancia, velocidad ni cronómetro.
- **Movimiento:** la posición del coche se interpola entre ranuras durante 0,48 s, respetando la misma pieza y su avance longitudinal. El carril físico de destino mantiene la simulación del coche durante la animación.
- **Cámara:** el seguimiento acompaña el desplazamiento lateral; también termina la transición si se activa en pausa, sin cambiar altura ni zoom.
- **Récords oficiales:** una vuelta que combina ambos carriles no cuenta como récord. Al cruzar meta continúa la carrera y el siguiente parcial sí es válido.
- **Sin cambios:** geometría de piezas, puentes, constructor, rayos X y guardados.

**Pendiente:** validar la sensación táctil y la cámara en el iPhone.

---

# SlotRace DEV 0.14.35 — Sonido real de Scalextric

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.14.35

- Sonido real aportado por el usuario, editado a bucle de 12,2 segundos (MP3 estéreo a 160 kbps).
- Web Audio en bucle sin cambiar el tono ni las revoluciones; volumen suave según movimiento.
- Silencio en espera, pausa, penalización, resultados o menú. Ajuste de motor independiente de los clics del mando.
- No cambian físicas, puentes, geometría ni controles.

---

# SlotRace DEV 0.14.33 — Cobertura completa en cruces de diferente altura

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.14.33

- **Regresión de DEV 0.14.32 corregida:** ya no se corta la máscara 40 mm antes de los conectores. Era precisamente donde un tramo superior podía cruzar por encima de la curva o recta inferior.
- **Huella de la pista inferior:** los raíles, bordes y coche inferiores quedan cubiertos cuando existe una vía superior, incluidos los cruces en extremos de módulos, curvas coincidentes o rampas que pasan bajo otro tramo elevado.
- **Conectores del suelo a la rampa:** mantienen el asfalto continuo y sin repintar la carretera elevada completa encima de la unión.
- **Validación:** casos de Doble óvalo, Ocho, ocho con piezas renumeradas, ambos carriles y extremos de piezas; no se cambian físicas, niveles de altura, perfiles, tiempos, recetas ni guardados.

**La revisión visual final todavía se debe realizar en iPhone; que las pruebas pasen no sustituye esa comprobación.**

---

# SlotRace DEV 0.14.33 · Eliminar el doble dibujo en las uniones suelo/rampa

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.14.33

- **Corrección de la DEV 0.14.31:** se eliminan los 52 mm de solape que agravaban la unión entre la curva a ras de suelo y la recta elevada.
- **Una sola superficie en los conectores:** el trazado original ya dibuja asfalto, carriles y bordes continuos. No se vuelve a pintar un tramo elevado entero en los conectores.
- **Oclusión solo en cruces reales:** el repintado de la vía superior queda recortado a las zonas inferiores verificadas por geometría. Se conservan Rayos X, coches ocultos y curvas inferiores.
- **Pruebas de regresión:** el Doble óvalo comprueba que ninguna frontera suelo/rampa pertenezca al recorte; los tramos elevados sin cruces no se repintan. Todos los parámetros físicos y datos locales se mantienen.

**Pendiente de comprobación visual en iPhone:** las dos fronteras de subida y bajada.

---

# SlotRace DEV 0.14.31 · Unión limpia de rampas y curvas

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.31

- **Origen del defecto visual:** una superposición opaca del tramo elevado empezaba justo en su conector, mientras las marcas de pendiente terminaban a mitad de la pieza. El modo seleccionar puente añadía una banda amarilla con un borde recto que parecía un módulo mal conectado.
- **Continuidad visual:** la capa pintada del puente usa ahora unos 50 mm adicionales de los tramos tangentes de suelo anterior y posterior, calculados con la geometría real de cada pieza. No cambia la trayectoria homologada, los índices de los módulos, la máscara Rayos X ni las físicas.
- **Sin líneas decorativas truncadas:** las marcas de inclinación dejan de superponerse a circuitos ya montados. Siguen disponibles en piezas sueltas del taller.
- **Selección más clara:** los tramos del kit se señalan mediante dos líneas finas exteriores, en lugar de colorear la carretera entera y crear una falsa frontera.
- **Regresión:** pruebas sobre Doble óvalo, puentes, continuidad de carriles, bordes de selección y visibilidad bajo plataformas.
- **Datos:** no se eliminan ni migran montajes, circuitos, récords o preferencias.

**La prueba visual definitiva sigue siendo en Safari del iPhone.**

---

# SlotRace DEV 0.14.30 · Fronteras suelo–rampa sin falsas costuras

**Probar en iPhone:** https://almaprintes.github.io/SlotRace/?v=0.14.30

- **Dos fronteras del Doble óvalo:** las juntas suelo/rampa ya no dibujan una raya oscura atravesando el asfalto ni los dos pares de remaches laterales. No se borran las juntas normales de otras piezas.
- **Circuitos personalizados:** se identifican los conectores por perfiles de elevación y coincidencia real de puntos; funciona también cuando un tramo elevado cruza el índice cero del circuito.
- **Marcas de rampa:** las líneas decorativas de pendiente empiezan y terminan más al interior de la pieza, evitando remates falsos junto al conector.
- **Sin tocar el juego:** mismos módulos, elevaciones, físicas, sistema de oclusión, Rayos X, tiempos y partidas locales.
- **Validación:** las pruebas automáticas comprueban el dibujo de juntas en el Doble óvalo; la revisión visual final se realiza en el iPhone.

---

# SlotRace DEV 0.14.29 · Base sin cortes y oclusión estable

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.14.29

- **Base continua:** suelo, curvas y rampas se dibujan en una sola trayectoria; no se crean extremos artificiales en los conectores.
- **Orden de visibilidad:** el coche que circula abajo se dibuja antes de la cubierta elevada y el superior después; se elimina el parche rectangular de uniones que podía tapar cubiertas.
- **Datos intactos:** sin cambios en geometrías, perfil de altura, recetas, físicas ni guardados.
- **Importante:** la inspección visual en iPhone queda pendiente. Los tests automáticos no equivalen a verla correctamente en el dispositivo.

---

# SlotRace DEV 0.14.28 · Rayos X con silueta de deportivo y carriles holográficos

**Probar en iPhone:** https://almaprintes.github.io/SlotRace/?v=0.14.28

- **Silueta, no rectángulo:** el coche oculto se representa mediante un contorno vectorial cenital con morro perfilado, pasos de rueda, hombros traseros y alerón, más una tenue iluminación turquesa. La posición y el giro mantienen el movimiento visual del coche. No muestra el sprite real ni cambia las físicas.
- **Carriles Rayos X mejorados:** discontinuos más finos y redondeados, halo de contraste suave y guía central tenue. Solo aparecen dentro del contorno real de la cubierta elevada, incluso en curvas coincidentes y túneles largos.
- **Orden de capas conservado:** la vía inferior está debajo de la cubierta opaca; Rayos X se dibuja después de la cubierta y antes del coche superior.
- **Rendimiento:** reutiliza los caminos de las guías por geometría, sin recrear sombras dinámicas costosas.
- **Regresión:** `tests/xray.cjs` comprueba el Doble ovalo real, la preferencia persistente, continuidad de los carriles, trazos suaves y que no vuelva el rectángulo de colisión.
- **Sin modificaciones de pistas:** ningún circuito, rampa, conector o récord se altera.

---

# SlotRace DEV 0.14.27 · Uniones invisibles entre suelo y rampas

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.27

- **Frontera suelo ↔ rampa:** una soldadura visual repinta el conector exacto con una sola trayectoria continua. Se evita el efecto de dos líneas transversales al pasar de piezas de suelo a piezas elevadas.
- **Sin alterar las pistas:** ni los radios, ni las piezas, ni los enlaces magnéticos, ni las alturas, ni los tiempos de carrera cambian. Las dos plantas siguen teniendo la misma oclusión que en la DEV anterior.
- **Sin máscaras destructivas:** el retoque está limitado a la zona del conector, no se abren agujeros en las curvas inferiores y no se repinta toda la pista del nivel inferior por encima de un puente.
- **Doble ovalo real:** regresión sobre `tests/fixtures/doble-ovalo.json`, comprobando exactamente dos fronteras suelo/rampa (piezas 3→4 y 9→10), continuidad de puntos y un empalme de asfalto, bordes y carriles por unión.
- **Generalización:** se detecta cualquier cambio entre un perfil elevado y uno a ras de suelo, también cuando cruza la primera pieza de un circuito cerrado. No depende del nombre del circuito.
- **Rayos X:** sigue funcionando con líneas discontinuas y silueta cuando la pista pasa debajo.

---

# SlotRace DEV 0.14.26 · Rayos X pulidos y pruebas completas

**Probar en iPhone:** https://almaprintes.github.io/SlotRace/?v=0.14.26

- **Ajustes → Rayos X:** opción que se guarda en el dispositivo, apagada por defecto. Sirve tanto en «Construir» como en «Jugar».
- **Túneles y circuitos multinivel:** dos carriles discontinuos turquesa con un halo oscuro discreto, recortados al contorno real de la pista superior. No altera la apariencia normal de los tramos visibles.
- **Coche inferior:** exclusivamente un contorno discontinuo de su carrocería, con borde contrastado y sin sprite o relleno visible cuando queda bajo la cubierta.
- **Coche superior:** siempre se dibuja después de las guías Rayos X, para que los carriles inferiores no atraviesen su carrocería.
- **Rendimiento iPhone:** las guías de carril y el contorno de la cubierta se almacenan por geometría, en vez de recalcular todos los desplazamientos cada fotograma.
- **Caso real «Doble ovalo»:** se conserva la receta de 16 piezas en `tests/fixtures/doble-ovalo.json`. La regresión verifica cinco puntos de la curva totalmente superpuesta, guías discontinuas, silueta, configuración persistente y prioridad de las capas.
- **CI:** se ha corregido también la aserción obsoleta del constructor que hacía fallar las pruebas de la versión anterior. El estado real de GitHub Actions debe consultarse por separado.

---

# SlotRace DEV 0.14.25 · Rayos X para puentes, túneles y pistas ocultas

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.25

- **Ajustes → Rayos X:** interruptor opcional, inicialmente **Desactivado** y guardado en el navegador. Funciona tanto en Construir como en Jugar, sin alterar los circuitos ni los récords.
- **Pistas ocultas:** se trazan sus carriles con líneas discontinuas turquesa únicamente dentro de la huella geométrica de una plataforma elevada. No se añaden carriles a otras zonas visibles.
- **Coche bajo el puente:** durante la carrera, el coche que pasa por debajo se representa solo por el contorno discontinuo de la carrocería. El sprite y su pintura siguen ocultos. Un coche que circula arriba se dibuja normalmente.
- **Túneles largos y curvas coincidentes:** la máscara recorre la plataforma completa, no solo los cruces puntuales. Por eso también cubre grandes secciones paralelas que quedan debajo de una pista elevada.
- **Caso real de regresión:** `tests/fixtures/doble-ovalo.json` reproduce las 16 piezas y cuatro secciones elevadas de la receta «Doble ovalo», donde dos curvas R2 de 90° recorren exactamente el mismo arco a distintas alturas. `tests/xray.cjs` prueba la curva tapada a lo largo de cinco posiciones, la ausencia de marcas fuera del puente, la silueta y la persistencia del interruptor.
- **Motor de capas:** se mantiene la separación entre pista inferior y elevada sin usar rectángulos de recorte destructivos. Las guías Rayos X son un dibujo superpuesto y no forman parte de la física ni de los circuitos exportados.

---

# SlotRace DEV 0.14.23 · Puentes del Doble Ocho: oclusión por cada intersección

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.23

- **No es un parche para OchoA:** el problema descrito afecta al «Doble Ocho» y a cualquier circuito con cruces a dos alturas. El motor ahora calcula la ventana de oclusión para **cada intersección real**, a partir de la geometría y de qué tramo está arriba.
- **Primera pasada:** se recorta el trazado inferior dentro de cada ventana mediante clips `evenodd`; sus raíles no pueden atravesar la cubierta porque directamente no se dibujan en esas zonas.
- **Segunda pasada:** se pinta toda la banda elevada opaca y se repinta el asfalto/carriles superiores dentro de la ventana de cada cruce.
- **Cruces próximos:** cada clip se aplica por separado, evitando que dos ventanas solapadas hagan reaparecer líneas inferiores por paridad.
- **Circuitos arbitrarios:** no hay nombres de circuito, índices de pieza o radios específicos codificados en las máscaras. Las ventanas se cachean por geometría para reducir cálculos en el iPhone.
- **Pruebas:** configuración ocho automático y ocho construido manualmente; simulación de dos intersecciones juntas, comprobando dos exclusiones y dos cubiertas superiores. La imagen del Doble Ocho guardado localmente en el iPhone no es accesible desde GitHub y requiere comprobación visual en Safari.
- **Compatibilidad:** no cambian pistas, perfiles de altura, físicas, recetas ni progresos guardados.

---

# SlotRace DEV 0.14.22 · Oclusión válida para circuitos nuevos con puentes

**Probar en iPhone:** https://almaprintes.github.io/SlotRace/?v=0.14.22

- **Fallo de capas corregido para todo el motor:** en carrera se pintaban las piezas sueltas del taller DESPUÉS del puente y sus raíles podían aparecer en medio de la cubierta. Ahora el render de carrera **ignora cualquier pieza suelta**: sólo representa el circuito conectado y sus elevaciones.
- **Constructor intacto:** todas las piezas sueltas continúan visibles y seleccionables mientras se construye. No se borran ni modifican piezas o recetas guardadas.
- **Puentes genéricos:** se comprueba que el segmento superior de **cada cruce verificado** pertenezca al tramo elevado repintado. No hay excepciones por nombre de circuito o índice de pieza.
- **Pruebas:** simulación de dos pistas distintas (ocho automático y montaje manual con puente) con una pieza suelta situada exactamente sobre su cruce; en carrera ésta no genera líneas fantasma, mientras en «Construir» sí se pinta. También se comprueba el orden de coche inferior/cubierta/coche superior.
- **Sin cambios de físicas:** permanecen los mismos radios, ángulos, altura de 65 mm y guardados.

---

# SlotRace DEV 0.14.21 · Eliminar marcas de unión y carriles cruzados en carrera

**Prueba iPhone:** https://almaprintes.github.io/SlotRace/?v=0.14.21

- **Juntas recta-curva:** en modo carrera no se dibuja `paintSeam`, que dejaba cortes oscuros transversales aunque el trazado físico fuese perfectamente tangente. El editor conserva juntas para identificar los módulos.
- **Puente sin doble sombra:** se elimina el sombreado rectangular que surgía al repintar la plataforma superior sobre la base y se usa exactamente la misma paleta de asfalto que en el resto de la pista.
- **Carriles sin cruces fantasma:** la plataforma superior recibe una subcapa completamente opaca (`source-over`, alfa 1), antes de sus carriles, para ocultar correctamente las marcas de la vía inferior.
- **Rampas en carrera:** se suprime el segundo dibujo de líneas claras en el borde de las rampas. Las guías de elevación siguen apareciendo en «Construir».
- **Físicas y guardados intactos:** no cambian radios, conectores, perfiles de elevación, coches ni almacenamiento local.
- **Regresión directa:** comprobados los órdenes `base → coche inferior → cubierta` y `base → cubierta → coche superior`; cero costuras y líneas extra en carrera, cubierta opaca y marcadores conservados en el editor. Las pruebas completas de GitHub Actions son independientes.

---

# SlotRace DEV 0.14.20 · Puente sólido y coche oculto correctamente

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.20

- **Oclusión reparada:** en la carrera se pinta la vía de suelo, después el coche inferior, después una **banda elevada totalmente opaca** y, finalmente, el coche que circula por arriba. Se retira del render principal el antiguo recorte corto alrededor del cruce, que permitía ver la carrocería desde abajo.
- **Piezas limpias:** el puente se dibuja como un recorrido continuo a través de su zona elevada y sus rampas, sin dibujar juntas internas encima del asfalto. Las uniones de la vía normal son más discretas.
- **Soporte para circuitos cerrados:** el contorno visual puede atravesar la línea de meta sin abrir una falsa junta en el índice cero; los cruces múltiples repintan sus tramos elevados correspondientes.
- **Inclinaciones:** los marcadores de subida/bajada se dibujan sobre la plataforma final, sin tapar el coche que corre arriba.
- **Rendimiento:** se guarda en caché por trazado la banda completa y sus desplazamientos de carril, en lugar de recalcularlos cada fotograma.
- **Pruebas:** comprobación del orden de capas para el coche inferior y superior, continuidad de nodos, curvas elevadas con rampas, índice cero y reutilización de geometría. No se cambian las físicas, la altura de los puentes, la receta o los circuitos guardados.

---

# SlotRace DEV 0.14.19 · Puentes por tramos, cierre a la vista y selección de cruces

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.19

- **Cerrar/Revisar visible:** botón propio junto a «Imagen» y «Jugar». «Cerrar» intenta el cierre exacto; si los conectores ya coinciden pero el puente es inválido, aparece «Revisar», explica el motivo y abre «Puentes». No se fuerza ningún cierre que altere la geometría.
- **Puentes sin acertar con el dedo:** pestaña «Puentes» con «‹ Anterior», «Siguiente ›», «1 · Inicio» y «2 · Final y elevar». Se selecciona un intervalo de piezas por índice, incluyendo el paso por la línea de meta en un circuito cerrado. «↓ Bajar tramo» retira la elevación del bloque seleccionado; sigue disponible elevar una sola pieza.
- **Seleccionar piezas superpuestas:** al tocar varias veces el mismo cruce se alterna entre la pieza superior y la inferior. Las flechas de «Puentes» permiten seleccionar incluso con zoom o dos vías visualmente superpuestas.
- **Rampas sobre curvas amplias:** una curva con arco central de al menos **350 mm** puede ser transición de altura de 0 a 65 mm, sin modificar radio, ángulo o conectores horizontales. Las curvas demasiado cortas siguen generando aviso de rampa insuficiente.
- **Diagnóstico separado:** el estado muestra desfase en mm/grados si los extremos están abiertos, advierte si faltan rampas y diferencia los conectores cerrados de un cruce verticalmente inválido.
- **Compatibilidad:** no cambia la clave de guardado, los circuitos antiguos, la geometría plana, el motor de carrera ni los récords. El nuevo rango de selección es temporal, no se guarda en la receta.
- **Verificaciones:** pruebas de rampas curvas, selección de rango y navegación circular, doble toque en un cruce y botón «Cerrar/Revisar». El resultado del despliegue de Pages debe comprobarse por separado.

---

# SlotRace DEV 0.14.18 · Curvas de 90° de una pieza y acoplamiento magnético reparado

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.18

- **Una curva de 90°, una pieza:** R2, R3 y R4 tienen ahora versiones físicas *virtuales* de 90° reales en el catálogo SR-Precision, para ambos sentidos. Un único arco con dos conectores y solo las costuras externas, sin cuatro piezas escondidas dentro de la tarjeta.
- **Compatibilidad:** los circuitos guardados con 2×R2 de 45° o 4×R3/R4 de 22,5° permanecen intactos. El nuevo módulo de 90° tiene un ID propio y no modifica los guardados, las físicas ni los récords de circuitos anteriores.
- **Imanes de tramos completos:** se corrigió la pieza inicial desagrupada al desprender un tramo. Todos sus módulos mantienen el mismo grupo y el mismo orden. Los grupos pueden invertirse y girar hasta 180° para encajar por los extremos, incluidos final-final e inicio-inicio.
- **Acoplamiento en ambas direcciones:** al soltar un grupo suelto junto al trazado se acopla; ahora también se prueba el acoplamiento al arrastrar el tramo principal cerca de los conectores sueltos.
- **Pruebas:** nueva prueba de unión de dos curvas R3 de 22,5° con inversión de 135°, separación y posterior reconexión de un tramo con R3 de 90°, conexión grupo-grupo y conservación de la geometría de las recetas anteriores.
- **Familia SR virtual:** radios 150/300/450/600 mm; no se afirma compatibilidad con Scalextric Classic o Sport.

---

# SlotRace DEV 0.14.17 · Catálogo de radios revisado frente a Classic

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.17

- **Curvas ordenadas por radio y ángulo:** las piezas R1, R2, R3 y R4 se agrupan de menor a mayor radio. Los atajos de 90° están ahora al lado de las piezas de su propia familia, para encontrarlos con menos desplazamiento en iPhone.
- **Elección más sencilla:** las tarjetas muestran **150, 300, 450 y 600 mm** (radios virtuales SR-Precision) y descripciones «Cerrada», «Estándar», «Abierta» y «Muy abierta». Se muestran referencias históricas orientativas en los detalles accesibles de cada pieza.
- **Auditoría histórica con fuentes:** los tipos de Scalextric Classic G/PT/52, F/PT/51, H/PT/53 y M/PT/84 se han contrastado con catálogos de 1966/1972. No se confunden con los modernos radios Sport 214/370/526/682 mm ni se afirma equivalencia física certificada.
- **Geometría preservada:** separación modular de 150 mm entre radios, conectores intactos, y pruebas de giros de 90° sin huecos. Los circuitos existentes, recetas, físicas y récords no se convierten ni invalidan.
- **Informe completo:** [Auditoría de radios Classic](./docs/auditoria-radios-classic.md).

---

# SlotRace DEV 0.14.16 · Curvas abiertas de 90° en un toque

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.16

- **Curvas grandes de 90°:** en Construir → Curvas aparecen tres combinaciones nuevas: **R2 · 90°** (2 × R2 de 45°), **R3 · 90°** (4 × R3 de 22,5°) y **R4 · 90°** (4 × R4 de 22,5°), además de la curva R1 de 90° ya existente.
- **Piezas modulares, no inventadas:** cada atajo encaja todos sus módulos de una pulsación; las uniones aparecen en la miniatura y el trazado, la física, la receta y el guardado contienen las piezas individuales. Radio y ancho siguen siendo los de la familia SR-Precision experimental, no las dimensiones comerciales de Scalextric.
- **Derecha o izquierda:** el selector del estante invierte las curvas completas. Con el circuito cerrado, tocar o arrastrar el atajo coloca el tramo como grupo magnético suelto. El botón «−» o Deshacer retira el montaje como una acción.
- **Compatibilidad:** sin modificaciones del motor de física, los radios existentes ni los circuitos guardados. Las pruebas automatizadas verifican el ángulo, la unión sin huecos, el guardado y el deshacer completo.

---

# SlotRace DEV 0.14.15 · Imagen visible y estante que se desliza sin colocar piezas

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.15

### Dos correcciones de usabilidad a partir de pruebas en iPhone

- **«Imagen» directamente en el taller**, junto al botón Jugar, sin entrar en «Más». Desde ahí se carga una foto o plano para colocarla bajo la pista, ajustar opacidad, escalar hasta 2000 %, moverla y bloquearla. «Ayudar a cerrar» pasa al menú «Más» para mantener la pantalla limpia.
- **Deslizamiento de piezas arreglado:** las tarjetas táctiles tenían `touch-action:pan-y`, lo que impedía deslizar horizontalmente sobre ellas en Safari. Se aplica `pan-x` a las tarjetas y a sus elementos interiores en retrato, y se conserva `pan-y` en la columna vertical para pantallas anchas. Se elimina el anclaje de desplazamiento `scroll-snap` que frenaba el recorrido.
- **Flechas ‹ y › en el estante** como alternativa al gesto, compatibles con desplazamiento horizontal en iPhone y vertical en pantalla ancha.
- **Sin piezas colocadas por accidente:** los desplazamientos de más de 9 px y sus clics sintéticos posteriores no activan el montaje. Un toque corto sí añade la pieza; el asa sigue sirviendo exclusivamente para sacarla y colocarla libremente.
- **Compatibilidad:** preserva la mesa actual, las elevaciones, los planos, las imágenes y los récords. No cambia el motor de física ni las recetas.

Pruebas automáticas específicas para desplazamiento con flechas, deslizamiento sin añadir piezas, gestos táctiles y acceso directo al panel Imagen.

---

# SlotRace DEV 0.14.14 · Plantilla de referencia fotográfica

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.14

- **Plantilla debajo de la pista:** desde «Taller → Más → Plantilla de referencia» se carga una fotografía, plano o imagen compatible. Se dibuja sobre la mesa y por debajo de las pistas y piezas, sin modificar el juego.
- **Tamaño completamente independiente:** control del **10 % al 2000 %**. Se puede ampliar la imagen muchísimo más que la mesa, sin cambiar las dimensiones reales de las piezas ni el zoom del circuito. «Ajustar a mesa» es solo un atajo opcional.
- **Controles:** opacidad 0–80 % (30 % por defecto), giro −180° a +180°, movimiento con el dedo tras pulsar «Mover imagen», bloqueo de la posición para construir encima, ocultar/mostrar y quitar con Deshacer disponible.
- **Persistencia por circuito:** la posición, tamaño, giro, opacidad y referencia se guardan con cada circuito en Mis circuitos. Los datos JPEG comprimidos (hasta 1600 píxeles) se guardan en IndexedDB cuando existe, con alternativa en localStorage para navegadores sin IndexedDB. Fotos en un dispositivo no se sincronizan automáticamente con otros.
- **Exportación PNG:** por defecto el plano sale **sin fotografía**. La casilla «Incluir imagen al exportar PNG» permite añadirla debajo de las pistas para ese PNG solamente. No cambia la receta, ni las físicas, ni la colección de récords.
- **Seguridad de los montajes:** una imagen bloqueada nunca intercepta el arrastre de las pistas. Mientras esté desbloqueada, arrastrar sobre la mesa mueve la imagen; bloquearla restablece los gestos normales de construcción.
- **Regresiones:** pruebas de escala superior a la mesa, guardado/recuperación en circuitos, exportación limpia y opcional, movimiento sin mover piezas y ocultación.

---

# SlotRace DEV 0.14.13 · Constructor centrado en la mesa

**Abrir:** https://almaprintes.github.io/SlotRace/?v=0.14.13

## Taller sin recorrer la pantalla de arriba abajo
- La mesa ocupa el espacio disponible y el estante de piezas queda fijo **abajo en retrato** o **a la derecha en pantallas anchas**. La página del constructor no tiene scroll vertical general.
- Se conserva la caja troquelada y sus miniaturas en el diseño, pero no obliga a desplazarse por ella ni a pasar de página. Cada categoría muestra todas sus piezas en una misma tira desplazable.
- **Tocar una tarjeta** acopla automáticamente la pieza al conector final (si el circuito está abierto), y la cámara de construcción mantiene visible el extremo al que se ha añadido. **Arrastrar desde su asa** coloca una pieza suelta para montajes independientes.
- **Seleccionar:** un toque escoge la pieza concreta. Para mover o girar toda la cadena se pulsa el botón «Tramo», sin doble toque escondido.
- **Girar:** dos botones persistentes ↶ Antihorario y ↷ Horario, cada pulsación avanza exactamente 22,5°. Las piezas conectadas se separan al girarlas individualmente, con deshacer disponible.
- **Pellizcar con dos dedos** sólo hace zoom, también cuando uno de los dedos cae sobre la pista. Evitamos que se gire accidentalmente un tramo al ampliar.
- En primer plano quedan Girar, Deshacer, Encajar, Quitar y Tramo, además de Jugar y Ayudar a cerrar. Ejemplos, medición de huecos, planos y elevación se concentran en «⋯ Más».
- Los puentes tienen acceso desde la categoría «Puentes» del propio estante y desde las herramientas avanzadas.
- Guardado, geometrías SR-Precision, conectores magnéticos, exportaciones, trazados, récords, juego y físicas de los coches permanecen intactos.

La caja física puede reutilizarse en el futuro como vista de colección; en el taller prima escoger piezas con un toque. La ampliación de la pantalla no modifica el catálogo ni los costes de uso.

---
# SlotRace DEV 0.14.12 · Contraderrape de latigazo al enderezar

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.12

- **Latigazo mucho más rápido:** al entrar en recta, el muelle de la trasera pasa de **7 a 30 N/m** y la amortiguación de **0,24 a 0,50 Ns/m**. En la simulación a 60/120 Hz, desde 12 mm de derrape y velocidad lateral inicial cero, cruza el centro en unos **0,067 s** y alcanza unos **6 mm hacia el otro lado en 0,117 s**, frente a unos 0,25 s anteriormente.
- **Seco pero continuo:** la trasera no se recoloca por teletransporte; mantiene la posición y velocidad acumuladas al salir de curva, cambia de lado con aceleración física y amortigua enseguida la oscilación. La guía delantera permanece sobre la ranura.
- **Misma amplitud, más velocidad:** el contraderrape sigue siendo aproximadamente el 50 % del desplazamiento previo. No se ha modificado el agarre en curva, el umbral de salida ni el zoom.
- **Récords separados:** el cambio de dinámica activa la etiqueta de física `rear-physics-v4` para tiempos nuevos. Los anteriores siguen disponibles como históricos en Mis circuitos → Mis récords.
- **Pruebas:** velocidad del latigazo, amplitud, simetría, continuidad en juntas, estabilidad a 60 y 120 Hz y conservación de velocidad lateral.

Parámetros de jugabilidad; no medidas verificadas de un Scalextric comercial.

---

# SlotRace DEV 0.14.11 · Contraderrape al enderezar en recta

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.11

- **Contraderrape:** al salir de una curva la trasera cruza el centro y se desliza aproximadamente un **50 % al otro lado**, antes de quedar alineada de nuevo. No existe un reinicio de postura ni de velocidad lateral en las juntas.
- **Modelo físico:** la masa trasera (45 g) mantiene la amortiguación estable en curva (3,6 N/m; 0,70 Ns/m). En recta recupera mediante muelle de 7 N/m y amortiguación de 0,24 Ns/m, causando un rebote decreciente de ~50 % en condiciones de referencia.
- **Guía sujeta y trayectoria fluida:** la visualización sigue la posición lateral calculada y rota el coche alrededor del morro; no se añade una animación independiente. La recuperación funciona en ambos sentidos y a 60/120 Hz.
- **Récords:** esta dinámica se identifica como `rear-physics-v3`, manteniendo visibles los mejores tiempos históricos v1/v2 en Mis circuitos → Mis récords.
- **Compatibilidad:** conserva los cambios recientes de circuitos elevados y su editor.

**Nota:** cifras de sintonización de juego, no mediciones certificadas de Scalextric.

---

# SlotRace DEV 0.14.10 · Curvas elevadas y puentes continuos

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.10

- **Curvas elevadas:** cualquier curva puede formar parte de una plataforma de 65 mm de altura; se pueden marcar varias piezas contiguas y conservar la elevación al prolongar el trazado.
- **Rampas automáticas:** las rectas contiguas de 350 mm o más ascienden o descienden con un perfil suave; las curvas intermedias permanecen a la altura máxima, sin saltos en sus conectores.
- **Cruces reales:** la validación compara las alturas de ambas vías en cada intersección. Se admite un cruce cuando existe una separación vertical suficiente y se detectan los cruces múltiples.
- **Soportes en curvas y exportación:** patas distribuidas por los arcos elevados; el plano PNG conserva la representación de los pasos superiores. La geometría horizontal, el catálogo y los circuitos guardados mantienen su formato.
- **Compatibilidad y seguridad:** el ocho original y el kit sobre recta siguen funcionando; si faltan rectas de transición, el constructor muestra el motivo y no permite correr con una discontinuidad vertical.
- **Pruebas:** se añade una comprobación automática de dos curvas elevadas consecutivas, pendientes continuas y separación de 65 mm en los cruces.

---

# SlotRace DEV 0.14.9 · Más desplazamiento de la trasera en los derrapes

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.9

- **Derrape más espectacular:** la visualización del giro alrededor de la guía delantera aumenta su amplitud de 1,16× a 2,4× respecto al ángulo físico de la trasera. Por ejemplo, con 12 mm de desplazamiento lateral calculado la cola pasa a recorrer más de 39 mm en pantalla en coordenadas del circuito.
- **Guía delantera fija:** el morro sigue anclado a la ranura, y la posición del centro se recalcula según el giro. El desplazamiento sigue siendo simétrico y continuo al encadenar curvas o recuperar el coche.
- **Mismas físicas:** no se cambia ni el agarre, ni la masa, ni la velocidad ni el límite de descarrilamiento. Los récords conservan la clave física v2 y no se fragmentan por una modificación puramente gráfica.
- **Pruebas:** verifican que la guía no se separa, que la cola se mueve más y que el movimiento es suave en ambas direcciones.

---

# SlotRace DEV 0.14.8 · Mis récords dentro de Mis circuitos

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.8

- **Mis circuitos** incorpora dos pestañas con el estilo común: «Mis circuitos» y «Mis récords». La segunda enseña los mejores tiempos locales de cada circuito.
- **Detalle de récords:** tiempos independientes de carriles izquierdo y derecho, mejor combinado (solo si ambas vueltas pertenecen al mismo coche, sentido, geometría y física), vehículo, sentido de conducción y versión de físicas. El combinado no suma vueltas de variantes distintas.
- **Históricos:** se conservan y muestran los récords obtenidos con físicas anteriores, identificados, sin mezclarlos con los récords actuales `rear-physics-v2`. Los circuitos sin vueltas también se muestran y tienen botón «Abrir».
- **Recuperación visible simplificada:** se elimina la tarjeta «Historial de versiones» y su botón de la sección Mis circuitos, porque OchoA ya se recuperó. Las copias internas siguen guardadas para proteger el trabajo ante un error. La recuperación de borrador sin guardar sigue disponible.
- **Sin servidor:** los datos permanecen guardados en el navegador de la PWA; esta entrega no añade nube ni sincronización.

---

# SlotRace DEV 0.14.7 · Derrape visible y curvas continuas

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.7

- **Conducción más fluida:** los puntos de los carriles se interpolan sobre el arco circular y la orientación del coche avanza continuamente. Se eliminan los saltos de postura producidos por el ángulo fijo de cada pequeño segmento poligonal, especialmente en uniones entre piezas.
- **Más movimiento de la trasera:** aumenta moderadamente la deformación lateral y ahora el coche gira visualmente alrededor de la guía delantera. La cola se abre de forma progresiva; se conservan la masa, amortiguación y recuperación de agarre.
- **Acelerador al 100 %:** ya no es una estrategia estable en curvas largas. Al superar el 97,5 % aparece progresivamente una sobrecarga de estabilidad de la guía, adicional a la fuerza lateral calculada con `v²/r`. Al 95 % la conducción sigue siendo rápida y permisiva; un tramo muy corto a fondo puede atravesarse sin salir.
- **Pico tardío:** la sobrecarga se acumula a lo largo de la curva enlazada, conserva continuidad entre módulos y sólo permite descarrilar desde la segunda mitad.
- **Tiempos:** guardado bajo física `rear-physics-v2`, manteniendo separados los récords anteriores.
- **Validación:** pruebas para orientación continua en las juntas, derrape visible, radio interior/exterior, salidas a fondo sostenido y estabilidad en 60/120 Hz.

Estos valores son de calibración del juego, no medidas físicas certificadas.

---

# SlotRace DEV 0.14.6 · Inercia realista de la trasera en curvas

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.6

## Simulación nueva: inercia, agarre y guía de slot

- El criterio de salida deja de ser un porcentaje fijo de acelerador o un medidor abstracto de estrés. La aceleración lateral es **v²/r**, usando la velocidad del coche y el radio efectivo de su carril (interior o exterior).
- Cada vehículo tiene parámetros independientes preparados para configurar **masa trasera, coeficiente de agarre, rigidez lateral, amortiguación, distancia entre ejes y ángulo máximo de guía**. Gripline y Spark comparten inicialmente los mismos parámetros para no inventar diferencias.
- Se integra a pasos de **1/120 s como máximo** la aceleración y la velocidad lateral de la trasera, incluyendo el exceso de fuerza respecto del agarre disponible y una pequeña deformación elástica de los neumáticos.
- La trasera acumula un **desplazamiento lateral en mm** y un **ángulo real** respecto a la guía. Sólo al exceder el ángulo/recorrido admitido por la guía y recorrer parte de la curva aparece el descarrilamiento con la penalización actual de tres segundos.
- Al soltar el acelerador o entrar en una recta, muelle y amortiguador recuperan progresivamente la alineación. Una segunda curva opuesta conserva la inercia que llevaba la trasera, en lugar de reiniciarla artificialmente.
- El umbral de **inicio de pérdida de agarre en la R1 interior está calibrado alrededor del 90 % de la velocidad máxima**, pero esto no es un interruptor de salida: necesita tiempo y desplazamiento. En R2, R3 y R4 se admite el 100 % con el agarre inicial.
- Se mantiene la cámara con zoom fijo 2× y aire por delante del coche. Los récords con la nueva física se guardan en claves `-rear-physics-v1`, preservando los anteriores sin mezclarlos.

**Nota:** los coeficientes de masa/agarre son valores experimentales del juego, no mediciones certificadas de coches Scalextric. Las pruebas validan comportamiento y consistencia a 60/120 Hz, no equivalencia exacta con un automóvil a escala real.

---

# SlotRace DEV 0.14.5 · Cámara con espacio de anticipación

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.5

- **Seguimiento 2×:** conserva altura, rotación y zoom fijos. La vista se adelanta progresivamente en el sentido físico de la marcha para dejar ver la pista que viene.
- **Encuadre seguro:** el coche permanece en la zona central, separado al menos un 25 % de los bordes en ambos ejes. La garantía funciona también con curvas, frenadas y cambios de carril.
- **Movimiento cómodo:** anticipación direccional suavizada (sin reaccionar al trompo/derrape visual), zona de descanso compacta y corrección amortiguada independiente de los FPS. En pausa no se mueve.
- **Compatibilidad:** no se cambian físicas, circuitos, piezas, coches, tiempos ni preferencias anteriores. Prueba nueva de anticipación y márgenes de seguridad.

---

# SlotRace DEV 0.14.4 · Seguimiento con zoom fijo 2×

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.4

- **Ajustes → Cámara:** la opción Seguimiento pasa de 3× a **2×**, para ampliar el campo visible sin volver a la vista general.
- **Sin cambios en el comportamiento:** altura y escala constantes; no hay giro de cámara ni zoom dinámico. Se conservan el suavizado de seguimiento, las zonas muertas laterales y verticales y el encuadre inmóvil en pausa.
- **Compatibilidad:** se mantiene la preferencia guardada de cámara; no se tocan las físicas, los circuitos, las recetas ni los récords.
- **Comprobación:** pruebas actualizadas para exigir 2× respecto de la vista general, sin alterar el resto de verificaciones.

---

# SlotRace DEV 0.14.3 · Dos cámaras de carrera configurables

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.3

## Ajustes → Cámara durante la carrera

- **Vista general (predeterminada):** encuadra el circuito completo con el zoom anterior, sin seguir al coche.
- **Seguimiento 3×:** zoom fijo tres veces superior al encuadre general. Se mantiene a la **misma altura**, sin zoom dinámico, sin giro, sin inclinación ni cambios al pasar por puentes.
- **Movimiento amortiguado:** sigue la posición física del coche con suavizado exponencial dependiente del tiempo (`1-exp(-5.5·dt)`), estable a distintas tasas de fotogramas.
- **Zona muerta horizontal amplia (26 % de la pantalla a cada lado)** y vertical (17 %). El encuadre solo se desplaza si el coche sale de ella, por lo que no oscila en cada curva ni persigue el deslizamiento visual de los derrapes.
- **Sin saltos:** al comenzar cada carrera se centra en el coche una sola vez, después acompaña gradualmente sin reencuadrar al pasar por meta, cambiar carril o trompear. En pausa se detiene.
- **Preferencia persistente:** `cameraMode` guardado en `slotrace-lab-10`, junto a las opciones actuales. No se alteran circuitos, recetas, récords ni la cámara del constructor.
- **Diseño:** botones Vista general / Seguimiento 3× en Ajustes, con estado activo explícito y resumen de cada opción.

Pruebas automáticas para comparar exactamente el zoom 3×, estabilidad en reposo, zona de tolerancia, movimiento suave, pausa, persistencia y conservación de la vista general.

---

# SlotRace DEV 0.14.2 · Planos reales y Helix Spark jugable

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.2

- **Tienda / Circuitos:** los planos oficiales Óvalo SR-Precision y Ocho con puente ya no usan siluetas de demostración. Se generan como SVG **desde `buildTrack(types,START)`**, usando puntos de la pista, los dos carriles, las uniones entre piezas, la salida/meta y el segmento elevado del ocho. El plano sin receta homologada, Sprint urbano, sigue marcado **En diseño** y no se puede adquirir como circuito terminado.
- **Cajas:** las ilustraciones provisionales muestran también la geometría auténtica del circuito incluido, mientras se preparan las artes de caja definitivas.
- **Helix Spark jugable:** nueva piel cenital original `assets/cars/helix_spark.webp`, tomada del repositorio de Top Down RACE. Los coches comparten las mismas físicas y el mismo control en esta fase, con representación cenital correcta.
- **Garaje:** seleccionar Gripline o Spark, identificar visualmente el coche activo y empezar a jugar con él. La selección sobrevive al reinicio del navegador. Elegir un coche no cambia el trazado ni el inventario de circuitos.
- **Registros:** las claves anteriores de Gripline se conservan exactamente; Spark añade el sufijo `-helix-spark`, de modo que no pisa los récords existentes. El informe de carrera identifica el vehículo utilizado.
- **Pruebas:** comprobación de SVG generado desde el motor geométrico, puente, botones de selección, persistencia del coche, carreras con ambos modelos, tiempos separados y continuidad de todas las pruebas anteriores.

---

# SlotRace DEV 0.14.2 · Planos con geometría real y Helix Spark jugable

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.2

## Planos de la tienda
- Los dos planos oficiales **Óvalo SR-Precision** (12 piezas) y **Ocho con puente** (14 piezas) muestran ahora un SVG creado directamente a partir de `buildTrack(types, START)` del motor del juego, no dibujos decorativos.
- Vista cenital con pista doble, ranuras de ambos carriles, costuras de cada pieza, salida/meta y, en el ocho, capa de la recta elevada. La escala y geometría provienen exactamente de la receta que se monta al adquirir el plano.
- Las cajas provisionales usan también una miniatura del plano auténtico que incluyen.
- **Sprint urbano** sigue marcado «Plano en diseño» y no presenta una falsa receta. Sin geometría homologada no es adquirible.

## Helix Spark jugable
- Se incorpora `assets/cars/helix_spark.webp`, el sprite **cenital original** de `TopdownCraftrace/assets/skins/skin_helix_spark.webp` (no se estira la imagen de tres cuartos).
- En **Garaje**, ambos vehículos tienen selección propia; pulsar «Elegir Spark» lo añade gratis a tu colección local de pruebas. El botón Jugar, la pista y el resumen muestran qué coche está seleccionado.
- Se puede elegir Spark también tras adquirir su ficha de la tienda. El coche elegido queda en `slotrace-lab-10` bajo `selectedCar`; los datos previos se conservan.
- Los coches comparten **exactamente las mismas físicas** durante esta etapa para no alterar las sensaciones de conducción por un cambio visual.
- **Récords separados por coche:** las marcas de Gripline conservan sus claves existentes; las de Spark llevan el sufijo `-helix-spark`. No se borran ni migran los récords viejos.
- Nuevo estado visual en el Garaje, imagen correcta en carrera, espera de aceleración inicial conservada y resumen de la sesión con el nombre del coche.

Las compras son de prueba y gratuitas; no hay pagos reales ni cambios en la cantidad infinita de piezas de desarrollo. Ninguna receta, circuito guardado o récord histórico se sobrescribe.

---

# SlotRace DEV 0.14.1 · Auditoría y sistema visual unificado

**Abrir:** https://almaprintes.github.io/SlotRace/?v=0.14.1

## Normas de interfaz (obligatorias en futuras versiones)

1. **Navegación persistente:** cinco destinos siempre en este orden: **Menú, Construir, Circuitos, Garaje, Tienda**. Una barra global única aparece en la portada y las pantallas de gestión, incluido el constructor. **Ajustes** ocupa siempre el engranaje de la cabecera. Evitar accesos repetidos y barras exclusivas de una sección.
2. **Excepción de conducción:** en carrera y resultados se oculta la barra global para conservar espacio para mandos y resultados. La cabecera mantiene el acceso a Menú y Ajustes; los botones de la carrera corresponden solo a acciones de la sesión.
3. **Portada sin scroll vertical:** imagen flexible en función de la altura real del dispositivo, **Jugar** y **Construir** a todo el ancho, otros cuatro accesos en dos columnas. Las tarjetas y la foto se redimensionan, no desaparece ninguna sección.
4. **Lenguaje castellano uniforme:** **Jugar** para iniciar carreras, **Construir** para entrar en el taller, **Exportar plano** para generar PNG, **Acelerador** para el gatillo/rueda, **Clics activados / Clics desactivados** para el sonido. **Menú** es el nombre de inicio y **Mis circuitos** es el nombre completo de la colección.
5. **Botones:** rojo SlotRace para la acción principal de cada pantalla, blanco/gris y borde fino para las secundarias, tonos oscuros solo sobre la mesa y la caja de montaje. Esquinas redondeadas consistentes, tamaño táctil de unos 44 px o superior y estado activo reconocible sin depender solo del icono.
6. **Jerarquía:** cabecera y navegación fijas; contenido desplazable en biblioteca, tienda, garaje, ajustes y constructor. **Solo la portada** se adapta estrictamente a una pantalla sin desplazamiento. No superponer herramientas sobre el circuito o las tarjetas.
7. **No cambiar geometría ni datos:** esta versión es una auditoría de interfaz. Conserva `slotrace-lab-10`, las claves de biblioteca, récords y adquisiciones.

## Comprobaciones incorporadas
Pruebas automáticas de presencia de la navegación, rutas entre secciones, acceso a Ajustes, ausencia de barra principal durante carreras y reglas de portada compacta. Las pruebas anteriores de geometría, guardado y controles se mantienen.

---

# SlotRace DEV 0.14.0 · Tienda comercial de pruebas

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.0

La pantalla de tienda ha pasado de ser una introducción informativa a un **catálogo funcional** inspirado en el diseño aprobado, con identidad propia SlotRace y sin utilizar marcas ni fotografías de cajas comerciales ajenas.

- **4 categorías navegables:** Cajas, Packs, Circuitos y Coches, con navegación inferior Inicio/Tienda/Mi colección/Construir.
- **2 grandes cajas:** Caja básica SR-Precision (ya poseída, coche Avenir Gripline, 12 piezas, Óvalo SR); Open Rally Box (Helix Spark, 14 piezas, Ocho con puente). Las cajas se dibujan con **packaging provisional CSS**, sustituible por las ilustraciones definitivas más adelante; los vehículos son archivos originales del repositorio.
- **3 packs:** curvas R2, puente 65 mm, rectas largas. **3 circuitos:** Óvalo y Ocho con recetas reales validables y Sprint urbano marcado «en diseño» sin compra ni plano inventado. **2 coches:** Avenir Gripline y Helix Spark, este último coleccionable pero aún no pilotable.
- Cada ficha muestra el contenido, la lista de piezas con cantidades y referencias SR, los planos incluidos y el estado de disponibilidad.
- **Adquisiciones gratuitas de desarrollo** guardadas localmente bajo `slotrace-shop-owned-v1`. Las cajas desbloquean el derecho a sus planos y coches virtuales en la tienda; **no modifican las cantidades de piezas del constructor**, que siguen ilimitadas para pruebas, ni implican cargos reales.
- Los planos adquiridos tienen un botón **Guardar plano y montar**. Solo entonces se crea una entrada **nueva** en `slotrace-circuit-library-v1`, con un ID y `shopPlanId` propios, sin sobrescribir circuitos OchoA, Splash u otros. Las aperturas posteriores reutilizan esa entrada para evitar duplicados.
- La tienda no realiza pagos, no muestra precios monetarios ficticios y no activa un Helix Spark jugable que todavía no existe. La colección es local hasta desarrollar cuentas.
- Pruebas automáticas comprueban pestañas, catálogo, propiedad inicial, adquisición de Open Rally, desbloqueo del Ocho, montaje, no duplicación y preservación de circuitos anteriores.

---

# SlotRace DEV 0.14.0 · Deslizar para borrar circuitos (estilo iOS)

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.14.0

- En **Mis circuitos**, se puede deslizar una tarjeta hacia la **izquierda** para descubrir una **papelera roja** detrás. Deslizar a la derecha la cierra. Solo se muestra la acción de una tarjeta cada vez.
- Pulsar «Eliminar» abre una **confirmación** con el nombre exacto del circuito. **Cancelar** no modifica los datos; la confirmación borra únicamente el circuito por **ID**, sin confundir una copia recuperada de OchoA con OchoA ni con Splash.
- La colección se escribe en el almacenamiento **antes** de mutar el estado en memoria. Si falla el guardado, no se borra ningún circuito.
- Se eliminan los tiempos propios y revisiones vinculadas a ese ID. El resto de circuitos, récords y versiones permanece intacto.
- Si borras el circuito que está **en la mesa**, el trazado permanece como trabajo **sin guardar**, para evitar pérdida accidental del trabajo actual. El vínculo con la entrada borrada se limpia.
- Las tarjetas usan eventos de puntero compatibles con Safari/iOS, con desplazamiento vertical libre; evitar apertura accidental tras el gesto y permitir abrir/cerrar usando teclado (flechas).
- Se añaden pruebas de deslizar, cancelar y borrar una copia recuperada, confirmando la supervivencia del circuito original y de Splash.

---

# SlotRace DEV 0.13.5 · Colores coherentes para mejores vueltas

**Abrir:** https://almaprintes.github.io/SlotRace/?v=0.13.5

- La tarjeta **Mejor izquierda** azul y la tarjeta **Mejor derecha** rosa identifican las vueltas de menor tiempo en cada carril **dentro de la misma sesión**.
- En «Progreso vuelta a vuelta», las filas de esos mejores tiempos ahora conservan el mismo color: **azul para izquierda**, **rosa para derecha**.
- La etiqueta **MEJOR DEL CARRIL** distingue el mejor registro de la sesión. **RÉCORD PERSONAL** continúa reflejando el récord histórico, independientemente del color de la fila.
- Se ha eliminado el resaltado azul genérico de cualquier vuelta marcada como récord personal. Las demás vueltas y comparativas (mejora/retroceso) permanecen como antes.
- Sin cambios en tiempos registrados, cronometraje, circuitos, partidas guardadas o física del juego.

---

# SlotRace DEV 0.13.4 · Cronómetro activado al acelerar

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.13.4

- Antes de incorporar el semáforo de salida, al pulsar **Jugar** el coche y el reloj esperan a **0,000 s**. Aparece «ESPERANDO SALIDA · ACELERA PARA COMENZAR».
- La **primera potencia real mayor que cero** en el dial táctil o la tecla de acelerar inicia el cronómetro exactamente desde ese primer fotograma de simulación. Solo tocar el dial al 0 % no inicia el reloj.
- Una vez iniciada la vuelta, el cronómetro sigue avanzando al **soltar el acelerador** y durante las penalizaciones. Las pausas continúan deteniéndolo como antes.
- Cada nueva sesión y cada cambio de carril en pausa rearman la salida. Las siguientes vueltas siguen cronometrándose sin volver a esperar gas.
- No hay cambios de geometría, físicas, récords, inventario ni datos de OchoA/Splash; son cambios del estado transitorio de la carrera.

---

# SlotRace DEV 0.13.3 · Guardado seguro y rescate de circuitos

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.13.3

- Corrige el caso real **OchoA → Splash**: si editas el nombre de un circuito abierto y pulsas Guardar, se crea una ficha **nueva con identificador propio**. La receta anterior no se sobrescribe.
- Guardar con el mismo nombre actualiza únicamente ese circuito. Si cambia su trazado, la receta anterior pasa al **historial de versiones** (hasta 30 revisiones locales, separado del inventario).
- **Mis circuitos** muestra **Recuperar «OchoA»** si existe un borrador anterior con ese nombre y no está ya en la colección. Se importa con un ID nuevo sin modificar Splash.
- Al iniciar la PWA se protege una copia del borrador anterior recuperable en el historial antes de que otra navegación pueda desplazarlo.
- También aparece **Recuperar versión anterior** cuando hay historial, siempre como copia nueva: no se sustituye ninguna pista guardada.
- El guardado de recetas es más seguro ante errores de almacenamiento y evita actualizar el estado del inventario hasta que el guardado local se confirma.
- Ninguno de estos mecanismos puede reconstruir un trazado que ya se hubiera perdido **antes** de esta versión si no queda un borrador/otra copia previa en el dispositivo. La PWA no tiene acceso directo al almacenamiento privado del iPhone.

---

# SlotRace DEV 0.13.2 · Montaje automático por pulsación

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.13.2

- Tocar una pieza de la caja, o su botón **+**, ahora **la acopla inmediatamente al conector final** del circuito en construcción. Cada nueva pulsación respeta el orden de las piezas elegidas y usa la geometría exacta de SR-Precision.
- El botón **−** de la última pieza añadida automáticamente permite revertirla de forma segura; los demás botones «−» solo devuelven piezas sueltas, sin desmontar el resto del circuito.
- El **asa de arrastre** sigue permitiendo sacar piezas sueltas para construcción y ensamblaje manual con imanes.
- Si el circuito ya está **cerrado**, un toque deja la pieza **suelta** en la mesa en lugar de modificar el lazo cerrado.
- La pista mantiene el sentido de curvas configurable (derecha/izquierda), la función Deshacer y el guardado local existente; sin modificar física, tiempos o catálogo.
- Nueva ayuda visible en la caja que explica las dos formas de añadir piezas. Tests adicionales comprueban conexión exacta, deshacer la última pieza y construcción de un óvalo completo mediante toques.

---

# SlotRace DEV 0.13.2 · Constructor comercial rediseñado

- En iPhone grande, nombre, sentido y Guardar se mantienen en una sola fila como el diseño aprobado.

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.13.2

- Nueva pantalla de construcción inspirada en el mockup aprobado: título deportivo, campo de nombre, sentido y Guardar; mesa de mayor tamaño; cuatro acciones principales.
- Caja de piezas en cuatro categorías reales: **Rectas (5)**, **Curvas (7)**, **Especiales (salida/meta)** y **Puentes (kit físico)**, con tres módulos visibles por página y navegación anterior/siguiente.
- Tarjetas con vista de la pieza, referencia SR, cantidad infinita y controles **+** para añadir y **−** para devolver exclusivamente piezas *sueltas*. No desmonta partes unidas sin seleccionar «Eliminar pieza».
- Herramientas principales **Iniciar/Encajar, Deshacer, Rehacer, Mover tramo, Girar 22,5°, Eliminar pieza**; las opciones avanzadas se conservan en un desplegable.
- Disposición vertical desplazable en iPhone: la mesa y los botones mantienen dimensiones táctiles; no hay barras aplastadas ni funciones eliminadas.
- Se conserva la clave de guardado `slotrace-lab-10`, circuitos, récords, física y geometría existentes.

---

# SlotRace DEV 0.12.2 · Portada de competición

**Abrir:** https://almaprintes.github.io/SlotRace/?v=0.12.2

- La portada incorpora la fotografía **aprobada por el usuario** del Avenir Gripline en el carril interior y Helix Spark siguiéndolo por el exterior de una curva de slot.
- Asset local versionado en `assets/ui/slotrace-duelo-curva.avif`: optimización del PNG original a 900×507 píxeles, 15 KB, compatible con el iPhone y cargado de forma autónoma desde GitHub Pages.
- La imagen ocupa su proporción natural 16:9 sin zoom, recortes ni coches superpuestos; el logotipo permanece encima y los seis botones comerciales permanecen funcionales debajo.
- La acción de publicación verifica el asset. No cambian las físicas, la mesa, los circuitos ni los récords.

---

# SlotRace DEV 0.12.1 · Menú comercial con navegación a seis pantallas

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.12.1

- La portada aplica el concepto **C / Clean Premium**, ahora con seis botones reales: **Jugar**, **Construir**, **Mis circuitos**, **Garaje**, **Tienda** y **Ajustes**. El inventario y la creación de circuitos se han movido a la pantalla «Mis circuitos».
- La portada mejora el encuadre responsive de las dos imágenes originales en vista de tres cuartos del Avenir Gripline y Helix Spark, evitando recortes de carrocería y nombres en iPhone.
- **Mis circuitos** mantiene los mismos datos locales, exportación PNG, importación/compartición de recetas, guardado, carga y creación de nuevas pistas.
- **Garaje** presenta ambos coches con sus imágenes originales; la conducción sigue usando Avenir Gripline. **Helix Spark** queda anunciado como próximo coche jugable, sin activar una selección ficticia.
- **Tienda** tiene una pantalla propia que enlaza con la importación actual de recetas; no simula compras ni requiere pagos.
- **Ajustes** permite activar/desactivar realmente el sonido del dial y la retícula del taller; guarda preferencias en el mismo almacenamiento local.
- Las seis páginas son navegables desde el encabezado y las pruebas automáticas verifican la navegación y los cambios de ajustes. No cambian las físicas, la caja, los tiempos ni la clave de guardado `slotrace-lab-10`.

---

# SlotRace · DEV 0.12.0 — Clean Premium / estilo C

**Abrir:** https://almaprintes.github.io/SlotRace/?v=0.12.0

- Portada clara de juego comercial con **imágenes originales en tres cuartos** del Avenir Gripline y Helix Spark, copiadas sin modificación desde `almaprintes/TopdownCraftrace` (`public/assets/cars/workshop`).
- Presentación temática de pista de slot mediante CSS; los modelos reales aparecen sobre ella. No se utilizan imágenes generadas.
- Menú principal con **Jugar** como acción roja y Construir / Exportar plano como accesos secundarios reales.
- **Mis circuitos** conserva sus acciones de guardado, importación y exportación.
- Resultados con tarjetas azul/rosa para ambos carriles, **mejor combinado** en amarillo y clasificación visual de récord/mejora/retroceso.
- La física, geometría, controles y el guardado local `slotrace-lab-10` permanecen sin cambios. No se añaden botones falsos de tienda o garaje.
- Pruebas de regresión en GitHub Actions y verificación de los dos archivos originales durante la publicación.

---

# SlotRace · DEV 0.11.1 — mejor tiempo combinado

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.11.1

- La pantalla «Tus vueltas» muestra **MEJOR COMBINADO** como suma de la mejor vuelta de cada carril en la sesión.
- Si falta una vuelta completa de alguno de los carriles, se muestra «—».
- Los mejores registros permanentes por carril y el inventario no se alteran.

---

# SlotRace · DEV 0.10.3 — plano con identificadores por tipo de pieza

Proyecto independiente de Top Down RACE. Prototipo web **jugable en móvil**, desplegado con **GitHub Actions + GitHub Pages** y sin backend.

**Enlace:** https://almaprintes.github.io/SlotRace/

## DEV 0.10.3 — referencias visibles de cada pieza en el plano PNG

**Prueba:** https://almaprintes.github.io/SlotRace/?v=0.10.3

- El **plano blanco** lleva una etiqueta circular oscura con una letra A, B, C… sobre **cada módulo colocado**, incluidas piezas sueltas aún sin imantar al trazado.
- La **receta** muestra esa misma letra delante del nombre del tipo de pieza, además de la cantidad. Todas las unidades del mismo modelo (incluida la dirección de la curva) comparten la letra; así se pueden reconocer sin añadir instrucciones de orden de montaje.
- El **kit de puente** sigue en la receta como accesorio y no recibe letra de módulo de vía.
- Las etiquetas de un tramo inferior se desplazan a lo largo de su propia pieza cuando su centro cae en el cruce del puente, evitando confundirlas con las etiquetas de la vía superior.
- Soporta más de 26 tipos distintos mediante códigos AA, AB… sin cambiar el formato del PNG.
- **12/12 suites** superadas. `tests/game-shell.cjs` comprueba una etiqueta por pieza, la correspondencia con las entradas de receta, módulos sueltos, el puente y que no reaparezca «Orden de montaje».
- Mantiene el mismo guardado local `slotrace-lab-10`. No modifica las geometrías, las físicas ni el tamaño visual del coche.

---

## DEV 0.10.2 — menos piezas, mismos cierres exactos

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.10.2

- La caja muestra **cinco rectas**: 75, 87,5, 175, 350 y 600 mm. Con la salida/meta y siete moldes de curva, son **13 huecos**.
- La recta **S0125 de 12,5 mm** se retira del inventario y de los cierres nuevos. Se conserva como tipo **heredado** para que los montajes ya guardados sigan cargando, sin migración destructiva; la clave local sigue siendo `slotrace-lab-10`.
- La escala matemática conserva unidades de 12,5 mm, pero una diferencia de 12,5 mm **no crea automáticamente una pieza de ese tamaño**. El motor prueba sustituir hasta dos rectas existentes por otras longitudes disponibles —por ejemplo, 75 → 87,5 mm— y comprueba que el circuito completo cierre antes de aceptar el cambio.
- **Medir hueco** informa de la sustitución propuesta cuando realmente resuelve el mismo tramo; **Cerrar exacto** prioriza la adición de una recta existente si cabe exactamente y, si no es posible, intenta las sustituciones proporcionales. Las pistas con puente conservan sus apoyos si se sustituyen rectas sin alterar el número de piezas.
- No todos los huecos ni todos los trazados se pueden resolver por restas: el cambio debe compensar exactamente el **vector de separación** de los conectores y respetar la orientación. No se estiran ni se desplazan módulos artificialmente.
- Pruebas: `tests/modular-closure.cjs` verifica compensaciones de 12,5 mm y 25 mm sin añadir módulos, y `tests/two-end-closure.cjs` comprueba el flujo con grupos magnéticos, el cierre directo de 175 mm y deshacer. **12/12 suites aprobadas** en la validación del código.

---

## DEV 0.10.1 — plano blanco de alto contraste y receta compacta

**Enlace para iPhone/PWA:** https://almaprintes.github.io/SlotRace/?v=0.10.1

- **Pista blanca en el PNG** con contorno negro, líneas de los dos carriles en gris oscuro y las **juntas de todas las piezas en negro** para distinguir cada módulo. El taller y la carrera conservan su pista oscura.
- **Vista cenital ampliada:** el área del circuito crece de **758 a 1185 píxeles de alto** en el PNG estándar de 1500 píxeles de ancho. Se reduce el margen vacío del circuito y se conservan los soportes del puente.
- **Sin orden de montaje:** eliminado por completo el bloque de secuencia numerada. Se mantienen únicamente cabecera, plano, distancia/estado/puentes, receta agrupada por modelo y cantidades.
- **Composición dinámica:** altura total del PNG adaptada a las filas reales de la receta, sin cortar la lista, con el circuito centrado. Sigue funcionando el menú de compartir de iOS y la descarga normal.
- **Prueba automatizada:** `tests/game-shell.cjs` comprueba que existe el blanco puro (#ffffff), las juntas negras (#080c0f), el contorno negro y que ya no aparece «ORDEN DE MONTAJE». La exportación no modifica el guardado ni la orientación del coche.

No se cambia ninguna dimensión física de SR-Precision, ni los circuitos guardados en `slotrace-lab-10`.

---

## DEV 0.10.0 — experiencia de juego con taller y carreras separados

**Probar PWA:** https://almaprintes.github.io/SlotRace/?v=0.10.0

- **Menú principal:** tres entradas claras «Entrar al taller», «Correr» y «Exportar plano». El acceso a carrera se habilita si el circuito guardado está cerrado y validado. Inicio en el menú sin borrar la mesa existente.
- **Nuevo circuito:** selector previo de sentido de conducción **horario / antihorario**. La selección se guarda en `slotrace-lab-10`, se mantiene tras cerrar la PWA y puede cambiarse desde el taller. En sentido inverso se invierten la trayectoria, el rumbo y la referencia de carril, sin alterar la geometría del circuito. Los récords se separan por orientación.
- **Avenir Gripline original:** sustituye al coche procedural. Se ha importado la piel cenital `assets/skins/skin_avenir_gripline.webp` del repositorio hermano `almaprintes/TopdownCraftrace` a `assets/cars/avenir_gripline.webp`. Pintado con textura real y proporciones **98 × 49 mm**, frente al antiguo coche de 154 mm de largo. Sin modificar la física, control táctil, derrape ni cronometraje.
- **Exportación técnica en PNG:** genera una sola imagen cenital de alta resolución con la pista, piezas y sus cantidades, número total, longitud de carrera, puentes, orientación, y **orden de montaje dentro del mismo archivo**. No exporta HUD ni coche. En iPhone usa Web Share para «Guardar imagen» o compartir; existe descarga estándar de respaldo para otros navegadores.
- **Sin carreras de sustitución:** pulsar «Correr» en un circuito incompleto ya no cambia silenciosamente el trazado por el óvalo de demostración. El óvalo sigue accesible de forma explícita desde el taller.
- **Despliegue:** GitHub Actions copia tanto `src/` como `assets/` a GitHub Pages y comprueba que la textura original existe. El flujo incluye `tests/game-shell.cjs` además de las 11 suites existentes. **12/12 suites JavaScript superadas** en pruebas y GitHub Actions.
- **Guardado:** sigue siendo `slotrace-lab-10` sin reiniciar construcciones. Al pulsar «Crear circuito» se ofrece «Recuperar trazado» para volver al montaje anterior.

**Pendiente de comprobar en iPhone:** presentación del menú como PWA, hoja de compartir el PNG y tamaño visual del Gripline en carrera.

---

## DEV 0.9.8 — corregido el fallo de cierre con una recta de 175 mm

**Prueba móvil:** https://almaprintes.github.io/SlotRace/?v=0.9.8

Se reproduce el fallo del 5 de noviembre: «Medir hueco» indicaba 175 mm, pero la recta colocada sólo se acoplaba por un lado y «Cerrar exacto» aparecía deshabilitado porque el circuito todavía constaba como piezas sueltas.

- **Acoplamiento por ambos extremos.** Al unir la última pieza de un grupo, el motor comprueba la continuidad de cada conector y también el extremo contrario. Si la cadena forma un lazo geométricamente cerrado, el grupo se convierte automáticamente en circuito montado. La pieza que realmente completa los dos extremos tiene prioridad frente a una unión aislada que no cerraría.
- **Cerrar exacto habilitado para grupos magnéticos.** Si el tramo suelto ya está cerrado, puede finalizarse; si le falta una longitud modular exactamente alineada, el botón puede añadir una composición de hasta cinco rectas del catálogo, sin modificar ni estirar las piezas existentes.
- **Diagnóstico con significado.** Se distingue expresamente entre el hueco de cierre de un mismo tramo y una simple unión entre dos tramos separados, que NO garantiza cerrar el circuito. Tener dos conectores muy cerca tampoco basta cuando su orientación es distinta.
- **Mensaje obsoleto eliminado.** Después de mover, unir o deshacer, se descarta el diagnóstico anterior para no recomendar una longitud que ya no corresponde al estado actual.
- **Guardado conservado:** sigue siendo `slotrace-lab-10`, compatible con DEV 0.9.7. El montaje del usuario no se reinicia.
- **Regresión añadida:** `tests/two-end-closure.cjs` monta un óvalo con hueco exacto de 175 mm, acopla la última pieza, comprueba ambos conectores, permite deshacer y verifica el cierre directo de un tramo suelto. GitHub Actions ejecuta esta prueba antes de publicar. **11/11 suites JavaScript superadas** en validación de código.

Pendiente: comprobación de la experiencia táctil con el montaje real del usuario en Safari iPhone.

---

## DEV 0.9.7 — seis longitudes de recta, todas proporcionales

**Prueba móvil:** https://almaprintes.github.io/SlotRace/?v=0.9.7

Se simplifica la familia experimental **SR-Precision**: **solo seis tamaños de recta** (12,5; 75; 87,5; 175; 350; 600 mm), más una salida/meta de 350 mm. La caja presenta **14 huecos en total** (seis rectas, salida/meta y siete moldes de curva), con inventario infinito.

- Todas las longitudes son múltiplos de **12,5 mm** y las equivalencias están verificadas: 350 = 2 × 175 = 4 × 87,5; 600 = 8 × 75 = 350 + 175 + 75. La pieza de 12,5 permite ajustes que no encajen con las medidas largas sin crear decenas de modelos.
- Los radios R1–R4 son **150, 300, 450 y 600 mm**. El ancho es 150 mm y la separación central entre carriles 75 mm. Son dimensiones **virtuales propias**, no dimensiones homologadas de una gama Scalextric.
- **Medir hueco:** calcula longitud longitudinal, desviación lateral y diferencia angular entre conectores. Sugiere una composición exacta de rectas cuando los extremos están alineados, sin estirar piezas.
- **Cerrar exacto:** primero prueba una composición con las seis rectas del catálogo y, si no basta, continúa con búsqueda geométrica.
- Se prueba específicamente un óvalo cerrado con un hueco de 25 mm que se completa mediante **dos rectas de ajuste de 12,5 mm**, así como 80 longitudes de prueba y casos de desfase angular/lateral que no se deben cerrar falsamente.
- Clave de guardado independiente `slotrace-lab-10`, porque la familia de geometrías cambió; las construcciones de la DEV 0.9.6 se conservan en su guardado anterior, pero no se cargan automáticamente en el nuevo catálogo.
- **10/10 suites JavaScript** superadas, incluida prueba obligatoria de proporcionalidad en GitHub Actions. Falta comprobar en iPhone el manejo de las seis rectas.

**Límite matemático:** un conjunto proporcional de rectas garantiza composiciones para huecos rectos alineados cuya distancia sea múltiplo de la unidad, pero **no** que cualquier circuito arbitrario con curvas cierre. La orientación y el desplazamiento lateral siguen siendo condiciones imprescindibles.

---


## DEV 0.9.6 — rotación exacta con dos dedos

**Prueba móvil:** https://almaprintes.github.io/SlotRace/?v=0.9.6

- **Gira con dos dedos sobre una pieza o tramo**: la orientación salta en múltiplos exactos de **22,5°** (±22,5°, ±45°, ±67,5°…). No se asignan ángulos intermedios al levantar los dedos. El giro se calcula siempre desde la posición inicial para evitar errores acumulados.
- **Tramo unido magnéticamente**: gira como un único bloque alrededor de su centro, sin alterar sus conectores internos. **Circuito ya iniciado**: también puede girar entero.
- **Pieza seleccionada individualmente** (segunda pulsación sobre el mismo tramo): se puede girar por separado; si estaba conectada, se separa sin mover las piezas restantes.
- **Zoom y movimiento de la cámara**: siguen operativos con dos dedos cuando el gesto comienza sobre el tapete sin seleccionar ninguna pieza.
- **Deshacer/Rehacer**: una sola entrada para cada giro completo, aunque se atraviesen varios saltos angulares.
- El texto de la mesa explica el gesto en la propia interfaz.
- Nueva prueba `tests/twist-rotation.cjs`, incluida como paso obligatorio de GitHub Actions; comprueba ángulos exactos, giro de grupos, pieza individual, deshacer, conectores y zoom sobre vacío.

**Validación:** nueve suites JavaScript completas superadas. Falta comprobar el gesto con dos dedos directamente en Safari/iPhone.

---

## DEV 0.9.5 — puente integrado en la vía, también con piezas sueltas

**Prueba móvil:** https://almaprintes.github.io/SlotRace/?v=0.9.5

Corrección de la captura del 5 de noviembre de 2026 en DEV 0.9.4: el kit dibujaba una **placa rectangular opaca sobre los carriles**, haciendo que el puente pareciera una pieza pegada encima, no una elevación del tramo original.

- Los **dos apoyos se dibujan debajo** de la pista y las rampas se indican con marcas laterales suaves. **Se conservan exactamente la superficie, ranuras, guías y conectores** de la recta original, sin ninguna losa superpuesta que los oculte.
- En el punto donde dos vías se cruzan, el renderer repinta **solo la pequeña zona superior** con los mismos materiales que el resto de la pista. La máscara ahora se adapta al ángulo del cruce.
- Si dos tramos siguen siendo **piezas sueltas**, el kit también dibuja correctamente el paso superior si existe una intersección geométrica con suficiente longitud de rampa. El usuario puede visualizar el puente antes de completar el circuito.
- **Aclara el estado:** "Kit fijado a la recta" significa que los apoyos pertenecen a esa pieza; **no** significa que sus conectores estén unidos magnéticamente al resto. Las piezas sueltas siguen contabilizándose como tales hasta usar el acoplamiento.
- La elevación manual puede reconocerse en un circuito todavía abierto, pero **solo un trazado cerrado y válido** puede competir.
- Pruebas automatizadas del puente: cruce manual abierto y cerrado, piezas sueltas que se cruzan, ocultación de vías, ausencia de placa ficticia, deshacer y rehacer.

**Límite del prototipo:** los soportes y las marcas de rampa son representación 2.5D; todavía no hay desnivel 3D ni física dinámica de ascenso/descenso.

---

## DEV 0.9.4 — kit de puente en la caja

**Prueba móvil:** https://almaprintes.github.io/SlotRace/?v=0.9.4

- La caja PT-Precision incluye un **kit de puente de 65 mm** con **dos soportes y dos rampas**, de suministro infinito durante las pruebas. Es un accesorio independiente, no una pieza de pista que altere la longitud del circuito.
- **Uso:** toca una recta de **350 o 584 mm** en la mesa para seleccionarla; abre el maletín y pulsa **KIT PUENTE · ⠿ COLOCAR**. El mismo botón retira los apoyos de esa recta. No se puede instalar sobre una curva ni sobre una recta demasiado corta.
- Los apoyos aparecen también en las piezas **sueltas**, y siguen asociados a la pieza al moverla, unirla con otras o pulsar **Iniciar**. Persisten en el guardado local y se pueden **deshacer / rehacer**.
- La geometría calcula la ubicación del **cruce real**. Cuando un circuito está cerrado, cruza en un solo punto, la recta elevada dispone de espacio para rampas y tiene el kit instalado, el motor reconoce **un puente elevado** y permite correr. Sin kit, el cruce al mismo nivel sigue inválido.
- Un kit manual instalado en el ocho de demostración puede elegir qué recta pasa por encima.
- Pruebas: validadas las ocho suites JavaScript, con casos nuevos de cruce manual sin/ con soportes y persistencia al fijar un tramo.

**Limitación del prototipo:** la subida/bajada se representa visualmente y la pista se clasifica como elevada, pero todavía **no hay física 3D de pendientes**. La validación actual admite un único punto de cruce elevado por kit sobre una recta y no pretende reproducir piezas físicas certificadas.

---

## DEV 0.9.3 — conectores magnéticos por ambos extremos

**Prueba móvil:** https://almaprintes.github.io/SlotRace/?v=0.9.3

- Se corrige el acoplamiento de la pieza **Salida/meta de 350 mm** detectado en las capturas del 5 de noviembre de 2026. Antes sólo se admitían los enlaces inicio→final y final→inicio; ahora también final→final e inicio→inicio, invirtiendo la pieza cuando hace falta.
- Las piezas individuales pueden girar automáticamente hasta 180° al alinearse con un conector cercano. Cuando se invierte una curva, también se invierte su sentido R/L sin alterar sus radios ni su forma.
- Los grupos de varias piezas mantienen el límite angular de seguridad para evitar que un pequeño gesto gire violentamente un circuito completo.
- La lógica de dibujo continuo de las piezas acopladas, el scroll del maletín, el inventario infinito y el guardado `slotrace-lab-09` se mantienen.
- Se han añadido **8 pruebas de enlace de extremos** a `tests/puzzle-table.cjs`, incluidas 2 reproducciones específicas de la pieza de salida/meta.

**Pendiente de validación táctil real:** confirmar en iPhone Safari que el arrastre hacia los cuatro tipos de empalme resulta natural.

---

## DEV 0.9.2 — arrastre táctil real y uniones magnéticas continuas

**Prueba móvil:** https://almaprintes.github.io/SlotRace/?v=0.9.2

- El asa ⠿ de cada pieza se ha ampliado a **39 × 38 px** y tiene sus propios eventos `pointerdown/move/up/cancel` con captura sobre el asa, no sobre el botón del inventario. **Arrastrar desde el asa** lleva la pieza a la mesa; deslizar el resto de la espuma sigue haciendo scroll vertical.
- Los tramos sueltos conectados mediante el sistema magnético (`magnetGroup`) se representan como **un único perfil y una única sombra exterior**, utilizando una ruta continua. Únicamente se pintan juntas en los **dos extremos del grupo**; nunca una sombra negra entre piezas ya acopladas.
- Se conserva la selección por tramo/pieza, el guardado y la compatibilidad con las partidas de DEV 0.9.1.
- Pruebas: los ocho conjuntos de verificación han pasado en entorno JavaScript, incluidos tests de arrastre con captura en el asa y de ausencia de sombras/juntas interiores. **La respuesta real al gesto en Safari iPhone debe verificarse manualmente en el dispositivo.**

---

# DEV 0.9.1 — scroll táctil y acabado idéntico en mesa/caja

**Prueba móvil:** https://almaprintes.github.io/SlotRace/?v=0.9.1

- El interior de la espuma ahora tiene **scroll vertical nativo con inercia iOS**, mientras la tapa, los controles y el pie del maletín permanecen fijos.
- **Deslizar el dedo sobre una pieza** recorre el catálogo de 13 modelos, sin moverla ni crear una pieza accidental. **Tocar** la pieza extrae una copia, como antes.
- Cada hueco tiene su propia asa **⠿** en la esquina superior izquierda. **Arrastrar desde el asa** hasta la mesa extrae la pieza; el resto del hueco queda libre para desplazarse.
- Las 13 previsualizaciones SVG usan los **mismos colores y proporciones de ancho, bordes, superficie, carriles, guías y uniones** que el renderizador de pista de la mesa. Las rectas cortas tienen extremos planos, sin efecto de cápsula redondeada.
- Corregida también la extracción por arrastre de curvas cuando está seleccionado el sentido **izquierda** en la caja.
- Conserva la partida guardada de la serie 0.9.x y mantiene el inventario ∞.
- Se han verificado los 8 conjuntos de pruebas JavaScript, incluido el test de scroll/asa de `tests/foam-case.cjs`. Prueba táctil física en Safari iPhone pendiente de confirmación por usuario.

---

otRace/


## DEV 0.9.0 — familia PT-Precision activa (20 variantes, 13 formas)

**Probar en móvil:** https://almaprintes.github.io/SlotRace/?v=0.9.0

La caja de espuma presenta **13 cavidades**: rectas de 78, 87,5, 175, 350 y 584 mm, salida/meta y siete curvas R1–R4 (22,5°, 45°, 90° según radio). Cada curva admite los dos sentidos sin duplicar la cavidad, lo que suma **20 variantes geométricas** en el motor. El inventario es ilimitado durante las pruebas.

- **Caja: derecha/izquierda** elige en qué sentido extraer la siguiente curva. **Voltear curva** invierte la pieza ya seleccionada. **Girar 22,5°** rota una pieza o tramo libre.
- Radios centrales: **R1 136, R2 292, R3 448, R4 604 mm**; ancho de pista 156 mm, distancia entre carriles 78 mm.
- Plantilla de óvalo R2: 12 módulos; ocho exacto: **dos rectas 584 mm y doce curvas R2 de 45°**, con la segunda recta elevada (14 módulos).
- El algoritmo de cierre primero intenta completar con una pieza sin modificar el montaje; si no es posible busca reemplazos y combinaciones, **sin alargar ni deformar los módulos**.
- Nueva clave de guardado de pruebas `slotrace-lab-09`: se inicia con el ocho de la nueva familia sin reutilizar automáticamente el trazado calibrado de la DEV anterior. Esto es intencionado para experimentar.
- Se han adaptado las pruebas de mesa, maletín, puente, física, gatillo y cierre. La nueva prueba `tests/pt-precision.cjs` verifica círculos, radios concéntricos y recetas exactas.

**Límite actual:** PT-Precision es un sistema virtual matemático propio, no una reproducción certificada de piezas mecánicamente compatibles. Cambios de carril, cruces a nivel y bordes especiales del catálogo histórico están identificados pero **todavía no son módulos funcionales en la caja**. No se simulan como simples rectas para evitar validaciones falsas. La tabla completa y su justificación están en `docs/familia-pt-precision.md`.

---
 
## DEV 0.8.1 — piezas ilimitadas en la caja de pruebas

**Inventario de desarrollo ilimitado** para los seis modelos que ya existen en el catálogo: rectas S350/S175 y curvas R1/R2 a derecha e izquierda. Cada alojamiento de espuma muestra **∞**, permanece activo tras sacar piezas y permite colocar tantas copias como se necesiten.

- Eliminado el límite anterior de **48 módulos** por circuito y la restricción del número de unidades del kit inicial.
- La caja muestra **«∞ piezas disponibles · N en la mesa»** sin restar existencias.
- La búsqueda de cierre también puede utilizar módulos que anteriormente figuraban agotados. Sigue teniendo un límite de iteraciones para evitar bloqueos, pero no uno de existencias.
- Se conserva la información `stock` del catálogo para representar el kit físico de referencia cuando desactivemos el modo de desarrollo. La opción `UNLIMITED_DEVELOPMENT_STOCK` controla el suministro virtual; no cambia geometría, dimensiones, curvas, controles ni partidas guardadas.
- El cambio es **menor**: se incrementa únicamente el tercer número, de **0.8.0 a 0.8.1**.

**Pruebas:** `smoke.cjs` comprueba cantidades superiores a las del kit y circuitos de más de 48 módulos; `tests/foam-case.cjs` saca 45 rectas adicionales y comprueba que el hueco sigue mostrando ∞. Se mantienen las siete pruebas automatizadas de versiones anteriores.

**Prueba móvil:** https://almaprintes.github.io/SlotRace/?v=0.8.1. En la pantalla de carga y cabecera debe aparecer **DEV 0.8.1**.

### Nota sobre dimensiones

El catálogo de medidas comerciales de Scalextric Sport sigue pendiente de auditoría completa; el inventario infinito no valida ni modifica los radios geométricos provisionales que tiene actualmente el prototipo.

## DEV 0.8.0 — grupos magnéticos y selección

- Los tramos independientes pueden acoplarse mediante sus conectores, con imán entre las piezas sueltas y la cadena principal.
- Primer toque: selecciona el tramo entero para arrastrarlo. Segundo toque sobre una pieza: selecciona únicamente esa pieza para separarla.
- Los tramos unidos se mueven como un bloque conservando sus uniones.

## DEV 0.7.0 — caja física de piezas

La caja deja de ser una tira de tarjetas independientes. Ahora es **un único maletín**, con marco de plástico oscuro e **inserto de espuma blanca texturizada**. Tiene seis alojamientos troquelados, cuyas siluetas corresponden a las formas del catálogo:

- Recta de 350 mm y media recta de 175 mm.
- Curva R2 de 45° a derecha e izquierda.
- Curva R1 de 45° a derecha e izquierda.

Cada alojamiento muestra la silueta geométrica del módulo, con dos carriles y aspecto de pista apilada. El contador indica las piezas **que quedan dentro de la caja**; al vaciarse un hueco desaparece el módulo pero permanece el troquel de espuma. Las piezas conectadas o sueltas sobre la mesa ya no cuentan como piezas guardadas.

**Manejo:** tocar un alojamiento saca una pieza a la mesa como objeto independiente. También se puede **arrastrar desde cualquier zona del hueco** hasta el tapete; si se suelta cerca de un conector encaja, si no permanece suelta. Un gesto cancelado o soltado fuera de la mesa no consume inventario. La extracción por arrastre no se duplica con el clic táctil posterior.

La tapa **«Cerrar caja / Abrir caja»** permite recuperar espacio de mesa. La preferencia se guarda junto al trazado sin borrar los datos de las versiones anteriores. El diseño usa seis cavidades en una rejilla adaptable a móvil, con una fila en horizontal.

Por tratarse de un rediseño importante del constructor, incrementamos la versión menor: **0.6.0 → 0.7.0**, conforme a la política del proyecto.

**Pruebas:** `node tests/foam-case.cjs` valida inventario, seis siluetas, huecos vacíos, clics/arrastre, apertura/cierre, persistencia y que no se extraigan piezas duplicadas. La prueba está incluida en GitHub Actions.

**Prueba móvil:** https://almaprintes.github.io/SlotRace/?v=0.7.0 — verificar **DEV 0.7.0** en la carga y la cabecera.

## DEV 0.6.0 — mesa puzzle

- Se pueden sacar **varias piezas sueltas** de la caja y dejarlas desperdigadas sobre el tapete.
- Una pieza conectada se puede **coger y arrastrar**, separándola del circuito sin desplazar sus vecinas. Las piezas posteriores quedan sueltas en sus posiciones originales.
- Las piezas pueden encajarse magnéticamente **en cualquiera de los dos extremos** de la cadena, o iniciarse una cadena desde cualquier pieza suelta.
- **Deshacer y rehacer**, guardado del origen y tamaño estable de la mesa mientras se arrastra.
- Prueba automatizada `tests/puzzle-table.cjs`; esta funcionalidad supuso pasar de la rama DEV 0.5.x a 0.6.0.

## DEV 0.5.7 — interior y exterior corregidos

**Fallo corregido:** se estaba sumando el desplazamiento del carril al radio en vez de restarlo según la dirección del giro, favoreciendo al carril interior. La física utiliza ahora el radio efectivo correspondiente a cada vía y sentido de giro:

- Giro a derecha (R2R): **carril 1 interior** (radio del eje − 39 mm), **carril 0 exterior** (radio del eje + 39 mm).
- Giro a izquierda (R2L): **carril 0 interior**, **carril 1 exterior**. En el ocho, el mismo carril cambia de interior a exterior entre los lóbulos.
- Objetivos calibrados para velocidad estabilizada: **65 % interior sin salida, 70 % interior con salida; 75 % exterior sin salida, 80 % exterior con salida**. La salida se produce tras acumular pérdida de agarre dentro de la curva, no en su primera arista.
- Se comprueba tanto en el óvalo como en los **dos lóbulos del ocho completo**, incluyendo pruebas de simulación con límites intercambiados.
- No cambia la rueda táctil, el puente, la animación del trompo ni el sistema de récords.

Esta calibración es de jugabilidad para el prototipo, no un ensayo de adherencia de coches Scalextric reales. El porcentaje de aceleración por sí solo no determina la salida en cualquier situación: también importa la velocidad que lleva el coche al entrar en la curva.

**Probar:** https://almaprintes.github.io/SlotRace/?v=0.5.7 — verificar **DEV 0.5.7** en la cabecera.

## Política de versiones DEV

El número de versión sigue el formato `MAYOR.MENOR.PARCHE`:

- **Cambios pequeños** (ajustes visuales, ergonomía, correcciones sin cambios de alcance): incrementar **solo el tercer dígito**, por ejemplo `0.5.5 → 0.5.6`.
- **Cambios funcionales importantes** (nuevos sistemas, rediseños amplios o hitos del desarrollo): incrementar **el segundo dígito** y reiniciar el tercero, por ejemplo `0.5.6 → 0.6.0`.
- **Cambio del primer dígito**: reservar para hitos mayores como la versión estable `1.0.0`.

La misma versión debe figurar en la pantalla de carga, la cabecera, el título web, el script y el enlace de prueba con parámetro de caché. No aumentar el segundo dígito por un ajuste menor.


## DEV 0.5.6 — ergonomía de la rueda

- **Cuadro de porcentaje a la izquierda**, con escala y barra de potencia visibles sin que el pulgar los tape.
- **Rueda táctil a la derecha**, junto al borde derecho del puesto de pilotaje.
- Espaciado y alineación revisados para pantallas verticales y horizontales, sin agrandar la zona táctil.
- No se modifican los incrementos de 5 %, las dos tonalidades de clic, el retorno a cero, la física de curvas ni el cruce del puente.
- Se comprueba con pruebas automáticas que el cuadro precede a la rueda en la interfaz y que los cinco conjuntos de pruebas siguen pasando.

Prueba: https://almaprintes.github.io/SlotRace/?v=0.5.6. Debe aparecer **DEV 0.5.6** en la pantalla de carga y en la cabecera.

## DEV 0.5.5 — salida de curva progresiva

- **Corregido el error de entrada:** antes bastaba con superar el límite de velocidad en el primer milímetro de la curva para que el coche hiciera un trompo. Ahora el exceso de velocidad **acumula pérdida de agarre durante el recorrido**, hasta provocar la salida más adelante.
- **El coche no se sale en la arista inicial.** Cada tramo continuo de curvas del mismo sentido conserva el desgaste de agarre entre sus piezas de 45°, sin reiniciarse en las juntas.
- **Soltar o reducir gas recupera adherencia**, incluso dentro de la curva: si bajas el porcentaje a tiempo, puedes evitar la salida.
- **Las rectas ya no heredan falsamente la curvatura anterior.** Se corrige la lectura del segmento activo para que una zona físicamente recta no se penalice como curva.
- **Ajuste específico para el óvalo:** con velocidad estabilizada y carril interior, el 65 % permite completar la curva derrapando sin penalización. A 70 % mantenido, las pruebas reproducibles sitúan la salida aproximadamente a 175–182 mm dentro de una primera curva de unos 258 mm, según 60 o 120 actualizaciones por segundo: **aproximadamente 68–70 % de la pieza**, no al entrar. Es un ajuste experimental de jugabilidad, no una medida física certificada de Scalextric.
- Se mantienen los efectos de derrape, animación de trompo, cronómetro y penalización de 3 segundos sin invalidar la vuelta.
- Nueva prueba automatizada `tests/oval-curve-entry.cjs`: valida 65 % frente a 70 %, límites recta/curva, recuperación de agarre al reducir gas y estabilidad de resultado a distintas frecuencias de simulación.

Prueba en móvil: https://almaprintes.github.io/SlotRace/?v=0.5.5. Comprueba **DEV 0.5.5** en la carga y en la cabecera.

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
