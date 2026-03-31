(() => {
  const KG = window.KoalaGame;
  KG.GameModel = class {
    constructor(ui) {
      this.ui = ui;
      this.state = KG.makeInitialState();
      this.tiles = new Map();
      this.koalas = [];
      this.visitors = [];
      this.phaseLabel = '☀️ Afternoon';
      this.visitorTimer = 5;
      this.activeQuizData = null;
      this.fxEvents = [];
      this._uiDirty = true;
      this._uiThrottle = 0;
      this.setupStarterHabitat();
      this.refreshUI();
    }
    setupStarterHabitat() {
      [
        ['tree', 4,4], ['tree', 6,5], ['tree', 5,7], ['tree', 8,6], ['tree', 9,4], ['tree', 7,8], ['tree', 10,7], ['tree', 11,5],
        ['water', 6,9], ['boardwalk', 3,10], ['boardwalk', 4,10], ['boardwalk', 5,10], ['boardwalk', 6,10], ['boardwalk', 7,10], ['boardwalk', 8,10], ['boardwalk', 9,10], ['boardwalk', 10,10],
        ['platform', 8,8], ['shelter', 10,8], ['shrub', 5,5], ['rock', 9,7],
      ].forEach(([type, c, r]) => this.tiles.set(KG.keyFor(c, r), { type }));
      this.koalas.push(KG.makeKoala(8, 7, 'Matilda'));
      this.koalas.push(KG.makeKoala(10, 6, 'Gumnut'));
    }
    setTool(tool) {
      this.state.currentTool = tool;
      this.maybeAdvanceTutorial();
      this.refreshUI();
    }
    togglePause() { this.state.paused = !this.state.paused; this.refreshUI(); }
    save() {
      const saveState = { ...this.state, _version: 3 };
      localStorage.setItem(KG.SAVE_KEY, JSON.stringify({ version: 3, state: saveState, tiles: [...this.tiles.entries()], koalas: this.koalas, visitors: this.visitors }));
      this.ui.toast('Game saved.');
    }
    load() {
      const raw = localStorage.getItem(KG.SAVE_KEY);
      if (!raw) { this.ui.toast('No save found.', 'warn'); return; }
      const data = JSON.parse(raw);
      const saveVersion = data?.version ?? data?.state?._version ?? 0;
      if (saveVersion !== 3) {
        this.ui.toast('Save version is incompatible with this build.', 'warn');
        return;
      }
      this.state = Object.assign(KG.makeInitialState(), data.state || {});
      this.tiles = new Map(data.tiles || []);
      this.koalas = data.koalas || [];
      this.koalas.forEach(k => {
        k.personalityProfile = { ...(KG.PERSONALITY_PROFILES[k.personality] || k.personalityProfile || {}) };
      });
      this.visitors = data.visitors || [];
      this._uiDirty = true;
      this.refreshUI();
    }
    tileAt(col, row) { return this.tiles.get(KG.keyFor(col, row)); }
    countTiles(type) { let n = 0; for (const t of this.tiles.values()) if (t.type === type) n++; return n; }
    get currentMission() { return KG.GAME_CONFIG.missions[this.state.missionIndex] || KG.GAME_CONFIG.missions[0]; }
    get currentTutorial() {
      if (this.state.tutorialDismissed) return null;
      return KG.GAME_CONFIG.tutorial[this.state.tutorialStep] || null;
    }
    getMissionProgress() {
      const id = this.currentMission.id;
      if (id === 'boardwalk') return Math.max(0, this.countTiles('boardwalk') - 8);
      if (id === 'care') return this.state.careScore;
      if (id === 'enrich') return this.countTiles('enrichment');
      if (id === 'vet') return this.countTiles('vet');
      return 0;
    }
    maybeCompleteMission() {
      const mission = this.currentMission;
      const progress = this.getMissionProgress();
      if (progress >= mission.goal && this.state.missionIndex < KG.GAME_CONFIG.missions.length - 1) {
        const reward = KG.GAME_CONFIG.economy.missionReward + this.getMissionRewardBonus();
        this.state.money += reward;
        this.state.missionIndex += 1;
        this.ui.toast(`Mission complete: ${mission.title} (+$${reward})`, 'good');
        this.emitFx({ type: 'burst', col: 8, row: 8, text: 'Mission +' + reward, tone: 'good' });
        this.checkProgressionUnlocks();
      }
    }
    maybeAdvanceTutorial() {
      const step = this.currentTutorial;
      if (!step) return;
      if (step.id === 'welcome' && this.state.currentTool === 'boardwalk') this.state.tutorialStep = 1;
      else if (step.id === 'select' && this.state.currentTool === 'select') this.state.tutorialStep = 2;
      this.refreshUI();
    }
    dismissTutorial() {
      const step = this.currentTutorial;
      if (!step) return;
      if (this.state.tutorialStep < KG.GAME_CONFIG.tutorial.length - 1) this.state.tutorialStep += 1;
      else this.state.tutorialDismissed = true;
      this.refreshUI();
    }
    getSelectedKoala() { return this.koalas.find(k => k.id === this.state.selectedKoalaId) || null; }
    getHoverStatus(col, row) {
      const tool = this.state.currentTool;
      const existingTile = this.tileAt(col, row);
      const koalaHere = this.koalas.some(k => k.col === col && k.row === row);
      if (tool === 'select') return { tone: 'select', label: 'Click to inspect' };
      if (tool === 'remove') return { tone: existingTile || koalaHere ? 'valid' : 'invalid', label: existingTile || koalaHere ? 'Remove item' : 'Nothing here' };
      if (tool === 'koala') {
        if (koalaHere) return { tone: 'invalid', label: 'Koala already here' };
        if (!this.canAfford(tool)) return { tone: 'invalid', label: 'Need more funds' };
        return { tone: 'valid', label: 'Place koala' };
      }
      if (!KG.TOOLS[tool]) return { tone: 'invalid', label: 'Unavailable' };
      if (!this.canAfford(tool)) return { tone: 'invalid', label: 'Need more funds' };
      if (existingTile?.type === tool) return { tone: 'invalid', label: 'Already placed' };
      return { tone: 'valid', label: `Place ${KG.TOOLS[tool].label}` };
    }
    getProgressValue(check) {
      if (check === 'careScore') return this.state.careScore;
      if (check === 'totalVisitors') return this.state.totalVisitors;
      if (check === 'quizCorrect') return this.state.quizCorrectCount;
      if (check === 'koalaCount') return this.koalas.length;
      return 0;
    }
    getCurrentProgression() {
      return KG.GAME_CONFIG.progression.levels[this.state.progressionLevel] || null;
    }
    getProgressionStatus() {
      const current = this.getCurrentProgression();
      if (!current) return { current: { title: 'Sanctuary Complete', body: 'You have unlocked all current habitat bonuses.' }, value: 1, goal: 1 };
      return { current, value: this.getProgressValue(current.check), goal: current.goal };
    }
    getDailyIncomeBonus() {
      return this.state.unlockedMilestones.reduce((sum, id) => {
        const level = KG.GAME_CONFIG.progression.levels.find(item => item.id === id);
        return sum + (level?.reward?.dailyIncomeBonus || 0);
      }, 0);
    }
    getVisitorCapBonus() {
      return this.state.unlockedMilestones.reduce((sum, id) => {
        const level = KG.GAME_CONFIG.progression.levels.find(item => item.id === id);
        return sum + (level?.reward?.visitorCapBonus || 0);
      }, 0);
    }
    getMissionRewardBonus() {
      return this.state.unlockedMilestones.reduce((sum, id) => {
        const level = KG.GAME_CONFIG.progression.levels.find(item => item.id === id);
        return sum + (level?.reward?.missionRewardBonus || 0);
      }, 0);
    }
    checkProgressionUnlocks() {
      const current = this.getCurrentProgression();
      if (!current) return;
      const value = this.getProgressValue(current.check);
      if (value < current.goal) return;
      if (!this.state.unlockedMilestones.includes(current.id)) this.state.unlockedMilestones.push(current.id);
      this.state.progressionLevel += 1;
      const rewardBits = [];
      if (current.reward?.money) {
        this.state.money += current.reward.money;
        rewardBits.push(`+$${current.reward.money}`);
      }
      if (current.reward?.visitorCapBonus) rewardBits.push(`visitor cap +${current.reward.visitorCapBonus}`);
      if (current.reward?.dailyIncomeBonus) rewardBits.push(`daily income +$${current.reward.dailyIncomeBonus}`);
      if (current.reward?.missionRewardBonus) rewardBits.push(`mission rewards +$${current.reward.missionRewardBonus}`);
      this.ui.toast(`Progression unlocked: ${current.title}${rewardBits.length ? ' — ' + rewardBits.join(', ') : ''}`, 'good');
      const anchor = this.getSelectedKoala() || this.koalas[0] || { col: 8, row: 8 };
      this.emitFx({ type: 'burst', col: anchor.col, row: anchor.row, text: current.title, tone: 'good' });
    }
    triggerQuiz() {
      if (this.state.activeQuiz || !KG.GAME_CONFIG.quiz.questions.length) return;
      const quizIndex = Math.floor(Math.random() * KG.GAME_CONFIG.quiz.questions.length);
      this.state.activeQuiz = quizIndex;
      this.activeQuizData = KG.GAME_CONFIG.quiz.questions[quizIndex] || KG.GAME_CONFIG.quiz.questions[0];
      this.state.quizAnswered = false;
      this.ui.showQuiz(this.activeQuizData);
      this.ui.toast('Quick habitat quiz.', 'warn');
    }
    answerQuiz(answerIndex) {
      if (!this.activeQuizData || this.state.quizAnswered) return;
      const answer = this.activeQuizData.answers[answerIndex];
      if (!answer) return;
      this.state.quizAnswered = true;
      const qcfg = KG.GAME_CONFIG.quiz;
      const correct = !!answer.correct;
      if (correct) {
        this.state.money += qcfg.rewardMoney;
        this.state.careScore = KG.clamp(this.state.careScore + qcfg.rewardCare, 0, 100);
        this.state.quizCorrectCount += 1;
      } else {
        this.state.money = Math.max(0, this.state.money - qcfg.penaltyMoney);
        this.state.careScore = KG.clamp(this.state.careScore - qcfg.penaltyCare, 0, 100);
      }
      const message = correct
        ? `Correct. ${this.activeQuizData.explanation} Reward: +$${qcfg.rewardMoney} and +${qcfg.rewardCare} care.`
        : `Not quite. ${this.activeQuizData.explanation} Penalty: -$${qcfg.penaltyMoney} and -${qcfg.penaltyCare} care.`;
      this.state.lastQuizResult = { correct, message };
      this.ui.resolveQuiz({ correct, message });
      this.checkProgressionUnlocks();
      this.refreshUI();
    }
    closeQuiz() {
      if (!this.state.quizAnswered) return;
      this.state.activeQuiz = null;
      this.activeQuizData = null;
      this.fxEvents = [];
      this.state.quizTimer = KG.GAME_CONFIG.ui.quizInterval;
      this.ui.hideQuiz();
      this.refreshUI();
    }
    markUIDirty() {
      this._uiDirty = true;
    }
    refreshUI() {
      this.updatePhaseLabel();
      this.ui.updateStats(this);
      this.ui.updateMission(this.currentMission, this.getMissionProgress());
      this.ui.syncTool(this.state.currentTool);
      this.ui.updateKoalaCard(this.getSelectedKoala());
      this.ui.updateTutorial(this.currentTutorial, this.state.currentTool);
      this.ui.updateProgression(this.getProgressionStatus());
      this.ui.updateReportPreview(this.state.pendingReport || this.state.reports[0] || null);
      this._uiDirty = false;
      this._uiThrottle = 0.25;
    }
    updatePhaseLabel() {
      const t = this.state.timeOfDay; const tod = KG.GAME_CONFIG.timeOfDay;
      this.phaseLabel = t < tod.morningStart ? '🌙 Night' : t < tod.afternoonStart ? '🌅 Morning' : t < tod.eveningStart ? '☀️ Afternoon' : t < tod.nightStart ? '🌇 Evening' : '🌙 Night';
    }
    canAfford(tool) { return this.state.money >= (KG.TOOLS[tool]?.cost || 0); }
    placeAt(col, row) {
      if (col < 0 || col >= KG.GRID_COLS || row < 0 || row >= KG.GRID_ROWS) return false;
      const tool = this.state.currentTool;
      if (tool === 'select') return false;
      const status = this.getHoverStatus(col, row);
      if (status.tone === 'invalid') {
        this.ui.toast(status.label, 'warn');
        this.emitFx({ type: 'burst', col, row, text: status.label, tone: 'warn' });
        return false;
      }
      if (tool === 'remove') {
        const beforeTiles = this.tiles.delete(KG.keyFor(col, row));
        const koalaIndex = this.koalas.findIndex(k => k.col === col && k.row === row);
        if (koalaIndex >= 0) {
          const removed = this.koalas.splice(koalaIndex, 1)[0];
          if (removed?.id === this.state.selectedKoalaId) this.state.selectedKoalaId = null;
        }
        if (!beforeTiles && koalaIndex < 0) this.ui.toast('Nothing to remove here.', 'warn');
        if (beforeTiles || koalaIndex >= 0) this.emitFx({ type: 'burst', col, row, text: 'Removed', tone: 'warn' });
        this.refreshUI();
        return beforeTiles || koalaIndex >= 0;
      }
      if (tool === 'koala') {
        this.state.money -= KG.TOOLS[tool].cost;
        const koala = KG.makeKoala(col, row, null, this.koalas.map(k => k.name));
        this.koalas.push(koala);
        this.state.selectedKoalaId = koala.id;
        this.ui.toast(`${koala.name} joined the habitat.`, 'good');
        this.emitFx({ type: 'burst', col, row, text: koala.name, tone: 'good' });
        this.checkProgressionUnlocks();
        this.refreshUI();
        return true;
      }
      this.state.money -= KG.TOOLS[tool].cost;
      this.tiles.set(KG.keyFor(col, row), { type: tool });
      if (tool === 'boardwalk') this.ui.toast('Boardwalk extended.', 'good');
      this.emitFx({ type: 'place', col, row, tileType: tool });
      this.maybeCompleteMission();
      this.checkProgressionUnlocks();
      this.refreshUI();
      return true;
    }
    selectNearestKoala(col, row) {
      let best = null, bestD = Infinity;
      for (const koala of this.koalas) {
        const d = Math.hypot(koala.col - col, koala.row - row);
        if (d < bestD && d <= KG.GAME_CONFIG.placement.selectDistance) { best = koala; bestD = d; }
      }
      this.state.selectedKoalaId = best ? best.id : null;
      if (best) this.emitFx({ type: 'select', col: best.col, row: best.row, text: best.name, tone: 'select' });
      if (best && this.currentTutorial?.id === 'select') this.state.tutorialDismissed = true;
      this.refreshUI();
    }
    nearType(col, row, type, radius = 2) {
      for (let dc = -radius; dc <= radius; dc++) for (let dr = -radius; dr <= radius; dr++) {
        const tile = this.tiles.get(KG.keyFor(KG.clamp(col + dc, 0, KG.GRID_COLS - 1), KG.clamp(row + dr, 0, KG.GRID_ROWS - 1)));
        if (tile && tile.type === type) return true;
      }
      return false;
    }
    update(delta) {
      if (this.state.paused) return;
      if (!this.state.activeQuiz) this.state.quizTimer -= delta;
      if (!this.state.activeQuiz && this.state.quizTimer <= 0) { this.triggerQuiz(); this.refreshUI(); return; }
      if (this.state.activeQuiz) {
        this._uiThrottle -= delta;
        if (this._uiDirty || this._uiThrottle <= 0) this.refreshUI();
        return;
      }
      this.state.timeOfDay += delta / KG.GAME_CONFIG.dayDuration;
      if (this.state.timeOfDay >= 1) { this.state.timeOfDay -= 1; this.advanceDay(); }
      this.updatePhaseLabel();
      this.updateKoalas(delta);
      this.updateVisitors(delta);
      this.updateCareScore();
      this.markUIDirty();
      this._uiThrottle -= delta;
      if (this._uiDirty || this._uiThrottle <= 0) this.refreshUI();
    }
    advanceDay() {
      this.state.day += 1;
      const income = this.visitors.length * KG.GAME_CONFIG.economy.visitorIncomePerDay + this.koalas.length * KG.GAME_CONFIG.economy.koalaIncomePerDay + this.getDailyIncomeBonus();
      this.state.money += income;
      const report = this.buildDailyReport(income);
      const anchor = this.koalas[0] || { col: 8, row: 8 };
      this.emitFx({ type: 'burst', col: anchor.col, row: anchor.row, text: `Day ${this.state.day}`, tone: 'select' });
      this.state.pendingReport = report;
      this.state.reports.unshift(report);
      this.state.reports = this.state.reports.slice(0, 7);
      if (income > 0) this.ui.toast(`Day ${this.state.day}: +$${income}`, 'good');
      this.checkProgressionUnlocks();
      this.ui.showReport(report);
    }
    buildDailyReport(income) {
      const notes = [];
      if (this.state.careScore >= 75) notes.push('Koalas are thriving and visitors are responding well to the habitat.');
      else if (this.state.careScore >= 55) notes.push('Habitat is stable, but one or more needs could use attention.');
      else notes.push('Care score is slipping. Add water, enrichment, or resting features soon.');
      if (this.countTiles('boardwalk') < 10) notes.push('More boardwalk tiles would improve visitor access and capacity.');
      if (!this.countTiles('enrichment')) notes.push('No enrichment stations yet. Koalas benefit from more stimulation.');
      if (!this.countTiles('vet')) notes.push('A Vet Hut is not built yet. Consider adding one for emergencies.');
      const thriving = this.koalas.filter(k => k.happiness > 70).length;
      if (thriving) notes.push(`${thriving} koala${thriving === 1 ? ' is' : 's are'} actively thriving in the current layout.`);
      const engagedVisitors = this.visitors.filter(v => v.mood > 65).length;
      if (engagedVisitors) notes.push(`${engagedVisitors} visitor${engagedVisitors === 1 ? ' is' : 's are'} reacting positively to habitat quality.`);
      if (this.getDailyIncomeBonus() > 0) notes.push(`Progression bonus is adding $${this.getDailyIncomeBonus()} to each day-end payout.`);
      return {
        day: this.state.day,
        visitors: this.visitors.length,
        careScore: this.state.careScore,
        income,
        koalas: this.koalas.length,
        summary: this.state.careScore >= 70 ? 'A strong day in the habitat.' : 'A workable day with room to improve.',
        notes,
      };
    }
    openReport() {
      const report = this.state.pendingReport || this.state.reports[0];
      if (!report) { this.ui.toast('No report yet. Finish a day first.', 'warn'); return; }
      this.ui.showReport(report);
    }
    closeReport() { this.ui.hideReport(); }
    countNearbyType(col, row, type, radius = 2) {
      let count = 0;
      for (let dc = -radius; dc <= radius; dc++) for (let dr = -radius; dr <= radius; dr++) {
        const tile = this.tiles.get(KG.keyFor(KG.clamp(col + dc, 0, KG.GRID_COLS - 1), KG.clamp(row + dr, 0, KG.GRID_ROWS - 1)));
        if (tile && tile.type === type) count += 1;
      }
      return count;
    }
    nearestTileOfType(col, row, type, radius = 6) {
      let best = null;
      let bestDist = Infinity;
      for (let dc = -radius; dc <= radius; dc++) for (let dr = -radius; dr <= radius; dr++) {
        const c = KG.clamp(col + dc, 0, KG.GRID_COLS - 1);
        const r = KG.clamp(row + dr, 0, KG.GRID_ROWS - 1);
        const tile = this.tiles.get(KG.keyFor(c, r));
        if (!tile || tile.type !== type) continue;
        const dist = Math.abs(c - col) + Math.abs(r - row);
        if (dist < bestDist) {
          best = { col: c, row: r, type };
          bestDist = dist;
        }
      }
      return best;
    }
    chooseKoalaTarget(koala) {
      const cfg = KG.GAME_CONFIG.koalas;
      const profile = koala.personalityProfile || {};
      const needs = [
        { score: (100 - koala.hydration) * (profile.hydrationBias || 1), type: 'water' },
        { score: (100 - koala.rest) * (profile.restBias || 1), type: koala.rest < 45 ? 'shelter' : 'platform' },
        { score: (100 - koala.happiness) * (profile.enrichmentAffinity || 1), type: 'enrichment' },
        { score: this.countNearbyType(koala.col, koala.row, 'tree', 2) === 0 ? 40 : 0, type: 'tree' },
      ].sort((a, b) => b.score - a.score);
      for (const option of needs) {
        if (option.score < 20) continue;
        const target = this.nearestTileOfType(koala.col, koala.row, option.type, cfg.attractionRadius);
        if (target) return target;
      }
      if ((profile.enrichmentAffinity || 1) > 1.2) {
        const target = this.nearestTileOfType(koala.col, koala.row, 'enrichment', cfg.attractionRadius);
        if (target) return target;
      }
      return null;
    }
    stepToward(actor, targetCol, targetRow) {
      let dc = 0, dr = 0;
      if (targetCol > actor.col) dc = 1;
      else if (targetCol < actor.col) dc = -1;
      else if (targetRow > actor.row) dr = 1;
      else if (targetRow < actor.row) dr = -1;
      actor.col = KG.clamp(actor.col + dc, 0, KG.GRID_COLS - 1);
      actor.row = KG.clamp(actor.row + dr, 0, KG.GRID_ROWS - 1);
    }
    chooseVisitorTarget(visitor) {
      const vcfg = KG.GAME_CONFIG.visitors;
      const choices = [];
      if (this.koalas.length) {
        const koala = KG.randItem(this.koalas);
        choices.push({ col: koala.col, row: koala.row, type: 'koala', weight: 1.3 });
      }
      ['enrichment', 'water', 'boardwalk', 'shelter'].forEach(type => {
        const tile = this.nearestTileOfType(visitor.col, visitor.row, type, vcfg.attractionRadius);
        if (tile) choices.push({ ...tile, weight: type === 'enrichment' ? 1.2 : 1.0 });
      });
      if (!choices.length) return null;
      choices.sort((a, b) => b.weight - a.weight);
      return choices[0];
    }
    scoreVisitorView(visitor) {
      const vcfg = KG.GAME_CONFIG.visitors;
      let score = this.state.careScore * 0.45;
      if (this.nearType(visitor.col, visitor.row, 'enrichment', 2)) score += vcfg.sightBonusEnrichment;
      if (this.nearType(visitor.col, visitor.row, 'water', 2)) score += vcfg.sightBonusWater;
      const nearKoala = this.koalas.some(k => Math.abs(k.col - visitor.col) + Math.abs(k.row - visitor.row) <= 2);
      if (nearKoala) score += vcfg.sightBonusKoala;
      if (this.state.careScore < 55) score -= vcfg.sightPenaltyLowCare;
      return score;
    }
    updateKoalas(delta) {
      const cfg = KG.GAME_CONFIG.koalas, tod = KG.GAME_CONFIG.timeOfDay;
      const night = this.state.timeOfDay < tod.morningStart || this.state.timeOfDay > tod.koalaNightStart;
      const dusk = this.state.timeOfDay > tod.koalaDuskStart && this.state.timeOfDay < tod.koalaNightStart;
      for (const k of this.koalas) {
        const profile = k.personalityProfile || {};
        k.hunger = KG.clamp(k.hunger - cfg.hungerDecay * delta, 0, 100);
        if (this.nearType(k.col, k.row, 'tree') || this.nearType(k.col, k.row, 'shrub')) {
          k.hunger = KG.clamp(k.hunger + cfg.hungerDecay * 1.5 * delta, 0, 100);
        }
        k.hydration = KG.clamp(k.hydration - cfg.hydrationDecay * delta * (profile.hydrationBias || 1), 0, 100);
        if (this.nearType(k.col, k.row, 'water')) {
          k.hydration = KG.clamp(k.hydration + cfg.hydrationDecay * 1.8 * delta, 0, 100);
        }
        k.rest = KG.clamp(k.rest + (night ? cfg.restGain : -cfg.restDecay * (profile.moveBias || 1)) * delta, 0, 100);
        if (k.hunger < cfg.criticalNeedThreshold || k.hydration < cfg.criticalNeedThreshold) k.health = KG.clamp(k.health - cfg.healthDecay * delta, 0, 100);
        else if (k.hunger > cfg.healthyNeedThreshold && k.hydration > cfg.healthyNeedThreshold) k.health = KG.clamp(k.health + cfg.healthRegen * delta, 0, 100);
        if (k.health < 25 && !k.sick && Math.random() < 0.002 * delta) {
          k.sick = true;
          this.ui.toast(`${k.name} has fallen ill!`, 'warn');
          this.emitFx({ type: 'burst', col: k.col, row: k.row, text: 'Sick!', tone: 'warn' });
        }
        if (k.sick && this.nearType(k.col, k.row, 'vet', 3)) {
          k.sick = false;
          k.health = KG.clamp(k.health + 20, 0, 100);
          this.ui.toast(`${k.name} was treated at the Vet Hut.`, 'good');
          this.emitFx({ type: 'burst', col: k.col, row: k.row, text: 'Treated', tone: 'good' });
        }
        let target = cfg.happinessBase;
        if (k.hunger > 50) target += cfg.foodBonus;
        if (k.hydration > 50) target += cfg.waterBonus;
        if (k.rest > 50) target += cfg.restBonus;
        if (this.nearType(k.col, k.row, 'tree')) target += cfg.treeBonus;
        if (this.nearType(k.col, k.row, 'water')) target += cfg.nearbyWaterBonus;
        if (this.nearType(k.col, k.row, 'enrichment')) target += cfg.enrichmentBonus * (profile.enrichmentAffinity || 1);
        if (this.nearType(k.col, k.row, 'platform')) target += cfg.platformBonus;
        if (this.nearType(k.col, k.row, 'shelter')) target += cfg.shelterBonus;
        const nearbyKoalas = this.koalas.filter(other => other.id !== k.id && Math.abs(other.col - k.col) + Math.abs(other.row - k.row) <= cfg.socialRadius).length;
        if (nearbyKoalas > 0) target += cfg.socialBonus * Math.min(nearbyKoalas, 2);
        if (nearbyKoalas > 2 && (profile.bravery || 1) < 0.9) target -= cfg.crowdPenalty;
        if (k.sick) target -= cfg.sickPenalty;
        k.happiness = KG.clamp(k.happiness + (target - k.happiness) * 0.01 * delta, 0, 100);

        if (k.health < 40 || k.hydration < 30) k.moodLabel = 'Needs support';
        else if (k.happiness > 75) k.moodLabel = 'Thriving';
        else if (k.rest < 35) k.moodLabel = 'Sleepy';
        else if ((profile.enrichmentAffinity || 1) > 1.2 && this.nearType(k.col, k.row, 'enrichment', 2)) k.moodLabel = 'Engaged';
        else k.moodLabel = 'Settled';

        k.moveTimer -= delta;
        k.targetTimer -= delta;
        if (!night && (k.targetTimer <= 0 || !k.targetType)) {
          const chosen = this.chooseKoalaTarget(k);
          if (chosen) {
            k.targetType = chosen.type;
            k.targetCol = chosen.col;
            k.targetRow = chosen.row;
            k.targetTimer = cfg.targetHoldMin + Math.random() * cfg.targetHoldRange;
          } else {
            k.targetType = null;
          }
        }
        if (k.moveTimer <= 0 && !night) {
          if (k.targetType) this.stepToward(k, k.targetCol, k.targetRow);
          else {
            const [dc, dr] = KG.randItem([[-1,0],[1,0],[0,-1],[0,1],[0,0]]);
            k.col = KG.clamp(k.col + dc, 0, KG.GRID_COLS - 1);
            k.row = KG.clamp(k.row + dr, 0, KG.GRID_ROWS - 1);
          }
          const pace = dusk ? cfg.duskMoveTimer : (cfg.moveTimerMin + Math.random() * cfg.moveTimerRange) / (profile.moveBias || 1);
          k.moveTimer = Math.max(0.8, pace);
        }
      }
    }
    updateVisitors(delta) {
      this.visitorTimer -= delta;
      const vcfg = KG.GAME_CONFIG.visitors;
      const max = Math.min(this.countTiles('boardwalk') * vcfg.perBoardwalkCapacity + this.koalas.length * vcfg.perKoalaCapacity + this.getVisitorCapBonus(), vcfg.maxCap + this.getVisitorCapBonus());
      if (this.visitorTimer <= 0 && this.visitors.length < max && this.countTiles('boardwalk') > 0) {
        this.spawnVisitor();
        this.visitorTimer = vcfg.spawnDelayMin + Math.random() * vcfg.spawnDelayRange;
      }
      for (let i = this.visitors.length - 1; i >= 0; i--) {
        const v = this.visitors[i];
        v.moveTimer -= delta;
        v.targetTimer -= delta;
        v.viewScore = this.scoreVisitorView(v);
        const moodTarget = KG.clamp(v.viewScore, 20, 95);
        const rate = moodTarget > v.mood ? vcfg.moodGainRate : vcfg.moodDecayRate;
        v.mood = KG.clamp(v.mood + ((moodTarget - v.mood) * rate * delta * 10), 0, 100);
        if (v.targetTimer <= 0 || !v.targetType) {
          const target = this.chooseVisitorTarget(v);
          if (target) {
            v.targetType = target.type;
            v.targetCol = target.col;
            v.targetRow = target.row;
            v.targetTimer = 4 + Math.random() * 5;
          }
        }
        if (v.moveTimer <= 0) {
          if (v.targetType) this.stepToward(v, v.targetCol, v.targetRow);
          else {
            const [dc, dr] = KG.randItem([[-1,0],[1,0],[0,-1],[0,1]]);
            v.col = KG.clamp(v.col + dc, 0, KG.GRID_COLS - 1);
            v.row = KG.clamp(v.row + dr, 0, KG.GRID_ROWS - 1);
          }
          v.moveTimer = vcfg.moveTimerMin + Math.random() * vcfg.moveTimerRange;
        }
        if (!v.hasDonated && v.mood >= vcfg.donationThreshold && (v.targetType === 'koala' || v.targetType === 'enrichment' || v.targetType === 'water')) {
          const donation = Math.round(vcfg.donateMin + Math.random() * vcfg.donateRange + (v.mood >= vcfg.generousThreshold ? 4 : 0));
          this.state.money += donation;
          v.hasDonated = true;
          this.ui.toast(`Visitor donated $${donation} after enjoying the habitat.`, 'good');
          this.emitFx({ type: 'burst', col: v.col, row: v.row, text: `+$${donation}`, tone: 'good' });
        }
        v.lifeTimer -= delta;
        if (v.lifeTimer <= 0) {
          this.visitors.splice(i, 1);
          this.state.totalVisitors += 1;
          this.checkProgressionUnlocks();
        }
      }
    }
    emitFx(event) {
      this.fxEvents.push({ ...event, id: `fx_${Math.random().toString(36).slice(2, 9)}` });
      if (this.fxEvents.length > 40) this.fxEvents.shift();
    }
    consumeFxEvents() {
      const events = this.fxEvents.slice();
      this.fxEvents.length = 0;
      return events;
    }
    spawnVisitor() {
      const boardwalks = [...this.tiles.entries()].filter(([, tile]) => tile.type === 'boardwalk');
      if (!boardwalks.length) return;
      const [key] = KG.randItem(boardwalks);
      const [col, row] = key.split(',').map(Number);
      this.visitors.push({
        id: `v_${Math.random().toString(36).slice(2,8)}`,
        col, row,
        moveTimer: 1,
        targetTimer: 0,
        targetType: 'boardwalk',
        targetCol: col, targetRow: row,
        mood: 55,
        viewScore: 50,
        hasDonated: false,
        lifeTimer: KG.GAME_CONFIG.visitors.lifeMin + Math.random() * KG.GAME_CONFIG.visitors.lifeRange
      });
    }
    updateCareScore() {
      if (!this.koalas.length) return;
      const total = this.koalas.reduce((sum, k) => sum + (k.hunger + k.hydration + k.rest + k.happiness + k.health) / 5, 0);
      this.state.careScore = Math.round(total / this.koalas.length);
    }
  };
})();
