// Basic idea: Game owns the game state and is the main window
// The board can be presented in a different window

const board = document.querySelector('.board');
const scores = document.querySelector('.scores');
const boardSquares = [];

class AudioCache {
  constructor() {
    this.map = new Map();
    this.volumes = new Map();
  }

  load(urls) {
    for (const key in urls) {
      let url = urls[key];
      if (typeof url === 'object') {
        this.volumes.set(key, url.volume);
        url = url.url;
      }
      const audio = new Audio(url);
      audio.volume = 0;
      void audio.play();
      this.map.set(key, audio);
    }
  }

  play(key) {
    const audio = this.map.get(key);
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = this.volumes.get(key) ?? 1;
    void audio.play();
    return audio.duration * 1000;
  }    
}
const audioCache = new AudioCache(); // export?
// globalThis.audioCache = audioCache;
globalThis.loadAudio = (map) => audioCache.load(map);
globalThis.playAudio = (key) => audioCache.play(key);

const imageMap = new Map();
function loadImages(map) {
  for (const key in map) {
    const img = document.createElement('img');
    imageMap.set(key, img.src = map[key]);
    setTimeout(() => img.remove(), 2000);
    document.body.appendChild(img);
  }
}
globalThis.loadImages = loadImages;

function clearBoard(imageUrl, isFinal = false) {
  boardSquares.splice(0, boardSquares.length);
  while (board.children.length) board.firstChild.remove();
  if (!isFinal) {
    const img = document.createElement('img');
    img.className = 'background-logo';
    img.src = imageUrl;
    board.appendChild(img);
  }
  for (let i = 0; i < 6; i++) {
    const cat = document.createElement('div');
    cat.className = `category r0 c${i}${isFinal ? ' used' : ''}`;
    if (!isFinal) {
      const mini = document.createElement('img');
      mini.className = 'category-logo';
      mini.src = imageUrl;
      cat.appendChild(mini);
    }
    board.appendChild(cat);
    boardSquares[i] = [cat];
    for (let j = 1; j < 6; j++) {
      const placeholder = document.createElement('div');
      const empty = isFinal ? 'used' : 'empty';
      placeholder.className = `placeholder ${empty} r${j} c${i}`;
      placeholder.dataset['r'] = j;
      placeholder.dataset['c'] = i;
      board.appendChild(placeholder);
      boardSquares[i].push(placeholder);
    }
  }
  if (isFinal) {
    const c2 = boardSquares[3][2];
    c2.className = `category r2 c3`;
    const mini = document.createElement('img');
    mini.className = 'category-logo';
    mini.src = imageUrl;
    c2.appendChild(mini);
  }
}
globalThis.clearBoard = clearBoard;



function revealCategory(column, name, row = 0) {
  const square = boardSquares[column][row];
  square.firstChild.remove();
  div(square, '', name);
}
globalThis.revealCategory = revealCategory;

async function revealValues(increment) {
  const delay = (audioCache.play('reveal') ?? 4) / 8;
  const squares = [];
  for (let i = 0; i < 6; i++) {
    for (let j = 1; j < 6; j++) {
      squares.push([i, j]);
    }
  }
  for (let i = 29; i >= 0; i--) {
    if (i % 6 === 5) await new Promise(resolve => setTimeout(resolve, delay));
    const rnd = Math.floor(Math.random() * (i + 1));
    const [[c, r]] = squares.splice(rnd, 1);
    const placeholder = boardSquares[c][r];
    placeholder.classList.remove('empty');
    div(placeholder, 'value', `$${increment * r}`);
  }
}
globalThis.revealValues = revealValues;


function removeBackground() {
  for (const el of board.querySelectorAll('.background-logo')) el.remove();
}
globalThis.removeBackground = removeBackground;


function addPlayer(name) {
  div(scores, 'score', ['value', '$0'], ['border'], ['name', name]);
}
globalThis.addPlayer = addPlayer;


function updatePlayer(index, value) {
  const score = scores.children[index].firstChild;
  score.textContent = formatMoney(value);
  score.classList.toggle('red', value < 0);
}
globalThis.updatePlayer = updatePlayer;


function showClue(c, r, text) {
  const square = boardSquares[c][r];
  div(square, 'clue', ['', text]);
  square.classList.add('selected');
  board.classList.add('clue-mode');
}
globalThis.showClue = showClue;


function hideClue(c, r) {
  board.classList.remove('clue-mode');
  const square = boardSquares[c][r];
  square.classList.remove('selected');
  square.classList.add('used');
}
globalThis.hideClue = hideClue;

function hideCategory(c) {
  const square = boardSquares[c][0];
  square.classList.add('used');
}
globalThis.hideCategory = hideCategory;


function showDaily(c, r, text) {
  const square = boardSquares[c][r];
  board.classList.add('clue-mode');
  square.classList.add('selected');
  square.classList.add('daily');
  const img = document.createElement('img');
  img.className = 'daily-image';
  audioCache.play('daily');
  img.src = imageMap.get('daily');
  square.insertBefore(img, square.firstChild);
  div(square, 'clue', ['', text]);
}
globalThis.showDaily = showDaily;

function hideDaily(c, r) {
  const square = boardSquares[c][r];
  square.classList.remove('daily');
  square.firstChild.remove();
}
globalThis.hideDaily = hideDaily;

function revealFinalResponse(resp) {
  boardSquares[3][3].querySelector('.clue > div').innerText = `${resp}\n\n\xa0`;
}
globalThis.revealFinalResponse = revealFinalResponse;
function revealFinalWager(wager) {
  const cell = boardSquares[3][3].querySelector('.clue > div');
  cell.innerText = cell.innerText.replace('\xa0', formatMoney(wager));
}
globalThis.revealFinalWager = revealFinalWager;

function formatMoney(value) {
  let valStr = value < 0 ? -value : value;
  if (valStr >= 1000) {
    valStr = `${Math.floor(valStr / 1000)},${
                String(valStr % 1000).padStart(3, '0')}`;
  }
  valStr = `$${valStr}`;
  if (value < 0) valStr = `-${valStr}`;
  return valStr;
}

function div(parent, className, ...children) {
  const el = document.createElement('div');
  el.className = className;
  if (children.length === 1 && typeof children[0] === 'string') {
    el.textContent = children[0];
  } else {
    for (const child of children) {
      div(el, ...child);
    }
  }
  parent.appendChild(el);
  return el;
}
