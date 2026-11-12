"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core");
(async()=>{
 let stage="iniciando Chrome";
 const watchdog=setTimeout(()=>{console.error("BROWSER STALLED at:",stage);process.exit(4);},40000);

 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];
 page.on("pageerror",err=>{errors.push("pageerror "+String(err.stack||err));console.log("PAGEERROR",String(err.stack||err));});
 page.on("console",msg=>{if(msg.type()==="error")console.log("CONSOLE",msg.text());});
 page.on("requestfailed",req=>console.log("REQUESTFAILED",req.url(),req.failure()?.errorText));
 stage="cargando portada";
 await page.goto("http://127.0.0.1:4173/index.html?v=browser-render",{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForFunction(()=>Boolean(window.slotraceLab),{timeout:25000});
 const initial=await page.evaluate(()=>({version:window.slotraceLab.version,
   trackValid:window.slotraceLab.state.track.valid,
   trackLength:window.slotraceLab.state.track.length,
   pieces:window.slotraceLab.state.types.length,
   mode:window.slotraceLab.state.mode}));
 console.log("INITIAL",JSON.stringify(initial));
 stage="abriendo carrera";
 console.log("BEFORE OPEN RACE");
 const started=await page.evaluate(()=>{
  const game=window.slotraceLab;
  game.menuRace();
  if(!game.canMountRaceDemo())throw Error("El navegador limpio debe ofrecer un óvalo de demostración");
  const demo=document.getElementById("raceDemoOval");
  if(demo.hidden)throw Error("No aparece el botón para montar el óvalo");
  if(!document.getElementById("raceStart").disabled)
   throw Error("No debe habilitarse un circuito sin meta");
  demo.click();
  if(!game.state.track.valid||game.state.types.filter(t=>t==="START350").length!==1)
   throw Error("El óvalo de prueba debe estar cerrado y tener meta");
  if(document.getElementById("raceStart").disabled)
   throw Error("El botón jugar debe activarse después de montar la pista válida");
  return game.openRace();
 });
 console.log("PLAY RESULT",started);
 stage="primera imagen de carrera";
 await page.waitForTimeout(800);
 stage="muestreando píxeles de pista";
 const result=await page.evaluate(()=>{
  const canvas=document.getElementById("raceCanvas"),rect=canvas.getBoundingClientRect();
  const ctx=canvas.getContext("2d");
  const points=[];
  const xSteps=12,ySteps=20;
  let nonblank=0;
  for(let yi=0;yi<ySteps;yi++)for(let xi=0;xi<xSteps;xi++){
   const x=Math.round((xi+.5)*canvas.width/xSteps);
   const y=Math.round((yi+.5)*canvas.height/ySteps);
   const rgb=Array.from(ctx.getImageData(Math.min(x,canvas.width-1),Math.min(y,canvas.height-1),1,1).data);
   const key=rgb.slice(0,3).join(",");
   points.push(key);
   if(key!=="10,20,27"&&key!=="26,21,16"&&key!=="0,0,0")nonblank++;
  }
  return{mode:window.slotraceLab.state.mode,flow:window.slotraceLab.state.flow,
   width:canvas.width,height:canvas.height,rect:{w:rect.width,h:rect.height},nonblank,
   colors:[...new Set(points)].slice(0,20),screens:{raceHidden:document.getElementById("raceScreen").hidden}};
 });
 console.log("RENDER",JSON.stringify(result));
 stage="captura de pantalla";
 await page.screenshot({path:"/tmp/slotrace-render.png",fullPage:true});
 // Regresión de mangas: al cambiar el jugador de A a B, la IA debe
 // ocupar A. Comprobar los DOS sentidos de carrera en el navegador real.
 stage="comprobando intercambio de mangas con IA";
 const heatSwaps=await page.evaluate(()=>{
  const game=window.slotraceLab,st=game.state,ai=game.ai.state;
  const results=[];
  for(const direction of [1,-1]){
   game.showMenu();
   st.driveDirection=direction;
   st.sessionMode="lap_race";
   st.targetLaps=2;
   ai.enabled=true;
   if(!game.openRace())throw Error("No se pudo iniciar manga 1");
   const physical=logical=>direction===-1?1-logical:logical;
   const first={player:st.lane,rival:ai.lane,
    playerPhysical:physical(st.lane),rivalPhysical:physical(ai.lane)};
   if(first.player===first.rival||first.playerPhysical===first.rivalPhysical)
    throw Error("Manga 1 comienza con ambos coches en la misma guía");
   // Simular dos vueltas completas sin tocar tiempos ni recompensas.
   st.sessionLaps=[
    {number:1,lane:st.lane,seconds:7.1,record:false},
    {number:2,lane:st.lane,seconds:7.2,record:false}
   ];
   st.raceStarted=true;
   st.distance=250;
   ai.distance=340;ai.speed=600;ai.penalty=3;
   ai.collisionCooldown=2;ai.awaitingSeparation=true;
   ai.laneTransition={from:1-ai.lane,pieceIndex:0,physical:true};
   ai.deslot={elapsed:.2,duration:3};
   game.endSession();
   if(st.mode!=="results")throw Error("La primera manga no llegó a resultados");
   document.getElementById("resultsAgain").click();
   const second={player:st.lane,rival:ai.lane,
    playerPhysical:physical(st.lane),rivalPhysical:physical(ai.lane),
    playerDistance:st.distance,rivalDistance:ai.distance,
    rivalSpeed:ai.speed,rivalPenalty:ai.penalty,
    collisionCooldown:ai.collisionCooldown,
    awaitingSeparation:ai.awaitingSeparation,
    rivalTransition:ai.laneTransition,
    deslot:ai.deslot,phase:st.twoLegPhase,
    laps:st.sessionLaps.length,mode:st.mode,
    aiActive:ai.active,raceStarted:st.raceStarted,
    resumeCountdown:st.resumeCountdownEnd!==null};
   if(second.player!==first.rival||second.rival!==first.player)
    throw Error("La segunda manga debe intercambiar las dos guías");
   if(second.playerPhysical===second.rivalPhysical)
    throw Error("Los coches siguen superpuestos tras el intercambio");
   if(second.rivalDistance!==0||second.rivalSpeed!==0||second.rivalPenalty!==0||
    second.collisionCooldown!==0||second.awaitingSeparation||
    second.rivalTransition||second.deslot)
    throw Error("La IA arrastra velocidad, posición o choque de la manga anterior");
   if(second.phase!==2||second.laps!==2||second.mode!=="race"||
    !second.aiActive||second.raceStarted||!second.resumeCountdown)
    throw Error("Manga dos debe preservar resultados y esperar nueva salida");
   results.push({direction,first,second});
  }
  return results;
 });
 console.log("AI HEAT SWAP",JSON.stringify(heatSwaps));
 assert.equal(heatSwaps.length,2);
 // La herramienta debe funcionar en el taller real y aplicar sólo tras
 // confirmación: circuito cerrado de demostración pero sin pieza de meta.
 stage="probando asistente de cierre";
 await page.evaluate(()=>{
  const game=window.slotraceLab;
  game.showMenu();
  game.openWorkshop();
  // El test usa el motor directamente y no pasa por el portal de cuenta.
  // En la sesión real del usuario el portal ya se ha cerrado.
  document.getElementById("entryGate").hidden=true;
  game.changeTypes([...game.STARTER],"Prueba de cierre sin meta",[],game.state.origin);
  if(!document.getElementById("closureGuideButton"))
   throw Error("El taller no muestra Ayúdame a cerrarlo");
 });
 // Antes la llamada JS al botón funcionaba aunque estuviera TAPADO.
 // Exigir que se pueda pulsar desde un dedo en la pantalla del iPhone.
 const guideButton=page.locator("#closureGuideButton");
 const guideBox=await guideButton.boundingBox();
 const hit=await page.evaluate(()=>{
  const b=document.getElementById("closureGuideButton");
  const r=b.getBoundingClientRect();
  const x=r.x+r.width/2,y=r.y+r.height/2;
  const h=document.elementFromPoint(x,y);
  return{rect:{x:r.x,y:r.y,w:r.width,h:r.height},top:h?.id||h?.tagName,
   tappable:h===b||b.contains(h),visible:getComputedStyle(b).visibility!=="hidden",
   hitMarkup:h?.outerHTML?.slice(0,350),
   hitAncestors:h?Array.from((function*(n){let k=0;while(n&&k++<6){yield n;n=n.parentElement}})(h)).map(x=>x.id||x.className?.toString().slice(0,90)||x.tagName):[],
   guideAncestors:Array.from((function*(n){let k=0;while(n&&k++<6){yield n;n=n.parentElement}})(b)).map(x=>x.id||x.className?.toString().slice(0,90)||x.tagName)
   };
 });
 console.log("CLOSURE BUTTON VISIBILITY",JSON.stringify(hit));
 assert.ok(guideBox&&guideBox.width>=40&&guideBox.height>=44,"Asistente tiene área táctil segura");
 assert.ok(hit.tappable,"El botón no puede quedar detrás de la pista o el estante");
 assert.ok(hit.rect.y>=0&&hit.rect.y+hit.rect.h<=852,"El botón debe caber en pantalla de iPhone");
 // La barra compacta no debe abarcar dos filas ni tapar la pista;
 // todos los botones han de recibir un toque real, sin overlays.
 const actionIds=["templateToggle","measureGap","autoClose","closureGuideButton","play"];
 for(const width of [393,360]){
  await page.setViewportSize({width,height:852});
  const layout=await page.evaluate(ids=>ids.map(id=>{
   const b=document.getElementById(id),r=b.getBoundingClientRect(),
    x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);
   return{id,x:r.x,y:r.y,w:r.width,h:r.height,
    tappable:top===b||b.contains(top)};
  }),actionIds);
  console.log("COMPACT BAR",width,JSON.stringify(layout));
  assert.ok(layout.every(b=>b.tappable),"Cada control debe recibir toques en iPhone de "+width);
  assert.ok(layout.every(b=>b.h>=44&&b.h<=46),"Los controles deben tener alto compacto 44 px");
  assert.ok(Math.max(...layout.map(b=>b.y))-Math.min(...layout.map(b=>b.y))<2,
   "Las cinco acciones deben estar en UNA sola fila");
  assert.ok(layout.every(b=>b.x>=0&&b.x+b.w<=width),
   "Los cinco botones tienen que caber en pantalla");
  assert.ok(layout[0].x<layout[1].x&&layout[1].x<layout[2].x&&
   layout[2].x<layout[3].x&&layout[3].x<layout[4].x,
   "Orden Imagen, Hueco, Cerrar, Ayuda y Jugar");
 }
 await page.setViewportSize({width:393,height:852});
 await guideButton.click({timeout:5000});
 await page.waitForFunction(()=>
  !document.getElementById("closureGuideApply").disabled,{timeout:15000});
 const beforeClosure=await page.evaluate(()=>{
  const g=window.slotraceLab;
  return{modalOpen:!document.getElementById("closureGuideModal").hidden,
   hasMeta:g.state.types.includes("START350"),
   preview:document.querySelector("#closureGuidePreview svg")!==null,
   summary:document.getElementById("closureGuideSummary").textContent,
   detail:document.getElementById("closureGuideDetails").textContent};
 });
 console.log("CLOSURE PREVIEW",JSON.stringify(beforeClosure));
 assert.equal(beforeClosure.modalOpen,true);
 assert.equal(beforeClosure.hasMeta,false,"No se modifica el circuito antes de confirmar");
 assert.ok(beforeClosure.preview,"La propuesta presenta un plano real");
 const afterClosure=await page.evaluate(()=>{
  document.getElementById("closureGuideApply").click();
  const game=window.slotraceLab;
  return{valid:game.state.track.valid,
   finish:game.state.types.filter(x=>x==="START350").length,
   modalHidden:document.getElementById("closureGuideModal").hidden};
 });
 console.log("CLOSURE APPLY",JSON.stringify(afterClosure));
 assert.equal(afterClosure.valid,true,"El cierre propuesto encaja");
 assert.equal(afterClosure.finish,1,"El cierre incorpora salida/meta");
 assert.equal(afterClosure.modalHidden,true,"Cierra el asistente al aplicar");
 // La acción es reversible y nunca se confunde con guardar en la nube.
 const undoRedo=await page.evaluate(()=>{
  const g=window.slotraceLab;
  g.undo();
  const withoutMeta=g.state.types.filter(x=>x==="START350").length===0;
  g.redo();
  return{withoutMeta,restored:g.state.types.filter(x=>x==="START350").length===1,
   valid:g.state.track.valid};
 });
 assert.equal(undoRedo.withoutMeta,true,"Deshacer recupera el montaje previo");
 assert.equal(undoRedo.restored,true,"Rehacer vuelve a aplicar la propuesta");
 assert.equal(undoRedo.valid,true,"La geometría sigue válida tras rehacer");
 console.log("CLOSURE UNDO/REDO",JSON.stringify(undoRedo));
 // Un ocho en construcción suele estar en la mesa como UN GRUPO MAGNÉTICO,
 // todavía sin convertir al tramo principal. Validar ese flujo real.
 stage="probando un ocho abierto de once piezas";
 const beforeEight=await page.evaluate(()=>{
  const g=window.slotraceLab,ids=g.FIGURE_EIGHT.slice(0,11);
  const track=g.buildTrack(ids,{x:750,y:325,h:0});
  const origin={x:750,y:325,h:0};
  g.state.origin=origin;g.state.types=[];g.state.bridgeParts=[];
  g.state.track=g.buildTrack([],origin);
  g.state.loose=track.parts.map((part,i)=>({
   id:part.id,x:part.start.x,y:part.start.y,h:part.start.h,
   magnetGroup:"magnet-browser-eight",magnetOrder:i,raised:i===7
  }));
  g.openWorkshop();
  const source=g.puzzle.closureGuideSource();
  if(source.kind!=="loose"||source.types.length!==11)
   throw Error("Las once piezas deben reconocerse como un tramo magnético");
  g.puzzle.openClosureGuide();
  return{before:ids.length,loose:g.state.loose.length,kind:source.kind};
 });
 await page.waitForFunction(()=>{
  const d=document.getElementById("closureGuideApply");
  return !d.disabled||/No se encontró|agotó|No se pudo/.test(
   document.getElementById("closureGuideSummary").textContent);
 },{timeout:15000});
 const resultEight=await page.evaluate(()=>{
  const g=window.slotraceLab;
  const summary=document.getElementById("closureGuideSummary").textContent;
  const enabled=!document.getElementById("closureGuideApply").disabled;
  if(enabled)document.getElementById("closureGuideApply").click();
  return{summary,enabled,valid:g.state.track.valid,loose:g.state.loose.length,
   count:g.state.types.length,meta:g.state.types.filter(t=>t==="START350").length};
 });
 console.log("ELEVEN-PIECE EIGHT",JSON.stringify({beforeEight,resultEight}));
 assert.ok(resultEight.enabled,"El ocho con 11 piezas debe presentar Aplicar");
 assert.ok(resultEight.valid,"El cierre del ocho debe ser válido en la mesa");
 assert.equal(resultEight.loose,0,"Las piezas magnéticas quedan integradas al cerrar");
 assert.equal(resultEight.meta,1);
 // Regresión OchoA: había un tramo principal invisible y 14 piezas
 // magnéticas visibles. El asistente cerraba el principal y dejaba las
 // catorce sin acoplar, aunque mostrase "circuito cerrado".
 stage="OchoA: tramo principal adicional y catorce piezas sin acoplar";
 const beforeMixed=await page.evaluate(()=>{
  const g=window.slotraceLab,origin={x:750,y:325,h:0};
  const groups=g.FIGURE_EIGHT,track=g.buildTrack(groups,origin);
  g.state.origin=origin;g.state.types=["S350","S350","R2_45R"];
  g.state.bridgeParts=[];
  g.state.track=g.buildTrack(g.state.types,origin);
  g.state.loose=track.parts.map((part,i)=>({
   id:part.id,x:part.start.x,y:part.start.y,h:part.start.h,
   magnetGroup:"magnet-ochoa-14",magnetOrder:i,raised:i===7
  }));
  g.state.looseSelection=-1;g.state.selection=-1;g.state.selectedGroup=null;
  g.openWorkshop();
  const picked=g.puzzle.closureGuideSource();
  if(picked.kind!=="loose"||picked.types.length!==14)
   throw Error("Debe priorizar las 14 piezas visibles, no las 3 del tramo principal");
  g.puzzle.openClosureGuide();
  return{kind:picked.kind,loose:g.state.loose.length,main:g.state.types.length};
 });
 await page.waitForFunction(()=>!document.getElementById("closureGuideApply").disabled,
  {timeout:15000});
 const resultMixed=await page.evaluate(()=>{
  const g=window.slotraceLab;
  const before=g.state.loose.length;
  const ok=g.puzzle.applyClosureGuide();
  return{ok,before,valid:g.state.track.valid,meta:g.state.types.filter(x=>x==="START350").length,
   loose:g.state.loose.length,types:g.state.types.length,
   oldMainPreserved:g.state.loose.some(p=>p.magnetGroup?.startsWith("magnet-previous-")),
   buttonEnabled:!document.getElementById("play").disabled};
 });
 console.log("OCHOA MIXED GROUPS",JSON.stringify({beforeMixed,resultMixed}));
 assert.equal(resultMixed.ok,true,"El botón debe aplicar el cierre al grupo correcto");
 assert.ok(resultMixed.valid&&resultMixed.buttonEnabled,"Jugar debe activarse");
 assert.equal(resultMixed.meta,1,"Una sola salida y meta");
 assert.equal(resultMixed.loose,3,"Sólo las tres piezas del otro tramo siguen sueltas");
 assert.ok(resultMixed.oldMainPreserved,"No borrar el trazado antiguo al cerrar OchoA");
 await page.evaluate(()=>window.slotraceLab.undo());
 const restored=await page.evaluate(()=>{
  const g=window.slotraceLab;
  return{main:g.state.types.length,loose:g.state.loose.length};
 });
 assert.deepEqual(restored,{main:3,loose:14},"Un deshacer restaura las 14 piezas originales");
 // Regresión reproducida en el iPhone: 14 módulos magnéticos con
 // desviación final 0,4 mm y ángulo 0° (medidor: ALINEADO).
 // El antiguo cierre rechazaba una holgura INTERNA de 0,4 mm, porque
 // comprobaba juntas con una tolerancia absurda de 0,00001 mm.
 stage="cerrar OchoA con 0,4 mm";
 const flex=await page.evaluate(()=>{
  const g=window.slotraceLab,origin={x:750,y:325,h:0};
  const track=g.buildTrack(g.FIGURE_EIGHT,origin);
  const parts=track.parts.map((part,i)=>({
   id:part.id,x:part.start.x,y:part.start.y,h:part.start.h,
   magnetGroup:"ochoa-flex",magnetOrder:i,raised:i===7
  }));
  parts[parts.length-1].x+=.4;
  g.state.types=[];g.state.loose=parts;
  g.state.origin=origin;g.state.bridgeParts=[];
  g.state.track=g.buildTrack([],origin);
  g.state.selection=-1;g.state.looseSelection=-1;g.state.selectedGroup=null;
  g.openWorkshop();
  g.puzzle.measureOpenGap();
  const measured=document.getElementById("boardGapInfo").textContent;
  const closed=g.puzzle.closeExactly();
  return{measured,closed,valid:g.state.track.valid,main:g.state.types.length,
   loose:g.state.loose.length,closedTrack:g.state.track.closed};
 });
 console.log("OCHOA FLEX 0.4 MM",JSON.stringify(flex));
 assert.match(flex.measured,/ALINEADO/,"El medidor reconoce la tolerancia de 0,4 mm");
 assert.equal(flex.closed,true,"Cerrar debe aceptar el mismo rango que Medir Hueco");
 assert.ok(flex.closedTrack&&flex.valid,"La pista resultante está cerrada y es válida");
 assert.equal(flex.loose,0,"Las 14 piezas deben quedar acopladas");
 assert.equal(flex.main,14,"No se pierde ninguna pieza");
 await page.evaluate(()=>window.slotraceLab.undo());
 const afterFlexUndo=await page.evaluate(()=>{
  const g=window.slotraceLab;
  return{main:g.state.types.length,loose:g.state.loose.length};
 });
 assert.deepEqual(afterFlexUndo,{main:0,loose:14},"Deshacer conserva la pista previa");
 stage="cerrando navegador";
 await browser.close();
 clearTimeout(watchdog);
 assert.equal(started,true,"Debe abrir el circuito");
 assert.ok(result.width>200&&result.height>200,"Canvas de carrera debe tener dimensiones válidas");
 assert.ok(result.nonblank>10,"El circuito debe verse, no puede quedarse el canvas vacío");
 assert.equal(errors.length,0,"No puede haber errores JS");
 console.log("PASS: circuito visible en navegador real");
})().catch(e=>{console.error("BROWSER FAILURE",e.stack||e);process.exitCode=1});
