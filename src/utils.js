(() => {
  const KG = window.KoalaGame;
  KG.keyFor = (col, row) => `${col},${row}`;
  KG.clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  KG.rand = (min, max) => Math.random() * (max - min) + min;
  KG.randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  KG.hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    return Math.abs(hash);
  };
  KG.isoToWorld = (col, row) => ({ x: (col - row) * KG.TILE_W / 2, y: (col + row) * KG.TILE_H / 2 });
  KG.screenToIso = (worldX, worldY) => {
    const col = Math.floor((worldX / (KG.TILE_W / 2) + worldY / (KG.TILE_H / 2)) / 2);
    const row = Math.floor((worldY / (KG.TILE_H / 2) - worldX / (KG.TILE_W / 2)) / 2);
    return { col: KG.clamp(col, 0, KG.GRID_COLS - 1), row: KG.clamp(row, 0, KG.GRID_ROWS - 1) };
  };
  KG.makeUniqueKoalaName = (existingNames = [], forcedName = null) => {
    const used = new Set((existingNames || []).filter(Boolean));
    if (forcedName) {
      if (!used.has(forcedName)) return forcedName;
      let suffix = 2;
      while (used.has(`${forcedName} ${suffix}`)) suffix += 1;
      return `${forcedName} ${suffix}`;
    }
    const available = KG.KOALA_NAMES.filter(name => !used.has(name));
    if (available.length) return KG.randItem(available);
    const base = KG.randItem(KG.KOALA_NAMES);
    let suffix = 2;
    while (used.has(`${base} ${suffix}`)) suffix += 1;
    return `${base} ${suffix}`;
  };

  KG.makeKoala = (col, row, forcedName = null, existingNames = []) => {
    const personality = KG.randItem(KG.PERSONALITIES);
    const profile = KG.PERSONALITY_PROFILES[personality] || {};
    return {
      id: `k_${Math.random().toString(36).slice(2, 10)}`,
      col, row,
      name: KG.makeUniqueKoalaName(existingNames, forcedName),
      personality,
      personalityProfile: { ...profile },
      hunger: 80, hydration: 80, rest: 70, happiness: 65, health: 90,
      moveTimer: KG.rand(1, 4), sick: false,
      targetType: null, targetCol: col, targetRow: row, targetTimer: 0, moodLabel: 'Settled',
      gender: Math.random() < 0.5 ? 'Male' : 'Female',
    };
  };
})();
