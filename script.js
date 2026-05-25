  // Very small snake game with simple UI
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const themeBtn = document.getElementById('themeBtn');

  const TILE = 20;
  const COLS = Math.floor(canvas.width / TILE);
  const ROWS = Math.floor(canvas.height / TILE);

  let snake = [{x:5,y:5}];
  let dir = {x:1,y:0};
  let food = null;
  let score = 0;
  let running = false;
  let tickInterval = null;

  const HIGH_KEY = 'simple_snake_high';
  let highscore = parseInt(localStorage.getItem(HIGH_KEY) || '0', 10);
  highEl.textContent = highscore;

  function placeFood(){
    while(true){
      const x = Math.floor(Math.random()*COLS);
      const y = Math.floor(Math.random()*ROWS);
      if(!snake.some(s=>s.x===x&&s.y===y)){ food={x,y}; break; }
    }
  }

  function reset(){
    snake = [{x:Math.floor(COLS/2),y:Math.floor(ROWS/2)}];
    dir={x:1,y:0}; score=0; running=false; updateScore(); placeFood(); draw();
    clearInterval(tickInterval);
  }

  function updateScore(){ scoreEl.textContent = score; highEl.textContent = highscore; }

  function tick(){
    if(!running) return;
    const head = {x:snake[0].x+dir.x, y:snake[0].y+dir.y};
    // wall
    if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS){ endGame(); return; }
    // self
    if(snake.some(s=>s.x===head.x&&s.y===head.y)){ endGame(); return; }
    snake.unshift(head);
    if(food && head.x===food.x&&head.y===food.y){ score++; placeFood(); updateScore(); } else { snake.pop(); }
  }

  function draw(){
    // background
    ctx.fillStyle='#020204'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // subtle grid
    ctx.strokeStyle='rgba(255,255,255,0.02)'; ctx.lineWidth=1;
    for(let x=0;x<=COLS;x++){ ctx.beginPath(); ctx.moveTo(x*TILE,0); ctx.lineTo(x*TILE,canvas.height); ctx.stroke(); }
    for(let y=0;y<=ROWS;y++){ ctx.beginPath(); ctx.moveTo(0,y*TILE); ctx.lineTo(canvas.width,y*TILE); ctx.stroke(); }

    // food glow
    if(food){ ctx.fillStyle='#ffcc00'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 12; ctx.fillRect(food.x*TILE+2, food.y*TILE+2, TILE-4, TILE-4); ctx.shadowBlur=0; }

    // snake
    snake.forEach((s,i)=>{
      if(i===0){ ctx.fillStyle='#3bf0ff'; ctx.shadowColor='#3bf0ff'; ctx.shadowBlur=18; }
      else { ctx.fillStyle='#7ef2d6'; ctx.shadowBlur=6; }
      ctx.fillRect(s.x*TILE+2, s.y*TILE+2, TILE-4, TILE-4);
      ctx.shadowBlur=0;
    });
  }

  function startGame(){
    if(!running){ running=true; clearInterval(tickInterval); tickInterval = setInterval(()=>{ tick(); draw(); }, 120); pauseBtn.textContent = 'Pause'; }
  }

  function togglePause(){
    if(running){
      running = false; clearInterval(tickInterval); pauseBtn.textContent = 'Resume';
    } else {
      startGame();
    }
  }

  function endGame(){ running=false; clearInterval(tickInterval); if(score>highscore){ highscore=score; localStorage.setItem(HIGH_KEY,String(highscore)); } updateScore(); }

  // controls
  startBtn.addEventListener('click', ()=>{ startGame(); });
  pauseBtn.addEventListener('click', ()=>{ togglePause(); });
  restartBtn.addEventListener('click', ()=>{ reset(); });

  // theme toggle
  themeBtn.addEventListener('click', ()=>{
    const isLight = document.body.classList.toggle('light');
    themeBtn.textContent = isLight ? 'Dark' : 'Light';
  });

  // keyboard with pause on unwanted keys
  function isControlKey(e){
    const k = e.key;
    const code = e.code;
    if(code==='Space') return true;
    if(k==='ArrowUp' || k==='ArrowDown' || k==='ArrowLeft' || k==='ArrowRight') return true;
    return false;
  }

  document.addEventListener('keydown', e=>{
    if(isControlKey(e)){
      // prevent default page scrolling for arrows/space
      e.preventDefault();
      if(e.key==='ArrowUp' && dir.y===0) dir={x:0,y:-1};
      if(e.key==='ArrowDown' && dir.y===0) dir={x:0,y:1};
      if(e.key==='ArrowLeft' && dir.x===0) dir={x:-1,y:0};
      if(e.key==='ArrowRight' && dir.x===0) dir={x:1,y:0};
      if(e.code==='Space') reset();
    } else {
      // pause on any other key while running
      if(running) togglePause();
    }
  });

  // init
  reset(); draw();
