"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const p=await import("../src/physics-v4.mjs");
 const {defineCompetition,createClientIntent}=await import("../src/competition-protocol.mjs");
 const {createServerReferee,replayAsyncAttempt}=await import("../server/referee-core.mjs");
 const {canonicalCompetitionTrack}=await import("../server/track-identity.mjs");
 const {createSharedPhysicsEngineFactory,FIXED_STEP_MS}=await import("../server/physics-engine.mjs");
 const {STARTER}=await import("../src/track.mjs");
 assert.equal(p.PHYSICS_VERSION,"rear-physics-v4");
 assert.equal(FIXED_STEP_MS,10);
 assert.equal(p.DRIVE.topSpeed,1150);
 assert.equal(p.advanceSpeedV4(0,0,0.01),0);
 assert.ok(p.advanceSpeedV4(1000,0,0.01)>0,"El coche conserva inercia al soltar gatillo");
 assert.ok(p.advanceSpeedV4(0,1,0.01)>0);
 assert.throws(()=>p.advanceSpeedV4(500,1.1,.01),/inválida/);
 assert.throws(()=>p.advanceSpeedV4(500,.5,.2),/inválida/);
 assert.equal(p.curveStressEnvelope(.08),.08);
 assert.equal(p.curveStressEnvelope(.70),1);
 const curved={curve:1,radius:300};
 assert.equal(p.curveRadiusV4(curved,0),337.5);
 assert.equal(p.curveRadiusV4(curved,1),262.5);
 const before={carId:"gripline",speedMmS:1120,rearSlipMm:0,rearSlipVelocityMmS:0,
  pose:curved,logicalLane:1,curveProgress:.75,dtSec:.01};
 const a=p.advanceRearV4(before),b=p.advanceRearV4(before);
 assert.deepEqual(a,b,"La dinámica sin aleatoriedad es reproducible");
 assert.equal(before.rearSlipMm,0,"No se puede mutar el estado de origen");
 assert.ok(a.slipMm>0&&a.phase===.75&&a.limitMm>0);
 assert.equal(p.advanceRearV4({...before,pose:{curve:0}}).rearStress,0);
 // Sin piezas inventadas, mismo circuito independientemente del índice de
 // SALIDA/META. La dirección SÍ cambia la huella competitiva.
 const oval=STARTER.map((id,i)=>i===0?"START350":id);
 const r0=canonicalCompetitionTrack({types:oval});
 assert.equal(r0.canonical.types[0],"START350");
 const rotated=[...oval.slice(3),...oval.slice(0,3)];
 const rr=canonicalCompetitionTrack({types:rotated});
 assert.equal(r0.fingerprint,rr.fingerprint);
 assert.notEqual(r0.fingerprint,canonicalCompetitionTrack({types:oval,driveDirection:-1}).fingerprint);
 assert.throws(()=>canonicalCompetitionTrack({types:oval.map(id=>id==="START350"?"S350":id)}),/SALIDA/);
 assert.throws(()=>canonicalCompetitionTrack({types:oval,raisedParts:[1,1]}),/Elevaciones/);
 const {engineFactory,circuitFingerprint}=createSharedPhysicsEngineFactory({types:oval});
 assert.equal(circuitFingerprint,r0.fingerprint);
 const comp=defineCompetition({competitionId:"real-geometry-cup",format:"live_duel",
   circuitId:"oval-real",circuitRevision:"v1",circuitFingerprint,
   physicsVersion:p.PHYSICS_VERSION,targetLaps:2});
 const mk=(s)=>createServerReferee({competition:comp,sessionId:s,
   pilotA:"alice",pilotB:"bob",engineFactory,stepMs:10,minLapMs:20});
 const q=(sessionId,driverId,sequence,type,value=null)=>
   createClientIntent(comp,{sessionId,driverId,sequence,type,value});
 function runOne(sessionId){
   const ref=mk(sessionId);
   const events=[];
   for(const [id,seq,type,val] of [["alice",1,"ready",null],["bob",1,"ready",null],
     ["alice",2,"throttle",94],["bob",2,"throttle",94]]){
     assert.equal(ref.ingest(id,q(sessionId,id,seq,type,val)).accepted,true);
   }
   let guard=0;
   while(ref.view().status==="running"&&guard++<9000){
     ref.step();
   }
   assert.equal(ref.view().status,"heat-complete","Primera manga en trazado real");
   assert.equal(ref.view().laps.alice.length,2);
   assert.equal(ref.view().laps.bob.length,2);
   ref.nextHeat();
   for(const [id,seq,type,val] of [["alice",3,"ready",null],["bob",3,"ready",null],
     ["alice",4,"throttle",94],["bob",4,"throttle",94]]){
     assert.equal(ref.ingest(id,q(sessionId,id,seq,type,val)).accepted,true);
   }
   guard=0;
   while(ref.view().status==="running"&&guard++<9000)ref.step();
   assert.equal(ref.view().status,"completed-pending-certification");
   const result=ref.provisionalClassification();
   assert.equal(result.ready,true);
   assert.equal(result.official,false);
   assert.equal(result.classification.length,2);
   assert.ok(result.classification.every(x=>x.laneAHeats===1&&x.laneBHeats===1));
   return {results:ref.view().completedHeats,rank:result.classification,
     audit:ref.audit().filter(e=>e.kind==="server-crossing").map(e=>[e.heat,e.tick,e.driverId])};
 }
 const duel1=runOne("real-duel-a"),duel2=runOne("real-duel-b");
 assert.deepEqual(duel1,duel2,"Las mismas entradas producen EXACTAMENTE los mismos resultados");
 const engine=engineFactory({competition:comp,assignment:{laneA:"alice",laneB:"bob"},stepMs:10});
 assert.throws(()=>engine.step({tick:2,dtMs:10,controls:{alice:50}}),/Tick/);
 assert.throws(()=>engine.step({tick:1,dtMs:20,controls:{alice:50}}),/Tick/);
 assert.throws(()=>engine.step({tick:1,dtMs:10,controls:{alice:101}}),/inválida/);
 assert.throws(()=>engineFactory({competition:{...comp,circuit:{...comp.circuit,fingerprint:"0".repeat(64)}},pilot:"alice",stepMs:10}),/distintos/);
 const asyncComp=defineCompetition({competitionId:"real-asynchronous-cup",format:"async_time_trial",
   circuitId:"oval-real",circuitRevision:"v1",circuitFingerprint,
   physicsVersion:p.PHYSICS_VERSION,targetLaps:2});
 const solo=engineFactory({competition:asyncComp,pilot:"alice",stepMs:10});
 const inputs=[],finishes=[],limit=9000;
 for(let tick=1;tick<=limit&&finishes.length<2;tick++){
   const gas=94;inputs.push({tick,throttle:gas});
   const {crossings}=solo.step({tick,dtMs:10,controls:{alice:gas}});
   for(const crossing of crossings)
     finishes.push(Math.round(((tick-1+crossing.fraction)*10)*1000)/1000);
 }
 assert.equal(finishes.length,2,"Se han reproducido dos vueltas físicas sin reloj del cliente");
 const claimedLapTimes=[finishes[0],finishes[1]-finishes[0]];
 const attempt={attemptId:"replay-01",claimedDriverId:"alice",
   competitionId:asyncComp.competitionId,inputs,claimedLapTimes};
 const verdict=replayAsyncAttempt({competition:asyncComp,authenticatedDriverId:"alice",
   attempt,engineFactory,stepMs:10});
 assert.equal(verdict.status,"physics-replay-matches");
 assert.equal(verdict.official,false);
 assert.deepEqual(verdict.measuredLapTimes,claimedLapTimes);
 const cheating=replayAsyncAttempt({competition:asyncComp,authenticatedDriverId:"alice",
   attempt:{...attempt,claimedLapTimes:[1,2]},engineFactory,stepMs:10});
 assert.equal(cheating.status,"rejected-replay-mismatch");
 assert.equal(cheating.rewardEligible,false);
 const pt=[...oval];pt[1]="X350";
 assert.throws(()=>createSharedPhysicsEngineFactory({types:pt}),/PT\/82/);
 console.log("Shared rear-physics-v4: pure math, canonical tracks, 10ms duel, swapped heats, identical runs and replay OK");
})().catch(e=>{console.error(e);process.exitCode=1;});
