// js/mode-online-friend.js
// Peer-to-peer play over WebRTC via PeerJS. This module does not open the
// connection itself - main.js handles the host/guest handshake on the invite
// screen and hands this factory an already-open DataConnection plus which
// color the local player was assigned (host is always White).
window.App = window.App || {};
App.Modes = App.Modes || {};

App.Modes.onlineFriend = function onlineFriend({ conn, myColor }) {
  const opponentColor = myColor === 'w' ? 'b' : 'w';
  let controllerRef = null;

  function handleIncoming(data) {
    if (!controllerRef) return;
    if (data.type === 'move') {
      controllerRef.applyExternalMove(data.from, data.to, data.promotion);
    } else if (data.type === 'reset') {
      controllerRef.reset();
    }
  }

  conn.on('data', handleIncoming);
  conn.on('close', () => {
    if (controllerRef) controllerRef.setModeNote('Your opponent disconnected.');
  });

  return {
    label: 'Invite a Friend',
    allowUndo: false, // undo would desync the peers without extra protocol

    canMove(chess) {
      return chess.turn() === myColor;
    },

    afterMove(move, chess, controller, { external }) {
      if (external) return; // move came from the peer, don't echo it back
      conn.send({ type: 'move', from: move.from, to: move.to, promotion: move.promotion });
    },

    afterReset(chess, controller) {
      conn.send({ type: 'reset' });
      controller.setModeNote(
        myColor === 'w'
          ? 'You are White. Waiting on your move.'
          : 'You are Black. Waiting on White.'
      );
    },

    init(controller) {
      controllerRef = controller;
      controller.setModeNote(
        myColor === 'w'
          ? 'You are White. Connected — good luck.'
          : 'You are Black. Connected — good luck.'
      );
    }
  };
};
