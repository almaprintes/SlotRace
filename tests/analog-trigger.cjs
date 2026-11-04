"use strict";
// Prueba real de la lógica gestual del gatillo: sin navegador ni servicios externos.
// Evita regresar al botón binario de 0/100 %.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const geom=await import("../src/track.mjs");
 const source=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8")
   .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?/,"");
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
    if(sel===".grip")return this.grip??=makeEl("grip");
    if(sel===".qty")return this.qty??=makeEl("qty");
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
 const window={devicePixelRatio:1,innerWidth:390,innerHeight:844,
  setTimeout:fn=>fn(),matchMedia:()=>({matches:true}),addEventListener(){}};
 const data=new Map();const localStorage={
  getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)
 };
 let now=0;const callbacks=[];
 const requestAnimationFrame=fn=>callbacks.push(fn);
 const keys=Object.keys(geom);const values=keys.map(k=>geom[k]);
 new Function(...keys,"document","window","localStorage","performance","requestAnimationFrame","ResizeObserver",source)(
  ...values,document,window,localStorage,{now:()=>now},requestAnimationFrame,class{observe(){}}
 );
 const trigger=elements.get("trigger");
 const fire=(type,x,y,id=5)=>{for(const fn of trigger.listeners[type]||[])fn({
  pointerId:id,clientX:x,clientY:y,preventDefault(){}
 });};
 const state=window.slotraceLab.state;
 assert.equal(window.slotraceLab.version,"DEV 0.5.1");
 assert.equal(state.track.valid,true);
 for(const fn of elements.get("play").listeners.click)fn();
 assert.equal(state.run,true);
 assert.equal(state.mode,"race");
 assert.equal(trigger.disabled,false);
 const power=()=>Math.round(state.gas*100);
 fire("pointerdown",105,180);
 assert.equal(power(),0,"Pulsar solo no acelera al 100%");
 fire("pointermove",105,120);
 assert.ok(power()>=50&&power()<=55,"Deslizar hacia arriba debe graduar sobre el 52%");
 assert.equal(elements.get("triggerValue").textContent,power()+"%");
 assert.equal(elements.get("triggerFill").style.height,power()+"%");
 fire("pointermove",105,60);
 assert.equal(power(),100,"Más recorrido llega al 100%");
 fire("pointermove",105,152);
 assert.ok(power()>20&&power()<30,"Volver hacia abajo reduce gradualmente el gatillo");
 fire("pointerup",105,152);
 assert.equal(power(),0,"Soltar lleva el gatillo a cero");
 assert.equal(elements.get("triggerFill").style.height,"0%");
 // El gesto horizontal mantiene las mismas propiedades sin un segundo mando.
 fire("pointerdown",100,170,8);
 fire("pointermove",192,170,8);
 assert.ok(power()>=50&&power()<=60,"Deslizar a la derecha también gradúa el gas");
 fire("pointermove",135,170,8);
 assert.ok(power()>10&&power()<30,"Volver hacia izquierda reduce sin caer de golpe a cero");
 fire("pointercancel",135,170,8);
 assert.equal(power(),0,"Cancelar el gesto también libera el gatillo");
 // Ignorar eventos de otro dedo para evitar aceleraciones fantasma.
 fire("pointerdown",100,170,11);
 fire("pointermove",250,170,12);
 assert.equal(power(),0,"No aceptar otro puntero mientras se conduce");
 fire("pointerup",100,170,11);
 assert.equal(power(),0);
 // La conducción usa esta misma variable, no un booleano 0/100.
 fire("pointerdown",105,180,13);fire("pointermove",105,110,13);
 assert.ok(state.gas>0&&state.gas<1,"Simulación recibe gas realmente analógico");
 const frame=callbacks.shift();now=16;frame(now);
 assert.ok(state.speed>0&&state.speed<30,"El coche acelera gradualmente con gas parcial");
 fire("pointerup",105,110,13);
 for(const fn of elements.get("pause").listeners.click)fn();
 assert.equal(state.run,false);assert.equal(power(),0);
 assert.equal(trigger.disabled,true);
 console.log("SlotRace DEV 0.5.1: gatillo gradual vertical/horizontal, retorno, seguridad multitáctil y física — OK");
})().catch(err=>{console.error(err);process.exitCode=1;});
