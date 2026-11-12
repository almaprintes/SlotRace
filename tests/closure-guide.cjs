"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const geo=await import("../src/track.mjs");
 const {PRICE_BY_PIECE}=await import("../src/economy-catalog.mjs");
 const {proposeClosures,closureBudget}=await import("../src/closure-guide.mjs");
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
 const pt=closed.slice();pt[1]="X350";const ptOpen=pt.slice(0,-1);
 const crossing=proposeClosures({...options,types:ptOpen,available:null});
 if(crossing.ok)assert.equal(crossing.selected.types.filter(x=>x==="X350").length,1,
  "La guía PT82 no puede eliminarse durante un ajuste");
 console.log("Guía de cierres: geometría, meta única, piezas propias, presupuesto y PT82 OK");
})().catch(error=>{console.error(error);process.exitCode=1});
