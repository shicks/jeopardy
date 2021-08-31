// We need to open a new window to /present
let w;

const main = addChild();
const input = addChild('input');
const players = addChild();
const player = addChild();
const clueLine = addChild();
const clueLine2 = addChild();
const board = addChild();
const notes = addChild();

clueLine2.textContent = `\xa0`;

async function startGame(name) {
  w = window.open('/present.html', 'popup', 'width=1050,height=700');
  await new Promise(resolve => w.addEventListener('load', () => resolve()));
  const data = JSON.parse(localStorage['data']);
  const game = data['boards'][name];
  w.loadAudio(data.sounds);
  w.loadImages(data.images);
  const roundData = [
    {bg: data.images.jeopardy, board: game.jeopardy},
    {bg: data.images.double, board: game.double},
    {bg: data.images.jeopardy, board: game.final},
  ];
  // Add a bunch of controls
  let bg;
  let round;
  let increment;
  addButton(players, 'Intro', (ctl) => {
    w.playAudio('intro');
    ctl.delete();
  });
  addButton(main, 'Start Jeopardy', startJeopardy);
  function startJeopardy(ctl) {
    loadRound(game.jeopardy);
    w.clearBoard(data.images.jeopardy);
    addSetup(increment = 200);
  }
  addButton(main, 'Start Double Jeopardy', (ctl) => {
    loadRound(game.double);
    addSetup(increment = 400);
    w.clearBoard(data.images.double);
  });
  addButton(main, 'Start Final Jeopardy', (ctl) => {
    w.clearBoard(data.images.jeopardy, true);
    clearEl(board);
    addButton(board, 'Show Category', showFinal);
  });
  let addPlayerButtonCtl;
  addButton(players, 'Add Player', (ctl) => {
    if (!input.value) return;
    addPlayer();
    input.value = '';
    addPlayerButtonCtl = ctl;
  });

  let inControl = 0;
  addButton(player, '+', () => {
    if (currentPlayer < 0) return;
    w.updatePlayer(currentPlayer, playersList[currentPlayer][1] += Number(input.value));
    postAddMoneyAction();
    inControl = currentPlayer;
  });
  addButton(player, '-', playerSubtract);
  function playerSubtract() {
    if (currentPlayer < 0) return;
    w.updatePlayer(currentPlayer, playersList[currentPlayer][1] -= Number(input.value));
    postSubMoneyAction();
    currentPlayer = inControl;
    currentPlayerSpan.textContent = playersList[currentPlayer][0];
  }

  // @type [string, number][]
  const playersList = [];
  let currentPlayer = -1;
  const currentPlayerSpan = addChild('span', player);
  let postAddMoneyAction = () => {};
  let postSubMoneyAction = () => {};
  let onSelectPlayer = () => {};

  startJeopardy();

  function addPlayer() {
    const index = playersList.length;
    const name = input.value || `Player ${index + 1}`;
    playersList.push([name, 0]);
    addButton(players, name, () => selectPlayer(index));
    w.addPlayer(name);
  }

  function selectPlayer(index) {
    currentPlayerSpan.textContent = playersList[currentPlayer = index][0];
    onSelectPlayer();
  }

  function unselectPlayer() {
    currentPlayerSpan.textContent = '';
    currentPlayer = -1;
  }

  function loadRound(cats) {
    clearEl(notes);
    round = [];
    for (const cat in cats) {
      const obj = [cat];
      round.push(obj);
      for (const clue in cats[cat]) {
        if (clue === 'note') {
          addChild('div', notes).textContent = `${cat}: ${cats[cat][clue]}`;
          continue;
        }
        obj.push(cats[cat][clue]);
      }
    }
  }

  function addSetup(value) {
    function updateMain(display) {
      for (const b of main.children) {
        b.style.display = display;
      }
    }
    clearEl(board);
    updateMain('none');
    addButton(main, 'New Round', (ctl) => {
      updateMain('');
      ctl.delete();
    });
    addButton(board, 'Fill', (ctl) => {
      addPlayerButtonCtl.delete();
      w.revealValues(value);
      let cat = 0;
      function revealCat(ctl) {
        w.revealCategory(cat, round[cat][0]);
        if (cat === 5) {
          ctl.delete();
          initBoard();
          w.removeBackground();
        } else {
          ctl.replace(`Reveal Category ${++cat}`, revealCat);
        }
      }
      ctl.replace(`Reveal Category 1`, revealCat);
    });
  }

  let categoryCount;
  function initBoard() {
    categoryCount = [5, 5, 5, 5, 5, 5];
    for (let r = 0; r < 6; r++) {
      const row = addChild('div', board);
      for (let c = 0; c < 6; c++) {
        if (r) {
          const clue = round[c][r];
          const b = addButton(row, increment * r, (ctl) => selectClue(c, r, ctl));
          b.style.width = '120px';
        } else {
          const cat = round[c][r];
          const b = addButton(row, cat, () => {});
          b.style.width = '120px';
        }
      }
    }
  }

  let currentClue; // [c, r]
  function selectClue(c, r, ctl) {
    clearEl(clueLine);
    currentClue = [c, r, round[c][r]];
    if (currentClue[2].daily) {
      //ctl.replace('\xa0', (ctl) => selectClue(c, r, ctl));
      w.showDaily(c, r, currentClue[2].clue);
      addButton(clueLine, 'Show Clue', (ctl2) => {
        w.hideDaily(c, r);
        ctl2.delete();
        showClue(...currentClue);
      });
    } else {
      showClue(...currentClue);
    }
  }

  function showClue(c, r, clue) {
    // If daily double...
    clearEl(clueLine);
    clearEl(clueLine2);
    const b = addButton(clueLine, 'Hide Clue', hideClue);
    clueLine2.textContent = clue.clue;
    const timer = newTimer(
        clueLine2,
        clue.daily ? globalThis.responseTimer : globalThis.clueTimer,
        hideClue);
    addChild('span', clueLine2).textContent = clue.response;
    let playerTimer;
    if (clue.daily) {
      postSubMoneyAction = hideClue;
    } else {
      input.value = increment * r;
      w.showClue(c, r, clue.clue);
      postSubMoneyAction = () => {
        timer.startTimer();
        if (playerTimer) playerTimer.delete();
      };
      onSelectPlayer = () => {
        timer.pauseTimer();
        if (playerTimer) playerTimer.delete();
        playerTimer = newTimer(player, responseTimer, () => {
          
          timer.startTimer();
        });
        playerTimer.startTimer();
      };
    }
    postAddMoneyAction = hideClue;
    function hideClue() {
      if (!--categoryCount[c]) w.hideCategory(c);
      w.hideClue(c, r);
      b.remove();
      //unselectPlayer();
      postAddMoneyAction = () => {};
      board.children[r].children[c].textContent = '\xa0';
      clueLine2.textContent = clue.response;
      onSelectPlayer = () => {};
      if (playerTimer) playerTimer.delete();
    }

    // Start timer
  }

  function newTimer(parent, init, timeUp) {
    let timerStart;
    let timerAction = startTimer;
    let timeRemaining = init;
    let timerInterval;
    let running;
    function startTimer() {
      if (timeRemaining < 2000) timeRemaining = 2000;
      timerStart = Date.now();
      timerAction = pauseTimer;
      updateTimer();
      timerInterval = setInterval(updateTimer, 100);
    };
    function pauseTimer() {
      updateTimer();
      if (timerInterval != null) clearInterval(timerInterval);
      timerInterval = null;
      timerAction = startTimer;
    }
    function updateTimer() {
      const now = Date.now();
      timeRemaining -= (now - timerStart);
      if (timeRemaining < 0) {
        tb.textContent = 'Time Up';
        timerAction = () => {
          w.playAudio('time');
          if (timeUp) timeUp();
          tb.remove();
        };
      } else {
        timerStart = now;
        tb.textContent = String(timeRemaining / 1000);
      }
    }
    const tb = addButton(parent, 'Start Timer', () => timerAction());
    tb.style.width = '120px';
    return {startTimer, pauseTimer, updateTimer, delete() { tb.remove(); },
            get running() { return running; }};
  }

  function showFinal(ctl) {
    w.playAudio('ding');
    w.revealCategory(3, game.final.category, 2);
    ctl.replace('Show Clue', (ctl) => {
      w.showClue(3, 3, game.final.clue);
      clueLine2.textContent = `${game.final.clue} =====> ${game.final.response}`;
      ctl.replace('Start Timer', (ctl) => {
        w.playAudio('think');
      });
      addButton(board, 'Show Response', () => {
        w.revealFinalResponse(input.value);
      });
      addButton(board, 'Show Wager', () => {
        w.revealFinalWager(Number(input.value));
      });
    });
  }
}

globalThis.clueTimer = 4500;
globalThis.responseTimer = 8000;

// Load the game from localstorage
const {hash} = window.location;
if (!hash.startsWith('#')) {
  // allow selecting?
  // TODO - maybe make an editor?
} else {
  addButton(main, 'Start', (ctl) => {
    ctl.delete();
    startGame(hash.substring(1));
  });
}


function addButton(div, text, action) {
  const button = document.createElement('button');
  button.textContent = text;
  const ctl = {
    replace(text, newAction) {
      button.textContent = text;
      action = newAction;
    },
    delete() {
      button.remove();
    },
  };
  button.addEventListener('click', () => action(ctl));
  div.appendChild(button);
  return button;
}
function addBreak(parent) {
  
}
function addChild(tag = 'div', parent = document.body, cls = '') {
  const div = document.createElement(tag);
  if (cls) div.className = cls;
  parent.appendChild(div);
  return div;
}
function clearEl(el) {
  while (el.children.length) el.firstChild.remove();
}
