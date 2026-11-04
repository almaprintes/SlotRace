"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
const {STARTER,CATALOG,TABLE,buildTrack,allowed,freeStock,positionAt,nearestPiece,findLegalClosure,positionOnPiece,START}=await import("./src/track.mjs");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"src/site.css"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"src/app.mjs"),"utf8");
assert.match(html,/id="editCanvas"/,"Physical table canvas");
assert.match(html,/id="raceCanvas"/,"Separate racing canvas");
assert.match(html,/id="pieces"/,"Modular track inventory");
assert.match(html,/id="throttle"/,"Analog throttle");
assert.match(css,/\.tableframe/,"Physical table drawing surface");
assert.match(app,/function paintTable\(/,"Wood and felt tabletop renderer");
assert.match(app,/function paintTrack\(/,"Separate plastic track pieces");
assert.match(app,/pointerdown/,"Touch controls");
assert.match(app,/function addLoose\(/,"Disconnected parts");
assert.match(app,/function snapLoose\(/,"Magnetic snap");
assert.match(app,/function paintLoose\(/,"Loose parts visible on the table");
assert.match(app,/function rotateLoose\(/,"Loose parts can be rotated");
assert.match(html,/id="rotate"/,"Rotation button");
assert.match(css,/\.piece-card \.grip/,"Drag handle");
assert.match(app,/function simulation\(/,"Vehicle physics");
const oval=buildTrack(STARTER);
assert.equal(oval.parts.length,12);
// Invariantes geométricas: curvar a izquierda debe ser el espejo exacto
// de la misma curva a derecha, sin aproximar el giro por la longitud visual.
const r=positionOnPiece(START,"R2R",1);
const l=positionOnPiece(START,"R2L",1);
assert.ok(Math.abs(r.x-l.x)<1e-9,"Las curvas simétricas comparten avance longitudinal");
assert.ok(Math.abs((r.y-START.y)+(l.y-START.y))<1e-9,"Curvas especulares exactas");
assert.ok(Math.abs(r.h+l.h)<1e-10,"Giros opuestos exactos");
for(const piece of ["R2R","R2L","R1R","R1L"]){
  const circle=buildTrack(Array(8).fill(piece));
  assert.equal(circle.closed,true,"Ocho curvas de 45° deben cerrar perfectamente: "+piece);
  assert.ok(circle.gap<1e-6,"Sin acumulación de error en "+piece);
}
// Si una curva falta, se conecta mediante otra curva del inventario;
// jamás estirando una existente.
const almost=buildTrack(STARTER.slice(0,-1));
assert.equal(almost.closed,false);
const fixed=findLegalClosure(STARTER.slice(0,-1));
assert.equal(fixed.ok,true,"Cierre automático con curva disponible");
assert.equal(buildTrack(fixed.types).valid,true,"Cierre propuesto debe ser real");
assert.equal(fixed.replaced,0);
assert.equal(fixed.added,1);
assert.deepEqual(fixed.types,STARTER);
const halfTurned=buildTrack([...STARTER,"S175"]);
assert.equal(halfTurned.closed,false,"Una recta sobrante no se cierra por tolerancia");
assert.ok(halfTurned.gap>=170,"No deformar rectas para cerrar");
assert.match(html,/id="autoClose"/,"Botón de cálculo de cierre");
assert.match(app,/function closeExactly\(/,"Resolución automática del conector");

assert.equal(CATALOG.S350.length,350);
assert.equal(CATALOG.S175.length,175);
assert.ok(Math.abs(CATALOG.R2R.angle-Math.PI/4)<1e-8);
assert.ok(Math.abs(CATALOG.R2R.radius-289.9494936611666)<1e-8,
  "Radio virtual calibrado del EJE del módulo, no del borde exterior");
// Trazado del usuario: 8 rectas de 350 mm (2 + 4 + 2) y 10 curvas,
// cinco a derecha y cinco a izquierda. Giro neto = 0° y posición final
// debe coincidir sin deformar ni añadir una sola pieza.
const figureEight=[
 "S350","S350",...Array(5).fill("R2R"),
 ...Array(4).fill("S350"),...Array(5).fill("R2L"),
 "S350","S350"
];
const eight=buildTrack(figureEight);
assert.equal(eight.parts.length,18);
assert.equal(eight.closed,true,"El ocho simétrico debe cerrar");
assert.ok(eight.gap<1e-6,"Extremos exactamente alineados");
assert.ok(eight.headingGap<1e-8,"Giro de 225° compensado con -225°");
assert.equal(eight.intersection,true,"El ocho necesita puente, no un cruce plano");
assert.equal(eight.valid,false,"No homologar cruce sin puente automáticamente");
assert.equal(eight.onTable,true,"La mesa dinámica debe abarcar el ocho");
assert.equal(oval.closed,true,"Starter oval must connect with no gap");
assert.equal(oval.valid,true,"Starter oval must fit on the table and avoid ground-level overlaps");
assert.equal(oval.onTable,true);
assert.equal(oval.intersection,false);
assert.ok(oval.length>3000&&oval.length<5000,"Reasonable track distance in mm");
assert.ok(oval.lanes[0].total>oval.lanes[1].total,"Two lanes must have distinct lengths in the curves");
assert.ok(oval.lanes[0].total-oval.lanes[1].total>300,"Outer lane longer than inner");
for(const lane of oval.lanes){
 const p0=positionAt(lane,0),p1=positionAt(lane,lane.total);
 assert.ok(Math.abs(p0.x-p1.x)<.1&&Math.abs(p0.y-p1.y)<.1,"Closing lap must align");
}
const first=oval.parts[0],end=oval.parts.at(-1);
assert.ok(Math.hypot(first.start.x-end.end.x,first.start.y-end.end.y)<1,"Connector alignment");
const augmented=buildTrack([...STARTER,"S175"]);
assert.equal(augmented.valid,false,"Extra piece breaks closed loop");
assert.equal(augmented.closed,false);
assert.ok(augmented.gap>100);
// Un circuito abierto que se cruza también debe detectarse como incompatible
// con una pista a ras de mesa, sin confundir el cruce con el cierre.
const crossingOpen=buildTrack(["R2R","R2L","R1L","R2L","S350","S350","R1L","R1L","R1L","R2L","S175","R2L","S175","R1L","R1R","S350"]);
assert.equal(crossingOpen.closed,false);
assert.equal(crossingOpen.intersection,true);
const broken=buildTrack(STARTER.slice(0,-1));
assert.equal(broken.valid,false);
assert.ok(broken.gap>100);
const empty=buildTrack([]);
assert.equal(empty.valid,false);
assert.equal(empty.parts.length,0);
assert.equal(allowed(["S350","S350"]),true);
assert.equal(allowed(Array(9).fill("S350")),false,"Inventory cannot be duplicated");
assert.equal(freeStock(STARTER,"S350"),CATALOG.S350.stock-4);
const midpoint=positionAt(oval.lanes[0],oval.lanes[0].total/2);
assert.ok(Number.isFinite(midpoint.x)&&Number.isFinite(midpoint.y));
const nearest=nearestPiece(oval,oval.parts[0].points[3].x,oval.parts[0].points[3].y);
assert.equal(nearest.index,0,"Tap should select a physical part");
console.log("SlotRace LAB 0.4.4 OK: 12-piece oval, millimetre geometry, table bounds, seams, lanes, stock, touch UI and controls.");
})().catch(err=>{console.error(err);process.exitCode=1;});
