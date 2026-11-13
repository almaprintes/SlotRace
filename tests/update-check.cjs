"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
 const {isNewerVersion,updatedGameUrl,releaseManifestUrl,CLIENT_VERSION}=
  await import("../src/update-check.mjs");
 const root=path.join(__dirname,"..");
 const file=p=>fs.readFileSync(path.join(root,p),"utf8");
 const html=file("index.html");
 const manifest=JSON.parse(file("version.json"));
 const upgrade=file("upgrade.html");
 const app=file("src/app.mjs"),css=file("src/site.css");
 const current=manifest.version;
 assert.match(current,/^\d+\.\d+\.\d+$/);
 assert.equal(CLIENT_VERSION,current,"El detector coincide con la versión publicada");
 assert.ok(app.includes('version:"DEV '+current+'"'),"El juego muestra su versión");
 assert.ok(html.includes('class="splash-version">DEV '+current),"La portada muestra la misma versión");
 for(const dependency of ["src/app.mjs","src/site.css","src/update-check.mjs",
  "src/account.mjs","src/backup.mjs"]){
  assert.ok(html.includes(dependency+"?v="+current),
   dependency+" debe cargarse con el identificador de publicación");
 }
 assert.ok(app.includes('from "./duel-scoreboard.mjs?v='+current+'"'),
  "El marcador de duelos se carga con la versión correcta");
 assert.match(html,/id="updateApply"/);
 assert.match(html,/id="updateNoticeText"/);
 assert.match(css,/\.update-notice\[hidden\]/);
 assert.match(upgrade,/version\.json\?fresh=/);
 assert.match(upgrade,/index\.html\?v=/);
 assert.match(upgrade,/No elimines la PWA/);
 const [major,minor,patch]=current.split(".").map(Number);
 assert.equal(isNewerVersion(current),false);
 assert.equal(isNewerVersion(major+"."+minor+"."+(patch+1)),true);
 assert.equal(isNewerVersion(major+"."+minor+"."+(patch-1)),false);
 assert.equal(isNewerVersion("0.14.61"),false);
 assert.equal(isNewerVersion("1.0.0"),true);
 assert.equal(isNewerVersion("malformed"),false);
 assert.equal(isNewerVersion("<script>"),false);
 assert.ok(updatedGameUrl(current,12345).endsWith("index.html?v="+current+"&refresh=12345"));
 assert.match(releaseManifestUrl(222),/version\.json\?fresh=222$/);
 assert.throws(()=>updatedGameUrl("javascript:alert(1)"));
 // Sólo se auditan los imports que ya llevan etiqueta de versión.
 for(const modulePath of ["src/app.mjs","src/track.mjs","src/runoffs.mjs",
  "src/kerbs.mjs","src/closure-guide.mjs","src/duel-scoreboard.mjs"]){
  const code=file(modulePath);
  const imported=[...code.matchAll(/from\s+"(\.\/[^"]+\.mjs(?:\?v=[^"]+)?)"/g)].map(m=>m[1]);
  assert.ok(imported.length>0,modulePath+" mantiene imports reales");
  for(const dependency of imported.filter(x=>x.includes("?v=")))
   assert.ok(dependency.endsWith("?v="+current),
    modulePath+" debe cargar "+dependency+" con la versión actual");
 }
 assert.match(file("src/update-check.mjs"),/cache:"no-store"/);
 console.log("SlotRace DEV "+current+": caché, módulos, PWA y actualización coherentes OK");
})().catch(e=>{console.error(e);process.exitCode=1;});
