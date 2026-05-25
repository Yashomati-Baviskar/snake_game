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

  // Initial canvas setup - only once on load
  function initializeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  
  const TILE = 20;
  const WALL_WIDTH = 1; // Wall thickness in tiles
  let COLS = Math.floor(canvas.width / TILE);
  let ROWS = Math.floor(canvas.height / TILE);
  
  // Calculate playable area boundaries (inside walls)
  let playAreaX = WALL_WIDTH;
  let playAreaY = WALL_WIDTH;
  let playAreaWidth = COLS - WALL_WIDTH * 2;
  let playAreaHeight = ROWS - WALL_WIDTH * 2;
  
  let snake = [{x: WALL_WIDTH + Math.floor(playAreaWidth/2), y: WALL_WIDTH + Math.floor(playAreaHeight/2)}];
  let dir = {x:1,y:0};
  let food = null;
  let score = 0;
  let level = 1;
  const levelEl = document.getElementById('level');
  let tickDelay = 120; // ms
  let running = false;
  let rafId = null;
  let lastFrameTime = 0;
  let accumulator = 0; // ms
  let selectedSpeed = 'med';
  const baseSpeeds = { slow: 180, med: 120, fast: 70 };
  let unlockedLevel = 1; // highest unlocked level

  const HIGH_KEY = 'simple_snake_high';
  let highscore = parseInt(localStorage.getItem(HIGH_KEY) || '0', 10);
  highEl.textContent = highscore;

  // Check if a position is inside playable area (not in walls)
  function isInPlayArea(x, y) {
    return x >= playAreaX && x < playAreaX + playAreaWidth && 
           y >= playAreaY && y < playAreaY + playAreaHeight;
  }

  function placeFood(){
    while(true){
      const x = playAreaX + Math.floor(Math.random() * playAreaWidth);
      const y = playAreaY + Math.floor(Math.random() * playAreaHeight);
      if(!snake.some(s=>s.x===x&&s.y===y)){ food={x,y}; break; }
    }
  }

  // Only update canvas size on window resize
  function resizeCanvasOnWindowResize() {
    const newW = canvas.offsetWidth;
    const newH = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = newW * dpr;
    canvas.height = newH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    COLS = Math.max(5, Math.floor(newW / TILE));
    ROWS = Math.max(5, Math.floor(newH / TILE));
    
    // Recalculate playable area
    playAreaX = WALL_WIDTH;
    playAreaY = WALL_WIDTH;
    playAreaWidth = Math.max(3, COLS - WALL_WIDTH * 2);
    playAreaHeight = Math.max(3, ROWS - WALL_WIDTH * 2);
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
    // Start snake in center of playable area
    const centerX = playAreaX + Math.floor(playAreaWidth / 2);
    const centerY = playAreaY + Math.floor(playAreaHeight / 2);
    snake = [{x: centerX, y: centerY}];
    // Move right
    dir = {x:1, y:0};
    score=0; level=1; unlockedLevel=1; selectedSpeed='med'; tickDelay=baseSpeeds[selectedSpeed]; updateScore(); placeFood(); draw();
    // stop RAF loop if running
    running = false;
    if(rafId) cancelAnimationFrame(rafId);
    rafId = null; lastFrameTime = 0; accumulator = 0;
    canvas.classList.remove('canvas-border-glow');
  }

  // Reset snake to enter from top of playable area (for unknown key press)
  function resetSnakeFromTop(){
    // Position snake at top row, just above playable area to enter downward
    const centerX = playAreaX + Math.floor(playAreaWidth / 2);
    const startY = playAreaY; // First row of playable area
    snake = [{x: centerX, y: startY - 1}];
    // Move downward
    dir = {x:0, y:1};
    score=0; level=1; unlockedLevel=1; selectedSpeed='med'; tickDelay=baseSpeeds[selectedSpeed]; updateScore(); placeFood(); draw();
    // Stop any running game
    running = false;
    if(rafId) cancelAnimationFrame(rafId);
    rafId = null; lastFrameTime = 0; accumulator = 0;
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
    // wall collision - check if head is in play area
    if(!isInPlayArea(head.x, head.y)){ endGame(); return; }
    // self collision
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
    // Use current canvas dimensions (set during resize, not here)
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.width / dpr;
    const displayH = canvas.height / dpr;
    
    // Theme-aware colors
    const isLight = document.body.classList.contains('light');
    const bgColor = isLight ? '#f8f9fc' : '#020204';
    const wallColor = isLight ? '#0077cc' : '#3bf0ff';
    const gridColor = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)';
    const shadowColor = isLight ? 'rgba(0,119,204,0.15)' : 'rgba(59,240,255,0.15)';
    
    // fill background
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,displayW,displayH);
    
    // draw playable area border (walls)
    ctx.save();
    const cellW = displayW / Math.max(1, COLS);
    const cellH = displayH / Math.max(1, ROWS);
    
    // Calculate wall positions in pixels
    const wallPixelX = playAreaX * cellW;
    const wallPixelY = playAreaY * cellH;
    const wallPixelW = playAreaWidth * cellW;
    const wallPixelH = playAreaHeight * cellH;
    
    const wallLine = 8;
    ctx.lineWidth = wallLine;
    ctx.strokeStyle = wallColor;
    ctx.shadowColor = wallColor;
    ctx.shadowBlur = 18;
    
    // Draw playable area border (with outer area as wall)
    const inset = Math.max(2, Math.ceil(wallLine/2));
    ctx.strokeRect(wallPixelX - inset, wallPixelY - inset, wallPixelW + inset*2, wallPixelH + inset*2);
    ctx.shadowBlur = 0;
    ctx.restore();
    
    // subtle grid
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    for(let x=0;x<=COLS;x++){ const gx = Math.round(x * cellW); ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,displayH); ctx.stroke(); }
    for(let y=0;y<=ROWS;y++){ const gy = Math.round(y * cellH); ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(displayW,gy); ctx.stroke(); }

    // food
    if(food){
      const fx = Math.round(food.x * cellW);
      const fy = Math.round(food.y * cellH);
      ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 12;
      ctx.fillRect(fx + 2, fy + 2, Math.max(4, Math.floor(cellW - 4)), Math.max(4, Math.floor(cellH - 4)));
      ctx.shadowBlur = 0;
    }

    // snake with skin
    const skin = skinsConfig[selectedSkin] || skinsConfig.classic;
    // prepare gradient for gradient skin
    let globalBodyStyle = null;
    if(selectedSkin==='gradient'){
      const g = ctx.createLinearGradient(0,0,displayW,0);
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
      const px = s.x * cellW;
      const py = s.y * cellH;
      const w = Math.max(4, Math.floor(cellW));
      const h = Math.max(4, Math.floor(cellH));
      if(selectedType === 'rounded'){
        ctx.beginPath();
        ctx.arc(px + cellW/2, py + cellH/2, Math.max(4, Math.min(cellW,cellH)/2 - 2), 0, Math.PI*2);
        ctx.fill();
      } else if(selectedType === 'pixel'){
        const sz = Math.max(6, Math.floor(Math.min(cellW,cellH)/2));
        ctx.fillRect(px + Math.floor(cellW/2 - sz/2), py + Math.floor(cellH/2 - sz/2), sz, sz);
      } else if(selectedType === 'fat'){
        ctx.fillRect(px + 1, py + 1, Math.max(2,w-2), Math.max(2,h-2));
      } else {
        ctx.fillRect(px + 2, py + 2, Math.max(2,w-4), Math.max(2,h-4));
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
    if(!running){
      running = true;
      pauseBtn.textContent = 'Pause';
      canvas.classList.add('canvas-border-glow');
      // start RAF loop
      lastFrameTime = performance.now();
      accumulator = 0;
      function loop(now){
        const delta = now - lastFrameTime; lastFrameTime = now;
        accumulator += delta;
        // advance game ticks as needed
        while(accumulator >= tickDelay){ tick(); accumulator -= tickDelay; }
        draw();
        if(running) rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
    }
  }

  function togglePause(){
    if(running){
      running = false; if(rafId) cancelAnimationFrame(rafId); rafId = null; pauseBtn.textContent = 'Resume';
    } else {
      startGame();
    }
  }

  function updateInterval(){
    // tickDelay updated elsewhere; RAF loop will pick up the new value automatically
    // nothing to do here for RAF-based loop
  }

  function endGame(){
    running=false;
    if(rafId) cancelAnimationFrame(rafId); rafId = null;
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

  // theme toggle with persistence
  const THEME_KEY = 'snake_theme';
  function setTheme(isDark) {
    if (isDark) {
      document.body.classList.remove('light');
      themeBtn.textContent = 'Light';
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.body.classList.add('light');
      themeBtn.textContent = 'Dark';
      localStorage.setItem(THEME_KEY, 'light');
    }
  }
  // Load saved theme on startup
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  setTheme(savedTheme === 'dark');
  
  themeBtn.addEventListener('click', ()=>{
    const isLight = document.body.classList.contains('light');
    setTheme(isLight); // if it's light, set to dark; if dark, set to light
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
      // Unknown key: pause game and reset snake to enter from top row
      resetSnakeFromTop();
    }
  });

  // init
  // Initialize canvas size on load
  initializeCanvas();
  resizeCanvasOnWindowResize();
  setSpeed(selectedSpeed); updateLevelButtons(); updateSkinButtons(); updateTypeButtons(); reset(); draw();

  // Only resize canvas on window resize (not during gameplay)
  window.addEventListener('resize', ()=>{ resizeCanvasOnWindowResize(); draw(); });
