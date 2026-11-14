"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const {ONLINE_RIVAL_MOTION,createOnlineRivalMotion,receiveOnlineRivalMotion,drawOnlineRivalMotion}=
  await import("../src/online-rival-motion.mjs");
 const motion=createOnlineRivalMotion(),total=4000;
 const sample=(lap,distance,elapsed,speed=1000,extra={})=>({
  lap,distance,elapsed,speed,deslotFor:0,rearSlip:0,done:false,car:"gripline",...extra
 });
 assert.equal(drawOnlineRivalMotion(motion,1000,total),null);
 assert.equal(receiveOnlineRivalMotion(motion,sample(0,100,.1),1000,total),true);
 let first=drawOnlineRivalMotion(motion,1016,total);
 assert.ok(first.distance>=0&&first.distance<=100,"Rival visible sin salto inicial");
 assert.equal(receiveOnlineRivalMotion(motion,sample(0,215,.215),1115,total),true);
 assert.equal(receiveOnlineRivalMotion(motion,sample(0,330,.33),1250,total),true);
 let prior=first.distance;
 for(let t=1032;t<=1336;t+=16){
  const draw=drawOnlineRivalMotion(motion,t,total);
  assert.ok(draw.distance>=prior-1e-8,"Dibujo monótono entre actualizaciones");
  assert.ok(draw.distance-prior<=ONLINE_RIVAL_MOTION.maxDrawSpeedMmS*.1001+1e-6,
   "No teletransportar el coche incluso con latencia variable");
  prior=draw.distance;
 }
 assert.ok(prior>0&&prior<330,"Dibujo progresivo a FPS local");
 assert.equal(receiveOnlineRivalMotion(motion,sample(0,200,.20),1338,total),false,
  "Paquetes atrasados ignorados");
 assert.equal(receiveOnlineRivalMotion(motion,sample(0,3990,3.99),5000,total),true);
 assert.equal(receiveOnlineRivalMotion(motion,sample(1,28,4.028),5038,total),true,
  "Distancia acumulada resuelve el cruce de meta sin salto atrás");
 const progressBefore=motion.visualProgress;
 const seen=drawOnlineRivalMotion(motion,5054,total);
 assert.ok(motion.visualProgress>=progressBefore,"La posición acumulada nunca retrocede");
 assert.ok(seen.distance>=0&&seen.distance<total,"La posición dibujada permanece en el carril");
 const end=motion.frames.at(-1);
 const original={...end};
 drawOnlineRivalMotion(motion,6000,total);
 assert.deepEqual(motion.frames.at(-1),original,"La animación nunca altera datos de red ni cronometraje");
 assert.ok(motion.visualProgress<=end.progress+ONLINE_RIVAL_MOTION.predictionMs*end.speed/1000,
  "La predicción entre paquetes tiene límite estricto");
 const app=fs.readFileSync("src/app.mjs","utf8");
 const iframe=fs.readFileSync("src/live-duel.mjs","utf8");
 assert.match(app,/if\(now-liveRace\.lastSent<115\)return;/,
  "Un estado cada 115 ms, sin aumentar el tráfico a Supabase");
 assert.match(iframe,/local\.done\?600:\(embedded\?0:115\)/,
  "El iframe no descarta la mitad de las muestras ni añade emisiones");
 assert.match(app,/drawOnlineRivalMotion\(liveRace\.motion,now,length\)/,
  "La interpolación vive exclusivamente en la representación del receptor");
 assert.match(app,/const peer=liveRace\.visualRemote\|\|liveRace\.remote;/);
 assert.match(app,/if\(liveRace\.active\)\{\s*onlineSnapshot\(now\);/,
  "Se mantiene la transmisión existente sin modificar el tiempo de carrera");
 console.log("SlotRace online: interpolación local, 115 ms de red, 60 FPS, vueltas, 3G, predicción y tiempos intactos OK");
})().catch(e=>{console.error(e);process.exitCode=1});
