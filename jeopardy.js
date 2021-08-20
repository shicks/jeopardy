// Basic idea: Game owns the game state and is the main window
// The board can be presented in a different window

import DATA from './data.js';

class Game {
  


}

function playAudio(url) {
  let audio = audioCache.get(url);
  if (!audio) audioCache.set(url, audio = new Audio(url));
  audio.currentTime = 0;
  audio.play();
}
const audioCache = new Map();

class CategorySquare {
  /**
   * @param {string} name
   * @param {string} logoUrl
   * @param {number} column
   * @param {Board} board
   */
  constructor(name, logoUrl, column, board) {
    this.el = document.createElement('div');
    this.el.classList.add('category', 'r0', `c${column}`);
    const logo = document.createElement('img');
    logo.classList.add('logo');
    logo.src = logoUrl;
    this.el.appendChild(logo);
    const inner = document.createElement('div');
    inner.textContent = name;
    this.el.appendChild(inner);

    this.column = column;
    this.board = board;

    /** @type {ClueSquare[]} */
    this.clues = [];
  }

  hide() {
    this.el.classList.add('used');
  }

  /** @return {Update[]} */
  maybeHide() {
    for (const clue of this.clues) {
      if (clue.state !== 'used') return [];
    }
    this.hide();
    return [['delete', 0, this.column]];
  }
}

class ClueSquare {
  /**
   * @param {{clue: string, response: string, daily?: boolean}} clue
   * @param {number} value
   * @param {CategorySquare} category
   * @param {number} row
   * @
   */
  constructor(clue, value, category, row) {
    this.el = document.createElement('div');
    this.el.classList.add('placeholder', `r${row}`, `c${category.column}`);

    this.clue = clue;
    this.category = category;
    this.value = value;

    /** @type {'available'|'daily'|'showing'|'used'} */
    this.state = 'available';

    const valueDiv = document.createElement('div');
    valueDiv.classList.add('value');
    valueDiv.textContent = `$${value}`;
    this.el.appendChild(valueDiv);
    const clueDiv = document.createElement('div');
    clueDiv.classList.add('clue');
    const inner = document.createElement('div');
    inner.textContent = clue.clue;
    clueDiv.appendChild(inner);
    this.el.appendChild(clueDiv);
  }

  /** @return {Update[]} */
  advance() {
    const col = this.category.column;
    switch (this.state) {
    case 'used': return;
    case 'showing':
      return [['hide', this.row, col], ...this.hide()];
    case 'available':
      if (this.clue.daily) {
        this.showDaily();
        return [['modal', 'Reveal clue', ['advance', this.row, col]]];
      }
      // fall-through
    case 'daily':
      if (this.clue.daily) this.hideDaily();
      this.show();
      return [['clue', this.value],
              ['modal', 'Dismiss clue', ['advance', this.row, col]]];
    default:
      throw new Error(`bad state: ${this.state}`);
    }
  }

  show() {
    this.state = 'showing';
    this.board.el.classList.add('clue-mode');
    this.el.classList.add('selected');
  }

  hide() {
    this.state = 'used';
    this.board.el.classList.remove('clue-mode');
    this.el.classList.remove('selected');
    this.el.classList.add('used');

    this.category.maybeHide();
  }

  showDaily() {
    this.state = 'daily';
    this.board.el.classList.add('clue-mode');
    this.el.classList.add('selected');
    this.el.classList.add('daily');
  }

  hideDaily() {
    this.el.classList.remove('daily');
    this.el.firstChild.remove();
  }
}

class Board {
  // Owns the component
  constructor(root, data, game) {
    this.el = root;
    this.data = data;
    this.game = game;
    /** @type {ClueSquare[][]} */
    this.clues = [];
    /** @type {[number, number]|null} */
    this.showing = null;
    this.clueTime = game.clueTime || data.clueTime;
  }

  clear() {
    while (this.el.firstChild) this.el.firstChild.remove();
  }

  initJeopardy() {
    this.initGrid(data.images.jeopardy, this.game.jeopardy);
  }

  initDouble() {
    this.initGrid(data.images.double, this.game.double);
  }

  initFinal() {
    // TODO
  }

  initGrid(logo, categories) {
    this.clear();
    let column = 0;
    const cats = [];
    for (const category in categories) {
      const categorySquare = new CategorySquare(logo, category, column++, this);
      this.el.appendChild(categorySquare.el);
      const clues = categories[category];
      let row = 1;
      const cat = [];
      cats.push(cat);
      for (const value in clues) {
        const clue = clues[value];
        const clueSquare = new ClueSquare(clue, value, categorySquare, row++);
        this.el.appendChild(clueSquare.el);
        cat.push(clueSquare);
      }
    }
  }

  /**
   * Integration point with second-window control.
   * @param {Command} command
   * @return {Update[]} update instructions
   */
  advance(command) {
    switch (command[0]) {
    case 'advance': return this.categories[command[2]][command[1]].advance();
    default: throw new Error(`unknown command: [${command.join(', ')}]`);
    }
  }
}


// newtype Command = object;
// type Update = ['enable', row: number, column: number, text: string, Command?]
//             | ['delete', row: number, column: number]
//             | ['modal', text: string, Command]
//             | ['clue', value: number]  // start a normal clue timer (3s)
//             | ['daily']                // start a long answer timer (10s)
//             | ['clear']
// // clue and daily also add buttons to the scoreboard for + and -
// // clue timer is pausable w/ a separate (sub) answer timer (6s)


// Basic click handling to show clues
const board = document.getElementsByClassName('board')[0];
board.addEventListener('click', (e) => {
  const p = e.target.closest('.placeholder');
  if (board.classList.contains('clue-mode')) {
    if (p.classList.contains('daily') && p.firstChild.classList.contains('daily-image')) {
      p.firstChild.remove();
      return;
    }  
    board.classList.remove('clue-mode');
    p.classList.remove('selected');
    p.classList.add('used');
    // TODO - clear out category if done...

    // for (const p of board.querySelectorAll('.placeholder')) {
    //   p.classList.remove('selected');
    // }
    // return;
  } else {
    if (p.classList.contains('daily')) {
      playAudio(DATA.sounds.daily);
    }
    board.classList.add('clue-mode');
    p.classList.add('selected');
  }
});

// Load the game data
// const name = localStorage.getItem('name');


function initializeBoard(round) {
  while (board.children.length) board.firstChild.remove();
  const categories = [];
  for (const category in round) {
    div(board, `category r0 c${categories.length}`, ['', category]);
    categories.push([category, round[category]]);
  }
  let c = 0;
  for (const [category, clues] of categories) {
    let r = 1;
    for (const value in clues) {
      const placeholder = div(board, `placeholder r${r++} c${c}`,
          ['value', `$${value}`],
          ['clue', ['', clues[value].clue]]);
      placeholder.dataset['response'] = clues[value].response;
      if (clues[value].daily) {
        // TODO - allow modifiers, like {daily: 'video'} for diff logo
        placeholder.classList.add('daily');
        const img = document.createElement('img');
        img.className = 'daily-image';
        img.src = DATA.images.daily;
        placeholder.insertBefore(img, placeholder.firstChild);
      }
    }
    c++;
  }
}

globalThis.start = () => {
  initializeBoard(DATA.boards[0].double);
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



// We could possibly get better animations if we give up on the grid
// layout and instead programmatically place everything absolutely.
// We could further use transform to scale everything down 1/6, and
// then animate the transition to 100% when revealing a clue.

// TODO - use localstorage
// TODO - allow copy-paste into actual squares?
// TODO - clue sound? final jeopardy music?
// TODO - open separate host window for answers?
//        - score adjustment buttons?
// TODO - daily double (animation and sound)
// TODO - timer after reading clue (need to press button after done reading)


///////////////////////////////////////
// Basic plan: there are three modes:
//   1. list
//   2. edit
//   3. play
// We start on list mode, listing all the available games.
// Maybe also allow import/export json?

// Music/sounds can be "uploaded" to localstorage, will be used if present.
//  - board fill sound - 6 spaces appear at a time
//    - then logo replaced with categories one at a time, pan left to right
//  - daily double sound plays while flipping animation for zoom-in
//    w/ "DAILY DOUBLE" logo before reveal
//     -> horizontal (y) flip to actual clue...
//  - ding when final jeopardy clue is shown, then read, then thinking music
//  - time out sound when nobody answers
//  - beepbeepbeepbeep, beepbeepbeepbeep - out of time for round

//
// TODO - class/component-based state, less dependency on CSS for logic

