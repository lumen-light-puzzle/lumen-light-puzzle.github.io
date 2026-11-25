/* Lumen — levels.js : worlds, the 40 level recipes, story and narrator lines */
(function () {
  'use strict';
  var L = window.L;

  L.WORLDS = [
    {
      key: 'dawn', name: 'Dawn Temple', sub: 'Where the first sunbeam learned to turn corners', accent: '#ffc46b',
      bpm: 66, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 60, 64]],
      intro: 'Long ago the Sun dropped a single beam of light down a temple stairwell and it got lost. Ever since, the temple has been dim, dusty and slightly embarrassed. You are a Lightwright — someone who convinces photons to go where they are needed. Start small. Mirrors first. Ego later.',
      outro: 'The temple bells ring for the first time in a thousand years. Somewhere below, something sparkles back. The light wants to go deeper — into the caves.'
    },
    {
      key: 'caves', name: 'Crystal Caves', sub: 'Every colour was hiding inside white all along', accent: '#9b8cff',
      bpm: 60, chords: [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]],
      intro: 'Deep under the temple, crystals grow in the dark like stubborn opinions. They only wake for their own colour. Luckily white light is a colour buffet — split it with a prism, or sieve it with a filter.',
      outro: 'The caves hum in three-part harmony. A draught from above smells of rain and neon. Up there, a city that never sleeps has forgotten how to glow.'
    },
    {
      key: 'city', name: 'Neon City', sub: 'Shortcuts, splitters and suspiciously convenient portals', accent: '#ff5cd1',
      bpm: 84, chords: [[52, 59, 62, 66], [48, 55, 59, 64], [50, 57, 60, 65], [55, 59, 62, 67]],
      intro: 'Neon City runs on light, gossip and late-night noodles. The grid is down. Beams can now travel diagonally, splitters copy them, and portals let light skip the traffic entirely. Mind the billboards.',
      outro: 'Every sign in the city flickers on at once — a few even spell things correctly. The light spills into the harbour, and keeps going… down.'
    },
    {
      key: 'ocean', name: 'Deep Ocean', sub: 'Lenses, currents and things that move when you blink', accent: '#4dd8ff',
      bpm: 56, chords: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]],
      intro: 'Under the waves, light bends whether it wants to or not. Lenses nudge beams by 45°, and sliding blockers drift into the way like bored jellyfish. Push them aside. Politely.',
      outro: 'Bioluminescent whales sing along to your crystals. At the bottom of the trench there is no bottom — only The Void, and one very lonely star.'
    },
    {
      key: 'void', name: 'The Void', sub: 'Everything you learned, at once, in the dark', accent: '#c6b8ff',
      bpm: 52, chords: [[48, 55, 62, 64], [44, 51, 58, 60], [46, 53, 60, 62], [43, 50, 57, 59]],
      intro: 'The Void is not empty. It is just very, very shy. Use every trick: prisms, filters, splitters, portals, lenses, sliders. Light the last crystals and the universe gets its night-light back.',
      outro: 'The final crystal blooms and the Void blushes into a galaxy. The lost sunbeam is found — it was you all along, rerouting yourself one mirror at a time. Thank you, Lightwright.'
    }
  ];

  // name, recipe. turns = pieces per beam path [min,max]
  // Every recipe below was run through a faithful port of generator.js + engine.trace:
  // all 40 build at relax stage 0 (no fallback), start unsolved, and their stored solution lights every crystal.
  var M = { mirror: 1 };
  L.RECIPES = [
    // ---- Dawn Temple: mirrors, then tray placement ----
    { n: 'First Light', w: 5, h: 5, turns: [1, 1], types: M, min: 1 },
    { n: 'Bounce House', w: 5, h: 6, turns: [2, 2], types: M, min: 2 },
    { n: 'Zig, Then Zag', w: 6, h: 6, turns: [3, 3], types: M, min: 3, walls: 1 },
    { n: 'Twin Suns', w: 6, h: 7, emit: [7, 7], turns: [1, 2], types: M, min: 2 },
    { n: 'Temple Run', w: 6, h: 7, turns: [3, 4], types: M, min: 3, walls: 2, decoys: 1 },
    { n: 'Hands-On Learning', w: 6, h: 6, turns: [2, 2], types: M, min: 2, free: 1 },
    { n: 'Sundial', w: 7, h: 7, emit: [7, 7], turns: [2, 3], types: M, min: 4, free: 1, decoys: 1 },
    { n: 'The Gatekeeper', w: 7, h: 8, turns: [4, 5], types: M, min: 4, free: 2, walls: 3 },
    // ---- Crystal Caves: prisms & filters ----
    { n: 'Rainbow Road', w: 7, h: 7, turns: [2, 3], types: { mirror: 2, prism: 3 }, req: ['prism'], min: 2, exitChance: 0.35 },
    { n: 'Colour Theory', w: 7, h: 7, turns: [2, 3], types: { mirror: 2, filter: 3 }, req: ['filter'], min: 2 },
    { n: 'Glass Act', w: 7, h: 8, turns: [3, 4], types: { mirror: 3, prism: 2 }, req: ['prism'], min: 3, free: 1, freeTypes: ['prism', 'mirror'], exitChance: 0.4 },
    { n: 'Gem Sorting', w: 7, h: 8, emit: [7, 7], turns: [2, 3], types: { mirror: 3, filter: 2 }, req: ['filter'], min: 3, walls: 2 },
    { n: 'Stalactite Shuffle', w: 8, h: 8, turns: [4, 5], types: { mirror: 3, prism: 1, filter: 1 }, req: ['prism'], min: 4, decoys: 1, exitChance: 0.3 },
    { n: 'Spectrum Split', w: 8, h: 8, turns: [4, 5], types: { mirror: 3, prism: 2 }, req: ['prism'], min: 4, free: 2, exitChance: 0.3 },
    { n: 'Geode Heart', w: 8, h: 8, emit: [7, 7], turns: [3, 4], types: { mirror: 3, prism: 1, filter: 1 }, min: 4, free: 1, walls: 3 },
    { n: 'The Prism King', w: 8, h: 9, emit: [7, 7], turns: [3, 4], types: { mirror: 3, prism: 1, filter: 2 }, req: ['prism', 'filter'], min: 5, free: 2, decoys: 2, exitChance: 0.25 },
    // ---- Neon City: diagonals, splitters, portals ----
    { n: 'Neon Split', w: 7, h: 8, diag: true, emit: [6], turns: [2, 3], types: { mirror: 3, splitter: 3 }, req: ['splitter'], min: 2 },
    { n: 'Wormhole Commute', w: 7, h: 8, diag: true, emit: [5], turns: [2, 3], types: { mirror: 3, portal: 2 }, req: ['portal'], min: 2 },
    { n: 'Rush Hour', w: 7, h: 9, diag: true, emit: [1, 4], turns: [2, 3], types: { mirror: 3, splitter: 1, portal: 1 }, min: 3, walls: 3 },
    { n: 'Billboard Bounce', w: 8, h: 8, diag: true, emit: [7], turns: [3, 4], types: { mirror: 3, splitter: 1, prism: 1 }, min: 3, free: 1, exitChance: 0.3 },
    { n: 'Back-Alley Optics', w: 8, h: 9, diag: true, emit: [6, 3], turns: [3, 4], types: { mirror: 3, portal: 2, splitter: 1 }, min: 4, free: 1, decoys: 2 },
    { n: 'Rooftop Relay', w: 8, h: 9, diag: true, emit: [5], turns: [4, 5], types: { mirror: 3, splitter: 2 }, req: ['splitter'], min: 4, free: 2, walls: 2, exitChance: 0.2 },
    { n: 'Glitch in the Grid', w: 8, h: 9, diag: true, emit: [7, 4], turns: [3, 5], types: { mirror: 3, portal: 2, filter: 1 }, min: 5, free: 1, decoys: 2 },
    { n: 'Mayor of Neon', w: 8, h: 10, diag: true, emit: [7, 6], turns: [4, 5], types: { mirror: 3, splitter: 1, portal: 1, prism: 1 }, min: 5, free: 2, walls: 3, exitChance: 0.25 },
    // ---- Deep Ocean: lenses & moving blockers ----
    { n: 'Bendy Waters', w: 7, h: 8, diag: true, emit: [6], turns: [2, 3], types: { mirror: 2, lens: 3 }, req: ['lens'], min: 2 },
    { n: 'Kelp Curtain', w: 7, h: 8, diag: true, emit: [4], turns: [2, 3], types: { mirror: 3, lens: 1 }, min: 2, sliders: 1 },
    { n: 'Current Affairs', w: 8, h: 8, diag: true, emit: [6, 2], turns: [2, 3], types: { mirror: 3, lens: 2 }, min: 3, sliders: 2 },
    { n: 'Lantern Fish', w: 8, h: 9, diag: true, emit: [7], turns: [3, 4], types: { mirror: 3, lens: 2, prism: 1 }, min: 4, free: 1, sliders: 1, exitChance: 0.3 },
    { n: 'Reef Relay', w: 8, h: 9, diag: true, emit: [4, 6], turns: [3, 4], types: { mirror: 3, lens: 2, splitter: 1 }, min: 4, free: 1, sliders: 2, decoys: 1 },
    { n: 'Sunken Lighthouse', w: 8, h: 9, diag: true, emit: [7], turns: [4, 5], types: { mirror: 3, lens: 1, filter: 2 }, min: 4, free: 2, sliders: 1, walls: 2 },
    { n: 'Pressure Drop', w: 8, h: 10, diag: true, emit: [6, 5], turns: [3, 5], types: { mirror: 3, lens: 2, portal: 1 }, min: 5, free: 1, sliders: 2, decoys: 2 },
    { n: 'The Leviathan', w: 8, h: 10, diag: true, emit: [7, 4], turns: [4, 5], types: { mirror: 3, lens: 2, prism: 1, splitter: 1 }, min: 6, free: 2, sliders: 2, exitChance: 0.25 },
    // ---- The Void: everything ----
    { n: 'First Star', w: 7, h: 8, diag: true, emit: [7], turns: [3, 4], types: { mirror: 3, prism: 1, lens: 1 }, min: 3, free: 1, exitChance: 0.3 },
    { n: 'Dark Matter', w: 8, h: 8, diag: true, emit: [6, 1], turns: [3, 4], types: { mirror: 3, portal: 2, lens: 1 }, min: 4, sliders: 1, decoys: 2 },
    { n: 'Event Horizon', w: 8, h: 9, diag: true, emit: [7], turns: [4, 5], types: { mirror: 3, filter: 1, splitter: 1, lens: 1 }, min: 5, free: 2, walls: 3 },
    { n: 'Nebula Nursery', w: 8, h: 9, diag: true, emit: [7, 7], turns: [3, 4], types: { mirror: 3, prism: 1, filter: 1 }, min: 5, free: 2, sliders: 1, exitChance: 0.3 },
    { n: 'Gravity Well', w: 8, h: 10, diag: true, emit: [5, 6], turns: [4, 5], types: { mirror: 3, portal: 2, splitter: 1, lens: 1 }, min: 6, free: 2, decoys: 2 },
    { n: 'Supernova', w: 8, h: 10, diag: true, emit: [7, 4], turns: [4, 5], types: { mirror: 3, prism: 1, lens: 1, splitter: 1 }, min: 6, free: 2, sliders: 2, exitChance: 0.25 },
    { n: 'Silent Constellation', w: 8, h: 10, diag: true, emit: [7, 6, 1], turns: [3, 4], types: { mirror: 3, filter: 1, portal: 1, lens: 1 }, min: 6, free: 2, walls: 2, decoys: 2 },
    { n: 'Let There Be Lumen', w: 8, h: 10, diag: true, emit: [7, 7], turns: [5, 6], types: { mirror: 3, prism: 1, filter: 1, splitter: 1, portal: 1, lens: 1 }, min: 7, free: 3, sliders: 1, exitChance: 0.2 }
  ];
  L.TOTAL = L.RECIPES.length;
  L.PER_WORLD = 8;

  var cache = {};
  L.getLevel = function (i) {
    if (!cache[i]) {
      var r = L.RECIPES[i];
      if (!r.turns) r.turns = [1, 2];
      var lv = L.genLevel(r, 1000 + i * 137);
      lv.name = r.n; lv.idx = i; lv.world = Math.floor(i / L.PER_WORLD);
      lv.theme = L.WORLDS[lv.world].key;
      cache[i] = JSON.stringify({ w: lv.w, h: lv.h, pieces: lv.pieces, sol: lv.sol, par: lv.par, name: lv.name, idx: i, world: lv.world, theme: lv.theme });
    }
    return L.indexLevel(JSON.parse(cache[i]));
  };

  L.todayKey = function (d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  };
  L.dailyLevel = function (key) {
    var seed = L.hash('lumen-daily-' + key), R = L.rng(seed);
    var pool = [
      { diag: false, emit: [7], types: { mirror: 3, prism: 1, filter: 1 }, exitChance: 0.3 },
      { diag: true, emit: [6, 5], types: { mirror: 3, splitter: 1, portal: 1 } },
      { diag: true, emit: [7], types: { mirror: 3, lens: 2, prism: 1 }, exitChance: 0.3, sliders: 1 },
      { diag: true, emit: [4, 1], types: { mirror: 3, lens: 1, portal: 1 }, sliders: 1 },
      { diag: false, emit: [7, 7], types: { mirror: 3, filter: 2 } }
    ];
    var base = pool[Math.floor(R() * pool.length)];
    var r = {
      w: 7 + Math.floor(R() * 2), h: 8 + Math.floor(R() * 2), diag: base.diag, emit: base.emit, types: base.types,
      exitChance: base.exitChance || 0, sliders: base.sliders || 0, turns: [3, 4], min: 4, free: 1 + Math.floor(R() * 2),
      decoys: Math.floor(R() * 3), walls: Math.floor(R() * 3)
    };
    var lv = L.genLevel(r, seed);
    var themes = ['dawn', 'caves', 'city', 'ocean', 'void'];
    lv.name = 'Daily Prism · ' + key; lv.world = -1; lv.theme = themes[seed % 5]; lv.daily = key;
    return L.indexLevel(lv);
  };

  // ---------- narrator ----------
  L.LINES = {
    title: [
      'Light travels at 299,792 km/s. You may take your time.',
      'No photons were harmed in the making of this game. A few were mildly redirected.',
      'Mirrors: the original social media.',
      'Warning: may cause sudden urges to rearrange your bathroom mirror.',
      'Tip: crystals are picky eaters. Feed them their own colour.',
      'Every lit crystal plays a note. Light them all and you are basically a composer.'
    ],
    start: [
      'Fresh puzzle, fresh photons. Go on, bend something.',
      'The crystals are waiting. They are terrible at hiding their impatience.',
      'Remember: light goes straight until you tell it otherwise. Very obedient. Rare quality.',
      'I believe in you. The beam is still deciding.',
      'Somewhere, a crystal is rehearsing its one note. Give it a cue.',
      'This one looks easy. That is exactly what it wants you to think.'
    ],
    win: [
      'Brilliant. Literally — I measured it.',
      'Every crystal sings! Mostly in tune.',
      'You make it look easy. It was not. I checked.',
      'The photons would like to leave you a five-star review.',
      'Illuminating performance. I will see myself out.',
      'Solved! Somewhere a physics teacher just felt proud and did not know why.',
      'That was so bright I need sunglasses. I do not have a face.'
    ],
    hint: [
      'Psst. Look at the one that is glowing gold.',
      'A tiny nudge, not a spoiler. Well… a small spoiler.',
      'Hints are like torches: no shame in carrying one.',
      'I have whispered this to no one else. Except everyone who pressed Hint.'
    ],
    hint2: 'Tap Hint again and I will do that step for you. I am generous like that.',
    noHint: 'Everything is already where my notes say it should be. Check the colours of your crystals!',
    fixed: [
      'That one is bolted down. Ancient temple regulations.',
      'Prisms are stubborn. They refract, they do not rotate.',
      'Nope. That piece has tenure.',
      'You can admire it, but you cannot spin it.'
    ],
    crystal: [
      'That is a crystal. It wants light. Its own colour, specifically. It is very particular.',
      'Poking the crystal will not light it. I tried. For centuries.',
      'Crystals do not rotate. They glow, they sing, they judge.'
    ],
    over: 'That crystal is getting the wrong colour mix. It looks offended.',
    stuck: [
      'Stuck? The Hint button is shaped like a sparkle for a reason.',
      'Try following the beam with your finger. Seriously, it helps.',
      'Long-press (or right-click) rotates the other way. Small things, big savings.'
    ],
    undoEmpty: 'Nothing to undo. Your past is spotless.',
    redoEmpty: 'Nothing to redo. The future is unwritten.',
    tray: 'Tap a piece in the tray, then tap an empty tile to place it. Or just drag it there.',
    trayIntro: 'New trick: pieces in the tray below must be placed by you. Drag them onto the board.',
    reset: 'Back to the beginning. The photons have forgotten everything. Lucky them.',
    many: 'Bold strategy, rotating everything. Let us see if it pays off.',
    egg: '🌈 Disco Photon Mode engaged. The crystals are pretending not to enjoy it.',
    eggOff: 'Disco Photon Mode off. The crystals are relieved and a little sad.'
  };
  L.MECHANIC_TIPS = {
    1: 'Tap a mirror to rotate it. Guide the beam into the crystal.',
    2: 'Drag around a mirror to spin it freely — one drag counts as one move.',
    4: 'Two emitters, two crystals. Each beam needs its own route.',
    5: 'Some mirrors are decoys. They only look important. Like a tie.',
    6: 'Long-press or right-click rotates anticlockwise.',
    8: 'Prisms split white light into red, green and blue — each heads off at its own angle.',
    9: 'Filters only let through their own colour. Tap one to change its tint.',
    16: 'Light now travels diagonally! Splitters let half pass and reflect the rest.',
    17: 'Portals come in pairs. Light that enters one leaves the other, same direction.',
    24: 'Lenses bend a beam by 45°. Tap to flip which way it bends.',
    25: 'Sliding blockers move along their track when tapped. Get them out of the way!',
    32: 'Welcome to The Void. Every trick is fair game now.'
  };
})();
