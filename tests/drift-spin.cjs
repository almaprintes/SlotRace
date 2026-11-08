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
 assert.equal(game.version,"DEV 0.14.58");
 const r1Oval=["S350","S350",...Array(4).fill("R1_45R"),
  "S350","S350",...Array(4).fill("R1_45R")];
 game.openWorkshop();
 game.changeTypes(r1Oval,"Curva de prueba R1",[]);
 assert.equal(game.openRace(),true);
 const st=game.state,physics=game.physics;
 assert.equal(st.raceStarted,false);
 assert.equal(physics.DRIVE.topSpeed,1150);
 const lane=st.track.lanes[1];
 const first=lane.nodes.findIndex(p=>p.pieceIndex===2);
 assert.ok(first>0);
 const start=lane.lengths[first-1]+1;
 st.lane=1;st.distance=start;st.gas=.93;st.speed=.93*physics.DRIVE.topSpeed;
 const tick=(ms=16)=>{
  const before=st.seconds;
  for(let i=0;i<6;i++){
   const frame=frames.shift();assert.ok(frame,"Se generó un fotograma");
   clock+=ms;frame(clock);
   if(st.seconds>before)return;
  }
  throw Error("No avanzó la simulación");
 };
 // Un ligero exceso de agarre produce derrape progresivo, no expulsión.
 for(let i=0;i<8;i++)tick();
 assert.equal(st.penalty,0,"No se sale al 93% nada más entrar");
 assert.ok(st.rearSlip>1,"La trasera acumula desplazamiento lateral");
 assert.ok(st.drift>0,"El deslizamiento se muestra visualmente");
 const p=geom.positionAt(lane,st.distance),vis=physics.visualCarPose(p);
 assert.ok(Math.abs(vis.h-p.h)>.015,
  "El coche gira por el ángulo real de la cola");
 assert.ok(Math.hypot(vis.x-p.x,vis.y-p.y)>.2,
  "El centro del coche inicia suavemente el desplazamiento lateral");
 // Reinicio físico solo para ensayar el exceso sostenido a fondo.
 Object.assign(st,{distance:start,gas:1,speed:physics.DRIVE.topSpeed,
  rearSlip:0,rearSlipVelocity:0,cornerDistance:0,cornerDirection:0,
  gripDebt:0,penalty:0,deslot:null});
 for(let i=0;i<50&&st.penalty===0;i++)tick();
 assert.equal(st.penalty,3,"La cola supera el ángulo máximo y desencarrila");
 assert.ok(st.deslot,"Se conserva la animación de salida");
 assert.equal(st.rearSlip,0,"La cola se reinicia durante la recolocación");
 const fixedDistance=st.distance,lap=st.lap;
 const spinStartPose=geom.positionAt(lane,st.distance);
 for(let i=0;i<12;i++)tick(50);
 assert.ok(st.deslot.elapsed>.4);
 assert.equal(st.distance,fixedDistance,"Durante la penalización no avanza");
 assert.equal(st.lap,lap,"La vuelta no se invalida");
 const spin=physics.visualCarPose(geom.positionAt(lane,st.distance));
 assert.ok(Math.abs(spin.h-spinStartPose.h)>1);
 assert.ok(Math.hypot(spin.x-spinStartPose.x,spin.y-spinStartPose.y)>30);
 for(let i=0;i<80&&st.penalty>0;i++)tick(50);
 assert.equal(st.penalty,0);
 assert.equal(st.deslot,null);
 assert.equal(st.distance,fixedDistance);
 assert.ok(st.seconds>3);
 console.log("SlotRace DEV 0.14.58: derrape por masa y radio, salida R1 a fondo y penalización de 3 s — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
