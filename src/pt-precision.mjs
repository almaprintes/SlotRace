// SlotRace — familia modular PT-Precision (geometría nominal de diseño).
// Integrado como catálogo jugable en DEV 0.9.0. NO certifica acoplamiento físico.
export const FAMILY_ID = "pt-precision-v1";
export const GEOMETRY = Object.freeze({
  trackWidth: 156, lanePitch: 78, laneOffset: 39,
  straightUnit: 175, radiusStep: 156,
  innerOuterRadius: 214, degreesPerHalfCurve: 22.5
});
export const RADII = Object.freeze({
  R1: 214 - GEOMETRY.trackWidth / 2,             // 136
  R2: 214 - GEOMETRY.trackWidth / 2 + 156,       // 292
  R3: 214 - GEOMETRY.trackWidth / 2 + 312,       // 448
  R4: 214 - GEOMETRY.trackWidth / 2 + 468        // 604
});
const frozen = (x) => Object.freeze(x);
const straight = (name,length,reference,extra={}) =>
  frozen({kind:"straight",name,length,reference, ...extra});
const curve = (radiusId,deg,reference,direction) =>
  frozen({kind:"curve",name:`${radiusId} ${deg}° ${direction===1?"derecha":"izquierda"}`,
    radiusId,radius:RADII[radiusId],angle:direction*deg*Math.PI/180,
    degrees:deg,direction,reference});
const parts = {
  // Módulos de ajuste propios de SlotRace. Longitudes exactas derivadas
  // de PT/57 (78 mm); NO se presentan como piezas SCX reales.
  S00975:straight("Ajuste 9,75",78/8,"SR/A-1/8",{virtualMicroAdapter:true}),
  S0195:straight("Ajuste 19,5",78/4,"SR/A-1/4",{virtualMicroAdapter:true}),
  S039:straight("Ajuste 39",78/2,"SR/A-1/2",{virtualMicroAdapter:true}),
  S0585:straight("Ajuste 58,5",78*3/4,"SR/A-3/4",{virtualMicroAdapter:true}),
  S078:straight("Recta corta 78",78,"PT/57"),
  S0875:straight("Cuarto exacto 87,5",GEOMETRY.straightUnit/2,"PT/58 (nominal 87 mm redondeados)",{virtualExactQuarter:true}),
  S175:straight("Media recta 175",175,"PT/59"),
  S350:straight("Recta normal 350",350,"PT/60"),
  S584:straight("Recta larga de cierre 584",2*RADII.R2,"C8505 (familia Sport)",{virtualSystemAdapter:true}),
  START350:straight("Salida y meta 350",350,"PT/63",{startFinish:true})
};
for(const [radiusId,degs] of Object.entries({R1:[22.5,45,90],R2:[22.5,45],R3:[22.5],R4:[22.5]})){
  for(const deg of degs){
    const reference = ({
      "R1:22.5":"PT/55","R1:45":"PT/52","R1:90":"PT/56",
      "R2:22.5":"PT/54","R2:45":"PT/51",
      "R3:22.5":"PT/53","R4:22.5":"PT/84"
    })[`${radiusId}:${deg}`];
    const a=deg===22.5?"225":String(deg);
    parts[`${radiusId}_${a}R`]=curve(radiusId,deg,reference,1);
    parts[`${radiusId}_${a}L`]=curve(radiusId,deg,reference,-1);
  }
}
export const PARTS=frozen(parts);
// Familias especiales: geometría nominal de entrada y salida, NO enrutable
// hasta modelar correctamente los dos carriles y las conexiones verticales.
export const SPECIALS=frozen({
  X350:frozen({name:"Cambio de carriles por parejas",reference:"PT/82",span:350,requiresLaneRouting:true}),
  CROSS90:frozen({name:"Cruce a 90°",reference:"PT/83",requiresMultiConnectorTopology:true}),
  CURVE_CHICANE:frozen({name:"Chicane de curva",reference:"PT/85",requiresLaneRouting:true}),
  BRIDGE:frozen({name:"Puente y soportes",reference:"PT/68, PT/70",requiresElevation:true}),
  BORDERS:frozen({name:"Bordes rectos y curvos",reference:"T/39—T/45",sceneryOnly:true})
});
export function endpoint(pose,id){
  const p=PARTS[id];if(!p)throw Error("Pieza PT-Precision desconocida: "+id);
  const h=pose.h;
  if(p.kind==="straight")return {x:pose.x+Math.cos(h)*p.length,y:pose.y+Math.sin(h)*p.length,h};
  const h2=h+p.angle, signedRadius=p.radius*Math.sign(p.angle);
  return {x:pose.x+signedRadius*(Math.sin(h2)-Math.sin(h)),
    y:pose.y-signedRadius*(Math.cos(h2)-Math.cos(h)),h:h2};
}
export function trace(ids,origin={x:0,y:0,h:0}){
  let pose={...origin};for(const id of ids)pose=endpoint(pose,id);
  const gap=Math.hypot(pose.x-origin.x,pose.y-origin.y);
  const heading=Math.atan2(Math.sin(pose.h-origin.h),Math.cos(pose.h-origin.h));
  return {end:pose,gap,headingGap:Math.abs(heading),exact:gap<1e-6&&Math.abs(heading)<1e-10};
}
// La recta de 584 mm es 2 × radio central R2 (292 mm).
// Dos diagonales y dos lóbulos de seis curvas de 45° cierran un ocho exacto.
export const RECIPES=frozen({
  ovalR2:frozen(["S350","S350",...Array(4).fill("R2_45R"),
    "S350","S350",...Array(4).fill("R2_45R")]),
  eightR2:frozen(["S584",...Array(6).fill("R2_45R"),
    "S584",...Array(6).fill("R2_45L")])
});
