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
 assert.ok(guideBox&&guideBox.width>120&&guideBox.height>=35,"Asistente ocupa un botón grande");
 assert.ok(hit.tappable,"El botón no puede quedar detrás de la pista o el estante");
 assert.ok(hit.rect.y>=0&&hit.rect.y+hit.rect.h<=852,"El botón debe caber en pantalla de iPhone");
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
 stage="cerrando navegador";
 await browser.close();
 clearTimeout(watchdog);
 assert.equal(started,true,"Debe abrir el circuito");
 assert.ok(result.width>200&&result.height>200,"Canvas de carrera debe tener dimensiones válidas");
 assert.ok(result.nonblank>10,"El circuito debe verse, no puede quedarse el canvas vacío");
 assert.equal(errors.length,0,"No puede haber errores JS");
 console.log("PASS: circuito visible en navegador real");
})().catch(e=>{console.error("BROWSER FAILURE",e.stack||e);process.exitCode=1});
