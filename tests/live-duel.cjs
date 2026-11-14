const assert=require("node:assert/strict");
(async()=>{
 const {LIVE_LAPS,LIVE_TYPES,LIVE_TRACK,roomCode,laneFor,makeCar,advanceCar,lapTotal}=await import("../src/live-duel-core.mjs");
 assert.equal(LIVE_LAPS,3);assert.equal(LIVE_TYPES.filter(t=>t==="START350").length,1);
 assert.equal(LIVE_TRACK.valid,true,"El ovalo de prueba debe cerrar");
 assert.equal(LIVE_TRACK.lanes.length,2);
 assert.equal(laneFor("host",1),0);assert.equal(laneFor("guest",1),1);
 assert.equal(laneFor("host",2),1);assert.equal(laneFor("guest",2),0);
 assert.equal(roomCode(Uint8Array.from([0,1,2,3,4,5,6])), "ABCDEFG");
 assert.equal(lapTotal([1,2,3]),6);assert.equal(lapTotal([1,2]),null);
 const car=makeCar(0);car.gas=.15;for(let i=0;i<240;i++)advanceCar(car,1/60);
 assert(car.distance>0,"El coche debe avanzar con el gatillo");
 assert.equal(car.lapTimes.length,0,"No debe contar vueltas falsas");
 const stopped=makeCar(1);advanceCar(stopped,1/60);assert.equal(stopped.distance,0);
 console.log("OK - beta multijugador: ovalo, carriles, control, vueltas y sala");
})().catch(e=>{console.error(e);process.exitCode=1});
