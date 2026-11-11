// Shared packaging design system for every SlotRace collectible box.
// Content is escaped; the artwork is generated from the product and its plan.
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const BOX_ART_VERSION="sr-box-art-v1";
export function renderSlotRaceBoxArt(box,{carImage="",blueprint=""}={}){
 if(box?.kind!=="boxes")throw new Error("Expected a box product");
 const theme=box.art==="scarlet"?"rally":"classic";
 const pieces=Object.values(box.pieces||{}).reduce((n,v)=>n+v,0);
 return '<div class="sr-package sr-package--'+theme+'" role="img" aria-label="'+esc(box.name)+
  ', '+pieces+' piezas, coche y plano">'+
  '<div class="sr-package__lid"></div><div class="sr-package__spine"></div>'+
  '<div class="sr-package__front">'+
  '<div class="sr-package__header"><span class="sr-package__emblem"><img src="./assets/ui/slotrace-icon-192.png" alt="" loading="eager"></span>'+
  '<span class="sr-package__brand"><strong class="sr-package__wordmark">SlotRace</strong><small>TOP DOWN RACE · CRAFTRACE STUDIO</small></span>'+
  '<span class="sr-package__series">SR / '+esc(box.contentsVersion||1)+'</span></div>'+
  '<div class="sr-package__edition">'+esc(box.kicker||"COLECCIÓN")+'</div>'+
  '<div class="sr-package__title">'+esc(box.short)+'</div>'+
  '<div class="sr-package__scene">'+
  '<div class="sr-package__track">'+blueprint+'</div>'+
  (carImage?'<img class="sr-package__car" src="'+esc(carImage)+'" alt="">':"")+
  '</div>'+
  '<div class="sr-package__footer"><span>'+pieces+' PIEZAS</span><span>1 COCHE</span><span>PLANO INCLUIDO</span></div>'+
  '</div></div>';
}
