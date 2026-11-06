"use strict";
const assert=require("node:assert/strict");

(async()=>{
 const geo=await import("../src/track.mjs");
 const types=["S350","R2_45R","R2_45R","S350"];
 const flat=geo.buildTrack(types);
 const raised=geo.buildTrack(types,geo.START,[1,2]);
 const height=(index,t)=>geo.elevationAt(raised,index,t);
 assert.deepEqual(raised.elevation.selected,[1,2],
  "Ambas curvas forman una única plataforma elevada");
 assert.equal(raised.elevation.runs.length,1,
  "Un puente puede incluir varias curvas consecutivas");
 assert.equal(raised.elevation.valid,true,"La subida y la bajada caben en dos rectas");
 assert.deepEqual(raised.elevation.profiles.map(p=>p.mode),
  ["up","plateau","plateau","down"]);
 assert.equal(height(0,0),0);
 assert.equal(height(0,1),65);
 assert.equal(height(1,0),65);
 assert.equal(height(1,.5),65);
 assert.equal(height(1,1),65);
 assert.equal(height(2,0),65);
 assert.equal(height(2,.5),65);
 assert.equal(height(2,1),65);
 assert.equal(height(3,0),65);
 assert.equal(height(3,1),0);
 assert.equal(height(0,.5),32.5,"Rampa suave de elevación");
 assert.equal(height(3,.5),32.5,"Descenso continuo");
 assert.equal(geo.carTrackLevel(raised,{pieceIndex:1,pieceT:.5}),"upper");
 assert.equal(geo.carTrackLevel(raised,{pieceIndex:2,pieceT:.5}),"upper");
 assert.equal(geo.carTrackLevel(raised,{pieceIndex:3,pieceT:1}),"lower");
 assert.equal(flat.parts[2].end.x,raised.parts[2].end.x);
 assert.equal(flat.parts[2].end.y,raised.parts[2].end.y);
 assert.equal(flat.length,raised.length,
  "Elevar no altera ni las piezas ni la distancia de carrera");
 const invalid=geo.buildTrack(["R2_45R","R2_45R","S350"],geo.START,[1]);
 assert.equal(invalid.elevation.valid,false,
  "No se permite un salto de altura de 65 mm contra una curva sin rampa");
 assert.match(invalid.elevation.errors.join(" "),/al menos 350 mm/);
 const broad=geo.buildTrack(["R2_90R","R3_90R","R2_90R"],geo.START,[1]);
 assert.equal(broad.elevation.valid,true,
  "Una curva de 90° de radio grande puede hacer de rampa sin recta adicional");
 assert.deepEqual(broad.elevation.profiles.map(p=>p.mode),
  ["up","plateau","down"]);
 assert.equal(geo.elevationAt(broad,0,0),0);
 assert.equal(geo.elevationAt(broad,0,1),65);
 assert.equal(geo.elevationAt(broad,1,.5),65);
 assert.equal(geo.elevationAt(broad,2,1),0);
 const tooShort=geo.buildTrack(["R1_45R","R1_45R","R1_45R"],geo.START,[1]);
 assert.equal(tooShort.elevation.valid,false,
  "Las curvas estrechas/cortas no soportan una subida de 65 mm sin transición");

 const rotated=[...geo.FIGURE_EIGHT.slice(7),...geo.FIGURE_EIGHT.slice(0,7)];
 const ground=geo.buildTrack(rotated);
 const bridge=geo.buildTrack(rotated,geo.START,[0]);
 assert.equal(ground.valid,false,"Un cruce al mismo nivel es inválido");
 assert.equal(bridge.valid,true,"El kit clásico sigue siendo válido");
 assert.equal(bridge.bridge.crossings.length,1);
 assert.equal(bridge.bridge.crossings[0].clearance,65);
 assert.equal(bridge.bridge.crossings[0].upper,0);
 console.log("SlotRace DEV 0.14.28: curvas elevadas, rampas C1, validación de cruces y compatibilidad — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
