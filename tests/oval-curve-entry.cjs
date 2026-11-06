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
 assert.equal(game.version,"DEV 0.14.19");
 game.changeTypes(geom.STARTER.slice(),"Óvalo de prueba",[]);
 game.openRace();
 const st=game.state,physics=game.physics;
 assert.equal(game.version,"DEV 0.14.19");
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
 const maxStable=physics.DRIVE.fullThrottleSlipAt*max;
 assert.ok(maxStable>.95*max&&maxStable<max,
  "El 100% provoca sobrecarga de guía; 95% puede ser estable");
 assert.equal(physics.curveLimit(pose(r2),1),maxStable,
  "R2 inicia su inestabilidad antes del 100%");
 assert.equal(physics.curveLimit(pose(r3),1),maxStable);
 assert.equal(physics.curveLimit(pose(r4),1),maxStable);
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
 // La orientación debe avanzar continuamente incluso cuando cambia el módulo.
 const beforeJoint=geom.positionAt(phaseLane,seam-.02);
 const afterJoint=geom.positionAt(phaseLane,seam+.02);
 const yawDelta=Math.atan2(
  Math.sin(afterJoint.h-beforeJoint.h),Math.cos(afterJoint.h-beforeJoint.h));
 assert.ok(Math.abs(yawDelta)<.004,
  "La tangente del coche no salta al pasar de una pieza curva a otra");
 const seamPose=geom.positionAt(phaseLane,seam);
 assert.ok(Math.hypot(seamPose.x-beforeJoint.x,seamPose.y-beforeJoint.y)<.025);
 assert.ok(Math.hypot(seamPose.x-afterJoint.x,seamPose.y-afterJoint.y)<.025);
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
 assert.equal(r1Outer100.crashed,true,
  "Incluso el carril exterior R1 acaba saliéndose a fondo");
 assert.ok(r1Outer100.phase>=.50);
 const r2Inner95=runCurve(r2Oval,1,.95,1/60);
 const r2Outer95=runCurve(r2Oval,0,.95,1/60);
 assert.equal(r2Inner95.crashed,false,"R2 interior a 95% es estable");
 assert.equal(r2Outer95.crashed,false,"R2 exterior a 95% es estable");
 assert.ok(r2Inner95.slip>3,
  "La trasera se desplaza visiblemente incluso sin descarrilar");
 const r2Inner100=runCurve(r2Oval,1,1,1/60);
 const r2Outer100=runCurve(r2Oval,0,1,1/60);
 assert.equal(r2Inner100.crashed,true,"R2 interior no admite 100% sostenido");
 assert.equal(r2Outer100.crashed,true,"R2 exterior no admite 100% sostenido");
 assert.ok(r2Inner100.phase>=.5);
 assert.ok(r2Outer100.phase>=.5);
 // También a radios amplios, el 100 % mantenido fuerza eventualmente
 // a la guía; un único módulo corto puede atravesarse antes de perderla.
 for(const radius of [r3,r4]){
  let rear;
  st.speed=max;st.rearSlip=0;st.rearSlipVelocity=0;
  for(let i=0;i<120;i++)rear=physics.advanceRearDynamics(pose(radius),1,1/120);
  assert.equal(rear.deslot,true,"La sobrecarga a fondo afecta también a R3/R4");
  st.speed=max*.95;st.rearSlip=0;st.rearSlipVelocity=0;
  for(let i=0;i<120;i++)rear=physics.advanceRearDynamics(pose(radius),1,1/120);
  assert.equal(rear.deslot,false,"A 95 % se mantienen trazables las curvas amplias");
 }
 // El desplazamiento y el ángulo visible pivota alrededor de la guía.
 // Limpiar el estado de la última prueba de descarrilamiento antes de dibujar.
 st.deslot=null;st.penalty=0;st.rearSlip=12;
 const paintPose={x:250,y:190,h:.72,curve:1,radius:r2};
 const rendered=physics.visualCarPose(paintPose);
 const nose=98*.40;
 assert.ok(Math.hypot(
  rendered.x+nose*Math.cos(rendered.h)-(paintPose.x+nose*Math.cos(paintPose.h)),
  rendered.y+nose*Math.sin(rendered.h)-(paintPose.y+nose*Math.sin(paintPose.h)))<1e-8,
  "La guía delantera permanece en su sitio durante el derrape");
 assert.ok(Math.abs(rendered.h-paintPose.h)>.40,
  "La trasera enseña más de 23° de derrape al acumular 12 mm físicos");
 const tailOffset=98*.60;
 const tailBaseline={x:paintPose.x-tailOffset*Math.cos(paintPose.h),
  y:paintPose.y-tailOffset*Math.sin(paintPose.h)};
 const tailRendered={x:rendered.x-tailOffset*Math.cos(rendered.h),
  y:rendered.y-tailOffset*Math.sin(rendered.h)};
 const tailTravel=Math.hypot(tailRendered.x-tailBaseline.x,
  tailRendered.y-tailBaseline.y);
 assert.ok(tailTravel>39,
  "La cola se desplaza visiblemente más de 39 mm con la guía inmóvil");
 // El efecto funciona en ambos sentidos y vuelve suavemente al centro.
 st.rearSlip=-12;
 const opposite=physics.visualCarPose(paintPose);
 assert.ok(Math.abs((opposite.h-paintPose.h)+(rendered.h-paintPose.h))<1e-8,
  "La amplitud del derrape es simétrica para izquierda y derecha");
 st.rearSlip=0;
 const centered=physics.visualCarPose(paintPose);
 assert.ok(Math.hypot(centered.x-paintPose.x,centered.y-paintPose.y)<1e-8);
 assert.ok(Math.abs(centered.h-paintPose.h)<1e-8);
 st.rearSlip=6;
 const half=physics.visualCarPose(paintPose);
 assert.ok(half.h>paintPose.h&&half.h<rendered.h,
  "El derrape progresa sin saltos ni reinicios de postura");
 
 // Contraderrape de Scalextric: al salir de una curva no se borra
 // el desplazamiento de la cola. El muelle de recta la hace cruzar el
 // centro y sobrepasarlo aproximadamente a mitad de la amplitud previa.
 function checkCounterSlide(initialSlip,dt){
  Object.assign(st,{rearSlip:initialSlip,rearSlipVelocity:0,
   deslot:null,penalty:0,speed:max*.80});
  const start=physics.visualCarPose(paintPose);
  let maxReverse=0,crossed=false,first=null,firstCrossSec=null,peakSec=0;
  let settledAtHalfSecond=null;
  const samples=Math.round(1.5/dt);
  for(let i=0;i<samples;i++){
   const rear=physics.advanceRearDynamics({curve:0},1,dt);
   if(i===0)first=rear.slipMm;
   const reverse=-Math.sign(initialSlip)*rear.slipMm;
   if(reverse>0){
    crossed=true;
    if(firstCrossSec===null)firstCrossSec=(i+1)*dt;
   }
   if(reverse>maxReverse){maxReverse=reverse;peakSec=(i+1)*dt;}
   if(settledAtHalfSecond===null&&(i+1)*dt>=.5)
    settledAtHalfSecond=Math.abs(rear.slipMm);
  }
  assert.ok(Math.abs(first-initialSlip)<2,
   "El latigazo se calcula por aceleración real, no por cambio instantáneo de postura");
  assert.ok(crossed,"La trasera cruza la línea central al iniciar recta");
  assert.ok(maxReverse>=Math.abs(initialSlip)*.40&&
   maxReverse<=Math.abs(initialSlip)*.60,
   "El contraderrape alcanza aproximadamente la mitad hacia el otro lado");
  assert.ok(firstCrossSec<=.085,
   "La trasera cruza el eje en menos de 85 ms: latigazo ágil");
  assert.ok(peakSec>=.09&&peakSec<=.145,
   "El primer pico del contraderrape se alcanza hacia los 120 ms");
  assert.ok(settledAtHalfSecond<.65,
   "El latigazo se apaga rápidamente, sin bamboleo prolongado");
  assert.ok(Math.abs(st.rearSlip)<.4,
   "Tras el rebote la cola vuelve casi a la línea central");
  assert.ok(Math.abs(start.h-paintPose.h)>.20,
   "La recuperación parte del derrape visual real");
  return{amplitude:maxReverse,peakSec,firstCrossSec};
 }
 const recoil60=checkCounterSlide(12,1/60);
 const recoil120=checkCounterSlide(12,1/120);
 assert.ok(Math.abs(recoil60.amplitude-recoil120.amplitude)<.5,
  "La amplitud del latigazo es estable a 60 y 120 Hz");
 assert.ok(Math.abs(recoil60.peakSec-recoil120.peakSec)<1/60,
  "La rapidez del latigazo es estable a 60 y 120 Hz");
 checkCounterSlide(-12,1/120);
 // Prohibido introducir un reinicio de velocidad al entrar en recta.
 st.rearSlip=12;st.rearSlipVelocity=180;
 physics.advanceRearDynamics({curve:0},1,1/120);
 assert.ok(st.rearSlip>12,
  "La inercia lateral previa sigue moviendo la cola al entrar en recta");
 assert.ok(st.rearSlipVelocity>0,
  "El impulso no se borra al cambiar de pieza");
 st.rearSlip=0;st.rearSlipVelocity=0;
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
 console.log("SlotRace DEV 0.14.19: fuerza centrípeta, inercia trasera, derrape visible, R1-R4 a fondo arriesgadas, postura continua y 60/120 Hz — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
