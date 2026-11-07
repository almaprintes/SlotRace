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
 // Las dos fronteras suelo/rampa del Doble ovalo deben renderizarse como
 // conectores continuos, no como cuatro tapas rectas que se superponen.
 const seamsExpected=[[2,3],[8,9]];

 assert.ok(track.bridge.crossings.length>20,
  "Incluye una curva a dos alturas coincidente que produce cruces repetidos");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert.match(html,/id="settingsXRay"/,"Rayos X aparece en Ajustes");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
  .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/gm,"")
  .replace("function paintSeam(ctx,p){",
   "function paintSeam(ctx,p){window.__seamPositions.push(p);");
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
  __seamPositions:[],
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
 const transitions=game.rendering.elevationJoins(track);
 assert.deepEqual(transitions.map(j=>[j.from,j.to]),seamsExpected,
  "Solo las dos fronteras suelo-rampa se sueldan; no se tocan los cruces");
 assert.strictEqual(game.rendering.elevationJoins(track),transitions,
  "La geometría de las juntas se conserva en caché");
 for(const join of transitions){
  const before=track.parts[join.from],after=track.parts[join.to];
  assert.ok(Math.hypot(join.x-before.end.x,join.y-before.end.y)<.01);
  assert.ok(Math.hypot(after.start.x-join.x,after.start.y-join.y)<.01);
  assert.equal(join.points.length,before.points.length+after.points.length-1,
   "El asfalto se pinta como una sola ruta sin dos extremos en la frontera");
 }
 // Instrumentar el pintado real: la detección geométrica era correcta
 // en la .29, pero la costura seguía apareciendo sobre la pista.
 const checkSeams=(testTrack,label)=>{
  const boundaries=game.rendering.elevationJoins(testTrack);
  const omit=new Set(boundaries.map(j=>j.to));
  window.__seamPositions.length=0;
  game.rendering.paintGroundTrack(ctx,testTrack,true);
  const painted=window.__seamPositions.slice();
  assert.equal(painted.length,testTrack.parts.length-omit.size,
   label+": costuras ordinarias visibles y fronteras de rampa sin marca");
  for(const part of testTrack.parts){
   const hits=painted.filter(p=>p===part.start);
   assert.equal(hits.length,omit.has(part.index)?0:1,
    label+": costura del módulo "+part.index);
  }
  window.__seamPositions.length=0;
  game.rendering.paintGroundTrack(ctx,testTrack,false);
  assert.equal(window.__seamPositions.length,0,
   label+": las carreras no muestran juntas");
 };
 checkSeams(track,"Doble óvalo");
 const rotate=3;
 const rotated=geo.buildTrack(
  [...recipe.types.slice(rotate),...recipe.types.slice(0,rotate)],
  track.parts[rotate].start,
  recipe.bridgeParts.map(i=>(i-rotate+recipe.types.length)%recipe.types.length));
 assert.ok(rotated.closed&&rotated.valid,
  "Rotar la numeración del circuito mantiene una receta válida");
 assert.ok(game.rendering.elevationJoins(rotated).some(j=>j.to===0),
  "El empalme suelo/rampa debe funcionar también en el índice cero");
 checkSeams(rotated,"Doble óvalo rotado");
 const rampPainter=source.slice(source.indexOf("function paintBridgeRampProfile("),
  source.indexOf("function paintBridgePillars("));
 assert.match(rampPainter,/spans=\[\[\.08,\.92\]\]/,
  "Las marcas de rampa deben quedar dentro de sus conectores");

 const baseBefore=strokes.length;
 game.rendering.paintGroundTrack(ctx,track,false);
 assert.ok(strokes.length>baseBefore,
  "La base geométrica se pinta como una sola pista continua");
 assert.match(source,/function paintGroundTrack\(ctx,track,editing\)\{[\s\S]*?paintContinuousTrack\(ctx,track,editing\);/,
  "La base del circuito debe usar la trayectoria única completa");
 const renderBody=source.slice(source.indexOf("function renderScene("),
  source.indexOf("function screenToWorld("));
 assert.doesNotMatch(renderBody,/paintElevationJoins\(/,
  "No puede haber parches de juntas dibujados encima de otros niveles");
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
 assert.ok(strokes.some(x=>x.dash.join(",")==="23,17"&&x.color==="#06323e"),
  "Los discontinuos tienen un halo oscuro que mejora su lectura");
 assert.ok(strokes.some(x=>x.dash.join(",")==="23,17"&&x.color==="#8cece8"),
  "Raíles ocultos representados con discontinuos turquesa");
 assert.ok(!strokes.some(x=>x.color==="#a8fff2"),
  "Sin coche no se pinta silueta");
 strokes.length=0;
 const under=geo.positionOnPiece(track.parts[13].start,track.parts[13].id,.5);
 game.rendering.paintXRayOverlay(ctx,track,under);
 assert.ok(strokes.some(x=>x.dash.join(",")==="10,5"&&x.color==="#052b34"),
  "La silueta incorpora contraste sin mostrar el sprite del coche");
 assert.ok(strokes.some(x=>x.dash.join(",")==="10,5"&&x.color==="#a8fff2"),
  "Silueta discontinua de coche oculto, sin sprite");
 const silhouetteSource=source.slice(
  source.indexOf("function traceXRayCarBody("),
  source.indexOf("// Guardar las guías de los carriles"));
 assert.match(silhouetteSource,/quadraticCurveTo/,
  "La carrocería debe tener curvas reales, no un rectángulo de colisión");
 assert.doesNotMatch(silhouetteSource,/roundRect\(ctx,-CAR_LENGTH_MM/,
  "No se permite regresar al contorno rectangular anterior");
 assert.match(source,/ctx\.lineCap="round";ctx\.lineJoin="round";ctx\.stroke\(\)/,
  "Los discontinuos deben acabar redondeados");

 toggle();
 assert.equal(game.state.xRayEnabled,false,"Desactivar restaura el modo normal");
 assert.equal(JSON.parse(data.get("slotrace-lab-10")).xRayEnabled,false);
 strokes.length=0;
 assert.equal(game.rendering.paintXRayOverlay(ctx,track,under),false);
 assert.equal(strokes.length,0,"Sin dibujo Rayos X cuando está desactivado");
 console.log("SlotRace DEV 0.14.30: Rayos X en Doble ovalo exacto, curvas, coche y persistencia — OK");
})().catch(e=>{console.error(e);process.exitCode=1});
