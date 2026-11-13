"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
 const root=path.join(__dirname,"..");
 const file=p=>fs.readFileSync(path.join(root,p),"utf8");
 const {isNewerVersion,updatedGameUrl,releaseManifestUrl,CLIENT_VERSION}=
  await import("../src/update-check.mjs");
 const html=file("index.html"),app=file("src/app.mjs");
 const css=file("src/site.css"),upgrade=file("upgrade.html");
 const manifest=JSON.parse(file("version.json"));
 const current=manifest.version;
 assert.match(current,/^\d+\.\d+\.\d+$/);
 assert.equal(CLIENT_VERSION,current,"El detector usa la misma versión");
 assert.ok(app.includes('version:"DEV '+current+'"'),"La app muestra la versión actual");
 assert.ok(html.includes('class="splash-version">DEV '+current),"La bienvenida coincide");
 for(const dep of ["src/app.mjs","src/site.css","src/update-check.mjs",
   "src/account.mjs","src/backup.mjs"]){
  assert.ok(html.includes(dep+"?v="+current),dep+" se publica con versión actual");
 }
 assert.ok(app.includes('from "./duel-scoreboard.mjs?v='+current+'"'),
  "El resumen visual utiliza versión actual");
 for(const id of ["updateApply","updateNoticeText"])
  assert.ok(html.includes('id="'+id+'"'),"Existe el control "+id);
 assert.ok(css.includes(".update-notice[hidden]"),"Aviso de actualización respeta hidden");
 for(const phrase of ["version.json?fresh=","index.html?v=","No elimines la PWA"])
  assert.ok(upgrade.includes(phrase),"La recuperación contiene "+phrase);
 const [major,minor,patch]=current.split(".").map(Number);
 assert.equal(isNewerVersion(current),false);
 assert.equal(isNewerVersion([major,minor,patch+1].join(".")),true);
 if(patch>0)assert.equal(isNewerVersion([major,minor,patch-1].join(".")),false);
 assert.equal(isNewerVersion("1.0.0"),true);
 assert.equal(isNewerVersion("malformed"),false);
 assert.equal(isNewerVersion("<script>"),false);
 assert.ok(updatedGameUrl(current,12345).endsWith("index.html?v="+current+"&refresh=12345"));
 assert.ok(releaseManifestUrl(222).includes("version.json?fresh=222"));
 assert.throws(()=>updatedGameUrl("javascript:alert(1)"));
 const importRegex=/from\s+"(\.\/[^"]+\.mjs(?:\?v=[^"]+)?)"/g;
 for(const name of ["src/app.mjs","src/track.mjs","src/runoffs.mjs","src/kerbs.mjs",
   "src/closure-guide.mjs","src/duel-scoreboard.mjs"]){
  const imports=[...file(name).matchAll(importRegex)].map(x=>x[1]);
  assert.ok(imports.length>0,"No se detectaron imports: "+name);
  for(const value of imports.filter(x=>x.includes("?v=")))
   assert.ok(value.endsWith("?v="+current),"Import obsoleto en "+name+": "+value);
 }
 assert.ok(file("src/update-check.mjs").includes('cache:"no-store"'));
 console.log("SlotRace DEV "+current+": actualización PWA, imports y caché consistentes OK");
})().catch(e=>{console.error(e);process.exitCode=1;});
