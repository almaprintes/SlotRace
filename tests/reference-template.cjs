"use strict";
// Regresión de plantillas: fondo transparente, escala independiente hasta 2000%,
// arrastre sin mover piezas, guardado por circuito y PNG optativo.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
 const geo=await import("../src/track.mjs");
 const blueprint=await import("../src/blueprint.mjs");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
  .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/gm,"");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 function node(id){
  return{id,children:[],listeners:{},dataset:{},style:{},attrs:{},
   value:"",textContent:"",innerHTML:"",hidden:false,disabled:false,checked:false,
   width:390,height:600,clientWidth:390,
   classList:{add(){},remove(){},toggle(){},contains(){return false}},
   setAttribute(k,v){this.attrs[k]=String(v)},appendChild(child){this.children.push(child);return child;},
   addEventListener(t,fn){(this.listeners[t]??=[]).push(fn)},
   setPointerCapture(){},click(){this.clicked=true},
   getBoundingClientRect(){return{left:0,top:0,width:390,height:600,right:390,bottom:600}},
   querySelectorAll(){return this.children},
   querySelector(sel){
    if(sel===".bridge-kit-cta")return this.kitCta??=node("kit-cta");
    if(sel===".qty")return this.qty??=node("qty");
    if(sel===".grip"||sel===".foam-drag-grip")return this.grip??=node("grip");
    return null;
   }
  };
 }
 let painted=0;
 const context=new Proxy({canvas:{width:0,height:0}},{
  get(obj,k){
   if(k==="drawImage")return()=>{painted++};
   if(k==="createLinearGradient")return()=>({addColorStop(){}});
   return k in obj?obj[k]:()=>{};
  },set(obj,k,value){obj[k]=value;return true;}
 });
 const elements=new Map(ids.map(id=>[id,node(id)]));
 const document={getElementById:id=>elements.get(id),createElement:tag=>{
  const el=node(tag);
  if(tag==="canvas"){el.getContext=()=>context;el.toDataURL=()=> "data:image/jpeg;base64,bW9jaw==";}
  return el;
 },addEventListener(){},hidden:false};
 for(const id of ["editCanvas","raceCanvas"])elements.get(id).getContext=()=>context;
 const window={devicePixelRatio:1,innerWidth:390,innerHeight:844,
  matchMedia:()=>({matches:true}),addEventListener(){},setTimeout:fn=>fn()};
 const files=new Map();
 const localStorage={getItem:k=>files.get(k)||null,setItem:(k,v)=>files.set(k,v)};
 class MockImage{
  constructor(){this.naturalWidth=1000;this.naturalHeight=600;this.width=1000;this.height=600;}
  set src(v){this.source=v;if(this.onload)this.onload();}
  get src(){return this.source;}
 }
 class MockReader{
  readAsDataURL(){this.result="data:image/png;base64,bW9jaw==";this.onload?.();}
 }
 const scheduled=[],raf=fn=>scheduled.push(fn);
 const keys=[...Object.keys(geo),...Object.keys(blueprint)];
 const vals=keys.map(k=>Object.hasOwn(geo,k)?geo[k]:blueprint[k]);
 new Function(...keys,"Image","FileReader","document","window","localStorage",
  "performance","requestAnimationFrame","ResizeObserver","navigator","File",source)(
  ...vals,MockImage,MockReader,document,window,localStorage,{now:()=>0},raf,
  class{observe(){}},{},class{}
 );
 const game=window.slotraceLab,st=game.state,t=game.template;
 assert.equal(game.version,"DEV 0.14.38");
 assert.match(html,/<div class="right">[\s\S]*?id="templateToggle"/,
  "Imagen visible junto a Jugar y sin abrir Más");
 game.openWorkshop();
 assert.equal(st.reference,null);
 elements.get("templateToggle").listeners.click[0]();
 assert.equal(elements.get("templatePanel").hidden,false);
 assert.equal(elements.get("templateMove").disabled,true);
 assert.equal(await t.templateLoadFile({type:"image/png",size:1000}),true);
 assert.ok(st.reference.id.startsWith("ref-"));
 assert.equal(st.reference.opacity,.30);
 assert.equal(st.reference.locked,true);
 assert.equal(st.reference.visible,true);
 assert.equal(st.referenceImage.naturalWidth,1000);
 assert.ok(files.has("slotrace-reference-image-"+st.reference.id),
  "La imagen se almacena separada de la geometría");
 assert.equal(elements.get("templateMove").disabled,false);
 assert.equal(elements.get("templateOpacityValue").textContent,"30 % visible");
 painted=0;t.paintReference(context);
 assert.equal(painted,1,"La imagen se dibuja bajo las vías");
 t.templateSet("opacity",65);
 assert.equal(st.reference.opacity,.65);
 t.templateSet("scale",2000);
 assert.equal(st.reference.scale,20);
 assert.ok(st.reference.width*st.reference.scale>st.workBoard.width*10,
  "La referencia se puede ampliar más de diez veces respecto a la mesa");
 assert.equal(elements.get("templateScaleValue").textContent,"2000 %");
 t.templateSet("angle",45);
 assert.ok(Math.abs(st.reference.angle-Math.PI/4)<1e-8);
 const imageId=st.reference.id;
 assert.equal(t.templateFit(),true);
 assert.ok(Math.abs(st.reference.width*st.reference.scale-st.workBoard.width*.85)<1);
 assert.equal(st.reference.angle,0);

 // El arrastre de imagen no mueve las piezas; al bloquear vuelve el editor.
 const trackBefore=JSON.stringify(st.types);
 const coords={x:st.reference.x,y:st.reference.y};
 assert.equal(t.templateToggleMove(),true);
 assert.equal(st.reference.locked,false);
 const event=(x,y,pointerId=123)=>({clientX:x,clientY:y,pointerId,preventDefault(){}});
 game.puzzle.canvasPointerDown(event(195,300));
 game.puzzle.canvasPointerMove(event(225,320));
 game.puzzle.canvasPointerEnd(event(225,320));
 assert.notDeepEqual({x:st.reference.x,y:st.reference.y},coords);
 assert.equal(JSON.stringify(st.types),trackBefore);
 assert.equal(t.templateToggleMove(),true);
 assert.equal(st.reference.locked,true);
 assert.equal(t.templateToggleMove(),true);
 assert.equal(st.reference.locked,false);
 game.chooseCaseCategory("bridge");
 assert.equal(st.reference.locked,true,
  "Al entrar en Puentes la foto deja de interceptar la selección de piezas");
 t.templateToggleVisibility();
 painted=0;t.paintReference(context);
 assert.equal(painted,0,"Ocultar la imagen no altera el circuito");
 t.templateToggleVisibility();

 // La fotografía no aparece en el PNG salvo que se active explícitamente.
 const pngCtx=new Proxy({canvas:{width:0,height:0}},{
  get(obj,k){
   if(k==="drawImage")return()=>{painted++};
   if(k==="createLinearGradient")return()=>({addColorStop(){}});
   return k in obj?obj[k]:()=>{};
  },set(obj,k,v){obj[k]=v;return true;}
 });
 painted=0;game.drawBlueprint(pngCtx,game.blueprintData());
 assert.equal(painted,0,"Por defecto el plano sale limpio sin fotografía");
 elements.get("templateExport").checked=true;
 elements.get("templateExport").listeners.change[0]({target:elements.get("templateExport")});
 painted=0;game.drawBlueprint(pngCtx,game.blueprintData());
 assert.ok(painted>=1,"El PNG optativo incluye la fotografía");
 assert.equal(st.templateIncludeInExport,true);

 // Mis circuitos persiste el identificador y todos los ajustes.
 elements.get("workCircuitName").value="Pista sobre fotografía";
 assert.equal(game.saveCircuit(),true);
 const cid=st.activeCircuitId;
 const savedCircuit=st.library.find(c=>c.id===cid);
 assert.equal(savedCircuit.snapshot.reference.id,imageId);
 assert.equal(savedCircuit.snapshot.reference.opacity,.65);
 assert.equal(savedCircuit.snapshot.reference.locked,true);
 game.createNewCircuit();
 assert.equal(st.reference,null,"Un circuito nuevo no hereda imágenes accidentalmente");
 assert.equal(game.loadSavedCircuit(cid),true);
 assert.equal(await t.loadReferenceForState(),true);
 assert.equal(st.reference.id,imageId);
 assert.ok(st.referenceImage,"Se recupera el archivo al volver a Mis circuitos");
 assert.equal(st.templateIncludeInExport,false,
  "La exportación con foto no se activa automáticamente en el siguiente circuito");
 t.templateRemove();
 assert.equal(st.reference,null);
 game.undo();
 assert.equal(st.reference.id,imageId,"Deshacer restaura la plantilla");
 assert.equal(await t.loadReferenceForState(),true);
 console.log("SlotRace DEV 0.14.38: plantilla bajo pista, tamaño 2000 %, transparencia, arrastre, bloqueo, persistencia por circuito y PNG opcional — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
