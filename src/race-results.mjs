// Resultados de duelos analógicos: dos mangas con carriles intercambiados.
// Los tiempos son valores medidos por el cronómetro monotónico en milisegundos.
export function duelSummary(playerLaps,aiLaps,targetLaps,phase=2){
 const laps=Math.max(1,Math.trunc(targetLaps)||1);
 const heats=[1,2].map(heat=>{
  const p=playerLaps.filter(l=>(l.heat||1)===heat).slice(0,laps);
  const a=aiLaps.filter(l=>l.heat===heat).slice(0,laps);
  const sum=xs=>xs.reduce((t,x)=>t+(Number.isFinite(x.seconds)?x.seconds:0),0);
  const best=xs=>xs.length?Math.min(...xs.map(x=>x.seconds)):null;
  return{heat,playerLaps:p.length,aiLaps:a.length,
   playerTotal:p.length===laps?sum(p):null,
   aiTotal:a.length===laps?sum(a):null,
   playerBest:best(p),aiBest:best(a)};
 });
 const completed=phase===2&&heats.every(h=>h.playerLaps===laps&&h.aiLaps===laps);
 const playerTotal=completed?heats.reduce((t,h)=>t+h.playerTotal,0):null;
 const aiTotal=completed?heats.reduce((t,h)=>t+h.aiTotal,0):null;
 const winner=!completed?null:Math.abs(playerTotal-aiTotal)<.001?"tie":
  playerTotal<aiTotal?"player":"ai";
 return{heats,completed,playerTotal,aiTotal,winner,
  difference:completed?Math.abs(playerTotal-aiTotal):null};
}
