const fs=require('fs');
const P="M14,122 C40,148 72,134 88,104 C98,86 106,72 114,58";
const cols=[["#ff4a4a","#c92a3a","#ff9a8a"],["#ff9a2a","#d96a0e","#ffcf80"],["#ffe83a","#e0b414","#fff8a0"],["#3fdc5a","#1fa63e","#98f5a8"],["#3a9bff","#1f62d0","#9bd0ff"]];
const off=(i)=>{const k=(i-2)*7.2;return `translate(${k},${k})`};
let o='';
o+=`<g stroke-linecap="round" stroke-linejoin="round" fill="none">`;
for(let i=0;i<5;i++) o+=`<path d="${P}" transform="${off(i)}" stroke="#1b1b1b" stroke-width="18"/>`;
for(let i=0;i<5;i++){const [b,s,h]=cols[i];
 o+=`<path d="${P}" transform="${off(i)}" stroke="${b}" stroke-width="8.4"/>`;
 o+=`<path d="${P}" transform="${off(i)} translate(2.4,2.4)" stroke="${s}" stroke-width="3"/>`;
 o+=`<path d="${P}" transform="${off(i)} translate(-2.4,-2.4)" stroke="${h}" stroke-width="2.4"/>`;}
o+=`<path d="${P}" transform="translate(-17,-17)" stroke="#fff" stroke-width="2" opacity=".6" stroke-dasharray="14 20"/>`;
o+=`</g>`;
// star
let pts=[];for(let k=0;k<10;k++){const r=k%2?20:42,a=(-90+k*36)*Math.PI/180;pts.push((r*Math.cos(a)).toFixed(1)+','+(r*Math.sin(a)).toFixed(1));}
const star='M'+pts.join(' L')+'Z';
const sp='<path d="M0,-10 Q1.5,-1.5 10,0 Q1.5,1.5 0,10 Q-1.5,1.5 -10,0 Q-1.5,-1.5 0,-10Z"';
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
<defs>
<path id="st" d="${star}"/>
<clipPath id="cS"><use href="#st"/></clipPath>
<radialGradient id="gGl"><stop offset="0" stop-color="#fff6a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffd23a" stop-opacity="0"/></radialGradient>
<linearGradient id="gSt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff27a"/><stop offset="1" stop-color="#ffb41c"/></linearGradient>
</defs>
<g stroke-linejoin="round" transform="translate(80,80) scale(.85) translate(-85,-80)">
<circle cx="114" cy="52" r="44" fill="url(#gGl)"/>
${o}
<g transform="translate(116,50) rotate(10)">
<use href="#st" fill="#1b1b1b" stroke="#1b1b1b" stroke-width="14"/>
<use href="#st" fill="url(#gSt)"/>
<g clip-path="url(#cS)">
<path d="M10,-50 L50,-50 L50,50 L-10,50 Q16,10 10,-50Z" fill="#f09410"/>
<path d="M-50,-50 L-6,-50 Q-10,-10 -50,0Z" fill="#fffbc0"/>
<path d="M-8,2 L20,-10 L10,24 L-6,40Z" fill="#ffa81c" opacity=".0"/>
</g>
<g fill="none" stroke="#1b1b1b" stroke-width="2.5">
<path d="M0,0 L0,-42 M0,0 L40,-13 M0,0 L25,34 M0,0 L-25,34 M0,0 L-40,-13" opacity=".0"/>
<path d="M0,-20 L0,-4 M19,-6 L5,-1 M12,16 L3,5 M-12,16 L-3,5 M-19,-6 L-5,-1" opacity=".55"/>
</g>
<use href="#st" fill="none" stroke="#1b1b1b" stroke-width="5"/>
<path d="M-24,-16 Q-18,-30 -6,-34" fill="none" stroke="#fff" stroke-width="6" opacity=".5" stroke-linecap="round"/>
<ellipse cx="-16" cy="-24" rx="7" ry="3.4" fill="#fff" opacity=".93" transform="rotate(-40 -16 -24)"/>
<circle cx="-9" cy="-31" r="2.2" fill="#fff" opacity=".93"/>
</g>
<g transform="translate(28,60)">${sp} fill="#fff6a8" stroke="#1b1b1b" stroke-width="2.5"/></g>
<g transform="translate(58,26) scale(.8)">${sp} fill="#bfeaff" stroke="#1b1b1b" stroke-width="2.5"/></g>
<g transform="translate(142,112) scale(.9)">${sp} fill="#fff6a8" stroke="#1b1b1b" stroke-width="2.5"/></g>
<g transform="translate(118,142) scale(.55)">${sp} fill="#ffd1f0" stroke="#1b1b1b" stroke-width="3"/></g>
</g>
</svg>`;
fs.writeFileSync(require('path').join(__dirname, 'trail.svg'), svg);
