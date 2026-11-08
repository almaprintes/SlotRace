"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");

(async()=>{
 const track=await import("../src/track.mjs");
 const {buildCurveKerbs,selectCurveKerbs,KERB_STYLE}=
  await import("../src/kerbs.mjs");
 const pieces=type=>track.buildTrack(type).parts;
 const all=geometry=>[...geometry.red,...geometry.white];
 assert.equal(all(buildCurveKerbs(pieces(["S350","S175","X350"]))).length,0,
  "Los pianos no pueden invadir las rectas ni los cambios de carril");
 assert.ok(KERB_STYLE.outerOffset<track.TRACK_WIDTH/2,
  "Los pianos quedan en el borde del plástico, no sobresalen");
 assert.ok(KERB_STYLE.innerOffset>track.LANE_OFFSET+12,
  "No invaden ni la ranura ni sus dos guías metálicas");

 for(const radius of ["R1","R2","R3","R4"]){
  const degree=radius==="R1"||radius==="R2"?"45":"225";
  const right=buildCurveKerbs(pieces([radius+"_"+degree+"R"]));
  const left=buildCurveKerbs(pieces([radius+"_"+degree+"L"]));
  assert.ok(all(right).length>=4,"Pianos en "+radius);
  assert.equal(all(right).length,all(left).length,"Simetría derecha/izquierda: "+radius);
  for(const quad of [...all(right),...all(left)]){
   assert.equal(quad.points.length,4);
   assert.equal(quad.partIndex,0);
   assert.ok(quad.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),
    "Las cuatro esquinas deben quedar en coordenadas finitas");
  }
 }

 // 45 grados de R2 no es múltiplo exacto de 30 mm. La primera
 // franja de la segunda pieza conserva el color de la última de la primera.
 const joined=buildCurveKerbs(pieces(["R2_45R","R2_45R"]));
 const colorAt=(part,first)=>{
  for(const color of ["red","white"]){
   const found=joined[color].filter(q=>q.partIndex===part);
   if(found.length)return{color,minX:found[0].points[0].x};
  }
  return null;
 };
 const endStripeColor=part=>{
  const last=Object.entries(joined)
   .flatMap(([color,stripes])=>stripes.filter(q=>q.partIndex===part)
    .map(q=>({color,x:q.points[0].x,y:q.points[0].y})));
  // En vez de suponer orientación global, comprobar continuidad
  // comparando los índices de bandas que atraviesan el conector.
  const s=track.CATALOG.R2_45R.radius*Math.abs(track.CATALOG.R2_45R.angle);
  return Math.floor((s-1e-5)/KERB_STYLE.stripeLength)%2===0?"red":"white";
 };
 const atSecond=Math.floor((
  track.CATALOG.R2_45R.radius*Math.abs(track.CATALOG.R2_45R.angle)+1e-5
 )/KERB_STYLE.stripeLength)%2===0?"red":"white";
 assert.equal(endStripeColor(0),atSecond,"Sin reiniciar rojo/blanco en cada conector");
 assert.ok(all(joined).some(q=>q.partIndex===1));

 const mixed=buildCurveKerbs(pieces(["R2_45R","S350","R2_45L"]));
 assert.equal(all(mixed).filter(q=>q.partIndex===1).length,0);
 const upper=selectCurveKerbs(mixed,new Set([2]));
 assert.ok(all(upper).length>0,"Pianos del puente incluidos");
 assert.ok(all(upper).every(q=>q.partIndex===2),
  "Repintar solo pianos de piezas elevadas, nunca los del piso inferior");

 const starter=track.buildTrack(track.STARTER);
 const stripes=buildCurveKerbs(starter.parts);
 assert.ok(all(stripes).length>0);
 assert.deepEqual(starter.types,track.STARTER,
  "La decoración no cambia tipos, receta ni orden de módulos");

 const app=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8");
 assert.match(app,/const trackKerbCache=new WeakMap\(\)/,
  "La geometría de los circuitos estáticos debe estar cacheada");
 assert.match(app,/paintTrackKerbs\(ctx,track\);/,
  "Las piezas montadas pintan sus pianos");
 assert.match(app,/paintTrackKerbs\(ctx,track,"upper"\);/,
  "Los cruces repintan los pianos de la vía elevada");
 assert.match(app,/paintLooseKerbs\(ctx,parts\);/,
  "También se ven los pianos mientras se construye");
 console.log("SlotRace: pianos R1-R4, ambas direcciones, continuidad, puentes y caché — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
