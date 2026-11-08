"use strict";
// Prueba real de la lógica gestual del gatillo: sin navegador ni servicios externos.
// Evita regresar al botón binario de 0/100 %.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const geom=await import("../src/track.mjs");
 const blueprint=await import("../src/blueprint.mjs");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
   .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/gm,"");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 function makeEl(id){
  const el={id,textContent:"",innerHTML:"",hidden:false,disabled:false,value:"0",
   width:390,height:600,clientWidth:260,style:{},dataset:{},children:[],listeners:{},attrs:{},
   classList:{held:new Set(),add(x){this.held.add(x)},remove(x){this.held.delete(x)},
     contains(x){return this.held.has(x)},toggle(x,force){
       const was=this.held.has(x);if(force===undefined? !was:force)this.held.add(x);else this.held.delete(x);
     }},
   setAttribute(n,v){this.attrs[n]=v},
   appendChild(child){this.children.push(child);return child},
   addEventListener(type,fn){(this.listeners[type]||=[]).push(fn)},
   getBoundingClientRect(){return{left:0,top:0,right:390,bottom:600,width:390,height:600}},
   setPointerCapture(){},querySelectorAll(){return this.children},
   querySelector(sel){
    if(sel===".grip"||sel===".foam-drag-grip")return this.grip??=makeEl("grip");
    if(sel===".bridge-kit-cta")return this.kitCta??=makeEl("kit-cta");if(sel===".qty")return this.qty??=makeEl("qty");
    return null;
   }};
  return el;
 }
 const elements=new Map(ids.map(id=>[id,makeEl(id)]));
 const ctx=new Proxy({},{get(t,k){
  if(k==="createLinearGradient")return()=>({addColorStop(){}});
  return()=>{};
 },set(t,k,v){t[k]=v;return true;}});
 for(const id of ["editCanvas","raceCanvas"])elements.get(id).getContext=()=>ctx;
 const document={getElementById:id=>elements.get(id),createElement:()=>makeEl("palette"),addEventListener(){},hidden:false};
 // Audio en memoria: permite comparar las dos tonalidades sin reproducir sonido.
 const pitches=[];
 class MockAudioContext{
  constructor(){this.state="running";this.currentTime=0;this.destination={};}
  createOscillator(){return{
   type:"triangle",
   frequency:{setValueAtTime:(hz)=>pitches.push(hz),exponentialRampToValueAtTime(){}},
   connect(){},start(){},stop(){}};
  }
  createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  resume(){return Promise.resolve();}
 }
 const window={devicePixelRatio:1,innerWidth:390,innerHeight:844,AudioContext:MockAudioContext,
  setTimeout:fn=>fn(),matchMedia:()=>({matches:true}),addEventListener(){}};
 const data=new Map();const localStorage={
  getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)
 };
 let now=0;const callbacks=[];
 const requestAnimationFrame=fn=>callbacks.push(fn);
 const keys=[...Object.keys(geom),...Object.keys(blueprint)];const values=keys.map(k=>Object.hasOwn(geom,k)?geom[k]:blueprint[k]);
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",source)(
  ...values,document,window,localStorage,{now:()=>now},requestAnimationFrame,class{observe(){}}
 );
 const trigger=elements.get("trigger");
 const fire=(type,x,y,id=5)=>{for(const fn of trigger.listeners[type]||[])fn({
  pointerId:id,clientX:x,clientY:y,preventDefault(){}
 });};
 const state=window.slotraceLab.state;
 assert.equal(window.slotraceLab.version,"DEV 0.14.59");
 const theme=window.slotraceLab.workspace;
 assert.equal(state.tableTheme,"wine","El fondo vino es el predeterminado");
 assert.equal(elements.get("settingsTableWine").attrs["aria-pressed"],"true");
 assert.equal(elements.get("settingsTableCyan").attrs["aria-pressed"],"false");
 for(const click of elements.get("settingsTableCyan").listeners.click)click();
 assert.equal(state.tableTheme,"cyan","El usuario puede elegir el tapete cian");
 assert.equal(JSON.parse(data.get("slotrace-lab-10")).tableTheme,"cyan",
  "La elección del tapete se guarda en el navegador");
 assert.equal(elements.get("settingsTableCyan").attrs["aria-pressed"],"true");
 assert.equal(elements.get("settingsTableWine").attrs["aria-pressed"],"false");
 for(const click of elements.get("settingsTableWine").listeners.click)click();
 assert.equal(state.tableTheme,"wine","El usuario puede volver al acabado vino");
 assert.equal(JSON.parse(data.get("slotrace-lab-10")).tableTheme,"wine");
 assert.equal(theme.TABLE_THEMES.wine.grid,"#d8b77f");
 assert.ok(theme.TABLE_THEMES.cyan.surface[0].startsWith("#"));
 assert.equal(elements.get("settingsTableTechnical").attrs["aria-pressed"],"false");
 for(const click of elements.get("settingsTableTechnical").listeners.click)click();
 assert.equal(state.tableTheme,"technical","Gris técnico se puede seleccionar");
 assert.equal(JSON.parse(data.get("slotrace-lab-10")).tableTheme,"technical",
  "El tema gris técnico se guarda en el dispositivo");
 assert.equal(elements.get("settingsTableTechnical").attrs["aria-pressed"],"true");
 assert.equal(elements.get("settingsTableWine").attrs["aria-pressed"],"false");
 assert.equal(elements.get("settingsTableCyan").attrs["aria-pressed"],"false");
 assert.equal(theme.TABLE_THEMES.technical.grid,"#b5c2cb",
  "La cuadrícula gris técnico lleva tonos de acero");
 assert.ok(theme.TABLE_THEMES.technical.felt.every(value=>/^#[0-9a-f]{6}$/i.test(value)),
  "Colores del tapete en hex válido");
 for(const click of elements.get("settingsTableWine").listeners.click)click();
 assert.equal(state.tableTheme,"wine","Volver al vino no altera la selección previa");

 assert.equal(state.track.valid,true);
 for(const fn of elements.get("play").listeners.click)fn();
 assert.equal(state.run,true);
 assert.equal(state.raceStarted,false,"Al entrar en pista no hay salida todavía");
 window.slotraceLab.physics.simulationStep(.50);
 assert.equal(state.seconds,0,"La espera no suma tiempo de vuelta");
 assert.equal(state.speed,0,"El coche permanece quieto sin gas");
 assert.equal(elements.get("raceHint").textContent,
  "ESPERANDO SALIDA · ACELERA PARA COMENZAR");
 assert.equal(trigger.disabled,false);
 const power=()=>Math.round(state.gas*100);
 const wheelLabel=()=>elements.get("triggerValue").textContent;
 fire("pointerdown",105,180,5);
 assert.equal(power(),0,"Pulsación sin movimiento no acelera");
 window.slotraceLab.physics.simulationStep(.30);
 assert.equal(state.seconds,0,"Presionar el control al 0% no inicia el reloj");
 const soundStart=pitches.length;
 fire("pointermove",105,178.6,5);
 assert.equal(power(),1,"1,4 px hacia arriba suma exactamente el 1%");
 assert.equal(wheelLabel(),"1%");
 assert.equal(pitches.length,soundStart,"Al 1% no debe sonar un clic extra");
 fire("pointermove",105,177.2,5);
 assert.equal(power(),2,"Se puede graduar de 1% en 1%");
 assert.equal(pitches.length,soundStart,"2% sin sonido");
 fire("pointermove",105,173,5);
 assert.equal(power(),5,"Siete píxeles totales siguen dando el 5%");
 assert.equal(wheelLabel(),"5%");
 assert.equal(elements.get("triggerFill").style.height,"5%");
 assert.equal(pitches.length,soundStart+1,
  "Solo suena una muesca cada cinco puntos porcentuales");
 assert.equal(pitches.at(-1),1260,"El clic al subir es agudo");
 fire("pointermove",105,171.6,5);
 assert.equal(power(),6,"6%, antes imposible con los pasos de 5%");
 assert.equal(pitches.length,soundStart+1,"6% no añade sonido");
 fire("pointermove",105,152,5);
 assert.equal(power(),20,"Los niveles 1% conservan la escala original");
 fire("pointermove",105,40,5);
 assert.equal(power(),100,"Recorrido acumulado de 140 px llega al 100%");
 assert.equal(pitches.length,soundStart+20,"100% usa los mismos 20 sonidos que antes");
 fire("pointermove",105,45.6,5);
 assert.equal(power(),96,"Bajar 5,6 px da 96% (antes solo podía ser 95%)");
 const soundAt96=pitches.length;
 fire("pointermove",105,44.2,5);
 assert.equal(power(),97);
 fire("pointermove",105,42.8,5);
 assert.equal(power(),98);
 fire("pointermove",105,41.4,5);
 assert.equal(power(),99);
 assert.equal(pitches.length,soundAt96,
  "Entre 96%, 97%, 98% y 99% no hay ráfaga de clics");
 fire("pointermove",105,40,5);
 assert.equal(power(),100);
 assert.equal(pitches.length,soundAt96+1,
  "Al recuperar 100% solo hay un clic");
 fire("pointermove",105,110,5);
 assert.equal(power(),50,"Bajar 70 px sigue reduciendo a 50%");
 assert.equal(pitches.at(-1),670,"El clic al bajar es grave");
 fire("pointerup",105,110,5);
 assert.equal(power(),0,"Al soltar vuelve a cero");
 assert.equal(elements.get("triggerFill").style.height,"0%");

 // Sólo vertical: los desplazamientos horizontales no regulan el dial.
 fire("pointerdown",105,180,8);
 fire("pointermove",240,180,8);
 assert.equal(power(),0,"Mover hacia el lado no acelera");
 fire("pointercancel",240,180,8);
 assert.equal(power(),0);

 // Rechazar multitáctil mientras un dedo usa el control.
 fire("pointerdown",105,180,11);
 fire("pointermove",105,60,12);
 assert.equal(power(),0,"Otro puntero no acelera");
 fire("pointerup",105,180,11);

 // El interruptor de sonido no cambia los niveles de potencia.
 const soundButton=elements.get("clickSound");
 const beforeMute=pitches.length;
 for(const fn of soundButton.listeners.click)fn();
 assert.equal(state.clicksEnabled,false);
 assert.equal(soundButton.attrs["aria-pressed"],"false");
 fire("pointerdown",105,180,14);
 fire("pointermove",105,145,14);
 assert.equal(power(),25);
 assert.equal(pitches.length,beforeMute,"En silencio no se generan clics");
 // El 25% debe mover el coche desde parado.
 let frame=callbacks.shift();now=16;frame(now);
 assert.ok(state.speed>0&&state.speed<12,"Con un cuarto de rueda el coche se mueve");
 assert.equal(state.raceStarted,true,"Al acelerar por primera vez empieza el cronómetro");
 assert.ok(state.seconds>0&&state.seconds<=.0161,"Solo contabiliza tiempo desde la aceleración");
 const activeTime=state.seconds;
 fire("pointerup",105,145,14);
 window.slotraceLab.physics.simulationStep(.05);
 assert.ok(state.seconds>activeTime,"Soltar el gatillo no detiene una vuelta iniciada");
 for(const fn of elements.get("pause").listeners.click)fn();
 assert.equal(state.run,false);assert.equal(power(),0);
 assert.equal(trigger.disabled,true);
 for(const fn of soundButton.listeners.click)fn();
 assert.equal(state.clicksEnabled,true);
 console.log("SlotRace DEV 0.14.59: acelerador 1%, 140px rango total, clics cada 5%, mute, retorno y física parcial — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
