"use strict";
const assert = require("node:assert/strict");
(async () => {
  const {defineCompetition, planLiveDuel, createClientIntent,
    prepareLocalSubmission} = await import("../src/competition-protocol.mjs");
  const base = {competitionId: "canarias-cup-01", circuitId: "monaco-slot",
    circuitRevision: "rev-3", circuitFingerprint: "a".repeat(64),
    physicsVersion: "slot-physics-v1", mode: "lap_race", targetLaps: 5};
  const live = defineCompetition({...base, format: "live_duel"});
  const twoHeats = planLiveDuel(live, "piloto-1", "piloto-2");
  assert.deepEqual(twoHeats.map(h => [h.laneA, h.laneB]),
    [["piloto-1", "piloto-2"], ["piloto-2", "piloto-1"]]);
  assert.ok(Object.isFrozen(twoHeats));
  assert.throws(() => planLiveDuel(live, "piloto-1", "piloto-1"), /diferentes/);
  const throttle = createClientIntent(live, {sessionId: "session-1", driverId: "piloto-1",
    sequence: 1, type: "throttle", value: 37});
  assert.equal(throttle.value, 37);
  assert.throws(() => createClientIntent(live, {sessionId: "s", driverId: "p",
    sequence: 1, type: "finish_lap", value: 2.1}), /no permitida/);
  assert.throws(() => createClientIntent(live, {sessionId: "s", driverId: "p",
    sequence: 1, type: "throttle", value: 101}), /Acelerador/);
  assert.throws(() => createClientIntent(live, {sessionId: "s", driverId: "p",
    sequence: 0, type: "ready"}), /Secuencia/);
  assert.throws(() => createClientIntent(live, {sessionId: "s", driverId: "p",
    sequence: 1, type: "ready", value: {position: 1}}), /carga/);
  const asyncEvent = defineCompetition({...base, format: "async_time_trial"});
  const timingSession = {schema: 1, sessionId: "a-01", eventId: "canarias-cup-01",
    driverId: "piloto-1", circuitId: "monaco-slot", physicsVersion: "slot-physics-v1",
    mode: "lap_race", targetLaps: 5, source: "local-unverified", status: "finished",
    elapsedMs: 21000, revision: 7, laps: [{number: 1, lapMs: 4200}],
    crossings: [{number: 1, accepted: true}], flags: []};
  const submission = prepareLocalSubmission(asyncEvent, timingSession,
    {driverId: "piloto-1", attemptId: "attempt-01"});
  assert.equal(submission.verification, "pending-server-validation");
  assert.equal(submission.official, false);
  assert.equal(submission.rules.timingVersion, "monotonic-v3");
  timingSession.laps[0].lapMs = 1;
  assert.equal(submission.report.laps[0].lapMs, 4200, "La prueba no muta el acta original");
  assert.throws(() => prepareLocalSubmission(asyncEvent,
    {...timingSession, driverId: "otro"}, {driverId: "piloto-1", attemptId: "attempt-02"}),
    /no corresponde/);
  assert.throws(() => prepareLocalSubmission(asyncEvent,
    {...timingSession, status: "running"}, {driverId: "piloto-1", attemptId: "attempt-03"}),
    /no corresponde/);
  assert.throws(() => prepareLocalSubmission(asyncEvent,
    {...timingSession, physicsVersion: "otra-version"},
    {driverId: "piloto-1", attemptId: "attempt-04"}), /no corresponde/);
  assert.throws(() => defineCompetition({...base, circuitFingerprint: "not-a-hash"}), /SHA-256/);
  assert.throws(() => defineCompetition({...base, targetLaps: 0}), /vueltas/);
  assert.throws(() => defineCompetition({...base, mode: "qualifying", targetLaps: 5}), /sin número/);
  assert.throws(() => planLiveDuel(asyncEvent, "piloto-1", "piloto-2"), /no admite/);
  console.log("SlotRace: contrato competitivo, mangas, intenciones y actas no homologadas OK");
})().catch(e => {console.error(e); process.exitCode = 1;});
