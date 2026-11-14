"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const src=fs.readFileSync("src/app.mjs","utf8");
 const a=src.indexOf("async function awardLocalRaceCredits(");
 const b=src.indexOf("function endSession(",a);
 assert(a>0&&b>a,"Se requiere recompensa conectada al informe de carrera");
 assert(src.includes('mode==="developer"'),"El desarrollador debe poder recibir CR de pruebas");
 assert(src.includes('state.sessionPlayerNick'),"El resultado debe mantener el nick del usuario");
 const html=fs.readFileSync("index.html","utf8");
 assert(html.includes('id="resultsReward"'),"Debe mostrarse el motivo del abono o rechazo");
 assert(html.includes('href="./live.html"'),"El duelo online debe ser accesible desde el juego");
 const factory=new Function("state","walletActive","playerEconomy","playerEconomyClient",
  "playerModeRevision","storage","crypto","$","economyPanel","toast",
  src.slice(a,b)+"\nreturn awardLocalRaceCredits");
 const cache=new Map();
 const storage=(key,value)=>{if(value===undefined)return cache.get(key)||null;cache.set(key,value);return value;};
 let calls=[],walletUpdates=0;
 const label={textContent:""};
 const rpc=async(name,args)=>{
  calls.push({name,args});
  return{data:{credits:140,pieces:{S350:2}},error:null};
 };
 const args={id:"trial-one",mode:"lap_race",laps:Array.from({length:6},(_,i)=>({lane:i<3?0:1})),elapsedMs:25000};
 const duel={lastSessionReport:args,track:{laneChangerIndex:-1},twoLegPhase:2,targetLaps:3};
 const make=(s,account=true)=>factory(s,account,{serverBacked:true,credits:120,pieces:{}},
  {rpc},0,storage,{randomUUID:()=>("00000000-0000-4000-8000-000000000001")},
  id=>id==="resultsReward"?label:null,()=>walletUpdates++,()=>{});
 await make(duel)();
 assert.equal(calls.length,1);assert.equal(calls[0].name,"slotrace_claim_trial_session");
 assert.equal(calls[0].args.p_laps,6);assert.equal(calls[0].args.p_two_heats,true);
 assert.equal(calls[0].args.p_mode,"lap_race");assert.match(label.textContent,/\+20 CR/);
 const pt82={lastSessionReport:{id:"trial-two",mode:"practice",
   laps:[{lane:0}],elapsedMs:8000},track:{laneChangerIndex:5},twoLegPhase:1,targetLaps:3};
 await make(pt82)();
 assert.equal(calls.length,2);assert.equal(calls[1].args.p_mode,"practice");
 assert.equal(calls[1].args.p_two_heats,false);
 const incomplete={lastSessionReport:{id:"trial-three",mode:"lap_race",
  laps:[{lane:0},{lane:0},{lane:0}],elapsedMs:15000},
  track:{laneChangerIndex:-1},twoLegPhase:1,targetLaps:3};
 await make(incomplete)();
 assert.equal(calls.length,2,"Primera manga aislada no paga CR duplicados");
 assert.match(label.textContent,/dos mangas/);
 await make(pt82,false)();
 assert.equal(calls.length,2,"No abonar a usuarios sin cartera conectada");
 assert.match(label.textContent,/inicia sesión/);
 assert(walletUpdates>=2);
 console.log("CR de prueba: duelo con IA o humano, PT82, primera manga y cuenta no conectada OK");
})().catch(e=>{console.error(e);process.exitCode=1});
