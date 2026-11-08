"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
 const g=await import("../src/track.mjs");
 const {buildSmartRunoffs,RUNOFF_STYLE}=await import("../src/runoffs.mjs");
 const make=(types,raised=[])=>g.buildTrack(types,g.START,raised);
 assert.equal(buildSmartRunoffs(make(["S175","R1_90R"])).length,0,
  "Sin recta larga no hay escapatoria");
 assert.equal(buildSmartRunoffs(make(["S350","R2_90R"])).length,0,
  "R2 necesita >= 600 mm");
 assert.equal(buildSmartRunoffs(make(["S600","R3_90R"])).length,0,
  "R3 no lleva escapatoria");
 assert.equal(buildSmartRunoffs(make(["S600","R4_90R"])).length,0,
  "R4 no lleva escapatoria");
 const right=buildSmartRunoffs(make(["S350","R1_90R"]));
 assert.equal(right.length,1,"R1 a la derecha tras 350 mm");
 assert.equal(right[0].entryIndex,1);
 assert.equal(right[0].approachMm,350);
 assert.equal(right[0].side,-1,"La escapatoria va en el exterior derecho (lado izquierdo)");
 assert.equal(right[0].direction,1);
 assert.ok(right[0].points.length>8&&right[0].outerEdge.length>6);
 assert.ok(right[0].points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 const left=buildSmartRunoffs(make(["S600","R2_90L"]));
 assert.equal(left.length,1,"R2 izquierda tras 600 mm");
 assert.equal(left[0].side,1,"Exterior físico del giro a la izquierda");
 assert.ok(left[0].width<=RUNOFF_STYLE.R2.width);
 const connected=buildSmartRunoffs(make(["S175","S175","R1_45R","R1_45R"]));
 assert.equal(connected.length,1,"Dos curvas consecutivas forman una sola escapatoria");
 assert.deepEqual(connected[0].pieceIndices,[2,3]);
 assert.equal(connected[0].approachMm,350,"Se suman todas las rectas consecutivas");
 assert.equal(buildSmartRunoffs(make(["R1_90R","S600"]),1).length,0,
  "En sentido normal la recta va DESPUÉS de la curva");
 const reversed=buildSmartRunoffs(make(["R1_90R","S600"]),-1);
 assert.equal(reversed.length,1,"Al invertir el sentido, la recta precede a la curva");
 assert.equal(reversed[0].side,-1,"La escapatoria mantiene el exterior físico");
 assert.equal(reversed[0].direction,-1);
 const elevated=make(["S600","R1_90R"]);
 elevated.elevation.profiles[1]={mode:"level",z:65};
 assert.equal(buildSmartRunoffs(elevated).length,0,"No invadir rampas ni puentes");

 // Obstáculo de pista no adyacente dentro de la escapatoria: se omite
 // automáticamente, en lugar de atravesar la vía con césped.
 const blocked=make(["S350","R1_90R"]);
 const midpoint=right[0].outerEdge[Math.floor(right[0].outerEdge.length/2)];
 const far={id:"S350",index:2,points:[
  {x:9999,y:9999},{x:10099,y:9999}]};
 const obstacle={id:"S350",index:3,points:[
  {x:midpoint.x-100,y:midpoint.y},{x:midpoint.x+100,y:midpoint.y}]};
 blocked.parts.push(far,obstacle);
 assert.equal(buildSmartRunoffs(blocked).length,0,
  "No dibujar escapatoria cuando otra pista ocupa la zona exterior");

 const oval=make(g.STARTER);
 const ovalRunoffs=buildSmartRunoffs(oval);
 assert.ok(ovalRunoffs.length>=1,"La receta ovalada recibe escapatorias");
 assert.deepEqual(oval.types,g.STARTER,"No cambia la receta del circuito");
 const app=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8");
 const painting=app.slice(app.indexOf("function renderScene("),
  app.indexOf("function screenToWorld("));
 assert.match(app,/const runoffGeometryCache=new WeakMap\(\)/,
  "Los Path2D de escapatorias se cachean por pista");
 assert.match(painting,/paintGrid\(ctx,v,mode\);[\s\S]*?paintSmartRunoffs\(ctx,track,state.driveDirection\);[\s\S]*?paintGroundTrack\(ctx,track/,
  "La zona verde va bajo el asfalto, los raíles y los pianos");
 assert.match(app,/cached\.set\(dir,\{zones,fill,rim\}\)/,
  "La caché separa ambos sentidos de marcha");
 console.log("SlotRace: escapatorias inteligentes R1/R2, sentido inverso, curvas enlazadas, puentes, obstáculos y caché — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
