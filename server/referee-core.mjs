// SlotRace · árbitro independiente (fase de laboratorio).
// NO importar este módulo desde la PWA: se ejecutará solo en un proceso servidor.
// No habilita carreras oficiales: el motor físico compartido aún no es
// equivalente a todas las funciones de la PWA ni acredita la procedencia.
import {COMPETITION_PROTOCOL, planLiveDuel, CLIENT_INTENTS} from "../src/competition-protocol.mjs";

export const REFEREE_SCHEMA = 1;
const idOk = v => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(v);
const positiveInt = v => Number.isSafeInteger(v) && v > 0;
const finiteInt = v => Number.isSafeInteger(v) && v >= 0;
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const snapshot = value => JSON.parse(JSON.stringify(value));
const deny = reason => ({accepted:false,reason});
function ensure(predicate, message) {if (!predicate) throw Error(message);}
function keysExactly(obj, allowed) {
  return obj && typeof obj === "object" && !Array.isArray(obj) &&
    Object.keys(obj).every(k => allowed.includes(k));
}
function assertEngine(engine, competition) {
  ensure(engine && typeof engine.step === "function", "Motor servidor no disponible");
  ensure(engine.physicsVersion === competition.rules.physicsVersion,
    "Las físicas del árbitro no coinciden con el reglamento");
  ensure(engine.circuitFingerprint === competition.circuit.fingerprint,
    "La geometría del servidor no coincide con el reglamento");
}
function validateCompetition(competition, format) {
  ensure(competition?.protocol === COMPETITION_PROTOCOL &&
    competition.format === format && competition.rules?.mode === "lap_race" &&
    positiveInt(competition.rules.targetLaps), "Competición incompatible");
  ensure(idOk(competition.competitionId) && idOk(competition.circuit?.id) &&
    idOk(competition.rules.physicsVersion), "Identidad de competición inválida");
}
// El servidor calcula y observa cruces. Un cliente NUNCA transmite "crossings".
function serverCrossings(frame, pilots) {
  ensure(keysExactly(frame, ["crossings"]) && Array.isArray(frame.crossings),
    "Respuesta del motor inválida");
  const unique = new Set();
  return frame.crossings.map(event=>{
    // Compatibilidad con motores antiguos: string significa final de tick.
    const candidate=typeof event==="string"?{driverId:event,fraction:1}:event;
    ensure(keysExactly(candidate,["driverId","fraction"])&&
      Object.hasOwn(candidate,"driverId")&&Object.hasOwn(candidate,"fraction")&&
      pilots.includes(candidate.driverId)&&!unique.has(candidate.driverId)&&
      typeof candidate.fraction==="number"&&Number.isFinite(candidate.fraction)&&
      candidate.fraction>=0&&candidate.fraction<=1,
      "Cruce de motor inválido o duplicado");
    unique.add(candidate.driverId);
    return candidate;
  });
}
export function createServerReferee({
  competition, sessionId, pilotA, pilotB, engineFactory,
  stepMs = 20, minLapMs = 20, maxTicksPerHeat = 100000
}) {
  validateCompetition(competition, "live_duel");
  ensure(idOk(sessionId) && typeof engineFactory === "function", "Sesión o motor inválidos");
  ensure(positiveInt(stepMs) && positiveInt(minLapMs) &&
    positiveInt(maxTicksPerHeat), "Parámetros del servidor inválidos");
  const heats = planLiveDuel(competition, pilotA, pilotB);
  const pilots = [pilotA, pilotB];
  const sequences = new Map(pilots.map(p => [p, 0]));
  const controls = new Map(pilots.map(p => [p, 0]));
  const audit = [];
  let heat = 1, tick = 0, phase = "waiting-ready";
  let ready = new Set(), results = [], laps = Object.fromEntries(pilots.map(p => [p, []]));
  let engine = null;
  function loadEngine() {
    engine = engineFactory({
      competition: snapshot(competition), sessionId, heat,
      assignment: snapshot(heats[heat - 1]), pilots: [...pilots],
      stepMs
    });
    assertEngine(engine, competition);
  }
  function record(event) {audit.push({ordinal:audit.length + 1,heat,tick,...event});}
  loadEngine();
  function view() {
    const assignment = heats[heat - 1];
    return snapshot({
      schema: REFEREE_SCHEMA, sessionId, competitionId: competition.competitionId,
      status: phase, heat, tick, elapsedMs: tick * stepMs,
      assignment, ready:[...ready], laps, completedHeats:results,
      official:false, verification:"laboratory-unverified"
    });
  }
  function ingest(authenticatedDriverId, packet) {
    // authenticatedDriverId MUST come from a verified Supabase token on a
    // trusted API endpoint. Never read it from packet or user_metadata.
    ensure(pilots.includes(authenticatedDriverId), "Piloto no autorizado");
    ensure(keysExactly(packet, ["protocol","competitionId","sessionId","driverId",
      "sequence","type","value"]) &&
      packet.protocol === COMPETITION_PROTOCOL &&
      packet.competitionId === competition.competitionId &&
      packet.sessionId === sessionId && packet.driverId === authenticatedDriverId &&
      CLIENT_INTENTS.includes(packet.type) &&
      positiveInt(packet.sequence), "Solicitud manipulada o incompatible");
    if (packet.sequence <= sequences.get(authenticatedDriverId))
      return deny("duplicate-or-out-of-order");
    if (packet.type === "pause_request")
      return deny("competitive-pause-not-allowed");
    if (packet.type === "throttle" && (!finiteInt(packet.value) || packet.value > 100))
      throw Error("Acelerador fuera de rango");
    if (packet.type !== "throttle" && packet.value !== null)
      throw Error("Datos no permitidos");
    if (packet.type === "ready" && phase !== "waiting-ready")return deny("not-awaiting-ready");
    if (packet.type === "throttle" && phase !== "running")return deny("not-running");
    sequences.set(authenticatedDriverId, packet.sequence);
    if (packet.type === "ready") {
      ready.add(authenticatedDriverId);
      record({kind:"ready",driverId:authenticatedDriverId});
      if (ready.size === 2) {phase = "running";record({kind:"heat-start"});}
    } else if (packet.type === "throttle") {
      controls.set(authenticatedDriverId, packet.value);
      record({kind:"throttle",driverId:authenticatedDriverId,value:packet.value});
    } else if (packet.type === "rejoin_request") {
      record({kind:"rejoin",driverId:authenticatedDriverId});
    }
    return {accepted:true,status:phase,serverTick:tick};
  }
  function step() {
    // Solo un scheduler de confianza puede invocarlo. El número de ticks
    // nunca proviene de la PWA ni de timestamps declarados por el jugador.
    if (phase !== "running") return deny("heat-not-running");
    if (tick >= maxTicksPerHeat) {
      phase = "needs-review";record({kind:"timeout"});
      return deny("heat-timeout");
    }
    ++tick;
    const finishedPilots=pilots.filter(p=>laps[p].length>=competition.rules.targetLaps);
    const before = Object.fromEntries(pilots.map(p=>[p,finishedPilots.includes(p)?0:controls.get(p)]));
    let events;
    try {
      events = serverCrossings(engine.step({
        tick, dtMs:stepMs, controls:snapshot(before),
        assignment:snapshot(heats[heat - 1]),finishedPilots:[...finishedPilots]
      }),pilots);
      for (const {driverId,fraction} of events) {
        // Nunca permitir una vuelta extra después de completar la manga.
        ensure(laps[driverId].length < competition.rules.targetLaps,
          "Cruce tras finalizar la manga");
        const elapsedMs = Math.round(((tick-1+fraction)*stepMs)*1000)/1000;
        const previous = laps[driverId].at(-1)?.finishElapsedMs ?? 0;
        ensure(elapsedMs - previous >= minLapMs, "Vuelta físicamente imposible");
        const lane = heats[heat - 1].laneA === driverId ? "A" : "B";
        laps[driverId].push({number:laps[driverId].length + 1, lane,
          lapMs:elapsedMs - previous, finishElapsedMs:elapsedMs});
        if(laps[driverId].length===competition.rules.targetLaps)controls.set(driverId,0);
        record({kind:"server-crossing",driverId,lane});
      }
    } catch(error) {
      phase="needs-review";
      record({kind:"engine-invalid", reason:String(error?.message||error)});
      return deny("engine-validation-failed");
    }
    if (pilots.every(p=>laps[p].length===competition.rules.targetLaps)) {
      results.push(snapshot({heat,assignment:heats[heat - 1],
        times:Object.fromEntries(pilots.map(p=>[p,laps[p].at(-1).finishElapsedMs])),
        laps}));
      phase=heat===2 ? "completed-pending-certification" : "heat-complete";
      controls.forEach((_,p)=>controls.set(p,0));
      record({kind:"heat-complete"});
    }
    return {accepted:true,status:phase,serverTick:tick};
  }
  function nextHeat() {
    ensure(phase === "heat-complete" && heat === 1, "La primera manga no ha terminado");
    heat = 2;tick = 0;ready = new Set();
    laps = Object.fromEntries(pilots.map(p=>[p,[]]));
    phase="waiting-ready";loadEngine();
    record({kind:"heat-swap",assignment:heats[1]});
    return view();
  }
  function provisionalClassification() {
    if (phase !== "completed-pending-certification")
      return {ready:false,official:false,verification:"laboratory-unverified"};
    const totals = pilots.map(driverId=>({
      driverId, totalMs:results.reduce((total,part)=>total+part.times[driverId],0),
      laneAHeats:results.filter(part=>part.assignment.laneA===driverId).length,
      laneBHeats:results.filter(part=>part.assignment.laneB===driverId).length
    }));
    totals.sort((a,b)=>a.totalMs-b.totalMs||a.driverId.localeCompare(b.driverId));
    let lastTime=null,lastPosition=0;
    const classification=totals.map((p,i)=>{
      if(p.totalMs!==lastTime){lastTime=p.totalMs;lastPosition=i+1;}
      return {...p,position:lastPosition};
    });
    return {ready:true,official:false,verification:"laboratory-unverified",classification};
  }
  return Object.freeze({ingest,step,nextHeat,view,provisionalClassification,
    audit:()=>snapshot(audit)});
}

// Reproducción de entrada asíncrona sobre un motor construido EN EL SERVIDOR.
// La coincidencia no basta para homologar: no prueba quién pulsó el gatillo.
export function replayAsyncAttempt({
  competition, authenticatedDriverId, attempt, engineFactory,
  stepMs=20, minLapMs=20, maxTicks=100000
}) {
  validateCompetition(competition,"async_time_trial");
  ensure(idOk(authenticatedDriverId) && typeof engineFactory==="function",
    "Piloto/motor inválido");
  ensure(positiveInt(stepMs)&&positiveInt(minLapMs)&&positiveInt(maxTicks),
    "Límites de reproducción inválidos");
  ensure(keysExactly(attempt,["attemptId","claimedDriverId","competitionId","inputs","claimedLapTimes"]) &&
    idOk(attempt.attemptId) &&
    attempt.claimedDriverId===authenticatedDriverId &&
    attempt.competitionId===competition.competitionId &&
    Array.isArray(attempt.inputs) && attempt.inputs.length>0 &&
    attempt.inputs.length<=maxTicks, "Intento malformado o ajeno");
  ensure(Array.isArray(attempt.claimedLapTimes) &&
    attempt.claimedLapTimes.length===competition.rules.targetLaps &&
    attempt.claimedLapTimes.every(n=>typeof n==="number"&&Number.isFinite(n)&&n>0),
    "Vueltas declaradas inválidas");
  const engine = engineFactory({competition:snapshot(competition),
    pilot:authenticatedDriverId, stepMs});
  assertEngine(engine,competition);
  const lapTimes=[],serverFinishTimes=[];
  let previous=0;
  for(let i=0;i<attempt.inputs.length;i++) {
    const frame=attempt.inputs[i];
    ensure(keysExactly(frame,["tick","throttle"]) && frame.tick===i+1 &&
      finiteInt(frame.throttle)&&frame.throttle<=100,
      "Secuencia de entradas imposible o manipulada");
    const crossings=serverCrossings(engine.step({
      tick:i+1,dtMs:stepMs,controls:{[authenticatedDriverId]:frame.throttle},
      assignment:{laneA:authenticatedDriverId,laneB:null}
    }),[authenticatedDriverId]);
    for(const {driverId,fraction} of crossings) {
      ensure(lapTimes.length<competition.rules.targetLaps,"Exceso de vueltas");
      const finish=Math.round(((i+fraction)*stepMs)*1000)/1000;
      ensure(finish-previous>=minLapMs,"Vuelta físicamente imposible");
      lapTimes.push(finish-previous);serverFinishTimes.push(finish);
      previous=finish;
    }
  }
  const same=lapTimes.length===competition.rules.targetLaps &&
    lapTimes.every((value,i)=>value===attempt.claimedLapTimes[i]);
  return snapshot({
    attemptId:attempt.attemptId,competitionId:competition.competitionId,
    claimedDriverId:authenticatedDriverId,physicsVersion:competition.rules.physicsVersion,
    status:same?"physics-replay-matches":"rejected-replay-mismatch",
    reason:same?"requires-provenance-and-anti-bot-audit":"client-times-do-not-match-server",
    measuredLapTimes:lapTimes,measuredFinishTimes:serverFinishTimes,
    official:false,rewardEligible:false
  });
}
