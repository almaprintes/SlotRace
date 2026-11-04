# SlotRace LAB 0.4.3 — mesa de montaje y Scalextric virtual

Proyecto independiente de Top Down RACE. Prototipo web **jugable en móvil**, desplegado con **GitHub Actions + GitHub Pages** y sin backend.

**Enlace:** https://almaprintes.github.io/SlotRace/


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
