// SlotRace · rear-physics-v4: matemáticas puras, sin DOM, reloj ni aleatoriedad.
// Mismo módulo para navegador y árbitro de servidor; el motor de red debe
// aplicar pasos FIJOS y validar entradas fuera de este módulo.
// mm, mm/s, segundos; las cifras son parámetros originales de jugabilidad.
export const PHYSICS_VERSION = "rear-physics-v4";
export const DRIVE = Object.freeze({
 maxSpeed:1250,topSpeed:1150,gravity:9.81,
 lateralElasticity:.085,fullThrottleSlipAt:.975,
 fullThrottleLoad:90,minCurveDistance:65
});
export const VEHICLE_DYNAMICS = Object.freeze({
 gripline:Object.freeze({rearMassKg:.045,gripG:.97,springNPerM:3.6,
  damperNsPerM:.70,straightSpringNPerM:30,straightDamperNsPerM:.50,
  wheelbaseMM:65,guideYawLimit:.245}),
 spark:Object.freeze({rearMassKg:.045,gripG:.97,springNPerM:3.6,
  damperNsPerM:.70,straightSpringNPerM:30,straightDamperNsPerM:.50,
  wheelbaseMM:65,guideYawLimit:.245})
});
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const clamp01=x=>Math.max(0,Math.min(1,x));
export function advanceSpeedV4(speed,throttle,dtSec) {
 if(!finite(speed)||speed<0||!finite(throttle)||throttle<0||throttle>1||
   !finite(dtSec)||dtSec<0||dtSec>.1)throw Error("Entrada de aceleración inválida");
 const targetSpeed=throttle*DRIVE.topSpeed;
 const response=throttle>0?2.25:1.35;
 return Math.max(0,Math.min(DRIVE.maxSpeed,
   speed+(targetSpeed-speed)*(1-Math.exp(-response*dtSec))));
}
export function curveRadiusV4(p,logicalLane,laneOffset=37.5) {
 if(!p?.curve)return Infinity;
 if(![0,1].includes(logicalLane)||!finite(laneOffset))
   throw Error("Carril o separación inválida");
 const offset=logicalLane===0?-laneOffset:laneOffset;
 return Math.max(70,p.radius-offset*p.curve);
}
export function curveStressEnvelope(progress) {
 if(!finite(progress))throw Error("Progreso de curva inválido");
 const t=clamp01((progress-.08)/.62);
 return .08+.92*t*t*(3-2*t);
}
export function cornerForcesV4(p,logicalLane,speed,carId="gripline",laneOffset=37.5){
 if(!finite(speed)||speed<0)throw Error("Velocidad inválida");
 const car=VEHICLE_DYNAMICS[carId]||VEHICLE_DYNAMICS.gripline;
 const radiusMm=curveRadiusV4(p,logicalLane,laneOffset);
 const lateralAcceleration=Number.isFinite(radiusMm)?
   Math.max(0,speed*speed/radiusMm/1000):0;
 const gripAcceleration=car.gripG*DRIVE.gravity;
 return {radiusMm,lateralAcceleration,gripAcceleration,
   inertialForceN:car.rearMassKg*lateralAcceleration,
   gripForceN:car.rearMassKg*gripAcceleration};
}
// La integración reproduce la ecuación rear-physics-v4 del juego local.
// No modifica el estado recibido; expresa las variables que el renderizador usa.
export function advanceRearV4({
 carId="gripline",speedMmS,rearSlipMm,rearSlipVelocityMmS,
 pose,logicalLane,curveProgress,dtSec,laneOffset=37.5
}) {
 if(![speedMmS,rearSlipMm,rearSlipVelocityMmS,curveProgress,dtSec].every(finite)||
   speedMmS<0||dtSec<0||dtSec>.1)
   throw Error("Entrada de dinámica trasera inválida");
 const car=VEHICLE_DYNAMICS[carId]||VEHICLE_DYNAMICS.gripline;
 const forces=cornerForcesV4(pose,logicalLane,speedMmS,carId,laneOffset);
 const turn=pose?.curve||0;
 const count=Math.max(1,Math.ceil(Math.max(0,dtSec)/(1/120)));
 const step=Math.max(0,dtSec)/count;
 const envelope=turn?curveStressEnvelope(curveProgress):0;
 const excess=Math.max(0,forces.lateralAcceleration-forces.gripAcceleration);
 const elastic=DRIVE.lateralElasticity*Math.min(forces.lateralAcceleration,forces.gripAcceleration);
 const guideExcess=Math.max(0,speedMmS/DRIVE.topSpeed-
   DRIVE.fullThrottleSlipAt)*DRIVE.fullThrottleLoad*envelope;
 const effectiveExcess=excess*envelope+guideExcess;
 const outwardForce=turn*car.rearMassKg*
   (effectiveExcess+elastic*(.25+.75*envelope));
 const springRate=turn?car.springNPerM:car.straightSpringNPerM;
 const dampingRate=turn?car.damperNsPerM:car.straightDamperNsPerM;
 let slip=rearSlipMm,velocity=rearSlipVelocityMmS;
 for(let i=0;i<count;i++){
   const spring=springRate*slip/1000;
   const damper=dampingRate*velocity/1000;
   const acceleration=(outwardForce-spring-damper)/car.rearMassKg*1000;
   velocity+=acceleration*step;
   slip+=velocity*step;
   if(!turn&&Math.abs(slip)<.025&&Math.abs(velocity)<.3){
     slip=0;velocity=0;
   }
 }
 const limitMm=car.wheelbaseMM*Math.tan(car.guideYawLimit);
 const drift=Math.min(1,Math.abs(slip)/limitMm);
 return {...forces,phase:curveProgress,stressEnvelope:envelope,effectiveExcess,
   slipMm:slip,slipVelocityMmS:velocity,rearStress:effectiveExcess,
   drift,driftDirection:Math.abs(slip)>.1?Math.sign(slip):0,
   yawRad:Math.atan2(slip,car.wheelbaseMM),limitMm,
   deslot:Math.abs(slip)>=limitMm};
}
