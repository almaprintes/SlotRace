"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const geom=await import("../src/track.mjs");
 const blueprint=await import("../src/blueprint.mjs");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
   .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/gm,"");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 function el(id){
  return{id,children:[],listeners:{},dataset:{},style:{},textContent:"",hidden:false,disabled:false,
    width:390,height:650,clientWidth:66,value:"0",
    classList:{add(){},remove(){},toggle(){}},setAttribute(){},setPointerCapture(){},
    appendChild(node){this.children.push(node);},
    getBoundingClientRect(){return{left:0,top:0,right:390,bottom:650,width:390,height:650}},
    querySelectorAll(){return this.children},
    querySelector(sel){if(sel===".bridge-kit-cta")return this.kitCta??=el("kit-cta");if(sel===".qty")return this.qty??=el("qty");if(sel===".grip"||sel===".foam-drag-grip")return this.grip??=el("grip");return null;},
    addEventListener(type,cb){(this.listeners[type]||=[]).push(cb)}};
 }
 const elements=new Map(ids.map(id=>[id,el(id)]));
 const ctx=new Proxy({}, {get(t,k){if(k==="createLinearGradient")return()=>({addColorStop(){}});return()=>{};},set(t,k,v){t[k]=v;return true;}});
 for(const id of ["editCanvas","raceCanvas"])elements.get(id).getContext=()=>ctx;
 const document={getElementById:id=>elements.get(id),createElement:()=>el("palette"),addEventListener(){},hidden:false};
 const window={devicePixelRatio:1,innerWidth:390,innerHeight:844,setTimeout:fn=>fn(),
  matchMedia:()=>({matches:true}),addEventListener(){}};
 const localData=new Map(),localStorage={getItem:k=>localData.get(k)||null,setItem:(k,v)=>localData.set(k,v)};
 const frames=[];let clock=0;
 const requestAnimationFrame=fn=>frames.push(fn);
 const keys=[...Object.keys(geom),...Object.keys(blueprint)],values=keys.map(k=>Object.hasOwn(geom,k)?geom[k]:blueprint[k]);
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",source)(
  ...values,document,window,localStorage,{now:()=>clock},requestAnimationFrame,class{observe(){}}
 );
 const game=window.slotraceLab;
 game.openWorkshop();
 assert.equal(game.version,"DEV 0.11.1");
 game.changeTypes(geom.STARTER.slice(),"Óvalo de prueba",[]);
 game.openRace();
 const st=game.state,physics=game.physics;
 assert.equal(st.track.valid,true);
 assert.equal(st.track.bridge,null,"No elevated crossing in the oval");
 // El óvalo gira a la derecha (+1): lane 1 interior, lane 0 exterior.
 // El ocho incorpora curvas a izquierda; allí los roles se invierten.
 const r=geom.CATALOG.R2_45R.radius,off=geom.LANE_OFFSET;
 const right=geom.positionAt(st.track.lanes[0],
  st.track.lanes[0].lengths[st.track.lanes[0].nodes.findIndex(p=>p.pieceIndex===2)+3]);
 assert.equal(right.curve,1);
 const outsideLimit=physics.curveLimit(right,0),insideLimit=physics.curveLimit(right,1);
 assert.ok(outsideLimit>insideLimit,"El carril exterior admite más velocidad que el interior");
 assert.ok(Math.abs(outsideLimit-physics.DRIVE.curveBase*physics.DRIVE.derailMultiplier*
   Math.sqrt((r+off)/r))<.01,"Radio exterior R+39 aplicado");
 assert.ok(Math.abs(insideLimit-physics.DRIVE.curveBase*physics.DRIVE.derailMultiplier*
   Math.sqrt((r-off)/r))<.01,"Radio interior R-39 aplicado");
 assert.ok(.65*physics.DRIVE.topSpeed<insideLimit&&.70*physics.DRIVE.topSpeed>insideLimit,
   "El interior admite 65% pero supera umbral al 70%");
 assert.ok(.75*physics.DRIVE.topSpeed<outsideLimit&&.80*physics.DRIVE.topSpeed>outsideLimit,
   "El exterior admite 75% pero supera umbral al 80%");
 const leftTrack=geom.buildTrack(["R2_45L","R2_45L","R2_45L"]);
 const leftLine=leftTrack.lanes[0];
 const leftPose=geom.positionAt(leftLine,leftLine.total*.25);
 assert.equal(leftPose.curve,-1);
 assert.ok(physics.curveLimit(leftPose,1)>physics.curveLimit(leftPose,0),
   "Al invertir el sentido, el exterior pasa al otro carril");
 assert.ok(Math.abs(physics.curveLimit(leftPose,1)-outsideLimit)<.01,
   "El límite exterior no depende del sentido de giro");
 assert.ok(Math.abs(physics.curveLimit(leftPose,0)-insideLimit)<.01,
   "El límite interior no depende del sentido de giro");
// El ocho PT-Precision tiene seis R2 a derecha (piezas 1..6) y seis R2 a
// izquierda (piezas 8..13). Cada carril alterna exterior e interior.
 const eight=geom.buildTrack(geom.FIGURE_EIGHT);
 assert.equal(eight.valid,true,"El ocho completo debe seguir siendo jugable");
 for(const [pieceIndex,turn,innerLane,outerLane] of [
  [5,1,1,0], // Lóbulo a derecha: carril 1 dentro
  [10,-1,0,1] // Lóbulo a izquierda: carril 0 dentro
 ]){
  const sampleLane=eight.lanes[0];
  const ix=sampleLane.nodes.findIndex(p=>p.pieceIndex===pieceIndex)+3;
  const pose=geom.positionAt(sampleLane,sampleLane.lengths[ix]);
  assert.equal(pose.curve,turn,"El giro del lóbulo debe ser el esperado");
  const inner=physics.curveLimit(pose,innerLane);
  const outer=physics.curveLimit(pose,outerLane);
  assert.ok(outer>inner,"En ambos lóbulos el exterior debe admitir más gas");
  assert.ok(.65*physics.DRIVE.topSpeed<inner&&.70*physics.DRIVE.topSpeed>inner,
   "En ambos lóbulos 65% interior seguro y 70% por encima del umbral");
  assert.ok(.75*physics.DRIVE.topSpeed<outer&&.80*physics.DRIVE.topSpeed>outer,
   "En ambos lóbulos 75% exterior seguro y 80% por encima del umbral");
 }

 const tracks=st.track.lanes;
 function testThrottle(laneId,gas,dt){
  const lane=tracks[laneId],first=lane.nodes.findIndex(p=>p.pieceIndex===2);
  const last=lane.nodes.findLastIndex(p=>p.pieceIndex===2);
  const lastTurn=lane.nodes.findLastIndex(p=>p.pieceIndex===5);
  const nextStraight=lane.nodes.findIndex(p=>p.pieceIndex===6);
  assert.ok(first>1&&last>first&&lastTurn>last&&nextStraight>lastTurn);
  const curveStart=lane.lengths[first-1];
  const curveLength=lane.lengths[last]-curveStart;
  const turnEnd=lane.lengths[lastTurn];
  const straightPosition=lane.lengths[nextStraight-1]+1;
  assert.equal(geom.positionAt(lane,curveStart+1).curve,1);
  assert.equal(geom.positionAt(lane,straightPosition).curve,0,
    "La recta no debe heredar la curvatura anterior");
  assert.equal(physics.curveLimit(geom.positionAt(lane,straightPosition),laneId),Infinity);
  Object.assign(st,{
    lane:laneId,gas,speed:gas*physics.DRIVE.topSpeed,
    distance:curveStart+1,cornerDistance:0,cornerDirection:0,gripDebt:0,
    penalty:0,deslot:null,drift:0,driftDirection:0,seconds:0,run:true
  });
  let maxDrift=0,steps=0;
  for(;steps<500&&st.penalty===0&&st.distance<turnEnd;steps++){
   physics.simulationStep(dt);
   maxDrift=Math.max(maxDrift,st.drift);
   if(steps===0){
    assert.equal(st.penalty,0,"No puede salirse en la primera arista");
    assert.ok(st.distance>curveStart,"Debe comenzar a recorrer la curva");
   }
  }
  return{crashed:st.penalty>0,advance:st.distance-curveStart,
   curveLength,turnLength:turnEnd-curveStart,maxDrift,steps,gripDebt:st.gripDebt};
 }
 const inner65=testThrottle(1,.65,1/60);
 assert.equal(inner65.crashed,false,"Interior 65% completa la curva");
 assert.ok(inner65.advance>=inner65.turnLength);
 assert.ok(inner65.maxDrift>.20,"Interior 65% permite derrapar");
 const inner70=testThrottle(1,.70,1/60);
 assert.equal(inner70.crashed,true,"Interior 70% se sale con acelerador sostenido");
 assert.ok(inner70.advance>inner70.curveLength*.50,
   "Interior 70% debe salirse ya dentro de la curva, no al tocar la entrada");
 assert.ok(inner70.advance<inner70.curveLength*2.5);
 const outer75=testThrottle(0,.75,1/60);
 assert.equal(outer75.crashed,false,"Exterior 75% completa la curva");
 assert.ok(outer75.maxDrift>.15,"Exterior 75% derrapa sin salirse");
 const outer80=testThrottle(0,.80,1/60);
 assert.equal(outer80.crashed,true,"Exterior 80% se sale con acelerador sostenido");
 assert.ok(outer80.advance>outer80.curveLength*.50,
   "Exterior 80% no se sale a la entrada");
 assert.ok(outer80.advance<outer80.curveLength*2.5);
 const fastInner=testThrottle(1,.70,1/120);
 const fastOuter=testThrottle(0,.80,1/120);
 assert.equal(fastInner.crashed,true);
 assert.equal(fastOuter.crashed,true);
 assert.ok(Math.abs(fastInner.advance-inner70.advance)<25,
   "El punto de salida interior debe ser estable entre 60/120 Hz");
 assert.ok(Math.abs(fastOuter.advance-outer80.advance)<25,
   "El punto de salida exterior debe ser estable entre 60/120 Hz");
 // Suelta gas dentro de la curva y comprueba que la pérdida se recupera.
 const innerLane=tracks[1];
 const first=innerLane.nodes.findIndex(p=>p.pieceIndex===2);
 const start=innerLane.lengths[first-1];
 Object.assign(st,{lane:1,gas:.65,speed:.65*physics.DRIVE.topSpeed,
  distance:start+80,cornerDirection:1,cornerDistance:80,
  gripDebt:.75,penalty:0,deslot:null,run:true});
 const initialDebt=st.gripDebt;
 for(let i=0;i<8;i++)physics.simulationStep(1/60);
 assert.equal(st.penalty,0,"Al reducir el gas no debe haber salida tardía");
 assert.ok(st.gripDebt<initialDebt,"Reducir gas debe recuperar agarre");
 // Las simulaciones siguientes deben recorrer el ocho, no el óvalo
 // anterior, que tiene tramos y distancias distintos.
 st.track=eight;
 st.types=[...geom.FIGURE_EIGHT];
 // Verificación DINÁMICA del ocho de 14 piezas: los límites no sólo
 // deben dar el valor teórico; deben aplicarse al recorrer ambos lóbulos.
 function testEightCurve(pieceId,laneId,gas){
  const lane=eight.lanes[laneId];
  const index=lane.nodes.findIndex(p=>p.pieceIndex===pieceId);
  const endIndex=lane.nodes.findLastIndex(p=>p.pieceIndex===pieceId);
  const turnEnd=lane.nodes.findLastIndex(p=>p.pieceIndex===pieceId+4);
  assert.ok(index>1&&endIndex>index&&turnEnd>endIndex);
  const start=lane.lengths[index-1],firstLength=lane.lengths[endIndex]-start;
  Object.assign(st,{
   lane:laneId,gas,speed:gas*physics.DRIVE.topSpeed,distance:start+1,
   cornerDistance:0,cornerDirection:0,gripDebt:0,penalty:0,
   deslot:null,drift:0,driftDirection:0,seconds:0,lap:1,run:true
  });
  // El segundo lóbulo termina en meta: abandonar la prueba al completar
  // la vuelta; si continuásemos tras el módulo, entraríamos en la
  // siguiente curva (con interior/exterior intercambiados).
  for(let i=0;i<500&&st.penalty===0&&st.lap===1&&
      st.distance<lane.lengths[turnEnd];i++)
   physics.simulationStep(1/60);
  return{crashed:st.penalty>0,advance:st.distance-start,firstLength};
 }
 for(const [startPiece,innerLane,outerLane] of [[1,1,0],[8,0,1]]){
  const slowInner=testEightCurve(startPiece,innerLane,.65);
  const fastInner=testEightCurve(startPiece,innerLane,.70);
  const slowOuter=testEightCurve(startPiece,outerLane,.75);
  const fastOuter=testEightCurve(startPiece,outerLane,.80);
  assert.equal(slowInner.crashed,false,"En ambos lóbulos: interior 65% estable");
  assert.equal(fastInner.crashed,true,"En ambos lóbulos: interior 70% se sale");
  assert.equal(slowOuter.crashed,false,"En ambos lóbulos: exterior 75% estable");
  assert.equal(fastOuter.crashed,true,"En ambos lóbulos: exterior 80% se sale");
  assert.ok(fastInner.advance>fastInner.firstLength*.5,
   "El coche no sale antes de media curva interior del ocho");
  assert.ok(fastOuter.advance>fastOuter.firstLength*.5,
   "El coche no sale antes de media curva exterior del ocho");
 }
 console.log("SlotRace DEV 0.11.1: interior 65/70%, exterior 75/80%, radio correcto en ambos giros, salida progresiva — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
