    drawRect(s.x,s.y,t,idx===0);
// Very small snake game
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

const TILE = 20;
const COLS = canvas.width / TILE;
const ROWS = canvas.height / TILE;

let snake = [{x:5,y:5}];
let dir = {x:1,y:0};
let food = null;
let score = 0;
let running = true;

function placeFood(){
  while(true){
    const x = Math.floor(Math.random()*COLS);
    const y = Math.floor(Math.random()*ROWS);
    if(!snake.some(s=>s.x===x&&s.y===y)){ food={x,y}; break; }
  }
}

function reset(){
  snake = [{x:5,y:5}]; dir={x:1,y:0}; score=0; running=true; placeFood(); updateScore();
}

function updateScore(){ scoreEl.textContent = score; }

function tick(){
  if(!running) return;
  const head = {x:snake[0].x+dir.x, y:snake[0].y+dir.y};
  // wall
  if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS){ running=false; return; }
  // self
  if(snake.some(s=>s.x===head.x&&s.y===head.y)){ running=false; return; }
  snake.unshift(head);
  if(food && head.x===food.x&&head.y===food.y){ score++; placeFood(); updateScore(); } else { snake.pop(); }
}

function draw(){
  ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
  // food
  if(food){ ctx.fillStyle='red'; ctx.fillRect(food.x*TILE, food.y*TILE, TILE, TILE); }
  // snake
  ctx.fillStyle='lime'; snake.forEach((s,i)=>{ ctx.fillStyle = i===0 ? '#0f0' : '#6f6'; ctx.fillRect(s.x*TILE, s.y*TILE, TILE-1, TILE-1); });
}

document.addEventListener('keydown', e=>{
  if(e.key==='ArrowUp') dir={x:0,y:-1};
  if(e.key==='ArrowDown') dir={x:0,y:1};
  if(e.key==='ArrowLeft') dir={x:-1,y:0};
  if(e.key==='ArrowRight') dir={x:1,y:0};
  if(e.code==='Space') reset();
});

placeFood(); updateScore();
setInterval(()=>{ tick(); draw(); }, 120);
