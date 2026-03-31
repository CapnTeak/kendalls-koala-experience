(() => {
  const KG = window.KoalaGame;
  KG.makeInitialState = () => ({
    money: KG.GAME_CONFIG.economy.startingMoney,
    day: 1,
    timeOfDay: 0.35,
    season: 'Spring',
    careScore: 50,
    totalVisitors: 0,
    currentTool: 'select',
    paused: false,
    selectedKoalaId: null,
    missionIndex: 0,
    tutorialStep: 0,
    tutorialDismissed: false,
    pendingReport: null,
    reports: [],
    quizTimer: KG.GAME_CONFIG.ui.quizInterval,
    activeQuiz: null,
    quizAnswered: false,
    quizCorrectCount: 0,
    lastQuizResult: null,
    progressionLevel: 0,
    unlockedMilestones: [],
  });
})();
