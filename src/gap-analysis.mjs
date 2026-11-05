// SlotRace · medición física de huecos entre conectores de dos carriles.
// Nunca estira geometrías ni declara un cierre sólo por proximidad visual.
export const GAP_TOLERANCE_MM=3;
export const HEADING_TOLERANCE_DEGREES=1;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const round=n=>Math.round(n*10)/10;
// Sólo los huecos cuya longitud sea múltiplo exacto de la unidad
// pueden completarse mediante rectas sin modificar la geometría.
// Las piezas deben seguir alineadas y la solución usa el mínimo número
// posible de módulos, con preferencia por los largos.
export function composeStraightDistance(distance,catalog,unit=12.5,{maxUnits=800}={}){
 if(!Number.isFinite(distance)||!Number.isFinite(unit)||unit<=0||distance<=0)return null;
 const units=Math.round(distance/unit);
 if(units<1||units>maxUnits||Math.abs(distance-units*unit)>1e-6)return null;
 const options=Object.entries(catalog)
  .filter(([id,p])=>Number.isFinite(p.length)&&p.length>0&&id!=="START350"&&!p.legacy)
  .map(([id,p])=>({id,units:Math.round(p.length/unit),length:p.length}))
  .filter(p=>p.units>=1&&Math.abs(p.length-p.units*unit)<1e-7)
  .sort((a,b)=>b.units-a.units||a.id.localeCompare(b.id));
 const best=Array(units+1).fill(null);best[0]=[];
 for(let n=1;n<=units;n++)for(const option of options){
  const rem=n-option.units;
  if(rem<0||!best[rem])continue;
  const candidate=[...best[rem],option.id];
  if(!best[n]||candidate.length<best[n].length)best[n]=candidate;
 }
 return best[units]?{ids:best[units],names:best[units].map(id=>catalog[id].name),length:units*unit,units,count:best[units].length}:null;
}
export function measureGap(from,to,catalog,{tolerance=GAP_TOLERANCE_MM}={}){
 if(!from||!to||![from.x,from.y,from.h,to.x,to.y,to.h].every(Number.isFinite))
  throw new Error("Conectores no válidos para medir el hueco");
 const dx=to.x-from.x,dy=to.y-from.y,ca=Math.cos(from.h),sa=Math.sin(from.h);
 const forward=dx*ca+dy*sa,lateral=-dx*sa+dy*ca;
 const distance=Math.hypot(dx,dy);
 const heading=wrap(to.h-from.h);
 const straight=Object.entries(catalog).filter(([id,p])=>Number.isFinite(p.length)&&p.length>0&&!p.legacy)
  .map(([id,p])=>({id,length:p.length,name:p.name,virtual:!!p.virtualMicroAdapter,
   difference:Math.abs(p.length-forward)}))
  .sort((a,b)=>a.difference-b.difference||a.length-b.length);
 const aligned=Math.abs(lateral)<=tolerance&&Math.abs(heading)<=HEADING_TOLERANCE_DEGREES*Math.PI/180&&forward>0;
 const matching=aligned?straight.find(x=>x.difference<=tolerance):undefined;
 const combination=aligned?composeStraightDistance(forward,catalog):null;
 const exact=aligned&&Math.abs(lateral)<1e-6&&Math.abs(heading)<1e-8&&Boolean(combination);
 const problem=Math.abs(heading)>HEADING_TOLERANCE_DEGREES*Math.PI/180?"angle":
  Math.abs(lateral)>tolerance?"lateral":
  distance<=tolerance?"touching":
  forward<=0?"backward":combination?"composition":matching?"match":"length";
 return{from:{...from},to:{...to},distance,forward,lateral,heading,
  headingDegrees:Math.abs(heading)*180/Math.PI,aligned,problem,
  matching:matching||null,combination,nearest:straight[0]||null,exact:Boolean(exact),
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
 if(result.combination){
  const ids=result.combination.ids;
  return "HUECO "+m.forward+" mm · Combinación: "+ids.length+
    " pieza(s) ("+result.combination.names.join(" + ")+")."+
    (result.exact?" Conectores alineados: cierre matemáticamente exacto.":" Alinea antes los extremos; todavía hay un pequeño desfase.");
 }
 if(result.matching)return "HUECO "+m.distance+" mm · La recta "+result.matching.length+
  " mm está a "+Math.round(result.matching.difference*10)/10+
  " mm, pero no cierra matemáticamente exacto. Reajusta el trazado.";
 if(result.problem==="length")return "HUECO "+m.forward+
  " mm · No existe una combinación positiva de las cinco rectas. Puedes intentar compensar el hueco sustituyendo rectas del trazado (75 ↔ 87,5 mm) con Cerrar exacto.";
 return "Este hueco no puede cerrarse exactamente con una sola recta.";
}
