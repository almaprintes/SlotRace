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
 const game=window.slotraceLab,st=game.state,allTypes=Object.keys(geo.CATALOG).filter(id=>!id.includes("_")||id.endsWith("R"));
 game.openWorkshop();
 assert.equal(game.version,"DEV 0.10.1");
 assert.equal(st.caseOpen,true,"Caja de corcho abierta por defecto");
 assert.equal(elements.get("caseInterior").hidden,false);
 assert.equal(elements.get("caseClosed").hidden,true);
 const pockets=elements.get("pieces").children;
 assert.equal(pockets.length,13,"Una caja con trece huecos y cinco longitudes de recta");
 assert.ok(!pockets.some(p=>p.dataset.piece==="S0125"),"La pieza heredada de 12,5 mm no aparece en la caja");
 assert.deepEqual(pockets.map(p=>p.dataset.piece),allTypes);
 assert.match(css,/foam-insert/,"La caja tiene espuma troquelada");
 assert.match(css,/foam-cutout/,"La espuma conserva el hueco de cada módulo");
 assert.match(css,/overflow-y:scroll/,"La caja tiene desplazamiento vertical nativo");
 assert.match(css,/-webkit-overflow-scrolling:touch/,"Safari conserva la inercia del scroll");
 assert.match(css,/cursor:pointer;touch-action:pan-y/,"Deslizar sobre la pieza desplaza la caja");
 assert.match(css,/foam-drag-grip[^}]*touch-action:none/s,"El asa permite sacar piezas sin bloquear el scroll");
 assert.match(html,/↕ DESLIZA PARA VER PIEZAS/,"Ayuda visible de scroll");
 assert.match(html,/id="bridgeKit"/,"Kit puente disponible dentro de la caja");
 assert.match(html,/2 apoyos \+ 2 rampas/,"El kit aporta rampas y soportes");
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
  assert.equal(p.listeners.click.length,1,"También permite sacar tocando");
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
 console.log("SlotRace DEV 0.10.1: maletín único, trece recortes, inventario exacto, toque/arrastre, abrir/cerrar y sin extracciones duplicadas — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
