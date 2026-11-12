"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const geo=await import("../src/track.mjs");
 const {PRICE_BY_PIECE}=await import("../src/economy-catalog.mjs");
 const {proposeClosures,closureBudget}=await import("../src/closure-guide.mjs");
 const {findBidirectionalClosure}=await import("../src/closure-tail.mjs");
 const options={origin:geo.START,raisedParts:[],prices:PRICE_BY_PIECE,
  build:geo.buildTrack,solve:geo.findLegalClosure,maxStates:10000,maxAdd:3};
 const original=geo.STARTER.slice();
 const originalCopy=original.slice();
 const finish=proposeClosures({...options,types:original,available:null});
 assert.ok(finish.ok,"El óvalo cerrado pero sin START350 obtiene una propuesta");
 assert.equal(finish.selected.types.filter(x=>x==="START350").length,1,
  "El cierre debe tener una meta real, exactamente una");
 assert.ok(finish.selected.geometry.valid);
 assert.deepEqual(original,originalCopy,"La propuesta NO altera el circuito");
 assert.ok(finish.selected.add.some(x=>x.id==="START350"&&x.qty===1));
 assert.ok(finish.selected.returnParts.some(x=>x.id==="S350"));
 assert.equal(finish.selected.missingCount,0,"En laboratorio no hay límite de stock");
 const unavailable=proposeClosures({...options,types:original,available:{}});
 assert.equal(unavailable.selected.missingCount,1);
 assert.deepEqual(unavailable.selected.missing,[{id:"START350",qty:1}]);
 assert.equal(unavailable.selected.price,PRICE_BY_PIECE.START350);
 const owned=proposeClosures({...options,types:original,
  available:{START350:1}});
 assert.equal(owned.selected.missingCount,0);
 assert.equal(owned.selected.price,0);
 const closed=original.map((x,i)=>i===0?"START350":x);
 assert.ok(geo.buildTrack(closed).valid);
 const gap=closed.slice(0,-1);
 assert.equal(geo.buildTrack(gap).valid,false);
 const found=proposeClosures({...options,types:gap,available:null});
 assert.ok(found.ok,"Debe cerrar el óvalo al faltar la última curva");
 assert.ok(geo.buildTrack(found.selected.types).valid);
 assert.equal(found.selected.types.filter(x=>x==="START350").length,1);
 assert.ok(found.selected.add.length>0);
 const priced=closureBudget(gap,found.selected.types,{},PRICE_BY_PIECE);
 assert.ok(priced.missingCount>0&&priced.price>0);
 const unknown=proposeClosures({...options,types:["S350","S350"],available:null});
 assert.equal(unknown.ok,false);
 const duplicates=proposeClosures({...options,types:["START350","S350","START350","R2_45R"],available:null});
 assert.equal(duplicates.ok,false);
 // Once piezas de un óvalo ampliado, con cinco piezas de cierre
 // faltantes: el motor antiguo se agotaba antes de encontrar estos encajes.
 const long=[];
 for(const [i,id] of geo.STARTER.entries()){
  if(i===0)long.push("START350");
  else if((i===1||i===6||i===7)&&id==="S350")long.push("S175","S175");
  else if(i===2&&id==="R2_45R")long.push("R2_225R","R2_225R");
  else long.push(id);
 }
 assert.equal(long.length,16);
 assert.ok(geo.buildTrack(long).valid,"Receta ampliada usada como referencia real");
 const eleven=long.slice(0,11);
 const pair=findBidirectionalClosure(eleven,{
  origin:geo.START,raisedParts:[],build:geo.buildTrack,catalog:geo.CATALOG,
  prices:PRICE_BY_PIECE,maxAppend:6,maxTailReplace:3
 });
 assert.ok(pair.ok,"El nuevo motor debe poder cerrar un trazado de 11 piezas");
 assert.ok(geo.buildTrack(pair.types,geo.START,pair.raisedParts).valid);
 assert.deepEqual(pair.types.slice(0,11),eleven,"No altera las once piezas montadas");
 assert.equal(pair.types.filter(id=>id==="START350").length,1);
 const guided=proposeClosures({...options,types:eleven,catalog:geo.CATALOG,available:null});
 assert.ok(guided.ok,"El asistente debe activar Aplicar para un cierre complejo");
 assert.ok(guided.selected.geometry.valid);
 // Ocho de 11 piezas con puente real y sin meta: una recta S600
 // se sustituye por START350 + S175 + S075 (600 mm exactos).
 const openEight=geo.FIGURE_EIGHT.slice(0,11);
 const expandedEight=["START350","S175","S075",...geo.FIGURE_EIGHT.slice(1)];
 const finishedEight=geo.buildTrack(expandedEight,geo.START,[9]);
 assert.ok(finishedEight.valid,"Ocho de referencia con puente y salida/meta válido");
 const eightSolution=proposeClosures({
  ...options,types:openEight,raisedParts:[7],
  catalog:geo.CATALOG,available:null
 });
 assert.ok(eightSolution.ok,"El asistente resuelve un ocho de once piezas");
 assert.equal(eightSolution.selected.types.filter(x=>x==="START350").length,1);
 assert.equal(eightSolution.selected.types.filter(x=>x==="S600").length,1);
 assert.ok(eightSolution.selected.geometry.valid);
 assert.ok(eightSolution.selected.raisedParts.includes(9),
  "Mantiene las elevaciones aunque se subdivida una recta anterior");
 const pt=closed.slice();pt[1]="X350";const ptOpen=pt.slice(0,-1);
 const crossing=proposeClosures({...options,types:ptOpen,available:null});
 if(crossing.ok)assert.equal(crossing.selected.types.filter(x=>x==="X350").length,1,
  "La guía PT82 no puede eliminarse durante un ajuste");
 console.log("Guía de cierres: geometría, meta única, piezas propias, presupuesto y PT82 OK");
})().catch(error=>{console.error(error);process.exitCode=1});
