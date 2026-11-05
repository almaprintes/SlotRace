"use strict";
// Comportamiento de mesa-puzzle. Ejecutar con node tests/puzzle-table.cjs.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const geo=await import("../src/track.mjs");
 const blueprint=await import("../src/blueprint.mjs");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
  .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/gm,"")
  .replace("function paintSeam(ctx,p){","function paintSeam(ctx,p){window.__seamLog.push(p);")
  .replace("function strokePath(ctx,points,color,width){","function strokePath(ctx,points,color,width){if(color===\"#0c1518\"&&width===TRACK_WIDTH+19)window.__shadowLog.push(points.length);");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 function node(id){
  return{id,children:[],listeners:{},dataset:{},style:{},textContent:"",innerHTML:"",disabled:false,hidden:false,
   width:390,height:600,clientWidth:390,value:"0",
   classList:{add(){},remove(){},toggle(){},contains(){return false}},
   setAttribute(){},setPointerCapture(){},appendChild(n){this.children.push(n);},
   addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},
   getBoundingClientRect(){return{left:0,top:0,width:390,height:600,right:390,bottom:600}},
   querySelectorAll(){return this.children},
   querySelector(sel){
    if(sel===".bridge-kit-cta")return this.kitCta??=node("kit-cta");if(sel===".qty")return this.qty??=node("qty");
    if(sel===".grip"||sel===".foam-drag-grip")return this.grip??=node("grip");
    return null;
   }};
 }
 const elements=new Map(ids.map(id=>[id,node(id)]));
 const ctx=new Proxy({}, {get(_,k){return k==="createLinearGradient"?()=>({addColorStop(){}}):()=>{}},
  set(obj,k,v){obj[k]=v;return true;}});
 for(const id of ["editCanvas","raceCanvas"])elements.get(id).getContext=()=>ctx;
 const document={getElementById:id=>elements.get(id),createElement:()=>node("card"),
  addEventListener(){},hidden:false};
 const window={devicePixelRatio:1,innerWidth:390,innerHeight:844,__seamLog:[],__shadowLog:[],
  matchMedia:()=>({matches:true}),addEventListener(){},setTimeout:fn=>fn()};
 const saved=new Map(),localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 const callbacks=[];const requestAnimationFrame=fn=>callbacks.push(fn);
 const keys=[...Object.keys(geo),...Object.keys(blueprint)],values=keys.map(k=>Object.hasOwn(geo,k)?geo[k]:blueprint[k]);
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",source)(
  ...values,document,window,localStorage,{now:()=>0},requestAnimationFrame,class{observe(){}}
 );
 const game=window.slotraceLab,st=game.state;
 game.openWorkshop();
 assert.equal(game.version,"DEV 0.10.1");
 const step=Math.PI/8,deg=n=>n*Math.PI/180;
 const event=(x,y,pointerId)=>({clientX:x,clientY:y,pointerId,preventDefault(){}});
 const close=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,
  "Esperado "+b+" y obtenido "+a);
 function screenOf(point){
  const b=st.workBoard,scale=Math.min((390-16)/b.height,(600-16)/b.width);
  return{x:195-scale*(point.y-(b.top+b.bottom)/2),
   y:300+scale*(point.x-(b.left+b.right)/2)};
 }
 function beginTurn(at,a=71,b=72){
  const on=screenOf(at);
  game.puzzle.canvasPointerDown(event(on.x,on.y,a));
  assert.ok(st.pointer.get(a).looseIndex>=0||st.pointer.get(a).trackIndex>=0,
   "El primer dedo toca una pieza real");
  game.puzzle.canvasPointerDown(event(on.x+72,on.y,b));
  assert.equal(st.pinch.mode,"rotate","Dos dedos sobre una pieza activan giro");
  return {x:on.x,y:on.y,a,b};
 }
 function turnTo(start,angle){
  game.puzzle.canvasPointerMove(event(start.x+72*Math.cos(angle),
   start.y+72*Math.sin(angle),start.b));
 }
 function finishTurn(start){
  game.puzzle.canvasPointerEnd(event(start.x+72,start.y,start.b));
  game.puzzle.canvasPointerEnd(event(start.x,start.y,start.a));
  assert.equal(st.pointer.size,0);
  assert.equal(st.pinch,null);
 }
 st.workBoard={left:0,top:0,right:2200,bottom:1450,width:2200,height:1450};
 st.camera={zoom:1,panX:0,panY:0};
 game.changeTypes([],"Mesa de prueba para giro exacto",[],geo.START);
 st.loose=[
  {id:"S350",x:500,y:500,h:0,magnetGroup:"test-turn",magnetOrder:0},
  {id:"S175",x:850,y:500,h:0,magnetGroup:"test-turn",magnetOrder:1}
 ];
 st.selectedGroup=null;st.selectionMode="group";st.looseSelection=-1;st.selection=-1;
 const initial=st.loose.map(p=>({...p}));
 const historySize=st.history.length;
 const start=beginTurn({x:650,y:500});
 turnTo(start,deg(8));
 close(st.loose[0].h,0);
 turnTo(start,deg(16));
 close(st.loose[0].h,step);
 close(st.loose[1].h,step);
 turnTo(start,deg(38));
 close(st.loose[0].h,2*step);
 turnTo(start,deg(-16));
 close(st.loose[0].h,-step);
 const joinedA=geo.positionOnPiece(st.loose[0],st.loose[0].id,1);
 close(joinedA.x,st.loose[1].x,1e-7);
 close(joinedA.y,st.loose[1].y,1e-7);
 assert.equal(st.loose[1].magnetGroup,"test-turn","Grupo magnético conservado");
 assert.equal(st.history.length,historySize+1,"Un solo deshacer por giro completo");
 finishTurn(start);
 game.undo();
 close(st.loose[0].x,initial[0].x);
 close(st.loose[1].h,0);
 game.redo();
 close(st.loose[0].h,-step);

 // El mismo giro funciona en circuitos ya iniciados y conserva las
 // conexiones matemáticas entre todos los módulos.
 game.changeTypes(["S350","R2_45R","S175"],"Prueba tramo iniciado",[],{x:650,y:500,h:0});
 st.camera={zoom:1,panX:0,panY:0};
 st.selectedGroup=null;st.selectionMode="group";st.selection=-1;st.looseSelection=-1;
 const beforeMain={...st.origin},partsBefore=st.types.slice();
 const mainStart=beginTurn({x:780,y:500},81,82);
 turnTo(mainStart,deg(19));
 close(st.origin.h,step);
 assert.deepEqual(st.types,partsBefore,"El giro completo conserva todas las piezas montadas");
 const firstEnd=geo.positionOnPiece(st.track.parts[0].start,st.track.parts[0].id,1);
 close(firstEnd.x,st.track.parts[1].start.x);
 close(firstEnd.y,st.track.parts[1].start.y);
 finishTurn(mainStart);
 game.undo();
 close(st.origin.x,beforeMain.x);
 close(st.origin.y,beforeMain.y);
 close(st.origin.h,beforeMain.h);

 // Una pieza explícitamente seleccionada se puede separar y girar,
 // sin girar a la fuerza todo el resto del trazado.
 game.puzzle.selectByTap("main",1);
 game.puzzle.selectByTap("main",1);
 assert.equal(st.selectionMode,"piece");
 const mid=geo.positionOnPiece(st.track.parts[1].start,st.track.parts[1].id,.5);
 const beforePiece=st.types.slice();
 const pieceStart=beginTurn(mid,91,92);
 turnTo(pieceStart,deg(18));
 assert.equal(st.types.length,1,"La pieza individual se separa al girar");
 assert.ok(st.loose.length>=2,"Resto del tramo conservado como piezas sueltas");
 close(st.loose[0].h,st.track.parts[0].end.h+step,0.0000001);
 finishTurn(pieceStart);
 game.undo();
 assert.deepEqual(st.types,beforePiece,"Deshacer recupera toda la cadena montada");

 // Si ambos dedos empiezan en una zona vacía, se mantiene el zoom.
 game.changeTypes([],"Prueba de zoom libre",[],geo.START);
 st.camera={panX:0,panY:0,zoom:1};
 game.puzzle.canvasPointerDown(event(22,22,101));
 game.puzzle.canvasPointerDown(event(122,22,102));
 assert.equal(st.pinch.mode,"camera");
 game.puzzle.canvasPointerMove(event(162,22,102));
 close(st.camera.zoom,1.4);
 game.puzzle.canvasPointerEnd(event(162,22,102));
 game.puzzle.canvasPointerEnd(event(22,22,101));
 assert.equal(st.loose.length,0,"Zoom sin creación accidental de piezas");

 // Añadir un segundo dedo mientras arrastramos una pista no debe perder
 // el movimiento original ni interceptar su evento de guardado.
 game.changeTypes(["S350"],"Movimiento previo al segundo dedo",[],{x:650,y:500,h:0});
 st.camera={panX:0,panY:0,zoom:1};
 const dragPoint=screenOf({x:775,y:500});
 const originBefore={...st.origin};
 game.puzzle.canvasPointerDown(event(dragPoint.x,dragPoint.y,201));
 game.puzzle.canvasPointerMove(event(dragPoint.x+35,dragPoint.y+4,201));
 assert.equal(st.pointer.get(201).dragged,true,"El primer dedo ya está arrastrando");
 game.puzzle.canvasPointerDown(event(dragPoint.x+90,dragPoint.y+5,202));
 assert.equal(st.pinch.mode,"camera","Segundo dedo sobre un arrastre no inicia rotación");
 assert.equal(st.pointer.get(201).consumed,undefined,"No cancelar el arrastre activo");
 game.puzzle.canvasPointerEnd(event(dragPoint.x+90,dragPoint.y+5,202));
 game.puzzle.canvasPointerEnd(event(dragPoint.x+35,dragPoint.y+4,201));
 assert.notDeepEqual(st.origin,originBefore,"Se conserva la traslación original");
 const savedDrag=JSON.parse(saved.get("slotrace-lab-10"));
 close(savedDrag.origin.x,st.origin.x);
 close(savedDrag.origin.y,st.origin.y);

 console.log("SlotRace DEV 0.10.1: giro dos dedos 22,5°, tramo, pieza, zoom, arrastre y deshacer — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
