"use strict";
// Carril A/B: convención física en salida/meta sin migrar récords históricos.
const assert=require("node:assert/strict");
(async()=>{
 const {STARTER,FIGURE_EIGHT,CATALOG,buildTrack,
  finishInteriorPhysicalLane,laneAIndexAtFinish}=await import("../src/track.mjs");
 const right=STARTER;
 const left=STARTER.map(id=>id.endsWith("R")&&CATALOG[id]?.angle?
  id.slice(0,-1)+"L":id);
 assert.ok(buildTrack(right).closed&&buildTrack(left).closed);
 assert.equal(finishInteriorPhysicalLane(right),1,
  "Curva a derechas: la ranura +37,5 mm es interior en meta");
 assert.equal(finishInteriorPhysicalLane(left),0,
  "Curva a izquierdas: la ranura -37,5 mm es interior en meta");
 for(const types of [right,left,FIGURE_EIGHT]){
  const physical=finishInteriorPhysicalLane(types);
  const clockwise=laneAIndexAtFinish(types,1);
  const anticlockwise=laneAIndexAtFinish(types,-1);
  assert.equal(clockwise,physical,
   "Carril A conserva el lado interior en sentido horario");
  assert.equal(anticlockwise,1-physical,
   "Cambiar la dirección no cambia el carril físico A");
  const physicalFromReverse=1-anticlockwise;
  assert.equal(physicalFromReverse,physical);
  assert.equal(new Set([clockwise,1-clockwise]).size,2);
 }
 assert.equal(laneAIndexAtFinish(FIGURE_EIGHT,1),1,
  "En un ocho, la primera curva después de meta define el interior");
 assert.equal(laneAIndexAtFinish(FIGURE_EIGHT,-1),0);
 // Formato histórico [0,1] no se reescribe; solo se presenta reordenado.
 const legacy=[14.2,13.4],a=laneAIndexAtFinish(right,1);
 assert.deepEqual([legacy[a],legacy[1-a]],[13.4,14.2]);
 const reverse=[19.2,20.4],reverseA=laneAIndexAtFinish(right,-1);
 assert.deepEqual([reverse[reverseA],reverse[1-reverseA]],[19.2,20.4]);
 console.log("Carril A interior en meta y B exterior, con ambos sentidos y récords intactos — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
