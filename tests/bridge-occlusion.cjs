"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const geo=await import("../src/track.mjs");
 const blueprint=await import("../src/blueprint.mjs");
 const figure=geo.buildTrack(geo.FIGURE_EIGHT);
 assert.equal(figure.closed,true);
 assert.equal(figure.valid,true);
 assert.ok(figure.bridge,"Debe existir el puente");
 assert.deepEqual(figure.bridge.overParts,[7]);
 const lane=figure.lanes[0];
 const dForPiece=(i)=>{
   const index=lane.nodes.findIndex((node,j)=>j>1&&node.pieceIndex===i);
   assert.ok(index>=0,"Sección presente "+i);
   return lane.lengths[index]+.1;
 };
 const lower=geo.positionAt(lane,dForPiece(0));
 const upper=geo.positionAt(lane,dForPiece(7));
 assert.equal(lower.pieceIndex,0);
 assert.equal(upper.pieceIndex,7);
 assert.equal(geo.carTrackLevel(figure,lower),"lower");
 assert.equal(geo.carTrackLevel(figure,upper),"upper");
 assert.equal(geo.carTrackLevel(geo.buildTrack(geo.STARTER),lower),"lower");
 assert.ok(Math.abs(lower.h-upper.h)>0.01);
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
   .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/gm,"")
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
     querySelector(sel){if(sel===".bridge-kit-cta")return this.kitCta??=node("kit-cta");if(sel===".qty")return this.qty??=node("qty");if(sel===".grip"||sel===".foam-drag-grip")return this.grip??=node("grip");return null;}
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
 const keys=[...Object.keys(geo),...Object.keys(blueprint)],values=keys.map(k=>Object.hasOwn(geo,k)?geo[k]:blueprint[k]);
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",source)(
  ...values,document,window,localStorage,{now:()=>now},fn=>frames.push(fn),class{observe(){}}
 );
 const game=window.slotraceLab;
 game.openWorkshop();
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
 assert.match(source,/const halfLength=Math\.min\(210/,"La máscara se ajusta al cruce y no tapa toda la recta");
 assert.doesNotMatch(source.slice(source.indexOf("function paintSupportKit("),source.indexOf("function paintBridgeRampProfile(")),/fillRect\(-spec\.length\*\.5/,"El soporte no dibuja una placa separada sobre la pista");
 assert.match(source,/paintContinuousTrack\(ctx,track,mode==="build"\)/,"Una única capa continua para todas las piezas");
 const groundOrder=render(dForPiece(0),16);
 assert.deepEqual(groundOrder,["base","car","bridge"],
   "El coche inferior se pinta antes del puente y queda oculto bajo él");
 const upperOrder=render(dForPiece(7),32);
 assert.deepEqual(upperOrder,["base","bridge","car"],
   "El coche elevado se pinta después del puente y queda encima");
 // El kit manual levanta una recta de un circuito que antes se
 // consideraba cruce a nivel. El puente de la plantilla no interviene.
 const customEight=[...geo.FIGURE_EIGHT.slice(7),...geo.FIGURE_EIGHT.slice(0,7)];
 const bare=geo.buildTrack(customEight);
 assert.equal(bare.closed,true,"Ocho manual cerrado geométricamente");
 assert.equal(bare.valid,false,"Sin soportes: cruce inválido");
 const manual=geo.buildTrack(customEight,geo.START,[0]);
 assert.equal(manual.valid,true,"Un kit en la recta del cruce valida la elevación");
 assert.equal(manual.bridge.virtual,false,"Kit colocado por el jugador");
 assert.deepEqual(manual.bridge.overParts,[0],"La recta elegida pasa por arriba");
 assert.equal(manual.bridge.height,65,"Kit de 65 mm");
 const tooShort=geo.buildTrack(customEight,geo.START,[1]);
 assert.equal(tooShort.valid,false,"No elevar una curva como si fuera una rampa");
 game.back();
 game.changeTypes(customEight.slice(),"Ocho manual de pruebas",[],geo.START);
 assert.equal(game.state.track.valid,false);
 game.state.selection=0;game.state.looseSelection=-1;
 assert.equal(game.puzzle.installBridgeKit(),true,"Instalar kit desde el maletín");
 assert.deepEqual(game.state.bridgeParts,[0]);
 assert.equal(game.state.track.valid,true,"El circuito ya puede correr");
 game.undo();
 assert.equal(game.state.track.valid,false,"Deshacer retira el puente");
 game.redo();
 assert.equal(game.state.track.valid,true,"Rehacer reinstala el puente");
 game.changeTypes([],"Probar soporte en pieza suelta",[],geo.START);
 game.puzzle.scatterLoose("S600");
 assert.equal(game.state.loose.length,1);
 assert.equal(game.puzzle.installBridgeKit(),true);
 assert.equal(game.state.loose[0].raised,true,"Soportes visibles en una pieza suelta");
 game.puzzle.startSelectedPiece();
 assert.deepEqual(game.state.bridgeParts,[0],"El kit pasa al circuito al pulsar Iniciar");
 assert.equal(game.state.loose.length,0);
 game.undo();
 assert.equal(game.state.loose[0].raised,true,"Deshacer conserva los soportes en el inventario");
 // Reproducción de la captura: dos tramos aún sueltos, uno cruza al
 // otro y tiene el kit acoplado. Debe verse como puente, SIN una placa
 // que sustituya a las ranuras del carril original.
 game.changeTypes([],"Prueba del cruce entre piezas sueltas",[],geo.START);
 game.state.loose=[
  {id:"S350",x:400,y:800,h:0},
  {id:"S600",x:560,y:500,h:Math.PI/2,raised:true}
 ];
 const looseCrossing=game.puzzle.looseOverpasses();
 assert.equal(looseCrossing.length,1,"Un cruce entre dos tramos sueltos elevados");
 assert.equal(looseCrossing[0].upper.id,"S600","La vía con kit es la elevada");
 assert.ok(Math.abs(looseCrossing[0].crossing.x-560)<.01);
 assert.ok(Math.abs(looseCrossing[0].crossing.y-800)<.01);
 window.__drawLog.length=0;
 game.puzzle.paintLoose(ctx);
 assert.deepEqual(window.__drawLog,["bridge"],"La vía superior se repinta sólo sobre el cruce suelto");
 game.state.loose[1].raised=false;
 assert.equal(game.puzzle.looseOverpasses().length,0,"Sin kit no puede aparentar un puente");
 // Los cruces del circuito principal también deben verse con la pista
 // todavía abierta; validez de carrera = cerrado + apoyado.
 const openKit=geo.buildTrack(customEight.slice(0,-1),geo.START,[0]);
 assert.equal(openKit.closed,false,"Tramo aún abierto");
 assert.ok(openKit.bridge,"El puente es visible durante la construcción");
 assert.equal(openKit.valid,false,"No correr hasta cerrar el circuito");
 console.log("SlotRace DEV 0.11.0 bridge occlusion: inferior bajo puente y superior encima, sin salto de trayectoria — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
