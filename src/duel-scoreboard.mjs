// Resultados VISUALES para duelos locales. Los tiempos oficiales/actas no se modifican.
// Se calculan en milisegundos enteros a partir de las vueltas que muestra la tabla,
// para que los totales y diferencias coincidan exactamente con las celdas visibles.
import {duelSummary} from "./race-results.mjs?v=0.15.65";
const milliseconds = value => Number.isFinite(value) && value>=0 ?
  Math.round(value*1000) : null;
const add = values => values.reduce((sum,value)=>sum+value,0);
export function duelScoreboard(playerLaps,aiLaps,targetLaps,phase=2){
 const summary=duelSummary(playerLaps,aiLaps,targetLaps,phase);
 const target=Math.max(1,Math.trunc(targetLaps)||1);
 const heats=[1,2].filter(h=>h<=phase).map(heat=>{
  // La vuelta del jugador tiene número global; la IA lo reinicia por manga.
  // Se respeta el orden de captura, sin inventar vueltas cuando falta alguna.
  const player=playerLaps.filter(l=>(l.heat||1)===heat).slice(0,target);
  const rival=aiLaps.filter(l=>l.heat===heat).slice(0,target);
  const playerMs=player.map(l=>milliseconds(l.seconds));
  const aiMs=rival.map(l=>milliseconds(l.seconds));
  const bestPlayer=playerMs.length&&playerMs.every(Number.isInteger)?Math.min(...playerMs):null;
  const bestAi=aiMs.length&&aiMs.every(Number.isInteger)?Math.min(...aiMs):null;
  const rows=Array.from({length:Math.max(player.length,rival.length)},(_,i)=>{
   const p=playerMs[i]??null,a=aiMs[i]??null;
   return {number:i+1,playerMs:p,aiMs:a,
    deltaMs:p===null||a===null?null:a-p,
    bestPlayer:p!==null&&p===bestPlayer,bestAi:a!==null&&a===bestAi};
  });
  const playerTotalMs=player.length===target&&playerMs.every(Number.isInteger)?add(playerMs):null;
  const aiTotalMs=rival.length===target&&aiMs.every(Number.isInteger)?add(aiMs):null;
  const deltaMs=playerTotalMs===null||aiTotalMs===null?null:aiTotalMs-playerTotalMs;
  const winner=deltaMs===null?null:Math.abs(deltaMs)<1?"tie":deltaMs>0?"player":"ai";
  return {heat,rows,playerTotalMs,aiTotalMs,deltaMs,winner,
   playerBestMs:bestPlayer,aiBestMs:bestAi,
   playerCount:player.length,aiCount:rival.length};
 });
 const completed=summary.completed&&heats.length===2;
 const playerTotalMs=completed?add(heats.map(h=>h.playerTotalMs)):null;
 const aiTotalMs=completed?add(heats.map(h=>h.aiTotalMs)):null;
 const differenceMs=completed?aiTotalMs-playerTotalMs:null;
 const bestPlayerMs=heats.flatMap(h=>h.rows.map(l=>l.playerMs)).filter(Number.isInteger);
 const bestAiMs=heats.flatMap(h=>h.rows.map(l=>l.aiMs)).filter(Number.isInteger);
 return {completed,winner:summary.winner,phase,heats,playerTotalMs,aiTotalMs,
  differenceMs,playerBestMs:bestPlayerMs.length?Math.min(...bestPlayerMs):null,
  aiBestMs:bestAiMs.length?Math.min(...bestAiMs):null};
}
