"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const {RECOVERY,advanceRecovery,recoveryVisualPose}=await import("../src/recovery-core.mjs");
 const pose={x:500,y:400,h:0,curve:1},target={...pose,x:540,y:410};
 const newDeslot=duration=>({pose,turn:1,duration,elapsed:0});
 function simulate(penalty,dt,blockedAt=Infinity){
  let d=newDeslot(penalty),remaining=penalty;
  let firstSlide=null,completeAt=null,parked=null;
  for(let t=0;t<10&&d;t+=dt){
   const previous=d;
   const state=advanceRecovery({penalty:remaining,deslot:d,dt,
    clearToReturn:t<blockedAt});
   d=state.deslot;remaining=state.penalty;
   if(previous&&t>.65&&t<penalty-.8)
    parked=recoveryVisualPose(target,previous);
   if(previous&&!firstSlide&&previous.reentryElapsed>0)
    firstSlide=t;
   if(state.completed)completeAt=t+dt;
  }
  return {remaining,d,firstSlide,completeAt,parked};
 }
 const light=simulate(2.5,.02),heavy=simulate(5,.02);
 assert.equal(light.d,null);
 assert.equal(heavy.d,null);
 assert.ok(Math.abs(light.completeAt-2.5)<.04);
 assert.ok(Math.abs(heavy.completeAt-5)<.04);
 assert.ok(Math.abs(light.firstSlide-1.7)<.1);
 assert.ok(Math.abs(heavy.firstSlide-4.2)<.1);
 assert.deepEqual(light.parked,heavy.parked,
  "La posición aparcada no depende de la duración deportiva");
 const parked=recoveryVisualPose(target,{...newDeslot(5),elapsed:2,reentryElapsed:0});
 assert.ok(Math.abs(parked.x-(pose.x-85))<1e-8);
 const nearEnd=recoveryVisualPose(target,{...newDeslot(5),elapsed:5,reentryElapsed:.8});
 assert.ok(Math.hypot(nearEnd.x-target.x,nearEnd.y-target.y)<1e-8,
  "El último fotograma encaja exactamente en la pista sin salto");
 const almost=recoveryVisualPose(target,{...newDeslot(5),elapsed:4.8,reentryElapsed:.78});
 assert.ok(Math.hypot(almost.x-target.x,almost.y-target.y)<1,
  "El penúltimo fotograma ya está cerca de la guía");
 const start=recoveryVisualPose(target,{...newDeslot(5),elapsed:0,reentryElapsed:0});
 assert.equal(start.x,pose.x);
 assert.equal(start.y,pose.y);
 const p15=simulate(3,1/15); // El navegador limita dt a 50ms, este test
 // usa 15 FPS para comprobar que el módulo no depende del renderizador.
 assert.ok(Math.abs(p15.completeAt-3)<.08);
 let d=newDeslot(3),remaining=3;
 for(let i=0;i<180;i++){
  const result=advanceRecovery({penalty:remaining,deslot:d,dt:1/60,
    clearToReturn:false});
  d=result.deslot;remaining=result.penalty;
 }
 assert.ok(d && d.waitingForSpace,"Si hay un coche encima se espera fuera");
 assert.ok(remaining>0&&remaining<=.051);
 assert.equal(d.reentryElapsed,0,"Una guía ocupada impide la entrada");
 const waitingPose=recoveryVisualPose(target,d);
 for(let i=0;i<50;i++){
  const result=advanceRecovery({penalty:remaining,deslot:d,dt:.02,clearToReturn:false});
  d=result.deslot;remaining=result.penalty;
 }
 assert.deepEqual(recoveryVisualPose(target,d),waitingPose,
  "Un coche no debe reaparecer bruscamente al expirar su sanción");
 for(let i=0;i<45&&d;i++){
  const result=advanceRecovery({penalty:remaining,deslot:d,dt:.02,clearToReturn:true});
  d=result.deslot;remaining=result.penalty;
 }
 assert.equal(d,null,"Con hueco disponible, reincorporación suave completada");
 assert.equal(remaining,0);
 // La función visual real de app.mjs debe delegar en el mismo módulo
 // independientemente de si dibuja al jugador o a la IA.
 const app=fs.readFileSync("src/app.mjs","utf8");
 const a=app.indexOf("function collisionVisualPose(at,deslot,bump){");
 const b=app.indexOf("function visualCarPose(at){",a);
 assert.ok(a>0&&b>a);
 const source=app.slice(a,b);
 assert.match(source,/if\(deslot\)return recoveryVisualPose\(at,deslot\)/);
 const fn=new Function("recoveryVisualPose","bumpAngle",
  source+"return collisionVisualPose;")(recoveryVisualPose,()=>0);
 assert.deepEqual(fn(target,{...newDeslot(5),elapsed:5,reentryElapsed:.8},null),nearEnd);
 assert.match(app,/aiTest\.penalty=recovery\.penalty;aiTest\.deslot=recovery\.deslot/);
 assert.match(app,/state\.penalty=recovery\.penalty;state\.deslot=recovery\.deslot/);
 console.log("Shared recovery: player 5 s, AI 2.5 s, staged exit, smooth return, blocked lane and 15/60 FPS OK");
})().catch(e=>{console.error(e);process.exitCode=1;});
