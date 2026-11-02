import { E, V, backdrop, linGrad, rr, circle, seg, text, alpha, glow, FONTS } from '/engine/core.js';

export const FLOOR = () => E.H * 0.82;

export function airport(g, t, o = {}) {
  const floor = FLOOR();
  backdrop(g, ['#14243a', '#35536b', '#d6a570']);
  glow(g, E.W * 0.78, E.H * 0.18, E.W * 0.32, '#ffd89a', 0.26);
  g.fillStyle = '#182535'; g.fillRect(0, 0, E.W, E.H * 0.15);
  text(g, 'DEPARTURES', E.W * 0.12, E.H * 0.075, { size: V(30, 34), align: 'left', color: '#eef5f8', font: FONTS.ui, weight: 900, spacing: 2 });
  const boardX = E.W * 0.56, boardY = E.H * 0.055;
  rr(g, boardX, boardY, E.W * 0.33, E.H * 0.095, 12); g.fillStyle = '#101923'; g.fill();
  const flights = [['LONDON','10:40','ON TIME'],['SINGAPORE','11:15','BOARDING'],['TOKYO','12:05','CHECK-IN']];
  flights.forEach((r, i) => {
    const y = boardY + 20 + i * 25; text(g, r[0], boardX + 20, y, { size: 17, align:'left', color:'#f3f6f7', font:FONTS.ui, weight:800 });
    text(g, r[1], boardX + E.W * 0.16, y, { size:17, align:'left', color:'#e8c36d', font:FONTS.ui, weight:800 });
    text(g, r[2], boardX + E.W * 0.235, y, { size:15, align:'left', color:i===0?'#79d6a3':'#c9d6df', font:FONTS.ui, weight:800 });
  });
  g.fillStyle = '#8ea7b4'; g.fillRect(0, E.H * 0.16, E.W, 10);
  for (let i = 0; i < 7; i++) {
    const x = i * E.W / 6; g.fillStyle = alpha('#dbe8ea', 0.13); g.fillRect(x, E.H * 0.17, 4, floor - E.H * 0.17);
  }
  g.fillStyle = linGrad(g, 0, floor, 0, E.H, ['#293846','#121c28']); g.fillRect(0, floor, E.W, E.H - floor);
  for (let i = 0; i < 10; i++) seg(g, [[E.W/2, floor],[i*E.W/9,E.H]], 2, alpha('#b9d0da',0.1));
  g.fillStyle = '#263849'; g.fillRect(E.W * 0.5, floor - 205, E.W * 0.48, 210);
  g.fillStyle = '#41667a'; g.fillRect(E.W * 0.5, floor - 205, E.W * 0.48, 35);
  text(g, 'CHECK-IN  14', E.W * 0.74, floor - 186, { size: 23, color:'#f6e5b5', font:FONTS.ui, weight:900, spacing:2 });
  rr(g, E.W * 0.53, floor - 155, E.W * 0.18, 105, 12); g.fillStyle='#172635'; g.fill();
  g.fillStyle='#1b2835'; g.fillRect(E.W * 0.77, floor - 42, E.W * 0.15, 42);
  g.fillStyle='#637785'; g.fillRect(E.W * 0.785, floor - 52, E.W * 0.12, 10);
  return { floor };
}

export function suitcase(g, x, y, s = 1, o = {}) {
  g.save(); g.translate(x,y); g.scale(s,s);
  rr(g,-42,-82,84,76,12); g.fillStyle=o.color||'#b84b3f'; g.fill();
  g.strokeStyle='#f0b06d'; g.lineWidth=4; g.stroke();
  rr(g,-18,-112,36,34,8); g.strokeStyle='#252d38'; g.lineWidth=7; g.stroke();
  circle(g,-25,0,8,'#101722'); circle(g,25,0,8,'#101722');
  g.fillStyle=alpha('#ffffff',0.35); g.fillRect(-28,-67,8,44);
  g.restore();
}

export function passport(g,x,y,s=1,rot=0) {
  g.save(); g.translate(x,y); g.rotate(rot); g.scale(s,s);
  rr(g,-34,-46,68,92,7); g.fillStyle='#5c2032'; g.fill();
  g.strokeStyle='#d5aa58'; g.lineWidth=3; g.stroke();
  circle(g,0,-5,13,'transparent'); g.strokeStyle='#d5aa58'; g.lineWidth=3; g.stroke();
  text(g,'PASSPORT',0,25,{size:10,color:'#e4c67c',font:FONTS.ui,weight:900});
  g.restore();
}
