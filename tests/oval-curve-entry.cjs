"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const geom=await import("../src/track.mjs");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
   .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/,"");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 function el(id){
  return{id,children:[],listeners:{},dataset:{},style:{},textContent:"",hidden:false,disabled:false,
    width:390,height:650,clientWidth:66,value:"0",
    classList:{add(){},remove(){},toggle(){}},setAttribute(){},setPointerCapture(){},
    appendChild(node){this.children.push(node);},
    getBoundingClientRect(){return{left:0,top:0,right:390,bottom:650,width:390,height:650}},
    querySelectorAll(){return this.children},
    querySelector(sel){if(sel===".qty")return this.qty??=el("qty");if(sel===".grip")return this.grip??=el("grip");return null;},
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
 const keys=Object.keys(geom),values=keys.map(k=>geom[k]);
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",source)(
  ...values,document,window,localStorage,{now:()=>clock},requestAnimationFrame,class{observe(){}}
 );
 const game=window.slotraceLab;
 assert.equal(game.version,"DEV 0.5.6");
 game.changeTypes(geom.STARTER.slice(),"Óvalo de prueba",[]);
 game.openRace();
 const st=game.state,physics=game.physics;
 assert.equal(st.track.valid,true);
 assert.equal(st.track.bridge,null,"No elevated crossing in the oval");
 const lane=st.track.lanes[0];
 const first=lane.nodes.findIndex(p=>p.pieceIndex===2);
 const last=lane.nodes.findLastIndex(p=>p.pieceIndex===2);
 const lastTurn=lane.nodes.findLastIndex(p=>p.pieceIndex===5);
 const nextStraight=lane.nodes.findIndex(p=>p.pieceIndex===6);
 assert.ok(first>1&&last>first&&lastTurn>last&&nextStraight>lastTurn);
 const curveStart=lane.lengths[first-1];
 const curveLength=lane.lengths[last]-curveStart;
 const turnEnd=lane.lengths[lastTurn];
 assert.ok(curveLength>170&&curveLength<260,"Each R2 45-degree segment has a sensible length");
 assert.equal(geom.positionAt(lane,curveStart+1).curve,1,"Curvature begins on the curve");
 assert.equal(geom.positionAt(lane,lane.lengths[nextStraight-1]+1).curve,0,
   "The first few mm of the next STRAIGHT cannot inherit curvature from the preceding curve");
 assert.equal(physics.curveLimit(geom.positionAt(lane,lane.lengths[nextStraight-1]+1),0),Infinity,
   "No curve limit applied while genuinely on a straight");
 function testThrottle(gas,dt){
  Object.assign(st,{
   gas,speed:gas*physics.DRIVE.topSpeed,
   distance:curveStart+1,cornerDistance:0,cornerDirection:0,gripDebt:0,
   penalty:0,deslot:null,drift:0,driftDirection:0,seconds:0,run:true
  });
  let maxDrift=0,steps=0;
  for(;steps<400&&st.penalty===0&&st.distance<turnEnd;steps++){
   physics.simulationStep(dt);
   maxDrift=Math.max(maxDrift,st.drift);
   if(steps===0){
    assert.equal(st.penalty,0,"A curve must never eject the car at the first edge");
    assert.ok(st.distance>curveStart,"The car must begin to enter the curve");
   }
  }
  return{
   crashed:st.penalty>0,advance:st.distance-curveStart,
   maxDrift,steps,gripDebt:st.gripDebt,travel:st.cornerDistance
  };
 }
 const safe=testThrottle(.65,1/60);
 assert.equal(safe.crashed,false,"65% may drift but must finish the full bend");
 assert.ok(safe.advance>=turnEnd-curveStart,"The 65% case must reach the end of the turn");
 assert.ok(safe.maxDrift>.25,"65% should show visible controlled drift");
 const excess=testThrottle(.70,1/60);
 assert.equal(excess.crashed,true,"70% eventually causes an off-track spin if maintained");
 assert.ok(excess.advance>curveLength*.50,
   "70% must pass the middle of its FIRST curve piece, not derail on the entrance");
 assert.ok(excess.advance<curveLength*2.5,
   "70% should still derail in the early-to-middle portion of the bend");
 const fine=testThrottle(.70,1/120);
 assert.equal(fine.crashed,true,"Excessive throttle must also derail at 120 Hz");
 assert.ok(Math.abs(fine.advance-excess.advance)<25,
   "Derail distance should not substantially change with simulation frame rate");
 // Lifting the throttle inside a curve recovers lateral grip rather
 // than punishing the driver after the speed becomes safe.
 Object.assign(st,{gas:.65,speed:.65*physics.DRIVE.topSpeed,distance:curveStart+80,
  cornerDirection:1,cornerDistance:80,gripDebt:.75,penalty:0,deslot:null,run:true});
 const original=st.gripDebt;
 for(let i=0;i<8;i++)physics.simulationStep(1/60);
 assert.equal(st.penalty,0,"Easing off must avoid a delayed penalty");
 assert.ok(st.gripDebt<original,"Reduced throttle must regenerate grip");
 console.log("SlotRace DEV 0.5.6: oval 65% stable drift, 70% delayed curve exit, straight boundaries and 60/120Hz equivalence — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
