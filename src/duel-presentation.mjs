// Vista comparativa de SlotRace. Nunca modifica el cronómetro ni las actas.
// La UI enseña milésimas: cada total se obtiene sumando las mismas milésimas
// que ve el jugador, para que filas, mangas y marcador cuadren exactamente.
import {duelSummary} from "./race-results.mjs?v=0.15.66";

const toMs = value => Number.isFinite(value)&&value>=0?
 Math.round(value*1000):null;
const toSec = ms => ms===null?null:ms/1000;
const sumMs = values => values.reduce((total,ms)=>total+ms,0);
export function duelPresentation(playerLaps,aiLaps,targetLaps,phase=2){
 const rawSummary=duelSummary(playerLaps,aiLaps,targetLaps,phase);
 const count=Math.max(1,Math.trunc(targetLaps)||1);
 const playerMs=playerLaps.map(l=>toMs(l.seconds)).filter(Number.isInteger);
 const aiMs=aiLaps.map(l=>toMs(l.seconds)).filter(Number.isInteger);
 const bestPlayerMs=playerMs.length?Math.min(...playerMs):null;
 const bestAiMs=aiMs.length?Math.min(...aiMs):null;
 const heats=rawSummary.heats.filter(h=>h.heat<=phase).map(heat=>{
  const rows=[];
  for(let lap=1;lap<=count;lap++){
   const p=playerLaps.find(x=>(x.heat||1)===heat.heat&&
     (x.number-(heat.heat-1)*count)===lap);
   const a=aiLaps.find(x=>x.heat===heat.heat&&x.number===lap);
   if(!p&&!a)continue;
   const pMs=toMs(p?.seconds),aMs=toMs(a?.seconds);
   const gapMs=pMs===null||aMs===null?null:aMs-pMs;
   const faster=gapMs===null?null:gapMs===0?"tie":gapMs>0?"player":"ai";
   rows.push({lap,playerTime:toSec(pMs),aiTime:toSec(aMs),
    gap:toSec(gapMs),faster,
    playerBest:pMs!==null&&pMs===bestPlayerMs,
    aiBest:aMs!==null&&aMs===bestAiMs});
  }
  const pValues=rows.map(r=>toMs(r.playerTime)).filter(Number.isInteger);
  const aValues=rows.map(r=>toMs(r.aiTime)).filter(Number.isInteger);
  const playerTotalMs=pValues.length===count?sumMs(pValues):null;
  const aiTotalMs=aValues.length===count?sumMs(aValues):null;
  const gapMs=playerTotalMs===null||aiTotalMs===null?
   null:aiTotalMs-playerTotalMs;
  const heatWinner=gapMs===null?null:gapMs===0?"tie":gapMs>0?"player":"ai";
  const playerBestMs= pValues.length ? Math.min(...pValues):null;
  const aiBestMsHeat= aValues.length ? Math.min(...aValues):null;
  return {...heat,rows,
   playerTotal:toSec(playerTotalMs),aiTotal:toSec(aiTotalMs),
   playerBest:toSec(playerBestMs),aiBest:toSec(aiBestMsHeat),
   heatGap:toSec(gapMs),heatWinner};
 });
 // Sólo totales VISUALES para la pantalla; no se reescriben tiempos reales
 // ni datos almacenados. Conservamos el criterio de carrera completada.
 let summary=rawSummary;
 if(rawSummary.completed){
  const totalP=sumMs(heats.map(h=>toMs(h.playerTotal)));
  const totalAi=sumMs(heats.map(h=>toMs(h.aiTotal)));
  const delta=totalAi-totalP;
  summary={...rawSummary,heats,
   playerTotal:toSec(totalP),aiTotal:toSec(totalAi),
   difference:Math.abs(delta)/1000,
   winner:delta===0?"tie":delta>0?"player":"ai"};
 }else{
  summary={...rawSummary,heats};
 }
 return {summary,heats,bestPlayer:toSec(bestPlayerMs),bestAi:toSec(bestAiMs)};
}
