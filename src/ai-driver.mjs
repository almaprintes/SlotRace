// AI is a DRIVER, not a physics shortcut. It only chooses throttle.
// The same rear-physics-v4 movement runs for human, CPU and server pilots.
import {DRIVE} from "./physics-v4.mjs";
import {positionAt} from "./track.mjs";
import {followTarget,forwardGap} from "./rear-contact.mjs";
export const AI_DRIVER_VERSION="ai-throttle-v1";
export const AI_CRUISE=0.74,AI_CURVE=0.42;
export function chooseAiThrottleV4({pose,nextPose=null,gap=Infinity,frontSpeed=0,
  frontPresent=false}={}){
 let targetSpeed=DRIVE.topSpeed*
  (pose?.curve||nextPose?.curve?AI_CURVE:AI_CRUISE);
 if(frontPresent){
  if(!Number.isFinite(frontSpeed)||frontSpeed<0)
   throw Error("Velocidad del coche precedente inválida");
  targetSpeed=followTarget(gap,frontSpeed,targetSpeed);
 }
 // 1% throttle resolution, as on the player's touch dial.
 return Math.min(100,Math.max(0,Math.round(100*targetSpeed/DRIVE.topSpeed)));
}

// Reusable decision wrapper. Both server CPU and local IA observe an identical
// real track pose, lookahead and nearby car. NO velocity is written here.
export function chooseAiThrottleOnTrackV4({
 track,physicalLane,distance,speed,direction=1,frontCar=null
}={}){
 if(!track?.valid||![0,1].includes(physicalLane)||
  !Number.isFinite(distance)||distance<0||
  !Number.isFinite(speed)||speed<0||![1,-1].includes(direction))
   throw Error("Estado del piloto IA inválido");
 const lane=track.lanes[physicalLane];
 const pose=positionAt(lane,direction===-1?-distance:distance);
 const ahead=distance+Math.max(250,speed*.65);
 const nextPose=positionAt(lane,direction===-1?-ahead:ahead);
 const sameLane=frontCar&&frontCar.physicalLane===physicalLane&&!frontCar.deslot;
 const gap=sameLane?forwardGap(distance,frontCar.distance,lane.total):Infinity;
 return chooseAiThrottleV4({pose,nextPose,gap,frontSpeed:sameLane?frontCar.speed:0,
  frontPresent:Boolean(sameLane)});
}
