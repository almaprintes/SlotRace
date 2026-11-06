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
