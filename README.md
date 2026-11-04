# SlotRace LAB — prototipo 0.3

Repositorio autónomo **SlotRace**: primera versión del laboratorio jugable. Totalmente separado del código y del despliegue público de Top Down RACE.

## Cómo abrirlo

**Para probar en móvil:** una vez activado GitHub Pages en Settings → Pages → Source: GitHub Actions, entra en https://almaprintes.github.io/SlotRace/ .

Localmente abre `index.html` en un navegador moderno. Es un prototipo HTML autónomo, sin dependencias ni conexión a Supabase. Para servirlo desde un ordenador también puedes ejecutar `python3 -m http.server 8080` en la raíz del repositorio y abrir `http://localhost:8080/`.

## Cómo conducir en móvil

1. Abre la web y pulsa **«🏁 Jugar ahora»** junto a la vista cenital o en el botón fijo inferior del móvil. **Funciona aunque el circuito actual esté abierto**: se conserva como borrador y se monta el óvalo inicial.
2. El juego abre una vista sin scroll con pista, cronómetro, vuelta y gatillo siempre visibles.
3. **Mantén** el botón «MANTENER ACELERADOR» para acelerar a fondo, o **arrastra y mantén** el deslizador para regular el gatillo de forma analógica. Al soltar el dedo, el deslizador vuelve a 0.
4. **Pausar / Seguir** permite detener y continuar; puedes **cambiar de carril mientras esté pausado**.
5. Pulsa **Salir** para volver a editar la pista. La carrera se pausa. Si venías de una construcción sin cerrar, aparecerá **«Recuperar diseño»** y podrás restaurar todas sus piezas.

**Importante:** el editor sigue siendo de conexión secuencial y no monta automáticamente cualquier figura. Para probar la conducción, usa siempre Jugar ahora. Los diseños y marcas usan almacenamiento local del navegador y **pueden perderse al cerrar todas las pestañas de navegación privada**.

En vertical, la pista se gira automáticamente en pantalla para ocupar más espacio, **sin cambiar la geometría real de las piezas**.

## Qué funciona

- Óvalo inicial cerrado de **dos carriles** y coche visible.
- Editor secuencial de piezas dobles: recta, curva a derecha e izquierda, deshacer, desmontar y restaurar el óvalo.
- Encaje geométrico automático entre conectores (modelo de piezas provisional); validación de cierre y rechazo de cruces de ejes.
- Inventario limitado por clase de pieza, sin duplicarlo al desmontar.
- Gatillo analógico por deslizador, botón táctil «Mantener para acelerar» y teclado (espacio/flecha arriba).
- Movimiento con aceleración, inercia, límite de agarre en curva y salida de pista con inmovilización de **3 segundos**, manteniendo válida la vuelta.
- Cronometraje por carril, mejores vueltas independientes y **suma de los dos mejores tiempos**, incluso de intentos distintos.
- Pausa, reinicio y cambio de carril **solo fuera de la conducción**.
- Autoguardado de diseño y récords personales en el navegador (localStorage).
- Modo de pilotaje dedicado a pantalla completa en iPhone y Android, con controles permanentes abajo y HUD arriba, sin scroll mientras se conduce.

## Qué NO es todavía

- **No** usa medidas reales u homologadas de pistas Scalextric / SCX. Las rectas, radios y agarre se expresan en unidades de prototipo.
- **No** incluye elevaciones, puentes, cruce en ocho, montaje manual sobre mesa libre, motores de coches diferenciados, mando físico, sonido ni rivales IA.
- **No** son tiempos oficiales ni existe ningún ranking mundial, validación de servidor, inventario de usuario ni economía.
- La simulación de tiempo es preliminar: no sirve para comparaciones competitivas ni para evaluar el rendimiento final en iPhone.
- Los récords locales pertenecen a este navegador; al borrar su almacenamiento se pierden.

## Pruebas

`node smoke.cjs`

La prueba ejecuta la lógica con elementos de interfaz simulados para comprobar cierre, edición, conducción y récords. **No sustituye las pruebas visuales y táctiles en dispositivos reales.**

## Próximo hito de ingeniería

1. Homologar catálogo y medidas verdaderas de piezas antes de prometer equivalencia física.
2. Crear colocación libre en mesa, conexión de extremos y validación modular sólida.
3. Probar aceleración, ritmo de curvas y cronómetro en iOS y Android; medir estabilidad de fotogramas.
4. Incorporar solo después la competición de dos mangas, IA y demás sistemas aprobados.

## Regla de seguridad

Este repositorio es un laboratorio autónomo. Nunca debe conectarse a las tablas públicas, monetización ni versión de producción de Top Down RACE sin una fase específica de integración y pruebas.
