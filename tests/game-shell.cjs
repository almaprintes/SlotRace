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
 const navigator={
  shared:null,canShare:()=>true,
  async share(payload){this.shared=payload;}
 };
 class TestFile{
  constructor(parts,name,opts){this.name=name;this.type=opts.type;this.parts=parts;}
 }
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver","navigator","File",source)(
  ...values,document,window,localStorage,{now:()=>0},requestAnimationFrame,class{observe(){}},navigator,TestFile
 );
 const game=window.slotraceLab,st=game.state;
 assert.equal(game.version,"DEV 0.11.0");
 assert.equal(st.mode,"menu","Arranque en menú, sin entrar al taller");
 assert.equal(elements.get("menuScreen").hidden,false,"Menú visible al iniciar");
 assert.equal(elements.get("buildScreen").hidden,true);
 assert.equal(elements.get("raceScreen").hidden,true);
 assert.equal(elements.get("goHome").hidden,true);
 assert.equal(elements.get("menuRace").disabled,false,
  "Un circuito válido guardado puede competir desde el menú");
 assert.equal(st.driveDirection,1,"Sentido horario predeterminado");
 game.openWorkshop();
 assert.equal(st.mode,"build");
 assert.equal(elements.get("buildScreen").hidden,false);
 game.showMenu();
 assert.equal(st.mode,"menu");

 // La dirección se elige AL CREAR, no cambia el circuito guardado
 // hasta que el jugador pulsa expresamente "Crear circuito".
 elements.get("menuCounter").listeners.click[0]();
 assert.equal(st.newCircuitDirection,-1);
 assert.equal(st.driveDirection,1);
 const savedTypes=st.types.slice();
 elements.get("menuNew").listeners.click[0]();
 assert.equal(st.mode,"build");
 assert.equal(st.driveDirection,-1);
 assert.equal(st.types.length,0,"Nuevo circuito = mesa vacía");
 assert.deepEqual(st.draft.types,savedTypes,"Montaje anterior recuperable");
 const disk=JSON.parse(saved.get("slotrace-lab-10"));
 assert.equal(disk.driveDirection,-1,"El sentido sobrevive al reinicio");
 assert.deepEqual(disk.draft.types,savedTypes);

 // No se puede pulsar Correr para cambiar el circuito silenciosamente
 // por un óvalo: se respeta el circuito incompleto.
 game.showMenu();
 assert.equal(elements.get("menuRace").disabled,true);
 assert.equal(game.openRace(),false);
 assert.equal(st.types.length,0,"No reemplazar montaje por receta de demo");
 game.openWorkshop();
 game.changeTypes(geo.STARTER.slice(),"Óvalo para carreras",[],geo.START);
 assert.equal(st.track.valid,true);
 // En sentido inverso la posición es distancia NEGATIVA y la marcha
 // apunta 180° en sentido contrario. El carril físico también se invierte.
 st.lane=0;
 const sampled=game.drivingPose(230);
 const expected=geo.positionAt(st.track.lanes[1],-230);
 assert.ok(Math.hypot(sampled.x-expected.x,sampled.y-expected.y)<1e-8);
 assert.ok(Math.abs(Math.sin(sampled.h-expected.h-Math.PI))<1e-8);
 assert.equal(sampled.curve,-expected.curve);
 game.showMenu();
 assert.equal(elements.get("menuRace").disabled,false);
 elements.get("menuRace").listeners.click[0]();
 assert.equal(st.mode,"race","Menú Correr abre carrera sin taller");
 assert.equal(elements.get("raceScreen").hidden,false);
 elements.get("raceHome").listeners.click[0]();
 assert.equal(st.mode,"menu","Salir de carrera vuelve al menú principal");
 assert.equal(st.run,false);
 game.openWorkshop();
 elements.get("workDirection").listeners.click[0]();
 assert.equal(st.driveDirection,1,"Cambiar dirección también desde taller");

 // Receta íntegra, con cantidades correctas y sentido reproducible.
 const rec=game.blueprintData();
 assert.equal(rec.pieces,geo.STARTER.length);
 assert.equal(rec.directionLabel,"HORARIO");
 assert.equal(rec.loose,0);
 const sum=rec.items.reduce((n,item)=>n+item.count,0);
 assert.equal(sum,rec.pieces,"No faltar piezas en el PNG");
 assert.equal(rec.sequence.length,geo.STARTER.length);
 assert.equal(rec.sequence[0].position,1);
 assert.match(source,/GRIPLINE_LENGTH_MM=98/,"Gripline original más pequeño");
 assert.match(source,/assets\/cars\/avenir_gripline\.webp/,"Usar piel original TDR");
 assert.doesNotMatch(source,/roundRect\(ctx,-70,-27,140,54/,
  "El coche procedural antiguo ha sido sustituido");

 // Canvas de prueba con instrumentación de textos. No hay red ni
 // motores externos y la exportación se hace completamente en local.
 const renderTexts=[],printStrokes=[],printFills=[];
 const pngCanvas={width:0,height:0,blobType:null,
  getContext(){return pngCtx;},
  toBlob(cb,type){this.blobType=type;cb({type,size:1234});}
 };
 const pngCtx=new Proxy({canvas:pngCanvas},{
  get(target,key){
   if(key in target)return target[key];
   if(key==="fillText")return(value)=>renderTexts.push(String(value));
   if(key==="stroke")return()=>printStrokes.push({
    color:target.strokeStyle,width:target.lineWidth
   });
   if(key==="fill")return()=>printFills.push(target.fillStyle);
   if(key==="createLinearGradient")return()=>({addColorStop(){}});
   return()=>{};
  },set(target,key,value){target[key]=value;return true;}
 });
 const meta=game.drawBlueprint(pngCtx,rec);
 assert.equal(meta.width,1500);
 assert.ok(meta.height>1400);
 assert.ok(renderTexts.includes("RECETA DE PIEZAS"),"Receta adherida al mismo PNG");
 assert.ok(!renderTexts.includes("ORDEN DE MONTAJE"),"El PNG ya no muestra orden de montaje");
 assert.ok(meta.frame.height>=1100,"Plano ampliado aprovechando el espacio liberado");
 assert.equal(meta.blueprintStyle,"white-track-black-seams");
 const referred=rec.items.filter(item=>!item.accessory);
 assert.equal(meta.markers.length,st.track.parts.length,
   "Cada pieza colocada tiene una referencia visible");
 assert.equal(Object.keys(meta.references).length,referred.length,
   "Una sola letra distinta para cada tipo de módulo");
 assert.ok(renderTexts.includes("LETRA EN PISTA = TIPO DE PIEZA"),
   "La leyenda explica cómo se leen las letras del plano");
 for(const item of referred){
  const code=meta.references[item.id];
  assert.match(code,/^[A-Z]+$/,"Referencia legible para "+item.id);
  assert.equal(meta.markers.filter(marker=>marker.id===item.id).length,item.count,
    "Número de etiquetas coincide con las piezas "+item.name);
  assert.ok(meta.markers.filter(marker=>marker.id===item.id).every(marker=>marker.code===code),
    "Las piezas del mismo tipo repiten el mismo código");
  assert.equal(renderTexts.filter(text=>text===code).length,item.count+1,
    "La referencia aparece en cada módulo y otra vez junto a la receta");
 }
 assert.equal(meta.references.BRIDGE_KIT,undefined,
   "El kit de apoyo no se etiqueta como vía física");

 assert.ok(printStrokes.some(v=>v.color==="#ffffff"&&v.width===geo.TRACK_WIDTH),
  "La superficie del circuito se pinta en blanco puro");
 assert.ok(printStrokes.some(v=>v.color==="#080c0f"&&v.width===5),
  "Las juntas de cada pieza se imprimen en negro");
 assert.ok(printStrokes.some(v=>v.color==="#10171a"&&v.width===geo.TRACK_WIDTH+8),
  "El contorno negro separa la vía blanca del fondo verde");
 assert.ok(meta.scale>0,"El circuito sigue centrado y encuadrado");
 assert.ok(renderTexts.some(v=>v.includes("HORARIO")),"Dirección visible en plano");
 assert.ok(renderTexts.some(v=>v.includes("×")),"Cantidades por modelo visibles");
 assert.ok(renderTexts.some(v=>v.includes("Recta")||v.includes("Salida")),
  "La receta muestra los nombres de las piezas, sin códigos de montaje");
 document.createElement=tag=>tag==="canvas"?pngCanvas:node("card");
 const result=await game.exportBlueprint();
 assert.equal(result,true,"Exportador abre menú de compartir en iOS");
 assert.equal(pngCanvas.blobType,"image/png");
 assert.ok(navigator.shared,"API de compartir recibió el archivo");
 assert.equal(navigator.shared.files[0].type,"image/png");
 assert.match(navigator.shared.files[0].name,/\.png$/);
 assert.ok(navigator.shared.files[0].parts[0].size>0);

// También se identifican módulos sueltos que todavía no se han unido
// al trazado principal. No introducir un orden numerado.
 st.loose.push({id:"S075",x:1650,y:650,h:0});
 const partial=game.blueprintData();
 const partialMeta=game.drawBlueprint(pngCtx,partial);
 assert.equal(partialMeta.markers.length,st.track.parts.length+1,
  "Incluye una marca para cada pieza suelta junto a las ya montadas");
 assert.equal(partialMeta.markers.at(-1).id,"S075");
 assert.equal(partialMeta.markers.at(-1).code,partialMeta.references.S075);
 assert.ok(!renderTexts.includes("ORDEN DE MONTAJE"),
  "El plano con piezas sueltas sigue sin incluir montaje numerado");
 st.loose.pop();



 // Mis circuitos: nombrar, guardar, reabrir y mostrar el nombre en el plano.
 game.openWorkshop();
 elements.get("workCircuitName").value="Ocho de pruebas";
 assert.equal(game.saveCircuit(),true);
 const library=JSON.parse(saved.get("slotrace-circuit-library-v1"));
 assert.equal(library.length,1);
 assert.equal(library[0].name,"Ocho de pruebas");
 assert.deepEqual(library[0].snapshot.types,st.types);
 assert.equal(game.circuitPackage().name,"Ocho de pruebas");
 const layout=st.types.slice();
 game.changeTypes([],"Mesa de prueba vacía",[],geo.START);
 assert.equal(game.loadSavedCircuit(library[0].id),true);
 assert.deepEqual(st.types,layout);
 const namePrint=[];
 game.drawBlueprint(new Proxy({canvas:{width:0,height:0}},{
  get(target,key){if(key in target)return target[key];
   if(key==="fillText")return v=>namePrint.push(String(v));
   if(key==="createLinearGradient")return()=>({addColorStop(){}});
   return()=>{};},
  set(target,key,value){target[key]=value;return true;}
 }),game.blueprintData());
 assert.ok(namePrint.includes("Ocho de pruebas"));

 // Los tiempos de TODAS las vueltas se ven al salir, pero no se persisten.
 game.openRace();
 st.seconds=16.75;game.completeLap();
 st.seconds=15.20;game.completeLap();
 st.seconds=16.10;game.completeLap();
 assert.deepEqual(st.sessionLaps.map(l=>l.seconds),[16.75,15.20,16.10]);
 assert.equal(st.records["library-"+library[0].id+"-"+st.types.join("-")][0],15.20);
 assert.equal(game.endSession("menu"),true);
 assert.equal(st.mode,"results");
 assert.equal(elements.get("resultsScreen").hidden,false);
 assert.equal(elements.get("resultsLaps").children.length,3);
 const afterRace=JSON.parse(saved.get("slotrace-lab-10"));
 assert.equal("sessionLaps" in afterRace,false);
 assert.equal(afterRace.circuitName,"Ocho de pruebas");
 elements.get("resultsHome").listeners.click[0]();
 assert.equal(st.mode,"menu");
 console.log("SlotRace DEV 0.11.0: identificación de cada módulo en el plano y receta sin orden de montaje OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
