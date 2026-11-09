// SlotRace · copias verificables SIN credenciales ni tokens de sesión.
// Archivo JSON local: circuitos, ajustes, récords, tienda y fotos de plantilla.
// No se envía ningún dato a servidores; la restauración requiere confirmación.
export const BACKUP_FORMAT="slotrace-local-backup";
export const BACKUP_SCHEMA=1;
export const BACKUP_APP_VERSION="0.15.10";
export const BACKUP_KEYS=Object.freeze([
 "slotrace-lab-10",
 "slotrace-lab-04",
 "slotrace-circuit-library-v1",
 "slotrace-circuit-versions-v1",
 "slotrace-shop-owned-v1"
]);
const REFERENCE_PREFIX="slotrace-reference-image-";
const REFERENCE_DB="slotrace-reference-images-v1";
const MAX_FILE_BYTES=85*1024*1024;
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function validImageKey(key){return /^ref-[a-zA-Z0-9-]{6,60}$/.test(key);}
function validateRecords(keys,images){
 if(!keys||typeof keys!=="object"||Array.isArray(keys)||
   !images||typeof images!=="object"||Array.isArray(images))
  throw Error("Estructura de copia incorrecta.");
 const known=new Set(BACKUP_KEYS);
 for(const [key,value] of Object.entries(keys)){
  if(!known.has(key)&&!key.startsWith(REFERENCE_PREFIX))
   throw Error("La copia contiene claves ajenas a SlotRace.");
  if(key.startsWith(REFERENCE_PREFIX)&&!validImageKey(key.slice(REFERENCE_PREFIX.length)))
   throw Error("Identificador de imagen no válido.");
  if(typeof value!=="string")throw Error("Datos locales no válidos.");
  if(!key.startsWith(REFERENCE_PREFIX)){
   try{JSON.parse(value);}catch{throw Error("Los datos guardados están dañados.");}
  }
 }
 for(const [key,value] of Object.entries(images)){
  if(!validImageKey(key)||typeof value!=="string"||
     !/^data:image\/(?:png|jpeg|webp|heic|heif);base64,[a-zA-Z0-9+/=]+$/i.test(value))
   throw Error("Imagen de referencia incompatible.");
 }
 if(!own(keys,"slotrace-lab-10"))throw Error("La copia no contiene el progreso principal.");
 const main=JSON.parse(keys["slotrace-lab-10"]);
 if(!main||typeof main!=="object"||!Array.isArray(main.types)||
    !main.records||typeof main.records!=="object")
  throw Error("La copia no contiene un progreso válido.");
 for(const key of ["slotrace-circuit-library-v1","slotrace-circuit-versions-v1","slotrace-shop-owned-v1"])
  if(own(keys,key)&&!Array.isArray(JSON.parse(keys[key])))
   throw Error("Colección de SlotRace incompatible.");
 return main;
}
export function localSnapshot(storage){
 const keys={};
 for(const key of BACKUP_KEYS){
  const value=storage.getItem(key);
  if(value!==null)keys[key]=value;
 }
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);
  if(key?.startsWith(REFERENCE_PREFIX)){
   const value=storage.getItem(key);
   if(value!==null)keys[key]=value;
  }
 }
 return keys;
}
export function backupSummary(data){
 const main=validateRecords(data.keys,data.images);
 const parseArray=k=>{try{return JSON.parse(data.keys[k]||"[]");}catch{return[];}};
 return{
  circuits:parseArray("slotrace-circuit-library-v1").length,
  revisions:parseArray("slotrace-circuit-versions-v1").length,
  records:Object.keys(main.records||{}).length,
  products:parseArray("slotrace-shop-owned-v1").length,
  images:Object.keys(data.images).length+
   Object.keys(data.keys).filter(k=>k.startsWith(REFERENCE_PREFIX)).length,
  hasDraft:Boolean(main.draft),
  hasCurrentCircuit:Array.isArray(main.types)&&main.types.length>0
 };
}
async function sha256(content){
 if(!globalThis.crypto?.subtle)throw Error("Este navegador no permite verificar SHA-256.");
 const bytes=new TextEncoder().encode(content);
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function createBackup(storage,images={}){
 const data={keys:localSnapshot(storage),images};
 const summary=backupSummary(data);
 const payload={format:BACKUP_FORMAT,schema:BACKUP_SCHEMA,
  version:BACKUP_APP_VERSION,createdAt:new Date().toISOString(),data};
 const signature=await sha256(JSON.stringify(payload));
 return{...payload,sha256:signature,summary};
}
export async function verifyBackup(raw){
 if(typeof raw!=="string"||raw.length>MAX_FILE_BYTES)
  throw Error("La copia supera el límite permitido.");
 let parsed;
 try{parsed=JSON.parse(raw);}catch{throw Error("El archivo no contiene una copia JSON válida.");}
 if(parsed?.format!==BACKUP_FORMAT||parsed.schema!==BACKUP_SCHEMA||
   !/^\d+\.\d+\.\d+$/.test(String(parsed.version))||
   typeof parsed.createdAt!=="string"||
   !parsed.data||!/^[0-9a-f]{64}$/i.test(String(parsed.sha256)))
  throw Error("Este archivo no es una copia compatible de SlotRace.");
 const summary=backupSummary(parsed.data);
 const {sha256:checksum,summary:_summary,...payload}=parsed;
 if(await sha256(JSON.stringify(payload))!==checksum.toLowerCase())
  throw Error("La copia está dañada o ha sido modificada.");
 return{archive:parsed,summary};
}
export async function restoreBackup(archive,storage,readImages,writeImages){
 // Se vuelve a comprobar la firma justo antes de sobrescribir nada.
 await verifyBackup(JSON.stringify(archive));
 const previous=localSnapshot(storage),previousImages=await readImages();
 try{
  // La escritura de fotos es transaccional en IndexedDB.
  await writeImages(archive.data.images);
  const next=archive.data.keys;
  for(const key of BACKUP_KEYS){
   if(own(next,key))storage.setItem(key,next[key]);
   else storage.removeItem(key);
  }
  const oldFallback=Object.keys(previous).filter(k=>k.startsWith(REFERENCE_PREFIX));
  for(const key of oldFallback)storage.removeItem(key);
  for(const [key,value] of Object.entries(next))
   if(key.startsWith(REFERENCE_PREFIX))storage.setItem(key,value);
 }catch(err){
  try{
   for(const key of BACKUP_KEYS){
    if(own(previous,key))storage.setItem(key,previous[key]);
    else storage.removeItem(key);
   }
   for(let i=storage.length-1;i>=0;i--){
    const key=storage.key(i);
    if(key?.startsWith(REFERENCE_PREFIX))storage.removeItem(key);
   }
   for(const [key,value] of Object.entries(previous))
    if(key.startsWith(REFERENCE_PREFIX))storage.setItem(key,value);
   await writeImages(previousImages);
  }catch(_rollbackErr){
   throw Error("Restauración incompleta. Conserva tu archivo y NO reinstales la aplicación.");
  }
  throw err;
 }
 return backupSummary(archive.data);
}
function referenceDatabase(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==="undefined"){resolve(null);return;}
  let request;
  try{request=indexedDB.open(REFERENCE_DB,1);}
  catch(e){reject(Error("No se pudo abrir el almacén de imágenes."));return;}
  request.onupgradeneeded=()=>{
   if(!request.result.objectStoreNames.contains("images"))
    request.result.createObjectStore("images");
  };
  request.onerror=()=>reject(Error("No se pudo abrir el almacén de imágenes."));
  request.onsuccess=()=>resolve(request.result);
 });
}
export async function readReferenceImages(){
 const db=await referenceDatabase();
 if(!db)return{};
 return new Promise((resolve,reject)=>{
  let result={};
  try{
   const tx=db.transaction("images","readonly");
   tx.objectStore("images").openCursor().onsuccess=e=>{
    const cursor=e.target.result;
    if(cursor){
     if(validImageKey(String(cursor.key)))result[cursor.key]=cursor.value;
     cursor.continue();
    }
   };
   tx.oncomplete=()=>{db.close();resolve(result);};
   tx.onerror=()=>{db.close();reject(Error("Error leyendo las imágenes guardadas."));};
   tx.onabort=tx.onerror;
  }catch(e){db.close();reject(e);}
 });
}
export async function writeReferenceImages(images){
 const db=await referenceDatabase();
 if(!db){
  if(Object.keys(images).length)throw Error("IndexedDB no disponible para restaurar imágenes.");
  return;
 }
 return new Promise((resolve,reject)=>{
  try{
   const tx=db.transaction("images","readwrite");
   const store=tx.objectStore("images");
   store.clear();
   for(const [key,data] of Object.entries(images))store.put(data,key);
   tx.oncomplete=()=>{db.close();resolve();};
   tx.onerror=()=>{db.close();reject(Error("No se pudieron restaurar las imágenes."));};
   tx.onabort=tx.onerror;
  }catch(e){db.close();reject(e);}
 });
}
function preview(summary){
 return summary.circuits+" circuitos · "+summary.revisions+
  " revisiones · "+summary.records+" récords · "+
  summary.products+" artículos · "+summary.images+" imágenes";
}
export function initBackupUI(){
 if(typeof document==="undefined"||typeof window==="undefined")return;
 const exportButton=document.getElementById("backupExport");
 const verifyButton=document.getElementById("backupVerify");
 const restoreButton=document.getElementById("backupRestore");
 const input=document.getElementById("backupFile");
 const status=document.getElementById("backupStatus");
 if(!exportButton||!verifyButton||!restoreButton||!input||!status)return;
 let verified=null,busy=false;
 const say=text=>{status.textContent=text;};
 const lock=value=>{busy=value;exportButton.disabled=value;verifyButton.disabled=value;
  restoreButton.disabled=value||!verified;};
 exportButton.addEventListener("click",async()=>{
  if(busy)return;
  lock(true);
  try{
   // Guardar la última selección/tapete antes de crear la instantánea.
   window.dispatchEvent(new Event("slotrace:flush-save"));
   const photos=await readReferenceImages();
   const archive=await createBackup(localStorage,photos);
   const raw=JSON.stringify(archive);
   if(raw.length>MAX_FILE_BYTES)throw Error("La copia es demasiado grande para exportar.");
   await verifyBackup(raw);
   const name="SlotRace-copia-"+new Date().toISOString().slice(0,10)+".json";
   const file=new File([raw],name,{type:"application/json"});
   say("Copia generada y verificada: "+preview(archive.summary)+
    ". Guárdala en Archivos o iCloud Drive, fuera de la PWA.");
   if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
    try{await navigator.share({files:[file],title:"Copia de seguridad SlotRace"});return;}
    catch(e){if(e?.name==="AbortError"){say("Guardado cancelado: vuelve a pulsar Exportar copia.");return;}}
   }
   const href=URL.createObjectURL(file),a=document.createElement("a");
   a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(href),60000);
  }catch(e){say("No se pudo crear la copia: "+(e.message||e));}
  finally{lock(false);}
 });
 verifyButton.addEventListener("click",()=>{if(!busy){input.value="";input.click();}});
 input.addEventListener("change",async()=>{
  const file=input.files?.[0];verified=null;restoreButton.disabled=true;
  if(!file)return;
  lock(true);
  try{
   if(file.size>MAX_FILE_BYTES)throw Error("Archivo demasiado grande.");
   const result=await verifyBackup(await file.text());
   verified=result.archive;
   say("✓ Copia verificada y lista para restaurar: "+preview(result.summary)+
    ". Puedes conservarla sin restaurar nada todavía.");
  }catch(e){say("✕ Archivo rechazado: "+(e.message||e));}
  finally{lock(false);}
 });
 restoreButton.addEventListener("click",async()=>{
  if(busy||!verified)return;
  if(!window.confirm("¿Restaurar la copia verificada? Sustituirá los circuitos, récords y ajustes actuales de este dispositivo. Conserva el archivo por seguridad."))return;
  lock(true);
  try{
   const summary=await restoreBackup(verified,localStorage,readReferenceImages,writeReferenceImages);
   say("✓ Restauración completada: "+preview(summary)+". Recargando SlotRace…");
   window.location.replace("./index.html?v="+BACKUP_APP_VERSION+"&restored="+Date.now());
  }catch(e){say("No se completó la restauración: "+(e.message||e));}
  finally{lock(false);}
 });
}
if(typeof document!=="undefined")initBackupUI();
