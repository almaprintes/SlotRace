"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const {REAR_CONTACT,forwardGap,rearContact,followTarget,reentrySafe}=
  await import("../src/rear-contact.mjs");
 const base={playerDistance:1100,aiDistance:1030,total:9000,playerSpeed:500,aiSpeed:600};
 assert.equal(rearContact({...base,aiSpeed:560}).severity,"glance");
 assert.equal(rearContact({...base,aiSpeed:750}).severity,"bump");
 assert.equal(rearContact({...base,aiSpeed:990}).severity,"severe");
 assert.equal(rearContact({...base,aiSpeed:300}),null,"Detrás, pero frenando: no hay impacto");
 const playerHits={...base,playerDistance:1030,aiDistance:1100,aiSpeed:400,playerSpeed:900};
 assert.equal(rearContact(playerHits).rear,"player","También sanciona al jugador que golpea");
 assert.equal(rearContact({...base,aiDistance:2400}),null,"Carril sin proximidad");
 assert.equal(rearContact({...base,aiDistance:8920,playerDistance:15}).rear,"ai",
  "El alcance se detecta en la costura de salida/meta");
 assert.equal(forwardGap(8920,15,9000),95);
 assert.ok(followTarget(170,450,850)<850,"La IA reduce gas por el coche lento");
 assert.equal(followTarget(2000,450,850),850,"La IA acelera sin tráfico");
 assert.equal(followTarget(110,0,850),0,"Un coche parado bloquea la guía");
 assert.equal(reentrySafe(2000,2080,9000),false,"No reaparecer sobre el rival");
 assert.equal(reentrySafe(2000,2500,9000),true,"Reincorporación con hueco");
 assert.equal(REAR_CONTACT.severeRearPenalty>REAR_CONTACT.severeFrontPenalty,true);
 console.log("Alcances: roce, toque, choque fuerte, IA, órdenes inversos y reincorporación OK");
})().catch(e=>{console.error(e);process.exitCode=1});
