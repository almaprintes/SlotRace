// Pista de slot online: mensajería efímera, solo en memoria y siempre en la PWA.
// Nunca se guarda en localStorage ni se utiliza en física o cronometraje.
export const LIVE_CHAT_PRESETS=Object.freeze(["👏","🏁","😂","🔥","¡Buena vuelta!","¡Revancha!"]);
export function cleanLiveChatText(input){
 if(typeof input!=="string")return "";
 return input.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,160);
}
export function validLiveChat(text,kind="text"){
 const clean=cleanLiveChatText(text);
 if(!clean)return false;
 return kind==="quick"?LIVE_CHAT_PRESETS.includes(clean):kind==="text"&&clean.length<=160;
}
export function initOnlineChat({send,isRacing}){
 const $=id=>document.getElementById(id);
 const dock=$("onlineChatDock"),panel=$("onlineChatPanel"),toggle=$("onlineChatToggle");
 const badge=$("onlineChatUnread"),list=$("onlineChatMessages");
 const input=$("onlineChatInput"),form=$("onlineChatForm");
 const quick=$("onlineChatQuick"),status=$("onlineChatStatus");
 let active=false,opened=false,unread=0,roomId=null;
 function refresh(){
  dock.hidden=!active;
  panel.hidden=!active||!opened;
  toggle.setAttribute("aria-expanded",String(active&&opened));
  toggle.setAttribute("aria-label",unread?"Chat de pista, "+unread+" sin leer":"Abrir chat de pista");
  badge.hidden=!unread;
  badge.textContent=unread>9?"9+":String(unread);
  const racing=isRacing();
  dock.classList.toggle("is-racing",racing);
  form.hidden=racing;
  quick.setAttribute("aria-label",racing?"Reacciones rápidas durante la carrera":"Mensajes rápidos");
 }
 function reset(nextId=null){
  roomId=nextId;active=false;opened=false;unread=0;
  list.replaceChildren();status.textContent="";input.value="";
  refresh();
 }
 function ready(nextId){
  if(typeof nextId!=="string"||!nextId)return;
  if(roomId!==nextId)reset(nextId);
  active=true;refresh();
 }
 function showError(value){status.textContent=cleanLiveChatText(value).slice(0,140);}
 function receive(value){
  if(!active||!value||value.roomId!==roomId||
   !validLiveChat(value.text,value.kind)||typeof value.nick!=="string")return false;
  const item=document.createElement("div");
  item.className="online-chat-item"+(value.mine?" is-mine":"");
  const nick=document.createElement("strong");
  nick.textContent=(value.mine?"Tú":cleanLiveChatText(value.nick).slice(0,32));
  const line=document.createElement("span");
  line.textContent=cleanLiveChatText(value.text);
  item.append(nick,line);list.append(item);
  while(list.childElementCount>40)list.firstElementChild.remove();
  if(!opened&&!value.mine)unread=Math.min(99,unread+1);
  if(opened)list.scrollTop=list.scrollHeight;
  refresh();return true;
 }
 function submit(raw,kind="text"){
  const value=cleanLiveChatText(raw);
  if(!active||!validLiveChat(value,kind))return false;
  if(isRacing()&&kind!=="quick"){showError("Durante la carrera usa las reacciones rápidas.");return false;}
  status.textContent="";
  send(value,kind);
  return true;
 }
 toggle.addEventListener("click",()=>{
  if(!active)return;
  opened=!opened;if(opened){unread=0;list.scrollTop=list.scrollHeight;}
  refresh();
 });
 $("onlineChatClose").addEventListener("click",()=>{opened=false;refresh();});
 form.addEventListener("submit",event=>{
  event.preventDefault();
  if(submit(input.value)){input.value="";input.focus();}
 });
 for(const preset of LIVE_CHAT_PRESETS){
  const button=document.createElement("button");
  button.type="button";button.textContent=preset;
  button.addEventListener("click",()=>submit(preset,"quick"));
  quick.append(button);
 }
 reset();
 return{ready,reset,receive,refresh,showError};
}
