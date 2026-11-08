"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
 const {isNewerVersion,updatedGameUrl,releaseManifestUrl,CLIENT_VERSION}=
  await import("../src/update-check.mjs");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,"../version.json"),"utf8"));
 const upgrade=fs.readFileSync(path.join(__dirname,"../upgrade.html"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../src/site.css"),"utf8");
 assert.equal(CLIENT_VERSION,"0.15.4");
 assert.equal(manifest.version,CLIENT_VERSION,"El manifiesto anuncia el motor realmente desplegado");
 assert.match(app,/version:"DEV 0\.15\.4"/);
 assert.match(html,/class="splash-version">DEV 0\.15\.4/);
 assert.match(html,/id="updateApply"/);
 assert.match(html,/id="updateNoticeText"/);
 assert.match(html,/update-check\.mjs\?v=0\.15\.4/);
 assert.match(html,/src\/app\.mjs\?v=0\.15\.4/);
 assert.match(html,/src\/site\.css\?v=0\.15\.4/);
 assert.match(html,/src\/account\.mjs\?v=0\.15\.4/);
 assert.match(css,/\.update-notice\[hidden\]/);
 assert.match(upgrade,/version\.json\?fresh=/);
 assert.match(upgrade,/index\.html\?v=/);
 assert.match(upgrade,/No elimines la PWA/);
 assert.equal(isNewerVersion("0.14.61"),false);
 assert.equal(isNewerVersion("0.15.5"),true);
 assert.equal(isNewerVersion("1.0.0"),true);
 assert.equal(isNewerVersion("0.14.56"),false);
 assert.equal(isNewerVersion("0.15.4"),false);
 assert.equal(isNewerVersion("0.13.100"),false);
 assert.equal(isNewerVersion("malformed"),false);
 assert.equal(isNewerVersion("<script>"),false);
 assert.match(updatedGameUrl("0.15.4",12345),/index\.html\?v=0\.15\.4&refresh=12345$/);
 assert.match(releaseManifestUrl(222),/version\.json\?fresh=222$/);
 assert.throws(()=>updatedGameUrl("javascript:alert(1)"));
 for(const modulePath of ["src/app.mjs","src/track.mjs","src/runoffs.mjs","src/kerbs.mjs"]){
  const code=fs.readFileSync(path.join(__dirname,"..",modulePath),"utf8");
  const imported=[...code.matchAll(/from\s+"(\.\/[^"]+\.mjs(?:\?v=[^"]+)?)"/g)].map(m=>m[1]);
  assert.ok(imported.length>0,modulePath+" mantiene dependencias explícitas");
  for(const dependency of imported)
   assert.ok(dependency.endsWith("?v=0.15.4"),
    modulePath+" debe cargar "+dependency+" con la misma versión");
 }
 assert.match(fs.readFileSync(path.join(__dirname,"../src/update-check.mjs"),"utf8"),
  /cache:"no-store"/,"No usar caché al consultar la versión publicada");
 console.log("SlotRace DEV 0.15.4: versión coherente, caché de módulos, recuperación y comprobación segura — OK");
})().catch(e=>{console.error(e);process.exitCode=1});
