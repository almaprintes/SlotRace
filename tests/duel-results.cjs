"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const {duelSummary}=await import("../src/race-results.mjs");
 const p=[{heat:1,number:1,seconds:8.1},{heat:1,number:2,seconds:8.3},
  {heat:2,number:3,seconds:9.1},{heat:2,number:4,seconds:9.2}];
 const a=[{heat:1,number:1,seconds:8.4},{heat:1,number:2,seconds:8.5},
  {heat:2,number:1,seconds:9.0},{heat:2,number:2,seconds:9.3}];
 const win=duelSummary(p,a,2,2);
 assert.equal(win.completed,true);
 assert.equal(win.winner,"player");
 assert.ok(Math.abs(win.playerTotal-34.7)<1e-9);
 assert.ok(Math.abs(win.aiTotal-35.2)<1e-9);
 assert.ok(Math.abs(win.difference-.5)<1e-9);
 assert.deepEqual(win.heats.map(x=>[x.playerLaps,x.aiLaps]),[[2,2],[2,2]]);
 const ai=duelSummary(p,a.map(x=>({...x,seconds:x.seconds-1.5})),2,2);
 assert.equal(ai.winner,"ai");
 const tie=duelSummary(p,p.map(x=>({heat:x.heat,number:x.number,seconds:x.seconds})),2,2);
 assert.equal(tie.winner,"tie");
 assert.equal(duelSummary(p.slice(0,3),a,2,2).winner,null);
 assert.equal(duelSummary(p,a,2,1).winner,null,
  "La primera manga nunca proclama vencedor definitivo");
 const incomplete=duelSummary(p,a.slice(0,3),2,2);
 assert.equal(incomplete.completed,false);
 assert.equal(incomplete.winner,null,"No inventar tiempo de la IA sin cuarta vuelta");
 console.log("Clasificación IA: gana jugador, gana IA, empate, dos mangas y prueba incompleta OK");
})().catch(e=>{console.error(e);process.exitCode=1});
