"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const {buildTrack,STARTER,FIGURE_EIGHT,CATALOG,circuitWinding,
  travelDirectionLabel,directionFromPreference,preferenceFromDirection}=
  await import("../src/track.mjs");
 const {buildRecipe}=await import("../src/blueprint.mjs");
 const monaco=JSON.parse(fs.readFileSync("tests/fixtures/monaco-slot.json","utf8"));
 assert.equal(monaco.types.length,59,"Se prueba exactamente el montaje aportado de Mónaco");
 const monacoTrack=buildTrack(monaco.types,monaco.origin);
 assert.equal(monacoTrack.closed,true,"Mónaco cierra con flexión permitida");
 assert.equal(circuitWinding(monaco.types),-1,"Las piezas de Mónaco giran 360° a izquierdas");
 assert.equal(travelDirectionLabel(monaco.types,-1),"Horario",
  "El -1 histórico del archivo es conducción HORARIA real");
 assert.equal(travelDirectionLabel(monaco.types,1),"Antihorario");
 assert.equal(directionFromPreference(monaco.types,1),-1,
  "Al elegir Horario en Mónaco, el motor invierte su montaje");
 assert.equal(preferenceFromDirection(monaco.types,-1),1);
 const recipe=buildRecipe(monaco.types,CATALOG,[],[],monaco.direction,
  travelDirectionLabel(monaco.types,monaco.direction));
 assert.equal(recipe.direction,-1,"No invertir archivos ni récords históricos");
 assert.equal(recipe.directionLabel,"HORARIO");
 const signedArea=points=>points.slice(1).reduce((sum,p,i)=>
  sum+(points[i].x*p.y-p.x*points[i].y),0)/2;
 assert.ok(signedArea(monacoTrack.points)<0,
  "La geometría proyectada de Mónaco corrobora giro contrario al reloj en el montaje");
 const app=fs.readFileSync("src/app.mjs","utf8");
 const m=app.match(/const CATALUNYA_SLOT_TYPES=Object\.freeze\((\[[^\n]+\])\)/);
 assert.ok(m,"El catálogo incluye Catalunya Slot");
 const catalunya=JSON.parse(m[1]);
 const catTrack=buildTrack(catalunya,{x:-774.9121317783404,y:-621.1758796080073,h:Math.PI/2});
 assert.equal(catTrack.closed,true);
 assert.equal(circuitWinding(catalunya),-1,"Catalunya también se monta en antihorario");
 assert.ok(signedArea(catTrack.points)<0);
 assert.equal(directionFromPreference(catalunya,1),-1,"Catalunya nuevo arranca en horario");
 assert.match(app,/types:CATALUNYA_SLOT_TYPES,origin:CATALUNYA_SLOT_ORIGIN,direction:-1/,
  "La receta de catálogo usa el avance correcto, sin editar piezas");
 const oval=buildTrack(STARTER);
 assert.equal(oval.closed,true);
 assert.equal(circuitWinding(STARTER),1);
 assert.ok(signedArea(oval.points)>0);
 assert.equal(directionFromPreference(STARTER,1),1,"El óvalo no debe invertirse");
 assert.equal(travelDirectionLabel(STARTER,1),"Horario");
 assert.equal(circuitWinding(FIGURE_EIGHT),0,"El ocho tiene dos lóbulos de sentido contrario");
 assert.equal(travelDirectionLabel(FIGURE_EIGHT,1),"Mixto · original");
 assert.equal(travelDirectionLabel(FIGURE_EIGHT,-1),"Mixto · inverso");
 assert.equal(travelDirectionLabel([],1,false),"Horario","La selección previa a construir sigue disponible");
 assert.equal(directionFromPreference([],1),1);
 assert.match(app,/pendingDesiredDirection:state\.pendingDesiredDirection/,
  "El sentido elegido antes de construir sobrevive a cerrar y reabrir la PWA");
 console.log("Orientaciones Mónaco, Catalunya, Óvalo y Ocho: correctas; partidas antiguas intactas.");
})().catch(error=>{console.error(error);process.exitCode=1});
