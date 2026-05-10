/* Shared camera page logic — included by kamera[1-5].html */

// ─── CLOCK ───────────────────────────────────────────────────────
function startClock(){
  function tick(){
    const n=new Date();
    const d=n.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'});
    const t=n.toLocaleTimeString('tr-TR');
    const el=document.getElementById('cam-clock');
    if(el) el.textContent=d+' '+t;
  }
  tick(); setInterval(tick,1000);
}

// ─── ROAD CANVAS ─────────────────────────────────────────────────
function initCameraCanvas(cfg){
  const canvas = document.getElementById('cam-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize(){
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let frame=0, detected=false, scanPhase=0, alertAlpha=0, videoShown=false;

  // Detection state
  let bbox = {x:0,y:0,w:0,h:0,alpha:0};
  let animalAlpha = 0;

  function drawScene(){
    // Sky gradient
    const sky=ctx.createLinearGradient(0,0,0,H*.55);
    sky.addColorStop(0,'#020a02');
    sky.addColorStop(1,'#050e05');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);

    // Stars
    if(!detected){
      ctx.fillStyle='rgba(200,255,210,.6)';
      const stars=[[.1,.1],[.3,.05],[.5,.08],[.7,.12],[.9,.06],[.2,.2],[.8,.15],[.15,.3],[.85,.25]];
      stars.forEach(([sx,sy])=>{
        ctx.beginPath();ctx.arc(sx*W,sy*H*.55,1,0,Math.PI*2);ctx.fill();
      });
    }

    // Ground/grass sides
    ctx.fillStyle='#060f06';
    ctx.beginPath();
    ctx.moveTo(0,H*.55); ctx.lineTo(W,H*.55);
    ctx.lineTo(W,H); ctx.lineTo(0,H);
    ctx.closePath(); ctx.fill();

    // Road (perspective trapezoid)
    const vp = {x:W/2, y:H*.52};
    const roadW_near = W*.72, roadW_far = W*.08;
    const roadTop = H*.52, roadBot = H;

    ctx.fillStyle='#0b0b0b';
    ctx.beginPath();
    ctx.moveTo(vp.x-roadW_far/2, roadTop);
    ctx.lineTo(vp.x+roadW_far/2, roadTop);
    ctx.lineTo(vp.x+roadW_near/2, roadBot);
    ctx.lineTo(vp.x-roadW_near/2, roadBot);
    ctx.closePath(); ctx.fill();

    // Road texture
    ctx.fillStyle='rgba(20,30,20,.3)';
    for(let ry=roadTop;ry<roadBot;ry+=4){
      const t=(ry-roadTop)/(roadBot-roadTop);
      const lx=vp.x-(roadW_far/2+t*(roadW_near/2-roadW_far/2));
      const rx=vp.x+(roadW_far/2+t*(roadW_near/2-roadW_far/2));
      if(Math.random()>.85) {ctx.fillRect(lx+(rx-lx)*.1, ry, (rx-lx)*.8, 2);}
    }

    // Center line dashes
    ctx.strokeStyle='rgba(255,220,0,.7)';
    ctx.lineWidth=Math.max(1,W*.002);
    ctx.setLineDash([]);
    const dashCount=10;
    for(let di=0;di<dashCount;di++){
      const t1=di/dashCount, t2=(di+.45)/dashCount;
      const y1=roadTop+t1*(roadBot-roadTop);
      const y2=roadTop+t2*(roadBot-roadTop);
      const t1m=(t1+t2)/2;
      const x1=vp.x, x2=vp.x;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    }

    // Road edges
    ctx.strokeStyle='rgba(255,255,255,.25)';
    ctx.lineWidth=1.5;
    ctx.setLineDash([6,10]);
    ctx.beginPath();
    ctx.moveTo(vp.x-roadW_far/2,roadTop);ctx.lineTo(vp.x-roadW_near/2,roadBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vp.x+roadW_far/2,roadTop);ctx.lineTo(vp.x+roadW_near/2,roadBot);
    ctx.stroke();
    ctx.setLineDash([]);

    // Trees left
    drawTrees(ctx, W, H, 'left', vp, roadW_far, roadW_near, roadTop, roadBot);
    drawTrees(ctx, W, H, 'right', vp, roadW_far, roadW_near, roadTop, roadBot);

    // Mountain silhouette (far)
    ctx.fillStyle='#070f07';
    ctx.beginPath();
    ctx.moveTo(0,H*.55);
    const mpts=[[0,.52],[.12,.42],[.25,.47],[.35,.37],[.5,.44],[.6,.38],[.7,.45],[.85,.41],[1,.48],[1,.55]];
    mpts.forEach(([mx,my],idx)=>{
      if(idx===0) ctx.moveTo(mx*W,my*H); else ctx.lineTo(mx*W,my*H);
    });
    ctx.lineTo(W,H*.55); ctx.closePath(); ctx.fill();

    // Night vision green overlay
    ctx.fillStyle='rgba(0,50,10,.18)'; ctx.fillRect(0,0,W,H);

    // Animal silhouette (when detected)
    if(detected && animalAlpha>0){
      const anX=W*.5, anY=H*.68;
      const anS=Math.max(1, W*.12/60);
      drawAnimal(ctx, cfg.animal, anX, anY, anS, animalAlpha);
    }

    // Detection bbox
    if(detected && bbox.alpha>0){
      const bx=bbox.x, by=bbox.y, bw=bbox.w, bh=bbox.h;
      ctx.strokeStyle=`rgba(0,255,136,${bbox.alpha})`;
      ctx.lineWidth=2;
      ctx.strokeRect(bx,by,bw,bh);
      // Corner accents
      const cs=12;
      ctx.lineWidth=3;
      [[bx,by],[bx+bw,by],[bx,by+bh],[bx+bw,by+bh]].forEach(([cx,cy],ci)=>{
        const dx=ci%2===0?1:-1, dy=ci<2?1:-1;
        ctx.beginPath();ctx.moveTo(cx+dx*cs,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+dy*cs);ctx.stroke();
      });
      // Label
      if(bbox.alpha>.5){
        ctx.fillStyle=`rgba(0,255,136,${bbox.alpha})`;
        ctx.font=`bold ${Math.max(10,W*.014)}px 'Orbitron',monospace`;
        ctx.fillText(`${cfg.animalLabel} ${Math.floor(cfg.confidence*bbox.alpha)}%`, bx+4, by-6);
      }
    }

    // CCTV noise
    addNoise(ctx,W,H,frame);

    // Scan lines
    addScanLines(ctx,W,H,frame);

    // Alert overlay
    if(detected && alertAlpha>0){
      ctx.fillStyle=`rgba(255,0,0,${alertAlpha*.15*Math.sin(frame*.15)})`;
      ctx.fillRect(0,0,W,H);
    }
  }

  function tick(){
    frame++;
    drawScene();

    if(detected){
      if(scanPhase===1){
        // Scanning animation
        scanPhase=1;
        const sa=Math.min(1,(frame-detFrame)/60);
        // bbox grows
        const targetX=W*.3, targetY=H*.52, targetW=W*.4, targetH=H*.3;
        bbox.x = W*.3 + Math.sin(frame*.05)*W*.1;
        bbox.y = H*.5 + Math.sin(frame*.07)*H*.05;
        bbox.w = W*.3 + Math.sin(frame*.03)*W*.1;
        bbox.h = H*.2;
        bbox.alpha = Math.min(.8, sa*.8);
        if(sa>.8){
          // Lock on
          bbox.x=targetX; bbox.y=targetY; bbox.w=targetW; bbox.h=targetH;
          bbox.alpha=1;
          scanPhase=2;
          alertAlpha=1;
        }
      }else if(scanPhase===2){
        // Lock on - show animal
        animalAlpha = Math.min(1, animalAlpha+.05);
        if(animalAlpha>=1 && !videoShown){
          videoShown=true;
          setTimeout(showVideo, 1200);
        }
      }
    }

    requestAnimationFrame(tick);
  }

  let detFrame=0;
  window.triggerDetection = function(){
    if(detected) return;
    detected=true; detFrame=frame; scanPhase=1;
    document.getElementById('det-btn').disabled=true;
    document.getElementById('det-btn').textContent='TARANIYORR...';
    document.getElementById('status-text').textContent='AI TARAMA AKTIF';
    document.getElementById('status-text').style.color='#ffaa00';
    playBeep();
  };

  tick();

  // Compute animal bbox target
  bbox = {x:W*.3, y:H*.52, w:W*.4, h:H*.3, alpha:0};

  window.addEventListener('resize', ()=>{
    bbox = {x:W*.3, y:H*.52, w:W*.4, h:H*.3, alpha:bbox.alpha};
  });
}

function drawTrees(ctx, W, H, side, vp, roadW_far, roadW_near, roadTop, roadBot){
  const count=6;
  for(let i=0;i<count;i++){
    const t=i/count;
    const y=roadTop+t*(roadBot-roadTop);
    const roadEdge=side==='left'
      ? vp.x-(roadW_far/2+t*(roadW_near/2-roadW_far/2))
      : vp.x+(roadW_far/2+t*(roadW_near/2-roadW_far/2));
    const treeX=side==='left' ? roadEdge-t*W*.08 : roadEdge+t*W*.08;
    const treeH=t*H*.2+H*.05;
    const treeW=treeH*.4;
    // Trunk
    ctx.fillStyle='#050c05';
    ctx.fillRect(treeX-treeW*.06, y-treeH*.2, treeW*.12, treeH*.2);
    // Foliage (triangle)
    ctx.fillStyle=`hsl(120,${30+t*20}%,${4+t*4}%)`;
    ctx.beginPath();
    ctx.moveTo(treeX, y-treeH);
    ctx.lineTo(treeX-treeW/2, y-treeH*.2);
    ctx.lineTo(treeX+treeW/2, y-treeH*.2);
    ctx.closePath(); ctx.fill();
    // Second tier
    ctx.beginPath();
    ctx.moveTo(treeX, y-treeH*.65);
    ctx.lineTo(treeX-treeW*.65, y-treeH*.1);
    ctx.lineTo(treeX+treeW*.65, y-treeH*.1);
    ctx.closePath(); ctx.fill();
  }
}

function addNoise(ctx,W,H,frame){
  if(frame%2!==0) return;
  const id=ctx.createImageData(W,H);
  const d=id.data;
  for(let i=0;i<d.length;i+=4*8){
    if(Math.random()>.97){
      d[i]=d[i+4]=d[i+8]=10;
      d[i+1]=d[i+5]=d[i+9]=Math.floor(Math.random()*40)+10;
      d[i+2]=d[i+6]=d[i+10]=10;
      d[i+3]=d[i+7]=d[i+11]=Math.floor(Math.random()*60);
    }
  }
  ctx.putImageData(id,0,0);
}

function addScanLines(ctx,W,H,frame){
  for(let y=0;y<H;y+=3){
    ctx.fillStyle='rgba(0,0,0,.12)';
    ctx.fillRect(0,y,W,1);
  }
  // Moving bright scan
  const sy=((frame*1.8)%(H+60))-30;
  const sg=ctx.createLinearGradient(0,sy-15,0,sy+15);
  sg.addColorStop(0,'transparent');
  sg.addColorStop(.5,'rgba(0,255,136,.06)');
  sg.addColorStop(1,'transparent');
  ctx.fillStyle=sg; ctx.fillRect(0,sy-15,W,30);
}

function drawAnimal(ctx, type, x, y, scale, alpha){
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.strokeStyle='rgba(0,255,136,1)';
  ctx.fillStyle='rgba(0,20,5,.7)';
  ctx.lineWidth=2/scale;
  ctx.translate(x,y);
  ctx.scale(scale,scale);

  if(type==='deer' || type==='goat'){
    // Body
    ctx.beginPath();ctx.ellipse(0,0,22,12,-.1,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    // Head
    ctx.beginPath();ctx.ellipse(26,-10,8,6,-.3,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    // Legs
    [[-12,0],[-5,0],[5,0],[14,0]].forEach(([lx,_])=>{
      ctx.beginPath();ctx.moveTo(lx,10);ctx.lineTo(lx+1,26);ctx.stroke();
    });
    // Antlers
    if(type==='deer'){
      ctx.beginPath();ctx.moveTo(22,-15);ctx.lineTo(18,-27);ctx.lineTo(15,-21);
      ctx.moveTo(18,-27);ctx.lineTo(20,-30);ctx.stroke();
      ctx.beginPath();ctx.moveTo(28,-15);ctx.lineTo(32,-27);ctx.lineTo(30,-21);
      ctx.moveTo(32,-27);ctx.lineTo(33,-31);ctx.stroke();
    } else {
      // Horns for goat
      ctx.beginPath();ctx.moveTo(22,-15);ctx.quadraticCurveTo(18,-28,22,-32);ctx.stroke();
      ctx.beginPath();ctx.moveTo(28,-15);ctx.quadraticCurveTo(32,-28,28,-32);ctx.stroke();
    }
    // Tail
    ctx.beginPath();ctx.moveTo(-22,0);ctx.lineTo(-28,-4);ctx.stroke();

  } else if(type==='wolf' || type==='fox'){
    // Body
    ctx.beginPath();ctx.ellipse(0,0,20,10,0,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    // Head
    ctx.beginPath();ctx.ellipse(22,-8,9,7,-.2,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    // Snout
    ctx.beginPath();ctx.ellipse(30,-8,5,4,0,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    // Ears
    ctx.beginPath();ctx.moveTo(17,-14);ctx.lineTo(14,-22);ctx.lineTo(20,-18);ctx.closePath();
    ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(24,-14);ctx.lineTo(22,-22);ctx.lineTo(28,-18);ctx.closePath();
    ctx.fill();ctx.stroke();
    // Legs
    [[-10,0],[-3,0],[5,0],[12,0]].forEach(([lx,_])=>{
      ctx.beginPath();ctx.moveTo(lx,9);ctx.lineTo(lx,24);ctx.stroke();
    });
    // Tail
    ctx.beginPath();ctx.moveTo(-20,0);ctx.quadraticCurveTo(-35,-10,-30,-20);ctx.stroke();

  } else if(type==='boar'){
    // Body (bulkier)
    ctx.beginPath();ctx.ellipse(0,2,25,14,0,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    // Head
    ctx.beginPath();ctx.ellipse(26,-4,12,9,-.1,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    // Snout
    ctx.beginPath();ctx.ellipse(37,-5,6,5,0,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    // Tusks
    ctx.strokeStyle='rgba(200,255,200,.8)';
    ctx.beginPath();ctx.moveTo(36,-2);ctx.quadraticCurveTo(42,2,40,6);ctx.stroke();
    ctx.strokeStyle='rgba(0,255,136,1)';
    // Legs
    [[-12,0],[-4,0],[6,0],[16,0]].forEach(([lx,_])=>{
      ctx.beginPath();ctx.moveTo(lx,14);ctx.lineTo(lx,28);ctx.stroke();
    });

  } else if(type==='eagle'){
    // Wings
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-30,-15,-50,-5);
    ctx.quadraticCurveTo(-35,-20,-20,-10);ctx.closePath();
    ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(30,-15,50,-5);
    ctx.quadraticCurveTo(35,-20,20,-10);ctx.closePath();
    ctx.fill();ctx.stroke();
    // Body
    ctx.beginPath();ctx.ellipse(0,5,10,15,0,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    // Head
    ctx.beginPath();ctx.arc(0,-10,7,0,Math.PI*2);
    ctx.fill();ctx.stroke();
    // Beak
    ctx.fillStyle='rgba(255,220,0,.8)';
    ctx.beginPath();ctx.moveTo(6,-10);ctx.lineTo(12,-8);ctx.lineTo(6,-7);ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ─── VIDEO OVERLAY ────────────────────────────────────────────────
function showVideo(){
  const ov=document.getElementById('video-overlay');
  if(!ov) return;
  ov.style.display='flex';
  setTimeout(()=>{ov.style.opacity='1';}, 50);
  document.getElementById('status-text').textContent='HAYVAN TESPİT EDİLDİ!';
  document.getElementById('status-text').style.color='#ff3333';
  document.getElementById('det-btn').textContent='TESPİT TAMAMLANDI';
  document.getElementById('alert-bar').style.display='flex';
}

window.closeVideo = function(){
  const ov=document.getElementById('video-overlay');
  ov.style.opacity='0';
  setTimeout(()=>{ov.style.display='none';}, 400);
};

// ─── BEEP ─────────────────────────────────────────────────────────
function playBeep(){
  try{
    const ac=new AudioContext();
    const freqs=[880,660,880];
    freqs.forEach((f,i)=>{
      const osc=ac.createOscillator();
      const gain=ac.createGain();
      osc.connect(gain);gain.connect(ac.destination);
      osc.frequency.value=f;
      gain.gain.setValueAtTime(.3,ac.currentTime+i*.15);
      gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+i*.15+.12);
      osc.start(ac.currentTime+i*.15);
      osc.stop(ac.currentTime+i*.15+.13);
    });
  }catch(e){}
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  startClock();
  if(typeof CAMERA_CFG!=='undefined') initCameraCanvas(CAMERA_CFG);
});
