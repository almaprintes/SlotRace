"use strict";
// Pruebas unitarias PT/82: pieza especial, cupo y choque entre dos coches.
const assert=require("node:assert/strict");
(async()=>{
 const g=await import("../src/track.mjs");
 assert.equal(g.CATALOG.X350.length,350);
 assert.equal(g.CATALOG.X350.laneChanger,true);
 assert.equal(g.stockLimit("X350"),1);
 assert.equal(g.allowed(["X350"]),true);
 assert.equal(g.allowed(["X350","X350"]),false,
  "No permitir dos PT/82, ni siquiera en desarrollo");
 assert.equal(g.freeStock(["X350"],"X350"),0);
 const original=g.STARTER;
 const pos=original.indexOf("S350");
 assert.ok(pos>=0,"La pista de pruebas debe incluir una recta normal 350");
 const types=original.slice();types[pos]="X350";
 const t=g.buildTrack(types);
 assert.equal(t.valid,true,"Sustituir S350 por PT/82 no cambia el cierre");
 assert.equal(t.laneChangerIndex,pos);
 assert.equal(t.lanes[0].total,g.buildTrack(original).lanes[0].total,
  "El cambio no altera las medidas exteriores del circuito");
 const a={entryLane:0,lane:1,pieceIndex:pos,pieceT:.51,
  driveDirection:1,speed:510,penalty:0};
 const b={entryLane:1,lane:0,pieceIndex:pos,pieceT:.50,
  driveDirection:1,speed:480,penalty:0};
 assert.equal(g.pt82Collision(t,a,b),true,
  "Ambos coches coinciden sobre el cruce central");
 assert.equal(g.pt82Collision(t,a,{...b,pieceT:.22}),false,
  "No hay choque si uno todavía no llegó");
 assert.equal(g.pt82Collision(t,a,{...b,entryLane:0}),false,
  "No confundir dos coches del mismo carril con el cruce");
 const result=g.pt82ResolveCollision(t,a,b);
 assert.equal(result.length,2);
 assert.deepEqual(result.map(r=>r.lane),[1,0],
  "Cada coche aparece en su carril de destino");
 assert.ok(result.every(r=>r.pieceT>.70&&r.pieceT<.8),
  "Ambos reaparecen justo pasada la X");
 assert.ok(result.every(r=>r.speed===0&&r.penalty===3));
 assert.ok(result.every(r=>r.distance>=0&&Number.isFinite(r.distance)));
 const reverse=g.pt82ResolveCollision(t,
  {...a,driveDirection:-1},{...b,driveDirection:-1});
 assert.ok(reverse.every(r=>r.pieceT<.3&&r.pieceT>.2),
  "En sentido contrario se respawnea después de la X en dirección de marcha");
 assert.equal(g.pt82Collision(g.buildTrack(original),a,b),false,
  "Los circuitos sin PT/82 conservan su física");
 console.log("PT/82: construcción, límite de una unidad, cruce y colisión doble OK");
})().catch(err=>{console.error(err);process.exitCode=1});
