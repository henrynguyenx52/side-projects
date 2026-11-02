import { E, V, registerShot, ease, prog, lerp, clamp, rr, text, alpha, glow, circle, seg, linGrad, FONTS } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as UI from '/engine/ui2d.js';
import * as FX from '/engine/fx2d.js';
import { TRAVELER, AGENT } from '../cast.js';
import { airport, FLOOR, suitcase, passport } from '../sets/airport.js';

const talk = (t, a, b) => t >= a && t <= b ? 0.25 + 0.7 * Math.abs(Math.sin(t * 12.5)) : 0;
const blink = t => (t % 3.1) > 3.0;

function dialogue(g, who, lines, t, color = '#f4e4b3') {
  const p = ease.outBack(prog(t, 0.12, 0.55));
  const w = Math.min(E.W * 0.82, V(1250, 950)), h = lines.length > 1 ? 132 : 104, x = (E.W-w)/2, y = E.H * 0.075;
  g.save(); g.globalAlpha *= clamp(p); g.translate(E.W/2,y+h/2); g.scale(0.94+0.06*p,0.94+0.06*p); g.translate(-E.W/2,-y-h/2);
  rr(g,x,y,w,h,24); g.fillStyle='rgba(10,20,31,.9)'; g.fill(); g.strokeStyle=alpha(color,.8); g.lineWidth=3; g.stroke();
  text(g,who.toUpperCase(),x+30,y+29,{size:20,align:'left',color,weight:900,font:FONTS.ui,spacing:2});
  lines.forEach((line,i)=>text(g,line,E.W/2,y+66+i*38,{size:V(34,38),color:'#ffffff',font:FONTS.ui,weight:800}));
  g.restore();
}

function pair(g,t,o={}) {
  const { floor } = airport(g,t);
  const tx=E.W*0.34, ax=E.W*0.66, s=V(1.65,1.6);
  suitcase(g,tx-105,floor-4,1.05);
  drawFigure(g,{x:tx,y:floor,s,facing:1,outfit:TRAVELER,pose:breathe(o.travelerPose||POSES.relaxed,t),expr:o.travelerExpr||'smile',talk:o.travelerTalk||0,blink:blink(t),rim:{color:'#ffd18f',dir:[-1,-1],w:4}});
  drawFigure(g,{x:ax,y:floor-5,s,facing:-1,outfit:AGENT,pose:breathe(o.agentPose||POSES.relaxed,t,1,2),expr:o.agentExpr||'smile',talk:o.agentTalk||0,blink:blink(t+1.4),rim:{color:'#b8e4ef',dir:[1,-1],w:4}});
  return {floor,tx,ax,s};
}

registerShot('s001',{draw(g,t){
  airport(g,t); FX.dust(g,t,{count:34,color:'#d6e7ef',a:.16});
  const k=ease.inOut(prog(t,.3,2.6));
  text(g,'ENGLISH AT THE',E.W/2,E.H*.43,{size:V(50,54),color:'#e7eef2',weight:900,font:FONTS.ui,spacing:4,alpha:k});
  text(g,'AIRPORT',E.W/2,E.H*.54,{size:V(108,100),color:'#f0c46e',weight:900,font:FONTS.ui,spacing:5,glow:24,glowColor:'rgba(240,160,70,.5)',alpha:k});
  text(g,'CHECKING IN',E.W/2,E.H*.65,{size:V(34,40),color:'#a9d8e7',weight:900,font:FONTS.ui,spacing:5,alpha:k});
}});

registerShot('s002',{draw(g,t){
  const {floor}=airport(g,t); const s=V(1.65,1.6); const k=ease.inOut(prog(t,0,1.2)); const tx=lerp(E.W*.12,E.W*.34,k);
  suitcase(g,tx-105,floor-4,1.05); seg(g,[[tx-92,floor-92],[tx-62,floor-150]],6,'#202a35');
  drawFigure(g,{x:tx,y:floor,s,facing:1,outfit:TRAVELER,pose:k<.96?walkPose(t*8):breathe(POSES.talk,t),expr:'smile',talk:talk(t,1.0,4.7),rim:{color:'#ffd18f',dir:[-1,-1],w:4}});
  drawFigure(g,{x:E.W*.66,y:floor-5,s,facing:-1,outfit:AGENT,pose:breathe(POSES.relaxed,t,1,2),expr:'smile',blink:blink(t),rim:{color:'#b8e4ef',dir:[1,-1],w:4}});
  dialogue(g,'Traveler',["Good morning. I'd like to check in","for my flight to London."],t,'#f0c46e');
}});

registerShot('s003',{draw(g,t){
  airport(g,t); const M='#a9d8e7';
  bigFace(g,E.W*.67,E.H*.58,V(245,270),{outfit:AGENT,expr:'smile',talk:talk(t,.3,3.5),look:[-.45,0],rimColor:M,rimSide:1,blink:blink(t)});
  dialogue(g,'Check-in agent',['May I see your passport, please?'],t,M);
  passport(g,E.W*.28,E.H*.63,1.7,-.08); glow(g,E.W*.28,E.H*.63,120,'#d9a553',.18);
}});

registerShot('s004',{draw(g,t){
  airport(g,t); const p=ease.inOut(prog(t,.45,2.3)); const x=lerp(E.W*.28,E.W*.69,p), y=E.H*.58-Math.sin(p*Math.PI)*90;
  seg(g,[[E.W*.15,E.H*.78],[x-30,y+35]],42,'#111922'); seg(g,[[E.W*.13,E.H*.81],[x-55,y+65]],56,TRAVELER.color);
  seg(g,[[E.W*.86,E.H*.75],[E.W*.7,E.H*.61]],42,'#111922'); seg(g,[[E.W*.9,E.H*.8],[E.W*.73,E.H*.65]],56,AGENT.color);
  passport(g,x,y,1.45,-.12+.18*p); FX.rings(g,x,y,t,{count:2,r0:40,r1:170,speed:.65,color:'#f0c46e',a:.3});
  dialogue(g,'Traveler',['Of course. Here you are.'],t,'#f0c46e');
}});

registerShot('s005',{draw(g,t){
  const {floor,tx,ax}=pair(g,t,{agentPose:posesAt(t,[[0,POSES.relaxed],[.4,POSES.point]]),agentTalk:talk(t,.2,4.4)});
  dialogue(g,'Check-in agent',['Do you have any bags to check?'],t,'#a9d8e7');
  const pulse=.5+.5*Math.sin(t*4); glow(g,E.W*.84,floor-55,95,'#78c9df',.08+.1*pulse);
}});

registerShot('s006',{draw(g,t){
  const {floor}=airport(g,t); const p=ease.inOut(prog(t,.8,3.2)); const sx=lerp(E.W*.27,E.W*.84,p), sy=lerp(floor-4,floor-56,p)-Math.sin(p*Math.PI)*110;
  drawFigure(g,{x:E.W*.34,y:floor,s:V(1.65,1.6),facing:1,outfit:TRAVELER,pose:posesAt(t,[[0,POSES.relaxed],[.6,POSES.reach],[3.2,POSES.relaxed]]),expr:'smile',talk:talk(t,0,1.5),rim:{color:'#ffd18f',dir:[-1,-1],w:4}});
  drawFigure(g,{x:E.W*.66,y:floor-5,s:V(1.65,1.6),facing:-1,outfit:AGENT,pose:posesAt(t,[[0,POSES.relaxed],[1.7,POSES.point]]),expr:'smile',talk:talk(t,2.0,4.6),rim:{color:'#b8e4ef',dir:[1,-1],w:4}});
  suitcase(g,sx,sy,1.08); if(p>.95) FX.rings(g,sx,sy,t-3,{count:2,r0:30,r1:140,speed:1.1,color:'#9bd9e8',a:.35});
  dialogue(g,t<2?'Traveler':'Check-in agent',t<2?['Yes, one suitcase.']:['Please place it on the scale.'],t,t<2?'#f0c46e':'#a9d8e7');
}});

registerShot('s007',{draw(g,t){
  UI.blueprint(g,{grid:64,a:.08});
  text(g,'KEY PHRASES',E.W/2,E.H*.16,{size:V(62,66),color:'#f0c46e',weight:900,font:FONTS.ui,spacing:4,glow:18,glowColor:'rgba(240,170,80,.4)'});
  const rows=[["I'D LIKE TO CHECK IN",'Start the check-in'],['MAY I SEE YOUR PASSPORT?','A polite request'],['HERE YOU ARE','Giving something'],['BAGS TO CHECK','Checked baggage']];
  rows.forEach((r,i)=>{const p=ease.outBack(prog(t,.3+i*.55,.8+i*.55));const y=E.H*.31+i*E.H*.145;g.save();g.globalAlpha*=clamp(p);g.translate((1-p)*-100,0);rr(g,E.W*.16,y-34,E.W*.68,72,18);g.fillStyle=alpha('#dcecf2',.08);g.fill();g.strokeStyle=alpha(i%2?'#a9d8e7':'#f0c46e',.55);g.lineWidth=2;g.stroke();text(g,r[0],E.W*.19,y,{size:V(29,34),align:'left',color:i%2?'#a9d8e7':'#f0c46e',weight:900,font:FONTS.ui});text(g,r[1],E.W*.81,y,{size:V(20,24),align:'right',color:'#d9e3e8',weight:700,font:FONTS.ui});g.restore();});
}});
