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
  // La receta inicial del proyecto puede contener piezas legacy.
  // Para esta prueba usamos el óvalo geométrico estable con salida/meta.
  const types=[...game.STARTER];
  const index=types.indexOf("S350");
  if(index<0)throw Error("El óvalo de pruebas no tiene recta 350");
  types[index]="START350";
  game.state.types=types;
  game.state.track=game.buildTrack(types,game.state.origin);
  if(!game.state.track.valid)throw Error("La geometría de test no cierra");
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
 stage="cerrando navegador";
 await browser.close();
 clearTimeout(watchdog);
 assert.equal(started,true,"Debe abrir el circuito");
 assert.ok(result.width>200&&result.height>200,"Canvas de carrera debe tener dimensiones válidas");
 assert.ok(result.nonblank>10,"El circuito debe verse, no puede quedarse el canvas vacío");
 assert.equal(errors.length,0,"No puede haber errores JS");
 console.log("PASS: circuito visible en navegador real");
})().catch(e=>{console.error("BROWSER FAILURE",e.stack||e);process.exitCode=1});
