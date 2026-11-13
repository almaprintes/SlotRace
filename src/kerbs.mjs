// Pianos de curva puramente visuales: ni el trazado ni la física cambian.
// La salida son polígonos en mm mundiales para reutilizar en Canvas 2D.
import {CATALOG,TRACK_WIDTH} from "./track.mjs?v=0.15.67";

export const KERB_STYLE=Object.freeze({
 stripeLength:30,
 innerOffset:TRACK_WIDTH/2-17,
 outerOffset:TRACK_WIDTH/2-4,
 red:"#db403b",
 white:"#f6f0e4"
});

const TINY=1e-7;
function sample(part,t){
 const points=part?.points||[];
 if(points.length<2)throw Error("Los pianos necesitan los puntos del tramo");
 const count=points.length-1;
 const scaled=Math.max(0,Math.min(1,t))*count;
 const i=Math.min(count-1,Math.floor(scaled));
 const f=scaled-i,a=points[i],b=points[i+1];
 return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,
  h:a.h+(b.h-a.h)*f};
}
function offset(p,d){
 return{x:p.x-Math.sin(p.h)*d,y:p.y+Math.cos(p.h)*d};
}
function band(part,from,to,side){
 const a=sample(part,from),b=sample(part,to);
 return[
  offset(a,side*KERB_STYLE.innerOffset),
  offset(a,side*KERB_STYLE.outerOffset),
  offset(b,side*KERB_STYLE.outerOffset),
  offset(b,side*KERB_STYLE.innerOffset)
 ];
}

// Fase continua a través de curvas consecutivas de igual sentido.
// No se reinicia el rojo/blanco en cada conector: se evitan costuras.
// Las rectas y los cambios de sentido separan los grupos de pianos.
export function buildCurveKerbs(parts){
 const kerbs={red:[],white:[]};
 let runDistance=0,lastTurn=0;
 for(const part of parts||[]){
  const spec=CATALOG[part?.id];
  if(!spec?.angle||!spec?.radius){runDistance=0;lastTurn=0;continue;}
  const turn=Math.sign(spec.angle);
  if(turn!==lastTurn)runDistance=0;
  lastTurn=turn;
  const length=spec.radius*Math.abs(spec.angle);
  let s=0;
  while(s<length-TINY){
   const stripe=Math.floor((runDistance+s+TINY)/KERB_STYLE.stripeLength);
   const next=Math.min(length,(stripe+1)*KERB_STYLE.stripeLength-runDistance);
   if(next-s<TINY)break;
   const target=stripe%2===0?kerbs.red:kerbs.white;
   for(const side of [-1,1])target.push({
    partIndex:part.index,
    points:band(part,s/length,next/length,side)
   });
   s=next;
  }
  runDistance+=length;
 }
 return kerbs;
}

export function selectCurveKerbs(kerbs,partIndices){
 const included=partIndices instanceof Set?partIndices:new Set(partIndices||[]);
 return{
  red:kerbs.red.filter(p=>included.has(p.partIndex)),
  white:kerbs.white.filter(p=>included.has(p.partIndex))
 };
}
