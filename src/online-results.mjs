// Marcador privado de pista. Modelo independiente de la pantalla y del chat.
export function buildOnlineResultModel({scores,heat,hostNick,guestNick,trackName}){
 if(heat!==1&&heat!==2)throw Error("Manga inválida");
 const names={host:String(hostNick||"Anfitrión").slice(0,32),
  guest:String(guestNick||"Invitado").slice(0,32)};
 const rounds=[];
 for(let i=1;i<=heat;i++){
  const host=scores?.[i]?.host,guest=scores?.[i]?.guest;
  if(!Number.isFinite(host)||!Number.isFinite(guest)||host<=0||guest<=0)
   throw Error("Faltan tiempos válidos de ambos pilotos");
  rounds.push({heat:i,host,guest,leader:Math.abs(host-guest)<.001?
   "tie":host<guest?"host":"guest",
   advantage:Math.abs(host-guest)});
 }
 const totals={host:rounds.reduce((t,r)=>t+r.host,0),
  guest:rounds.reduce((t,r)=>t+r.guest,0)};
 const gap=Math.abs(totals.host-totals.guest);
 const winner=gap<.001?"tie":totals.host<totals.guest?"host":"guest";
 return{heat,complete:heat===2,names,rounds,totals,gap,winner,
  circuit:String(trackName||"Pista de slot").slice(0,64)};
}
export function renderOnlineResultBoard({target,title,model}){
 const fmt=seconds=>seconds.toFixed(3).replace(".",",")+" s";
 const make=(tag,cls,value,parent)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(value!==undefined&&value!==null)el.textContent=String(value);
  if(parent)parent.append(el);
  return el;
 };
 target.replaceChildren();
 const hero=make("div","online-results-hero",null,target);
 const kicker=make("div","online-results-kicker",
  model.complete?"🏁 CARRERA COMPLETADA":"🏁 PRIMERA MANGA COMPLETADA",hero);
 make("small","online-results-circuit",model.circuit+" · Pista compartida",hero);
 const winnerText=model.winner==="tie"?"¡Empate!":
  "🏆 Gana "+model.names[model.winner];
 const headline=model.complete?winnerText:"Cambio de carriles";
 const heading=make("h2","online-results-title",headline,hero);
 title.textContent=headline;
 make("div","online-results-margin",model.winner==="tie"?
  "Igualdad absoluta":model.names[model.winner]+" por "+fmt(model.gap),hero);
 if(!model.complete)make("p","online-results-next",
   "Primera manga cerrada. Ahora intercambiáis carriles para decidir la victoria.",hero);
 const tiles=make("div","online-results-tiles",null,target);
 for(const side of ["host","guest"]){
  const tile=make("div","online-results-tile"+
   (model.winner===side?" is-leader":""),null,tiles);
  make("div","online-results-nick",model.names[side],tile);
  make("strong","online-results-time",fmt(model.totals[side]),tile);
  make("small","online-results-position",model.winner===side?
   (model.complete?"🥇 Vencedor":"En cabeza"):
   model.winner==="tie"?"Igualados":model.complete?"Segundo puesto":"Por detrás",tile);
 }
 const section=make("section","online-results-breakdown",null,target);
 make("h3",null,"Tiempos por manga",section);
 const head=make("div","online-results-grid online-results-grid-head",null,section);
 for(const label of ["Manga",model.names.host,model.names.guest])
  make("span",null,label,head);
 for(const r of model.rounds){
  const row=make("div","online-results-grid",null,section);
  make("span","online-results-heat","Manga "+r.heat,row);
  make("span",r.leader==="host"?"is-best":"",fmt(r.host),row);
  make("span",r.leader==="guest"?"is-best":"",fmt(r.guest),row);
 }
 if(model.complete){
  const row=make("div","online-results-grid online-results-total",null,section);
  make("span",null,"TOTAL",row);
  make("strong",model.winner==="host"?"is-best":"",fmt(model.totals.host),row);
  make("strong",model.winner==="guest"?"is-best":"",fmt(model.totals.guest),row);
 }
 make("p","online-results-footnote",
  "Prueba beta · resultados sin homologación ni premios CR",target);
}
