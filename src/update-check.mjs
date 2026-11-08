// Comprobación de versiones independiente del motor, de las partidas y
// de la caché HTML. GitHub Pages cachea respuestas; la petición usa una
// URL única y solicita explícitamente no reutilizar una respuesta vieja.
export const CLIENT_VERSION="0.15.7";
export const UPDATE_CHECK_INTERVAL_MS=10*60*1000;
export function isNewerVersion(candidate,current=CLIENT_VERSION){
 const pattern=/^\d+\.\d+\.\d+$/;
 if(!pattern.test(String(candidate))||!pattern.test(String(current)))return false;
 const a=candidate.split(".").map(Number),b=current.split(".").map(Number);
 return a.some((value,i)=>value>b[i]&&a.slice(0,i).every((n,k)=>n===b[k]));
}
export function updatedGameUrl(version,nonce=Date.now()){
 if(!/^\d+\.\d+\.\d+$/.test(String(version)))throw Error("Versión inválida");
 const next=new URL("../index.html",import.meta.url);
 next.searchParams.set("v",version);
 next.searchParams.set("refresh",String(nonce));
 return next.href;
}
export function releaseManifestUrl(nonce=Date.now()){
 const url=new URL("../version.json",import.meta.url);
 url.searchParams.set("fresh",String(nonce));
 return url.href;
}
export function initVersionChecks(){
 if(typeof document==="undefined"||typeof window==="undefined")return;
 const notice=document.getElementById("updateNotice");
 const label=document.getElementById("updateNoticeText");
 const apply=document.getElementById("updateApply");
 const dismiss=document.getElementById("updateLater");
 if(!notice||!label||!apply||!dismiss)return;
 let latest=null,lastCheck=0,busy=false,hiddenVersion=null;
 function show(version){
  if(version===hiddenVersion)return;
  latest=version;
  label.textContent="SlotRace DEV "+version+" disponible. Actualiza sin borrar tus circuitos.";
  notice.hidden=false;
 }
 apply.addEventListener("click",()=>{
  if(!latest)return;
  // Navegar en la MISMA PWA conserva sus datos locales y evita
  // reinstalarla; el nonce distinto impide reutilizar un HTML anterior.
  window.location.assign(updatedGameUrl(latest,Date.now()));
 });
 dismiss.addEventListener("click",()=>{
  hiddenVersion=latest;notice.hidden=true;
 });
 async function check(){
  const now=Date.now();
  if(busy||now-lastCheck<60*1000)return;
  busy=true;lastCheck=now;
  try{
   const response=await fetch(releaseManifestUrl(now),{
    cache:"no-store",credentials:"same-origin"
   });
   if(!response.ok)return;
   const data=await response.json();
   if(isNewerVersion(data?.version,CLIENT_VERSION))show(data.version);
  }catch(_error){
   // Modo sin conexión: el juego sigue funcionando, sin alarmas falsas.
  }finally{busy=false;}
 }
 void check();
 window.addEventListener("pageshow",()=>{void check();});
 document.addEventListener("visibilitychange",()=>{
  if(!document.hidden)void check();
 });
 window.setInterval(()=>{if(!document.hidden)void check();},UPDATE_CHECK_INTERVAL_MS);
}
initVersionChecks();
