(() => {
  const KG = window.KoalaGame;
  KG.DOMUI = class {
    _requireEl(id) {
      const el = document.getElementById(id);
      if (!el) console.error(`DOMUI: Missing required element #${id}`);
      return el;
    }
    constructor(controls) {
      this.controls = controls;
      this.toastStack = this._requireEl('toast-stack');
      this.moneyEl = this._requireEl('money-display');
      this.visitorsEl = this._requireEl('visitors-display');
      this.careEl = this._requireEl('care-display');
      this.timeEl = this._requireEl('time-display');
      this.koalaCardEl = this._requireEl('koala-card');
      this.missionTitleEl = this._requireEl('mission-title');
      this.missionBodyEl = this._requireEl('mission-body');
      this.missionProgressEl = this._requireEl('mission-progress');
      this.missionFillEl = this._requireEl('mission-fill');
      this.pauseBtn = this._requireEl('pause-btn');
      this.tutorialPanel = this._requireEl('tutorial-panel');
      this.tutorialTitleEl = this._requireEl('tutorial-title');
      this.tutorialBodyEl = this._requireEl('tutorial-body');
      this.reportPreviewEl = this._requireEl('report-preview');
      this.progressionRankEl = document.getElementById('progression-rank');
      this.progressionBodyEl = document.getElementById('progression-body');
      this.progressionFillEl = document.getElementById('progression-fill');
      this.progressionProgressEl = document.getElementById('progression-progress');
      this.quizModal = this._requireEl('quiz-modal');
      this.quizQuestionEl = document.getElementById('quiz-question');
      this.quizAnswersEl = this._requireEl('quiz-answers');
      this.quizFeedbackEl = document.getElementById('quiz-feedback');
      this.quizActionsEl = document.getElementById('quiz-actions');
      this.reportModal = this._requireEl('report-modal');
      this.reportTitleEl = document.getElementById('report-title');
      this.reportBodyEl = this._requireEl('report-body');
      this.buildToolbar();
      this._requireEl('save-btn')?.addEventListener('click', () => controls.save());
      this._requireEl('load-btn')?.addEventListener('click', () => controls.load());
      this.pauseBtn?.addEventListener('click', () => controls.togglePause());
      this._requireEl('tutorial-dismiss-btn')?.addEventListener('click', () => controls.dismissTutorial());
      this._requireEl('quiz-close-btn')?.addEventListener('click', () => controls.closeQuiz());
      this._requireEl('open-report-btn')?.addEventListener('click', () => controls.openReport());
      this._requireEl('close-report-btn')?.addEventListener('click', () => controls.closeReport());
      this._requireEl('report-ok-btn')?.addEventListener('click', () => controls.closeReport());
      this.reportModal?.addEventListener('click', (e) => { if (e.target === this.reportModal) controls.closeReport(); });
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (this.reportModal && !this.reportModal.classList.contains('hidden')) controls.closeReport();
        if (this.quizModal && !this.quizModal.classList.contains('hidden')) controls.closeQuiz();
      });
      this.quizModal.addEventListener('click', (e) => { if (e.target === this.quizModal && this.quizActionsEl.classList.contains('hidden') === false) controls.closeQuiz(); });
    }
    _setIfChanged(el, cacheKey, value) {
      if (!el) return;
      if (this[cacheKey] !== value) {
        el.textContent = value;
        this[cacheKey] = value;
      }
    }
    buildToolbar() {
      const toolbar = document.getElementById('toolbar');
      toolbar.innerHTML = '';
      Object.entries(KG.TOOLS).forEach(([key, tool]) => {
        const btn = document.createElement('button');
        btn.className = 'tool-btn';
        btn.dataset.tool = key;
        btn.innerHTML = `${tool.icon} ${tool.label}<span class="cost">${tool.cost ? `$${tool.cost}` : ''}</span>`;
        btn.addEventListener('click', () => this.controls.setTool(key));
        toolbar.appendChild(btn);
      });
    }
    syncTool(toolKey) {
      document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tool === toolKey));
    }
    pulseTool(toolKey, enabled) {
      document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.toggle('attention', enabled && btn.dataset.tool === toolKey));
    }
    updateStats(model) {
      this._setIfChanged(this.moneyEl, '_moneyText', `$${model.state.money}`);
      this._setIfChanged(this.visitorsEl, '_visitorsText', `${model.visitors.length} visitors`);
      this._setIfChanged(this.careEl, '_careText', `Care ${model.state.careScore}`);
      this._setIfChanged(this.timeEl, '_timeText', `${model.phaseLabel} D${model.state.day}`);
      this._setIfChanged(this.pauseBtn, '_pauseText', model.state.paused ? 'Resume' : 'Pause');
    }
    updateMission(mission, progress) {
      this._setIfChanged(this.missionTitleEl, '_missionTitleText', mission.title);
      this._setIfChanged(this.missionBodyEl, '_missionBodyText', mission.body);
      this._setIfChanged(this.missionProgressEl, '_missionProgressText', `${Math.min(progress, mission.goal)} / ${mission.goal}`);
      const fillWidth = `${Math.max(0, Math.min(100, progress / mission.goal * 100))}%`;
      if (this._missionFillWidth !== fillWidth) {
        this.missionFillEl.style.width = fillWidth;
        this._missionFillWidth = fillWidth;
      }
    }
    updateKoalaCard(koala) {
      if (!koala) {
        this.koalaCardEl.innerHTML = 'Click a koala to inspect it.';
        return;
      }
      const mood = koala.happiness >= 80 ? 'Thriving' : koala.happiness >= 60 ? 'Content' : koala.happiness >= 40 ? 'Uneasy' : 'Needs attention';
      const need = (label, val) => `<div class="row"><span>${label}</span><strong>${Math.round(val)}</strong></div>`;
      const tags = [
        `Mood: ${mood}`,
        koala.sick ? 'Under watch' : 'Stable',
        `${koala.gender}`,
        koala.personality,
      ].map(t => `<span class="tag">${t}</span>`).join('');
      this.koalaCardEl.innerHTML = `
        <div class="koala-name">${koala.name}</div>
        <div class="koala-sub">${koala.personality} · ${koala.gender}</div>
        <div class="needs-grid">
          ${need('Hunger', koala.hunger)}
          ${need('Hydration', koala.hydration)}
          ${need('Rest', koala.rest)}
          ${need('Happiness', koala.happiness)}
          ${need('Health', koala.health)}
        </div>
        <div class="tag-row">${tags}</div>
      `;
    }
    updateTutorial(step, activeTool) {
      if (!step) {
        this.tutorialPanel.style.display = 'none';
        this.pulseTool(activeTool, false);
        return;
      }
      this.tutorialPanel.style.display = '';
      this.tutorialTitleEl.textContent = step.title;
      this.tutorialBodyEl.textContent = step.body;
      this.pulseTool(step.id === 'welcome' ? 'boardwalk' : step.id === 'select' ? 'select' : activeTool, true);
    }
    updateProgression(progress) {
      const rank = progress.current ? progress.current.title : 'Starter Sanctuary';
      const body = progress.current ? progress.current.body : 'Keep building and caring for koalas to unlock habitat bonuses.';
      this._setIfChanged(this.progressionRankEl, '_progressionRankText', rank);
      this._setIfChanged(this.progressionBodyEl, '_progressionBodyText', body);
      this._setIfChanged(this.progressionProgressEl, '_progressionProgressText', `${Math.min(progress.value, progress.goal)} / ${progress.goal}`);
      const fillWidth = `${Math.max(0, Math.min(100, progress.value / progress.goal * 100))}%`;
      if (this._progressionFillWidth !== fillWidth) {
        this.progressionFillEl.style.width = fillWidth;
        this._progressionFillWidth = fillWidth;
      }
    }
    showQuiz(quiz) {
      this.quizQuestionEl.textContent = quiz.prompt;
      this.quizAnswersEl.innerHTML = '';
      this.quizFeedbackEl.textContent = '';
      this.quizFeedbackEl.className = 'quiz-feedback hidden';
      this.quizActionsEl.classList.add('hidden');
      const answerOrder = quiz.answers.map((_, index) => index).sort(() => Math.random() - 0.5);
      answerOrder.forEach((originalIndex) => {
        const answer = quiz.answers[originalIndex];
        const btn = document.createElement('button');
        btn.className = 'quiz-answer-btn';
        btn.textContent = answer.text;
        btn.addEventListener('click', () => this.controls.answerQuiz(originalIndex));
        this.quizAnswersEl.appendChild(btn);
      });
      this.quizModal.classList.remove('hidden');
      this.quizModal.setAttribute('aria-hidden', 'false');
    }
    resolveQuiz(result) {
      this.quizAnswersEl.querySelectorAll('button').forEach(btn => btn.disabled = true);
      this.quizFeedbackEl.className = `quiz-feedback ${result.correct ? 'good' : 'warn'}`;
      this.quizFeedbackEl.textContent = result.message;
      this.quizActionsEl.classList.remove('hidden');
    }
    hideQuiz() {
      this.quizModal.classList.add('hidden');
      this.quizModal.setAttribute('aria-hidden', 'true');
    }
    updateReportPreview(report) {
      if (!report) {
        if (this._reportPreviewHtml !== '') {
          this.reportPreviewEl.textContent = 'Reports appear at the end of each day.';
          this._reportPreviewHtml = '';
        }
        return;
      }
      const html = `<strong>Day ${report.day}</strong> · ${report.summary}`;
      if (this._reportPreviewHtml !== html) {
        this.reportPreviewEl.innerHTML = html;
        this._reportPreviewHtml = html;
      }
    }
    showReport(report) {
      if (!report) return;
      this.reportTitleEl.textContent = `Habitat Report — Day ${report.day}`;
      this.reportBodyEl.innerHTML = `
        <div class="report-grid">
          <div class="report-stat"><span class="label">Visitors today</span><strong>${report.visitors}</strong></div>
          <div class="report-stat"><span class="label">Care score</span><strong>${report.careScore}</strong></div>
          <div class="report-stat"><span class="label">Income earned</span><strong>$${report.income}</strong></div>
          <div class="report-stat"><span class="label">Koalas in habitat</span><strong>${report.koalas}</strong></div>
        </div>
        <div>
          <div class="panel-topline">Notes</div>
          <ul class="report-list">${report.notes.map(note => `<li>${note}</li>`).join('')}</ul>
        </div>
      `;
      this.reportModal.classList.remove('hidden');
      this.reportModal.setAttribute('aria-hidden', 'false');
    }
    hideReport() {
      this.reportModal.classList.add('hidden');
      this.reportModal.setAttribute('aria-hidden', 'true');
    }
    toast(text, tone = '') {
      const el = document.createElement('div');
      el.className = `toast ${tone}`.trim();
      el.textContent = text;
      this.toastStack.prepend(el);
      while (this.toastStack.children.length > 4) this.toastStack.lastChild.remove();
      setTimeout(() => el.remove(), KG.GAME_CONFIG.ui.toastMs);
    }
  };
})();
