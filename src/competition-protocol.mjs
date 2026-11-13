// SlotRace · contrato V1 para competiciones futuras. No habilita servicios online.
// Los mensajes del cliente son INTENCIONES, nunca estados de carrera oficiales.
// El servidor aún no existe y debe validar identidad, reglas, replay y reloj.
export const COMPETITION_PROTOCOL = 1;
export const COMPETITION_FORMATS = Object.freeze(["async_time_trial", "live_duel"]);
export const CLIENT_INTENTS = Object.freeze(["ready", "throttle", "pause_request", "rejoin_request"]);
const REQUIRED_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const HEX256 = /^[a-f0-9]{64}$/i;
const validId = value => typeof value === "string" && REQUIRED_ID.test(value);
const requireId = (value, name) => {if (!validId(value)) throw Error(name + " inválido"); return value;};
const requireInteger = (value, min, max, name) => {
  if (!Number.isInteger(value) || value < min || value > max) throw Error(name + " inválido");
  return value;
};
const seal = value => Object.freeze(value);

// Una definición publicada será inmutable en el backend. Si cambian física,
// trazado o reglas, el organizador debe crear una revisión de competición.
export function defineCompetition({
  competitionId, format = "async_time_trial", circuitId, circuitRevision,
  circuitFingerprint, physicsVersion, timingVersion = "monotonic-v3",
  mode = "lap_race", targetLaps = 5
}) {
  requireId(competitionId, "Competición");
  if (!COMPETITION_FORMATS.includes(format)) throw Error("Formato inválido");
  requireId(circuitId, "Circuito");
  requireId(circuitRevision, "Revisión del circuito");
  if (typeof circuitFingerprint !== "string" || !HEX256.test(circuitFingerprint))
    throw Error("Huella SHA-256 del circuito inválida");
  requireId(physicsVersion, "Versión de físicas");
  requireId(timingVersion, "Versión de cronometraje");
  if (!(["lap_race", "qualifying"].includes(mode))) throw Error("Modalidad inválida");
  if (mode === "lap_race") requireInteger(targetLaps, 1, 100, "Número de vueltas");
  else if (targetLaps !== null) throw Error("Clasificación sin número de vueltas objetivo");
  return seal({protocol: COMPETITION_PROTOCOL, competitionId, format,
    circuit: seal({id: circuitId, revision: circuitRevision, fingerprint: circuitFingerprint.toLowerCase()}),
    rules: seal({physicsVersion, timingVersion, mode, targetLaps})});
}

// En SlotRace el trazado actual tiene dos carriles: 2 pilotos como máximo por duelo.
// A se define sobre la pieza física de salida/meta, NO sobre la vista de cámara.
export function planLiveDuel(competition, pilotA, pilotB) {
  if (competition?.protocol !== COMPETITION_PROTOCOL || competition.format !== "live_duel")
    throw Error("La competición no admite un duelo en directo");
  requireId(pilotA, "Piloto A"); requireId(pilotB, "Piloto B");
  if (pilotA === pilotB) throw Error("Los pilotos deben ser diferentes");
  return seal([
    seal({heat: 1, laneA: pilotA, laneB: pilotB}),
    seal({heat: 2, laneA: pilotB, laneB: pilotA})
  ]);
}

// Mensajes que el cliente PODRÁ enviar cuando exista transporte de red.
// No permitir vueltas, cronómetros, posiciones, monedas o victorias declaradas
// desde el dispositivo. El servidor asignará orden y aplicará las reglas.
export function createClientIntent(competition, {sessionId, driverId, sequence, type, value = null}) {
  if (competition?.protocol !== COMPETITION_PROTOCOL || competition.format !== "live_duel")
    throw Error("No existe partida en directo para este protocolo");
  requireId(sessionId, "Sesión"); requireId(driverId, "Piloto");
  requireInteger(sequence, 1, Number.MAX_SAFE_INTEGER, "Secuencia");
  if (!CLIENT_INTENTS.includes(type)) throw Error("Intención no permitida");
  if (type === "throttle") requireInteger(value, 0, 100, "Acelerador");
  else if (value !== null) throw Error("Esta intención no admite carga de datos");
  return seal({protocol: COMPETITION_PROTOCOL,
    competitionId: competition.competitionId, sessionId, driverId, sequence,
    type, value});
}

// Un sobre de prueba para la FUTURA subida de un acta al servidor.
// La identidad es solo una afirmación del cliente: el backend deberá obtener
// auth.uid() de un token verificado y comparar con el usuario presentado.
// La etiqueta nunca cambia a 'verified' desde esta función.
export function prepareLocalSubmission(competition, timingSession, {driverId, attemptId}) {
  if (competition?.protocol !== COMPETITION_PROTOCOL || competition.format !== "async_time_trial")
    throw Error("Esta competición no admite tiempos asíncronos");
  requireId(driverId, "Piloto"); requireId(attemptId, "Intento");
  if (!timingSession || timingSession.source !== "local-unverified" ||
    timingSession.eventId !== competition.competitionId ||
    timingSession.driverId !== driverId ||
    timingSession.circuitId !== competition.circuit.id ||
    timingSession.physicsVersion !== competition.rules.physicsVersion ||
    timingSession.mode !== competition.rules.mode ||
    timingSession.status !== "finished" ||
    (competition.rules.mode === "lap_race" &&
      timingSession.targetLaps !== competition.rules.targetLaps))
    throw Error("El acta no corresponde a la competición");
  if (!Array.isArray(timingSession.laps) || !Array.isArray(timingSession.crossings) ||
      !Array.isArray(timingSession.flags) || !Number.isFinite(timingSession.elapsedMs) ||
      timingSession.elapsedMs < 0)
    throw Error("Acta local incompleta");
  // Los datos del dispositivo, incluso sin incidencias, NO acreditan nada.
  // Snapshot sin referencias mutables al objeto que conserva la PWA.
  const report = JSON.parse(JSON.stringify({
    schema: timingSession.schema, sessionId: timingSession.sessionId,
    elapsedMs: timingSession.elapsedMs, laps: timingSession.laps,
    crossings: timingSession.crossings, flags: timingSession.flags,
    revision: timingSession.revision
  }));
  return {protocol: COMPETITION_PROTOCOL, competitionId: competition.competitionId,
    circuit: {...competition.circuit}, rules: {...competition.rules},
    claimedDriverId: driverId, attemptId, report,
    verification: "pending-server-validation", official: false};
}
