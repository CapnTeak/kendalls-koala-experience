(() => {
  const KG = window.KoalaGame;
  const TILE_ICONS = { tree: '🌳', shrub: '🌿', rock: '🗻', water: '💧', shelter: '🏠', platform: '🟫', boardwalk: '🛤️', enrichment: '🎾', vet: '🏥' };
  KG.MainScene = class extends Phaser.Scene {
    constructor() { super('main'); }
    create() {
      KG.shared.scene = this;
      this.model = KG.shared.model;
      this.world = this.add.container(0, 0);
      this.tileLayer = this.add.container(0, 0);
      this.overlayLayer = this.add.container(0, 0);
      this.actorLayer = this.add.container(0, 0);
      this.fxLayer = this.add.container(0, 0);
      this.world.add([this.tileLayer, this.overlayLayer, this.actorLayer, this.fxLayer]);
      this.cameras.main.setBackgroundColor(0xbde1ff);
      this.input.addPointer(2);

      this.hover = { col: 0, row: 0, visible: false };
      this.lightingOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x11233f, 0).setOrigin(0).setScrollFactor(0).setDepth(999);
      this.centerWorld();
      this.input.on('pointerdown', (pointer) => {
        this.dragging = false;
        this.dragStart = { x: pointer.x, y: pointer.y, wx: this.world.x, wy: this.world.y };
      });
      this.input.on('pointermove', (pointer) => {
        const scale = this.world.scaleX || 1;
        const localX = (pointer.x - this.world.x) / scale;
        const localY = (pointer.y - this.world.y) / scale;
        const pos = KG.screenToIso(localX, localY);
        this.hover = { col: pos.col, row: pos.row, visible: true };
        if (!pointer.isDown || !this.dragStart) return;
        const dx = pointer.x - this.dragStart.x;
        const dy = pointer.y - this.dragStart.y;
        if (Math.hypot(dx, dy) > 8) this.dragging = true;
        if (this.dragging) {
          this.world.x = this.dragStart.wx + dx;
          this.world.y = this.dragStart.wy + dy;
          this.clampWorldPosition();
        }
      });
      this.input.on('pointerout', () => { this.hover.visible = false; });
      this.input.on('pointerup', (pointer) => {
        if (this.dragging) return;
        const scale = this.world.scaleX || 1;
        const localX = (pointer.x - this.world.x) / scale;
        const localY = (pointer.y - this.world.y) / scale;
        const pos = KG.screenToIso(localX, localY);
        if (this.model.state.currentTool === 'select') this.model.selectNearestKoala(pos.col, pos.row);
        else this.model.placeAt(pos.col, pos.row);
        this.renderAll();
      });
      this.scale.on('resize', (gameSize) => {
        this.centerWorld();
        this.lightingOverlay.setSize(gameSize.width, gameSize.height);
        this.clampWorldPosition();
        this.renderAll();
      });
      this.renderAll();
    }
    getBoardBounds() {
      const corners = [
        KG.isoToWorld(0, 0),
        KG.isoToWorld(KG.GRID_COLS, 0),
        KG.isoToWorld(0, KG.GRID_ROWS),
        KG.isoToWorld(KG.GRID_COLS, KG.GRID_ROWS),
      ];
      const minX = Math.min(...corners.map(p => p.x)) - 80;
      const maxX = Math.max(...corners.map(p => p.x)) + 80;
      const minY = Math.min(...corners.map(p => p.y)) - 60;
      const maxY = Math.max(...corners.map(p => p.y)) + 120;
      return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
    }
    fitWorldToViewport() {
      const bounds = this.getBoardBounds();
      const availableWidth = Math.max(280, this.scale.width - 24);
      const availableHeight = Math.max(240, this.scale.height - 24);
      const scaleX = availableWidth / bounds.width;
      const scaleY = availableHeight / bounds.height;
      const targetScale = Phaser.Math.Clamp(Math.min(scaleX, scaleY, 1), 0.55, 1);
      this.world.setScale(targetScale);
      this._boardBounds = bounds;
    }
    centerWorld() {
      this.fitWorldToViewport();
      const bounds = this._boardBounds || this.getBoardBounds();
      const s = this.world.scaleX || 1;
      const centeredX = Math.floor((this.scale.width - (bounds.minX + bounds.maxX) * s) * 0.5);
      const centeredY = Math.floor((this.scale.height - (bounds.minY + bounds.maxY) * s) * 0.5);
      this.world.x = centeredX;
      this.world.y = centeredY;
      this.clampWorldPosition();
    }
    clampWorldPosition() {
      const bounds = this._boardBounds || this.getBoardBounds();
      const s = this.world.scaleX || 1;
      const padX = Math.max(36, this.scale.width * 0.06);
      const padY = Math.max(36, this.scale.height * 0.06);
      const minX = this.scale.width - (bounds.maxX * s) - padX;
      const maxX = -(bounds.minX * s) + padX;
      const minY = this.scale.height - (bounds.maxY * s) - padY;
      const maxY = -(bounds.minY * s) + padY;
      this.world.x = Phaser.Math.Clamp(this.world.x, minX, maxX);
      this.world.y = Phaser.Math.Clamp(this.world.y, minY, maxY);
    }
    update(timeMs, deltaMs) {

      this.model.update(deltaMs / 1000);
      this.renderAll(timeMs / 1000);
      this.playFxEvents();
    }
    playFxEvents() {
      for (const event of this.model.consumeFxEvents()) {
        const p = KG.isoToWorld(event.col, event.row);
        if (event.type === 'place') {
          for (let i = 0; i < 6; i++) {
            const dot = this.add.circle(p.x, p.y + 10, 3 + Math.random() * 2, 0xfff7c2, 0.9);
            this.fxLayer.add(dot);
            this.tweens.add({
              targets: dot,
              x: p.x + Phaser.Math.Between(-24, 24),
              y: p.y + Phaser.Math.Between(-24, 10),
              alpha: 0,
              scale: 0.2,
              duration: 450 + Math.random() * 180,
              onComplete: () => dot.destroy()
            });
          }
        }
        const toneMap = { good: '#f3ffe1', warn: '#ffe3d6', select: '#fff4b5' };
        if (event.type === 'burst' || event.type === 'select') {
          const label = this.add.text(p.x, p.y - 6, event.text || '', { fontSize: '14px', color: '#173222', backgroundColor: toneMap[event.tone] || '#ffffff', padding: { x: 8, y: 5 } }).setOrigin(0.5);
          this.fxLayer.add(label);
          this.tweens.add({ targets: label, y: label.y - 32, alpha: 0, duration: 950, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
        }
      }
    }
    renderAll(timeSeconds = 0) {
      this.tileLayer.removeAll(true);
      this.overlayLayer.removeAll(true);
      this.actorLayer.removeAll(true);
      for (let row = 0; row < KG.GRID_ROWS; row++) for (let col = 0; col < KG.GRID_COLS; col++) this.drawTile(col, row, this.model.tileAt(col, row)?.type || 'grass', timeSeconds);
      if (this.hover.visible) this.drawHover(this.hover.col, this.hover.row, timeSeconds);
      const visitors = [...this.model.visitors].sort((a, b) => (a.col + a.row) - (b.col + b.row));
      const koalas = [...this.model.koalas].sort((a, b) => (a.col + a.row) - (b.col + b.row));
      for (const visitor of visitors) this.drawActor(visitor, '🧍', 16, false, timeSeconds);
      for (const koala of koalas) this.drawActor(koala, '🐨', 20, koala.id === this.model.state.selectedKoalaId, timeSeconds);
      this.updateLighting();
    }
    updateLighting() {
      const tod = this.model.state.timeOfDay;
      const cfg = KG.GAME_CONFIG.timeOfDay;
      const polish = KG.GAME_CONFIG.polish;
      let alpha = polish.lightingAlphaDay;
      if (tod >= cfg.eveningStart && tod < cfg.nightStart) alpha = polish.lightingAlphaEvening;
      else if (tod >= cfg.nightStart || tod < cfg.morningStart) alpha = polish.lightingAlphaNight;
      this.lightingOverlay.setAlpha(alpha);
    }
    drawTile(col, row, type, timeSeconds) {
      const p = KG.isoToWorld(col, row);
      const color = KG.TILE_COLORS[type] || KG.TILE_COLORS.grass;
      const g = this.add.graphics({ x: p.x, y: p.y });
      g.lineStyle(1, 0x000000, 0.12);
      g.fillStyle(color, 1);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(KG.TILE_W / 2, KG.TILE_H / 2);
      g.lineTo(0, KG.TILE_H);
      g.lineTo(-KG.TILE_W / 2, KG.TILE_H / 2);
      g.closePath();
      g.fillPath();
      g.strokePath();
      const polish = KG.GAME_CONFIG.polish;
      if (type === 'water') {
        const shimmer = 0.11 + ((Math.sin(timeSeconds * polish.waterShimmerSpeed + (col + row) * 0.4) + 1) * 0.07);
        g.fillStyle(0xffffff, shimmer);
        g.fillEllipse(-10, 10, 20, 6);
      }
      if (type === 'boardwalk') {
        g.lineStyle(2, 0xffffff, polish.boardwalkStripeAlpha);
        g.lineBetween(-18, 10, -2, 18);
        g.lineBetween(2, 2, 18, 10);
      }
      if (type === 'tree' || type === 'shrub') {
        g.fillStyle(0xffffff, polish.tileGlowAlpha);
        g.fillEllipse(0, 10, 18, 8);
      }
      this.tileLayer.add(g);
      if (type !== 'grass' && TILE_ICONS[type]) {
        const bob = Math.sin(timeSeconds * 1.4 + (col * 0.9 + row * 0.4)) * (type === 'water' ? 1.2 : 0.6);
        const t = this.makeEmojiText(p.x, p.y + 8 + bob, TILE_ICONS[type], 18).setOrigin(0.5, 0.7);
        this.tileLayer.add(t);
      }
    }
    drawHover(col, row, timeSeconds) {
      const p = KG.isoToWorld(col, row);
      const status = this.model.getHoverStatus(col, row);
      const pulse = 0.34 + (Math.sin(timeSeconds * KG.GAME_CONFIG.placement.highlightPulseSpeed) + 1) * 0.14;
      const toneMap = {
        valid: { line: 0x7cff90, fill: 0xc4ffd0 },
        invalid: { line: 0xff7b7b, fill: 0xffd2d2 },
        select: { line: 0xffec8a, fill: 0xfff5bf },
      };
      const tone = toneMap[status.tone] || toneMap.select;
      const g = this.add.graphics({ x: p.x, y: p.y });
      g.lineStyle(2, tone.line, 0.95);
      g.fillStyle(tone.fill, pulse);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(KG.TILE_W / 2, KG.TILE_H / 2);
      g.lineTo(0, KG.TILE_H);
      g.lineTo(-KG.TILE_W / 2, KG.TILE_H / 2);
      g.closePath();
      g.fillPath();
      g.strokePath();
      this.overlayLayer.add(g);
      const label = this.add.text(p.x, p.y - 10, status.label, { fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.85)', color: '#173222', padding: { x: 6, y: 4 } }).setOrigin(0.5, 1);
      this.overlayLayer.add(label);
    }
    makeEmojiText(x, y, emoji, size) {
      return this.add.text(x, y, emoji, { fontSize: `${size}px`, align: 'center' }).setPadding(0, Math.ceil(size * 0.3), 0, 0);
    }
    drawActor(actor, emoji, size, selected, timeSeconds) {
      const p = KG.isoToWorld(actor.col, actor.row);
      const hash = KG.hashString(actor.id || `${actor.col},${actor.row}`);
      const phase = (hash % 360) * (Math.PI / 180);
      const polish = KG.GAME_CONFIG.polish;
      const bob = Math.sin(timeSeconds * polish.actorBobSpeed + phase) * polish.actorBobAmount;
      const wobble = Math.sin(timeSeconds * (polish.actorBobSpeed * 0.7) + phase) * polish.actorWobbleAmount;
      const shadow = this.add.ellipse(p.x, p.y + 18, size + 10, 10, 0x000000, polish.shadowAlpha);
      shadow.scaleX += Math.sin(timeSeconds * 1.2 + phase) * 0.05;
      this.actorLayer.add(shadow);
      if (selected) {
        const ringPulse = (Math.sin(timeSeconds * polish.selectedRingPulseSpeed) + 1) * polish.selectedRingPulseAlpha;
        const ring = this.add.circle(p.x, p.y + 10, 18, 0xfff59d, polish.selectedRingBaseAlpha + ringPulse);
        this.actorLayer.add(ring);
      }
      const t = this.makeEmojiText(p.x, p.y + 10 + bob, emoji, size).setOrigin(0.5, 0.72);
      t.rotation = wobble;
      if (selected) t.setScale(1.06);
      this.actorLayer.add(t);
      if (actor.moodLabel && emoji === '🐨') {
        const mood = this.add.text(p.x, p.y - 12 + bob, actor.moodLabel, { fontSize: '10px', color: '#173222', backgroundColor: 'rgba(255,255,255,0.78)', padding: { x: 4, y: 2 } }).setOrigin(0.5, 1);
        this.actorLayer.add(mood);
      }
    }
  };
})();
