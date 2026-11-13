// Vista comparativa de resultados de SlotRace.
// Deriva únicamente datos de vueltas REALES; no modifica reloj, récords ni carrera.
import {duelSummary} from "./race-results.mjs";

const cleanLap = value => Number.isFinite(value)&&value>=0 ? value : null;
const gapMs = (p,a) => Math.round((a-p)*1000)/1000;
export function duelPresentation(playerLaps,aiLaps,targetLaps,phase=2){
 const summary=duelSummary(playerLaps,aiLaps,targetLaps,phase);
 const count=Math.max(1,Math.trunc(targetLaps)||1);
 const best = laps => {
  const all=laps.map(l=>cleanLap(l.seconds)).filter(v=>v!==null);
  return all.length?Math.min(...all):null;
 };
 const bestPlayer=best(playerLaps);
 const bestAi=best(aiLaps);
 const heats=summary.heats.filter(h=>h.heat<=phase).map(heat=>{
  const rows=[];
  for(let lap=1;lap<=count;lap++){
   // El número del jugador es global en la sesión; el de la IA es local
   // a cada manga. Aceptar la representación local si viene de una prueba.
   const p=playerLaps.find(x=>(x.heat||1)===heat.heat&&
     (x.number-(heat.heat-1)*count)===lap);
   const a=aiLaps.find(x=>x.heat===heat.heat&&x.number===lap);
   if(!p&&!a)continue;
   const playerTime=cleanLap(p?.seconds),aiTime=cleanLap(a?.seconds);
   const gap=playerTime===null||aiTime===null?null:gapMs(playerTime,aiTime);
   const faster=gap===null?null:Math.abs(gap)<.001?"tie":gap>0?"player":"ai";
   rows.push({lap,playerTime,aiTime,gap,faster,
    playerBest:playerTime!==null&&bestPlayer!==null&&Math.abs(playerTime-bestPlayer)<.0005,
    aiBest:aiTime!==null&&bestAi!==null&&Math.abs(aiTime-bestAi)<.0005});
  }
  const heatGap=heat.playerTotal!==null&&heat.aiTotal!==null?
    gapMs(heat.playerTotal,heat.aiTotal):null;
  return {...heat,rows,heatGap,heatWinner:heatGap===null?null:
    Math.abs(heatGap)<.001?"tie":heatGap>0?"player":"ai"};
 });
 return {summary,heats,bestPlayer,bestAi};
}
