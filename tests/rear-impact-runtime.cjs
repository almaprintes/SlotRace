"use strict";
// Se ejecutan las funciones reales de la IA, no una imitación de su lógica.
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const geo=await import("../src/track.mjs");
 const impact=await import("../src/rear-contact.mjs");
 const recover=await import("../src/recovery-core.mjs");
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
  "sweptRearContact","placeRearBehind","advanceRecovery",
  "followTarget","reentrySafe","REAR_CONTACT",code+
  '\nfunction displayDrivingPose(){const lane=state.track.lanes[state.driveDirection===-1?1-state.lane:state.lane];const pose=positionAt(lane,state.driveDirection===-1?-state.distance:state.distance);return state.laneTransition?.physical?physicalSwitchPose(pose,state.laneTransition.from,state.laneTransition.pieceIndex):pose;}\n'+
  "return{ai:aiTest,advance:advanceAiTest,pose:aiTestPose};");
 const track=geo.buildTrack(geo.STARTER);
 assert.ok(track.valid);
 function setUp({fixture=track,playerLane=0,aiLane=0,playerTransition=null,aiTransition=null,
  playerDistance=400,aiDistance=330,playerSpeed=500,aiSpeed=750,playerDeslot=null}={}){
  const state={track:fixture,driveDirection:1,run:true,raceStarted:true,mode:"race",
   lane:playerLane,laneTransition:playerTransition,
   distance:playerDistance,speed:playerSpeed,penalty:0,
   deslot:playerDeslot,lapEligible:true,followCamera:{settle:0}};
  const events=[];
  const rt=factory(state,geo.positionAt,98,{topSpeed:1150},
   geo.carTrackLevel,geo.carsBeyondCollision,t=>events.push(t),
   impact.forwardGap,impact.rearContact,
   impact.sweptRearContact,impact.placeRearBehind,recover.advanceRecovery,impact.followTarget,
   impact.reentrySafe,impact.REAR_CONTACT);
  Object.assign(rt.ai,{active:true,lane:aiLane,distance:aiDistance,speed:aiSpeed,penalty:0,
   armed:!aiTransition,laneTransition:aiTransition,collisionCooldown:0,awaitingSeparation:false,
   deslot:null,bump:null,collisions:0});
  // La PWA mueve primero al jugador y luego a la IA. Reproducimos
  // ese orden para verificar el detector DE VERDAD y sus correcciones.
  function advance(dt){
   const before={
    player:{lane:state.lane,distance:state.distance,deslot:!!state.deslot},
    ai:{lane:rt.ai.lane,distance:rt.ai.distance,deslot:!!rt.ai.deslot}
   };
   if(state.penalty<=0&&!state.deslot)
    state.distance=(state.distance+state.speed*dt)%fixture.lanes[state.lane].total;
   rt.advance(dt,before);
  }
  return{state,ai:rt.ai,advance,events};
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
  assert.equal(x.state.distance,400.5,"El delantero sólo avanza lo físicamente recorrido");
  assert.equal(impact.forwardGap(x.ai.distance,x.state.distance,track.lanes[0].total),100,
   "Después del toque, los coches quedan separados 100 mm");
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
  x.ai.deslot={pose:{x:0,y:0,h:0},turn:1,elapsed:2.4,duration:2.5};
  x.ai.penalty=.01;
  x.advance(.02);
  assert.ok(x.ai.penalty>0,"Reincorporación aplazada si el rival ocupa la guía");
  assert.ok(x.ai.deslot,"No aparecer encima del otro coche");
 }
 {
  const x=setUp({playerDistance:100,aiDistance:215,playerSpeed:1240,aiSpeed:160});
  x.advance(.05);
  assert.equal(x.state.penalty,5,"Impacto rápido entre fotogramas: sanción del trasero");
  assert.equal(x.ai.penalty,2.5);
  assert.equal(impact.forwardGap(x.state.distance,x.ai.distance,track.lanes[0].total),100,
   "Ni un fotograma lento permite atravesar a la IA");
 }
 {
  const x=setUp({playerDistance:100,aiDistance:195,playerSpeed:400,aiSpeed:350});
  x.advance(.001);
  assert.equal(x.state.deslot,null,"Rozar suavemente no provoca descarrilamiento");
  assert.equal(x.ai.deslot,null);
  assert.equal(x.ai.collisions,0,"El roce suave no cuenta como choque penalizado");
  assert.equal(impact.forwardGap(x.state.distance,x.ai.distance,track.lanes[0].total),100,
   "El roce suave tampoco permite superposición");
 }
 {
  const x=setUp({playerDistance:400,aiDistance:330,playerSpeed:500,aiSpeed:750});
  x.advance(.001);
  assert.equal(x.ai.collisions,1);
  x.ai.speed=600;x.state.speed=250;
  x.advance(.02);
  assert.equal(x.ai.collisions,1,"Durante cooldown se evita doble sanción");
  assert.equal(impact.forwardGap(x.ai.distance,x.state.distance,track.lanes[0].total),100,
   "Durante cooldown tampoco se atraviesa el coche");
 }
 // Dentro de PT/82 hay DOS casos deportivos distintos:
 // mismo surco = alcance con responsable; surcos que se cruzan = 3 s ambos.
 const xTypes=geo.STARTER.slice(),xIndex=xTypes.indexOf("S350");
 xTypes[xIndex]="X350";
 const ptTrack=geo.buildTrack(xTypes);
 assert.ok(ptTrack.valid);
 function atPiece(lane,index,t){
  for(let i=1;i<lane.nodes.length;i++){
   const a=lane.nodes[i-1],b=lane.nodes[i];
   if(b.pieceIndex!==index)continue;
   const start=a.pieceIndex===index?a.pieceT||0:0;
   const end=b.pieceT||0;
   if(t<=end+1e-9)return lane.lengths[i-1]+
    (t-start)/Math.max(1e-9,end-start)*(lane.lengths[i]-lane.lengths[i-1]);
  }
  throw Error("Falta PT82 en el carril");
 }
 const transition=from=>({from,pieceIndex:xIndex,physical:true});
 {
  const lead=atPiece(ptTrack.lanes[1],xIndex,.56);
  const x=setUp({fixture:ptTrack,playerLane:1,aiLane:1,
   playerTransition:transition(0),aiTransition:transition(0),
   playerDistance:lead,aiDistance:lead-90,playerSpeed:0,aiSpeed:1100});
  x.advance(.001);
  assert.equal(x.ai.penalty,5,
   "Alcance fuerte dentro de PT82: el coche trasero (IA) es responsable");
  assert.equal(x.state.penalty,2.5,
   "Alcance fuerte dentro de PT82: el delantero recibe 2,5 segundos");
  assert.equal(x.state.lane,x.ai.lane,
   "Un alcance por la misma guía no cambia de carril a los coches");
 }
 {
  const x=setUp({fixture:ptTrack,playerLane:1,aiLane:0,
   playerTransition:transition(0),aiTransition:transition(1),
   playerDistance:atPiece(ptTrack.lanes[1],xIndex,.5),
   aiDistance:atPiece(ptTrack.lanes[0],xIndex,.5),
   playerSpeed:0,aiSpeed:600});
  x.advance(.001);
  assert.equal(x.state.penalty,3,
   "Cruce de trayectorias en PT82: 3 s compartidos para jugador");
  assert.equal(x.ai.penalty,3,
   "Cruce de trayectorias en PT82: 3 s compartidos para IA");
  const pPos=geo.positionAt(ptTrack.lanes[x.state.lane],x.state.distance);
  const aPos=geo.positionAt(ptTrack.lanes[x.ai.lane],x.ai.distance);
  assert.notEqual(pPos.pieceIndex,xIndex);
  assert.notEqual(aPos.pieceIndex,xIndex);
 }
 console.log("Integración real IA: contactos, PT82 (alcance frente a cruce) y paso libre OK");
})().catch(e=>{console.error(e);process.exitCode=1});
