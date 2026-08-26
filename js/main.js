// js/main.js
window.App = window.App || {};

(function () {
  let currentController = null;
  let activePeer = null;
  let activeConn = null;

  let dom; // populated on DOMContentLoaded

  function show(screenId) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
  }

  function teardownPeer() {
    if (activeConn) {
      try { activeConn.close(); } catch (e) {}
      activeConn = null;
    }
    if (activePeer) {
      try { activePeer.destroy(); } catch (e) {}
      activePeer = null;
    }
  }

  function goToMenu() {
    teardownPeer();
    currentController = null;
    // strip any ?room= param so a refresh doesn't try to rejoin
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
    show('menu-screen');
  }

  // --- game bootstrapping ---------------------------------------------------

  function buildController(mode) {
    const boardUI = new App.BoardUI(dom.boardEl);
    currentController = new App.GameController({
      boardUI,
      mode,
      dom: {
        statusEl: dom.statusEl,
        turnDot: dom.turnDot,
        turnLabel: dom.turnLabel,
        modeNoteEl: dom.modeNoteEl,
        moveListEl: dom.moveListEl,
        capturedByWhiteEl: dom.capturedByWhiteEl,
        capturedByBlackEl: dom.capturedByBlackEl,
        promoOverlay: dom.promoOverlay,
        promoChoices: dom.promoChoices
      }
    });
    dom.undoBtn.style.display = mode.allowUndo === false ? 'none' : '';
    show('game-screen');
  }

  function startLocalPvp() {
    buildController(App.Modes.localPvp());
  }

  function startVsComputer(difficulty, colorChoice) {
    const playerColor = colorChoice === 'random'
      ? (Math.random() < 0.5 ? 'w' : 'b')
      : colorChoice;
    buildController(App.Modes.vsComputer({ playerColor, difficulty }));
  }

  function startOnlineGame(conn, myColor) {
    activeConn = conn;
    buildController(App.Modes.onlineFriend({ conn, myColor }));
  }

  // --- invite a friend: host side ------------------------------------------

  function randomRoomId() {
    return 'chess-' + Math.random().toString(36).slice(2, 8);
  }

  function hostInvite() {
    show('invite-screen');
    dom.inviteStatusLabel.textContent = 'Preparing your board…';
    dom.inviteLinkRow.style.display = 'none';

    let attempts = 0;

    function tryCreate() {
      attempts++;
      const id = randomRoomId();
      const peer = new Peer(id);
      activePeer = peer;

      peer.on('open', () => {
        const link = window.location.origin + window.location.pathname + '?room=' + id;
        dom.inviteLinkInput.value = link;
        dom.inviteLinkRow.style.display = '';
        dom.inviteStatusLabel.textContent = 'Share this link — waiting for your friend to open it…';
      });

      peer.on('connection', (conn) => {
        conn.on('open', () => {
          dom.inviteStatusLabel.textContent = 'Connected! Setting up the board…';
          setTimeout(() => startOnlineGame(conn, 'w'), 300);
        });
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && attempts < 5) {
          tryCreate();
        } else {
          dom.inviteStatusLabel.textContent =
            'Could not open a connection (' + err.type + '). Check your network and try again.';
        }
      });
    }

    tryCreate();
  }

  // --- invite a friend: guest side -----------------------------------------

  function joinInvite(roomId) {
    show('invite-screen');
    dom.inviteLinkRow.style.display = 'none';
    dom.inviteStatusLabel.textContent = 'Connecting to your friend\u2019s board…';

    const peer = new Peer();
    activePeer = peer;

    peer.on('open', () => {
      const conn = peer.connect(roomId, { reliable: true });
      activeConn = conn;

      conn.on('open', () => {
        dom.inviteStatusLabel.textContent = 'Connected! Setting up the board…';
        setTimeout(() => startOnlineGame(conn, 'b'), 300);
      });

      conn.on('error', () => {
        dom.inviteStatusLabel.textContent = 'That invite link is no longer active.';
      });
    });

    peer.on('error', (err) => {
      dom.inviteStatusLabel.textContent =
        'Could not reach that board (' + err.type + '). Ask your friend for a fresh link.';
    });
  }

  // --- wiring ---------------------------------------------------------------

  function wireMenu() {
    dom.modeInviteCard.addEventListener('click', hostInvite);
    dom.modeLocalCard.addEventListener('click', startLocalPvp);
    dom.modeComputerCard.addEventListener('click', () => show('computer-setup-screen'));

    document.querySelectorAll('.back-link').forEach((btn) => {
      btn.addEventListener('click', goToMenu);
    });
  }

  function wireComputerSetup() {
    let difficulty = 'mid';
    let colorChoice = 'w';

    dom.difficultyButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.difficultyButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.difficulty;
      });
    });
    dom.colorButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.colorButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        colorChoice = btn.dataset.color;
      });
    });

    dom.beginComputerGameBtn.addEventListener('click', () => {
      startVsComputer(difficulty, colorChoice);
    });
  }

  function wireInviteScreen() {
    dom.copyLinkBtn.addEventListener('click', () => {
      dom.inviteLinkInput.select();
      navigator.clipboard?.writeText(dom.inviteLinkInput.value).catch(() => {});
      document.execCommand && document.execCommand('copy');
      dom.copyLinkBtn.textContent = 'Copied';
      setTimeout(() => { dom.copyLinkBtn.textContent = 'Copy'; }, 1500);
    });
  }

  function wireGameScreen() {
    dom.undoBtn.addEventListener('click', () => currentController && currentController.undo());
    dom.resetBtn.addEventListener('click', () => currentController && currentController.reset());
  }

  function cacheDom() {
    dom = {
      boardEl: document.getElementById('board'),
      statusEl: document.getElementById('status'),
      turnDot: document.getElementById('turnDot'),
      turnLabel: document.getElementById('turnLabel'),
      modeNoteEl: document.getElementById('modeNote'),
      moveListEl: document.getElementById('moveList'),
      capturedByWhiteEl: document.getElementById('capturedByWhite'),
      capturedByBlackEl: document.getElementById('capturedByBlack'),
      promoOverlay: document.getElementById('promoOverlay'),
      promoChoices: document.getElementById('promoChoices'),
      undoBtn: document.getElementById('undoBtn'),
      resetBtn: document.getElementById('resetBtn'),

      modeInviteCard: document.getElementById('modeInviteCard'),
      modeLocalCard: document.getElementById('modeLocalCard'),
      modeComputerCard: document.getElementById('modeComputerCard'),

      difficultyButtons: Array.from(document.querySelectorAll('[data-difficulty]')),
      colorButtons: Array.from(document.querySelectorAll('[data-color]')),
      beginComputerGameBtn: document.getElementById('beginComputerGameBtn'),

      inviteStatusLabel: document.getElementById('inviteStatusLabel'),
      inviteLinkRow: document.getElementById('inviteLinkRow'),
      inviteLinkInput: document.getElementById('inviteLinkInput'),
      copyLinkBtn: document.getElementById('copyLinkBtn')
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    wireMenu();
    wireComputerSetup();
    wireInviteScreen();
    wireGameScreen();

    // Default active states for the computer setup screen
    document.querySelector('[data-difficulty="mid"]')?.classList.add('active');
    document.querySelector('[data-color="w"]')?.classList.add('active');

    const roomId = new URLSearchParams(window.location.search).get('room');
    if (roomId) {
      joinInvite(roomId);
    } else {
      show('menu-screen');
    }
  });
})();