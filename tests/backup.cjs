"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
(async()=>{
 const {
  BACKUP_FORMAT,BACKUP_SCHEMA,BACKUP_APP_VERSION,localSnapshot,
  createBackup,verifyBackup,restoreBackup
 }=await import("../src/backup.mjs");
 class MemoryStorage{
  constructor(data={}){this.data=new Map(Object.entries(data));this.failKey=null;}
  get length(){return this.data.size;}
  key(i){return Array.from(this.data.keys())[i]||null;}
  getItem(key){return this.data.has(key)?this.data.get(key):null;}
  setItem(key,value){
   if(this.failKey===key){this.failKey=null;throw Error("QuotaExceededError");}
   this.data.set(key,String(value));
  }
  removeItem(key){this.data.delete(key);}
 }
 const main={types:["S350","R2_45R","S350"],loose:[],
  bridgeParts:[],draft:{types:["S350"],loose:[]},
  records:{"circuit:fastest":3.25,"circuit:laneB":3.60},
  selectedCar:"spark",driveDirection:-1,
  tableTheme:"technical",reference:{id:"ref-example123456"}};
 const library=[
  {id:"sr-1",name:"Catalunya Slot",snapshot:{types:["S350","R2_45R"]}},
  {id:"sr-2",name:"Doble Óvalo",snapshot:{types:["S350","S350"]}}
 ];
 const revision=[{id:"r-1",name:"Doble Óvalo",snapshot:{types:["S350"]}}];
 const fallbackKey="slotrace-reference-image-ref-example123456";
 const original=new MemoryStorage({
  "slotrace-lab-10":JSON.stringify(main),
  "slotrace-lab-04":JSON.stringify({types:["S350"]}),
  "slotrace-circuit-library-v1":JSON.stringify(library),
  "slotrace-circuit-versions-v1":JSON.stringify(revision),
  "slotrace-shop-owned-v1":JSON.stringify(["box-rally","car-spark"]),
  [fallbackKey]:"data:image/jpeg;base64,/9g=",
  "craftstudio-slotrace-auth-v1":"PRIVATE_TOKEN_DO_NOT_EXPORT",
  "some-other-game-data":"do not touch"
 });
 const imageId="ref-example123456";
 const originalImages={[imageId]:"data:image/png;base64,iVBORw0KGgo="};
 const archive=await createBackup(original,originalImages);
 assert.equal(BACKUP_APP_VERSION,"0.14.60");
 assert.equal(archive.format,BACKUP_FORMAT);
 assert.equal(archive.schema,BACKUP_SCHEMA);
 const file=JSON.stringify(archive);
 assert.doesNotMatch(file,/PRIVATE_TOKEN_DO_NOT_EXPORT|some-other-game-data|craftstudio-slotrace-auth/,
  "La copia no debe exportar cuentas ni datos de otros juegos");
 const verified=await verifyBackup(file);
 assert.equal(verified.summary.circuits,2);
 assert.equal(verified.summary.revisions,1);
 assert.equal(verified.summary.records,2);
 assert.equal(verified.summary.products,2);
 assert.equal(verified.summary.images,2);
 assert.equal(verified.summary.hasDraft,true);
 const corrupt=file.replace("Catalunya Slot","Catalunya XX Slot");
 await assert.rejects(verifyBackup(corrupt),/dañada o ha sido modificada/,
  "El checksum detecta hasta una modificación en el nombre del circuito");
 await assert.rejects(verifyBackup('{"version":1}'),/copia compatible/);
 const leaked={...archive,data:{keys:{...archive.data.keys,
  "craftstudio-slotrace-auth-v1":"secreto"},images:{}}};
 await assert.rejects(verifyBackup(JSON.stringify(leaked)),/claves ajenas/,
  "No se aceptan copias con tokens de sesión");

 // Restauración después de una reinstalación ficticia, conservando el nuevo login.
 const fresh=new MemoryStorage({"craftstudio-slotrace-auth-v1":"LOGIN_DISTINTO"});
 let diskImages={};
 const read=async()=>({...diskImages});
 const write=async images=>{diskImages={...images};};
 const result=await restoreBackup(verified.archive,fresh,read,write);
 assert.equal(result.circuits,2);
 assert.equal(fresh.getItem("slotrace-lab-10"),JSON.stringify(main));
 assert.equal(fresh.getItem("slotrace-circuit-library-v1"),JSON.stringify(library));
 assert.equal(fresh.getItem("slotrace-circuit-versions-v1"),JSON.stringify(revision));
 assert.equal(fresh.getItem("slotrace-shop-owned-v1"),JSON.stringify(["box-rally","car-spark"]));
 assert.equal(fresh.getItem(fallbackKey),"data:image/jpeg;base64,/9g=");
 assert.equal(fresh.getItem("craftstudio-slotrace-auth-v1"),"LOGIN_DISTINTO");
 assert.equal(diskImages[imageId],originalImages[imageId]);
 assert.equal(localSnapshot(fresh)["slotrace-circuit-library-v1"],JSON.stringify(library));

 // Restauración con fallo de cuota: revertir datos e imágenes previos.
 const oldState={types:["S175"],loose:[],records:{"antes":8}};
 const occupied=new MemoryStorage({
  "slotrace-lab-10":JSON.stringify(oldState),
  "slotrace-circuit-library-v1":JSON.stringify([{id:"old",name:"Original"}]),
  "unrelated-auth-key":"do-not-modify"
 });
 let previousPhotos={"ref-old123456":"data:image/png;base64,aGVsbG8="};
 const previousCopy={...previousPhotos};
 occupied.failKey="slotrace-circuit-library-v1";
 await assert.rejects(restoreBackup(verified.archive,occupied,
  async()=>({...previousPhotos}),
  async images=>{previousPhotos={...images};}),/QuotaExceededError/);
 assert.equal(occupied.getItem("slotrace-lab-10"),JSON.stringify(oldState),
  "Se revierte el progreso cuando hay un error de almacenamiento");
 assert.equal(occupied.getItem("slotrace-circuit-library-v1"),
  JSON.stringify([{id:"old",name:"Original"}]));
 assert.deepEqual(previousPhotos,previousCopy,
  "Se restaura IndexedDB si falla la escritura de las preferencias");
 assert.equal(occupied.getItem("unrelated-auth-key"),"do-not-modify");
 const index=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,"../manifest.webmanifest"),"utf8"));
 const css=fs.readFileSync(path.join(__dirname,"../src/site.css"),"utf8");
 for(const id of ["backupExport","backupVerify","backupRestore","backupFile","backupStatus"])
  assert.match(index,new RegExp('id="'+id+'"'));
 assert.match(index,/src\/backup\.mjs\?v=0\.14\.60/);
 assert.match(index,/rel="apple-touch-icon"/);
 assert.match(index,/slotrace-icon-192\.png\?v=0\.14\.60/);
 assert.match(index,/rel="manifest"/);
 assert.match(css,/\.backup-actions/);
 // Regresión visual: la regla global .hub-screen .hub-back{display:none!important}
 // ocultó los tres controles. Nunca pueden heredar esa clase.
 assert.match(css,/\.hub-screen \.hub-back\{display:none!important\}/);
 for(const id of ["backupExport","backupVerify","backupRestore"]){
  const button=index.match(new RegExp('<button[^>]*id="'+id+'"[^>]*>'));
  assert.ok(button,"Debe existir el botón "+id);
  assert.match(button[0],/class="[^"]*backup-action/);
  assert.doesNotMatch(button[0],/\bhub-back\b/,
   "No usar la clase global que oculta botones del hub");
 }
 assert.match(css,/\.hub-screen \.backup-actions \.backup-action\{[\s\S]*?display:block/,
  "Los controles de respaldo se muestran en móvil");
 assert.match(css,/\.hub-screen \.hub-feature\.backup-panel p\{color:#d6e6e8\}/,
  "Texto legible sobre el fondo oscuro del respaldo");
 assert.ok(manifest.icons.some(icon=>icon.sizes==="192x192"));
 assert.ok(manifest.icons.some(icon=>icon.sizes==="512x512"));
 for(const filePath of ["assets/ui/slotrace-icon-192.png","assets/ui/slotrace-icon-512.webp"]){
  const buffer=fs.readFileSync(path.join(__dirname,"..",filePath));
  assert.ok(buffer.byteLength>2000,filePath+" no debe estar vacío");
 }
 const app=fs.readFileSync(path.join(__dirname,"../src/app.mjs"),"utf8");
 assert.match(app,/slotrace:flush-save/);
 console.log("SlotRace 0.14.60: copia firmada, privacidad, fotos, importación, reversión y nuevo icono — OK");
})().catch(error=>{console.error(error);process.exitCode=1;});
