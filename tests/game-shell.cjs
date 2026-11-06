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
 assert.equal(game.version,"DEV 0.14.2");
 assert.match(html,/class="home-hero-photo"/);
 assert.match(html,/slotrace-duelo-curva\.avif/);
 assert.doesNotMatch(html,/class="hero-cars"/);
 assert.match(html,/avenir_gripline_threequarter\.webp/);
 assert.match(html,/helix_spark_threequarter\.webp/);
 assert.equal(st.mode,"menu","Arranque en menú, sin entrar al taller");
 assert.equal(elements.get("menuScreen").hidden,false,"Menú visible al iniciar");
 assert.equal(elements.get("buildScreen").hidden,true);
 assert.equal(elements.get("raceScreen").hidden,true);
 assert.equal(elements.get("goHome").hidden,true);
 assert.equal(elements.get("mainNavigation").hidden,false,
  "El menú muestra navegación persistente");
 for(const [id,mode] of [
  ["navBuild","build"],["navLibrary","library"],["navGarage","garage"],
  ["navStore","store"],["navMenu","menu"]]){
  elements.get(id).listeners.click[0]();
  assert.equal(st.mode,mode,"La barra común navega a "+mode);
  assert.equal(elements.get("mainNavigation").hidden,false);
 }
 elements.get("mastSettings").listeners.click[0]();
 assert.equal(st.mode,"settings","Ajustes ocupa el mismo lugar en la cabecera");
 assert.equal(elements.get("settingsScreen").hidden,false);
 elements.get("navMenu").listeners.click[0]();
 assert.equal(st.mode,"menu");

 assert.equal(elements.get("menuRace").disabled,false,
  "Un circuito válido guardado puede competir desde el menú");
 assert.equal(st.driveDirection,1,"Sentido horario predeterminado");
 game.openWorkshop();
 assert.equal(st.mode,"build");
 assert.match(html,/id="builderScroll"/);
 assert.match(html,/id="caseStraights"/);
 assert.match(html,/id="moveGroup"/);
 assert.match(html,/id="caseMountGuide"/);
 assert.equal(game.chooseCaseCategory("curve"),true);
 assert.equal(st.caseCategory,"curve");
 assert.equal(game.chooseCaseCategory("straight"),true);
 assert.equal(st.caseCategory,"straight");
 assert.equal(elements.get("buildScreen").hidden,false);
 game.showMenu();
 assert.equal(st.mode,"menu");
 // Los seis accesos del menú abren pantallas funcionales independientes.
 for(const [button,screen] of [
  ["menuLibrary","libraryScreen"],["menuGarage","garageScreen"],
  ["menuStore","storeScreen"],["menuSettings","settingsScreen"]]){
  elements.get(button).listeners.click[0]();
  assert.equal(elements.get(screen).hidden,false,button+" abre su pantalla");
  assert.equal(elements.get("menuScreen").hidden,true);
  game.showMenu();
 }
 assert.match(html,/avenir_gripline_threequarter\.webp/);
 assert.match(html,/helix_spark_threequarter\.webp/);
 // Tienda: cuatro categorías, cajas grandes y adquisiciones LOCALES sin pagos.
 assert.equal(game.shopProducts.length,10,"Catálogo inicial con diez referencias");
 elements.get("menuStore").listeners.click[0]();
 assert.equal(st.mode,"store");
 assert.match(elements.get("shopProducts").innerHTML,/Caja básica SR-Precision/);
 assert.match(elements.get("shopProducts").innerHTML,/Open Rally Box/);
 assert.equal(game.shopOwned("box-basic"),true,"La caja básica es propiedad inicial");
 assert.equal(game.shopOwned("car-gripline"),true,"Avenir Gripline incluido");
 assert.equal(game.shopOwned("plan-oval"),true,"Plano ovalado incluido en caja básica");
 assert.equal(game.shopSelectCategory("packs"),true);
 assert.match(elements.get("shopProducts").innerHTML,/Pack puente 65 mm/);
 assert.equal(game.shopSelectCategory("circuits"),true);
 assert.match(elements.get("shopProducts").innerHTML,/Sprint urbano/);
 assert.equal(game.shopAcquire("plan-urban"),false,"Un plano sin receta no es adquirible");
 assert.equal(game.shopSelectCategory("boxes"),true);
 assert.equal(game.shopOpenProduct("box-rally"),true);
 assert.equal(elements.get("shopProductModal").hidden,false);
 assert.match(elements.get("shopModalContent").innerHTML,/14 piezas|14 piezas|Ocho con puente/);
 assert.equal(game.shopAcquire("box-rally"),true,"Caja temática adquirida gratis");
 assert.equal(game.shopOwned("box-rally"),true);
 assert.equal(game.shopOwned("plan-eight"),true,"La caja desbloquea su receta");
 assert.equal(game.shopOwned("car-spark"),true,"Helix Spark coleccionable");
 const ownedAfter=JSON.parse(saved.get("slotrace-shop-owned-v1"));
 assert.ok(ownedAfter.includes("box-rally"),"Compra de pruebas se guarda separada");
 assert.equal(JSON.parse(saved.get("slotrace-circuit-library-v1")||"[]").length,0,
  "Adquirir una caja no sobrescribe ni genera circuitos en el inventario");
 game.shopCloseProduct();
 assert.equal(elements.get("shopProductModal").hidden,true);
 assert.equal(game.shopSelectCategory("cars"),true);
 assert.match(elements.get("shopProducts").innerHTML,/Helix Spark/);
 assert.equal(game.shopSelectCategory("invalid"),false);
 game.showMenu();
 elements.get("menuSettings").listeners.click[0]();
 const soundBefore=st.clicksEnabled,gridBefore=st.gridEnabled;
 elements.get("settingsSound").listeners.click[0]();
 elements.get("settingsGrid").listeners.click[0]();
 assert.equal(st.clicksEnabled,!soundBefore,"Sonido configurable desde Ajustes");
 assert.equal(st.gridEnabled,!gridBefore,"Cuadrícula configurable desde Ajustes");
 elements.get("settingsSound").listeners.click[0]();
 elements.get("settingsGrid").listeners.click[0]();
 assert.equal(st.clicksEnabled,soundBefore);
 assert.equal(st.gridEnabled,gridBefore);
 elements.get("settingsHome").listeners.click[0]();
 assert.equal(st.mode,"menu");
 elements.get("menuLibrary").listeners.click[0]();
 assert.equal(elements.get("menuExport").hidden,false);
 elements.get("libraryBuild").listeners.click[0]();
 assert.equal(st.mode,"build");
 game.showMenu();

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
 assert.equal(elements.get("mainNavigation").hidden,true,
  "El mando no pierde espacio por la barra general durante la carrera");
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
 assert.match(source,/CAR_LENGTH_MM=98/,"Los dos coches mantienen escala compacta");
  assert.match(source,/assets\/cars\/helix_spark\.webp/,"El sprite cenital de Spark está incorporado");
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
 // REGRESIÓN: guardar Splash con la ficha de OchoA abierta NO puede borrarla.
 const previousId=library[0].id,previousPieces=library[0].snapshot.types.slice();
 elements.get("workCircuitName").value="Splash";
 assert.equal(game.saveCircuit(),true,"Cambiar nombre crea un circuito nuevo");
 const both=JSON.parse(saved.get("slotrace-circuit-library-v1"));
 assert.equal(both.length,2,"Splash y el anterior permanecen en el inventario");
 assert.deepEqual(both.map(x=>x.name),["Splash","Ocho de pruebas"]);
 assert.notEqual(both[0].id,previousId);
 assert.deepEqual(both[1].snapshot.types,previousPieces,"La receta anterior queda intacta");
 elements.get("workCircuitName").value="Ocho de pruebas";
 assert.equal(game.saveCircuit(),false,"No permite sustituir otro circuito por nombre duplicado");
 assert.equal(JSON.parse(saved.get("slotrace-circuit-library-v1")).length,2);
 assert.equal(game.loadSavedCircuit(previousId),true,"Ocho de pruebas puede reabrirse");
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
 assert.equal(st.raceStarted,false,"Nuevo circuito cargado: salida en espera");
 assert.equal(st.seconds,0);
 game.physics.simulationStep(.3);
 assert.equal(st.seconds,0,"El reloj no avanza sin gas");
 st.keyboardGas=true;
 game.physics.simulationStep(.02);
 assert.equal(st.raceStarted,true,"Acelerar con teclado inicia la salida");
 assert.ok(st.seconds>0&&st.seconds<=.021);
 st.keyboardGas=false;
 const elapsed=st.seconds;
 game.physics.simulationStep(.04);
 assert.ok(st.seconds>elapsed,"El cronómetro sigue aunque se suelte el acelerador");
 game.openRace();
 assert.equal(st.raceStarted,false,"Otra sesión vuelve a esperar la salida");
 assert.equal(st.seconds,0);
 st.seconds=16.75;game.completeLap();
 st.seconds=15.20;game.completeLap();
 st.seconds=16.10;game.completeLap();
 st.lane=1;st.seconds=8.266;game.completeLap();
 assert.deepEqual(st.sessionLaps.map(l=>l.seconds),[16.75,15.20,16.10,8.266]);
 assert.equal(st.records["library-"+library[0].id+"-"+st.types.join("-")][0],15.20);
 assert.equal(game.endSession("menu"),true);
 assert.equal(st.mode,"results");
 assert.equal(elements.get("resultsScreen").hidden,false);
 assert.equal(elements.get("resultsLaps").children.length,4);
 const lapRows=elements.get("resultsLaps").children;
 assert.match(lapRows[1].className,/is-best-left/,"La mejor izquierda queda azul");
 assert.match(lapRows[3].className,/is-best-right/,"La mejor derecha queda rosa");
 assert.doesNotMatch(lapRows[0].className,/is-best-/,"La vuelta inicial no se resalta si luego fue superada");
 assert.doesNotMatch(lapRows[2].className,/is-best-/,"Otra vuelta del mismo carril no se resalta");
 assert.equal(lapRows[1].children[2].children[0].textContent,"MEJOR DEL CARRIL");
 assert.equal(lapRows[3].children[2].children[0].textContent,"MEJOR DEL CARRIL");
 assert.equal(elements.get("resultsStats").children[1].children[1].textContent,
  "23,466 s","El combinado suma los mejores tiempos de cada carril");
 assert.equal(elements.get("resultsStats").children[0].children.length,2,
  "Los dos carriles muestran tiempos separados");
 const afterRace=JSON.parse(saved.get("slotrace-lab-10"));
 assert.equal("sessionLaps" in afterRace,false);
 assert.equal(afterRace.circuitName,"Ocho de pruebas");
 elements.get("resultsHome").listeners.click[0]();
 assert.equal(st.mode,"menu");

 // Rescate sin sobrescribir Splash si OchoA todavía existe en el borrador.
 const splashId=both[0].id;
 st.draft={types:["S350","R1_90R"],loose:[],bridgeParts:[],origin:{...geo.START},
  name:"OchoA",direction:-1,activeId:splashId};
 game.showHub("library");
 assert.equal(elements.get("libraryDraftRecovery").hidden,false);
 assert.equal(game.recoverDraftToLibrary(),true,"Rescatar OchoA del borrador");
 const rescued=JSON.parse(saved.get("slotrace-circuit-library-v1"));
 assert.equal(rescued.length,3);
 assert.deepEqual(rescued.map(x=>x.name),["OchoA","Splash","Ocho de pruebas"]);
 assert.notEqual(rescued[0].id,splashId,"OchoA recuperado tiene identidad propia");
 assert.deepEqual(rescued[0].snapshot.types,["S350","R1_90R"]);
 assert.deepEqual(rescued[1].snapshot.types,previousPieces,"Splash no se modifica al recuperar");
 assert.equal(elements.get("libraryDraftRecovery").hidden,true);

 // Cambiar el trazado de un circuito existente preserva la versión anterior.
 game.loadSavedCircuit(previousId);
 const stable=st.types.slice();
 game.changeTypes([...stable,"S075"],"Edición del trazado",[],geo.START);
 elements.get("workCircuitName").value="Ocho de pruebas";
 assert.equal(game.saveCircuit(),true);
 assert.equal(game.readCircuitRevisions()[0].name,"Ocho de pruebas");
 assert.deepEqual(game.readCircuitRevisions()[0].snapshot.types,stable);
 assert.equal(game.restoreLastCircuitRevision(),true);
 const withBackup=JSON.parse(saved.get("slotrace-circuit-library-v1"));
 assert.ok(withBackup.some(x=>x.name==="Ocho de pruebas (recuperado)"));
 assert.deepEqual(withBackup.find(x=>x.name==="Ocho de pruebas (recuperado)").snapshot.types,stable);
 assert.ok(withBackup.some(x=>x.name==="OchoA"));
 assert.ok(withBackup.some(x=>x.name==="Splash"));

 // Gestos tipo iOS: abrir papelera, cerrar al deslizar a la derecha, cancelar
 // y borrar EXCLUSIVAMENTE la ficha elegida (sin tocar OchoA ni Splash).
 assert.equal(game.loadSavedCircuit(rescued[0].id),true);
 elements.get("workCircuitName").value="OchoA (recuperado)";
 assert.equal(game.saveCircuit(),true);
 const duplicateId=st.activeCircuitId;
 assert.notEqual(duplicateId,rescued[0].id);
 assert.equal(st.library[0].name,"OchoA (recuperado)");
 const deskBefore=st.types.slice();
 const untouchedOriginal=JSON.stringify(st.library.find(c=>c.id===rescued[0].id).snapshot);
 const untouchedSplash=JSON.stringify(st.library.find(c=>c.id===splashId).snapshot);
 const recordKeyDuplicate="library-"+duplicateId+"-T";
 const recordKeyOriginal="library-"+rescued[0].id+"-T";
 st.records[recordKeyDuplicate]=[6.1,6.2];
 st.records[recordKeyOriginal]=[9.1,9.2];
 game.showHub("library");
 const libraryPanel=elements.get("circuitLibrary");
 const currentCards=()=>libraryPanel.children.slice(-st.library.length);
 const swipeShell=currentCards()[0],trash=swipeShell.children[0],front=swipeShell.children[1];
 assert.equal(trash.disabled,true,"Papelera oculta y desactivada al principio");
 function slide(from,to){
  const evt=(x)=>({pointerId:7,pointerType:"touch",clientX:x,clientY:100,
   preventDefault(){}});
  front.listeners.pointerdown[0](evt(from));
  front.listeners.pointermove[0](evt(to));
  front.listeners.pointerup[0](evt(to));
 }
 slide(260,180);
 assert.equal(front.style.transform,"translateX(-100px)","Deslizar izquierda descubre la papelera");
 assert.equal(trash.disabled,false);
 slide(160,240);
 assert.equal(front.style.transform,"translateX(0px)","Deslizar derecha cierra acciones");
 assert.equal(trash.disabled,true);
 slide(260,160);
 trash.listeners.click[0]();
 assert.equal(elements.get("circuitDeleteDialog").hidden,false);
 assert.equal(elements.get("deleteCircuitName").textContent,"«OchoA (recuperado)»");
 elements.get("deleteCircuitCancel").listeners.click[0]();
 assert.equal(elements.get("circuitDeleteDialog").hidden,true,"Cancelar cierra sin borrar");
 assert.equal(st.library.some(c=>c.id===duplicateId),true);
 trash.listeners.click[0]();
 elements.get("deleteCircuitConfirm").listeners.click[0]();
 assert.equal(elements.get("circuitDeleteDialog").hidden,true);
 assert.equal(st.library.some(c=>c.id===duplicateId),false,"Solo se elimina la copia");
 assert.equal(st.activeCircuitId,null,"Al borrar el activo, la mesa queda sin vinculación");
 assert.deepEqual(st.types,deskBefore,"No se pierden las piezas en la mesa");
 assert.equal(st.records[recordKeyDuplicate],undefined,"Solo se borran récords de esa identidad");
 assert.deepEqual(st.records[recordKeyOriginal],[9.1,9.2],"Otros récords intactos");
 assert.equal(JSON.stringify(st.library.find(c=>c.id===rescued[0].id).snapshot),untouchedOriginal);
 assert.equal(JSON.stringify(st.library.find(c=>c.id===splashId).snapshot),untouchedSplash);
 assert.equal(JSON.parse(saved.get("slotrace-circuit-library-v1")).some(c=>c.id===duplicateId),false);
 assert.equal(st.library.some(c=>c.name==="OchoA"),true);
 assert.equal(st.library.some(c=>c.name==="Splash"),true);
 // Guardar desde tienda un plano validado no puede sustituir las creaciones.
 const previousTracks=st.library.map(x=>({id:x.id,name:x.name,snapshot:JSON.stringify(x.snapshot)}));
 assert.equal(game.shopInstallPlan("plan-eight"),true,"Montar receta desbloqueada del ocho");
 assert.equal(st.mode,"build");
 assert.equal(st.track.valid,true);
 assert.equal(st.types.length,14);
 assert.equal(st.circuitName,"Ocho con puente");
 assert.equal(st.library.length,previousTracks.length+1);
 for(const track of previousTracks){
  const same=st.library.find(c=>c.id===track.id);
  assert.ok(same,"Circuito anterior conservado: "+track.name);
  assert.equal(JSON.stringify(same.snapshot),track.snapshot);
 }
 const storeCount=st.library.length;
 assert.equal(game.shopInstallPlan("plan-eight"),true,"Segunda apertura reutiliza la misma receta");
 assert.equal(st.library.length,storeCount,"No duplica el plano de tienda");
 assert.equal(game.shopInstallPlan("plan-urban"),false,"No instala planos en preparación");

 // Los planos comerciales se generan a partir de las piezas REALES del motor.
 const realOval=game.shopBlueprintSvg(geo.STARTER,"Óvalo de prueba");
 assert.match(realOval,/shop-real-blueprint/);
 assert.match(realOval,/viewBox="[-\d\. ]+"/);
 assert.equal((realOval.match(/<line /g)||[]).length,geo.STARTER.length-1,
  "Cada costura pertenece a una unión real del óvalo");
 assert.match(realOval,/Plano real de Óvalo de prueba/);
 const realEight=game.shopBlueprintSvg(geo.FIGURE_EIGHT,"Ocho de prueba");
 assert.match(realEight,/shop-blueprint-bridge/,"El plano del ocho muestra la vía elevada");
 assert.match(realEight,/circuito válido/);
 game.showHub("store");
 game.shopSelectCategory("circuits");
 assert.match(elements.get("shopProducts").innerHTML,/shop-real-blueprint/,
  "La tienda usa geometría exacta, no iconos inventados");
 assert.match(elements.get("shopProducts").innerHTML,/Plano en diseño/,
  "No se inventan planos de circuitos aún sin receta");

 // Elegir Spark en el garaje lo habilita sin afectar al Gripline.
 game.showHub("garage");
 elements.get("garageChooseSpark").listeners.click[0]();
 assert.equal(st.selectedCar,"spark");
 assert.equal(game.shopOwned("car-spark"),true,"Selección disponible en pruebas");
 assert.equal(JSON.parse(saved.get("slotrace-lab-10")).selectedCar,"spark",
  "El coche elegido persiste sin borrar el trazado");
 assert.equal(elements.get("garageRace").textContent,"🏁 Jugar con Helix Spark");
 assert.equal(elements.get("garageChooseSpark").attrs["aria-pressed"],"true");
 assert.equal(game.openRace(),true,"El segundo coche puede competir en pista");
 assert.equal(st.mode,"race");
 assert.equal(st.raceStarted,false,"Spark espera la primera aceleración");
 assert.equal(elements.get("raceCarName").textContent,"Helix Spark");
 st.seconds=7.432;game.completeLap();
 const sparkKeys=Object.keys(st.records).filter(k=>k.endsWith("-helix-spark"));
 assert.ok(sparkKeys.length>0,"Los tiempos de Spark no pisan los de Gripline");
 game.endSession("menu");
 assert.match(elements.get("resultsCircuit").textContent,/Helix Spark/,
  "El informe muestra con qué coche se condujo");
 game.showHub("garage");
 elements.get("garageChooseGripline").listeners.click[0]();
 assert.equal(st.selectedCar,"gripline");
 assert.equal(elements.get("garageRace").textContent,"🏁 Jugar con Avenir Gripline");
 assert.equal(game.openRace(),true);
 assert.equal(elements.get("raceCarName").textContent,"Avenir Gripline");
 assert.equal(Object.keys(st.records).filter(k=>k.endsWith("-helix-spark")).length,
  sparkKeys.length,"Cambiar de coche no borra los récords de Spark");
 game.showMenu();

 console.log("SlotRace DEV 0.14.2: identificación de cada módulo en el plano y receta sin orden de montaje OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
