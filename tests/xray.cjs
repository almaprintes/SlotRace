"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
 const geo=await import("../src/track.mjs");
 const blueprint=await import("../src/blueprint.mjs");
 const recipe=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/doble-ovalo.json"),"utf8"));
 const track=geo.buildTrack(recipe.types,recipe.origin,recipe.bridgeParts);
 assert.ok(track.valid&&track.closed,"La receta exacta Doble ovalo está homologada");
 assert.equal(track.parts.length,16);
 assert.ok(track.bridge.crossings.length>20,
  "Incluye una curva a dos alturas coincidente que produce cruces repetidos");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert.match(html,/id="settingsXRay"/,"Rayos X aparece en Ajustes");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
  .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/gm,"");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 function node(id){
  return{id,children:[],dataset:{},listeners:{},style:{},attrs:{},
   textContent:"",value:"0",hidden:false,disabled:false,
   width:390,height:600,clientWidth:390,
   classList:{add(){},remove(){},toggle(){}},
   addEventListener(k,cb){(this.listeners[k]??=[]).push(cb)},
   setAttribute(k,v){this.attrs[k]=v},
   setPointerCapture(){},appendChild(n){this.children.push(n);return n},
   getBoundingClientRect(){return{left:0,top:0,right:390,bottom:600,width:390,height:600}},
   querySelectorAll(){return this.children},
   querySelector(k){
    if(k===".bridge-kit-cta")return this.cta??=node("cta");
    if(k===".qty")return this.qty??=node("qty");
    if(k===".foam-drag-grip")return this.grip??=node("grip");
    if(k===".pocket-minus")return this.minus??=node("minus");
    if(k===".pocket-plus")return this.plus??=node("plus");
    return null;
   }
  };
 }
 const elements=new Map(ids.map(id=>[id,node(id)]));
 const strokes=[],clips=[];
 let dash=[],style="",alpha=1;
 const ctx=new Proxy({},{
  get(_,key){
   if(key==="createLinearGradient")return()=>({addColorStop(){}});
   if(key==="setLineDash")return a=>{dash=[...a]};
   if(key==="stroke")return()=>strokes.push({dash:[...dash],color:style,alpha});
   if(key==="clip")return()=>clips.push("deck");
   return()=>{};
  },
  set(target,key,value){
   if(key==="strokeStyle")style=value;
   if(key==="globalAlpha")alpha=value;
   target[key]=value;return true;
  }
 });
 for(const id of ["raceCanvas","editCanvas"])elements.get(id).getContext=()=>ctx;
 const document={getElementById:id=>elements.get(id),createElement:()=>node("piece"),
  addEventListener(){},hidden:false};
 const window={devicePixelRatio:1,innerWidth:390,innerHeight:844,
  matchMedia:()=>({matches:true}),setTimeout:fn=>fn(),addEventListener(){}};
 const data=new Map();
 const localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const deps={...geo,...blueprint};
 new Function(...Object.keys(deps),"document","window","localStorage","performance",
  "requestAnimationFrame","ResizeObserver",source)(
  ...Object.values(deps),document,window,localStorage,{now:()=>0},()=>{},
  class{observe(){}}
 );
 const game=window.slotraceLab;
 assert.equal(game.state.xRayEnabled,false,"Apagado por defecto");
 assert.equal(elements.get("settingsXRay").attrs["aria-pressed"],"false");
 assert.equal(game.rendering.paintXRayOverlay(ctx,track,null),false,"Sin overlay apagado");
 assert.equal(strokes.length,0);
 const toggle=elements.get("settingsXRay").listeners.click[0];
 assert.equal(typeof toggle,"function","Ajuste funcional");
 toggle();
 assert.equal(game.state.xRayEnabled,true);
 assert.equal(elements.get("settingsXRay").attrs["aria-pressed"],"true");
 const stored=JSON.parse(data.get("slotrace-lab-10"));
 assert.equal(stored.xRayEnabled,true,"La preferencia se guarda");
 const polygons=game.rendering.xRayDeckPolygons(track);
 assert.ok(polygons.length===1&&polygons[0].length>25);
 assert.strictEqual(game.rendering.xRayDeckPolygons(track),polygons,"Máscara cacheada");
 const guides=game.rendering.xRayGroundGuides(track);
 assert.ok(guides.length>0,"Hay tramos inferiores que visualizar");
 assert.ok(guides.every(run=>run.rails.length===2),
  "Los dos carriles inferiores tienen una guía discontinua");
 assert.strictEqual(game.rendering.xRayGroundGuides(track),guides,
  "Los offsets de túneles largos se calculan una vez por trazado");
 const renderSource=source.slice(source.indexOf("function renderScene("),
  source.indexOf("function screenToWorld("));
 assert.ok(renderSource.indexOf("if(state.xRayEnabled)paintXRayOverlay(")<
  renderSource.indexOf("if(track.valid&&carAbove)paintCar("),
  "El coche superior queda encima de las guías Rayos X y no se atraviesa");

 const inside=(p,poly)=>{
  let c=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[i],b=poly[j];
   if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)c=!c;
  }
  return c;
 };
 // El arco inferior 13 está coincidiendo de verdad con el superior 5
 // durante casi todo su recorrido. No es un cruce puntual.
 for(const fraction of [.20,.35,.5,.65,.8]){
  const at=geo.positionOnPiece(track.parts[13].start,track.parts[13].id,fraction);
  assert.ok(polygons.some(p=>inside(at,p)),
   "La curva inferior queda bajo la cubierta en t="+fraction);
 }
 const visible=geo.positionOnPiece(track.parts[1].start,track.parts[1].id,.5);
 assert.ok(!polygons.some(poly=>inside(visible,poly)),
  "No marcar como ocultos carriles a la vista");
 assert.equal(game.rendering.paintXRayOverlay(ctx,track,null),true);
 assert.ok(clips.length>0,"La guía se recorta por el contorno real de la cubierta");
 assert.ok(strokes.some(x=>x.dash.join(",")==="19,15"&&x.color==="#06323e"),
  "Los discontinuos tienen un halo oscuro que mejora su lectura");
 assert.ok(strokes.some(x=>x.dash.join(",")==="19,15"&&x.color==="#8cece8"),
  "Raíles ocultos representados con discontinuos turquesa");
 assert.ok(!strokes.some(x=>x.color==="#b3fffa"),
  "Sin coche no se pinta silueta");
 strokes.length=0;
 const under=geo.positionOnPiece(track.parts[13].start,track.parts[13].id,.5);
 game.rendering.paintXRayOverlay(ctx,track,under);
 assert.ok(strokes.some(x=>x.dash.join(",")==="9,6"&&x.color==="#07313b"),
  "La silueta incorpora contraste sin mostrar el sprite del coche");
 assert.ok(strokes.some(x=>x.dash.join(",")==="9,6"&&x.color==="#b3fffa"),
  "Silueta discontinua de coche oculto, sin sprite");
 toggle();
 assert.equal(game.state.xRayEnabled,false,"Desactivar restaura el modo normal");
 assert.equal(JSON.parse(data.get("slotrace-lab-10")).xRayEnabled,false);
 strokes.length=0;
 assert.equal(game.rendering.paintXRayOverlay(ctx,track,under),false);
 assert.equal(strokes.length,0,"Sin dibujo Rayos X cuando está desactivado");
 console.log("SlotRace DEV 0.14.26: Rayos X en Doble ovalo exacto, curvas, coche y persistencia — OK");
})().catch(e=>{console.error(e);process.exitCode=1});
