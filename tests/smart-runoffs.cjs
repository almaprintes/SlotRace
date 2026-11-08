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
 assert.equal(right[0].innerEdge.length,right[0].outerEdge.length);
 assert.equal(right[0].lipPoints.length,right[0].points.length);
 assert.equal(right[0].effectiveWidths[0],0,"El hombro nace pegado a la vía");
 assert.equal(right[0].effectiveWidths.at(-1),0,
  "El hombro termina sin un círculo redondo");
 const peak=right[0].width;
 assert.ok(right[0].effectiveWidths.filter(w=>w>=peak*.95).length>=3,
  "El contorno exterior mantiene una meseta, no una gota ovalada");
 assert.ok(right[0].effectiveWidths[3]<peak*.99,
  "La entrada crece gradualmente, sin aparición de una mancha");
 const approachPiece=g.buildTrack(["S350","R1_90R"]);
 assert.ok(right[0].innerEdge[0].x<approachPiece.parts[1].start.x-10,
  "La escapatoria arranca en la recta anterior para integrarse con el asfalto");
 const withExit=buildSmartRunoffs(make(["S350","R1_90R","S175"]));
 assert.ok(withExit[0].innerEdge.at(-1).y>make(["S350","R1_90R"]).parts[1].end.y+10,
  "La escapatoria se desvanece a lo largo de la recta de salida");

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
 const adapted=buildSmartRunoffs(blocked);
 assert.ok(adapted.length<=1);
 if(adapted.length){
  assert.ok(adapted[0].effectiveWidths.some((w,i)=>
   w<right[0].effectiveWidths[i]-1),
   "Se deforma localmente antes que tapar la vía vecina");
 }
 // También se comprueba el borde interior del tapete de carrera.
 const xMin=Math.min(...right[0].outerEdge.map(p=>p.x)),
  xMax=Math.max(...right[0].outerEdge.map(p=>p.x)),
  yMin=Math.min(...right[0].outerEdge.map(p=>p.y)),
  yMax=Math.max(...right[0].outerEdge.map(p=>p.y));
 const board={left:xMin-120,right:xMax+120,top:yMin-20,bottom:yMax+120};
 const boardZones=buildSmartRunoffs(make(["S350","R1_90R"]),1,board);
 const insetX=62*(board.right-board.left)/g.TABLE.width+10;
 const insetY=62*(board.bottom-board.top)/g.TABLE.height+10;
 for(const zone of boardZones)for(const p of zone.outerEdge)
  if(zone.effectiveWidths[zone.outerEdge.indexOf(p)]>
      RUNOFF_STYLE.rimOffset-RUNOFF_STYLE.innerOffset+1e-5){
   assert.ok(p.x>=board.left+insetX-.1&&p.x<=board.right-insetX+.1);
   assert.ok(p.y>=board.top+insetY-.1&&p.y<=board.bottom-insetY+.1,
    "La escapatoria no puede pintar sobre el marco de madera");
  }


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
 assert.match(app,/RUNOFF_STYLE\.lip/,"El acabado incluye un labio integrado");
 assert.match(app,/cached\.runs\.set\(dir,\{zones,fill,lip,rim\}\)/,
  "La caché separa ambos sentidos de marcha");
 assert.match(app,/boardKey=/,"La caché se actualiza si cambia la mesa");
 console.log("SlotRace: escapatorias inteligentes R1/R2, sentido inverso, curvas enlazadas, puentes, obstáculos y caché — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
