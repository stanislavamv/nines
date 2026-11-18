/* Night city scene for the Quest map: dusk grid sky, moon, clouds, skyline, cell tower,
   power lines, railing and a lantern-lit stand. Returns an SVG string. Original artwork. */
(function(){
"use strict";
var C={ink:"#1b2142",moon:"#f4eedc",dusk:"#e59ab3",lantern:"#f2c46d",noren:"#c8394a",pine:"#4f8a6b",bldg:"#2a3266",cloud:"#2b3466",cloud2:"#3550a8"};
function R(s){return function(){s=(s*16807)%2147483647;return s/2147483647;};}
function star(x,y,s){return '<path d="M'+x+' '+(y-s)+'Q'+x+' '+y+' '+(x+s)+' '+y+'Q'+x+' '+y+' '+x+' '+(y+s)+'Q'+x+' '+y+' '+(x-s)+' '+y+'Q'+x+' '+y+' '+x+' '+(y-s)+'Z" fill="'+C.moon+'"/>';}
function cloud(x,y,s,body){
  var parts=[[-60,0,34],[-20,-22,40],[25,-12,34],[60,4,26],[-95,12,20],[95,14,18]];
  function layer(dy,grow,fill){var o="";parts.forEach(function(p){o+='<circle cx="'+(x+p[0]*s)+'" cy="'+(y+p[1]*s+dy)+'" r="'+(p[2]*s+grow)+'" fill="'+fill+'"/>';});
    return o+'<ellipse cx="'+x+'" cy="'+(y+16*s+dy)+'" rx="'+(118*s+grow)+'" ry="'+(14*s+grow)+'" fill="'+fill+'"/>';}
  return "<g>"+layer(-6*s,3,C.ink)+layer(-6*s,0,C.dusk)+layer(0,3,C.ink)+layer(0,0,body)+"</g>";
}
function txt(x,y,size,fill,t){return '<text x="'+x+'" y="'+y+'" text-anchor="middle" font-family="Dela Gothic One, Arial Black, sans-serif" font-size="'+size+'" fill="'+fill+'">'+t+'</text>';}
window.NightScene=function(o){
  /* o.city:false leaves only the sky; o.shop:false stops at the railing; o.vy/o.vh crop the view */
  o=o||{};var w=o.w||1200,h=o.h||560,id=o.id||"ns",r=R(o.seed||23),gy=Math.round(h*0.5),s="",i;
  s+='<svg class="scene" viewBox="0 '+(o.vy||0)+' '+w+' '+(o.vh||h)+'" role="img" aria-label="Illustrated night city: a crescent moon over rooftops, a blinking cell tower, and an on-call engineer at a lit noodle stand"><defs>'+
    '<linearGradient id="'+id+'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d3874"/><stop offset=".45" stop-color="#5d5ca8"/><stop offset=".8" stop-color="#c784b3"/><stop offset="1" stop-color="#eaa1b6"/></linearGradient>'+
    '<pattern id="'+id+'grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="#e8ecff" stroke-opacity=".3" stroke-width="1.5"/></pattern>'+
    '<radialGradient id="'+id+'glow"><stop offset="0" stop-color="#e59ab3" stop-opacity=".55"/><stop offset="1" stop-color="#e59ab3" stop-opacity="0"/></radialGradient>'+
    '<mask id="'+id+'m"><rect width="'+w+'" height="'+h+'" fill="#fff"/><circle cx="'+(w*.84+22)+'" cy="'+(h*.13-14)+'" r="50" fill="#000"/></mask>'+
    '<linearGradient id="'+id+'shop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe2a6"/><stop offset="1" stop-color="#f0b866"/></linearGradient></defs>';
  s+='<rect width="'+w+'" height="'+h+'" fill="url(#'+id+'sky)"/><rect width="'+w+'" height="'+gy+'" fill="url(#'+id+'grid)"/>';
  for(i=0;i<28;i++)s+=star(Math.round(r()*w),Math.round(r()*gy*.85),3+Math.round(r()*5));
  var mx=w*.84,my=h*.13;
  s+='<circle cx="'+mx+'" cy="'+my+'" r="110" fill="url(#'+id+'glow)"/><circle cx="'+mx+'" cy="'+my+'" r="58" fill="'+C.moon+'" stroke="'+C.ink+'" stroke-width="3" mask="url(#'+id+'m)"/>';
  s+=cloud(w*.28,h*.18,1.25,C.cloud)+cloud(w*.78,h*.36,1.05,C.cloud2)+cloud(w*.42,gy-70,.8,C.cloud)+cloud(w*.06,h*.33,.6,C.cloud);
  if(o.city===false)return s+"</svg>";
  var x=0;
  while(x<w){var bw=50+Math.round(r()*80),bh=50+Math.round(r()*150);
    s+='<rect x="'+x+'" y="'+(gy-bh)+'" width="'+bw+'" height="'+bh+'" fill="'+C.bldg+'" stroke="'+C.ink+'" stroke-width="3"/>';
    for(var wy=gy-bh+12;wy<gy-14;wy+=20)for(var wx=x+10;wx<x+bw-14;wx+=18)s+='<rect x="'+wx+'" y="'+wy+'" width="9" height="11" fill="'+(r()<.35?C.lantern:"#3a4580")+'"/>';
    x+=bw+4+Math.round(r()*10);}
  var tx=w*.66,th=230;
  s+='<g stroke="'+C.ink+'" stroke-width="3" fill="none"><path d="M'+(tx-28)+' '+gy+'L'+tx+' '+(gy-th)+'L'+(tx+28)+' '+gy+'"/>';
  for(var k=1;k<6;k++){var yy=gy-th*k/6,dx=28*(1-k/6);s+='<path d="M'+(tx-dx)+' '+yy+'L'+(tx+dx)+' '+(yy+th/6*.9)+'M'+(tx+dx)+' '+yy+'L'+(tx-dx)+' '+(yy+th/6*.9)+'" stroke-width="2"/>';}
  s+='</g><rect x="'+(tx-14)+'" y="'+(gy-th+30)+'" width="10" height="24" fill="#cfd4ff" stroke="'+C.ink+'" stroke-width="2"/><rect x="'+(tx+4)+'" y="'+(gy-th+44)+'" width="10" height="24" fill="#cfd4ff" stroke="'+C.ink+'" stroke-width="2"/>'+
    '<circle class="blink" cx="'+tx+'" cy="'+(gy-th)+'" r="7" fill="'+C.noren+'" stroke="'+C.ink+'" stroke-width="2"/>';
  var px=w*.07;
  s+='<g stroke="'+C.ink+'" stroke-width="3" fill="'+C.pine+'"><rect x="'+(px-6)+'" y="'+(gy-40)+'" width="12" height="40" fill="#5b3b2e"/>';
  [[150,70],[110,60],[72,48]].forEach(function(t){s+='<path d="M'+(px-t[1])+' '+(gy-t[0]+60)+'L'+px+' '+(gy-t[0]-30)+'L'+(px+t[1])+' '+(gy-t[0]+60)+'Z"/>';});
  s+="</g>";
  var poles=[w*.2,w*.5,w*.9];
  poles.forEach(function(p){s+='<rect x="'+(p-4)+'" y="'+(gy-200)+'" width="8" height="200" fill="#3a3f63" stroke="'+C.ink+'" stroke-width="2"/><rect x="'+(p-26)+'" y="'+(gy-190)+'" width="52" height="7" fill="#3a3f63" stroke="'+C.ink+'" stroke-width="2"/>';});
  for(var j=0;j<poles.length-1;j++)for(var q=-1;q<=1;q++){var a=poles[j]+q*20,c=poles[j+1]+q*20,y2=gy-188;
    s+='<path d="M'+a+' '+y2+'Q'+((a+c)/2)+' '+(y2+46+q*6)+' '+c+' '+y2+'" fill="none" stroke="'+C.ink+'" stroke-width="2"/>';}
  s+='<g stroke="'+C.ink+'"><rect x="0" y="'+gy+'" width="'+w+'" height="36" fill="#262c55" stroke-width="3"/><line x1="0" y1="'+(gy-46)+'" x2="'+w+'" y2="'+(gy-46)+'" stroke-width="5"/><line x1="0" y1="'+(gy-8)+'" x2="'+w+'" y2="'+(gy-8)+'" stroke-width="3"/>';
  for(var rx=10;rx<w;rx+=24)s+='<line x1="'+rx+'" y1="'+(gy-46)+'" x2="'+rx+'" y2="'+gy+'" stroke="#59629a" stroke-width="3"/>';
  s+="</g>";
  if(o.shop===false)return s+"</svg>";
  var ry=gy+36,sy=ry+34;
  s+='<rect x="0" y="'+ry+'" width="'+w+'" height="34" fill="#20264a" stroke="'+C.ink+'" stroke-width="3"/>';
  for(var fx=4;fx<w;fx+=9)s+='<line x1="'+fx+'" y1="'+(ry+4)+'" x2="'+(fx-3)+'" y2="'+(ry+32)+'" stroke="#3b4373" stroke-width="2"/>';
  s+='<rect x="0" y="'+sy+'" width="'+w+'" height="'+(h-sy)+'" fill="url(#'+id+'shop)" stroke="'+C.ink+'" stroke-width="3"/>';
  for(var sx=20;sx<w*.42;sx+=34)s+='<line x1="'+sx+'" y1="'+sy+'" x2="'+sx+'" y2="'+h+'" stroke="#c99a52" stroke-width="2"/>';
  for(var syy=sy+30;syy<h;syy+=30)s+='<line x1="0" y1="'+syy+'" x2="'+(w*.42)+'" y2="'+syy+'" stroke="#c99a52" stroke-width="2"/>';
  var nx=w*.5,nw=(w*.48)/5;
  ["9","9",".","9","9"].forEach(function(t,i2){var cx=nx+i2*nw;s+='<rect x="'+(cx+3)+'" y="'+sy+'" width="'+(nw-6)+'" height="78" fill="'+C.noren+'" stroke="'+C.ink+'" stroke-width="3"/>'+txt(cx+nw/2,sy+56,40,"#fff",t);});
  var cy=h-70;
  s+='<rect x="'+nx+'" y="'+cy+'" width="'+(w*.48)+'" height="16" fill="#c97b4a" stroke="'+C.ink+'" stroke-width="3"/>';
  for(var st=0;st<5;st++)s+='<rect x="'+(nx+30+st*nw)+'" y="'+(cy+34)+'" width="34" height="10" fill="'+C.noren+'" stroke="'+C.ink+'" stroke-width="3"/>';
  var ex=nx+nw*1.6;
  s+='<g stroke="'+C.ink+'" stroke-width="3"><path d="M'+(ex-26)+' '+(cy+2)+'Q'+(ex-28)+' '+(cy-46)+' '+ex+' '+(cy-50)+'Q'+(ex+28)+' '+(cy-46)+' '+(ex+26)+' '+(cy+2)+'Z" fill="#6c5fa8"/>'+
    '<circle cx="'+ex+'" cy="'+(cy-66)+'" r="17" fill="#2b2240"/><path d="M'+(ex-19)+' '+(cy-66)+'Q'+ex+' '+(cy-96)+' '+(ex+19)+' '+(cy-66)+'" fill="none" stroke="#9aa3e0" stroke-width="4"/></g>'+
    '<rect x="'+(ex+34)+'" y="'+(cy-30)+'" width="46" height="30" rx="3" fill="#cfe3ff" stroke="'+C.ink+'" stroke-width="3"/><rect x="'+(ex+30)+'" y="'+(cy-2)+'" width="56" height="5" fill="#8a91c2" stroke="'+C.ink+'" stroke-width="2"/>'+
    '<ellipse cx="'+(ex-80)+'" cy="'+(cy-4)+'" rx="22" ry="8" fill="#fff" stroke="'+C.ink+'" stroke-width="3"/>';
  var lx=w*.46;
  s+='<line x1="'+lx+'" y1="'+sy+'" x2="'+lx+'" y2="'+(sy+18)+'" stroke="'+C.ink+'" stroke-width="3"/><ellipse cx="'+lx+'" cy="'+(sy+58)+'" rx="26" ry="40" fill="'+C.noren+'" stroke="'+C.ink+'" stroke-width="3"/>';
  for(var ll=-24;ll<=24;ll+=12)s+='<line x1="'+(lx-24)+'" y1="'+(sy+58+ll)+'" x2="'+(lx+24)+'" y2="'+(sy+58+ll)+'" stroke="#8f2233" stroke-width="2"/>';
  s+='<rect x="'+(w*.44-70)+'" y="'+(sy+20)+'" width="34" height="'+(h-sy-30)+'" fill="#fff6e2" stroke="'+C.ink+'" stroke-width="3"/>';
  ["2","4","/","7"].forEach(function(t,i3){s+=txt(w*.44-53,sy+50+i3*30,22,C.noren,t);});
  var bx=w*.18,by=h-10;
  s+='<g stroke="'+C.ink+'" stroke-width="3"><path d="M'+bx+' '+by+'Q'+(bx+10)+' '+(by-60)+' '+(bx-20)+' '+(by-110)+'" fill="none" stroke-width="9"/><path d="M'+bx+' '+by+'Q'+(bx+10)+' '+(by-60)+' '+(bx-20)+' '+(by-110)+'" fill="none" stroke="#5b3b2e" stroke-width="4"/>';
  [[-60,-110,70,22],[30,-80,60,18],[-10,-150,55,18]].forEach(function(t){s+='<ellipse cx="'+(bx+t[0])+'" cy="'+(by+t[1])+'" rx="'+t[2]+'" ry="'+t[3]+'" fill="'+C.pine+'"/>';});
  return s+"</g></svg>";
};
})();
