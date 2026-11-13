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
 const duplicate=original.slice();
 duplicate[0]="X350";duplicate[1]="X350";
 assert.equal(g.buildTrack(duplicate).valid,false,
  "El validador de circuitos rechaza recetas importadas con dos PT/82");
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
 // La recuperación real de IA no debe dejar coches dentro de la X.
 // Se comprueba la posición física (no sólo una distancia sumada a ciegas).
 const recovery=g.carsBeyondCollision(t,1,
  {lane:0,pose:{pieceIndex:pos,pieceT:.48}},
  {lane:1,pose:{pieceIndex:pos,pieceT:.52}});
 assert.ok(recovery,"La geometría calcula ambas recolocaciones");
 assert.equal(recovery.obstaclePieceIndex,pos);
 const physicalPose=(result,dir)=>{
  const lane=t.lanes[dir===-1?1-result.lane:result.lane];
  return g.positionAt(lane,dir===-1?-result.distance:result.distance);
 };
 // Se compara el avance desde la salida física de PT/82, no las
 // distancias absolutas de carriles con perímetros diferentes.
 const advancement=(result,dir)=>{
  const lane=t.lanes[dir===-1?1-result.lane:result.lane];
  const first=lane.nodes.findIndex(n=>n.pieceIndex===pos);
  const last=lane.nodes.findLastIndex(n=>n.pieceIndex===pos);
  assert.ok(first>0&&last>=first);
  const exit=lane.lengths[dir===1?last:first-1];
  const exitForward=dir===1?exit:(lane.total-exit)%lane.total;
  return(result.distance-exitForward+lane.total)%lane.total;
 };
 assert.ok(Math.abs(advancement(recovery.player,1)-
                    advancement(recovery.rival,1))<.01,
  "Choque transversal: jugador e IA a la misma distancia después de PT/82");
 const aAfter=physicalPose(recovery.player,1),bAfter=physicalPose(recovery.rival,1);
 assert.notEqual(aAfter.pieceIndex,pos,"Jugador fuera de la pieza conflictiva");
 assert.notEqual(bAfter.pieceIndex,pos,"IA fuera de la pieza conflictiva");
 assert.ok(Math.hypot(aAfter.x-bAfter.x,aAfter.y-bAfter.y)>35,
  "La IA no se superpone al jugador nada más recuperar");
 const reverseRecovery=g.carsBeyondCollision(t,-1,
  {lane:0,pose:{pieceIndex:pos,pieceT:.52}},
  {lane:1,pose:{pieceIndex:pos,pieceT:.48}});
 assert.ok(Math.abs(advancement(reverseRecovery.player,-1)-
                    advancement(reverseRecovery.rival,-1))<.01,
  "Choque transversal inverso: misma distancia después de PT/82");
 assert.notEqual(physicalPose(reverseRecovery.player,-1).pieceIndex,pos,
  "En marcha inversa el jugador reaparece detrás del extremo correcto");
 assert.notEqual(physicalPose(reverseRecovery.rival,-1).pieceIndex,pos,
  "La IA respeta el otro sentido de marcha");
 const sameLane=g.carsBeyondCollision(t,1,
  {lane:0,pose:{pieceIndex:pos,pieceT:.5}},
  {lane:0,pose:{pieceIndex:pos,pieceT:.5}});
 assert.equal(sameLane.rival.lane,0,
  "Un alcance dentro de PT/82 no cambia artificialmente de guía");
 assert.ok((sameLane.rival.distance-sameLane.player.distance+t.lanes[0].total)%t.lanes[0].total>=320,
  "Un alcance dentro de PT/82 conserva la separación de seguridad");
 const plain=g.buildTrack(original);
 const plainRecovery=g.carsBeyondCollision(plain,1,
  {lane:0,pose:{pieceIndex:1,pieceT:.5}},
  {lane:0,pose:{pieceIndex:1,pieceT:.5}});
 assert.equal(plainRecovery.obstaclePieceIndex,null);
 assert.ok((plainRecovery.rival.distance-plainRecovery.player.distance+plain.lanes[0].total)%plain.lanes[0].total>=320,
  "Fuera de la X conservan vía y se escalonan tras el obstáculo");
 assert.equal(plainRecovery.rival.lane,0);
 console.log("PT/82: construcción, límite de una unidad, cruce y colisión doble OK");
})().catch(err=>{console.error(err);process.exitCode=1});
