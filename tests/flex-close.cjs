"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const geo=await import("../src/track.mjs");
 const code=fs.readFileSync("src/app.mjs","utf8");
 const start=code.indexOf("function loopFromLooseGroup(index){");
 const end=code.indexOf("function alignStartFinishPiece(){",start);
 assert.ok(start>=0&&end>start,"No encuentro el motor real de acoplamiento");
 const section=code.slice(start,end);
 const original=geo.buildTrack(geo.FIGURE_EIGHT,geo.START,[7]);
 assert.ok(original.valid,"El ocho de referencia debe ser válido");
 const poses=original.parts.map((p,i)=>({
  id:p.id,x:p.start.x,y:p.start.y,h:p.start.h,raised:i===7
 }));
 const difference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 const group={indices:poses.map((_,i)=>i),parts:poses,start:{...original.parts[0].start}};
 const run=new Function("looseGroup","positionOnPiece","connectorDistance",
  "angleDiff","buildTrack",section+"\nreturn loopFromLooseGroup;");
 const close=run(()=>group,geo.positionOnPiece,(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
  difference,geo.buildTrack);
 poses.at(-1).x+=.4;
 const measurement=geo.gapAnalysis.measureGap(geo.positionOnPiece(poses.at(-1),poses.at(-1).id,1),group.start,geo.CATALOG);
 assert.ok(measurement.distance<1&&measurement.headingDegrees<.0001,
  "Representación física: hueco de 0,4 mm y ángulo cero");
 let r=close(0);
 assert.ok(r?.track?.closed,"Al superar 0,4 mm debe acoplarse");
 assert.ok(r.track.valid,"Tras acoplar permanece válido");
 // Además de validar geometría, comprobar que el comando Cerrar retira
 // de verdad las piezas magnéticas y las monta como pista principal.
 const closeFrom=code.indexOf("function closeLooseLoop("),
  closeTo=code.indexOf("function wouldCloseOnJoin(",closeFrom);
 assert.ok(closeFrom>=0&&closeTo>closeFrom);
 const state={types:[],loose:poses.map(p=>({...p})),track:geo.buildTrack([],group.start),
  origin:{...group.start},bridgeParts:[],selectedGroup:null,
  selectionMode:"group",selection:-1,looseSelection:-1,dragLoose:-1};
 const calls={history:0,saved:0,ui:0};
 const command=new Function("state","loopFromLooseGroup","pushHistory","buildTrack",
  "alignStartFinishPiece","extendWorkBoard","save","updateUI","toast",
  code.slice(closeFrom,closeTo)+"\nreturn closeLooseLoop;")(
  state,close,()=>calls.history++,geo.buildTrack,()=>{},()=>{},
  ()=>calls.saved++,()=>calls.ui++,()=>{});
 assert.equal(command(0),true,"Pulsar Cerrar debe completar el montaje con 0,4 mm");
 assert.equal(state.loose.length,0,"Ninguna pieza debe quedar sin acoplar");
 assert.equal(state.types.length,14,"Se conservan las catorce piezas");
 assert.ok(state.track.valid,"Pista lista tras la conversión");
 assert.equal(calls.history,1,"Deshacer disponible");
 assert.equal(calls.saved,1,"El cierre se guarda");
 poses.at(-1).x+=10.1;
 r=close(0);
 assert.equal(r,null,"Más de 10 mm NO se acopla");
 poses.at(-1).x-=10.5;
 poses.at(-1).h+=2*Math.PI/180;
 r=close(0);
 assert.equal(r,null,"Más de 1 grado NO se acopla");
 console.log("Holgura real: 0,4 mm/0° acopla 14 piezas; >10 mm y >1° se rechazan");
})().catch(e=>{console.error(e);process.exitCode=1});
