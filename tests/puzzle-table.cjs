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
 assert.equal(game.version,"DEV 0.13.2");
 assert.equal(st.track.parts.length,14);
 assert.equal(st.track.valid,true);
 assert.ok(elements.has("joinPiece"),"Visible join control exists");

 // Primera pulsación selecciona el tramo entero; la segunda, la pieza.
 game.puzzle.selectByTap("main",2);
 assert.equal(st.selectionMode,"group");
 game.puzzle.selectByTap("main",2);
 assert.equal(st.selectionMode,"piece");
 // Gesto real: tocar una pieza conectada y arrastrar >7 px.
 const before=st.track.parts.map(p=>({id:p.id,start:{...p.start}}));
 const target=st.track.parts[2].points[3],b=st.workBoard;
 const scale=Math.min((390-16)/b.height,(600-16)/b.width);
 const toScreen=p=>({clientX:195-scale*(p.y-(b.top+b.bottom)/2),
    clientY:300+scale*(p.x-(b.left+b.right)/2)});
 const pos=toScreen(target);
 function event(x,y,pointerId=5){return{pointerId,clientX:x,clientY:y,preventDefault(){}};}
 game.puzzle.canvasPointerDown(event(pos.clientX,pos.clientY));
 game.puzzle.canvasPointerMove(event(pos.clientX+44,pos.clientY+25));
 game.puzzle.canvasPointerEnd(event(pos.clientX+44,pos.clientY+25));
 assert.equal(st.types.length,2,"The track is split at the moved piece");
 assert.equal(st.loose.length,12,"The moved piece and all following pieces remain on the table");
 for(let k=1;k<st.loose.length;k++){
  const expected=before[k+2].start,actual=st.loose[k];
  assert.equal(actual.x,expected.x,"Unmoved piece X cannot jump");
  assert.equal(actual.y,expected.y,"Unmoved piece Y cannot jump");
  assert.equal(actual.h,expected.h,"Unmoved piece direction cannot change");
 }
 assert.ok(st.loose[0].x!==before[2].start.x||st.loose[0].y!==before[2].start.y,
  "Dragged piece actually moves");
 assert.equal(st.workBoard.left,b.left);
 assert.equal(st.workBoard.right,b.right);
 const separated=st.loose.map(p=>({...p}));
 game.undo();
 assert.deepEqual(st.types,geo.FIGURE_EIGHT,"Undo restores original circuit");
 assert.equal(st.loose.length,0,"Undo removes the detached fragments");
 game.redo();
 assert.equal(st.types.length,2,"Redo restores the split");
 assert.deepEqual(st.loose,separated,"Redo restores physical piece positions");

 // A pile of scattered pieces can be placed freely and remains independent.
 game.changeTypes([],"Mesa vacía",[],geo.START);
 assert.equal(st.types.length,0);
 game.puzzle.scatterLoose("S350");
 game.puzzle.scatterLoose("R2_45R");
 game.puzzle.scatterLoose("S175");
 assert.equal(st.types.length,0,"Catalog tapping does NOT auto-connect");
 assert.equal(st.loose.length,3,"Multiple independent pieces can coexist");
 const positions=st.loose.map(p=>({...p}));
 assert.notDeepEqual([positions[0].x,positions[0].y],[positions[1].x,positions[1].y],
  "Different pieces should be scattered rather than stacked");
 assert.notDeepEqual([positions[1].x,positions[1].y],[positions[2].x,positions[2].y]);
 assert.equal(elements.get("joinPiece").disabled,false);
 st.looseSelection=0;
 game.puzzle.startSelectedPiece();
 assert.equal(st.types.length,1,"Player explicitly starts chain");
 assert.equal(st.loose.length,2);
 assert.equal(st.origin.x,positions[0].x);
 assert.equal(st.origin.y,positions[0].y);
 const end=st.track.ends.end;
 st.loose[0].x=end.x+15;st.loose[0].y=end.y+12;st.loose[0].h=end.h;
 st.looseSelection=0;
 game.puzzle.startSelectedPiece();
 assert.deepEqual(st.types,["S350","R2_45R"],"Only an intentionally joined piece snaps");
 assert.equal(st.loose.length,1,"Third scattered piece remains where it was");
 // También se pueden conectar piezas por el comienzo, como en un puzzle.
 game.puzzle.scatterLoose("S175");
 const prepend=st.loose.length-1,prior=st.track.parts.map(x=>({...x.start}));
 const newH=st.origin.h;
 const idealStart={x:st.origin.x-175*Math.cos(newH),
                   y:st.origin.y-175*Math.sin(newH),h:newH};
 st.loose[prepend].x=idealStart.x+5;
 st.loose[prepend].y=idealStart.y+5;
 st.loose[prepend].h=newH;
 st.looseSelection=prepend;
 game.puzzle.startSelectedPiece();
 assert.deepEqual(st.types,["S175","S350","R2_45R"],"Join at first connector prepends a piece");
 for(let i=0;i<prior.length;i++){
  assert.ok(Math.hypot(st.track.parts[i+1].start.x-prior[i].x,
                      st.track.parts[i+1].start.y-prior[i].y)<1e-6,
    "Prepending cannot move original assembled pieces");
 }
 const previousStored=JSON.parse(saved.get("slotrace-lab-10"));
 assert.ok(Math.abs(previousStored.origin.x-idealStart.x)<1e-5,
  "Prepending updates and persists world anchor");
 assert.equal(previousStored.loose.length,1,"Loose piece persists to local storage");
 // Regresión visual: dos módulos magnéticos comparten UNA sombra y
 // sólo dos juntas externas; nunca dos siluetas independientes superpuestas.
 game.changeTypes([],"Mesa limpia para probar uniones",[],geo.START);
 game.puzzle.scatterLoose("S350");
 game.puzzle.scatterLoose("S350");
 const free=st.loose[0],joined=st.loose[1];
 const endOfFirst=geo.positionOnPiece({x:free.x,y:free.y,h:free.h},free.id,1);
 joined.x=endOfFirst.x+5;joined.y=endOfFirst.y+4;joined.h=free.h;
 assert.equal(game.puzzle.snapLoose(1,{force:true}),true,"La segunda recta se une a la primera");
 const groups=game.puzzle.loosePaintGroups();
 assert.equal(groups.length,1,"Dos piezas encajadas = un único grupo visual");
 assert.equal(groups[0].parts.length,2);
 assert.equal(groups[0].points.length,
   groups[0].parts[0].points.length+groups[0].parts[1].points.length-1,
   "La trayectoria continua no duplica el punto de unión");
 window.__seamLog.length=0;window.__shadowLog.length=0;
 game.puzzle.paintLoose(ctx);
 assert.equal(window.__shadowLog.length,1,"Sólo una sombra exterior para el grupo acoplado");
 assert.equal(window.__seamLog.length,2,"Sin sombra ni costura interior entre las piezas");
 assert.ok(window.__shadowLog[0]>groups[0].parts[0].points.length,
  "La sombra debe cubrir las dos rectas como un único contorno");
 const stored=JSON.parse(saved.get("slotrace-lab-10"));
 assert.equal(stored.types.length,0,"Las piezas se guardan como tramo libre");
 assert.equal(stored.loose.length,2,"El grupo de dos piezas se guarda completo");
 assert.ok(stored.workBoard,"Visible tabletop bounds persist");
 // Conexión simétrica: probar las cuatro combinaciones de extremos de
 // dos piezas individuales, incluidos los casos antes rechazados.
 function checkBothEnds(label,moving,expectedSide,expectedReverse,expectedId){
  game.changeTypes([],"Test de conectores: "+label,[
   ],geo.START);
  // Las piezas de laboratorio se colocan en posiciones geométricas precisas.
  st.loose=[
   {id:"S350",x:500,y:500,h:0},
   {id:moving.id,x:moving.x,y:moving.y,h:moving.h}
  ];
  const found=game.puzzle.bestMagnet(1);
  assert.ok(found,"El imán localiza el conector: "+label);
  assert.equal(found.side,expectedSide,label+": extremo correcto");
  assert.equal(found.reversed,expectedReverse,label+": inversión correcta");
  assert.equal(game.puzzle.snapLoose(1,{force:false}),true,label+": acoplamiento efectivo");
  const groups=game.puzzle.loosePaintGroups();
  assert.equal(groups.length,1,label+": único grupo magnético");
  assert.equal(groups[0].parts.length,2,label+": dos piezas alineadas");
  const [first,second]=groups[0].parts;
  const end=geo.positionOnPiece(first.start,first.id,1);
  assert.ok(Math.hypot(end.x-second.start.x,end.y-second.start.y)<1e-6,label+": unión exacta");
  assert.ok(Math.abs(Math.atan2(Math.sin(end.h-second.start.h),
    Math.cos(end.h-second.start.h)))<1e-8,label+": orientación exacta");
  assert.equal(st.loose[1].id,expectedId,label+": identificación del módulo");
 }
 checkBothEnds("normal final-inicio",{id:"S175",x:856,y:504,h:0},"append",false,"S175");
 checkBothEnds("normal inicio-final",{id:"S175",x:315,y:504,h:0},"prepend",false,"S175");
 checkBothEnds("inverso final-final",{id:"S175",x:681,y:504,h:0},"append",true,"S175");
 checkBothEnds("inverso inicio-inicio",{id:"S175",x:504,y:504,h:0},"prepend",true,"S175");
 checkBothEnds("endereza 180 grados",{id:"S175",x:856,y:504,h:Math.PI},"append",false,"S175");
 checkBothEnds("curva reversible",{id:"R4_225R",x:504,y:504,h:0},"prepend",true,"R4_225L");
 // Caso específico de la captura: salida/meta de 350 mm sobre un extremo
 // de un tramo más corto. El usuario no debe girarla manualmente.
 for(const [label,x,side] of [
  ["Salida/meta por inicio",504,"prepend"],
  ["Salida/meta por final",325,"append"]
 ]){
  game.changeTypes([],"Prueba salida/meta "+label,[],geo.START);
  st.loose=[{id:"S175",x:500,y:500,h:0},{id:"START350",x,y:504,h:0}];
  const proposal=game.puzzle.bestMagnet(1);
  assert.ok(proposal,label+" tiene un conector candidato");
  assert.equal(proposal.side,side,label+" escoge el extremo correcto");
  assert.equal(proposal.reversed,true,label+" reorienta la pieza");
  assert.equal(game.puzzle.snapLoose(1),true,label+" encaja con imán");
  const parts=game.puzzle.loosePaintGroups()[0].parts;
  assert.equal(parts.length,2,label+" queda unida");
  const tip=geo.positionOnPiece(parts[0].start,parts[0].id,1);
  assert.ok(Math.hypot(tip.x-parts[1].start.x,tip.y-parts[1].start.y)<1e-6,
   label+" queda sin separación");
 }

 console.log("SlotRace DEV 0.13.2 puzzle table: touch-drag, unchanged neighbours, multi-piece scattering, join, undo/redo and save — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
