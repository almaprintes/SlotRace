// SlotRace · adaptador autoritativo experimental para la física v4 real.
// Importa las MISMAS ecuaciones puras que el navegador (src/physics-v4.mjs).
// Aún NO implementa coches en X350/colisiones: rechaza esos circuitos.
// El reloj y la admisión de entradas pertenecen a server/referee-core.mjs.
import {positionAt,finishInteriorPhysicalLane,LANE_OFFSET,CATALOG} from "../src/track.mjs";
import {PHYSICS_VERSION,DRIVE,advanceSpeedV4,advanceRearV4,curveStressEnvelope} from "../src/physics-v4.mjs";
import {canonicalCompetitionTrack} from "./track-identity.mjs";
import {chooseAiThrottleOnTrackV4} from "../src/ai-driver.mjs";
import {buildCurveSpanIndex,curvePhaseForCar} from "../src/curve-phase.mjs";

export const FIXED_STEP_MS=10;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function initialCar(physicalLane,logicalLane){
 return {physicalLane,logicalLane,distance:0,speed:0,penaltyMs:0,
  rearSlip:0,rearSlipVelocity:0,rearStress:0,drift:0,
  cornerDistance:0,cornerDirection:0,deslots:0};
}
function drivingPose(lane,distance,direction){
 const p=positionAt(lane,direction===-1?-distance:distance);
 return !p||direction===1?p:{...p,h:p.h+Math.PI,curve:-(p.curve||0)};
}
export function createSharedPhysicsEngineFactory(recipe,{carByPilot={},cpuPilots=[]}={}){
 if(!Array.isArray(cpuPilots)||cpuPilots.some(p=>typeof p!=="string")||
    new Set(cpuPilots).size!==cpuPilots.length)
   throw Error("Lista de pilotos CPU inválida");
 const {track,canonical,fingerprint}=canonicalCompetitionTrack(recipe);
 // La X350 requiere resolver eventos simultáneos y colisiones con reglas
 // comprobadas: no admitirla a medias en competiciones experimentales.
 if(track.laneChangerIndex>=0)
   throw Error("PT/82 no admitida aún por el árbitro compartido");
 const direction=canonical.driveDirection;
 const physicalA=finishInteriorPhysicalLane(canonical.types);
 const curveSpans=track.lanes.map(lane=>buildCurveSpanIndex(track.types,lane,CATALOG));
 const factory=({competition,assignment=null,pilot=null,stepMs=FIXED_STEP_MS})=>{
   if(competition?.circuit?.fingerprint!==fingerprint||
     competition?.rules?.physicsVersion!==PHYSICS_VERSION)
     throw Error("Circuito o físicas distintos a la receta canónica del servidor");
   if(stepMs!==FIXED_STEP_MS)throw Error("El árbitro exige ticks fijos de 10 ms");
   const participants=assignment?
     [assignment.laneA,assignment.laneB].filter(Boolean):[pilot].filter(Boolean);
   if(participants.length<1||participants.length>2||new Set(participants).size!==participants.length)
     throw Error("Pilotos o asignación inválidos");
   const cpu=new Set(cpuPilots);
   if(cpuPilots.some(id=>!participants.includes(id)))
     throw Error("Piloto CPU fuera de carrera");
   const cars=new Map();
   for(const id of participants){
     const physical=assignment?.laneB===id?1-physicalA:physicalA;
     const logical=direction===-1?1-physical:physical;
     const car=carByPilot[id]||"gripline";
     if(!["gripline","spark"].includes(car))throw Error("Coche competitivo desconocido");
     cars.set(id,{...initialCar(physical,logical),carId:car});
   }
   let lastTick=0;
   return {
     physicsVersion:PHYSICS_VERSION,circuitFingerprint:fingerprint,
     step({tick,dtMs,controls,finishedPilots=[]}){
       if(!Number.isSafeInteger(tick)||tick!==lastTick+1||dtMs!==FIXED_STEP_MS)
         throw Error("Tick del servidor incorrecto");
       if(!controls||typeof controls!=="object"||Array.isArray(controls)||
         !Array.isArray(finishedPilots)||finishedPilots.some(id=>!cars.has(id)))
         throw Error("Controles malformados");
       for(const id of Object.keys(controls)){
         if(!cars.has(id)||cpu.has(id)||!Number.isInteger(controls[id])||controls[id]<0||
            controls[id]>100)throw Error("Entrada de acelerador inválida o CPU protegido");
       }
       lastTick=tick;
       // Planificar controles CPU desde un único estado anterior al tick.
       // El orden de actualización de coches no debe alterar decisiones IA.
       const aiControls=new Map();
       for(const [id,s] of cars){
         if(!cpu.has(id)||finishedPilots.includes(id))continue;
         const front=[...cars].filter(([otherId,other])=>otherId!==id&&
           !finishedPilots.includes(otherId)&&other.physicalLane===s.physicalLane)
           .map(([,other])=>({physicalLane:other.physicalLane,distance:other.distance,
             speed:other.speed,deslot:other.penaltyMs>0}))[0]??null;
         aiControls.set(id,chooseAiThrottleOnTrackV4({track,
           physicalLane:s.physicalLane,distance:s.distance,speed:s.speed,
           direction,frontCar:front}));
       }
       const crossings=[];
       for(const [id,s] of cars){
         if(finishedPilots.includes(id))continue;
         const gas=(cpu.has(id)?aiControls.get(id):(controls[id]||0))/100,
           dtSec=FIXED_STEP_MS/1000;
         if(s.penaltyMs>0){
           s.penaltyMs=Math.max(0,s.penaltyMs-FIXED_STEP_MS);
           continue;
         }
         s.speed=advanceSpeedV4(s.speed,gas,dtSec);
         const lane=track.lanes[s.physicalLane];
         const p=drivingPose(lane,s.distance,direction);
         if(!p)throw Error("Pose de coche inválida");
         const travel=s.speed*dtSec;
         if(p.curve){
           if(s.cornerDirection!==p.curve){
             s.cornerDirection=p.curve;s.cornerDistance=0;
           }
           s.cornerDistance+=travel;
         }else {s.cornerDistance=0;s.cornerDirection=0;}
         const phase=curvePhaseForCar(p,lane,curveSpans[s.physicalLane],s.distance,direction).progress;
         const rear=advanceRearV4({carId:s.carId,speedMmS:s.speed,
           rearSlipMm:s.rearSlip,rearSlipVelocityMmS:s.rearSlipVelocity,
           pose:p,logicalLane:s.logicalLane,curveProgress:phase,dtSec,
           laneOffset:LANE_OFFSET});
         s.rearSlip=rear.slipMm;s.rearSlipVelocity=rear.slipVelocityMmS;
         s.rearStress=rear.effectiveExcess;s.drift=rear.drift;
         if(p.curve&&phase>=.5&&s.cornerDistance>=DRIVE.minCurveDistance&&rear.deslot){
           s.penaltyMs=3000;s.speed=0;s.rearSlip=0;s.rearSlipVelocity=0;
           s.rearStress=0;s.drift=0;s.deslots++;continue;
         }
         const left=lane.total-s.distance;
         if(travel>=left&&travel>0){
           // Fracción del tick que ha tardado en tocar meta, calculada por
           // geometría del motor. El cliente nunca suministra la fracción.
           crossings.push({driverId:id,fraction:clamp(left/travel,0,1)});
         }
         s.distance=(s.distance+travel)%lane.total;
       }
       return {crossings};
     },
     // Solo para pruebas locales del árbitro; NUNCA enviar esta vista al cliente.
     inspect:()=>JSON.parse(JSON.stringify(Object.fromEntries(cars))),
     cpuDrivers:()=>[...cpu]
   };
 };
 return {engineFactory:factory,circuitFingerprint:fingerprint,canonical};
}
