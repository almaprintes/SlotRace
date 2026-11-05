// SlotRace · medición física de huecos entre conectores de dos carriles.
// Nunca estira geometrías ni declara un cierre sólo por proximidad visual.
export const GAP_TOLERANCE_MM=3;
export const HEADING_TOLERANCE_DEGREES=1;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const round=n=>Math.round(n*10)/10;
export function measureGap(from,to,catalog,{tolerance=GAP_TOLERANCE_MM}={}){
 if(!from||!to||![from.x,from.y,from.h,to.x,to.y,to.h].every(Number.isFinite))
  throw new Error("Conectores no válidos para medir el hueco");
 const dx=to.x-from.x,dy=to.y-from.y,ca=Math.cos(from.h),sa=Math.sin(from.h);
 const forward=dx*ca+dy*sa,lateral=-dx*sa+dy*ca;
 const distance=Math.hypot(dx,dy);
 const heading=wrap(to.h-from.h);
 const straight=Object.entries(catalog).filter(([id,p])=>Number.isFinite(p.length)&&p.length>0)
  .map(([id,p])=>({id,length:p.length,name:p.name,virtual:!!p.virtualMicroAdapter,
   difference:Math.abs(p.length-forward)}))
  .sort((a,b)=>a.difference-b.difference||a.length-b.length);
 const aligned=Math.abs(lateral)<=tolerance&&Math.abs(heading)<=HEADING_TOLERANCE_DEGREES*Math.PI/180&&forward>0;
 const matching=aligned?straight.find(x=>x.difference<=tolerance):undefined;
 const exact=aligned&&matching&&matching.difference<1e-6&&Math.abs(lateral)<1e-6&&Math.abs(heading)<1e-8;
 const problem=distance<=tolerance?"touching":
  Math.abs(heading)>HEADING_TOLERANCE_DEGREES*Math.PI/180?"angle":
  Math.abs(lateral)>tolerance?"lateral":
  forward<=0?"backward":matching?"match":"length";
 return{from:{...from},to:{...to},distance,forward,lateral,heading,
  headingDegrees:Math.abs(heading)*180/Math.PI,aligned,problem,
  matching:matching||null,nearest:straight[0]||null,exact:Boolean(exact),
  measured:{distance:round(distance),forward:round(forward),
   lateral:round(lateral),angle:round(Math.abs(heading)*180/Math.PI)}};
}
export function analyzeOpenEnds(groups,catalog,{selectedKey=null,maxDistance=600}={}){
 const pairs=[];
 for(let i=0;i<groups.length;i++)for(let j=0;j<groups.length;j++){
  const a=groups[i],b=groups[j];
  if(i===j&&a.count<2)continue;
  if(selectedKey&&a.key!==selectedKey&&b.key!==selectedKey)continue;
  const result=measureGap(a.end,b.start,catalog);
  if(result.distance>maxDistance)continue;
  // La pareja elegida debe ser el extremo real de la cadena, no el
  // conector interno de una pieza cualquiera.
  const selectionBoost=selectedKey&&(a.key===selectedKey||b.key===selectedKey)?-20:0;
  const penalty=(result.problem==="angle"?130:result.problem==="lateral"?70:0);
  const score=result.distance+penalty+selectionBoost;
  pairs.push({...result,fromKey:a.key,toKey:b.key,score});
 }
 pairs.sort((a,b)=>a.score-b.score||a.distance-b.distance);
 return pairs;
}
export function gapExplanation(result){
 if(!result)return "Selecciona un tramo con extremos próximos y pulsa Medir hueco.";
 const m=result.measured,n=result.nearest;
 if(result.problem==="touching")return "Los extremos están prácticamente juntos. Comprueba la orientación y usa Encajar.";
 if(result.problem==="angle")return "HUECO "+m.distance+" mm · Diferencia de orientación "+m.angle+"°. Una recta no servirá: cambia una curva o gira el tramo.";
 if(result.problem==="lateral")return "HUECO "+m.distance+" mm · Desfase lateral "+m.lateral+" mm. Una recta más corta no corrige el lateral: cambia una curva anterior.";
 if(result.problem==="backward")return "Los extremos se superponen en sentido longitudinal. Revisa la orientación de los tramos.";
 if(result.matching)return "HUECO "+m.distance+" mm · Compatible con "+result.matching.name+" ("+result.matching.length+" mm)"+(result.exact?" · encaje matemático exacto.":" · dentro de la tolerancia de 3 mm, sin deformar la pieza.");
 if(result.problem==="length")return "HUECO "+m.forward+" mm · No existe recta exacta en el catálogo. Más próxima: "+(n?.length??"—")+" mm; cambia un tramo anterior para cerrar.";
 return "Este hueco no puede cerrarse exactamente con una sola recta.";
}
