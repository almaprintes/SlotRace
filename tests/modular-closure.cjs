"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const {PARTS,GEOMETRY,RADII,trace}=await import("../src/pt-precision.mjs");
 const {CATALOG,START,STARTER,FIGURE_EIGHT,buildTrack,
  findLegalClosure,findStraightRebalance}=await import("../src/track.mjs");
 const {measureGap,composeStraightDistance,gapExplanation,analyzeOpenEnds}=
  await import("../src/gap-analysis.mjs");
 const unit=GEOMETRY.lengthUnit;
 assert.equal(unit,12.5);
 assert.equal(GEOMETRY.radiusStep,12*unit);
 for(const [id,p] of Object.entries(PARTS))
  if(p.length)assert.ok(Number.isInteger(p.length/unit),id);
 for(const [id,rad] of Object.entries(RADII))
  assert.equal(rad/unit,Math.round(rad/unit),"Radio modular "+id);
 const active=Object.keys(CATALOG).filter(id=>CATALOG[id].length&&
  !CATALOG[id].legacy&&id!=="START350"&&!CATALOG[id].laneChanger);
 assert.deepEqual(active,["S075","S0875","S175","S350","S600"]);
 assert.equal(CATALOG.S0125.legacy,true);
 function samePoint(a,b){
  assert.ok(Math.hypot(a.end.x-b.end.x,a.end.y-b.end.y)<1e-8);
  assert.ok(Math.abs(a.end.h-b.end.h)<1e-10);
 }
 samePoint(trace(["S350"]),trace(["S175","S175"]));
 samePoint(trace(["S350"]),trace(Array(4).fill("S0875")));
 samePoint(trace(["S600"]),trace(["S350","S175","S075"]));
 samePoint(trace(["S600"]),trace(Array(8).fill("S075")));
 samePoint(trace(Array(2).fill("R2_225R")),trace(["R2_45R"]));
 samePoint(trace(Array(4).fill("R1_225R")),trace(["R1_90R"]));
 assert.equal(buildTrack(STARTER).valid,true);
 assert.equal(buildTrack(FIGURE_EIGHT).valid,true);
 // Ya no se pueden construir huecos de 12,5 ni 25 mm sólo sumando
 // longitudes físicas del catálogo: la sustracción se hace cambiando
 // las rectas de un tramo existente, nunca creando un micro-módulo.
 assert.equal(composeStraightDistance(12.5,CATALOG),null);
 assert.equal(composeStraightDistance(25,CATALOG),null);
 const sizes=[75,87.5,175,350,600];
 for(const length of sizes){
  const fill=composeStraightDistance(length,CATALOG);
  assert.ok(fill,"Recta existente "+length);
  assert.equal(fill.count,1);
  assert.equal(fill.length,length);
  assert.ok(fill.ids.every(id=>!CATALOG[id].legacy));
 }
 // 337,5 = 175 + 87,5 + 75, con piezas reales y sin estirar nada.
 const fit=measureGap({x:0,y:0,h:0},{x:337.5,y:0,h:0},CATALOG);
 assert.equal(fit.problem,"composition");
 assert.equal(fit.exact,true);
 assert.equal(fit.combination.length,337.5);
 assert.equal(fit.combination.count,3);
 assert.match(gapExplanation(fit),/Combinación:.*cierre matemáticamente exacto/);
 // Un óvalo desequilibrado por 12,5 mm se cierra intercambiando
 // únicamente una recta 75 por otra de 87,5.
 const one=["S075",...Array(4).fill("R2_45R"),
  "S0875",...Array(4).fill("R2_45R")];
 const first=buildTrack(one,START);
 assert.equal(first.closed,false);
 assert.ok(Math.abs(first.gap-12.5)<1e-7);
 const repair=findStraightRebalance(one,{origin:START});
 assert.equal(repair.ok,true);
 assert.equal(repair.rebalanced,true);
 assert.equal(repair.replaced,1);
 assert.equal(repair.added,0);
 assert.ok(repair.changes.every(change=>
  Math.abs(change.delta)===12.5));
 assert.equal(buildTrack(repair.types,START).valid,true);
 assert.ok(!repair.types.includes("S0125"));
 const closed=findLegalClosure(one,{origin:START});
 assert.equal(closed.ok,true);
 assert.equal(closed.rebalanced,true,"Prioriza cambiar rectas antes que añadir piezas");
 assert.equal(closed.added,0);
 assert.equal(buildTrack(closed.types,START).valid,true);
 // Dos compensaciones de 12,5 suman una corrección de 25 mm sin
 // introducir piezas miniatura.
 const two=["S075","S075",...Array(4).fill("R2_45R"),
  "S0875","S0875",...Array(4).fill("R2_45R")];
 const double=findStraightRebalance(two,{origin:START});
 assert.equal(double.ok,true);
 assert.equal(double.replaced,2);
 assert.equal(double.added,0);
 assert.equal(buildTrack(double.types,START).valid,true);
 // Las uniones incorrectas no se declaran válidas por proximidad.
 const lateral=measureGap({x:0,y:0,h:0},{x:350,y:40,h:0},CATALOG);
 assert.equal(lateral.problem,"lateral");
 assert.equal(lateral.exact,false);
 assert.equal(lateral.combination,null);
 assert.match(gapExplanation(lateral),/Desfase lateral/);
 const angle=measureGap({x:0,y:0,h:0},{x:350,y:0,h:Math.PI/8},CATALOG);
 assert.equal(angle.problem,"angle");assert.equal(angle.exact,false);
 assert.match(gapExplanation(angle),/orientación/);
 const inbetween=measureGap({x:0,y:0,h:0},{x:348.5,y:0,h:0},CATALOG);
 assert.equal(inbetween.problem,"match");
 assert.equal(inbetween.exact,false);
 assert.equal(composeStraightDistance(348.5,CATALOG),null);
 assert.match(gapExplanation(inbetween),/no cierra matemáticamente exacto/);
 const pairs=analyzeOpenEnds([{key:"uno",count:3,
  start:{x:337.5,y:0,h:0},end:{x:0,y:0,h:0}}],CATALOG);
 assert.equal(pairs.length,1);
 assert.equal(pairs[0].exact,true);
 // Los planos existentes con módulo de 12,5 siguen reconocidos.
 const legacy=buildTrack(["S350","S0125",...Array(4).fill("R2_45R"),
  "S350","S0125",...Array(4).fill("R2_45R")],START);
 assert.equal(legacy.valid,true);
 console.log("SR-Precision: cinco rectas visibles, compensación exacta 12,5/25 mm y legado compatible — OK");
})().catch(e=>{console.error(e);process.exitCode=1;});
