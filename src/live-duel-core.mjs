// Piloto online aislado del cronometraje oficial y de las fisicas DEV.
import {STARTER,START,buildTrack,positionAt} from "./track.mjs?v=0.15.72";
export const LIVE_LAPS=3;
export const LIVE_TYPES=Object.freeze(STARTER.map((id,i)=>i===0?"START350":id));
export const LIVE_TRACK=buildTrack(LIVE_TYPES,START,[]);
export const LIVE_MAX_SPEED=2500;
export function laneFor(role,heat){return (role==="host"?0:1)^(heat===2?1:0);}
export function carPose(lane,distance){return positionAt(LIVE_TRACK.lanes[lane],distance);}
export function lapTotal(laps){return laps.length===LIVE_LAPS?laps.reduce((a,b)=>a+b,0):null;}
export function roomCode(bytes){
 const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
 return [...bytes].slice(0,7).map(byte=>alphabet[byte%alphabet.length]).join("");
}
export function makeCar(lane){
 return {lane,distance:0,speed:0,gas:0,lap:0,elapsed:0,lastLapAt:0,
  lapTimes:[],deslotFor:0,done:false};
}
export function advanceCar(car,dt){
 if(car.done||dt<=0)return car;
 const t=Math.min(.05,Math.max(0,dt));
 car.elapsed+=t;
 if(car.deslotFor>0){
  car.deslotFor=Math.max(0,car.deslotFor-t);
  car.speed=0;
  return car;
 }
 const pose=carPose(car.lane,car.distance);
 const target=car.gas*LIVE_MAX_SPEED;
 const response=car.gas>0?2.25:1.35;
 car.speed=Math.max(0,car.speed+(target-car.speed)*(1-Math.exp(-response*t)));
 if(Math.abs(pose?.curve||0)>0.0001&&car.speed>1350){
  car.deslotFor=2.5;car.speed=0;return car;
 }
 const total=LIVE_TRACK.lanes[car.lane].total;
 const before=Math.floor(car.distance/total);
 car.distance+=car.speed*t;
 const after=Math.floor(car.distance/total);
 if(after>before){
  const overflow=car.distance-after*total;
  const crossingSeconds=car.elapsed-(car.speed>0?overflow/car.speed:0);
  const lapSeconds=Math.max(.001,crossingSeconds-car.lastLapAt);
  car.lastLapAt=crossingSeconds;
  car.lap++;car.lapTimes.push(lapSeconds);
  if(car.lap>=LIVE_LAPS){car.done=true;car.gas=0;car.speed=0;car.distance=total*LIVE_LAPS;}
 }
 return car;
}
