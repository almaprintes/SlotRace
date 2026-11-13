"use strict";
// Ejercita las funciones REALES del rival aisladas del DOM y las cuentas.
// Verifica continuidad geométrica y conmutación de carril en cada vuelta.
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const geo=await import("../src/track.mjs");
 const contact=await import("../src/rear-contact.mjs");
 const physicsV4=await import("../src/physics-v4.mjs");
 const aiDriver=await import("../src/ai-driver.mjs");
 const src=fs.readFileSync("src/app.mjs","utf8");
 function section(from,to){
  const a=src.indexOf(from),b=src.indexOf(to,a+from.length);
  assert.ok(a>=0&&b>a,"No se encontró el código real: "+from);
  return src.slice(a,b);
 }
 const physics=[
  section("function laneDistanceAtPiece(","function poseOnDrivingLane("),
  section("function poseOnDrivingLane(","function displayDrivingPose("),
  section("function switchEase(","function xSwitchPoints("),
  section("const aiTest={","function paintAiTest(")
 ].join("\n");
 const make=new Function("state","positionAt","CAR_LENGTH_MM","DRIVE","carTrackLevel","carsBeyondCollision","toast",
  "forwardGap","rearContact","followTarget","reentrySafe","REAR_CONTACT",
  "advanceSpeedV4","advanceRearV4","chooseAiThrottleV4","chooseAiThrottleOnTrackV4","curvePhase","LANE_OFFSET",
  physics+"\nfunction displayDrivingPose(){return{x:-100000,y:-100000}}\n"+
  "return{ai:aiTest,pose:aiTestPose,advance:advanceAiTest,at:laneDistanceAtPiece};");
 const types=[...geo.STARTER],idx=types.indexOf("S350");
 assert.ok(idx>=0);
 types[idx]="X350";
 const track=geo.buildTrack(types);
 assert.equal(track.valid,true);
 const piece=track.parts[idx];
 const mm=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 for(const direction of [1,-1]){
  const state={track,driveDirection:direction,run:true,raceStarted:true,mode:"race",penalty:0};
  const engine=make(state,geo.positionAt,98,physicsV4.DRIVE,()=>0,()=>null,()=>{},
   contact.forwardGap,contact.rearContact,contact.followTarget,contact.reentrySafe,contact.REAR_CONTACT,
   physicsV4.advanceSpeedV4,physicsV4.advanceRearV4,aiDriver.chooseAiThrottleV4,
   aiDriver.chooseAiThrottleOnTrackV4,()=>({progress:0,lengthMm:0}),geo.LANE_OFFSET);
  const ai=engine.ai;
  ai.active=true;ai.lane=0;ai.speed=580;ai.armed=true;
  const previousPhysical=direction===1?0:1;
  const newPhysical=1-previousPhysical;
  const original=track.lanes[previousPhysical],dest=track.lanes[newPhysical];
  const entry=engine.at(original,idx,direction===1?0:1);
  const start=(direction===1?entry:(original.total-entry)%original.total);
  ai.distance=(start-6+original.total)%original.total;
  const before=engine.pose();
  engine.advance(.03);
  const after=engine.pose();
  assert.equal(ai.lane,1,"IA debe conmutar a su otro carril");
  assert.equal(ai.laneTransition?.physical,true,"Debe animarse el cruce, no saltarlo");
  assert.ok(mm(before,after)<45,"Entrada sin salto lateral ("+direction+")");
  for(const t of [.15,.5,.85]){
   const d=engine.at(dest,idx,t);
   ai.distance=direction===1?d:(dest.total-d)%dest.total;
   const actual=engine.pose();
   const center=geo.positionOnPiece(piece.start,piece.id,t);
   const entrySide=(previousPhysical===0?-1:1)*geo.LANE_OFFSET;
   const exitSide=-entrySide;
   const travelT=direction===1?t:1-t;
   const ease=travelT*travelT*(3-2*travelT);
   const side=entrySide+(exitSide-entrySide)*ease;
   const expected={x:center.x-Math.sin(center.h)*side,
    y:center.y+Math.cos(center.h)*side};
   assert.ok(mm(actual,expected)<5,
    "IA recorre el surco cruzado: sentido "+direction+", tramo "+t+
    ", desviación "+mm(actual,expected).toFixed(2)+" mm");
  }
  const out=engine.at(dest,idx,direction===1?1:0);
  const forwardOut=direction===1?out:(dest.total-out)%dest.total;
  ai.distance=(forwardOut+45)%dest.total;
  engine.advance(.015);
  assert.equal(ai.laneTransition,null,"La transición termina después de salir");
  assert.equal(ai.armed,true,"IA queda armada para la siguiente vuelta");
  const newEntry=engine.at(dest,idx,direction===1?0:1);
  const newStart=direction===1?newEntry:(dest.total-newEntry)%dest.total;
  ai.distance=(newStart-6+dest.total)%dest.total;
  engine.advance(.03);
  assert.equal(ai.lane,0,"En la próxima vuelta vuelve a cambiar de guía");
  assert.equal(ai.laneTransition?.physical,true,"Segundo cruce igualmente animado");
 }
 console.log("IA PT/82: cruce físico sin teletransporte, inverso y cambio en vueltas consecutivas OK");
})().catch(e=>{console.error(e);process.exitCode=1});
