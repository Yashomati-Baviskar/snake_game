const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('highscore');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const GRID = 20;
let tileCountX = canvas.width / GRID;
let tileCountY = canvas.height / GRID;

let snake = [{x:10,y:10}];
let dir = {x:0,y:0};
let food = {x:15,y:8};
let score = 0;
let highscore = parseInt(localStorage.getItem('neon_high')||'0',10);
let running = false;
let paused = false;
let speed = 8; // ticks per second
let tickInterval = null;

highEl.textContent = highscore;

function resetGame(){
  snake = [{x:10,y:10}];
  dir = {x:0,y:0};
  spawnFood();
  score = 0;
  speed = 8;
  updateScore();
}

function spawnFood(){
  // place food on free tile
  let ok=false;let x,y;
  while(!ok){
    x = Math.floor(Math.random()*tileCountX);
    y = Math.floor(Math.random()*tileCountY);
    ok = !snake.some(s=>s.x===x&&s.y===y);
  }
  food={x,y};
}

function updateScore(){
  scoreEl.textContent = score;
  highEl.textContent = highscore;
}

function gameOver(){
  running=false;clearInterval(tickInterval);
  if(score>highscore){highscore=score;localStorage.setItem('neon_high',String(highscore));}
  updateScore();
  overlay.style.display='flex';
  overlay.querySelector('.menu h2').textContent='Game Over';
  overlay.querySelector('.menu p').textContent=`Score: ${score}. Press Start to play again.`;
}

function draw(){
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // background grid subtle
  ctx.fillStyle='rgba(255,255,255,0.02)';
  for(let i=0;i<tileCountX;i++){
    for(let j=0;j<tileCountY;j++){
      // no op; could draw grid if desired
    }
  }

  // draw food
  drawRect(food.x,food.y,'#ffcc00',true);

  // draw snake
  snake.forEach((s,idx)=>{
    const t = idx===0 ? '#3bf0ff' : '#7ef2d6';
    drawRect(s.x,s.y,t,idx===0);
  });
}

function drawRect(x,y,color,isHead){
  const px = x*GRID;const py = y*GRID;
  ctx.shadowColor = color;
  ctx.shadowBlur = isHead?18:10;
  ctx.fillStyle = color;
  const pad = 2;
  ctx.fillRect(px+pad,py+pad,GRID-pad*2,GRID-pad*2);
  ctx.shadowBlur=0;
}

function tick(){
  if(!running||paused) return;
  // move snake
  const head = {...snake[0]};
  head.x += dir.x; head.y += dir.y;

  // wall collisions
  if(head.x<0||head.x>=tileCountX||head.y<0||head.y>=tileCountY){
    gameOver();return;
  }

  // self collision
  if(snake.some(seg=>seg.x===head.x&&seg.y===head.y)){
    gameOver();return;
  }

  snake.unshift(head);

  // eat food
  if(head.x===food.x&&head.y===food.y){
    score+=10;
    // slight speed increase
    speed = Math.min(22, speed + 0.5);
    restartTick();
    spawnFood();
    updateScore();
    playBeep(800,0.03,0.06);
  } else {
    snake.pop();
  }

  draw();
}

function restartTick(){
  clearInterval(tickInterval);
  tickInterval = setInterval(tick, 1000 / speed);
}

function startGame(){
  resetGame();
  overlay.style.display='none';
  running=true;paused=false;
  restartTick();
}

startBtn.addEventListener('click', ()=>{startGame();});
restartBtn.addEventListener('click', ()=>{resetGame(); startGame();});

pauseBtn.addEventListener('click', ()=>{
  if(!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

// keyboard
window.addEventListener('keydown',(e)=>{
  const key = e.key;
  if(key==='ArrowUp'||key==='w') move(0,-1);
  if(key==='ArrowDown'||key==='s') move(0,1);
  if(key==='ArrowLeft'||key==='a') move(-1,0);
  if(key==='ArrowRight'||key==='d') move(1,0);
});

function move(x,y){
  // prevent reverse
  if(dir.x===-x&&dir.y===-y) return;
  dir={x,y};
}

// simple beep using WebAudio
const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
function playBeep(freq,duration,vol){
  try{
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type='sine';o.frequency.value=freq;
    g.gain.value = vol;
    o.connect(g);g.connect(audioCtx.destination);
    o.start();
    setTimeout(()=>{o.stop()}, duration*1000);
  }catch(e){/* ignore */}
}

// canvas resize for responsiveness
function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  // keep logical size fixed, scale via CSS; update tile counts
  tileCountX = Math.floor(canvas.width/GRID);
  tileCountY = Math.floor(canvas.height/GRID);
}
window.addEventListener('resize',resizeCanvas);
resizeCanvas();

// initial draw
draw();
updateScore();
