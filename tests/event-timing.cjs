"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const {createTimingSession,startTiming,advanceTiming,pauseTiming,recoverTiming,
  recordFinishCrossing,finishTiming,evaluateTiming,rankEventSessions}=
   await import("../src/event-timing.mjs");
 const mk=(id,mode="lap_race")=>createTimingSession({
  sessionId:id,eventId:"slotcup-01",driverId:id,circuitId:"monaco-slot",
  physicsVersion:"slot-physics-v1",mode,targetLaps:2,minLapMs:3000});
 let s=startTiming(mk("piloto-a"),1000);
 s=advanceTiming(s,1017);s=advanceTiming(s,1034);s=advanceTiming(s,1134);
 assert.equal(s.elapsedMs,134,"Nunca aplicar el límite de 50 ms del motor al cronómetro");
 s=recordFinishCrossing(s,5100,{lane:0});
 assert.equal(s.laps[0].lapMs,4100);
 s=recordFinishCrossing(s,9300,{lane:0});
 assert.equal(s.laps[1].lapMs,4200);
 s=finishTiming(s,9300);
 assert.equal(evaluateTiming(s).complete,true);
 assert.equal(s.source,"local-unverified","Ningún dato del cliente se homologa solo");
 const original=s;
 let t=startTiming(mk("piloto-b"),10);
 t=pauseTiming(t,1010);assert.equal(t.elapsedMs,1000);
 t=startTiming(t,999999);t=recordFinishCrossing(t,1003999,{lane:1});
 assert.equal(t.laps[0].lapMs,5000,"La pausa no puede sumar tiempo");
 let v=startTiming(mk("piloto-c"),0);
 v=advanceTiming(v,4000);assert.equal(v.flags[0].type,"frame-gap",
  "Los saltos de cuadros quedan marcados para revisión");
 v=recordFinishCrossing(v,4100,{lane:0,checkpointsOk:false});
 assert.equal(v.laps.length,0,"Cruzar sin puntos de control no genera una vuelta válida");
 v=recordFinishCrossing(v,4200,{lane:0});
 assert.equal(v.laps.length,0,"No admitir vueltas físicamente imposibles");
 assert.equal(v.crossings[1].reason,"below-minimum-physical-time");
 let r=startTiming(mk("piloto-d"),100);
 r=recordFinishCrossing(r,4000,{lane:1});
 r=recoverTiming(r);
 assert.equal(r.status,"paused");
 assert.equal(r.laps.length,1,"Recuperar conserva historial");
 r=startTiming(r,2);r=recordFinishCrossing(r,5000,{lane:1});
 assert.equal(r.crossings.at(-1).reason,"recovery-reference",
  "El primer cruce tras reiniciar no inventa un parcial");
 r=recordFinishCrossing(r,9100,{lane:1});
 assert.equal(r.laps.length,2);
 assert.equal(r.laps[1].lapMs,4100);
 const backwards=startTiming(mk("reloj-vuelto"),100);
 const bad=advanceTiming(backwards,99);
 assert.equal(bad.status,"paused");
 assert.equal(bad.flags[0].type,"clock-regression");
 const winner=rankEventSessions([original,finishTiming(r,9100)],"lap_race");
 assert.equal(winner[0].driverId,"piloto-a");
 assert.equal(winner[0].position,1);
 const qa=startTiming(mk("qa","qualifying"),0);
 const qb=startTiming(mk("qb","qualifying"),0);
 const qa2=recordFinishCrossing(qa,4100,{lane:0});
 const qb2=recordFinishCrossing(qb,4000,{lane:1});
 assert.equal(rankEventSessions([qa2,qb2],"qualifying")[0].driverId,"qb");
 const saved=JSON.parse(JSON.stringify(s));
 assert.deepEqual(evaluateTiming(saved),evaluateTiming(s),
  "Una exportación JSON conserva los resultados");
 assert.throws(()=>recoverTiming({...saved,schema:999}),/incompatible/);
 assert.throws(()=>createTimingSession({sessionId:"x",driverId:"y",circuitId:"z",
  physicsVersion:"1",mode:"lap_race",targetLaps:0}),/vueltas/);
 assert.equal(original.laps.length,2,"Las transformaciones no mutan actas anteriores");
 console.log("SlotRace: reloj monotónico, pausas, FPS, recuperación, anti-vuelta imposible y clasificaciones OK");
})().catch(err=>{console.error(err);process.exitCode=1});
