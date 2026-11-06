"use strict";
// El maletín de SlotRace debe ser una única caja con trece cavidades
// físicas, apilado real de inventario, extracción táctil y guardado.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
 const geo=await import("../src/track.mjs");
 const blueprint=await import("../src/blueprint.mjs");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
   .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/gm,"");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../src/site.css"),"utf8");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 function node(id){
  return{id,children:[],listeners:{},dataset:{},style:{},attrs:{},innerHTML:"",textContent:"",
   value:"0",width:390,height:600,clientWidth:390,hidden:false,disabled:false,
   classList:{held:new Set(),add(k){this.held.add(k)},remove(k){this.held.delete(k)},
     contains(k){return this.held.has(k)},toggle(k,force){
      if(force===undefined?!this.held.has(k):force)this.held.add(k);else this.held.delete(k);}},
   setAttribute(k,v){this.attrs[k]=v},appendChild(child){this.children.push(child);return child},
   addEventListener(type,cb){(this.listeners[type]??=[]).push(cb)},setPointerCapture(){},
   getBoundingClientRect(){return{left:0,top:0,width:390,height:600,right:390,bottom:600}},
   querySelectorAll(){return this.children},
   querySelector(sel){if(sel===".bridge-kit-cta")return this.kitCta??=node("kit-cta");if(sel===".qty")return this.qty??=node("qty");
    if(sel===".foam-drag-grip")return this.grip??=node("grip");return null;}
  };
 }
 const elements=new Map(ids.map(id=>[id,node(id)]));
 const canvasContext=new Proxy({}, {get(_,k){return k==="createLinearGradient"?()=>({addColorStop(){}}):()=>{};},
   set(t,k,v){t[k]=v;return true;}});
 for(const id of ["editCanvas","raceCanvas"])elements.get(id).getContext=()=>canvasContext;
 const document={getElementById:id=>elements.get(id),createElement:()=>node("pocket"),addEventListener(){},hidden:false};
 const window={devicePixelRatio:1,innerWidth:390,innerHeight:844,setTimeout:fn=>fn(),
  matchMedia:()=>({matches:true}),addEventListener(){}};
 const data=new Map(),localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const callbacks=[];
 const keys=[...Object.keys(geo),...Object.keys(blueprint)],values=keys.map(k=>Object.hasOwn(geo,k)?geo[k]:blueprint[k]);
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",source)(
  ...values,document,window,localStorage,{now:()=>10},fn=>callbacks.push(fn),class{observe(){}}
 );
 const game=window.slotraceLab,st=game.state,allTypes=[
  ...Object.keys(geo.CATALOG).filter(id=>!geo.CATALOG[id].legacy&&(!id.includes("_")||id.endsWith("R"))),
  ...Object.keys(game.curve90Presets)
 ].sort((a,b)=>{
  const ra=game.curveFamilies[a.slice(0,2)],rb=game.curveFamilies[b.slice(0,2)];
  if(!ra&&!rb)return 0;if(!ra)return -1;if(!rb)return 1;
  const deg=id=>id.includes("_225")?22.5:id.includes("_45")?45:90;
  return ra.radius-rb.radius||deg(a)-deg(b);
 });
 game.openWorkshop();
 assert.equal(game.version,"DEV 0.14.20");
 assert.equal(st.caseOpen,true,"Estante fijo visible por defecto");
 assert.equal(st.caseCategory,"straight","El estante comienza por Rectas");
 assert.equal(elements.get("caseStraights").attrs["aria-pressed"],"true");
 assert.equal(elements.get("casePageInfo").textContent,"1 / 1","Todas las rectas a un lado, sin paginación");
 assert.equal(st.casePage,0);
 assert.equal(elements.get("pieceShelfArrows").hidden,false,
  "Flechas visibles en el estante de rectas");
 const shelf=elements.get("pieces");
 shelf.scrollLeft=0;
 elements.get("pieceShelfForward").listeners.click[0]();
 assert.ok(shelf.scrollLeft>=120,"Avanzar con flecha mueve el estante");
 elements.get("pieceShelfBack").listeners.click[0]();
 assert.equal(shelf.scrollLeft,0,"Volver con flecha recupera el principio");
 assert.equal(elements.get("casePrev").disabled,true);
 assert.equal(elements.get("caseNext").disabled,true);
 assert.equal(elements.get("casePagination").hidden,true);
 elements.get("caseCurves").listeners.click[0]();
 assert.equal(st.caseCategory,"curve");
 assert.equal(st.casePage,0,"Al cambiar de pestaña vuelve a la primera página");
 elements.get("caseBridges").listeners.click[0]();
 assert.equal(elements.get("bridgeKit").hidden,false,"Elevar sigue disponible en herramientas avanzadas");
 assert.equal(elements.get("bridgeDock").hidden,false,"El kit aparece directamente en el estante");
 assert.equal(elements.get("pieceShelfArrows").hidden,true,
  "Sin flechas cuando Puentes no tiene tarjetas");
 assert.equal(elements.get("pieces").hidden,true,"Puentes no inventa piezas de catálogo");
 elements.get("caseSpecial").listeners.click[0]();
 assert.equal(st.caseCategory,"special");
 elements.get("caseStraights").listeners.click[0]();
 assert.equal(elements.get("caseInterior").hidden,false);
 assert.equal(elements.get("caseClosed").hidden,true);
 const pockets=elements.get("pieces").children;
 assert.equal(pockets.length,16,"Dieciséis tipos de piezas, incluidas curvas unitarias");
 assert.ok(!pockets.some(p=>p.dataset.piece==="S0125"),"La pieza heredada de 12,5 mm no aparece en la caja");
 assert.deepEqual(pockets.map(p=>p.dataset.piece),allTypes);
 assert.deepEqual(pockets.filter(p=>p.dataset.piece.startsWith("R")).map(p=>p.dataset.piece),
  ["R1_225R","R1_45R","R1_90R","R2_225R","R2_45R","R2_90R",
   "R3_225R","R3_90R","R4_225R","R4_90R"],"Cada 90° aparece junto a su radio");
 for(const id of ["R1_45R","R2_90R","R3_225R","R4_90R"]){
  const pocket=pockets.find(p=>p.dataset.piece===id),family=game.curveFamilies[id.slice(0,2)];
  assert.ok(pocket.innerHTML.includes(family.radius+" mm"),"Radio visible en "+id);
  assert.ok(pocket.innerHTML.includes(family.label.toUpperCase()),"Amplitud explicada en "+id);
  assert.ok(pocket.attrs.title.includes(family.classicCode),"Referencia histórica orientativa");
 }

 assert.match(css,/foam-insert/,"Se conservan miniaturas y moldes de piezas");
 assert.match(css,/foam-cutout/,"La espuma conserva el hueco de cada módulo");
 assert.match(css,/overflow-y:scroll/,"La caja tiene desplazamiento vertical nativo");
 assert.match(css,/-webkit-overflow-scrolling:touch/,"Safari conserva la inercia del scroll");
 assert.match(css,/\.builder-workbench #pieceCase \.foam-pocket,[\s\S]*?touch-action:pan-x!important/,
  "Las tarjetas deben permitir desplazamiento horizontal nativo");
 assert.match(css,/scroll-snap-type:none!important/,
  "Sin frenazos del scroll al pasar por cada tarjeta");
 assert.match(css,/foam-drag-grip[^}]*touch-action:none/s,"El asa permite sacar piezas sin bloquear el scroll");
 assert.match(html,/TOCA PARA ENCAJAR/,"Instrucción breve y clara en el estante");
 assert.match(html,/id="rotateCCW"/,"Dos botones directos de giro");
 assert.match(html,/id="builderSelectionTools"/,"Herramientas ancladas a la mesa");
 assert.match(css,/\.builder-workbench \.builder-scroll/,"Mesa sin desplazamiento general");
 assert.match(html,/id="bridgeKit"/,"Kit puente disponible en herramientas");
 assert.match(html,/id="bridgeDock"/,"Kit puente accesible desde el estante");
 assert.match(html,/Rectas y curvas · rampas automáticas/,"El kit admite curvas elevadas y rampas automáticas");
 assert.match(html,/tabindex="0"/,"La caja también se desplaza con teclado");
 assert.match(html,/id="caseInterior"/);
 assert.match(html,/id="caseToggle"/);
 const byId=id=>pockets.find(p=>p.dataset.piece===id);
 for(const p of pockets){
  assert.match(p.innerHTML,/foam-cutout/,"El hueco tiene silueta de corte");
  assert.match(p.innerHTML,/mini-slot-piece/,"El hueco contiene el módulo apilado");
  assert.match(p.innerHTML,/mini-slot-outer/,"Bisel exterior igual que la mesa");
  assert.match(p.innerHTML,/mini-slot-groove/,"Dos ranuras de carril");
  assert.match(p.innerHTML,/mini-slot-seam/,"Conectores de extremo dibujados");
  assert.match(p.innerHTML,/foam-drag-grip/,"Asa de arrastre independiente");
  assert.equal(p.listeners.pointerdown.length,1,"La pieza permite toque y scroll");
  assert.equal(p.grip.listeners.pointerdown.length,1,"El asa captura el arrastre, no la caja");
  assert.equal(p.listeners.click.length,1,"Tocar añade una pieza al extremo libre");
  assert.equal(p.attrs.role,"button","Cada pieza es un control accesible");
  assert.equal(p.tabIndex,0,"Cada pieza es accesible mediante teclado");
  assert.equal(p.listeners.keydown.length,1,"Se puede acoplar pulsando Enter");
 }
 assert.notEqual(byId("S350").innerHTML,byId("S175").innerHTML,"Rectas de distinta longitud");
 assert.equal(byId("R2_45L"),undefined,"Una misma cavidad sirve para ambos sentidos");
 assert.notEqual(byId("R2_225R").innerHTML,byId("R2_45R").innerHTML,"Media curva y curva completa");
 assert.notEqual(byId("R2_45R").innerHTML,byId("R1_45R").innerHTML,"Curvas de distinto radio");
 assert.equal(byId("S350").disabled,false,"El hueco S350 siempre puede suministrar piezas");
 assert.equal(byId("S350").qty.textContent,"∞");
 assert.equal(byId("S175").qty.textContent,"∞");
 assert.equal(byId("R2_45R").qty.textContent,"∞");
 assert.equal(geo.UNLIMITED_DEVELOPMENT_STOCK,true);
 assert.equal(elements.get("caseCount").textContent,"∞ piezas disponibles · 14 en la mesa");

 const tap=id=>byId(id).listeners.click[0]({detail:0});
 tap("S175");tap("S175");
 assert.equal(st.loose.length,2,"Permite sacar varias piezas del mismo hueco");
 assert.equal(game.removeLooseFromCase("S175"),true,"El botón menos devuelve una pieza suelta");
 assert.equal(st.loose.length,1);
 tap("S175");
 assert.equal(st.loose.length,2,"La pieza devuelta puede volver a sacarse");
 assert.equal(st.types.length,14,"Las piezas ensambladas no se alteran");
 assert.equal(byId("S175").qty.textContent,"∞");
 assert.equal(elements.get("caseCount").textContent,"∞ piezas disponibles · 16 en la mesa");

 // Cerrar la caja no borra las piezas sacadas ni altera el circuito.
 const toggle=elements.get("caseToggle");
 toggle.listeners.click[0]();
 assert.equal(st.caseOpen,false);
 assert.equal(elements.get("caseInterior").hidden,true);
 assert.equal(elements.get("caseClosed").hidden,false);
 assert.equal(toggle.attrs["aria-expanded"],"false");
 assert.equal(st.loose.length,2);
 assert.equal(JSON.parse(data.get("slotrace-lab-10")).caseOpen,false);
 toggle.listeners.click[0]();
 assert.equal(st.caseOpen,true);
 assert.equal(toggle.attrs["aria-expanded"],"true");

 // Sacar arrastrando una curva hacia el tapete sin activar además el click.
 const pocket=byId("R1_45R");
 const event=(x,y,id=21,grip=false)=>({clientX:x,clientY:y,pointerId:id,pointerType:"touch",
  target:{dataset:{dragHandle:grip?"true":undefined}},preventDefault(){}});
 // Deslizar por encima de un hueco no captura el puntero ni saca piezas:
 // Safari entregará pointercancel al comenzar el scroll nativo.
 let prevented=false,captured=false;
 const scrollStart={...event(160,590,91),preventDefault(){prevented=true}};
 const capture=pocket=>{const previous=pocket.setPointerCapture;
  pocket.setPointerCapture=()=>{captured=true};return()=>{pocket.setPointerCapture=previous}};
 const scrollPocket=byId("R1_45R"),restoreCapture=capture(scrollPocket);
 scrollPocket.listeners.pointerdown[0](scrollStart);
 scrollPocket.listeners.pointermove[0](event(160,535,91));
 scrollPocket.listeners.pointercancel[0](event(160,535,91));
 restoreCapture();
 assert.equal(prevented,false,"El scroll no impide el comportamiento táctil del navegador");
 assert.equal(captured,false,"El scroll no secuestra el puntero con setPointerCapture");
 assert.equal(st.dragging,null,"El scroll no inicia un arrastre de pista");
 assert.equal(st.loose.length,2,"Desplazar el maletín no extrae piezas");
 // Al deslizar HORIZONTALMENTE y soltar, ni pointerup ni el click
 // sintético posterior pueden añadir piezas por accidente.
 const horizontalScroll=byId("R1_45R");
 horizontalScroll.listeners.pointerdown[0](event(275,720,92));
 horizontalScroll.listeners.pointermove[0](event(210,721,92));
 horizontalScroll.listeners.pointerup[0](event(210,721,92));
 horizontalScroll.listeners.click[0]({detail:0});
 assert.equal(st.loose.length,2,
  "Deslizar sobre la miniatura no coloca una pieza, ni siquiera con click de Safari");
 assert.equal(st.dragging,null,"El arrastre desde el asa se cierra correctamente");
 const board=st.workBoard;
 const scale=Math.min((390-16)/board.height,(600-16)/board.width);
 const pt={x:board.left+board.width*.53,y:board.top+board.height*.47};
 const target={x:195-scale*(pt.y-(board.top+board.bottom)/2),
   y:300+scale*(pt.x-(board.left+board.right)/2)};
 pocket.grip.listeners.pointerdown[0](event(200,720,21,true));
 pocket.grip.listeners.pointermove[0](event(target.x,target.y));
 pocket.grip.listeners.pointerup[0](event(target.x,target.y));
 assert.equal(st.loose.length,3,"Arrastrar saca exactamente una pieza");
 assert.equal(byId("R1_45R").qty.textContent,"∞");
 assert.equal(st.types.length,14);
 assert.equal(st.loose.at(-1).id,"R1_45R");
 pocket.listeners.click[0]({detail:1});
 assert.equal(st.loose.length,3,"El click sintético tras arrastrar no duplica la pieza");
 tap("R1_45R");
 assert.equal(st.loose.length,4,"El siguiente toque vuelve a sacar otra pieza");
 assert.equal(byId("R1_45R").qty.textContent,"∞");

 // Cancelar un gesto o soltar fuera de la mesa no debe gastar inventario.
 pocket.grip.listeners.pointerdown[0](event(200,720,28,true));
 pocket.grip.listeners.pointercancel[0](event(200,600,28));
 assert.equal(st.loose.length,4);
 pocket.grip.listeners.pointerdown[0](event(200,720,29,true));
 pocket.grip.listeners.pointermove[0](event(400,710,29));
 pocket.grip.listeners.pointerup[0](event(400,710,29));
 assert.equal(st.loose.length,4,"Soltar fuera de la mesa no extrae piezas");

 // Safari iOS: confirmar extracción en pointerup aunque no haya click
 // sintético; si llega ese click, tampoco puede duplicar el inventario.
 // Cambiar la caja a curvas a la izquierda sin duplicar huecos.
 elements.get("curveDirection").listeners.click[0]();
 assert.equal(st.caseCurveDirection,"L");
 const touchPocket=byId("R1_45R");
 touchPocket.listeners.pointerdown[0](event(150,730,40));
 touchPocket.listeners.pointerup[0](event(150,730,40));
 assert.equal(st.loose.length,5,"El toque táctil corto saca una pieza");
 touchPocket.listeners.click[0]({detail:1});
 assert.equal(st.loose.length,5,"El click sintético no crea una segunda pieza");
 tap("R1_45R");
 assert.equal(st.loose.length,6,"El toque siguiente vuelve a funcionar");
 assert.equal(st.loose.at(-1).id,"R1_45L","La cavidad invertida suministra curva izquierda");

 assert.ok(JSON.parse(data.get("slotrace-lab-10")).loose.length>=4,
  "El contenido extraído queda guardado en el montaje");
 // En el modo pruebas, ni el fin del kit inicial ni el viejo máximo
 // de 48 piezas pueden impedir sacar más módulos del maletín.
 for(let n=0;n<45;n++)tap("S350");
 assert.ok(st.types.length+st.loose.length>48,"Se permiten más de 48 piezas");
 assert.equal(byId("S350").qty.textContent,"∞","El hueco mantiene ∞ tras 45 extracciones");
 assert.equal(byId("S350").disabled,false,"Sigue disponible después de extraer decenas");
 assert.equal(elements.get("caseCount").textContent,
  "∞ piezas disponibles · "+(st.types.length+st.loose.length)+" en la mesa");
 // Montaje secuencial: tocar tarjetas y pulsar + forman exactamente
 // una cadena, sin piezas sueltas y sin deformar conexiones.
 game.createNewCircuit();
 if(st.caseCurveDirection==="L")elements.get("curveDirection").listeners.click[0]();
 assert.equal(st.types.length,0);
 assert.equal(st.loose.length,0);
 tap("S350");tap("R2_45R");tap("S175");
 assert.deepEqual(st.types,["S350","R2_45R","S175"]);
 assert.equal(st.loose.length,0,"Los toques encajan, no dispersan piezas");
 for(let i=1;i<st.track.parts.length;i++){
  const a=st.track.parts[i-1].end,b=st.track.parts[i].start;
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-6,"Conectores unidos sin hueco");
  assert.ok(Math.abs(a.h-b.h)<1e-6,"El rumbo se conserva en cada unión");
 }
 assert.equal(game.removeLooseFromCase("S175"),true,"− devuelve el último módulo encajado");
 assert.deepEqual(st.types,["S350","R2_45R"]);
 assert.equal(st.loose.length,0,"− no desmonta el tramo completo");
 tap("S175");assert.equal(st.types.length,3,"Se puede volver a añadir");
 game.createNewCircuit();
 for(const id of game.STARTER)tap(id);
 assert.deepEqual(st.types,game.STARTER,"Montaje exacto de un óvalo, pieza a pieza");
 assert.equal(st.track.closed,true,"La última unión cierra el circuito");
 assert.equal(st.track.valid,true,"El circuito cerrado es apto para correr");
 const count=st.types.length;
 tap("S175");
 assert.equal(st.types.length,count,"Una pista cerrada no se deforma por tocar otra pieza");
 assert.equal(st.loose.length,1,"Con el circuito cerrado la pieza se deposita suelta");
 // Curvas R2/R3/R4 de 90° deben ser PIEZAS UNITARIAS.
 game.createNewCircuit();
 for(const [id,radius] of [
  ["R2_90R",300],["R3_90R",450],["R4_90R",600]
 ]){
  assert.ok(byId(id),"Pieza visible en el estante: "+id);
  assert.doesNotMatch(byId(id).innerHTML,/COMBO|PIEZAS/);
  const seams=byId(id).innerHTML.match(/mini-slot-seam/g)||[];
  assert.equal(seams.length,2,"Sólo dos costuras externas: "+id);
  assert.equal(game.inventoryAction(id),true);
  assert.deepEqual(st.types,[id],"Una tarjeta equivale a una pieza real");
  assert.equal(st.track.parts.length,1);
  const end=st.track.ends.end;
  assert.ok(Math.abs(end.x-st.origin.x-radius)<1e-6);
  assert.ok(Math.abs(end.y-st.origin.y-radius)<1e-6);
  assert.ok(Math.abs(end.h-st.origin.h-Math.PI/2)<1e-9);
  assert.deepEqual(JSON.parse(data.get("slotrace-lab-10")).types,[id]);
  assert.equal(game.removeLooseFromCase(id),true,"− retira una sola pieza");
  assert.equal(st.types.length,0);
 }
 elements.get("curveDirection").listeners.click[0]();
 assert.deepEqual(game.curve90Parts("R4_90R"),["R4_90L"]);
 assert.equal(game.inventoryAction("R4_90R"),true);
 assert.deepEqual(st.types,["R4_90L"]);
 assert.equal(game.removeLooseFromCase("R4_90R"),true);
 elements.get("curveDirection").listeners.click[0]();
 game.changeTypes(game.STARTER.slice(),"Óvalo cerrado",[]);
 assert.equal(st.track.closed,true);
 assert.equal(game.inventoryAction("R3_90R"),true);
 assert.equal(st.loose.length,1,"Curva independiente suelta, no 4 fragmentos");
 assert.equal(st.loose[0].id,"R3_90R");
 assert.equal(game.removeLooseFromCase("R3_90R"),true);
 assert.equal(st.loose.length,0);
 // El puente se eleva como tramo por dos puntos, sin depender del dedo en el cruce.
 game.changeTypes(["R2_90R","R3_90R","R2_90R"],"Puente de prueba",[],geo.START);
 game.puzzle.selectByTap("main",1);
 assert.equal(game.puzzle.markBridgeRangeStart(),true);
 assert.equal(st.bridgeRangeStart,1);
 assert.equal(elements.get("bridgeRangeEnd").disabled,false);
 assert.equal(game.puzzle.applyBridgeRange(false),true);
 assert.deepEqual(st.bridgeParts,[1],"La curva central se eleva a 65 mm");
 assert.equal(st.track.elevation.valid,true,"Las curvas grandes vecinas son rampas");
 assert.deepEqual(st.track.elevation.profiles.map(p=>p.mode),["up","plateau","down"]);
 assert.equal(game.puzzle.applyBridgeRange(true),true);
 assert.deepEqual(st.bridgeParts,[],"Se baja el tramo completo de una pulsación");
 game.changeTypes(geo.STARTER.slice(),"Pista circular",[]);
 game.puzzle.selectByTap("main",10);
 assert.equal(game.puzzle.markBridgeRangeStart(),true);
 assert.deepEqual(game.puzzle.bridgeRangeIndices(10,2),[10,11,0,1,2],
  "Seleccionar elevación puede continuar por la línea meta");
 game.puzzle.selectBridgeRelative(1);
 assert.equal(st.selection,11,"El selector navega piezas que se cruzan sin tocarlas");
 game.puzzle.selectBridgeRelative(1);
 assert.equal(st.selection,0,"Anterior y Siguiente recorren todo el circuito");
 assert.match(html,/id="autoClose"[^>]*>✦ Cerrar<\/button>/,
  "Cerrar es una acción visible fuera de Más");
 console.log("SlotRace DEV 0.14.20: estante y curvas R2/R3/R4 de 90 grados — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
