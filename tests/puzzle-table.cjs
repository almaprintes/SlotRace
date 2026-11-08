"use strict";
// Comportamiento de mesa-puzzle. Ejecutar con node tests/puzzle-table.cjs.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const geo=await import("../src/track.mjs");
 const blueprint=await import("../src/blueprint.mjs");
 const pt=await import("../src/pt-precision.mjs");
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
 assert.equal(game.version,"DEV 0.14.56");
 assert.equal(st.track.parts.length,14);
 assert.equal(st.track.valid,true);
 assert.ok(elements.has("joinPiece"),"Visible join control exists");

 // Una sola pulsación selecciona la pieza, sin doble toque oculto.
 game.puzzle.selectByTap("main",2);
 assert.equal(st.selectionMode,"piece");
 assert.equal(st.selection,2);
 assert.equal(game.activateGroupMove(),true,"El botón Tramo elige el grupo completo");
 assert.equal(st.selectionMode,"group");
 game.puzzle.selectByTap("main",2);
 assert.equal(st.selectionMode,"piece","Tocar la pieza devuelve el modo individual");
 // Gesto real: tocar una pieza conectada y arrastrar >7 px.
 const before=st.track.parts.map(p=>({id:p.id,start:{...p.start}}));
 const target=st.track.parts[2].points[3],b={...st.workBoard};
 const view=game.workspace.makeView(elements.get("editCanvas"),"build");
 const toScreen=p=>{
  const dx=p.x-view.cx,dy=p.y-view.cy,c=Math.cos(view.angle),sn=Math.sin(view.angle);
  return{clientX:view.w/2+view.panX+(c*dx-sn*dy)*view.scale,
   clientY:view.h/2+view.panY+(sn*dx+c*dy)*view.scale};
 };
 const pos=toScreen(target);
 function event(x,y,pointerId=5){return{pointerId,clientX:x,clientY:y,preventDefault(){}};}
 game.puzzle.canvasPointerDown(event(pos.clientX,pos.clientY));
 assert.equal(st.pointer.get(5)?.trackIndex,2,
  "El dedo inicia sobre la pieza seleccionada (verificar transformaciones de cámara)");
 assert.equal(st.pointer.get(5)?.dragMode,"piece",
  "El gesto está en modo pieza antes de separar el grupo");
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
 assert.ok(st.workBoard.left<=b.left&&st.workBoard.right>=b.right,
  "La superficie puede ampliarse sin desplazar lo montado");
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
 // La pieza seleccionada debe aparecer delante del jugador, no repartida
 // por una superficie cada vez más grande. Después se mueven aparte
 // para probar las conexiones magnéticas sin solapamientos artificiales.
 const central=game.puzzle.workshopVisibleCenter();
 for(const piece of st.loose){
  const middle=geo.positionOnPiece(piece,piece.id,.5);
  assert.ok(Math.hypot(middle.x-central.x,middle.y-central.y)<18,
   "Cada nueva pieza aparece centrada incluso con otras piezas presentes");
 }
 st.loose[1].x+=450;st.loose[1].y+=270;
 st.loose[2].x-=550;st.loose[2].y+=350;
 const positions=st.loose.map(p=>({...p}));
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

 // Regresión: al separar un tramo, TODAS las piezas han de compartir imán.
 game.changeTypes(["S350","R3_90R","S175"],"Grupo que se desprende",[],{x:500,y:500,h:0});
 const detached=game.puzzle.detachConnected(1);
 assert.equal(st.loose.length,2);
 assert.deepEqual(game.puzzle.looseMembers(detached),[0,1],
  "La primera pieza del tramo también pertenece al grupo magnético");
 assert.equal(st.loose[0].magnetGroup,st.loose[1].magnetGroup);
 assert.equal(game.puzzle.snapLoose(detached),true,"Tramo completo vuelve a encajar");
 assert.deepEqual(st.types,["S350","R3_90R","S175"]);
 // Inversión real de un grupo de dos curvas: antes el límite de giro 90°
 // impedía conectar el final del grupo con el final del circuito.
 game.changeTypes(["S350"],"Inversión de grupo",[],{x:500,y:500,h:0});
 const reverseFirst=geo.positionOnPiece({x:0,y:0,h:0},"R3_225R",1);
 const reverseEnd=geo.positionOnPiece(reverseFirst,"R3_225R",1);
 const reverseStart={x:850-reverseEnd.x,y:500-reverseEnd.y,h:0};
 const reverseNext=geo.positionOnPiece(reverseStart,"R3_225R",1);
 st.loose=[
  {id:"R3_225R",...reverseStart,magnetGroup:"magnet-prueba",magnetOrder:0},
  {id:"R3_225R",x:reverseNext.x,y:reverseNext.y,h:reverseNext.h,magnetGroup:"magnet-prueba",magnetOrder:1}
 ];
 const proposal=game.puzzle.bestMagnet(0);
 assert.ok(proposal?.reversed&&proposal?.kind==="main");
 assert.ok(Math.abs(proposal.rotation)>Math.PI/2,
  "La unión necesita un giro superior a 90°");
 assert.equal(game.puzzle.snapLoose(0),true);
 assert.deepEqual(st.types,["S350","R3_225L","R3_225L"]);
 for(let i=1;i<st.track.parts.length;i++){
  assert.ok(Math.hypot(st.track.parts[i-1].end.x-st.track.parts[i].start.x,
   st.track.parts[i-1].end.y-st.track.parts[i].start.y)<1e-6,
   "Sin separaciones al unir un grupo girado");
 }
 // Dos grupos sueltos que no forman aún una pista principal.
 game.changeTypes([],"Imanes entre grupos",[],geo.START);
 st.loose=[
  {id:"S175",x:500,y:500,h:0,magnetGroup:"magnet-a",magnetOrder:0},
  {id:"S175",x:675,y:500,h:0,magnetGroup:"magnet-a",magnetOrder:1},
  {id:"R3_90R",x:855,y:504,h:0}
 ];
 assert.equal(game.puzzle.snapLoose(2),true,"Una curva grande conecta a un grupo");
 assert.equal(game.puzzle.looseGroup(0).indices.length,3);
 // Arrastrar el tramo PRINCIPAL hacia una pieza suelta también dispara el imán.
 game.changeTypes(["S350"],"Arrastre del tramo principal",[],{x:500,y:500,h:0});
 st.loose=[{id:"R3_90R",x:858,y:504,h:0}];
 st.pointer.set(441,{moveMain:true,dragged:true,looseIndex:-1,consumed:false});
 game.puzzle.canvasPointerEnd({pointerId:441,clientX:100,clientY:100});
 assert.deepEqual(st.types,["S350","R3_90R"],
  "El tramo principal arrastrado se acopla a una curva suelta cercana");
 assert.equal(st.loose.length,0);
 // En un cruce, los toques sucesivos alternan PIEZA ↔ TRAMO sin
 // cambiar arbitrariamente a la vía inferior debajo del mismo dedo.
 const crossingTypes=[...geo.FIGURE_EIGHT.slice(7),...geo.FIGURE_EIGHT.slice(0,7)];
 game.changeTypes(crossingTypes,"Cruce de prueba",[],geo.START);
 const crossing=st.track.crossings[0];
 assert.ok(crossing,"Hay cruce geométrico que permite probar la selección");
 const candidates=game.puzzle.selectMainAtCrossing(crossing.x,crossing.y).map(p=>p.index);
 assert.ok(candidates.includes(crossing.a)&&candidates.includes(crossing.b),
  "Ambas capas son seleccionables");
 function tapCrossing(pointerId){
  st.pointer.set(pointerId,{
   x:195,y:300,originX:195,originY:300,
   originWorld:{x:crossing.x,y:crossing.y},
   trackIndex:candidates[0],trackCandidates:candidates,
   looseIndex:-1,dragged:false,consumed:false
  });
  game.puzzle.canvasPointerEnd({pointerId,clientX:195,clientY:300});
 }
 st.selection=-1;st.looseSelection=-1;st.selectedGroup=null;st.selectionMode="group";
 tapCrossing(201);assert.equal(st.selection,candidates[0]);
 assert.equal(st.selectionMode,"piece","Primer toque selecciona una pieza");
 tapCrossing(202);assert.equal(st.selection,candidates[0]);
 assert.equal(st.selectionMode,"group","Segundo toque selecciona el tramo conectado");
 tapCrossing(203);assert.equal(st.selection,candidates[0]);
 assert.equal(st.selectionMode,"piece","Tercer toque vuelve a esa misma pieza");
 game.puzzle.selectByTap("main",candidates[1]);
 assert.equal(st.selection,candidates[1]);
 assert.equal(st.selectionMode,"piece","Tocar otra pieza cambia la selección");
 // Un grupo de piezas unidas magnéticamente obedece a la misma alternancia.
 game.changeTypes([],"Alternar selección en grupo suelto",[
  {id:"S350",x:500,y:500,h:0,magnetGroup:"group-switch",magnetOrder:0},
  {id:"S175",x:850,y:500,h:0,magnetGroup:"group-switch",magnetOrder:1}
 ],geo.START);
 st.selectedGroup=null;st.selectionMode="group";st.looseSelection=-1;
 game.puzzle.selectByTap("loose",1);
 assert.equal(st.selectionMode,"piece");
 game.puzzle.selectByTap("loose",1);
 assert.equal(st.selectionMode,"group");
 assert.equal(st.selectedGroup,"group-switch");
 game.puzzle.selectByTap("loose",1);
 assert.equal(st.selectionMode,"piece");
 // El circuito Catalunya Slot se podrá cerrar con una flexión leve
 // aun si el último conector SOBRA ~9,9 mm o FALTA ~9,1 mm.
 const nearIds=[
  "S0875","S0875","R2_225R","R1_225R","R3_225R","R1_225R",
  "S075","R2_45R","R2_45R","R2_45R","R2_45R","S175",
  "R1_225R","R1_225R","R1_225R","R1_225R"
 ];
 let pose={x:0,y:0,h:0};
 const rawParts=nearIds.map((id,order)=>{
  const part={id,x:pose.x,y:pose.y,h:pose.h,magnetGroup:"catalunya-flex",magnetOrder:order};
  pose=pt.endpoint(pose,id);
  return part;
 });
 game.changeTypes([],"Catalunya Slot (cierre flexible)",rawParts,{x:0,y:0,h:0});
 assert.equal(st.loose.length,nearIds.length);
 const closeGap=game.puzzle.measureOpenGap();
 assert.ok(closeGap&&closeGap.distance>3&&closeGap.distance<10);
 assert.equal(elements.get("boardGapInfo").hidden,false,
  "Medir hueco debe publicar el dato encima de la mesa");
 assert.equal(elements.get("boardGapInfo").dataset.status,"flex");
 assert.match(elements.get("boardGapInfo").textContent,/CIERRE FLEXIBLE DISPONIBLE/);
 assert.match(elements.get("boardGapInfo").textContent,/10 mm/);
 game.puzzle.paintGapDiagnostic(ctx); // Dibujar puntos y unión sin errores
 assert.equal(game.puzzle.closeExactly(),undefined);
 assert.equal(st.track.closed,true,
  "Pulsar Cerrar fuerza la holgura de menos de 10 mm");
 assert.equal(st.track.forcedClosure,true);
 assert.equal(st.loose.length,0,"El grupo magnético pasa al circuito cerrado");
 assert.equal(st.track.types.length,nearIds.length);
 assert.equal(elements.get("boardGapInfo").hidden,true,
  "La medición se retira al cerrarse el montaje");
 console.log("SlotRace DEV 0.14.56 puzzle table: touch-drag, unchanged neighbours, multi-piece scattering, join, undo/redo and save — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
