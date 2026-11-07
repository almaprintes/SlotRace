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
 assert.equal(game.version,"DEV 0.14.44");
 assert.match(html,/id="rotateCCW"/,"Giro antihorario presente");
 assert.match(html,/id="rotate"/,"Giro horario presente");
 const step=Math.PI/8;
 const close=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol,
  "Esperado "+b+" obtenido "+a);
 const event=(x,y,pointerId)=>({clientX:x,clientY:y,pointerId,preventDefault(){}});
 function screenOf(point){
  const b=st.workBoard,scale=Math.min((390-16)/b.height,(600-16)/b.width);
  return{x:195-scale*(point.y-(b.top+b.bottom)/2),
   y:300+scale*(point.x-(b.left+b.right)/2)};
 }
 st.workBoard={left:0,top:0,right:2200,bottom:1450,width:2200,height:1450};
 st.camera={zoom:1,panX:0,panY:0};
 game.changeTypes([],"Giros directos",[],geo.START);
 st.loose=[
  {id:"S350",x:500,y:500,h:0,magnetGroup:"test-turn",magnetOrder:0},
  {id:"S175",x:850,y:500,h:0,magnetGroup:"test-turn",magnetOrder:1}
 ];
 st.selection=-1;st.looseSelection=-1;st.selectionMode="group";st.selectedGroup=null;
 game.puzzle.selectByTap("loose",0);
 assert.equal(st.selectionMode,"piece","Un toque selecciona una sola pieza");
 const centerBefore=geo.positionOnPiece(st.loose[0],st.loose[0].id,.5);
 const initial=st.loose.map(p=>({...p}));
 const beforeHistory=st.history.length;
 elements.get("rotateCCW").listeners.click[0]();
 close(st.loose[0].h,-step);
 close(st.loose[1].h,0);
 const centerAfter=geo.positionOnPiece(st.loose[0],st.loose[0].id,.5);
 close(centerAfter.x,centerBefore.x);
 close(centerAfter.y,centerBefore.y);
 assert.equal(st.history.length,beforeHistory+1,"Un solo deshacer por pulsación");
 game.undo();
 close(st.loose[0].h,0);
 close(st.loose[1].h,0);
 game.redo();
 close(st.loose[0].h,-step);
 // Deshacer/rehacer conserva piezas y limpia la selección: se vuelve a
 // tocar la pieza antes de girar en sentido contrario.
 game.puzzle.selectByTap("loose",0);
 elements.get("rotate").listeners.click[0]();
 close(st.loose[0].h,0); // Giro horario corrige el antihorario.
 assert.equal(st.loose.length,2,"Las piezas no desaparecen al girar");

 // El botón «Tramo» selecciona de forma explícita la cadena completa.
 game.changeTypes(["S350","R2_45R","S175"],"Prueba de tramo",[],{x:650,y:500,h:0});
 st.camera={zoom:1,panX:0,panY:0};
 game.puzzle.selectByTap("main",1);
 assert.equal(st.selectionMode,"piece");
 assert.equal(game.activateGroupMove(),true);
 assert.equal(st.selectionMode,"group");
 const beforeMain={...st.origin},beforeTypes=st.types.slice();
 elements.get("rotate").listeners.click[0]();
 close(st.origin.h,beforeMain.h+step);
 assert.deepEqual(st.types,beforeTypes,"Girar tramo conserva la pista unida");
 game.undo();
 close(st.origin.x,beforeMain.x);
 close(st.origin.y,beforeMain.y);
 close(st.origin.h,beforeMain.h);
 // Botón de giro sobre una pieza conectada separa solamente esa pieza.
 game.puzzle.selectByTap("main",1);
 assert.equal(st.selectionMode,"piece");
 const beforePiece=st.types.slice();
 elements.get("rotateCCW").listeners.click[0]();
 assert.equal(st.types.length,1,"Girar una pieza montada la desancla");
 assert.ok(st.loose.length>=2,"El resto se conserva sobre la mesa");
 game.undo();
 assert.deepEqual(st.types,beforePiece,"Deshacer restaura el montaje completo");

 // Un pellizco sobre una pieza SIEMPRE hace zoom y jamás la gira.
 game.changeTypes([],"Zoom sin giro accidental",[],geo.START);
 st.loose=[{id:"S350",x:650,y:500,h:0}];
 st.camera={panX:0,panY:0,zoom:1};
 const on=screenOf({x:750,y:500});
 game.puzzle.canvasPointerDown(event(on.x,on.y,101));
 game.puzzle.canvasPointerDown(event(on.x+72,on.y,102));
 assert.equal(st.pinch.mode,"camera","Dos dedos amplían, no giran");
 game.puzzle.canvasPointerMove(event(on.x+108,on.y,102));
 close(st.camera.zoom,1.5);
 game.puzzle.canvasPointerEnd(event(on.x+108,on.y,102));
 game.puzzle.canvasPointerEnd(event(on.x,on.y,101));
 close(st.loose[0].h,0);
 assert.equal(st.loose.length,1);

 // Un segundo dedo añadido durante un arrastre no reinicia ni pierde
 // el movimiento del dedo original.
 game.changeTypes(["S350"],"Arrastre de tramo",[],{x:650,y:500,h:0});
 st.camera={panX:0,panY:0,zoom:1};
 const dragPoint=screenOf({x:775,y:500});
 const originBefore={...st.origin};
 game.puzzle.canvasPointerDown(event(dragPoint.x,dragPoint.y,201));
 game.puzzle.canvasPointerMove(event(dragPoint.x+35,dragPoint.y+4,201));
 assert.equal(st.pointer.get(201).dragged,true);
 game.puzzle.canvasPointerDown(event(dragPoint.x+90,dragPoint.y+5,202));
 assert.equal(st.pinch.mode,"camera","Segundo dedo no activa un giro");
 assert.equal(st.pointer.get(201).consumed,undefined);
 game.puzzle.canvasPointerEnd(event(dragPoint.x+90,dragPoint.y+5,202));
 game.puzzle.canvasPointerEnd(event(dragPoint.x+35,dragPoint.y+4,201));
 assert.notDeepEqual(st.origin,originBefore);
 const savedDrag=JSON.parse(saved.get("slotrace-lab-10"));
 close(savedDrag.origin.x,st.origin.x);
 close(savedDrag.origin.y,st.origin.y);
 console.log("SlotRace DEV 0.14.44: giro horario y antihorario por botones, pieza o tramo, zoom sin giros accidentales y deshacer — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
