"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const core=await import("../src/physics-v4.mjs");
 const geom=await import("../src/track.mjs");
 const source=fs.readFileSync("src/app.mjs","utf8");
 assert.match(source,/import \{DRIVE as CORE_DRIVE,VEHICLE_DYNAMICS as CORE_VEHICLES,[^\n]+advanceRearV4\} from "\.\/physics-v4\.mjs/);
 assert.match(source,/const DRIVE=CORE_DRIVE;/);
 assert.match(source,/const VEHICLE_DYNAMICS=CORE_VEHICLES;/);
 assert.match(source,/state\.speed=advanceSpeedV4\(state\.speed,g,dt\);/);
 const start=source.indexOf("function advanceRearDynamics(p,lane,dt){");
 const end=source.indexOf("// Rival experimental:",start);
 assert.ok(start>0&&end>start);
 const functionSource=source.slice(start,end);
 assert.doesNotMatch(functionSource,/springRate|outwardForce|Math\.exp|Math\.ceil/,
   "El integrador del navegador no debe mantener una copia de las fórmulas físicas");
 const state={selectedCar:"gripline",speed:1130,rearSlip:3.2,rearSlipVelocity:1.3,
  rearStress:0,drift:0,driftDirection:0,gripDebt:0,
  track:{lanes:[{total:1},{total:1}]}};
 const curvePhase=()=>({progress:.64,lengthMm:100});
 const drivingLaneIndex=()=>1;
 const browserRear=new Function("state","curvePhase","drivingLaneIndex","advanceRearV4",
   "LANE_OFFSET",functionSource+"\nreturn advanceRearDynamics;");
 const pose={curve:1,radius:300,pieceIndex:2,pieceT:.6};
 const expected=core.advanceRearV4({carId:"gripline",speedMmS:1130,
   rearSlipMm:3.2,rearSlipVelocityMmS:1.3,pose,logicalLane:1,
   curveProgress:.64,dtSec:.01,laneOffset:geom.LANE_OFFSET});
 const fn=browserRear(state,curvePhase,drivingLaneIndex,core.advanceRearV4,geom.LANE_OFFSET);
 const actual=fn(pose,1,.01);
 assert.deepEqual(actual,expected);
 assert.equal(state.rearSlip,expected.slipMm);
 assert.equal(state.rearSlipVelocity,expected.slipVelocityMmS);
 assert.equal(state.rearStress,expected.effectiveExcess);
 assert.equal(state.drift,expected.drift);
 assert.equal(state.driftDirection,expected.driftDirection);
 assert.equal(state.gripDebt,expected.drift);
 const speedScenarios=[
  {speed:0,gas:1,dt:.01},{speed:1130,gas:0,dt:.01},
  {speed:450,gas:.37,dt:.016},{speed:850,gas:1,dt:.05}
 ];
 for(const {speed,gas,dt} of speedScenarios){
   const legacyTarget=gas*1150,response=gas>0?2.25:1.35;
   const legacy=Math.max(0,Math.min(1250,
     speed+(legacyTarget-speed)*(1-Math.exp(-response*dt))));
   assert.equal(core.advanceSpeedV4(speed,gas,dt),legacy,
     "La portación no puede cambiar el manejo del usuario");
 }
 console.log("Shared physics PWA: mismas ecuaciones de v4 y sin duplicados en el navegador OK");
})().catch(e=>{console.error(e);process.exitCode=1});
