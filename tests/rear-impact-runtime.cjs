"use strict";
// Se ejecutan las funciones reales de la IA, no una imitación de su lógica.
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const geo=await import("../src/track.mjs");
 const impact=await import("../src/rear-contact.mjs");
 const src=fs.readFileSync("src/app.mjs","utf8");
 function section(a,b){
  const x=src.indexOf(a),y=src.indexOf(b,x+a.length);
  assert.ok(x>=0&&y>x,"Falta función "+a);
  return src.slice(x,y);
 }
 const code=[
  section("function laneDistanceAtPiece(","function poseOnDrivingLane("),
  section("function poseOnDrivingLane(","function displayDrivingPose("),
  section("function switchEase(","function xSwitchPoints("),
  section("const aiTest={","function paintAiTest(")
 ].join("\n");
 const factory=new Function("state","positionAt","CAR_LENGTH_MM","DRIVE",
  "carTrackLevel","carsBeyondCollision","toast","forwardGap","rearContact",
  "followTarget","reentrySafe","REAR_CONTACT",code+
  '\nfunction displayDrivingPose(){const lane=state.track.lanes[state.driveDirection===-1?1-state.lane:state.lane];return positionAt(lane,state.driveDirection===-1?-state.distance:state.distance);}\n'+
  "return{ai:aiTest,advance:advanceAiTest,pose:aiTestPose};");
 const track=geo.buildTrack(geo.STARTER);
 assert.ok(track.valid);
 function setUp({playerDistance=400,aiDistance=330,playerSpeed=500,aiSpeed=750,playerDeslot=null}={}){
  const state={track,driveDirection:1,run:true,raceStarted:true,mode:"race",
   lane:0,distance:playerDistance,speed:playerSpeed,penalty:0,
   deslot:playerDeslot,lapEligible:true,followCamera:{settle:0}};
  const events=[];
  const rt=factory(state,geo.positionAt,98,{topSpeed:1150},
   geo.carTrackLevel,geo.carsBeyondCollision,t=>events.push(t),
   impact.forwardGap,impact.rearContact,impact.followTarget,
   impact.reentrySafe,impact.REAR_CONTACT);
  Object.assign(rt.ai,{active:true,lane:0,distance:aiDistance,speed:aiSpeed,penalty:0,
   armed:true,laneTransition:null,collisionCooldown:0,awaitingSeparation:false,
   deslot:null,bump:null,collisions:0});
  return{state,ai:rt.ai,advance:rt.advance,events};
 }
 {
  const x=setUp({aiSpeed:550});
  x.advance(.001);
  assert.equal(x.ai.collisions,0,"Roce mínimo: nada sucede");
  assert.equal(x.state.deslot,null);
  assert.equal(x.state.bump,undefined);
 }
 {
  const x=setUp();
  x.advance(.001);
  assert.equal(x.ai.collisions,1);
  assert.equal(x.state.penalty,0);
  assert.equal(x.ai.penalty,0);
  assert.equal(x.state.deslot,null,"Toque moderado: nadie descarrila");
  assert.ok(x.state.bump,"El coche delantero culea");
  assert.ok(x.ai.speed<300,"El trasero frena fuerte");
  assert.ok(x.state.speed>400,"El delantero solo frena un poco");
  assert.equal(x.state.distance,400,"Sin teletransporte");
 }
 {
  const x=setUp({playerSpeed:0,aiSpeed:850});
  x.advance(.001);
  assert.equal(x.ai.penalty,5,"IA culpable: sanción grave");
  assert.equal(x.state.penalty,2.5,"Delantero: sanción más leve");
  assert.ok(x.ai.deslot&&x.state.deslot,"Ambos fuera de pista");
  assert.equal(x.state.distance,400,"Ni el golpe fuerte regala distancia");
 }
 {
  const x=setUp({playerDistance:330,aiDistance:400,playerSpeed:900,aiSpeed:360});
  x.advance(.001);
  assert.equal(x.state.penalty,5,"Jugador que golpea: sanción más grave");
  assert.equal(x.ai.penalty,2.5,"IA alcanzada: sanción menor");
 }
 {
  const x=setUp({playerDistance:400,aiDistance:310,playerSpeed:0,
   aiSpeed:850,playerDeslot:{elapsed:.5,duration:3}});
  x.state.penalty=3;
  x.advance(.35);
  assert.ok(x.ai.distance>400,"Si el delantero se sale, la IA puede pasarlo");
  assert.equal(x.ai.collisions,0,"El coche fuera de pista no bloquea");
  assert.equal(x.ai.penalty,0);
 }
 {
  const x=setUp({playerDistance:400,aiDistance:405,playerSpeed:300,aiSpeed:0});
  x.ai.deslot={elapsed:2.4,duration:2.5};
  x.ai.penalty=.01;
  x.advance(.02);
  assert.ok(x.ai.penalty>0,"Reincorporación aplazada si el rival ocupa la guía");
  assert.ok(x.ai.deslot,"No aparecer encima del otro coche");
 }
 console.log("Integración real IA: roces leves, culeos, golpes graves y paso libre al descarrilar OK");
})().catch(e=>{console.error(e);process.exitCode=1});
