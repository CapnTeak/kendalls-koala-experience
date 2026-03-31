(() => {
  const KG = window.KoalaGame;
  KG.shared = KG.shared || {};

  function boot() {
    const ui = new KG.DOMUI({
      save: () => KG.shared.model.save(),
      load: () => { KG.shared.model.load(); KG.shared.scene?.renderAll(); },
      togglePause: () => KG.shared.model.togglePause(),
      setTool: (tool) => KG.shared.model.setTool(tool),
      dismissTutorial: () => KG.shared.model.dismissTutorial(),
      answerQuiz: (index) => KG.shared.model.answerQuiz(index),
      closeQuiz: () => KG.shared.model.closeQuiz(),
      openReport: () => KG.shared.model.openReport(),
      closeReport: () => KG.shared.model.closeReport(),
    });
    const model = new KG.GameModel(ui);
    KG.shared.ui = ui;
    KG.shared.model = model;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser-game',
      width: 1100,
      height: 720,
      backgroundColor: '#bde1ff',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1100, height: 720 },
      scene: [KG.MainScene],
      render: { antialias: true, pixelArt: false },
    });

    KG.shared.game = game;

    ui.syncTool(model.state.currentTool);
    model.refreshUI();
  }

  window.addEventListener('load', boot);
})();
