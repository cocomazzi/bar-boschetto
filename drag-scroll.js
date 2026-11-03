export function scrollSpeed(y,top,bottom){
 if(![y,top,bottom].every(Number.isFinite)||bottom<=top)return 0;
 const edge=Math.min(130,(bottom-top)/3);
 if(y<top+edge)return -1000*Math.min(1,Math.max(0,(top+edge-y)/edge))**1.4;
 if(y>bottom-edge)return 1000*Math.min(1,Math.max(0,(y-bottom+edge)/edge))**1.4;
 return 0;
}
