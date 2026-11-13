"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const {REAR_CONTACT,forwardGap,rearContact,sweptRearContact,placeRearBehind,followTarget,reentrySafe}=
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

 // Antes: un adelantamiento entre dos fotogramas podía atravesar al coche
 // de delante porque el detector sólo miraba el estado FINAL.
 const quick={playerStart:100,aiStart:215,playerTravel:62,aiTravel:8,
  total:9000,playerSpeed:1240,aiSpeed:160};
 const impact=sweptRearContact(quick);
 assert.equal(impact.rear,"player");
 assert.equal(impact.severity,"severe");
 assert.ok(impact.fraction>0&&impact.fraction<1,"Colisión dentro del fotograma");
 const frontEnd=quick.aiStart+quick.aiTravel;
 assert.equal(placeRearBehind(frontEnd,9000,98),frontEnd-100,
  "El coche perseguidor queda separado del delantero");
 // Se detecta también cuando ya hay una ligera invasión de carrocerías,
 // incluso si el último fotograma no conserva el orden.
 const gentle=sweptRearContact({playerStart:100,aiStart:194,
  playerTravel:13,aiTravel:10,total:9000,playerSpeed:400,aiSpeed:350});
 assert.equal(gentle?.severity,"glance");
 assert.equal(gentle.fraction,0);
 assert.equal(sweptRearContact({...quick,playerTravel:8,aiTravel:62}),null,
  "Si la distancia aumenta, no hay impacto");
 assert.equal(sweptRearContact({...quick,aiStart:1300}),null,
  "Sin proximidad no se genera choque fantasma");
 assert.equal(sweptRearContact({...quick,playerStart:8880,aiStart:30}).rear,
  "player","El detector contempla la costura de meta");
 assert.equal(sweptRearContact({...quick,playerStart:100,aiStart:215,
  playerSpeed:160,aiSpeed:1240}),null,"La rapidez final debe confirmar el alcance");
 const aiHit=sweptRearContact({playerStart:215,aiStart:100,
  playerTravel:8,aiTravel:62,total:9000,playerSpeed:160,aiSpeed:1240});
 assert.equal(aiHit.rear,"ai","Funciona en ambos sentidos del alcance");
 assert.equal(placeRearBehind(25,9000,98),8925,
  "El coche se coloca detrás incluso a través de salida/meta");
 console.log("Alcances: roce, toque, choque fuerte, IA, órdenes inversos y reincorporación OK");
})().catch(e=>{console.error(e);process.exitCode=1});
