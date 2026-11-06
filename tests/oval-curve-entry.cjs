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
 assert.equal(game.version,"DEV 0.14.6");
 game.changeTypes(geom.STARTER.slice(),"Óvalo de prueba",[]);
 game.openRace();
 const st=game.state,physics=game.physics;
 assert.equal(game.version,"DEV 0.14.6");
 assert.equal(st.track.valid,true);
 assert.equal(st.track.bridge,null);
 const max=physics.DRIVE.topSpeed;
 const r1=geom.CATALOG.R1_45R.radius,r2=geom.CATALOG.R2_45R.radius,
  r3=geom.CATALOG.R3_225R.radius,r4=geom.CATALOG.R4_225R.radius;
 const off=geom.LANE_OFFSET;
 const pose=(radius,curve=1)=>({radius,curve});
 // Física: a = v²/r (unidades coherentes m/s²).
 const inner=physics.cornerForces(pose(r1),1,max);
 const outer=physics.cornerForces(pose(r1),0,max);
 assert.ok(Math.abs(inner.radiusMm-(r1-off))<1e-9);
 assert.ok(Math.abs(outer.radiusMm-(r1+off))<1e-9);
 assert.ok(Math.abs(inner.lateralAcceleration-
  Math.pow(max/1000,2)/((r1-off)/1000))<1e-10);
 assert.ok(inner.inertialForceN>inner.gripForceN,
  "A fondo, la R1 interior supera el agarre de la trasera");
 assert.ok(outer.inertialForceN<outer.gripForceN,
  "A fondo, R1 exterior admite la trayectoria sin derrape crítico");
 const r1Limit=physics.curveLimit(pose(r1),1)/max;
 assert.ok(r1Limit>.88&&r1Limit<.92,
  "El deslizamiento inicial en R1 interior aparece cerca del 90%");
 assert.ok(physics.curveLimit(pose(r2),1)>max,
  "R2 interior deja acelerar al 100% sin pérdida crítica");
 assert.ok(physics.curveLimit(pose(r3),1)>max);
 assert.ok(physics.curveLimit(pose(r4),1)>max);
 assert.equal(physics.curveLimit(pose(r2,0),1),Infinity);
 assert.equal(physics.curveLimit(pose(r1,-1),0),physics.curveLimit(pose(r1),1),
  "Agarre interior idéntico cuando cambia el sentido de giro");
 assert.equal(physics.curveLimit(pose(r1,-1),1),physics.curveLimit(pose(r1),0),
  "El exterior cambia de carril al invertir la curva");
 assert.equal(physics.VEHICLE_DYNAMICS.gripline.gripG,
  physics.VEHICLE_DYNAMICS.spark.gripG,
  "Por ahora no se inventan diferencias de adherencia entre coches");

 const r1Oval=["S350","S350",...Array(4).fill("R1_45R"),
  "S350","S350",...Array(4).fill("R1_45R")];
 const r2Oval=geom.STARTER.slice();
 function makeOval(types){
  const track=geom.buildTrack(types);
  assert.equal(track.valid,true,"El trazado de prueba está cerrado");
  st.track=track;st.types=types.slice();st.driveDirection=1;
  return track;
 }
 // Cuatro módulos R1_45R forman UNA curva de 180º: los empalmes
 // no deben reiniciar su fase ni concentrar el máximo esfuerzo al entrar.
 const trackPhase=makeOval(r1Oval),phaseLane=trackPhase.lanes[1];
 const phaseFirst=phaseLane.nodes.findIndex(p=>p.pieceIndex===2);
 const phaseLast=phaseLane.nodes.findLastIndex(p=>p.pieceIndex===5);
 const phaseStart=phaseLane.lengths[phaseFirst-1],phaseEnd=phaseLane.lengths[phaseLast];
 const phaseDistance=f=>phaseStart+(phaseEnd-phaseStart)*f;
 const atPhase=f=>{
  const d=phaseDistance(f);
  return physics.curvePhase(geom.positionAt(phaseLane,d),phaseLane,d).progress;
 };
 for(const f of [.05,.25,.50,.75,.95])
  assert.ok(Math.abs(atPhase(f)-f)<.02,
   "La fase recorre progresivamente el arco completo: "+f);
 const join=phaseLane.nodes.findLastIndex(p=>p.pieceIndex===2);
 const seam=phaseLane.lengths[join];
 const leftPhase=physics.curvePhase(geom.positionAt(phaseLane,seam-1),phaseLane,seam-1).progress;
 const rightPhase=physics.curvePhase(geom.positionAt(phaseLane,seam+1),phaseLane,seam+1).progress;
 assert.ok(rightPhase>leftPhase&&rightPhase-leftPhase<.025,
  "El esfuerzo sigue creciendo sin reiniciarse en la junta de las piezas");
 assert.ok(physics.curveStressEnvelope(.1)<physics.curveStressEnvelope(.5));
 assert.ok(physics.curveStressEnvelope(.5)<physics.curveStressEnvelope(.72));
 assert.ok(Math.abs(physics.curveStressEnvelope(.72)-1)<1e-10,
  "La carga máxima se alcanza después de media curva");
 // Prueba en sentido contrario: la progresión también se invierte.
 st.driveDirection=-1;
 const native=.2*(phaseEnd-phaseStart)+phaseStart;
 const revDistance=phaseLane.total-native;
 const reversePose=geom.positionAt(phaseLane,native);
 assert.ok(Math.abs(physics.curvePhase({...reversePose,curve:-reversePose.curve},
  phaseLane,revDistance).progress-.8)<.02,
  "En conducción inversa, la zona de máximo esfuerzo sigue hacia la salida");
 st.driveDirection=1;
 // Prueba sobre una curva de 180° completa, con velocidad estabilizada.
 function runCurve(types,laneId,gas,dt){
  const track=makeOval(types),lane=track.lanes[laneId];
  const begin=lane.nodes.findIndex(p=>p.pieceIndex===2);
  const finish=lane.nodes.findLastIndex(p=>p.pieceIndex===5);
  assert.ok(begin>0&&finish>begin);
  const beginMm=lane.lengths[begin-1]+1,endMm=lane.lengths[finish];
  Object.assign(st,{lane:laneId,run:true,raceStarted:true,gas,
   speed:max*gas,distance:beginMm,penalty:0,deslot:null,
   drift:0,driftDirection:0,rearSlip:0,rearSlipVelocity:0,
   cornerDistance:0,cornerDirection:0,gripDebt:0,lap:1,seconds:0});
  let loops=0,maxSlip=0,maxStress=-Infinity,peakPhase=0;
  while(st.penalty===0&&st.distance<endMm&&loops++<800){
   const d=st.distance;
   const phase=physics.curvePhase(geom.positionAt(lane,d),lane,d).progress;
   physics.simulationStep(dt);
   maxSlip=Math.max(maxSlip,Math.abs(st.rearSlip));
   if(st.rearStress>maxStress){maxStress=st.rearStress;peakPhase=phase;}
  }
  assert.ok(loops<800,"La simulación completa o desencarrila antes del tiempo límite");
  const phase=physics.curvePhase(geom.positionAt(lane,st.distance),lane,st.distance).progress;
  return{crashed:st.penalty>0,distance:st.distance-beginMm,
   completed:st.distance>=endMm,slip:maxSlip,sec:st.seconds,
   phase,peakPhase,maxStress};
 }
 const r1Inner90=runCurve(r1Oval,1,.90,1/60);
 assert.equal(r1Inner90.crashed,false,"R1 interior a 90% debe completarse");
 const r1Inner95=runCurve(r1Oval,1,.95,1/60);
 assert.equal(r1Inner95.crashed,false,"R1 interior a 95% puede completarse");
 const r1Inner100=runCurve(r1Oval,1,1,1/60);
 assert.equal(r1Inner100.crashed,true,"R1 interior a fondo termina saliendo");
 assert.ok(r1Inner100.distance>70,"La trasera necesita tiempo para deslizarse");
 assert.ok(r1Inner100.phase>=.50,
  "No puede descarrilar antes de la mitad del arco continuo");
 assert.ok(r1Inner100.peakPhase>=.50,
  "El máximo esfuerzo debe darse en la segunda mitad de la curva");
 const r1Outer100=runCurve(r1Oval,0,1,1/60);
 assert.equal(r1Outer100.crashed,false,"R1 exterior permite mayor velocidad");
 const r2Inner100=runCurve(r2Oval,1,1,1/60);
 const r2Outer100=runCurve(r2Oval,0,1,1/60);
 assert.equal(r2Inner100.crashed,false,"R2 interior al 100% es estable");
 assert.equal(r2Outer100.crashed,false,"R2 exterior al 100% es estable");
 const fast=runCurve(r1Oval,1,1,1/120);
 assert.equal(fast.crashed,true,"Mismo deslot a 120 Hz");
 assert.ok(Math.abs(fast.distance-r1Inner100.distance)<25,
  "La salida es coherente entre 60 y 120 Hz");

 // La masa trasera también tiene memoria: conserva desplazamiento e
 // inercia al levantar el gatillo, pero el amortiguador permite recuperar.
 const track=makeOval(r1Oval),lane=track.lanes[1];
 const begin=lane.nodes.findIndex(p=>p.pieceIndex===2);
 st.distance=lane.lengths[begin-1]+1;
 st.speed=max*.40;st.rearSlip=10;st.rearSlipVelocity=0;
 const before=st.rearSlip;
 const recovery=physics.advanceRearDynamics(geom.positionAt(lane,st.distance),1,.2);
 assert.ok(Math.abs(recovery.slipMm)<Math.abs(before),
  "Al disminuir velocidad, la cola recupera la alineación");
 assert.ok(recovery.slipVelocityMmS<0,
  "La trasera adquiere velocidad de recuperación hacia la ranura");
 const angle=physics.advanceRearDynamics(pose(r1),1,1/60);
 assert.ok(Math.abs(angle.yawRad)<physics.VEHICLE_DYNAMICS.gripline.guideYawLimit,
  "El ángulo de guía se mantiene dentro de los márgenes al reducir gas");
 console.log("SlotRace DEV 0.14.6: fuerza centrípeta, inercia trasera, R1 90/100%, R2 100%, recuperación y 60/120 Hz — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
