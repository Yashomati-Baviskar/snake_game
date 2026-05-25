  // Very small snake game with simple UI
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const themeBtn = document.getElementById('themeBtn');
  const speedSlow = document.getElementById('speedSlow');
  const speedMed = document.getElementById('speedMed');
  const speedFast = document.getElementById('speedFast');
  const levelButtons = Array.from(document.querySelectorAll('.level-btn'));
  const skinButtons = Array.from(document.querySelectorAll('.skin-btn'));
  const typeButtons = Array.from(document.querySelectorAll('.type-btn'));
  const gameOverModal = document.getElementById('gameOverModal');
  const modalScore = document.getElementById('modalScore');
  const modalRestartBtn = document.getElementById('modalRestartBtn');

  const SKIN_KEY = 'snake_skin';
  const skinsConfig = {
    classic: {req:0, head:'#0f0', body:'#6f6', shadow:'#0f0'},
    neon: {req:10, head:'#3bf0ff', body:'#7ef2d6', shadow:'#3bf0ff'},
    gradient: {req:20, head:null, body:null, shadow:'#ff3bca'},
    gold: {req:35, head:'#ffd700', body:'#ffecb3', shadow:'#ffd700'},
    shadow: {req:50, head:'#c16cff', body:'#8b5fbf', shadow:'#c16cff'},
  };
  let selectedSkin = localStorage.getItem(SKIN_KEY) || 'classic';

  // snake types (visual styles) with required score thresholds
  const TYPE_KEY = 'snake_type';
  const typesConfig = {
    block: {req:0},
    rounded: {req:15},
    pixel: {req:30},
    fat: {req:45},
  };
  let selectedType = localStorage.getItem(TYPE_KEY) || 'block';

  const TILE = 20;
  const COLS = Math.floor(canvas.width / TILE);
  const ROWS = Math.floor(canvas.height / TILE);
  let snake = [{x:5,y:5}];
  let dir = {x:1,y:0};
  let food = null;
  let score = 0;
  let level = 1;
  const levelEl = document.getElementById('level');
  let tickDelay = 120; // ms
  let running = false;
  let tickInterval = null;
  let selectedSpeed = 'med';
  const baseSpeeds = { slow: 180, med: 120, fast: 70 };
  let unlockedLevel = 1; // highest unlocked level

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

  // audio
  const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  function playTone(freq, time=0.08, vol=0.05, type='sine'){
    try{
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      setTimeout(()=>{ o.stop(); }, time*1000);
    }catch(e){}
  }
  function playEat(){ playTone(900,0.06,0.06,'sine'); }
  function playLevel(){ playTone(1200,0.12,0.08,'sawtooth'); }
  function playGameOver(){ playTone(200,0.3,0.08,'sine'); }

  function reset(){
    // start the snake just outside the top wall so it comes in from outside
    snake = [{x: Math.floor(COLS/2), y: -1}];
    // move inward from the top
    dir = {x:0, y:1};
    score=0; level=1; unlockedLevel=1; selectedSpeed='med'; tickDelay=baseSpeeds[selectedSpeed]; running=false; updateScore(); placeFood(); draw();
    clearInterval(tickInterval);
    canvas.classList.remove('canvas-border-glow');
  }

  function updateScore(){ scoreEl.textContent = score; highEl.textContent = highscore; levelEl.textContent = level; }

  function updateSkinButtons(){
    skinButtons.forEach(b=>{
      const key = b.dataset.skin;
      const req = parseInt(b.dataset.required||'0',10);
      if(score>=req){ b.classList.remove('locked'); b.classList.add('unlocked'); b.disabled=false; }
      else { b.classList.add('locked'); b.classList.remove('unlocked'); b.disabled=true; }
      if(key===selectedSkin){ b.classList.add('selected'); } else { b.classList.remove('selected'); }
    });
  }

  function updateTypeButtons(){
    if(!typeButtons) return;
    typeButtons.forEach(b=>{
      const key = b.dataset.type;
      const req = parseInt(b.dataset.required||'0',10);
      if(score>=req){ b.classList.remove('locked'); b.classList.add('unlocked'); b.disabled=false; }
      else { b.classList.add('locked'); b.classList.remove('unlocked'); b.disabled=true; }
      if(key===selectedType){ b.classList.add('selected'); } else { b.classList.remove('selected'); }
    });
  }

  skinButtons.forEach(b=>{
    b.addEventListener('click', ()=>{
      const key = b.dataset.skin;
      const req = parseInt(b.dataset.required||'0',10);
      if(score>=req){ selectedSkin = key; localStorage.setItem(SKIN_KEY, selectedSkin); updateSkinButtons(); }
    });
  });

  // type button interactions
  typeButtons.forEach(b=>{
    b.addEventListener('click', ()=>{
      const key = b.dataset.type;
      const req = parseInt(b.dataset.required||'0',10);
      if(score>=req){ selectedType = key; localStorage.setItem(TYPE_KEY, selectedType); updateTypeButtons(); }
    });
  });

  function tick(){
    if(!running) return;
    const head = {x:snake[0].x+dir.x, y:snake[0].y+dir.y};
    // wall
    if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS){ endGame(); return; }
    // self
    if(snake.some(s=>s.x===head.x&&s.y===head.y)){ endGame(); return; }
    snake.unshift(head);
    if(food && head.x===food.x&&head.y===food.y){
      score++;
      // level up every 5 points
      if(score % 5 === 0){
        level++;
        unlockedLevel = Math.max(unlockedLevel, level);
        // recompute tickDelay based on selected speed and new level
        tickDelay = Math.max(40, baseSpeeds[selectedSpeed] - (level-1)*12);
        playLevel(); updateLevelButtons(); updateInterval();
      } else { playEat(); }
      placeFood(); updateScore();
      // automatically update skin/type when score increases
      autoUpdateCosmetics();
      updateSkinButtons(); updateTypeButtons();
    } else { snake.pop(); }
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

    // snake with skin
    const skin = skinsConfig[selectedSkin] || skinsConfig.classic;
    // prepare gradient for gradient skin
    let globalBodyStyle = null;
    if(selectedSkin==='gradient'){
      const g = ctx.createLinearGradient(0,0,canvas.width,0);
      g.addColorStop(0,'#ff3bca'); g.addColorStop(1,'#3bf0ff');
      globalBodyStyle = g;
    }
    snake.forEach((s,i)=>{
      if(i===0){
        const headColor = skin.head || '#3bf0ff';
        ctx.fillStyle = headColor;
        ctx.shadowColor = skin.shadow || headColor;
        ctx.shadowBlur = 18;
      } else {
        ctx.fillStyle = globalBodyStyle || skin.body || '#7ef2d6';
        ctx.shadowBlur = 6;
      }
      const px = s.x * TILE;
      const py = s.y * TILE;
      if(selectedType === 'rounded'){
        ctx.beginPath();
        ctx.arc(px + TILE/2, py + TILE/2, (TILE-4)/2, 0, Math.PI*2);
        ctx.fill();
      } else if(selectedType === 'pixel'){
        const sz = Math.max(6, Math.floor(TILE/2));
        ctx.fillRect(px + Math.floor(TILE/2 - sz/2), py + Math.floor(TILE/2 - sz/2), sz, sz);
      } else if(selectedType === 'fat'){
        ctx.fillRect(px + 1, py + 1, TILE-2, TILE-2);
      } else {
        ctx.fillRect(px + 2, py + 2, TILE-4, TILE-4);
      }
      ctx.shadowBlur=0;
    });
  }

  // automatically choose the highest unlocked skin/type based on current score
  function autoUpdateCosmetics(){
    // skins
    let bestSkin = selectedSkin;
    Object.keys(skinsConfig).forEach(k=>{
      const req = skinsConfig[k].req || 0;
      if(score>=req){ bestSkin = k; }
    });
    if(bestSkin !== selectedSkin){ selectedSkin = bestSkin; localStorage.setItem(SKIN_KEY, selectedSkin); }
    // types
    let bestType = selectedType;
    Object.keys(typesConfig).forEach(k=>{
      const req = typesConfig[k].req || 0;
      if(score>=req){ bestType = k; }
    });
    if(bestType !== selectedType){ selectedType = bestType; localStorage.setItem(TYPE_KEY, selectedType); }
  }

  function startGame(){
    if(!running){ running=true; clearInterval(tickInterval); tickInterval = setInterval(()=>{ tick(); draw(); }, tickDelay); pauseBtn.textContent = 'Pause'; canvas.classList.add('canvas-border-glow'); }
  }

  function togglePause(){
    if(running){
      running = false; clearInterval(tickInterval); pauseBtn.textContent = 'Resume';
    } else {
      startGame();
    }
  }

  function updateInterval(){
    if(tickInterval) clearInterval(tickInterval);
    if(running) tickInterval = setInterval(()=>{ tick(); draw(); }, tickDelay);
  }

  function endGame(){
    running=false;
    clearInterval(tickInterval);
    canvas.classList.remove('canvas-border-glow');
    playGameOver();
    if(score>highscore){ highscore=score; localStorage.setItem(HIGH_KEY,String(highscore)); }
    updateScore();
    showGameOver();
  }

  // show game over modal and allow restart
  function showGameOver(){
    modalScore.textContent = score;
    gameOverModal.setAttribute('aria-hidden','false');
    modalRestartBtn.focus();
  }

  modalRestartBtn.addEventListener('click', ()=>{
    gameOverModal.setAttribute('aria-hidden','true');
    reset();
    startGame();
  });

  // controls
  startBtn.addEventListener('click', ()=>{ startGame(); });
  pauseBtn.addEventListener('click', ()=>{ togglePause(); });
  restartBtn.addEventListener('click', ()=>{ reset(); });

  // speed controls
  function setSpeed(key){
    if(!baseSpeeds[key]) return;
    selectedSpeed = key;
    // recalc tickDelay based on level
    tickDelay = Math.max(40, baseSpeeds[selectedSpeed] - (level-1)*12);
    updateInterval();
    // UI selection
    speedSlow.classList.remove('primary'); speedMed.classList.remove('primary'); speedFast.classList.remove('primary');
    if(key==='slow') speedSlow.classList.add('primary');
    if(key==='med') speedMed.classList.add('primary');
    if(key==='fast') speedFast.classList.add('primary');
  }
  speedSlow.addEventListener('click', ()=>setSpeed('slow'));
  speedMed.addEventListener('click', ()=>setSpeed('med'));
  speedFast.addEventListener('click', ()=>setSpeed('fast'));

  // level buttons
  function updateLevelButtons(){
    levelButtons.forEach(b=>{
      const lvl = parseInt(b.dataset.level,10);
      if(lvl<=unlockedLevel){ b.classList.add('unlocked'); b.classList.remove('locked'); b.disabled=false; }
      else { b.classList.add('locked'); b.classList.remove('unlocked'); b.disabled=true; }
    });
  }
  levelButtons.forEach(b=>{
    b.addEventListener('click', ()=>{
      const lvl = parseInt(b.dataset.level,10);
      if(lvl<=unlockedLevel){ level = lvl; tickDelay = Math.max(40, baseSpeeds[selectedSpeed] - (level-1)*12); updateScore(); updateInterval(); }
    });
  });
  // init UI
  setSpeed(selectedSpeed);
  updateLevelButtons();

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
  reset(); setSpeed(selectedSpeed); updateLevelButtons(); updateSkinButtons(); updateTypeButtons(); draw();
