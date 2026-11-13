// AI is a DRIVER, not a physics shortcut. It only chooses throttle.
// The same rear-physics-v4 movement runs for human, CPU and server pilots.
import {DRIVE} from "./physics-v4.mjs";
import {followTarget} from "./rear-contact.mjs";
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
