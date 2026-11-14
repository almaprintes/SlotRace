"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const {bindSingleChatTap,CHAT_COOLDOWN_MS}=await import("../src/online-chat-ui.mjs");
 function mock(){
  const handlers={},button={
   addEventListener(name,callback,opts){handlers[name]=callback;},
  };
  let time=1000,racing=true,calls=0;
  bindSingleChatTap(button,()=>calls++,()=>racing,()=>time);
  const touch=()=>{
   let prevented=false,stopped=false;
   handlers.pointerdown({pointerType:"touch",preventDefault(){prevented=true},
    stopPropagation(){stopped=true}});
   assert.ok(prevented&&stopped,"El gesto táctil no activa un segundo click por defecto");
  };
  const click=(type=undefined)=>{
   let prevented=false;
   handlers.click({pointerType:type,detail:1,preventDefault(){prevented=true},
    stopPropagation(){}});
   return prevented;
  };
  return{touch,click,setTime(x){time=x},setRacing(x){racing=x},get count(){return calls}};
 }
 const a=mock();
 a.touch();assert.equal(a.count,1,"El dedo activa el chat inmediatamente");
 assert.equal(a.click("mouse"),true,
  "Chrome Android sintetiza un click mouse al soltar el dedo");
 assert.equal(a.count,1,"Un solo toque nunca abre y cierra el chat");
 a.setTime(1100);assert.equal(a.click(),true,
  "Click sin pointerType en Android también debe ignorarse");
 assert.equal(a.count,1);
 a.setTime(1450);a.touch();assert.equal(a.count,2,
  "Una segunda pulsación táctil intencional funciona inmediatamente");
 assert.equal(a.click("touch"),true);assert.equal(a.count,2);
 a.setTime(2400);assert.equal(a.click("mouse"),false,
  "El mouse genuino funciona después de vencer la ventana de supresión");
 assert.equal(a.count,3);
 a.setRacing(false);a.setTime(3200);
 // Fuera de carrera, el toque espera el click normal.
 a.touch();assert.equal(a.count,3);
 assert.equal(a.click("mouse"),false);assert.equal(a.count,4);
 assert.equal(CHAT_COOLDOWN_MS,5000,"No modificar el antiflood");
 const b=mock();
 b.touch();assert.equal(b.count,1,
  "El segundo dedo sobre el chat funciona con acelerador pulsado");
 b.setTime(1020);assert.equal(b.click(undefined),true);assert.equal(b.count,1);
 console.log("OK · Android: 1 toque = 1 acción; click sintético mouse/indefinido, segundo dedo, teclado, emojis y antiflood");
})().catch(e=>{console.error(e);process.exitCode=1});
