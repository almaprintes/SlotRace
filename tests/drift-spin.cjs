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
 assert.equal(game.version,"DEV 0.13.3");
 game.openRace();
 const st=game.state,physics=game.physics;
 assert.equal(st.track.valid,true);
 assert.equal(physics.DRIVE.topSpeed,1150);
 assert.ok(physics.DRIVE.curveBase>610);
 assert.ok(physics.DRIVE.derailMultiplier>1.1);
 const lane=st.track.lanes[0];
 const match=[],piece=5;
 lane.nodes.forEach((p,i)=>{if(p.pieceIndex===piece)match.push(i)});
 assert.ok(match.length>4,"Curve exists");
 st.distance=(lane.lengths[match[2]]+lane.lengths[match.at(-3)])/2;
 const routePose=geom.positionAt(lane,st.distance);
 assert.ok(routePose.curve,"Pilot is inside curve");
 const limit=physics.curveLimit(routePose,0);
 assert.ok(limit>680,"Relaxed curve limit");
 st.gas=.60;
 st.speed=limit*.81;
 const tick=(deltaMs=16)=>{
  const before=st.seconds;
  for(let i=0;i<6;i++){
   const next=frames.shift();assert.ok(next,"An animation frame exists");
   clock+=deltaMs;next(clock);
   if(st.seconds>before)return;
  }
  throw Error("No simulation frame ran");
 };
 for(let i=0;i<8;i++)tick();
 assert.equal(st.penalty,0,"Safe drift must not cause an off-track penalty");
 assert.ok(st.drift>.08,"Near the threshold, visible drift develops smoothly");
 const p=geom.positionAt(lane,st.distance),vis=physics.visualCarPose(p);
 assert.ok(Math.abs(vis.h-p.h)>.015,"Car body yaws while rails stay fixed");
 assert.ok(Math.hypot(vis.x-p.x,vis.y-p.y)>.5,"Car tail slides slightly");
 // Una velocidad muy alta debe terminar causando un trompo, pero nunca
 // en el mismo instante del primer contacto con la curva.
 const limitNow=physics.curveLimit(p,0);
 st.speed=limitNow*1.35;st.gas=1;
 for(let i=0;i<25&&st.penalty===0;i++)tick();
 assert.equal(st.penalty,3,"Accumulated excessive speed eventually causes a spin");
 assert.ok(st.deslot,"The spin state is present");
 const spinStartPose=geom.positionAt(lane,st.distance);
 const fixedDistance=st.distance,lap=st.lap;
 for(let i=0;i<12;i++)tick(50);
 assert.ok(st.deslot.elapsed>.4,"The spin animation advances while immobilized");
 assert.equal(st.distance,fixedDistance,"No progress during off-track penalty");
 assert.equal(st.lap,lap,"No invalidation of the lap");
 const spin=physics.visualCarPose(geom.positionAt(lane,st.distance));
 assert.ok(Math.abs(spin.h-spinStartPose.h)>1,"Car turns visibly during spin");
 assert.ok(Math.hypot(spin.x-spinStartPose.x,spin.y-spinStartPose.y)>30,"Car moves outward during spin");
 for(let i=0;i<60&&st.penalty>0;i++)tick(50);
 assert.equal(st.penalty,0,"Penalty finishes automatically after 3 seconds");
 assert.equal(st.deslot,null,"Car snaps back to slot after animation");
 assert.equal(st.distance,fixedDistance,"Car returns to same point");
 assert.equal(st.lap,lap,"Lap remains valid");
 assert.ok(st.seconds>3,"Chronometer continues throughout the penalty");
 console.log("SlotRace DEV 0.13.3: increased speed, safe drift/yaw, animated spin, 3s penalty, fixed lap progress — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
