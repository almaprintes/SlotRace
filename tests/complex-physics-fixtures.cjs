"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const g=await import("../src/track.mjs");
 const {defineCompetition,createClientIntent}=await import("../src/competition-protocol.mjs");
 const {createServerReferee}=await import("../server/referee-core.mjs");
 const {createSharedPhysicsEngineFactory}=await import("../server/physics-engine.mjs");
 const {chooseAiThrottleOnTrackV4}=await import("../src/ai-driver.mjs");
 const {PHYSICS_VERSION}=await import("../src/physics-v4.mjs");
 const monaco=JSON.parse(fs.readFileSync("tests/fixtures/monaco-slot.json"));
 const doubleOval=JSON.parse(fs.readFileSync("tests/fixtures/doble-ovalo.json"));
 const app=fs.readFileSync("src/app.mjs","utf8");
 const m=app.match(/const CATALUNYA_SLOT_TYPES=Object\.freeze\((\[[\s\S]*?\])\);/);
 assert.ok(m,"Catalunya debe existir en el código de la app");
 const catalunya=JSON.parse(m[1]);
 const withStart=types=>types.map((id,i)=>i===types.indexOf("S350")?"START350":id);
 // Historical files without START350 are read-only. The testing copies are
 // adapted in memory without writing to users' circuits or stored recipes.
 const cases=[
  {name:"Mónaco",types:withStart(monaco.types),driveDirection:monaco.direction,raisedParts:[]},
  {name:"Catalunya",types:catalunya,driveDirection:1,raisedParts:[]},
  {name:"Doble óvalo elevado",types:withStart(doubleOval.types),
   driveDirection:doubleOval.direction,raisedParts:doubleOval.bridgeParts},
  {name:"Ocho con meta",types:["START350","S175","S075",...g.FIGURE_EIGHT.slice(1)],
   driveDirection:1,raisedParts:[9]}
 ];
 const maxTicks=22000;
 for(let index=0;index<cases.length;index++){
  const item=cases[index];
  const recipe={types:item.types,driveDirection:item.driveDirection,raisedParts:item.raisedParts};
  const {engineFactory,circuitFingerprint,canonical}=createSharedPhysicsEngineFactory(recipe);
  assert.equal(canonical.types.filter(x=>x==="START350").length,1);
  const comp=defineCompetition({competitionId:"regression-"+index,format:"live_duel",
   circuitId:"track-"+index,circuitRevision:"v1",circuitFingerprint,
   physicsVersion:PHYSICS_VERSION,targetLaps:1});
  function runDuel(session){
   const ref=createServerReferee({competition:comp,sessionId:session,
     pilotA:"human",pilotB:"rival",engineFactory,stepMs:10,minLapMs:20,
     maxTicksPerHeat:maxTicks});
   const input=(id,seq,type,value=null)=>ref.ingest(id,createClientIntent(comp,{
     sessionId:session,driverId:id,sequence:seq,type,value}));
   let ticks=0;const results=[];
   for(let heat=1;heat<=2;heat++){
    if(heat===2)ref.nextHeat();
    const seq=(heat-1)*2+1;
    assert.equal(input("human",seq,"ready").accepted,true);
    assert.equal(input("rival",seq,"ready").accepted,true);
    assert.equal(input("human",seq+1,"throttle",57).accepted,true);
    assert.equal(input("rival",seq+1,"throttle",61).accepted,true);
    let status="running",count=0;
    while(status==="running"&&count++<maxTicks){
     const frame=ref.step();status=frame.status??frame.reason;
     assert.equal(frame.accepted,true,"El motor no puede abortar esta pista: "+item.name+" "+JSON.stringify(frame));
    }
    assert.notEqual(status,"running",item.name+": manga demasiado larga");
    assert.equal(status,heat===1?"heat-complete":"completed-pending-certification",
      item.name+" manga "+heat);
    ticks+=count;
    const state=ref.view();
    assert.equal(state.laps.human.length,1);
    assert.equal(state.laps.rival.length,1);
    assert.equal(new Set([state.assignment.laneA,state.assignment.laneB]).size,2);
    assert.ok(state.laps.human[0].lapMs>3000&&state.laps.rival[0].lapMs>3000);
    results.push(state.completedHeats.at(-1));
   }
   const score=ref.provisionalClassification();
   assert.equal(score.official,false);
   assert.equal(score.ready,true);
   assert.ok(score.classification.every(p=>p.laneAHeats===1&&p.laneBHeats===1));
   return {results,score,ticks};
  }
  const a=runDuel("a-"+index);
  const b=runDuel("b-"+index);
  assert.deepEqual(a,b,item.name+" debe producir resultados deterministas");
  // On the same exact geometry a CPU-owned car must use exactly the same
  // throttle and physics as a human-controlled car following its decisions.
  const withCpu=createSharedPhysicsEngineFactory(recipe,{cpuPilots:["cpu"]});
  const auto=withCpu.engineFactory({competition:comp,
   assignment:{heat:1,laneA:"human",laneB:"cpu"},stepMs:10});
  const manual=engineFactory({competition:comp,
   assignment:{heat:1,laneA:"human",laneB:"cpu"},stepMs:10});
  const layout=g.buildTrack(canonical.types,g.START,canonical.raisedParts);
  let autoFinish=0,manualFinish=0;
  for(let tick=1;tick<=maxTicks&&(!autoFinish||!manualFinish);tick++){
   const s=manual.inspect().cpu;
   const expectedGas=chooseAiThrottleOnTrackV4({
     track:layout,physicalLane:s.physicalLane,distance:s.distance,speed:s.speed,
     direction:item.driveDirection
   });
   const x=auto.step({tick,dtMs:10,controls:{human:57}});
   const y=manual.step({tick,dtMs:10,controls:{human:57,cpu:expectedGas}});
   assert.deepEqual(x.crossings,y.crossings,item.name+": CPU y mando de prueba");
   assert.deepEqual(auto.inspect().cpu,manual.inspect().cpu,item.name+": IA y coche físico");
   if(x.crossings.some(v=>v.driverId==="cpu"))autoFinish++;
   if(y.crossings.some(v=>v.driverId==="cpu"))manualFinish++;
  }
  assert.equal(autoFinish,1,item.name+": la IA debe completar al menos una vuelta");
  assert.equal(autoFinish,manualFinish);
  console.log(item.name+": 2 mangas intercambiadas, tiempos iguales en 2 ejecuciones, CPU mismo motor y meta OK ("+a.ticks+" ticks)");
 }
 const appDriver=fs.readFileSync("src/app.mjs","utf8");
 assert.match(appDriver,/aiTest\.speed=advanceSpeedV4\(aiTest\.speed,aiTest\.throttle\/100,dt\)/);
 assert.match(appDriver,/aiTest\.throttle=chooseAiThrottleOnTrackV4\(/);
 assert.match(appDriver,/const rear=advanceRearV4\(\{\s*carId:aiTest\.carId/);
 assert.doesNotMatch(appDriver,/const response=target<aiTest\.speed\?9:2\.1/);
 console.log("All complex-circuit shared physical AI and server referee regressions OK");
})().catch(e=>{console.error(e);process.exitCode=1});
