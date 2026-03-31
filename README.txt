Kendall's Koala Experience — Phaser 3 parity build

This pass adds the first three feature-parity targets from the working vanilla build:

1. A fuller selected koala detail panel
   - name, personality, gender, mood, and core need stats

2. Better placement feedback
   - hover tile highlight
   - green / red / yellow placement cues
   - small tile label explaining the current action

3. Tutorial, toast, and report systems
   - lightweight guide panel in the sidebar
   - tool emphasis for onboarding
   - end-of-day habitat report modal
   - improved toast tones for success and warnings

This is still a staged Phaser migration, not full feature parity yet.


Parity pass 2 adds timed quiz check-ins, answer rewards/penalties, and a simple progression system with milestone bonuses.

Pass 3 adds richer animal and visitor behavior. Koalas now favor nearby features based on needs and personality, and visitors react more clearly to habitat quality, sometimes donating when they enjoy what they see.


Icon tweak: Rock now uses 🗻 and Platform now uses 🟫 for clearer distinction and better Windows emoji support.


Clean patch package applied:
- hunger recovery near trees/shrubs
- hydration recovery near water
- sickness plus Vet Hut treatment loop
- throttled routine UI refreshes with basic DOM change detection
- hoisted tile icon map out of per-tile draw calls
- quiz now stores an index internally and answer order is shuffled


Additional patch:
- cloned personality profiles when koalas are created
- unique koala naming to avoid duplicate names when adding more koalas
- scene reference is now set directly in MainScene.create() instead of relying on a ready-event timing path


Finish and harden patch:
- added save versioning with graceful rejection for incompatible saves
- added camera clamp so dragging stays within a sensible view range
- made DOM element lookup safer with console warnings for missing IDs
- added Escape-to-close for quiz and report modals
- added focus-visible button styling and reduced-motion CSS support


Touch zoom patch:
- added two-finger pinch-to-zoom for iPad and touch devices
- added mouse wheel zoom for desktop convenience
- improved touch handling so pinch gestures do not trigger accidental tile placement
- disabled browser touch scrolling on the game surface


Toolbar visibility patch:
- made the bottom tool bar sticky so it stays visible on iPad while panning and zooming
- added safe-area padding for tablets and phones with bottom browser chrome
- lifted toast stack so notifications do not cover the bottom tool bar


Pinch-zoom restore patch:
- restored two-finger pinch zoom after the sticky toolbar update
- kept one-finger drag pan in Select mode
- prevented tile placement during pinch gestures
- kept toolbar touch interaction working independently from the game canvas
