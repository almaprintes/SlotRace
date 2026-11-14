// SlotRace · Rivales progresivos. No altera la velocidad máxima del vehículo.
// Curvas y distancias están expresadas en mm; velocidades en mm/s.
export const AI_DIFFICULTIES=Object.freeze({
 easy:Object.freeze({label:"Fácil",straightFactor:.74,curveFactor:.42,lookaheadMm:0,brakingDecel:0}),
 medium:Object.freeze({label:"Media",straightFactor:.91,curveFactor:.79,lookaheadMm:560,brakingDecel:1250}),
 hard:Object.freeze({label:"Difícil",straightFactor:1,curveFactor:.91,lookaheadMm:840,brakingDecel:1550})
});
export function normalizeAiDifficulty(value){
 return Object.hasOwn(AI_DIFFICULTIES,value)?value:"easy";
}
export function aiSpeedTarget({difficulty="easy",lane,distance=0,direction=1,
 physicalLane=0,positionAt,topSpeed=1150,laneOffset=0,gripG=.97,gravity=9.81}){
 const profile=AI_DIFFICULTIES[normalizeAiDifficulty(difficulty)];
 if(!(lane?.total>0)||typeof positionAt!=="function"||!(topSpeed>0))return 0;
 // El modo fácil reproduce la regla anterior sin cambios.
 const point=positionAt(lane,direction===-1?-distance:distance);
 if(difficulty==="easy")return topSpeed*(point?.curve?.42:.74);
 const curveLimit=(pose)=>{
  if(!pose?.curve||!Number.isFinite(pose.radius))return Infinity;
  const offset=physicalLane===0?-laneOffset:laneOffset;
  const radius=Math.max(70,pose.radius-offset*pose.curve);
  // Igual referencia de agarre y límite de guía que usa el coche del jugador.
  const gripSpeed=Math.sqrt(Math.max(0,gripG)*gravity*1000*radius);
  return Math.min(gripSpeed,.975*topSpeed)*profile.curveFactor;
 };
 let desired=topSpeed*profile.straightFactor;
 const currentLimit=curveLimit(point);
 desired=Math.min(desired,currentLimit);
 // Mirada hacia delante: cuánto podrá recorrer antes de llegar a cada curva.
 // No frena en seco ni conoce la posición/tiempos del jugador.
 const step=70;
 for(let ahead=step;ahead<=profile.lookaheadMm;ahead+=step){
  const sample=positionAt(lane,direction===-1?-(distance+ahead):distance+ahead);
  const limit=curveLimit(sample);
  if(!Number.isFinite(limit))continue;
  const approaching=Math.sqrt(limit*limit+2*profile.brakingDecel*ahead);
  desired=Math.min(desired,approaching);
 }
 return Math.max(0,Math.min(topSpeed,desired));
}
