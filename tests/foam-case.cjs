"use strict";
// El maletín de SlotRace debe ser una única caja con seis cavidades
// físicas, apilado real de inventario, extracción táctil y guardado.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
 const geo=await import("../src/track.mjs");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
   .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/,"");
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
   querySelector(sel){if(sel===".qty")return this.qty??=node("qty");return null;}
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
 const keys=Object.keys(geo),values=keys.map(k=>geo[k]);
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",source)(
  ...values,document,window,localStorage,{now:()=>10},fn=>callbacks.push(fn),class{observe(){}}
 );
 const game=window.slotraceLab,st=game.state,allTypes=Object.keys(geo.CATALOG);
 assert.equal(game.version,"DEV 0.7.0");
 assert.equal(st.caseOpen,true,"Caja de corcho abierta por defecto");
 assert.equal(elements.get("caseInterior").hidden,false);
 assert.equal(elements.get("caseClosed").hidden,true);
 const pockets=elements.get("pieces").children;
 assert.equal(pockets.length,6,"Una sola caja con seis formas de hueco");
 assert.deepEqual(pockets.map(p=>p.dataset.piece),allTypes);
 assert.match(css,/foam-insert/,"La caja tiene espuma troquelada");
 assert.match(css,/foam-cutout/,"La espuma conserva el hueco de cada módulo");
 assert.match(html,/id="caseInterior"/);
 assert.match(html,/id="caseToggle"/);
 const byId=id=>pockets.find(p=>p.dataset.piece===id);
 for(const p of pockets){
  assert.match(p.innerHTML,/foam-cutout/,"El hueco tiene silueta de corte");
  assert.match(p.innerHTML,/mini-slot-piece/,"El hueco contiene el módulo apilado");
  assert.equal(p.listeners.pointerdown.length,1,"Cualquier pieza permite cogerla con el dedo");
  assert.equal(p.listeners.click.length,1,"También permite sacar tocando");
 }
 assert.notEqual(byId("S350").innerHTML,byId("S175").innerHTML,"Rectas de distinta longitud");
 assert.notEqual(byId("R2R").innerHTML,byId("R2L").innerHTML,"Curvas de sentidos contrarios");
 assert.notEqual(byId("R2R").innerHTML,byId("R1R").innerHTML,"Curvas de diferente radio");
 assert.equal(byId("S350").disabled,true,"El hueco vacío sigue visible, no se puede gastar");
 assert.equal(byId("S350").qty.textContent,"×0");
 assert.equal(byId("S175").qty.textContent,"×4");
 assert.equal(byId("R2R").qty.textContent,"×7");
 const total=Object.values(geo.CATALOG).reduce((n,x)=>n+x.stock,0);
 assert.equal(elements.get("caseCount").textContent,(total-18)+" de "+total+" piezas en sus huecos");

 const tap=id=>byId(id).listeners.click[0]({detail:0});
 tap("S175");tap("S175");
 assert.equal(st.loose.length,2,"Permite sacar varias piezas del mismo hueco");
 assert.equal(st.types.length,18,"Las piezas ensambladas no se alteran");
 assert.equal(byId("S175").qty.textContent,"×2");
 assert.equal(elements.get("caseCount").textContent,(total-20)+" de "+total+" piezas en sus huecos");

 // Cerrar la caja no borra las piezas sacadas ni altera el circuito.
 const toggle=elements.get("caseToggle");
 toggle.listeners.click[0]();
 assert.equal(st.caseOpen,false);
 assert.equal(elements.get("caseInterior").hidden,true);
 assert.equal(elements.get("caseClosed").hidden,false);
 assert.equal(toggle.attrs["aria-expanded"],"false");
 assert.equal(st.loose.length,2);
 assert.equal(JSON.parse(data.get("slotrace-lab-05")).caseOpen,false);
 toggle.listeners.click[0]();
 assert.equal(st.caseOpen,true);
 assert.equal(toggle.attrs["aria-expanded"],"true");

 // Sacar arrastrando una curva hacia el tapete sin activar además el click.
 const pocket=byId("R1R");
 const event=(x,y,id=21)=>({clientX:x,clientY:y,pointerId:id,preventDefault(){}});
 const board=st.workBoard;
 const scale=Math.min((390-16)/board.height,(600-16)/board.width);
 const pt={x:board.left+board.width*.53,y:board.top+board.height*.47};
 const target={x:195-scale*(pt.y-(board.top+board.bottom)/2),
   y:300+scale*(pt.x-(board.left+board.right)/2)};
 pocket.listeners.pointerdown[0](event(200,720));
 pocket.listeners.pointermove[0](event(target.x,target.y));
 pocket.listeners.pointerup[0](event(target.x,target.y));
 assert.equal(st.loose.length,3,"Arrastrar saca exactamente una pieza");
 assert.equal(byId("R1R").qty.textContent,"×5");
 assert.equal(st.types.length,18);
 assert.equal(st.loose.at(-1).id,"R1R");
 pocket.listeners.click[0]({detail:1});
 assert.equal(st.loose.length,3,"El click sintético tras arrastrar no duplica la pieza");
 tap("R1R");
 assert.equal(st.loose.length,4,"El siguiente toque vuelve a sacar otra pieza");
 assert.equal(byId("R1R").qty.textContent,"×4");

 // Cancelar un gesto o soltar fuera de la mesa no debe gastar inventario.
 pocket.listeners.pointerdown[0](event(200,720,28));
 pocket.listeners.pointercancel[0](event(200,600,28));
 assert.equal(st.loose.length,4);
 pocket.listeners.pointerdown[0](event(200,720,29));
 pocket.listeners.pointermove[0](event(400,710,29));
 pocket.listeners.pointerup[0](event(400,710,29));
 assert.equal(st.loose.length,4,"Soltar fuera de la mesa no extrae piezas");

 // Safari iOS: confirmar extracción en pointerup aunque no haya click
 // sintético; si llega ese click, tampoco puede duplicar el inventario.
 const touchPocket=byId("R1L");
 touchPocket.listeners.pointerdown[0](event(150,730,40));
 touchPocket.listeners.pointerup[0](event(150,730,40));
 assert.equal(st.loose.length,5,"El toque táctil corto saca una pieza");
 touchPocket.listeners.click[0]({detail:1});
 assert.equal(st.loose.length,5,"El click sintético no crea una segunda pieza");
 tap("R1L");
 assert.equal(st.loose.length,6,"El toque siguiente vuelve a funcionar");

 assert.ok(JSON.parse(data.get("slotrace-lab-05")).loose.length>=4,
  "El contenido extraído queda guardado en el montaje");
 console.log("SlotRace DEV 0.7.0: maletín único, seis recortes, inventario exacto, toque/arrastre, abrir/cerrar y sin extracciones duplicadas — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
