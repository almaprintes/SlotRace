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
 const recipe=["S350","S175",...Array(4).fill("R2_45R"),
   "S350","S175",...Array(4).fill("R2_45R")];
 const types=[...recipe.slice(2),...recipe.slice(0,2)];
 const full=geo.buildTrack(types,geo.START);
 assert.equal(full.valid,true,"El óvalo con 175 mm es una receta cerrada");
 assert.equal(types.at(-1),"S175");
 const parts=full.parts.slice(0,-1),endPiece=full.parts.at(-1);
 function openPieces(){
  game.changeTypes([],"Preparar tramo abierto",[],geo.START);
  st.loose=parts.map((part,i)=>({
   id:part.id,x:part.start.x,y:part.start.y,h:part.start.h,
   magnetGroup:"oval-chain",magnetOrder:i
  }));
  st.selection=-1;st.looseSelection=0;st.selectedGroup="oval-chain";
  st.selectionMode="group";
 }
 openPieces();
 const measured=game.puzzle.measureOpenGap();
 assert.equal(measured.fromKey,"oval-chain","Medir sólo el hueco real de la cadena");
 assert.equal(measured.toKey,"oval-chain");
 assert.equal(measured.exact,true,"Dos conectores del mismo tramo alineados");
 assert.ok(Math.abs(measured.forward-175)<1e-6,"Hueco reproducido de 175 mm");
 assert.match(elements.get("gapInfo").textContent,/HUECO DEL MISMO TRAMO/);
 // La última pieza queda cerca del hueco; debe elegir la unión que
 // cierre ambos extremos y convertirse en circuito sin pulsar Iniciar.
 const sourcePart={id:"S175",
  x:endPiece.start.x+12,y:endPiece.start.y-9,h:endPiece.start.h};
 st.loose.push(sourcePart);
 const last=st.loose.length-1,magnet=game.puzzle.bestMagnet(last);
 assert.ok(magnet,"Detectar el conector del tramo");
 assert.equal(magnet.closesLoop,true,"Priorizar el encaje que cierra ambos extremos");
 const historyBefore=st.history.length;
 assert.equal(game.puzzle.snapLoose(last),true);
 assert.deepEqual(st.types,types,"Convertir todo el óvalo a pista montada");
 assert.equal(st.loose.length,0,"La pieza ya no queda suelta");
 assert.equal(st.track.valid,true,"Pista cerrada apta para correr");
 assert.equal(st.track.gap<1e-6,true,"No estirar piezas ni mover conectores");
 assert.equal(st.history.length,historyBefore+1,"Una entrada de deshacer");
 const savedCircuit=JSON.parse(saved.get("slotrace-lab-10"));
 assert.deepEqual(savedCircuit.types,types);
 game.undo();
 assert.equal(st.loose.length,types.length,"Deshacer recupera montaje físico completo");
 assert.equal(st.types.length,0);
 // Cerrar exacto también debe funcionar sin pulsar Iniciar antes:
 // añade la recta proporcional que falta en la cadena completa.
 openPieces();
 game.puzzle.selectByTap("loose",0); // Actualizar los controles tras el montaje simulado.
 assert.equal(elements.get("autoClose").disabled,false,
  "El botón Cerrar exacto no se bloquea por tener piezas sueltas");
 game.puzzle.closeExactly();
 assert.equal(st.track.valid,true,"Cierre asistido desde cadena suelta");
 assert.equal(st.types.at(-1),"S175","Añadir la misma pieza exacta del catálogo");
 assert.equal(st.loose.length,0);
 // Si se trata de dos tramos separados, 175 mm NO es aún un cierre.
 game.changeTypes([],"Uniones independientes",[],geo.START);
 st.loose=[
  {id:"S175",x:500,y:450,h:0},
  {id:"S175",x:850,y:450,h:0}
 ];
 st.selection=-1;st.looseSelection=0;st.selectedGroup=null;
 const between=game.puzzle.measureOpenGap();
 assert.ok(between,"Distancia entre dos tramos medible");
 assert.notEqual(between.fromKey,between.toKey);
 assert.match(elements.get("gapInfo").textContent,/NO garantiza cerrar el circuito/);
 game.puzzle.closeExactly();
 assert.equal(st.types.length,0,"No declarar cerrado un conjunto de piezas separadas");
 // No aceptar un cierre engañoso si la última orientación difiere.
 openPieces();
 st.loose.at(-1).h+=Math.PI/4;
 assert.equal(game.puzzle.loopFromLooseGroup(0),null,
   "No cerrar una cadena con un conector interno mal orientado");
 // La nueva solución de 12,5 mm no usa módulo diminuto: corrige
 // longitudes del mismo trazado con una recta de 75 y otra de 87,5.
 const balancing=["S075",...Array(4).fill("R2_45R"),
  "S0875",...Array(4).fill("R2_45R")];
 const openTrack=geo.buildTrack(balancing,geo.START);
 assert.equal(openTrack.closed,false);
 assert.ok(Math.abs(openTrack.gap-12.5)<1e-7);
 game.changeTypes([],"Equilibrio entre rectas",[],geo.START);
 st.loose=openTrack.parts.map((part,i)=>({
  id:part.id,x:part.start.x,y:part.start.y,h:part.start.h,
  magnetGroup:"offset-test",magnetOrder:i
 }));
 st.looseSelection=0;st.selectedGroup="offset-test";st.selection=-1;
 const measurement=game.puzzle.measureOpenGap();
 assert.ok(measurement,"Hueco de 12,5 mm entre extremos del tramo");
 assert.match(elements.get("gapInfo").textContent,/CIERRE POR COMPENSACIÓN/);
 assert.match(elements.get("gapInfo").textContent,/75 → 87,5 mm/);
 game.puzzle.closeExactly();
 assert.equal(st.loose.length,0);
 assert.equal(st.track.valid,true);
 assert.equal(st.types.length,balancing.length,"Sin añadir ninguna pieza");
 assert.ok(!st.types.includes("S0125"),"La recta diminuta no se crea automáticamente");
 assert.equal(JSON.parse(saved.get("slotrace-lab-10")).types.length,balancing.length);
 game.undo();
 assert.equal(st.loose.length,balancing.length,"El deshacer restaura el tramo original");
 console.log("DEV 0.12.1: cierre doble 175 mm, compensación 12,5 sin pieza nueva y deshacer OK");
})().catch(e=>{console.error(e);process.exitCode=1;});
