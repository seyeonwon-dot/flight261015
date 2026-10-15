'use strict';
// Screen-space cinema pass. No pixel readback; all effects remain GPU canvas draws.
class CinemaFX {
  constructor(canvas){
    this.canvas=canvas;this.w=600;this.h=960;this.mode=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'soft':'cinema';
    this.capture=document.createElement('canvas');this.capture.width=600;this.capture.height=960;this.captureCtx=this.capture.getContext('2d');
    this.textures={};this.time=0;this.reset();
    for(const [name,stops] of Object.entries({fire:[[0,'#ffffff'],[.13,'#fff8be'],[.3,'#ffd568'],[.58,'#ff6c2133'],[1,'#ff391000']],blue:[[0,'#ffffff'],[.16,'#c4ffff'],[.4,'#42cfff70'],[1,'#238aff00']],smoke:[[0,'#31394bc0'],[.4,'#28334288'],[1,'#18253600']]})){
      const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),grad=g.createRadialGradient(64,64,0,64,64,64);stops.forEach(([p,c])=>grad.addColorStop(p,c));g.fillStyle=grad;g.fillRect(0,0,128,128);this.textures[name]=c;
    }
  }
  reset(){this.sparks=[];this.puffs=[];this.shards=[];this.waves=[];this.flares=[];this.bursts=[];this.ghosts=[];this.events=[];this.trauma=0;this.kickX=0;this.kickY=0;this.stop=0;this.slow=0;this.damage=0;this.chromatic=0;this.letterbox=0;this.muzzle=0;this.time=0;this.demo=false;this.demoTime=0;this.demoBeat=-1;}
  setMode(mode){this.mode=mode;}
  get strength(){return this.mode==='cinema'?1:this.mode==='normal'?.6:.15;}
  impulse(power,x=0,y=1){this.trauma=Math.min(1,Math.max(this.trauma,power));this.kickX=clamp(x,-1,1)*power*5;this.kickY=clamp(y,-1,1)*power*6;}
  impact(x,y,shield=false,source=null){
    const dx=source?x-source.x:0,dy=source?y-source.y:1,m=Math.hypot(dx,dy)||1;
    this.impulse(shield?.55:.84,dx/m,dy/m);this.stop=shield?.035:.055;this.slow=shield?.15:.32;this.damage=shield?.25:.8;this.chromatic=shield?.35:.85;
    this.explosion(x,y,shield?.7:1.1,shield?'blue':'fire',false);
    this.wave(x,y,shield?'#81fff1':'#ffb68a',shield?150:210,.6);
    this.flares.push({x,y,size:shield?240:320,age:0,life:.3,color:shield?'#8bfff2':'#ffbe9d'});
  }
  spark(x,y,color='#b5faff',amount=6,speed=230){for(let i=0;i<amount;i++){const a=Math.random()*Math.PI*2,v=40+Math.random()*speed;this.sparks.push({x,y,px:x,py:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,age:0,life:.16+Math.random()*.38,width:1+Math.random()*2,color})}}
  contact(x,y,power=1){this.spark(x,y,'#bbf8ff',4,180);this.bursts.push({x,y,size:16+power*2,age:0,life:.12,kind:'blue'});if(this.bursts.length>80)this.bursts.shift();}
  wave(x,y,color,radius=200,life=.7){this.waves.push({x,y,color,radius,age:0,life});if(this.waves.length>12)this.waves.shift();}
  explosion(x,y,size=1,kind='fire',camera=true){
    this.bursts.push({x,y,size:85*size,age:0,life:.42+size*.08,kind});
    this.flares.push({x,y,size:145*size,age:0,life:.16+size*.04,color:kind==='blue'?'#a2fcff':'#ffe1a0'});
    this.wave(x,y,kind==='blue'?'#8dffff':'#ffbf73',85*size,.5+size*.08);
    this.spark(x,y,kind==='blue'?'#a6f8ff':'#ffcf85',Math.floor(24*size),280*size);
    for(let i=0;i<Math.ceil(9*size);i++){const a=Math.random()*6.28,v=40+Math.random()*180*size;this.shards.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,angle:a,spin:(Math.random()-.5)*12,size:2+Math.random()*5*size,age:0,life:.7+Math.random()*.7,color:kind==='blue'?'#9ee9ec':i%2?'#7c7271':'#f2ae67'})}
    for(let i=0;i<Math.ceil(5*size);i++)this.puffs.push({x:x+(Math.random()-.5)*30*size,y:y+(Math.random()-.5)*30*size,vx:(Math.random()-.5)*35,vy:-20-Math.random()*20,age:-i*.035,life:1+size*.35,size:45*size,kind:'smoke'});
    if(camera)this.impulse(size>1.5?.65:.12+size*.08);
    this.cap();
  }
  cap(){for(const [key,max] of [['sparks',700],['puffs',90],['shards',160],['bursts',80],['flares',40],['ghosts',32]])if(this[key].length>max)this[key].splice(0,this[key].length-max);}
  nova(x,y){
    this.impulse(.95);this.stop=.07;this.slow=.65;this.chromatic=1;this.letterbox=.55;
    this.explosion(x,y,2.6,'blue',false);this.wave(x,y,'#c8ffff',1150,1.3);this.wave(x,y,'#ffe1a8',870,1);
    this.flares.push({x,y,size:850,age:0,life:.6,color:'#a3f5ff'});
    for(let i=0;i<8;i++)this.events.push({delay:.08+i*.055,type:'burst',x:x+(Math.random()-.5)*450,y:y+(Math.random()-.5)*400,size:.7,kind:i%2?'blue':'fire'});
  }
  bossDeath(x,y,final){
    this.impulse(1);this.stop=.085;this.slow=1;this.chromatic=1;this.letterbox=final?2.6:1.1;
    for(let i=0;i<18;i++)this.events.push({delay:i*.065,type:'burst',x:x+(Math.random()-.5)*200,y:y+(Math.random()-.5)*140,size:.7+Math.random(),kind:i%4?'fire':'blue'});
    this.events.push({delay:1.15,type:'final',x,y,size:4,kind:'fire'});
  }
  dash(x,y){this.wave(x,y,'#94f9ff',150,.45);this.flares.push({x,y,size:200,age:0,life:.2,color:'#9bfdff'});this.chromatic=Math.max(this.chromatic,.25);this.spark(x,y,'#a3efff',35,260);}
  laser(x,y){this.muzzle=.14;this.flares.push({x,y,size:240,age:0,life:.2,color:'#8ef5ff'});this.impulse(.12,0,1);}
  beam(g,b){g.save();g.globalAlpha=b.life/b.max*.7;for(let side of [-1,1]){g.beginPath();g.moveTo(b.x,b.y);for(let y=b.y;y>0;y-=24){const x=b.x+side*10+Math.sin(y*.13+this.time*37)*7+Math.sin(y*.31-this.time*23)*4;g.lineTo(x,y)}g.lineWidth=1.4;g.strokeStyle='#b6fdff';g.stroke()}g.restore();}
  tick(dt){
    this.time+=dt;this.stop=Math.max(0,this.stop-dt);this.slow=Math.max(0,this.slow-dt);this.trauma=Math.max(0,this.trauma-dt*1.8);this.damage=Math.max(0,this.damage-dt*1.6);this.chromatic=Math.max(0,this.chromatic-dt*2.5);this.letterbox=Math.max(0,this.letterbox-dt);this.muzzle=Math.max(0,this.muzzle-dt);this.kickX*=Math.exp(-dt*15);this.kickY*=Math.exp(-dt*15);
    for(const e of this.events)e.delay-=dt;const ready=this.events.filter(e=>e.delay<=0);this.events=this.events.filter(e=>e.delay>0);for(const e of ready){this.explosion(e.x,e.y,e.size,e.kind,e.type==='final');if(e.type==='final'){this.wave(e.x,e.y,'#fff4d5',800,1.4);this.chromatic=1;this.impulse(1)}}
    for(const s of this.sparks){s.px=s.x;s.py=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=Math.exp(-dt*3);s.vy=s.vy*Math.exp(-dt*3)+25*dt;s.age+=dt}
    for(const s of this.shards){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=Math.exp(-dt*1.4);s.vy+=80*dt;s.angle+=s.spin*dt;s.age+=dt}
    for(const s of this.puffs){s.x+=s.vx*dt;s.y+=s.vy*dt;s.age+=dt}
    for(const key of ['waves','bursts','flares','ghosts'])for(const s of this[key])s.age+=dt;
    for(const key of ['sparks','shards','puffs','waves','bursts','flares','ghosts'])this[key]=this[key].filter(s=>s.age<s.life);
    this.cap();
  }
  get timeScale(){return this.mode==='soft'?1:this.stop>0?.02:this.slow>0?.38+(1-Math.min(1,this.slow))*.4:1;}
  camera(g){
    const a=this.trauma*this.trauma*this.strength,tm=this.time;
    const x=(Math.sin(tm*103)+Math.sin(tm*67+.8)*.5)*a*9+this.kickX*this.strength;
    const y=(Math.cos(tm*97)+Math.sin(tm*53)*.5)*a*7+this.kickY*this.strength;
    g.translate(300+x,480+y);g.rotate(Math.sin(tm*71)*a*.007);const zoom=1.045+a*.018;g.scale(zoom,zoom);g.translate(-300,-480);
  }
  smoke(g){g.save();for(const s of this.puffs){if(s.age<0)continue;const q=s.age/s.life,r=s.size*(.45+q*1.7);g.globalAlpha=Math.sin(q*Math.PI)*.65;g.drawImage(this.textures.smoke,s.x-r,s.y-r,r*2,r*2)}g.restore();}
  light(g){
    g.save();g.globalCompositeOperation='lighter';
    for(const b of this.bursts){const q=b.age/b.life,r=b.size*(.25+Math.sin(q*Math.PI/2)*.9);g.globalAlpha=(1-q)**2;g.drawImage(this.textures[b.kind],b.x-r,b.y-r,r*2,r*2);if(q<.28){g.fillStyle='#fffde3';g.beginPath();g.arc(b.x,b.y,r*.19*(1-q),0,Math.PI*2);g.fill()}}
    for(const w of this.waves){const q=w.age/w.life,r=w.radius*(1-(1-q)**2);g.globalAlpha=(1-q)**2*.85;g.strokeStyle=w.color;g.lineWidth=1+(1-q)*4;g.beginPath();g.ellipse(w.x,w.y,r,r*.86,0,0,Math.PI*2);g.stroke();g.globalAlpha*=.35;g.lineWidth=12*(1-q);g.stroke()}
    for(const s of this.sparks){const q=s.age/s.life;g.globalAlpha=(1-q)**1.4;g.strokeStyle=s.color;g.lineWidth=s.width*(1-q)+.3;g.beginPath();g.moveTo(s.x,s.y);g.lineTo(s.x-s.vx*.028,s.y-s.vy*.028);g.stroke()}
    for(const f of this.flares){const q=f.age/f.life,size=f.size*(.5+q),alpha=(1-q)**3;g.globalAlpha=alpha*.75;const grad=g.createLinearGradient(f.x-size,f.y,f.x+size,f.y);grad.addColorStop(0,'transparent');grad.addColorStop(.4,f.color);grad.addColorStop(.5,'#ffffff');grad.addColorStop(.6,f.color);grad.addColorStop(1,'transparent');g.fillStyle=grad;g.fillRect(f.x-size,f.y-1.5,size*2,3);g.globalAlpha=alpha*.15;g.fillRect(f.x-size*.8,f.y-5,size*1.6,10);g.globalAlpha=alpha;g.drawImage(this.textures.blue,f.x-18,f.y-18,36,36)}
    g.restore();g.save();for(const s of this.shards){g.save();g.globalAlpha=Math.min(1,(1-s.age/s.life)*2);g.translate(s.x,s.y);g.rotate(s.angle);g.fillStyle=s.color;g.beginPath();g.moveTo(-s.size,-s.size*.3);g.lineTo(s.size*.7,-s.size*.5);g.lineTo(s.size*.35,s.size*.5);g.closePath();g.fill();g.restore()}g.restore();
  }
  atmosphere(g,player){
    g.save();g.globalCompositeOperation='screen';const rays=g.createLinearGradient(0,0,600,650);rays.addColorStop(0,'#c8e8d512');rays.addColorStop(1,'transparent');g.fillStyle=rays;for(let i=0;i<4;i++){g.beginPath();g.moveTo(60+i*95,0);g.lineTo(110+i*95,0);g.lineTo(570+i*95,960);g.lineTo(350+i*95,960);g.fill()}g.restore();
    if(player&&player.dashTime>0){g.save();g.globalCompositeOperation='lighter';g.strokeStyle='#9defff';g.lineWidth=1;for(let i=0;i<28;i++){const a=i*2.399,r=170+(i*71)%320;const x=player.x+Math.cos(a)*r,y=player.y+Math.sin(a)*r;g.globalAlpha=.2+Math.sin(i+this.time*30)*.1;g.beginPath();g.moveTo(x,y);g.lineTo(x+(x-player.x)*.25,y+(y-player.y)*.25);g.stroke()}g.restore()}
  }
  post(g){
    const strength=this.strength;
    // A transient screen-space refraction ring, copied once only during a strong impact.
    if(this.chromatic>.12&&strength>.2){this.captureCtx.clearRect(0,0,600,960);this.captureCtx.drawImage(this.canvas,0,0,600,960);const wave=this.waves[this.waves.length-1];if(wave&&wave.age<.55){const q=wave.age/wave.life,r=wave.radius*(1-(1-q)**2);if(r>15){g.save();g.beginPath();g.arc(wave.x,wave.y,r+9,0,Math.PI*2);g.arc(wave.x,wave.y,Math.max(1,r-9),0,Math.PI*2,true);g.clip();g.globalAlpha=.4*strength;g.translate(wave.x,wave.y);g.scale(1.025,1.025);g.translate(-wave.x,-wave.y);g.drawImage(this.capture,0,0);g.restore()}}g.save();g.globalCompositeOperation='screen';g.globalAlpha=this.chromatic*.055*strength;g.drawImage(this.capture,this.chromatic*7,0);g.drawImage(this.capture,-this.chromatic*5,1);g.restore()}
    if(this.damage>0){g.save();const v=g.createRadialGradient(300,560,140,300,480,560);v.addColorStop(0,'transparent');v.addColorStop(1,'rgba(255,75,70,'+this.damage*.42*strength+')');g.fillStyle=v;g.fillRect(0,0,600,960);g.restore()}
    if(this.letterbox>0){g.fillStyle='#031019';const h=Math.min(1,this.letterbox*3)*22*strength;g.fillRect(0,0,600,h);g.fillRect(0,960-h,600,h)}
  }
}
