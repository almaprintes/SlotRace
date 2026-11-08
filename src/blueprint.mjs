// SlotRace · receta de construcción desacoplada de la UI.
// Orden físico original, inventario completo y orientación de marcha.
const normal=id=>id.replace(/_(?:225|45|90)([RL])$/,(_,direction)=>"_"+direction);
export function buildRecipe(types,catalog,bridgeParts=[],loose=[],direction=1,actualDirectionLabel=null){
 const all=[...types,...loose.map(p=>p.id)];
 const byId=new Map();
 for(const id of all){
  const spec=catalog[id];
  if(!spec)throw new Error("Pieza desconocida en receta: "+id);
  const item=byId.get(id)||{id,name:spec.name||id,count:0,length:0};
  item.count++;item.length+=spec.length||0;byId.set(id,item);
 }
 const items=[...byId.values()].sort((a,b)=>a.name.localeCompare(b.name,"es"));
 const sequence=types.map((id,i)=>({
  position:i+1,id,name:catalog[id].name||id,raised:bridgeParts.includes(i)
 }));
 const bridgeCount=bridgeParts.length+
  loose.filter(p=>p.raised).length;
 return{
  items,sequence,pieces:all.length,
  connected:types.length,loose:loose.length,bridgeCount,
  direction:direction===-1?-1:1,
  directionLabel:direction===-1?"ANTIHORARIO":"HORARIO",
  // Longitud de módulos. La distancia de carrera por carril puede
  // diferir en las curvas y se obtiene de buildTrack().lanes.
  nominalLength:all.reduce((sum,id)=>sum+(catalog[id].length||catalog[id].radius*Math.abs(catalog[id].angle||0)),0),
  groupCount:items.length
 };
}
// Referencias cortas por TIPO de pieza, nunca por orden de montaje.
// A, B, ... Z, AA, AB... El mismo tipo lleva la misma letra en TODO el
// plano, y los accesorios (kit puente) no se confunden con piezas de vía.
export function blueprintReferenceMap(items){
 const refs=new Map();let index=0;
 for(const item of items){
  if(item.accessory)continue;
  if(refs.has(item.id))continue;
  let n=++index,code="";
  do{
   n--;code=String.fromCharCode(65+n%26)+code;
   n=Math.floor(n/26);
  }while(n>0);
  refs.set(item.id,code);
 }
 return refs;
}
export function recipeRows(recipe){
 return recipe.items.map(item=>({
  label:item.name,quantity:item.count,id:item.id
 }));
}
export function slugName(name){
 return (name||"circuito").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,52)||"circuito";
}
