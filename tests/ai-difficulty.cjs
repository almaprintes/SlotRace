"use strict";
// Pruebas de los perfiles reales del motor, sin duplicar sus fórmulas.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const source=fs.readFileSync("src/app.mjs","utf8");
const page=fs.readFileSync("index.html","utf8");
const start=source.indexOf("const aiTest={");
const end=source.indexOf("// Arranque y cambio de manga",start);
assert.ok(start>=0&&end>start,"Motor de dificultad IA disponible");
const isolated=source.slice(start,end);
const factory=new Function("state","positionAt","DRIVE","LANE_OFFSET","VEHICLE_DYNAMICS",
 isolated+"\nreturn {aiTest,AI_DIFFICULTIES,aiCruiseTarget};");
const state={driveDirection:1,selectedCar:"gripline"};
const DRIVE={topSpeed:1150,gravity:9.81,fullThrottleSlipAt:.975};
const VEHICLE_DYNAMICS={gripline:{gripG:.97}};
const lane={total:2000};
const trace=(unused,d)=>{
 const x=((d%2000)+2000)%2000;
 return x>=1000&&x<1250?{curve:1,radius:140}:{curve:0};
};
const engine=factory(state,trace,DRIVE,52,VEHICLE_DYNAMICS);
const {aiTest,AI_DIFFICULTIES,aiCruiseTarget}=engine;
assert.deepEqual(Object.keys(AI_DIFFICULTIES),["easy","medium","hard"]);
function speed(level,distance){
 aiTest.level=level;aiTest.distance=distance;aiTest.lane=0;
 return aiCruiseTarget(lane);
}
const cruise=["easy","medium","hard"].map(l=>speed(l,0));
assert.ok(cruise[0]<cruise[1]&&cruise[1]<cruise[2],"Las tres velocidades de recta están ordenadas");
assert.equal(cruise[0],DRIVE.topSpeed*.74,"El nivel fácil mantiene su velocidad original en rectas");
assert.equal(cruise[2],DRIVE.topSpeed,"La IA difícil respeta la velocidad máxima del coche");
const corner=["easy","medium","hard"].map(l=>speed(l,1100));
assert.ok(corner[0]<corner[1]&&corner[1]<corner[2],"Las curvas mantienen dificultad progresiva");
assert.equal(corner[0],DRIVE.topSpeed*.42,"La IA fácil conserva su curva original");
assert.ok(corner[2]<=DRIVE.topSpeed*.975,"La IA difícil no supera el límite de estabilidad");
assert.ok(speed("medium",920)<cruise[1],"La IA media frena antes de la curva");
assert.ok(speed("hard",920)<cruise[2],"La IA difícil anticipa la curva");
assert.ok(speed("hard",800)>speed("hard",920),"El rival difícil conserva gas lejos de la curva");
state.driveDirection=-1;
const reverse=["easy","medium","hard"].map(l=>speed(l,1000));
assert.ok(reverse[0]<reverse[1]&&reverse[1]<reverse[2],"Válido en sentido inverso");
assert.equal(speed("invalid",0),cruise[0],"Nivel desconocido cae a fácil");
assert.ok(page.includes('id="raceAiEnabled"')&&page.includes('id="raceAiLevel"'),"Selector accesible en Competir");
for(const value of ["easy","medium","hard"])
 assert.ok(page.includes('<option value="'+value+'">'),"Existe nivel "+value);
assert.ok(source.includes("aiLevel:aiTest.level")&&source.includes("aiEnabled:aiTest.enabled"),
 "Las preferencias de IA se guardan");
console.log("IA: fácil/media/difícil, anticipación, velocidad máxima, agarre, inverso y selector OK");
