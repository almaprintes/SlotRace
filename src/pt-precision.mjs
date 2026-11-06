// SlotRace — familia modular SR-Precision, fase experimental DEV 0.9.7.
// Sistema geométrico virtual inspirado en la modularidad de Scalextric,
// NO es una reproducción exacta de piezas o conectores comerciales.
export const FAMILY_ID = "sr-precision-v1";
// Familia virtual proporcional. Cada recta mide un número entero de
// unidades de 12,5 mm. Radios, anchura y doble de R2 se expresan también
// en esa unidad. No son dimensiones de un catálogo físico certificado.
export const GEOMETRY = Object.freeze({
  lengthUnit:12.5,trackWidth:150,lanePitch:75,laneOffset:37.5,
  straightUnit:175,radiusStep:150,
  innerOuterRadius:225,degreesPerHalfCurve:22.5
});
export const RADII = Object.freeze({
  R1: GEOMETRY.lengthUnit*12, // 150
  R2: GEOMETRY.lengthUnit*24, // 300
  R3: GEOMETRY.lengthUnit*36, // 450
  R4: GEOMETRY.lengthUnit*48  // 600
});
const frozen = (x) => Object.freeze(x);
const straight = (name,length,reference,extra={}) =>
  frozen({kind:"straight",name,length,reference, ...extra});
const curve = (radiusId,deg,reference,direction) =>
  frozen({kind:"curve",name:`${radiusId} ${deg}° ${direction===1?"derecha":"izquierda"}`,
    radiusId,radius:RADII[radiusId],angle:direction*deg*Math.PI/180,
    degrees:deg,direction,reference});
// Cinco longitudes visibles. La unidad matemática sigue siendo 12,5 mm,
// pero ya NO hay una pieza física de esa longitud en la caja.
// Las construcciones existentes con S0125 conservan su geometría exacta.
const straightSizes = Object.freeze([
 ["S075",6,"Recta corta 75"],
 ["S0875",7,"Recta 87,5"],
 ["S175",14,"Media recta 175"],
 ["S350",28,"Recta 350"],
 ["S600",48,"Recta puente 600"]
]);
const parts={
 // Referencia heredada: sólo lectura/edición de circuitos guardados.
 // No aparece en el inventario ni se utiliza en cierres nuevos.
 S0125:straight("Ajuste fino 12,5 (heredada)",12.5,"SR/01",
  {units:1,virtualPrecision:true,virtualMicroAdapter:true,legacy:true})
};
for(const [id,units,name] of straightSizes)
 parts[id]=straight(name,units*GEOMETRY.lengthUnit,
  "SR/"+String(units).padStart(2,"0"),
  {units,virtualPrecision:true,virtualMicroAdapter:units<=5});
parts.START350=straight("Salida y meta 350",28*GEOMETRY.lengthUnit,
 "SR/META",{units:28,startFinish:true,virtualPrecision:true});
// Curvas de 90° independientes: una sola pieza, un solo arco continuo,
// dos conectores externos. Las recetas antiguas de 2×45°/4×22,5° se conservan.
for(const [radiusId,degs] of Object.entries({R1:[22.5,45,90],R2:[22.5,45,90],R3:[22.5,90],R4:[22.5,90]})){
  for(const deg of degs){
    const reference="SR/"+radiusId+"/"+String(deg).replace(".","_");
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
  const p=PARTS[id];if(!p)throw Error("Pieza SR-Precision desconocida: "+id);
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
// La recta de 600 mm es exactamente 2 × radio central R2 (300 mm).
// Dos diagonales y dos lóbulos de seis curvas de 45° cierran un ocho exacto.
export const RECIPES=frozen({
  ovalR2:frozen(["S350","S350",...Array(4).fill("R2_45R"),
    "S350","S350",...Array(4).fill("R2_45R")]),
  eightR2:frozen(["S600",...Array(6).fill("R2_45R"),
    "S600",...Array(6).fill("R2_45L")])
});
