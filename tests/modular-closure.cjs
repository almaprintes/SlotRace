"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const {PARTS,GEOMETRY,RADII,trace}=await import("../src/pt-precision.mjs");
 const {CATALOG,STARTER,FIGURE_EIGHT,buildTrack,findLegalClosure}=await import("../src/track.mjs");
 const {measureGap,composeStraightDistance,gapExplanation,analyzeOpenEnds}=await import("../src/gap-analysis.mjs");
 const unit=GEOMETRY.lengthUnit;
 assert.equal(unit,12.5);
 assert.equal(GEOMETRY.radiusStep,12*unit);
 const straights=Object.entries(PARTS).filter(([,p])=>p.kind==="straight");
 for(const [id,p] of straights)
  assert.ok(Number.isInteger(p.length/unit),id+" debe ser proporcional");
 for(const [id,p] of Object.entries(CATALOG))
  if(p.length)assert.ok(Number.isInteger(p.length/unit),id);
 for(const [id,rad] of Object.entries(RADII))
  assert.equal(rad/unit,Math.round(rad/unit),"Radio modular "+id);
 function samePoint(a,b){
  assert.ok(Math.hypot(a.end.x-b.end.x,a.end.y-b.end.y)<1e-8);
  assert.ok(Math.abs(a.end.h-b.end.h)<1e-10);
 }
 samePoint(trace(["S350"]),trace(["S175","S175"]));
 samePoint(trace(["S350"]),trace(Array(4).fill("S0875")));
 samePoint(trace(["S600"]),trace(["S350","S175","S075"]));
 samePoint(trace(["S600"]),trace(["S175","S175","S175","S075"]));
 samePoint(trace(["S600"]),trace(Array(8).fill("S075")));
 samePoint(trace(Array(2).fill("R2_225R")),trace(["R2_45R"]));
 samePoint(trace(Array(4).fill("R1_225R")),trace(["R1_90R"]));
 assert.equal(buildTrack(STARTER).valid,true);
 assert.equal(buildTrack(FIGURE_EIGHT).valid,true);
 // La simetría de dos lados permite resolver un hueco exacto con piezas
 // distintas: 25 mm usando dos módulos de ajuste de 12,5 mm.
 const ovalWithAdjustment=[
   "S350","S0125","S0125",...Array(4).fill("R2_45R"),
   "S350","S0125","S0125",...Array(4).fill("R2_45R")
 ];
 const rotated=[...ovalWithAdjustment.slice(3),...ovalWithAdjustment.slice(0,3)];
 assert.equal(buildTrack(rotated).valid,true,"Óvalo modular simétrico");
 const short=rotated.slice(0,-2);
 const shortTrack=buildTrack(short);
 assert.equal(shortTrack.closed,false);
 const delta=measureGap(shortTrack.ends.end,shortTrack.parts[0].start,CATALOG);
 assert.equal(delta.exact,true,"El hueco de 25 mm está alineado");
 assert.equal(delta.combination.length,25);
 const closed=findLegalClosure(short);
 assert.equal(closed.ok,true,"La búsqueda de cierre modular encuentra solución");
 assert.equal(closed.modular,true,"Uso de composición exacta y no ajuste de posiciones");
 assert.equal(closed.added,2);
 assert.deepEqual(closed.types.slice(-2),["S0125","S0125"]);
 assert.equal(buildTrack(closed.types).valid,true);

 // Si el hueco es recto y está sobre la rejilla, SIEMPRE hay composición
 // con S0125; devolver la que usa menos módulos.
 for(let units=1;units<=80;units++){
  const result=composeStraightDistance(units*unit,CATALOG);
  assert.ok(result,"Longitud múltiplo de "+unit+" sin solución: "+units);
  const sum=result.ids.reduce((total,id)=>total+CATALOG[id].length,0);
  assert.equal(sum,units*unit);
 }
 assert.deepEqual(composeStraightDistance(350,CATALOG).ids,["S350"]);
 const fit=measureGap({x:0,y:0,h:0},{x:337.5,y:0,h:0},CATALOG);
 assert.equal(fit.problem,"composition");
 assert.equal(fit.exact,true);
 assert.equal(fit.combination.length,337.5);
 assert.ok(fit.combination.count>=2);
 assert.match(gapExplanation(fit),/Combinación:.*cierre matemáticamente exacto/);
 const wrongLateral=measureGap({x:0,y:0,h:0},{x:350,y:40,h:0},CATALOG);
 assert.equal(wrongLateral.problem,"lateral");
 assert.equal(wrongLateral.exact,false);
 assert.equal(wrongLateral.combination,null);
 assert.match(gapExplanation(wrongLateral),/Desfase lateral/);
 const wrongAngle=measureGap({x:0,y:0,h:0},{x:350,y:0,h:Math.PI/8},CATALOG);
 assert.equal(wrongAngle.problem,"angle");
 assert.equal(wrongAngle.exact,false);
 assert.equal(wrongAngle.combination,null);
 assert.match(gapExplanation(wrongAngle),/orientación/);
 const inbetween=measureGap({x:0,y:0,h:0},{x:348.5,y:0,h:0},CATALOG);
 assert.equal(inbetween.problem,"match","No confundir una aproximación con el ajuste exacto");
 assert.equal(inbetween.exact,false);
 assert.equal(inbetween.combination,null);
 assert.match(gapExplanation(inbetween),/no cierra matemáticamente exacto/);
 assert.equal(composeStraightDistance(348.5,CATALOG),null);
 const pairs=analyzeOpenEnds([{key:"uno",count:3,
  start:{x:337.5,y:0,h:0},end:{x:0,y:0,h:0}}],CATALOG);
 assert.equal(pairs.length,1);
 assert.equal(pairs[0].exact,true);
 console.log("SR-Precision DEV 0.9.7: escala modular, 80 longitudes componibles, equivalencias, óvalo, ocho y errores de ángulo/desfase — OK");
})().catch(e=>{console.error(e);process.exitCode=1;});
