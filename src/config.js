window.KoalaGame = window.KoalaGame || {};
Object.assign(window.KoalaGame, {
  SAVE_KEY: 'koala-phaser3-v3',
  TILE_W: 64,
  TILE_H: 32,
  GRID_COLS: 24,
  GRID_ROWS: 20,
  TOOLS: {
    select: { icon: '🖱️', cost: 0, label: 'Select' },
    tree: { icon: '🌳', cost: 0, label: 'Tree' },
    shrub: { icon: '🌿', cost: 0, label: 'Shrub' },
    rock: { icon: '🗻', cost: 0, label: 'Rock' },
    water: { icon: '💧', cost: 0, label: 'Water' },
    shelter: { icon: '🏠', cost: 80, label: 'Shelter' },
    platform: { icon: '🟫', cost: 60, label: 'Platform' },
    boardwalk: { icon: '🛤️', cost: 30, label: 'Boardwalk' },
    enrichment: { icon: '🎾', cost: 50, label: 'Enrichment' },
    koala: { icon: '🐨', cost: 150, label: 'Koala' },
    vet: { icon: '🏥', cost: 200, label: 'Vet Hut' },
    remove: { icon: '🧹', cost: 0, label: 'Remove' },
  },
  KOALA_NAMES: ['Matilda','Bindi','Gumnut','Wattle','Kobi','Rosie','Digger','Sunny','Daisy','Archie','Stella','Possum'],
  PERSONALITIES: ['Curious','Sleepy','Playful','Gentle','Brave','Shy','Friendly','Cheeky'],
  PERSONALITY_PROFILES: {
    Curious: { moveBias: 1.2, enrichmentAffinity: 1.35, restBias: 0.9, hydrationBias: 1.0, bravery: 1.1 },
    Sleepy: { moveBias: 0.75, enrichmentAffinity: 0.8, restBias: 1.35, hydrationBias: 1.0, bravery: 0.9 },
    Playful: { moveBias: 1.15, enrichmentAffinity: 1.5, restBias: 0.85, hydrationBias: 1.0, bravery: 1.05 },
    Gentle: { moveBias: 0.95, enrichmentAffinity: 1.0, restBias: 1.0, hydrationBias: 1.05, bravery: 0.95 },
    Brave: { moveBias: 1.1, enrichmentAffinity: 1.05, restBias: 0.95, hydrationBias: 1.0, bravery: 1.3 },
    Shy: { moveBias: 0.85, enrichmentAffinity: 0.9, restBias: 1.1, hydrationBias: 1.0, bravery: 0.7 },
    Friendly: { moveBias: 1.0, enrichmentAffinity: 1.15, restBias: 0.95, hydrationBias: 1.0, bravery: 1.0 },
    Cheeky: { moveBias: 1.25, enrichmentAffinity: 1.25, restBias: 0.8, hydrationBias: 1.05, bravery: 1.2 },
  },
  TILE_COLORS: {
    grass: 0x7cb87a, tree: 0x4a7c3f, shrub: 0x5a9e50, rock: 0x9e8a6e, water: 0x4faacb,
    shelter: 0xa0785a, platform: 0xc49a6c, boardwalk: 0xc8a87e, enrichment: 0x7b9e3f, vet: 0xd8ecd8,
  },
  GAME_CONFIG: {
    dayDuration: 900,
    economy: { startingMoney: 500, missionReward: 75, visitorIncomePerDay: 15, koalaIncomePerDay: 10 },
    timeOfDay: { morningStart: 0.22, afternoonStart: 0.45, eveningStart: 0.65, nightStart: 0.78, koalaNightStart: 0.85, koalaDuskStart: 0.60 },
    placement: { selectDistance: 1, highlightPulseSpeed: 2.8 },
    polish: {
      actorBobAmount: 4.5, actorBobSpeed: 1.9, actorWobbleAmount: 0.05, shadowAlpha: 0.18,
      waterShimmerSpeed: 2.6, boardwalkStripeAlpha: 0.16, tileGlowAlpha: 0.16,
      selectedRingPulseSpeed: 3.4, selectedRingBaseAlpha: 0.32, selectedRingPulseAlpha: 0.22,
      lightingAlphaDay: 0.02, lightingAlphaEvening: 0.1, lightingAlphaNight: 0.2
    },
    koalas: {
      lowNeedThreshold: 25, criticalNeedThreshold: 20, healthyNeedThreshold: 60,
      hungerDecay: 1.08, hydrationDecay: 1.32, restGain: 2.4, restDecay: 0.6, healthDecay: 0.96, healthRegen: 0.48,
      moveTimerMin: 4, moveTimerRange: 4, duskMoveTimer: 1.5,
      happinessBase: 50, foodBonus: 14, waterBonus: 13, restBonus: 9, treeBonus: 14, nearbyWaterBonus: 9, enrichmentBonus: 10, platformBonus: 7, shelterBonus: 8, sickPenalty: 28,
      attractionRadius: 6, socialRadius: 3, socialBonus: 5, crowdPenalty: 7, targetHoldMin: 5, targetHoldRange: 6,
    },
    visitors: {
      maxCap: 20, perBoardwalkCapacity: 2, perKoalaCapacity: 3, spawnDelayMin: 4, spawnDelayRange: 8, moveTimerMin: 1.5, moveTimerRange: 2.5, lifeMin: 60, lifeRange: 60,
      attractionRadius: 7, donateMin: 6, donateRange: 14, sightBonusKoala: 10, sightBonusEnrichment: 8, sightBonusWater: 4, sightPenaltyLowCare: 8,
      moodGainRate: 0.08, moodDecayRate: 0.03, donationThreshold: 58, generousThreshold: 74
    },
    ui: { toastMs: 4000, quizInterval: 300 },

    quiz: {
      rewardMoney: 30,
      penaltyMoney: 10,
      rewardCare: 5,
      penaltyCare: 3,
      questions: [
        {
          prompt: 'What feature helps visitors move through the habitat?',
          answers: [
            { text: 'Boardwalk', correct: true },
            { text: 'Rock pile', correct: false },
            { text: 'Vet Hut', correct: false },
          ],
          explanation: 'Boardwalk tiles improve visitor access and expand visitor capacity.'
        },
        {
          prompt: 'Which nearby feature helps keep koalas hydrated?',
          answers: [
            { text: 'Water', correct: true },
            { text: 'Platform', correct: false },
            { text: 'Shrub only', correct: false },
          ],
          explanation: 'Water features support hydration and boost koala well-being.'
        },
        {
          prompt: 'What is a good early build for happier koalas?',
          answers: [
            { text: 'Enrichment station', correct: true },
            { text: 'More empty grass', correct: false },
            { text: 'Removing all trees', correct: false },
          ],
          explanation: 'Enrichment gives koalas stimulation and improves happiness.'
        },
        {
          prompt: 'Why would you add a Vet Hut?',
          answers: [
            { text: 'To prepare for health issues', correct: true },
            { text: 'To attract more rocks', correct: false },
            { text: 'To replace all boardwalks', correct: false },
          ],
          explanation: 'The Vet Hut prepares the habitat for health-related events and care.'
        }
      ]
    },
    progression: {
      levels: [
        { id: 'caretaker', title: 'Caretaker I', body: 'Reach a care score of 65.', check: 'careScore', goal: 65, reward: { money: 50 } },
        { id: 'host', title: 'Habitat Host', body: 'Welcome 10 total visitors.', check: 'totalVisitors', goal: 10, reward: { visitorCapBonus: 4 } },
        { id: 'scholar', title: 'Koala Scholar', body: 'Answer 3 quiz questions correctly.', check: 'quizCorrect', goal: 3, reward: { dailyIncomeBonus: 10 } },
        { id: 'builder', title: 'Sanctuary Builder', body: 'Grow the habitat to 4 koalas.', check: 'koalaCount', goal: 4, reward: { missionRewardBonus: 25 } },
      ]
    },
    tutorial: [
      { id: 'welcome', title: 'Welcome to the habitat', body: 'Start by selecting Boardwalk in the toolbar and extending the path for visitors.' },
      { id: 'select', title: 'Inspect a koala', body: 'Use Select and click a koala to open its detail card and check its needs.' },
      { id: 'build', title: 'Build with confidence', body: 'Green highlights mean a tile is placeable. Red highlights mean the placement is blocked or unaffordable.' },
    ],
    missions: [
      { id:'boardwalk', title:'Welcome Visitors', body:'Extend the boardwalk by 4 tiles.', goal:4 },
      { id:'care', title:'Happy Habitat', body:'Raise care score to at least 75.', goal:75 },
      { id:'enrich', title:'Curious Koalas', body:'Build 2 enrichment stations.', goal:2 },
      { id:'vet', title:'Clinic Ready', body:'Build a Vet Hut for emergencies.', goal:1 },
    ],
  }
});
