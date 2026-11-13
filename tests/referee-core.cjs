"use strict";
const assert = require("node:assert/strict");

(async()=>{
 const {defineCompetition,createClientIntent} = await import("../src/competition-protocol.mjs");
 const {createServerReferee,replayAsyncAttempt} = await import("../server/referee-core.mjs");
 const base = {competitionId:"islas-slot-cup-1",circuitId:"monaco-slot",
   circuitRevision:"rev-1",circuitFingerprint:"b".repeat(64),
   physicsVersion:"rear-physics-v4",targetLaps:2};
 const live = defineCompetition({...base,format:"live_duel"});
 const asyncCup = defineCompetition({...base,format:"async_time_trial"});
 // Engine fixture, not production physics. Server simulates distance on each
 // fixed tick, completely independent of numbers and time claimed by client.
 function fixtureEngine({competition,assignment}) {
   const progress = new Map();
   const entrants = [assignment?.laneA,assignment?.laneB].filter(Boolean);
   return {
     physicsVersion:competition.rules.physicsVersion,
     circuitFingerprint:competition.circuit.fingerprint,
     step({controls,dtMs}) {
       assert.equal(dtMs,20);
       const crossings=[];
       for(const pilot of entrants) {
         const next=(progress.get(pilot)||0)+(controls[pilot]||0)/100*0.5;
         if(next>=1) {progress.set(pilot,next-1);crossings.push(pilot);}
         else progress.set(pilot,next);
       }
       return {crossings};
     }
   };
 }
 const engineFactory = ({competition,assignment})=>fixtureEngine({competition,assignment});
 const ref = createServerReferee({competition:live,sessionId:"s-duel-1",
   pilotA:"alex",pilotB:"bea",engineFactory,stepMs:20,minLapMs:20});
 const intent=(pilot,sequence,type,value=null)=>
   createClientIntent(live,{sessionId:"s-duel-1",driverId:pilot,sequence,type,value});
 assert.equal(ref.view().status,"waiting-ready");
 assert.deepEqual(ref.view().assignment,{heat:1,laneA:"alex",laneB:"bea"});
 assert.equal(ref.ingest("alex",intent("alex",1,"ready")).accepted,true);
 assert.equal(ref.view().status,"waiting-ready");
 assert.throws(()=>ref.ingest("bea",intent("alex",2,"ready")),/manipulada/);
 assert.throws(()=>ref.ingest("intruso",intent("bea",1,"ready")),/no autorizado/);
 assert.throws(()=>ref.ingest("bea",{...intent("bea",1,"ready"),official:true}),/manipulada/);
 assert.equal(ref.ingest("bea",intent("bea",1,"ready")).accepted,true);
 assert.equal(ref.view().status,"running");
 assert.equal(ref.ingest("alex",intent("alex",2,"throttle",100)).accepted,true);
 assert.equal(ref.ingest("alex",intent("alex",2,"throttle",0)).reason,"duplicate-or-out-of-order");
 assert.equal(ref.ingest("bea",intent("bea",2,"throttle",100)).accepted,true);
 assert.equal(ref.ingest("bea",intent("bea",3,"pause_request")).reason,"competitive-pause-not-allowed");
 assert.throws(()=>ref.ingest("alex",{...intent("alex",3,"throttle",100),
   laps:[{time:1}]}),/manipulada/);
 assert.throws(()=>ref.ingest("alex",{...intent("alex",3,"throttle",100),
   value:1000}),/fuera de rango/);
 for(let i=0;i<4;i++)assert.equal(ref.step().accepted,true);
 assert.equal(ref.view().status,"heat-complete");
 assert.deepEqual(ref.view().laps.alex.map(l=>l.lapMs),[40,40]);
 assert.deepEqual(ref.view().laps.bea.map(l=>l.lane),["B","B"]);
 assert.equal(ref.provisionalClassification().ready,false);
 assert.equal(ref.ingest("alex",intent("alex",3,"throttle",100)).reason,"not-running");
 const next=ref.nextHeat();
 assert.equal(next.heat,2);
 assert.deepEqual(next.assignment,{heat:2,laneA:"bea",laneB:"alex"});
 assert.equal(ref.ingest("alex",intent("alex",3,"ready")).accepted,true);
 assert.equal(ref.ingest("bea",intent("bea",3,"ready")).accepted,true);
 assert.equal(ref.ingest("alex",intent("alex",4,"throttle",100)).accepted,true);
 assert.equal(ref.ingest("bea",intent("bea",4,"throttle",100)).accepted,true);
 for(let i=0;i<4;i++)ref.step();
 assert.equal(ref.view().status,"completed-pending-certification");
 assert.equal(ref.view().completedHeats.length,2);
 assert.deepEqual(ref.view().completedHeats[1].laps.bea.map(l=>l.lane),["A","A"]);
 const score=ref.provisionalClassification();
 assert.equal(score.ready,true);
 assert.equal(score.official,false);
 assert.equal(score.classification.length,2);
 assert.equal(score.classification[0].totalMs,160);
 assert.equal(score.classification[0].laneAHeats,1);
 assert.equal(score.classification[1].laneBHeats,1);
 assert.equal(ref.step().reason,"heat-not-running");
 assert.throws(()=>ref.nextHeat(),/primera manga/);
 const log=ref.audit();
 assert.ok(log.find(e=>e.kind==="heat-swap"));
 assert.equal(log.filter(e=>e.kind==="server-crossing").length,8);
 // A server adapter with different geometry or physics cannot arbitrate.
 assert.throws(()=>createServerReferee({competition:live,sessionId:"s-bad",
   pilotA:"alex",pilotB:"bea",engineFactory:()=>({
     physicsVersion:"different",circuitFingerprint:base.circuitFingerprint,step:()=>({crossings:[]})
   })}),/físicas/);
 // An impossible finish or malfunctioning engine requires review and no score.
 const bad=createServerReferee({competition:live,sessionId:"s-bad-2",
   pilotA:"alex",pilotB:"bea",minLapMs:200,
   engineFactory:({competition})=>({
     physicsVersion:competition.rules.physicsVersion,
     circuitFingerprint:competition.circuit.fingerprint,
     step:()=>({crossings:["alex"]})
   })});
 bad.ingest("alex",createClientIntent(live,{sessionId:"s-bad-2",driverId:"alex",sequence:1,type:"ready"}));
 bad.ingest("bea",createClientIntent(live,{sessionId:"s-bad-2",driverId:"bea",sequence:1,type:"ready"}));
 assert.equal(bad.step().reason,"engine-validation-failed");
 assert.equal(bad.view().status,"needs-review");
 assert.equal(bad.provisionalClassification().official,false);
 const soloFactory=({competition,pilot})=>fixtureEngine({competition,
   assignment:{laneA:pilot,laneB:null}});
 const inputs=Array.from({length:4},(_,i)=>({tick:i+1,throttle:100}));
 const attempt={attemptId:"attempt-1",claimedDriverId:"alex",
   competitionId:asyncCup.competitionId,inputs,claimedLapTimes:[40,40]};
 const valid=replayAsyncAttempt({competition:asyncCup,authenticatedDriverId:"alex",
   attempt,engineFactory:soloFactory});
 assert.equal(valid.status,"physics-replay-matches");
 assert.deepEqual(valid.measuredLapTimes,[40,40]);
 assert.equal(valid.official,false);
 assert.equal(valid.rewardEligible,false);
 const altered=replayAsyncAttempt({competition:asyncCup,authenticatedDriverId:"alex",
   attempt:{...attempt,claimedLapTimes:[1,1]},engineFactory:soloFactory});
 assert.equal(altered.status,"rejected-replay-mismatch");
 assert.deepEqual(altered.measuredLapTimes,[40,40]);
 assert.throws(()=>replayAsyncAttempt({competition:asyncCup,
   authenticatedDriverId:"bea",attempt,engineFactory:soloFactory}),/ajeno/);
 assert.throws(()=>replayAsyncAttempt({competition:asyncCup,
   authenticatedDriverId:"alex",attempt:{...attempt,inputs:[
     {tick:1,throttle:100},{tick:3,throttle:100}]},engineFactory:soloFactory}),/Secuencia/);
 assert.throws(()=>replayAsyncAttempt({competition:asyncCup,
   authenticatedDriverId:"alex",attempt:{...attempt,inputs:inputs.map((f,i)=>
      i===3?{...f,throttle:101}:f)},engineFactory:soloFactory}),/Secuencia/);
 assert.throws(()=>replayAsyncAttempt({competition:asyncCup,
   authenticatedDriverId:"alex",attempt:{...attempt,official:true},
   engineFactory:soloFactory}),/malformado/);
 console.log("SlotRace referee: 2 mangas, carriles, replay, anti-resultados falsos, identidad y revisión OK");
})().catch(e=>{console.error(e);process.exitCode=1});
