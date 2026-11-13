"use strict";
const assert=require("node:assert/strict");
(async()=>{
 const {duelScoreboard}=await import("../src/duel-scoreboard.mjs");
 const p=[4.326,3.421,3.777,3.707,3.536,3.677,3.173,3.124,3.124,3.124]
  .map((seconds,i)=>({heat:i<5?1:2,number:i+1,seconds}));
 const ai=[6.506,6.253,6.242,6.253,6.251,5.532,5.277,5.277,5.277,5.277]
  .map((seconds,i)=>({heat:i<5?1:2,number:i%5+1,seconds}));
 const d=duelScoreboard(p,ai,5,2);
 assert.equal(d.completed,true);
 assert.equal(d.winner,"player");
 assert.deepEqual(d.heats.map(h=>h.playerTotalMs),[18767,16222]);
 assert.deepEqual(d.heats.map(h=>h.aiTotalMs),[31505,26640]);
 assert.equal(d.playerTotalMs,34989);
 assert.equal(d.aiTotalMs,58145);
 assert.equal(d.differenceMs,23156);
 assert.equal(d.playerBestMs,3124);
 assert.equal(d.aiBestMs,5277);
 assert.deepEqual(d.heats.map(h=>h.rows.length),[5,5]);
 assert.equal(d.heats[0].rows[1].deltaMs,2832);
 assert.equal(d.heats[1].rows[2].deltaMs,2153);
 assert.equal(d.heats[1].rows[2].bestPlayer,true);
 assert.equal(d.heats[1].rows[3].bestPlayer,true,"Empate en mejor vuelta se señala en ambas");
 const first=duelScoreboard(p.slice(0,5),ai.slice(0,5),5,1);
 assert.equal(first.completed,false);
 assert.equal(first.winner,null);
 assert.equal(first.playerTotalMs,null);
 assert.equal(first.heats.length,1);
 assert.equal(first.heats[0].playerTotalMs,18767);
 const partial=duelScoreboard(p.slice(0,4),ai.slice(0,2),5,1);
 assert.equal(partial.heats[0].rows.length,4);
 assert.equal(partial.heats[0].rows[3].aiMs,null);
 assert.equal(partial.heats[0].rows[3].deltaMs,null);
 assert.equal(partial.heats[0].winner,null);
 const other=duelScoreboard(p,ai.map(l=>({...l,seconds:l.seconds*.4})),5,2);
 assert.equal(other.winner,"ai");
 assert.ok(other.differenceMs<0);
 const same=duelScoreboard(p,p.map(l=>({...l,number:(l.number-1)%5+1})),5,2);
 assert.equal(same.winner,"tie");
 assert.equal(same.differenceMs,0);
 // The user-visible totals always equal the displayed millisecond rows.
 for(const h of d.heats){
  assert.equal(h.playerTotalMs,h.rows.reduce((s,l)=>s+l.playerMs,0));
  assert.equal(h.aiTotalMs,h.rows.reduce((s,l)=>s+l.aiMs,0));
 }
 console.log("Duel scoreboard: 2 mangas, tablas 10 vueltas, redondeo visible, ganador, empate y parcial OK");
})().catch(e=>{console.error(e);process.exitCode=1;});
