// Animación del coche remoto: solo presentación, nunca cronometraje ni colisiones.
// Los paquetes llegan a ~10 Hz y con latencia variable; el canvas dibuja a su propio FPS.
export const ONLINE_RIVAL_MOTION=Object.freeze({
 delayMs:180,              // Pequeño colchón para interpolar paquetes tardíos.
 predictionMs:160,         // Predicción limitada si el siguiente paquete se retrasa.
 maxDrawSpeedMmS:1550,     // Corrección gradual: jamás teletransportar al rival.
 maxFrames:20
});
export function createOnlineRivalMotion(){
 return{frames:[],offsetMs:null,visualProgress:0,lastDrawMs:null};
}
export function receiveOnlineRivalMotion(motion,data,receivedMs,laneLength){
 if(!motion||!data||!(laneLength>0)||!Number.isFinite(receivedMs)||
  !Number.isFinite(data.distance)||data.distance<0||data.distance>=laneLength+2||
  !Number.isFinite(data.speed)||data.speed<0||
  !Number.isFinite(data.elapsed)||data.elapsed<0||
  !Number.isInteger(data.lap)||data.lap<0)return false;
 const timeMs=data.elapsed*1000;
 const progress=data.lap*laneLength+data.distance;
 const previous=motion.frames.at(-1);
 // En un carril real el avance es monótono; ignorar estados obsoletos.
 if(previous&&(timeMs<previous.timeMs-1||progress<previous.progress-2))return false;
 const frame={timeMs,progress,speed:Math.min(1250,data.speed),
  rearSlip:Number.isFinite(data.rearSlip)?data.rearSlip:0,
  deslotFor:Math.max(0,Number(data.deslotFor)||0),
  done:data.done===true,
  car:["spark","gripline"].includes(data.car)?data.car:null};
 if(previous&&Math.abs(timeMs-previous.timeMs)<.01)
  motion.frames[motion.frames.length-1]=frame;
 else motion.frames.push(frame);
 if(motion.frames.length>ONLINE_RIVAL_MOTION.maxFrames)
  motion.frames.splice(0,motion.frames.length-ONLINE_RIVAL_MOTION.maxFrames);
 // Usar el menor retardo observado evita que las oscilaciones de la red
 // se conviertan en cambios de velocidad en pantalla.
 const offset=receivedMs-timeMs;
 motion.offsetMs=motion.offsetMs===null?offset:Math.min(motion.offsetMs,offset);
 return true;
}
export function drawOnlineRivalMotion(motion,nowMs,laneLength){
 if(!motion?.frames?.length||!Number.isFinite(nowMs)||!(laneLength>0))return null;
 const frames=motion.frames;
 const timeMs=nowMs-motion.offsetMs-ONLINE_RIVAL_MOTION.delayMs;
 const first=frames[0],last=frames.at(-1);
 let desired=last.progress,from=last,to=last,blend=0;
 if(timeMs<=first.timeMs){
  // Antes de la primera muestra, acercarse suavemente desde la salida.
  desired=first.progress;
  if(first.timeMs>1&&first.progress<laneLength)
   desired=first.progress*Math.max(0,Math.min(1,timeMs/first.timeMs));
  from=to=first;
 }else if(timeMs<last.timeMs){
  for(let i=1;i<frames.length;i++){
   if(frames[i].timeMs>=timeMs){
    from=frames[i-1];to=frames[i];
    blend=Math.max(0,Math.min(1,
     (timeMs-from.timeMs)/Math.max(1,to.timeMs-from.timeMs)));
    desired=from.progress+(to.progress-from.progress)*blend;
    break;
   }
  }
 }else{
  const extra=Math.min(ONLINE_RIVAL_MOTION.predictionMs,Math.max(0,timeMs-last.timeMs));
  desired=last.progress+(last.done||last.deslotFor>0?0:last.speed*extra/1000);
 }
 // Visualización a FPS local: no usar el paso de paquetes como el paso de dibujo.
 if(motion.lastDrawMs!==null){
  const dt=Math.max(0,Math.min(.10,(nowMs-motion.lastDrawMs)/1000));
  const maxAdvance=ONLINE_RIVAL_MOTION.maxDrawSpeedMmS*dt;
  motion.visualProgress=Math.max(motion.visualProgress,
   Math.min(desired,motion.visualProgress+maxAdvance));
 }
 motion.lastDrawMs=nowMs;
 const slip=from.rearSlip+(to.rearSlip-from.rearSlip)*blend;
 const status=blend>=.5?to:from;
 return{distance:((motion.visualProgress%laneLength)+laneLength)%laneLength,
  rearSlip:slip,deslotFor:status.deslotFor,car:status.car,
  done:status.done};
}
