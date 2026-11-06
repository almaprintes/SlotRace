# Auditoría de radios: SR-Precision frente a Scalextric Classic

Revisión: 6 de noviembre de 2026 · SlotRace DEV 0.14.18

## Alcance

**No hemos convertido el juego en Scalextric Classic ni Sport.** La familia del motor sigue siendo `sr-precision-v1`, con conectores virtuales y geometrías propias. Las referencias de catálogo sirven para clasificar familias históricas de curvas, **no** para prometer equivalencia física ni encaje con piezas comerciales reales.

## Catálogo histórico confirmado

- Scalextric Classic, 7.ª edición (1966): PT/52-G curva interior 45°; PT/55-K media interior 22,5°; PT/56-L doble interior 90°; PT/51-F estándar 45°; PT/54-J media estándar 22,5°; PT/53-H exterior 22,5°; PT/84-M curva de radio grande 22,5°.
- El catálogo de 1972 ilustra tres cotas para las curvas interiores, estándar y exteriores: aproximadamente 140, 295 y 450 mm. La imagen no permite afirmar con seguridad que cada cota se tomó en el eje de nuestros dos carriles; por eso **no** se han copiado literalmente como radios matemáticos.
- El folleto de 1966 **no facilita una cifra exacta verificable** para el radio PT/84-M, de modo que **no** atribuimos 600 mm reales a esa pieza.
- El catálogo **Sport 2025** usa otros radios nominales (R1 214 mm, R2 370 mm, R3 526 mm, R4 682 mm). Es otra familia comercial y no es la que representa nuestro trazado.

Fuentes:
1. [Scalextric catálogo 1966, p.18](https://www.phantomdrum.co.uk/scalexracer/pdf/scalextric-07-1966.pdf)
2. [Scalextric catálogo 1972, p.12](https://slot32.de/media/files/pdf/scalex/scal-cat/scal-13-1972.pdf)
3. [Scalextric catálogo 2025, p.45](https://arwico.ch/media/mageworx/downloads/attachment/file/s/c/scalextric_2025_catalogue.pdf)

## Equivalencias orientativas

| Familia SR | Radio virtual exacto | Denominación en el estante | Tipo Classic que la inspira | Medida de Classic legible |
| --- | ---: | --- | --- | --- |
| R1 | 150 mm | Cerrada | G/PT/52 (también K/PT/55 y L/PT/56) | ≈140 mm |
| R2 | 300 mm | Estándar | F/PT/51 (también J/PT/54) | ≈295 mm |
| R3 | 450 mm | Abierta | H/PT/53 | ≈450 mm |
| R4 | 600 mm | Muy abierta | M/PT/84 | No confirmada |

El motor conserva un paso de **150 mm entre radios consecutivos**, igual al ancho virtual total de la pieza, con separación de 75 mm entre carriles. Esto facilita disponer familias concéntricas y mantener la aritmética de los conectores sin estirar las piezas.

## Reglas de catálogo y construcción

1. **Inventario por radio y luego por ángulo:** las combinaciones de 90° están al lado de las piezas de su mismo radio, no al final del estante.
2. **Curvas R1–R4 con diámetro visual comprensible:** la etiqueta muestra su radio virtual y si es cerrada, estándar, abierta o muy abierta.
3. **Curvas de 90° como módulos unitarios desde DEV 0.14.18:** R1, R2, R3 y R4 disponen cada uno de piezas únicas derecha/izquierda (`R*_90R/L`), con dos juntas externas y un arco continuo. Los viejos diseños que utilicen 2 × 45° o 4 × 22,5° conservan esas piezas individuales en sus recetas originales.
4. **Sin modificación silenciosa:** se conservan radios, longitudes, física, guardados, récords y enlaces de receta.
5. **Pruebas:** verificar cada curva unitaria R1–R4 de 90°, comprobar el incremento concéntrico de 150 mm, verificar etiquetas y orden de inventario, y validar los imanes al separar, unir e invertir grupos completos. Una futura geometría física comercial deberá emplear un identificador de familia diferente y migración explícita.

## Pendiente de medidas físicas certificadas

Antes de construir una segunda familia realmente compatible con Classic, medir o documentar de fuente primaria el radio hasta el centro de cada carril, ancho completo, separación de ranuras, geometría de conectores y tolerancias; especialmente PT/84-M. No mezclar automáticamente Classic y Sport.
