const board = document.getElementsByClassName('board')[0];
board.addEventListener('click', (e) => {
  if (board.classList.contains('clue-mode')) {
    board.classList.remove('clue-mode');
    for (const p of board.querySelectorAll('.placeholder')) {
      p.classList.remove('selected');
    }
    return;
  }
  board.classList.add('clue-mode');
  const p = e.target.closest('.placeholder');
  p.classList.add('selected');
});


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
