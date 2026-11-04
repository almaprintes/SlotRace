# SlotRace — familia PT-Precision v1 (geometría matemática)

**Estado (04-11-2026):** especificación y motor matemático independientes, bajo pruebas. Aún **no** está seleccionable en el maletín de DEV 0.8.1; no sustituye los circuitos guardados ni la física activa.

## Referencia visual y documental

Inspirado en el catálogo clásico Scalextric PT de los años 60 (foto aportada por el usuario). Contenía PT/57, 58, 59, 60, 63; PT/51, 52, 53, 54, 55, 56 y, más tarde, PT/84; cruces, cambios y bordes. Fuentes:
- Museo Brighton: https://www.brightontoymuseum.co.uk/index/Category:Scalextric_track
- Catálogo 1964: https://www.phantomdrum.co.uk/scalexracer/pdf/scalextric-05-1964.pdf
- Inventario técnico finlandés 1966: https://finslot.net/arkisto/wp-content/uploads/2022/03/Taitaja_6-1966.pdf
- Radios nominales de la familia Sport: https://magneticracing.com/scalextric-sport-track-sizes/
- Recta comercial de 584 mm en catálogo de trazados: https://www.actionslotracing.co.uk/pages/layout-guide

**No presentamos esta familia híbrida como réplica física certificada ni garantizamos que las pestañas de diferentes generaciones ensamblen.** Los números son parámetros exactos *dentro del motor virtual*, basados en dimensiones nominales publicadas y reglas de concentricidad. Las tolerancias de fabricación y cambios históricos entre Classic/Sport/SCX no se han medido.

## Reglas de diseño (milímetros)

- Ancho de pista: **156**. Dos guías separadas **78**; offsets de guía respecto al eje de la pieza: **±39**.
- Radio al borde exterior R1: **214**. Radio del eje = 214−78 = **136**.
- Cuatro radios centrales de curva: **R1 = 136, R2 = 292, R3 = 448, R4 = 604**. Cada radio aumenta exactamente **156**. Esto permite disponer R1–R4 concéntricas sin huecos entre sus bordes.
- Ángulos nominales: **22,5° / 45° / 90°**. Dos piezas de 22,5° del mismo radio y sentido equivalen a una de 45°; cuatro de 22,5° equivalen a 90°.
- Longitudes: **78, 87,5, 175, 350 y 584**. 87,5 mm es el cuarto **virtual exacto** de 350 mm; en listados históricos PT/58 aparece redondeado como 87 mm. PT/57 figura como 78 mm. La pieza larga de 584 mm aparece comercialmente como C8505 en Sport; no se afirma que encaje físicamente con PT clásico.
- Salida/meta: pieza de 350 mm, mismo conector que la recta estándar en el modelo virtual.
- Cada modelo de curva es una pieza física conceptual con posibilidad de giro a izquierda/derecha; el motor representa los dos sentidos como dos variantes orientadas para simplificar sus cálculos.

## Catálogo geométrico v1

| Familia | Ángulos permitidos | Referencia de inspiración |
|---|---|---|
| R1 cerrada | 22,5°, 45°, 90° | PT/55, PT/52, PT/56 |
| R2 estándar | 22,5°, 45° | PT/54, PT/51 |
| R3 exterior | 22,5° | PT/53 |
| R4 superexterior | 22,5° | PT/84 |
| Rectas | 78, 87,5, 175, 350, 584 mm | PT/57 a 60, C8505 |
| Inicio/meta | 350 mm | PT/63 |

20 IDs orientados (6 rectas incluyendo salida/meta, 7 formas de curva × 2 sentidos); para el **maletín visible** deben agruparse los sentidos izquierdo/derecho en una misma cavidad, donde el constructor podrá invertir la pieza. La caja seguirá teniendo suministro ilimitado de pruebas.

## Cierres exactos de referencia

**Óvalo R2:** 2 × S350 + 4 × R2 45° derecha + 2 × S350 + 4 × R2 45° derecha. Simétrico y cerrado.

**Ocho R2:** S584 + 6 × R2 45° derecha + S584 + 6 × R2 45° izquierda. Cierra de forma analítica, porque `S584 = 2 × radio(R2) = 2 × 292`. Esto corrige el ocho antiguo de radio calibrado provisionalmente a 289,94949366 mm y no exige estirar conectores.

**Cierre**: acumular transformaciones rígidas exactas (traslación + ángulo) de todos los módulos y comparar extremo final con origen, en coma flotante de doble precisión; criterio de exactitud matemática `gap < 0,000001 mm` y error angular `< 1e-10 rad` para las recetas y equivalencias. En la futura interfaz, tolerancia magnética y homologación de cierre serán mecanismos distintos: atraer a una posición no implica aceptar un circuito geométricamente imposible.

## Piezas especiales, aún no jugables

PT/82 cambio de carriles, PT/83 cruce a nivel, PT/85 chicane de curva, PT/68 y PT/70 puente/soportes, T/39–45 bordes. No basta dibujarlas: requieren enrutamiento de guías, múltiples conectores, alturas o decoración independiente. El motor de carreras no las admitirá como recorrido certificado hasta implementar esas reglas. Los circuitos con cruce solo podrán homologarse cuando exista elevación o topología segura.

## Pruebas y migración

Código matemático independiente: `src/pt-precision.mjs`. Prueba de regresión: `node tests/pt-precision.cjs`.

Pruebas: 20 IDs válidos; 156 mm entre ejes concéntricos; cuarta recta exacta; equivalencias de arcos, círculos completos R1–R4, óvalo y ocho exactos; accesorios especiales protegidos.

**Migración siguiente:** conectar esta familia al catálogo y al maletín de SlotRace como una versión nueva (cambio funcional mayor de alcance), añadir selección por familia, arreglar el modo de inversión sin duplicar huecos y actualizar la plantilla de puente/física sin alterar los guardados antiguos. **No** cambiar a ciegas `src/track.mjs` mientras las pruebas DEV 0.8.1 dependan del radio anterior.
