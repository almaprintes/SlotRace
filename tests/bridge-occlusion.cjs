"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const geo=await import("../src/track.mjs");
 const figure=geo.buildTrack(geo.FIGURE_EIGHT);
 assert.equal(figure.closed,true);
 assert.equal(figure.valid,true);
 assert.ok(figure.bridge,"Debe existir el puente");
 assert.deepEqual(figure.bridge.overParts,[9,10,11,12]);
 const lane=figure.lanes[0];
 const dForPiece=(i)=>{
   const index=lane.nodes.findIndex((node,j)=>j>1&&node.pieceIndex===i);
   assert.ok(index>=0,"Sección presente "+i);
   return lane.lengths[index]+.1;
 };
 const lower=geo.positionAt(lane,dForPiece(1));
 const upper=geo.positionAt(lane,dForPiece(10));
 assert.equal(lower.pieceIndex,1);
 assert.equal(upper.pieceIndex,10);
 assert.equal(geo.carTrackLevel(figure,lower),"lower");
 assert.equal(geo.carTrackLevel(figure,upper),"upper");
 assert.equal(geo.carTrackLevel(geo.buildTrack(geo.STARTER),lower),"lower");
 assert.ok(Math.abs(lower.h-upper.h)>0.01);
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
   .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/,"")
   .replace('function paintCar(ctx,at,lane,paused=false){','function paintCar(ctx,at,lane,paused=false){window.__drawLog.push("car");')
   .replace('function paintContinuousTrack(ctx,track,editing){','function paintContinuousTrack(ctx,track,editing){window.__drawLog.push("base");')
   .replace('function paintBridgeCrossing(ctx,track){','function paintBridgeCrossing(ctx,track){window.__drawLog.push("bridge");');
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 function node(id){
   return{id,children:[],listeners:{},style:{},dataset:{},textContent:"",value:"0",hidden:false,disabled:false,
     width:390,height:600,clientWidth:260,
     classList:{add(){},remove(){},toggle(){}},
     addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);},
     setAttribute(){},setPointerCapture(){},appendChild(el){this.children.push(el);},
     getBoundingClientRect(){return{left:0,top:0,right:390,bottom:600,width:390,height:600}},
     querySelectorAll(){return this.children},
     querySelector(sel){if(sel===".qty")return this.qty??=node("qty");if(sel===".grip")return this.grip??=node("grip");return null;}
   };
 }
 const elements=new Map(ids.map(id=>[id,node(id)]));
 const ctx=new Proxy({}, {get(target,key){if(key==="createLinearGradient")return()=>({addColorStop(){}});return()=>{};},
   set(target,key,value){target[key]=value;return true;}});
 for(const id of ["editCanvas","raceCanvas"])elements.get(id).getContext=()=>ctx;
 const document={getElementById:id=>elements.get(id),createElement:()=>node("palette"),addEventListener(){},hidden:false};
 const window={devicePixelRatio:1,innerWidth:390,innerHeight:844,__drawLog:[],
   matchMedia:()=>({matches:true}),setTimeout:fn=>fn(),addEventListener(){}};
 let now=0;const frames=[];
 const storage=new Map();
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const keys=Object.keys(geo),values=keys.map(k=>geo[k]);
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",source)(
  ...values,document,window,localStorage,{now:()=>now},fn=>frames.push(fn),class{observe(){}}
 );
 const game=window.slotraceLab;
 assert.equal(game.state.track.valid,true);
 game.openRace();
 const render=(distance,time)=>{
  game.state.distance=distance;
  window.__drawLog.length=0;
  // Puede haber un fotograma de cierre de la pantalla de carga antes
  // del siguiente fotograma de juego; esperar al render verdadero.
  let attempts=0;
  while(!window.__drawLog.length&&attempts++<5){
   const next=frames.shift();
   assert.ok(next,"Animación pendiente");
   now=time;next(now);
  }
  assert.ok(window.__drawLog.length,"El escenario debe dibujarse");
  return window.__drawLog.slice();
 };
 // La máscara del puente sólo cubre el tramo central, no la diagonal entera.
 assert.match(source,/const halfLength=185/,"Se usa un puente local de anchura limitada");
 assert.match(source,/paintContinuousTrack\(ctx,track,mode==="build"\)/,"Una única capa continua para todas las piezas");
 const groundOrder=render(dForPiece(1),16);
 assert.deepEqual(groundOrder,["base","car","bridge"],
   "El coche inferior se pinta antes del puente y queda oculto bajo él");
 const upperOrder=render(dForPiece(10),32);
 assert.deepEqual(upperOrder,["base","bridge","car"],
   "El coche elevado se pinta después del puente y queda encima");
 console.log("SlotRace DEV 0.7.0 bridge occlusion: inferior bajo puente y superior encima, sin salto de trayectoria — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
