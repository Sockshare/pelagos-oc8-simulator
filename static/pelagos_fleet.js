/**
 * Pelagos Biomimetic Robotics Hangar — 9-Unit Fleet, 6 Color Arrangements & 10 Engineering Lab Features
 * Units:
 *  1. OC-8  (Pelagos OC-8)  — Robotic Octopus (Built in pelagos_sim.js)
 *  2. HX-18 (Hexapod HX-18) — 18-DOF Six-Legged Walker (Built in pelagos_sim.js)
 *  3. SC-8  (Telson SC-8)   — 8-Legged Robotic Scorpion with Curved 7-Segment Stinger Tail & Twin Pincer Chelae
 *  4. HB-7  (Mellis HB-7)   — 4-Wing Robotic Honeybee Pollinator with Piezo Thorax Drive & Glass Abdomen Gear Train
 *  5. CN-12 (Canis CN-12)   — 12-DOF Quadruped Robotic Dog with Lupine LiDAR Jaw, Ribbed Thorax & Wagging Tail
 *  6. AV-6  (Falco AV-6)    — Peregrine Robotic Raptor Bird with 12-Feather Articulated Folding Wings & Talons
 *  7. AR-8  (Arachne AR-8)  — 8-Legged Robotic Tarantula Spider with 8-Eye Turret, Chelicerae Fangs & Silk Spinnerets
 *  8. OP-24 (Ophidia OP-24) — 24-Joint Sidewinder Pit-Viper Snake with 160° Hinged Fang Jaws, Rib Scutes & Tail Rattle
 *  9. AC-14 (Acinonyx AC-14)— High-Velocity Robotic Cheetah with Flexing 6-Vertebra Spine & Counter-Torque Tail
 */
(function () {
  'use strict';

  const CORE = window.__PELAGOS_CORE;
  if (!CORE) return;

  const {
    scene,
    camera,
    canvas,
    appEl,
    MATS,
    STATE,
    UNIT_CONFIG,
    castMesh,
    createGearGeometry,
    buildUnitUI,
    selectAssembly,
    toggleDisplay,
    takeManualControl,
    renderCallouts,
    updateHUD,
  } = CORE;

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Initialize extended state properties
  STATE.xray = false;
  STATE.xrayOpacity = 0.72;
  STATE.thermal = false;
  STATE.explodeSlider = 0.0;
  STATE.poseFlex = 0.5;
  STATE.gaitPreset = 'auto';
  STATE.audioEnabled = false;
  STATE.faultKey = null;
  STATE.colorTheme = 'pelagos';

  // -------------------------------------------------------------------------
  // COLOR PALETTE ARRANGEMENTS (6 DISTINCT ROBOTIC & HUD COLORWAYS)
  // -------------------------------------------------------------------------
  const COLOR_THEMES = {
    pelagos: {
      label: 'PELAGOS LAB',
      swatches: ['#f4f2ec', '#eb4d28', '#181a1e'],
      ceramic: '#f4f2ec',
      orange: '#eb4d28',
      orangeEmissive: '#380d02',
      gunmetal: '#181a1e',
      carbon: '#0d0e11',
      steel: '#aeb4bc',
      rubber: '#141518',
      bgTop: '#f7f5f0',
      bgMid: '#f3f0e8',
      bgBot: '#ece7dc',
      accent: '#eb4d28',
    },
    stealth: {
      label: 'SPEC-OPS OBSIDIAN',
      swatches: ['#2a2f3a', '#ff9f1c', '#101216'],
      ceramic: '#2d333f',
      orange: '#ff9f1c',
      orangeEmissive: '#3d2200',
      gunmetal: '#15181f',
      carbon: '#0b0c10',
      steel: '#8d99ae',
      rubber: '#101216',
      bgTop: '#eeece6',
      bgMid: '#e6e3db',
      bgBot: '#dcd8ce',
      accent: '#e07a00',
    },
    abyssal: {
      label: 'ABYSSAL CYAN',
      swatches: ['#dce6f2', '#00b4d8', '#14213d'],
      ceramic: '#e2ecf7',
      orange: '#0096c7',
      orangeEmissive: '#002838',
      gunmetal: '#14213d',
      carbon: '#0a1122',
      steel: '#98c1d9',
      rubber: '#0d1628',
      bgTop: '#f1f5f9',
      bgMid: '#e8eef5',
      bgBot: '#dde6f0',
      accent: '#0077b6',
    },
    coyote: {
      label: 'DESERT MIL-SPEC',
      swatches: ['#dfd3be', '#d62828', '#23261f'],
      ceramic: '#dfd3be',
      orange: '#d62828',
      orangeEmissive: '#380404',
      gunmetal: '#262922',
      carbon: '#151712',
      steel: '#a3a89e',
      rubber: '#1a1c17',
      bgTop: '#f6f2ea',
      bgMid: '#efe9dd',
      bgBot: '#e5decb',
      accent: '#c1121f',
    },
    apex: {
      label: 'APEX COBALT GOLD',
      swatches: ['#eef0f5', '#f59e0b', '#1b2a4a'],
      ceramic: '#f0f2f7',
      orange: '#d97706',
      orangeEmissive: '#3b1d00',
      gunmetal: '#1b2a4a',
      carbon: '#0f172a',
      steel: '#cbd5e1',
      rubber: '#111827',
      bgTop: '#f8f7f4',
      bgMid: '#f2f0ea',
      bgBot: '#e8e5dc',
      accent: '#d97706',
    },
    viper: {
      label: 'CRIMSON VIPER',
      swatches: ['#b91c1c', '#f8fafc', '#0f1115'],
      ceramic: '#b91c1c',
      orange: '#f1f5f9',
      orangeEmissive: '#1e293b',
      gunmetal: '#14161b',
      carbon: '#090a0d',
      steel: '#94a3b8',
      rubber: '#0f1115',
      bgTop: '#f7f4f2',
      bgMid: '#f1ece9',
      bgBot: '#e8e0dc',
      accent: '#b91c1c',
    },
  };

  function syncShaderModesToMats() {
    const th = COLOR_THEMES[STATE.colorTheme] || COLOR_THEMES.pelagos;
    if (STATE.thermal) {
      MATS.ceramic.color.set('#1c8ae1');
      MATS.ceramic.transparent = false;
      MATS.ceramic.opacity = 1.0;
      MATS.orange.color.set('#ffd72d');
      MATS.orange.emissive.set('#663800');
      MATS.steel.color.set('#ff5f19');
      MATS.gunmetal.color.set('#c32a87');
      MATS.carbon.color.set('#7a1666');
    } else if (STATE.xray) {
      MATS.ceramic.color.set('#26303e');
      MATS.ceramic.transparent = true;
      MATS.ceramic.opacity = 0.28;
      MATS.ceramic.depthWrite = false;
      MATS.orange.color.set(th.orange);
      MATS.orange.emissive.set(th.orangeEmissive);
      MATS.steel.color.set(th.steel);
      MATS.gunmetal.color.set(th.gunmetal);
      MATS.carbon.color.set(th.carbon);
    } else {
      MATS.ceramic.color.set(th.ceramic);
      MATS.ceramic.transparent = false;
      MATS.ceramic.opacity = 1.0;
      MATS.ceramic.depthWrite = true;
      MATS.orange.color.set(th.orange);
      MATS.orange.emissive.set(th.orangeEmissive);
      MATS.gunmetal.color.set(th.gunmetal);
      MATS.carbon.color.set(th.carbon);
      MATS.steel.color.set(th.steel);
      MATS.rubber.color.set(th.rubber);
    }
    MATS.ceramic.needsUpdate = true;
  }

  function applyColorTheme(themeKey) {
    const th = COLOR_THEMES[themeKey] || COLOR_THEMES.pelagos;
    STATE.colorTheme = COLOR_THEMES[themeKey] ? themeKey : 'pelagos';
    MATS.wakeRing.color.set(th.orange);
    syncShaderModesToMats();

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--bg-top', th.bgTop);
    rootStyle.setProperty('--bg-mid', th.bgMid);
    rootStyle.setProperty('--bg-bot', th.bgBot);
    rootStyle.setProperty('--accent', th.accent);

    document.querySelectorAll('.theme-swatch-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.theme === STATE.colorTheme);
    });
  }

  // -------------------------------------------------------------------------
  // FEATURE 6: PROCEDURAL WEB AUDIO MECHANICAL SYNTHESIZER
  // -------------------------------------------------------------------------
  let audioCtx = null;
  function playAudioFX(type) {
    if (!STATE.audioEnabled) return;
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(920, now);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.045);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'servo') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(185, now);
        osc.frequency.linearRampToValueAtTime(310, now + 0.14);
        osc.frequency.linearRampToValueAtTime(220, now + 0.24);
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'pneumatic') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.28);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.31);
      } else if (type === 'fault') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(310, now + 0.09);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.23);
      }
    } catch (e) {}
  }

  // -------------------------------------------------------------------------
  // SHARED GEOMETRY PRIMITIVES FOR ULTRA-FAST 60 FPS CPU/GPU RENDERING
  // -------------------------------------------------------------------------
  const GEO = {
    servoDrum: new THREE.CylinderGeometry(0.14, 0.14, 0.22, 12).rotateX(Math.PI / 2),
    servoRing: new THREE.TorusGeometry(0.135, 0.022, 6, 14),
    jointBall: new THREE.SphereGeometry(0.1, 8, 6),
    rivet: new THREE.SphereGeometry(0.015, 5, 4),
    eyeLens: new THREE.SphereGeometry(0.11, 12, 10),
    eyeRim: new THREE.TorusGeometry(0.115, 0.02, 8, 16),
    gearSmall: createGearGeometry(14, 0.17, 0.13, 0.05, 0.05),
    gearMed: createGearGeometry(20, 0.25, 0.19, 0.06, 0.08),
  };

  function addServoJoint(parent, radius = 1.0) {
    const g = new THREE.Group();
    g.scale.setScalar(radius);
    parent.add(g);
    castMesh(GEO.servoDrum, MATS.gunmetal, g);
    const r1 = castMesh(GEO.servoRing, MATS.orange, g);
    r1.position.z = 0.1;
    const r2 = castMesh(GEO.servoRing, MATS.orange, g);
    r2.position.z = -0.1;
    return g;
  }

  // =========================================================================
  // 1. SCORPION (Telson SC-8) — 8 Legs, 2 Pincer Chelae, 7-Segment Curved Stinger Tail
  //    Matches reference frame docs/scorpion.gif (scorpion_0_f0.png)
  // =========================================================================
  function buildScorpionModel() {
    const root = new THREE.Group();
    root.visible = false;

    // 1A. Segmented Cephalothorax & Mesosoma Dorsal Carapace (7 Hinged Ceramic Plates + Smoked Glass Canopy)
    const carapacePlates = [];
    const internalSpine = new THREE.Group();
    root.add(internalSpine);

    // Internal hydraulic manifold, dual gears & braided hoses inside mesosoma
    castMesh(new THREE.CylinderGeometry(0.22, 0.18, 1.85, 10).rotateX(Math.PI / 2), MATS.gunmetal, internalSpine).position.set(0, 0.08, -0.1);
    for (let i = 0; i < 5; i++) {
      const g = castMesh(GEO.gearSmall, i % 2 === 0 ? MATS.orange : MATS.steel, internalSpine);
      g.position.set(0, 0.16, 0.55 - i * 0.32);
    }

    for (let s = 0; s < 7; s++) {
      const u = s / 6;
      const zPos = 0.68 - s * 0.25;
      const wPlate = 0.68 * (1 - u * 0.28);
      const segPivot = new THREE.Group();
      segPivot.position.set(0, 0.18, zPos);
      root.add(segPivot);

      const isGlass = s === 1 || s === 2;
      const plate = castMesh(
        new THREE.BoxGeometry(wPlate, 0.09, 0.21),
        isGlass ? MATS.portGlass : MATS.ceramic,
        segPivot
      );
      plate.position.y = 0.06;

      // Lateral armor skirts + orange trim & black rivets
      for (const sgn of [-1, 1]) {
        const skirt = castMesh(new THREE.BoxGeometry(0.24, 0.06, 0.19), MATS.ceramic, segPivot);
        skirt.position.set(sgn * (wPlate * 0.54), 0.01, 0);
        skirt.rotation.z = -sgn * 0.42;

        const tab = castMesh(new THREE.BoxGeometry(0.08, 0.03, 0.06), MATS.orange, segPivot);
        tab.position.set(sgn * (wPlate * 0.42), 0.1, 0);

        const riv = castMesh(GEO.rivet, MATS.carbon, segPivot);
        riv.position.set(sgn * (wPlate * 0.32), 0.11, 0.05);
      }
      carapacePlates.push({ pivot: segPivot, baseZ: zPos, idx: s });
    }

    // Ventral Sternum Deck
    const ventralDeck = castMesh(new THREE.BoxGeometry(0.64, 0.1, 1.65), MATS.gunmetal, root);
    ventralDeck.position.set(0, -0.04, -0.05);

    // 1B. Forward Arachnid Sensor Head (2 Median + 6 Lateral Optics)
    const sensorHead = new THREE.Group();
    const headBasePos = new THREE.Vector3(0, 0.14, 0.92);
    sensorHead.position.copy(headBasePos);
    root.add(sensorHead);
    castMesh(new THREE.BoxGeometry(0.52, 0.22, 0.34), MATS.ceramic, sensorHead);
    for (const sgn of [-1, 1]) {
      const medEye = new THREE.Group();
      medEye.position.set(sgn * 0.11, 0.1, 0.12);
      sensorHead.add(medEye);
      castMesh(GEO.eyeLens, MATS.lensGlass, medEye);
      castMesh(GEO.eyeRim, MATS.orange, medEye);
      for (let k = 0; k < 3; k++) {
        const latEye = castMesh(new THREE.SphereGeometry(0.035, 6, 5), MATS.lensGlass, sensorHead);
        latEye.position.set(sgn * (0.22 + k * 0.03), 0.02, 0.15 - k * 0.05);
      }
    }

    // 1C. Twin Pedipalp Crushing Chelae (Claw L & Claw R with Smoked Glass Gear Windows — matching scorpion_0_f0.png!)
    const claws = [];
    for (const side of [-1, 1]) {
      const clawRoot = new THREE.Group();
      const basePos = new THREE.Vector3(side * 0.42, 0.04, 0.88);
      clawRoot.position.copy(basePos);
      root.add(clawRoot);

      addServoJoint(clawRoot, 0.85);
      // Trochanter & Femur arm
      const femur = new THREE.Group();
      femur.position.set(side * 0.32, 0.02, 0.25);
      femur.rotation.y = -side * 0.45;
      clawRoot.add(femur);
      castMesh(new THREE.BoxGeometry(0.18, 0.16, 0.56), MATS.ceramic, femur);
      castMesh(new THREE.BoxGeometry(0.19, 0.04, 0.42), MATS.orange, femur).position.y = 0.07;

      // Chela Manus (Broad white + glass palm housing 4 internal bevel gears!)
      const manus = new THREE.Group();
      manus.position.set(0, -0.02, 0.48);
      manus.rotation.y = side * 0.58;
      femur.add(manus);

      // Lower ceramic palm shell
      castMesh(new THREE.CylinderGeometry(0.22, 0.16, 0.68, 12).rotateX(Math.PI / 2), MATS.ceramic, manus);
      // Smoked Glass Dorsal Inspection Dome over internal claw gears (signature scorpion_0_f0.png detail!)
      const glassDome = castMesh(new THREE.SphereGeometry(0.21, 12, 10), MATS.portGlass, manus);
      glassDome.scale.set(0.85, 0.65, 1.45);
      glassDome.position.set(0, 0.1, -0.04);

      // Internal 4-Gear Train inside the Chela Manus
      const clawGears = [];
      for (let gIdx = 0; gIdx < 3; gIdx++) {
        const cg = castMesh(GEO.gearSmall, gIdx === 1 ? MATS.orange : MATS.gunmetal, manus);
        cg.rotation.x = Math.PI / 2;
        cg.position.set(0, 0.08, -0.16 + gIdx * 0.14);
        clawGears.push(cg);
      }
      // Orange lateral trim stripe on claw
      castMesh(new THREE.BoxGeometry(0.42, 0.035, 0.58), MATS.orange, manus);

      // Fixed Finger (Tarsus) & Movable Pincer Finger
      const fixedJaw = castMesh(new THREE.ConeGeometry(0.09, 0.52, 8).rotateX(Math.PI / 2), MATS.ceramic, manus);
      fixedJaw.position.set(-side * 0.06, -0.02, 0.52);
      const movableJaw = new THREE.Group();
      movableJaw.position.set(side * 0.06, 0.02, 0.28);
      manus.add(movableJaw);
      const mCone = castMesh(new THREE.ConeGeometry(0.08, 0.5, 8).rotateX(Math.PI / 2), MATS.gunmetal, movableJaw);
      mCone.position.z = 0.24;

      claws.push({ side, clawRoot, basePos, femur, manus, glassDome, clawGears, movableJaw });
    }

    // 1D. 7-Segment Overhead Curved Metasoma Tail + Telson Venom Stinger (matching scorpion_0_f0.png!)
    const tailBase = new THREE.Group();
    tailBase.position.set(0, 0.22, -0.88);
    root.add(tailBase);

    const tailLinks = [];
    let parentTail = tailBase;
    const N_TAIL = 6;
    for (let t = 0; t < N_TAIL; t++) {
      const segGroup = new THREE.Group();
      segGroup.position.set(0, t === 0 ? 0 : 0.36, t === 0 ? 0 : -0.06);
      parentTail.add(segGroup);

      // Large orange-rimmed rotary actuator drum at each tail joint
      const drum = addServoJoint(segGroup, 1.05 - t * 0.06);
      drum.rotation.y = Math.PI / 2;

      // Curved white ceramic lateral armor plates with black rivets & exposed dark core
      const segLen = 0.36;
      const armor = new THREE.Group();
      armor.position.set(0, segLen * 0.5, 0);
      segGroup.add(armor);
      castMesh(new THREE.CylinderGeometry(0.11, 0.13, segLen * 0.9, 8), MATS.gunmetal, armor);
      for (const sgn of [-1, 1]) {
        const sidePlate = castMesh(new THREE.BoxGeometry(0.05, segLen * 0.86, 0.24 - t * 0.015), MATS.ceramic, armor);
        sidePlate.position.x = sgn * 0.12;
        const stripe = castMesh(new THREE.BoxGeometry(0.06, 0.05, 0.18), MATS.orange, armor);
        stripe.position.set(sgn * 0.125, 0, 0);
      }

      tailLinks.push({ segGroup, armor });
      parentTail = segGroup;
    }

    // Terminal Telson Bulb & Curved Hypodermic Stinger Blade
    const stingerGroup = new THREE.Group();
    stingerGroup.position.set(0, 0.36, 0);
    parentTail.add(stingerGroup);
    castMesh(new THREE.SphereGeometry(0.15, 10, 8), MATS.ceramic, stingerGroup);
    const stingerCollar = castMesh(new THREE.CylinderGeometry(0.12, 0.08, 0.14, 10), MATS.orange, stingerGroup);
    stingerCollar.position.set(0, 0.14, 0.06);
    stingerCollar.rotation.x = 0.55;
    const stingerBlade = castMesh(new THREE.ConeGeometry(0.065, 0.42, 8), MATS.carbon, stingerGroup);
    stingerBlade.position.set(0, 0.32, 0.18);
    stingerBlade.rotation.x = 0.85;

    // 1E. 8 Articulated Arachnid Walking Legs (L1..L4, R1..R4) with Orange Servo Drums & Pointed Tarsi
    const legs = [];
    const legZ = [0.46, 0.14, -0.18, -0.52];
    const legAng = [0.48, 0.15, -0.2, -0.55];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const id = `${side < 0 ? 'L' : 'R'}${i + 1}`;
        const legRoot = new THREE.Group();
        const mountPos = new THREE.Vector3(side * 0.38, 0.0, legZ[i]);
        legRoot.position.copy(mountPos);
        legRoot.rotation.y = -side * legAng[i];
        root.add(legRoot);

        // Femur rising upward & outward
        const femur = new THREE.Group();
        legRoot.add(femur);
        addServoJoint(femur, 0.72);
        const fShell = castMesh(new THREE.BoxGeometry(0.52, 0.12, 0.12), MATS.ceramic, femur);
        fShell.position.set(side * 0.28, 0.16, 0);
        fShell.rotation.z = side * 0.52;

        // Patella/Tibia knee drum
        const knee = new THREE.Group();
        knee.position.set(side * 0.52, 0.3, 0);
        femur.add(knee);
        addServoJoint(knee, 0.78);

        // Tibia/Tarsus descending strut to orange-ringed spike foot
        const tibia = new THREE.Group();
        knee.add(tibia);
        const tStrut = castMesh(new THREE.CylinderGeometry(0.075, 0.045, 0.76, 8), MATS.ceramic, tibia);
        tStrut.position.set(side * 0.22, -0.34, 0);
        tStrut.rotation.z = side * 0.48;

        const footCollar = castMesh(new THREE.CylinderGeometry(0.06, 0.05, 0.09, 8), MATS.orange, tibia);
        footCollar.position.set(side * 0.4, -0.7, 0);
        const footSpike = castMesh(new THREE.ConeGeometry(0.04, 0.16, 6).rotateX(Math.PI), MATS.gunmetal, tibia);
        footSpike.position.set(side * 0.4, -0.8, 0);

        legs.push({ id, side, idx: i, legRoot, mountPos, femur, knee, tibia });
      }
    }

    return { root, carapacePlates, internalSpine, ventralDeck, sensorHead, headBasePos, claws, tailBase, tailLinks, stingerGroup, legs };
  }

  // =========================================================================
  // 2. BEE (Mellis HB-7) — 4 Venation Wings, Piezo Thorax Drive, Glass Abdomen Gear Capsule
  //    Matches reference frame docs/bee.gif (bee_0_f0.png)
  // =========================================================================
  function buildBeeModel() {
    const root = new THREE.Group();
    root.visible = false;

    // 2A. Central Thorax Drive Core (3 Planetary Gears + 11 Piezo Actuators + Braided Micro-Hoses)
    const thoraxCore = new THREE.Group();
    thoraxCore.position.set(0, 0.18, 0.15);
    root.add(thoraxCore);
    castMesh(new THREE.CylinderGeometry(0.38, 0.36, 0.62, 14).rotateX(Math.PI / 2), MATS.gunmetal, thoraxCore);
    const thoraxGears = [];
    for (let i = 0; i < 3; i++) {
      const g = castMesh(GEO.gearMed, i === 1 ? MATS.orange : MATS.steel, thoraxCore);
      g.position.set((i - 1) * 0.18, 0.12, 0.18 - i * 0.14);
      thoraxGears.push(g);
    }
    // Hinged Ceramic Thorax Carapace Shells
    const thoraxShells = [];
    for (const side of [-1, 1]) {
      const sh = new THREE.Group();
      sh.position.set(side * 0.32, 0.26, 0.15);
      root.add(sh);
      const dome = castMesh(new THREE.SphereGeometry(0.36, 12, 10), MATS.ceramic, sh);
      dome.scale.set(0.65, 0.85, 1.15);
      const collar = castMesh(new THREE.TorusGeometry(0.32, 0.025, 6, 16), MATS.orange, sh);
      collar.rotation.y = Math.PI / 2;
      thoraxShells.push({ group: sh, side });
    }

    // 10-Segment Neck Bearing Collar + Compound Optic Head (matching bee_0_f0.png)
    const headGroup = new THREE.Group();
    const headBasePos = new THREE.Vector3(0, 0.14, 0.72);
    headGroup.position.copy(headBasePos);
    root.add(headGroup);
    castMesh(new THREE.TorusGeometry(0.24, 0.035, 8, 18), MATS.orange, headGroup);
    const skull = castMesh(new THREE.SphereGeometry(0.28, 12, 10), MATS.ceramic, headGroup);
    skull.scale.set(0.95, 1.05, 0.82);
    skull.position.z = 0.14;

    for (const sgn of [-1, 1]) {
      // Compound Eye Lens
      const eye = castMesh(new THREE.SphereGeometry(0.14, 10, 8), MATS.lensGlass, headGroup);
      eye.scale.set(0.65, 1.25, 0.85);
      eye.position.set(sgn * 0.22, 0.04, 0.18);
      const eyeRim = castMesh(new THREE.TorusGeometry(0.12, 0.018, 6, 14), MATS.orange, headGroup);
      eyeRim.rotation.y = sgn * 0.9;
      eyeRim.position.set(sgn * 0.2, 0.04, 0.19);

      // Articulated Geniculate Antenna
      const ant = new THREE.Group();
      ant.position.set(sgn * 0.09, 0.14, 0.34);
      ant.rotation.set(-0.35, sgn * 0.35, 0);
      headGroup.add(ant);
      castMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 6).rotateX(Math.PI / 2), MATS.gunmetal, ant).position.z = 0.14;
      castMesh(new THREE.CylinderGeometry(0.016, 0.012, 0.32, 6), MATS.orange, ant).position.set(0, -0.14, 0.28);
    }

    // 2B. Abdomen Capsule (Glass Sleeve + Internal Stacked Gear Train & Return Spring + Ceramic Tergite Rings — exact match to bee_0_f0.png!)
    const abdomenGroup = new THREE.Group();
    const abdBasePos = new THREE.Vector3(0, 0.04, -0.58);
    abdomenGroup.position.copy(abdBasePos);
    abdomenGroup.rotation.x = -0.18;
    root.add(abdomenGroup);

    // Internal Abdomen Stacked Planetary Gear Train & Central Shaft (visible through glass sleeve & when abdomen opens!)
    const abdInternalGears = [];
    castMesh(new THREE.CylinderGeometry(0.08, 0.06, 1.05, 10).rotateX(Math.PI / 2), MATS.steel, abdomenGroup).position.z = -0.25;
    for (let g = 0; g < 5; g++) {
      const rG = 0.28 * (1 - g * 0.12);
      const gear = castMesh(createGearGeometry(18, rG, rG * 0.78, 0.055, 0.07), g % 2 === 0 ? MATS.gunmetal : MATS.steel, abdomenGroup);
      gear.position.z = 0.08 - g * 0.14;
      abdInternalGears.push(gear);
    }
    // Translucent Glass Abdomen Inspection Barrel
    const abdGlass = castMesh(new THREE.CylinderGeometry(0.34, 0.24, 0.68, 16).rotateX(Math.PI / 2), MATS.portGlass, abdomenGroup);
    abdGlass.position.z = -0.18;

    // 4 Telescoping Ceramic + Safety-Orange Striped Abdomen Rings & Terminal Stinger Cone
    const abdRings = [];
    for (let r = 0; r < 4; r++) {
      const rg = new THREE.Group();
      const baseZ = 0.16 - r * 0.22;
      rg.position.z = baseZ;
      abdomenGroup.add(rg);
      const rad1 = 0.36 - r * 0.055;
      const rad2 = 0.33 - r * 0.065;
      castMesh(new THREE.CylinderGeometry(rad1, rad2, 0.14, 16).rotateX(Math.PI / 2), MATS.ceramic, rg);
      castMesh(new THREE.TorusGeometry(rad1, 0.024, 6, 18), MATS.orange, rg).position.z = 0.06;
      abdRings.push({ group: rg, baseZ, idx: r });
    }
    const beeStinger = castMesh(new THREE.ConeGeometry(0.05, 0.22, 8).rotateX(-Math.PI / 2), MATS.carbon, abdomenGroup);
    beeStinger.position.z = -0.78;

    // 2C. 4 Translucent Venation Wings (Forewings & Hindwings with Carbon Leading-Edge Spars)
    const wings = [];
    for (const side of [-1, 1]) {
      for (let wIdx = 0; wIdx < 2; wIdx++) {
        const isFore = wIdx === 0;
        const wingPivot = new THREE.Group();
        wingPivot.position.set(side * 0.32, 0.38, isFore ? 0.22 : 0.02);
        root.add(wingPivot);

        addServoJoint(wingPivot, 0.55);
        const wLen = isFore ? 1.45 : 0.98;
        const wWid = isFore ? 0.42 : 0.31;

        // Translucent wing membrane
        const membrane = castMesh(new THREE.BoxGeometry(wLen, 0.008, wWid), MATS.portGlass, wingPivot);
        membrane.position.set(side * (wLen * 0.52), 0.04, -wWid * 0.25);

        // Carbon leading-edge spar & diagonal venation struts
        const spar = castMesh(new THREE.CylinderGeometry(0.018, 0.008, wLen, 6).rotateZ(-side * Math.PI / 2), MATS.carbon, wingPivot);
        spar.position.set(side * (wLen * 0.52), 0.045, 0);
        for (let v = 1; v <= 4; v++) {
          const vein = castMesh(new THREE.BoxGeometry(wLen * 0.28, 0.01, 0.012), MATS.gunmetal, wingPivot);
          vein.position.set(side * (wLen * 0.22 * v), 0.045, -wWid * 0.32);
          vein.rotation.y = side * 0.45;
        }
        wings.push({ wingPivot, side, isFore });
      }
    }

    // 2D. 6 Articulated Pollinator Legs (L1..L3, R1..R3) with Orange Stripe Struts
    const legs = [];
    const legZ = [0.36, 0.12, -0.14];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const id = `${side < 0 ? 'L' : 'R'}${i + 1}`;
        const legRoot = new THREE.Group();
        const mountPos = new THREE.Vector3(side * 0.3, -0.06, legZ[i]);
        legRoot.position.copy(mountPos);
        root.add(legRoot);

        addServoJoint(legRoot, 0.62);
        const upper = castMesh(new THREE.CylinderGeometry(0.048, 0.038, 0.52, 8), i === 1 ? MATS.orange : MATS.gunmetal, legRoot);
        upper.position.set(side * 0.18, -0.22, 0);
        upper.rotation.z = side * 0.55;

        const knee = new THREE.Group();
        knee.position.set(side * 0.34, -0.44, 0);
        legRoot.add(knee);
        addServoJoint(knee, 0.52);

        const lower = castMesh(new THREE.CylinderGeometry(0.042, 0.025, 0.58, 8), MATS.ceramic, knee);
        lower.position.set(side * 0.08, -0.28, -0.06);
        lower.rotation.z = side * 0.18;

        legs.push({ id, side, idx: i, legRoot, mountPos, knee });
      }
    }

    return { root, thoraxCore, thoraxGears, thoraxShells, headGroup, headBasePos, abdomenGroup, abdBasePos, abdInternalGears, abdRings, beeStinger, wings, legs };
  }

  // =========================================================================
  // 3. DOG (Canis CN-12) — 12-DOF Agile Canine Quadruped
  //    Anatomically accurate Lupine Head/Jaw, Ribbed Thoracic Chest, Lumbar Spine, 4 Digitigrade Legs & Tail
  // =========================================================================
  function buildDogModel() {
    const root = new THREE.Group();
    root.visible = false;

    // 3A. Thoracic Ribcage & Internal Dual Battery/Hydraulic Core
    const torsoCore = new THREE.Group();
    torsoCore.position.set(0, 0.22, 0.05);
    root.add(torsoCore);

    // Internal spinal column, cooling manifold & gears
    castMesh(new THREE.CylinderGeometry(0.14, 0.11, 1.55, 10).rotateX(Math.PI / 2), MATS.gunmetal, torsoCore).position.y = 0.14;
    const corePack = castMesh(new THREE.BoxGeometry(0.36, 0.26, 0.78), MATS.carbon, torsoCore);
    corePack.position.set(0, 0.02, 0.18);
    castMesh(new THREE.BoxGeometry(0.38, 0.045, 0.72), MATS.orange, torsoCore).position.set(0, 0.12, 0.18);
    const dogGear = castMesh(GEO.gearMed, MATS.orange, torsoCore);
    dogGear.rotation.y = Math.PI / 2;
    dogGear.position.set(0.2, 0.06, 0.18);

    // Hinged Left & Right Ceramic Thoracic Armor Shells + 5 Anatomical Rib Struts per side
    const chestShells = [];
    for (const side of [-1, 1]) {
      const shellG = new THREE.Group();
      shellG.position.set(side * 0.24, 0.24, 0.22);
      root.add(shellG);
      castMesh(new THREE.BoxGeometry(0.14, 0.38, 0.76), side === 1 ? MATS.portGlass : MATS.ceramic, shellG);
      castMesh(new THREE.BoxGeometry(0.16, 0.06, 0.58), MATS.orange, shellG).position.y = 0.08;
      for (let r = 0; r < 5; r++) {
        const rib = castMesh(new THREE.BoxGeometry(0.15, 0.34, 0.065), MATS.ceramic, shellG);
        rib.position.set(0, -0.04, 0.28 - r * 0.14);
        rib.rotation.x = 0.18;
      }
      chestShells.push({ group: shellG, side });
    }

    // Rear Pelvic / Hip Assembly
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.24, -0.58);
    root.add(pelvis);
    castMesh(new THREE.BoxGeometry(0.44, 0.28, 0.42), MATS.ceramic, pelvis);
    castMesh(new THREE.BoxGeometry(0.46, 0.05, 0.28), MATS.orange, pelvis).position.y = 0.1;

    // 3B. Cervical Neck & Lupine Stereo-LiDAR Head with Hinged Mandible Jaw & Radar Pinnae Ears
    const headGroup = new THREE.Group();
    const headBasePos = new THREE.Vector3(0, 0.54, 0.82);
    headGroup.position.copy(headBasePos);
    root.add(headGroup);

    // Neck strut
    const neck = castMesh(new THREE.CylinderGeometry(0.14, 0.18, 0.38, 10), MATS.gunmetal, headGroup);
    neck.position.set(0, -0.14, -0.12);
    neck.rotation.x = 0.52;

    // Cranium + Snout
    castMesh(new THREE.BoxGeometry(0.34, 0.26, 0.36), MATS.ceramic, headGroup);
    const snout = castMesh(new THREE.BoxGeometry(0.22, 0.14, 0.34), MATS.ceramic, headGroup);
    snout.position.set(0, -0.02, 0.28);
    castMesh(new THREE.BoxGeometry(0.1, 0.08, 0.06), MATS.carbon, headGroup).position.set(0, 0.02, 0.45); // Nose sensor

    // Hinged Lower Canine Jaw (Mandible)
    const lowerJaw = new THREE.Group();
    lowerJaw.position.set(0, -0.1, 0.12);
    headGroup.add(lowerJaw);
    castMesh(new THREE.BoxGeometry(0.18, 0.06, 0.32), MATS.gunmetal, lowerJaw).position.z = 0.14;
    castMesh(new THREE.BoxGeometry(0.19, 0.025, 0.26), MATS.orange, lowerJaw).position.z = 0.14;

    // Stereo Optical Eyes & Pointed Lupine Ears
    for (const sgn of [-1, 1]) {
      const eye = castMesh(GEO.eyeLens, MATS.lensGlass, headGroup);
      eye.scale.setScalar(0.65);
      eye.position.set(sgn * 0.12, 0.04, 0.17);
      const rim = castMesh(GEO.eyeRim, MATS.orange, headGroup);
      rim.scale.setScalar(0.65);
      rim.position.set(sgn * 0.12, 0.04, 0.18);

      const ear = castMesh(new THREE.ConeGeometry(0.075, 0.24, 6), MATS.ceramic, headGroup);
      ear.position.set(sgn * 0.12, 0.22, -0.04);
      ear.rotation.set(0.2, 0, -sgn * 0.15);
    }

    // 3C. 4 Digitigrade Canine Legs (FL, FR, HL, HR) with Abductor Drum, Thigh/Humerus, Hock & Paw Pad
    const legs = [];
    const legDefs = [
      { id: 'FL', side: -1, isFront: true, pos: new THREE.Vector3(-0.32, 0.18, 0.46) },
      { id: 'FR', side: 1, isFront: true, pos: new THREE.Vector3(0.32, 0.18, 0.46) },
      { id: 'HL', side: -1, isFront: false, pos: new THREE.Vector3(-0.3, 0.2, -0.58) },
      { id: 'HR', side: 1, isFront: false, pos: new THREE.Vector3(0.3, 0.2, -0.58) },
    ];
    for (const d of legDefs) {
      const legRoot = new THREE.Group();
      legRoot.position.copy(d.pos);
      root.add(legRoot);

      const hipDrum = addServoJoint(legRoot, 0.95);
      hipDrum.rotation.y = Math.PI / 2;

      const upper = new THREE.Group();
      upper.rotation.x = d.isFront ? 0.28 : -0.35;
      legRoot.add(upper);
      const uMesh = castMesh(new THREE.BoxGeometry(0.14, 0.48, 0.18), d.id === 'FL' ? MATS.portGlass : MATS.ceramic, upper);
      uMesh.position.y = -0.24;
      castMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.46, 8), MATS.steel, upper).position.y = -0.24;

      const knee = new THREE.Group();
      knee.position.set(0, -0.46, 0);
      knee.rotation.x = d.isFront ? -0.45 : 0.62;
      upper.add(knee);
      const kDrum = addServoJoint(knee, 0.72);
      kDrum.rotation.y = Math.PI / 2;

      const lower = castMesh(new THREE.CylinderGeometry(0.065, 0.045, 0.44, 10), MATS.ceramic, knee);
      lower.position.y = -0.22;
      const ankle = new THREE.Group();
      ankle.position.set(0, -0.44, 0);
      knee.add(ankle);
      const aDrum = addServoJoint(ankle, 0.52);
      aDrum.rotation.y = Math.PI / 2;
      const paw = castMesh(new THREE.BoxGeometry(0.13, 0.08, 0.2), MATS.rubber, ankle);
      paw.position.set(0, -0.05, 0.05);
      castMesh(new THREE.BoxGeometry(0.14, 0.03, 0.16), MATS.orange, ankle).position.set(0, -0.01, 0.04);

      legs.push({ ...d, legRoot, upper, knee, ankle });
    }

    // 3D. 5-Segment Articulated Wagging/Balance Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.34, -0.82);
    root.add(tailGroup);
    const tailSegs = [];
    for (let i = 0; i < 5; i++) {
      const s = castMesh(new THREE.CylinderGeometry(0.055 - i * 0.008, 0.065 - i * 0.008, 0.16, 8).rotateX(Math.PI / 2), i % 2 === 0 ? MATS.ceramic : MATS.orange, tailGroup);
      s.position.set(0, i * 0.07, -i * 0.14);
      s.rotation.x = 0.45;
      tailSegs.push(s);
    }

    return { root, torsoCore, dogGear, chestShells, pelvis, headGroup, headBasePos, lowerJaw, legs, tailGroup, tailSegs };
  }

  // =========================================================================
  // 4. BIRD (Falco AV-6) — Peregrine Robotic Raptor
  //    Hooked Raptor Beak, Keeled Thoracic Flight Core, 12-Feather Folding Wings, Fanning Tail & Talons
  // =========================================================================
  function buildBirdModel() {
    const root = new THREE.Group();
    root.visible = false;

    // 4A. Keeled Aerodynamic Sternum & Thoracic Flight Gearbox
    const bodyCore = new THREE.Group();
    bodyCore.position.set(0, 0.12, 0);
    bodyCore.rotation.x = -0.22;
    root.add(bodyCore);

    castMesh(new THREE.CylinderGeometry(0.28, 0.18, 0.92, 12).rotateX(Math.PI / 2), MATS.gunmetal, bodyCore);
    const flightGearL = castMesh(GEO.gearMed, MATS.orange, bodyCore);
    flightGearL.position.set(-0.14, 0.12, 0.18);
    const flightGearR = castMesh(GEO.gearMed, MATS.steel, bodyCore);
    flightGearR.position.set(0.14, 0.12, 0.18);

    // Hinged Dorsal Carapace Mantle & Ventral Keel Breastplate
    const dorsalShell = new THREE.Group();
    dorsalShell.position.set(0, 0.18, 0.05);
    bodyCore.add(dorsalShell);
    const dMesh = castMesh(new THREE.SphereGeometry(0.34, 14, 10), MATS.ceramic, dorsalShell);
    dMesh.scale.set(0.95, 0.65, 1.45);
    const glassCanopy = castMesh(new THREE.SphereGeometry(0.28, 12, 8), MATS.portGlass, dorsalShell);
    glassCanopy.scale.set(0.65, 0.72, 1.1);
    glassCanopy.position.set(0, 0.06, 0.08);

    const ventralKeel = new THREE.Group();
    ventralKeel.position.set(0, -0.14, 0.08);
    bodyCore.add(ventralKeel);
    const kMesh = castMesh(new THREE.ConeGeometry(0.26, 0.88, 10).rotateX(-Math.PI / 2), MATS.ceramic, ventralKeel);
    kMesh.scale.set(0.85, 0.75, 1);
    castMesh(new THREE.BoxGeometry(0.08, 0.14, 0.68), MATS.orange, ventralKeel).position.y = -0.12;

    // 4B. Raptor Head & Hooked Chitin-Titanium Beak
    const headGroup = new THREE.Group();
    const headBasePos = new THREE.Vector3(0, 0.36, 0.62);
    headGroup.position.copy(headBasePos);
    root.add(headGroup);
    const cranium = castMesh(new THREE.SphereGeometry(0.21, 12, 10), MATS.ceramic, headGroup);
    cranium.scale.set(0.88, 0.92, 1.15);
    // Hooked Upper Raptor Maxilla Beak + Lower Mandible
    const beakUpper = castMesh(new THREE.ConeGeometry(0.095, 0.32, 8).rotateX(Math.PI / 2 + 0.32), MATS.orange, headGroup);
    beakUpper.position.set(0, -0.02, 0.28);
    const beakTip = castMesh(new THREE.ConeGeometry(0.05, 0.14, 6).rotateX(Math.PI - 0.35), MATS.gunmetal, headGroup);
    beakTip.position.set(0, -0.1, 0.4);
    for (const sgn of [-1, 1]) {
      const eye = castMesh(GEO.eyeLens, MATS.lensGlass, headGroup);
      eye.scale.setScalar(0.75);
      eye.position.set(sgn * 0.16, 0.04, 0.1);
      const rim = castMesh(GEO.eyeRim, MATS.orange, headGroup);
      rim.scale.setScalar(0.75);
      rim.rotation.y = sgn * 1.1;
      rim.position.set(sgn * 0.165, 0.04, 0.1);
    }

    // 4C. Articulated Multi-Feather Folding & Flapping Wings (WING L & WING R — 10 Feathers per Wing!)
    const wings = [];
    const featherGeo = new THREE.BoxGeometry(0.68, 0.014, 0.13);
    const shaftGeo = new THREE.CylinderGeometry(0.012, 0.005, 0.68, 6).rotateZ(Math.PI / 2);
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.28, 0.22, 0.18);
      root.add(shoulder);
      addServoJoint(shoulder, 0.82);

      // Inner wing (Humerus + Radius/Ulna leading edge)
      const innerWing = new THREE.Group();
      shoulder.add(innerWing);
      const spar1 = castMesh(new THREE.CylinderGeometry(0.06, 0.045, 0.72, 8).rotateZ(-side * Math.PI / 2), MATS.ceramic, innerWing);
      spar1.position.set(side * 0.36, 0, 0.08);
      castMesh(new THREE.BoxGeometry(0.48, 0.03, 0.06), MATS.orange, innerWing).position.set(side * 0.36, 0.04, 0.1);

      // Outer wing wrist (Carpometacarpus)
      const outerWing = new THREE.Group();
      outerWing.position.set(side * 0.72, 0, 0.08);
      innerWing.add(outerWing);
      addServoJoint(outerWing, 0.62);
      const spar2 = castMesh(new THREE.CylinderGeometry(0.045, 0.02, 0.82, 8).rotateZ(-side * Math.PI / 2), MATS.gunmetal, outerWing);
      spar2.position.set(side * 0.41, 0, -0.04);

      // 10 Articulated Overlapping Flight Feather Blades (5 Secondaries on Inner + 5 Primaries on Outer)
      const feathers = [];
      for (let f = 0; f < 10; f++) {
        const isPrimary = f >= 5;
        const fGroup = new THREE.Group();
        const localIdx = isPrimary ? f - 5 : f;
        if (!isPrimary) {
          fGroup.position.set(side * (0.14 + localIdx * 0.12), -0.01, 0.04);
          innerWing.add(fGroup);
        } else {
          fGroup.position.set(side * (0.1 + localIdx * 0.15), -0.01, -0.02);
          outerWing.add(fGroup);
        }
        const blade = castMesh(featherGeo, f === 2 || f === 7 ? MATS.portGlass : MATS.ceramic, fGroup);
        blade.position.set(side * 0.22, 0, -0.28);
        blade.rotation.y = side * (0.72 - f * 0.055);
        const shaft = castMesh(shaftGeo, f % 3 === 0 ? MATS.orange : MATS.carbon, fGroup);
        shaft.position.set(side * 0.22, 0.01, -0.22);
        shaft.rotation.y = side * (0.72 - f * 0.055);
        feathers.push({ fGroup, blade, idx: f, isPrimary });
      }

      wings.push({ side, shoulder, innerWing, outerWing, feathers });
    }

    // 4D. Fanning 7-Feather Tailplane (Rectrices)
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, -0.06, -0.52);
    root.add(tailPivot);
    addServoJoint(tailPivot, 0.68);
    const tailFeathers = [];
    for (let t = -3; t <= 3; t++) {
      const tf = new THREE.Group();
      tf.rotation.y = t * 0.14;
      tailPivot.add(tf);
      const tb = castMesh(new THREE.BoxGeometry(0.11, 0.014, 0.62), Math.abs(t) === 3 ? MATS.orange : MATS.ceramic, tf);
      tb.position.set(0, 0, -0.34);
      tailFeathers.push({ group: tf, idx: t });
    }

    // 4E. Retractable Grasping Raptor Talons (TALON L & TALON R)
    const talons = [];
    for (const side of [-1, 1]) {
      const tGroup = new THREE.Group();
      tGroup.position.set(side * 0.18, -0.22, -0.08);
      root.add(tGroup);
      castMesh(new THREE.CylinderGeometry(0.05, 0.035, 0.38, 8), MATS.gunmetal, tGroup).position.y = -0.18;
      castMesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), MATS.orange, tGroup).position.y = -0.34;
      for (let c = -1; c <= 1; c++) {
        const claw = castMesh(new THREE.ConeGeometry(0.025, 0.16, 6).rotateX(Math.PI * 0.72), MATS.carbon, tGroup);
        claw.position.set(c * 0.04, -0.4, 0.08);
      }
      talons.push({ group: tGroup, side });
    }

    return { root, bodyCore, flightGearL, flightGearR, dorsalShell, ventralKeel, headGroup, headBasePos, wings, tailPivot, tailFeathers, talons };
  }

  // =========================================================================
  // 5. SPIDER (Arachne AR-8) — 8-Legged Robotic Tarantula / Orb-Weaver
  //    Prosoma + Opisthosoma joined by Pedicel, 8-Eye Turret, Chelicerae Fangs, 8 High-Arching Legs & Spinnerets
  // =========================================================================
  function buildSpiderModel() {
    const root = new THREE.Group();
    root.visible = false;

    // 5A. Prosoma (Cephalothorax) with Radial 8-Cylinder Hydraulic Manifold & Hinged Carapace Dome
    const prosomaCore = new THREE.Group();
    prosomaCore.position.set(0, 0.12, 0.32);
    root.add(prosomaCore);
    castMesh(new THREE.CylinderGeometry(0.46, 0.42, 0.22, 16), MATS.gunmetal, prosomaCore);
    const spiderGear = castMesh(GEO.gearMed, MATS.orange, prosomaCore);
    spiderGear.rotation.x = Math.PI / 2;
    spiderGear.position.y = 0.14;

    const prosomaDome = new THREE.Group();
    prosomaDome.position.set(0, 0.22, 0.32);
    root.add(prosomaDome);
    const pShell = castMesh(new THREE.SphereGeometry(0.46, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), MATS.ceramic, prosomaDome);
    pShell.scale.set(0.92, 0.62, 1.08);
    castMesh(new THREE.TorusGeometry(0.42, 0.024, 6, 22).rotateX(Math.PI / 2), MATS.orange, prosomaDome);

    // 5B. 8-Eye Ocular Turret & Twin Articulated Chelicerae Fangs + Pedipalps
    const fangGroup = new THREE.Group();
    const fangBasePos = new THREE.Vector3(0, 0.1, 0.78);
    fangGroup.position.copy(fangBasePos);
    root.add(fangGroup);

    for (const sgn of [-1, 1]) {
      // Principal AME Eye with orange IR ring
      const ame = castMesh(new THREE.SphereGeometry(0.085, 10, 8), MATS.lensGlass, fangGroup);
      ame.position.set(sgn * 0.1, 0.14, 0.04);
      castMesh(new THREE.TorusGeometry(0.085, 0.016, 6, 14), MATS.orange, fangGroup).position.set(sgn * 0.1, 0.14, 0.06);
      // 3 Secondary Eyes per side (ALE, PME, PLE)
      for (let e = 0; e < 3; e++) {
        const se = castMesh(new THREE.SphereGeometry(0.042, 6, 5), MATS.lensGlass, fangGroup);
        se.position.set(sgn * (0.2 + e * 0.055), 0.15 - e * 0.02, 0.01 - e * 0.05);
      }
      // Chelicera Basal Segment + Hinged Venom Fang
      const chel = new THREE.Group();
      chel.position.set(sgn * 0.11, -0.02, 0.08);
      fangGroup.add(chel);
      castMesh(new THREE.CylinderGeometry(0.075, 0.06, 0.24, 10), MATS.ceramic, chel);
      const fang = castMesh(new THREE.ConeGeometry(0.045, 0.22, 8).rotateX(Math.PI * 0.85), MATS.carbon, chel);
      fang.position.set(-sgn * 0.02, -0.18, 0.04);
    }

    // 5C. Globular Opisthosoma (Abdomen) with Glass Silk-Spool Window & 6 Posterior Spinnerets
    const abdomenGroup = new THREE.Group();
    const abdBasePos = new THREE.Vector3(0, 0.24, -0.58);
    abdomenGroup.position.copy(abdBasePos);
    root.add(abdomenGroup);

    // Internal Silk Spool & Book-Lung Heat Exchanger
    const silkSpool = castMesh(new THREE.CylinderGeometry(0.28, 0.28, 0.48, 14).rotateZ(Math.PI / 2), MATS.orange, abdomenGroup);
    castMesh(GEO.gearMed, MATS.steel, abdomenGroup).position.y = 0.22;

    // Left & Right Hinged Opisthosoma Carapace Shells + Smoked Glass Dorsal Window
    const abdShells = [];
    for (const side of [-1, 1]) {
      const sh = new THREE.Group();
      abdomenGroup.add(sh);
      const half = castMesh(
        new THREE.SphereGeometry(0.58, 14, 12, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, Math.PI),
        MATS.ceramic,
        sh
      );
      half.scale.set(0.88, 0.82, 1.18);
      castMesh(new THREE.BoxGeometry(0.08, 0.12, 0.72), MATS.orange, sh).position.set(side * 0.42, 0.12, 0);
      abdShells.push({ group: sh, side });
    }
    const abdGlass = castMesh(new THREE.SphereGeometry(0.42, 12, 10), MATS.portGlass, abdomenGroup);
    abdGlass.scale.set(0.65, 0.45, 0.95);
    abdGlass.position.y = 0.34;

    // Posterior 6 Spinneret Nozzles
    const spinnerets = new THREE.Group();
    spinnerets.position.set(0, -0.14, -0.68);
    abdomenGroup.add(spinnerets);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      const sp = castMesh(new THREE.CylinderGeometry(0.035, 0.02, 0.18, 8).rotateX(-Math.PI / 2), s % 2 === 0 ? MATS.orange : MATS.gunmetal, spinnerets);
      sp.position.set(Math.cos(a) * 0.11, Math.sin(a) * 0.08, -0.08);
    }

    // 5D. 8 Long High-Arching Arachnid Legs (L1..L4, R1..R4 — Coxa, Femur, Patella, Tibia, Metatarsus/Tarsus)
    const legs = [];
    const legAngles = [0.72, 0.24, -0.24, -0.75];
    const femurStrutGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.92, 8);
    const tibiaStrutGeo = new THREE.CylinderGeometry(0.045, 0.022, 1.15, 8);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const id = `${side < 0 ? 'L' : 'R'}${i + 1}`;
        const legRoot = new THREE.Group();
        const az = legAngles[i];
        const mountPos = new THREE.Vector3(side * Math.cos(az) * 0.44, 0.08, 0.32 + Math.sin(az) * 0.44);
        legRoot.position.copy(mountPos);
        legRoot.rotation.y = -side * az;
        root.add(legRoot);

        addServoJoint(legRoot, 0.72);
        // High-arching Femur
        const femur = new THREE.Group();
        legRoot.add(femur);
        const fMesh = castMesh(femurStrutGeo, (id === 'L2' || id === 'R1') ? MATS.portGlass : MATS.ceramic, femur);
        fMesh.position.set(side * 0.34, 0.34, 0);
        fMesh.rotation.z = side * 0.78;

        // High Patella-Tibia Knee Arch
        const knee = new THREE.Group();
        knee.position.set(side * 0.68, 0.68, 0);
        femur.add(knee);
        addServoJoint(knee, 0.68);

        // Long Descending Tibia + Tarsus Needle Tip
        const tibia = new THREE.Group();
        knee.add(tibia);
        const tMesh = castMesh(tibiaStrutGeo, MATS.ceramic, tibia);
        tMesh.position.set(side * 0.34, -0.48, 0);
        tMesh.rotation.z = side * 0.56;
        const tipRing = castMesh(new THREE.CylinderGeometry(0.04, 0.025, 0.12, 8), MATS.orange, tibia);
        tipRing.position.set(side * 0.64, -0.96, 0);

        legs.push({ id, side, idx: i, legRoot, mountPos, femur, knee, tibia });
      }
    }

    return { root, prosomaCore, spiderGear, prosomaDome, fangGroup, fangBasePos, abdomenGroup, abdBasePos, silkSpool, abdShells, spinnerets, legs };
  }

  // =========================================================================
  // 6. SNAKE (Ophidia OP-24) — 24-Joint Hyper-Redundant Sidewinder Pit-Viper
  //    Triangular Viper Head with Hinged 160° Strike Jaws & Folding Fangs, 22 Ribbed Vertebral Scutes & Tail Rattle
  // =========================================================================
  function buildSnakeModel() {
    const root = new THREE.Group();
    root.visible = false;

    // 6A. Triangular Pit-Viper Head, Hinged Lower Jaw, Folding Solenoglyphous Fangs & Bifurcated Sensor Tongue
    const headGroup = new THREE.Group();
    root.add(headGroup);

    // Triangular viper cranium
    const skull = castMesh(new THREE.ConeGeometry(0.34, 0.62, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6), MATS.ceramic, headGroup);
    skull.scale.set(1.15, 0.52, 1.0);
    castMesh(new THREE.BoxGeometry(0.28, 0.04, 0.32), MATS.orange, headGroup).position.set(0, 0.11, -0.05);

    // Supraocular Viper Brow Shields & Thermal Pit Organs
    for (const sgn of [-1, 1]) {
      const eye = castMesh(GEO.eyeLens, MATS.lensGlass, headGroup);
      eye.scale.setScalar(0.65);
      eye.position.set(sgn * 0.19, 0.04, 0.08);
      const rim = castMesh(GEO.eyeRim, MATS.orange, headGroup);
      rim.scale.setScalar(0.65);
      rim.rotation.y = sgn * 1.1;
      rim.position.set(sgn * 0.2, 0.04, 0.08);
    }

    // Hinged Lower Mandible Jaw + Folding Twin Hypodermic Fangs + Forked Tongue
    const jawLower = new THREE.Group();
    jawLower.position.set(0, -0.06, -0.18);
    headGroup.add(jawLower);
    const jMesh = castMesh(new THREE.ConeGeometry(0.28, 0.56, 6).rotateX(Math.PI / 2), MATS.gunmetal, jawLower);
    jMesh.scale.set(1.0, 0.32, 1.0);
    jMesh.position.z = 0.24;

    const fangs = [];
    for (const sgn of [-1, 1]) {
      const fPivot = new THREE.Group();
      fPivot.position.set(sgn * 0.1, -0.02, 0.16);
      headGroup.add(fPivot);
      const fCone = castMesh(new THREE.ConeGeometry(0.032, 0.24, 8).rotateX(Math.PI * 0.78), MATS.steel, fPivot);
      fCone.position.set(0, -0.1, 0.04);
      fangs.push(fPivot);
    }
    const tongue = castMesh(new THREE.BoxGeometry(0.06, 0.012, 0.28), MATS.orange, jawLower);
    tongue.position.set(0, 0.02, 0.48);

    // 6B. 22 Cardan-Jointed Vertebral Body Segments (with Dorsal Scute, Curved Lateral Ribs, Ventral Belly Scales & Glass Segments)
    const N_SEGS = 22;
    const segments = [];
    const scuteGeo = new THREE.BoxGeometry(0.28, 0.09, 0.22);
    const ribGeo = new THREE.TorusGeometry(0.16, 0.026, 6, 12, Math.PI * 1.15);
    const bellyGeo = new THREE.BoxGeometry(0.24, 0.04, 0.2);

    for (let i = 0; i < N_SEGS; i++) {
      const u = i / (N_SEGS - 1);
      const scale = Math.sin(u * Math.PI * 0.85 + 0.15) * (1 - u * 0.55) + 0.22;
      const segGroup = new THREE.Group();
      segGroup.scale.setScalar(scale);
      root.add(segGroup);

      const isGlass = i === 3 || i === 4 || i === 10;
      // Central Vertebral Gimbal Drum & Tendon Rod
      castMesh(GEO.servoDrum, MATS.gunmetal, segGroup);
      castMesh(GEO.servoRing, i % 3 === 0 ? MATS.orange : MATS.steel, segGroup).position.z = 0.08;

      // Dorsal Ceramic Scute Plate (hinges upward on Mantle/Carapace open!)
      const dorsalScute = castMesh(scuteGeo, isGlass ? MATS.portGlass : MATS.ceramic, segGroup);
      dorsalScute.position.y = 0.14;

      // Left & Right Curved Anatomical Ribs (spread outward when Rib Assembly is isolated!)
      const ribL = castMesh(ribGeo, MATS.ceramic, segGroup);
      ribL.rotation.y = Math.PI / 2;
      ribL.rotation.z = 0.4;
      ribL.position.x = -0.06;
      const ribR = castMesh(ribGeo, MATS.ceramic, segGroup);
      ribR.rotation.y = Math.PI / 2;
      ribR.rotation.z = Math.PI - 0.4;
      ribR.position.x = 0.06;

      // Ventral Tractor-Scale Belly Plate
      const belly = castMesh(bellyGeo, i % 2 === 0 ? MATS.orange : MATS.carbon, segGroup);
      belly.position.y = -0.15;

      segments.push({ segGroup, dorsalScute, ribL, ribR, belly, u, scale, idx: i });
    }

    // 6C. Posterior Interlocking Acoustic Tail Rattle (6 Resonator Rings)
    const rattleGroup = new THREE.Group();
    root.add(rattleGroup);
    const rattleRings = [];
    for (let r = 0; r < 6; r++) {
      const rr = castMesh(
        new THREE.TorusGeometry(0.085 - r * 0.01, 0.022, 6, 12),
        r % 2 === 0 ? MATS.orange : MATS.ceramic,
        rattleGroup
      );
      rr.position.z = -r * 0.055;
      rattleRings.push(rr);
    }

    return { root, headGroup, jawLower, fangs, segments, rattleGroup, rattleRings };
  }

  // =========================================================================
  // 7. CHEETAH (Acinonyx AC-14) — High-Velocity Felid Sprinter
  //    Aerodynamic Skull with Tear Stripes, 6-Vertebra Flexing Spine, Deep Chest Keel, 4 Long Sprinter Legs & Rudder Tail
  // =========================================================================
  function buildCheetahModel() {
    const root = new THREE.Group();
    root.visible = false;

    // 7A. Hyper-Flexible 6-Vertebra Articulated Spine & Deep Aerodynamic Thoracic Keel
    const spineSegs = [];
    for (let v = 0; v < 6; v++) {
      const vGroup = new THREE.Group();
      root.add(vGroup);
      const isChest = v < 3;
      const wV = isChest ? 0.36 - v * 0.03 : 0.24;
      const hV = isChest ? 0.36 - v * 0.04 : 0.22;

      // Dorsal Ceramic Vertebral Saddle Plate + Orange Hydraulic Extensor Collar
      const saddle = castMesh(new THREE.BoxGeometry(wV, 0.08, 0.24), v === 1 ? MATS.portGlass : MATS.ceramic, vGroup);
      saddle.position.y = hV * 0.5;
      const coreBlock = castMesh(new THREE.BoxGeometry(wV * 0.82, hV, 0.22), MATS.gunmetal, vGroup);
      castMesh(new THREE.BoxGeometry(wV * 0.45, 0.04, 0.18), MATS.orange, vGroup).position.y = hV * 0.5 + 0.04;

      if (v === 1) {
        // Internal Turbo-Compressor Gear inside Chest Glass Window
        const g = castMesh(GEO.gearMed, MATS.orange, vGroup);
        g.rotation.y = Math.PI / 2;
        g.position.x = 0.14;
      }
      spineSegs.push({ group: vGroup, saddle, coreBlock, idx: v });
    }

    // 7B. Small Aerodynamic Felid Skull with High-Speed Binocular Optics & Black Malar Tear Stripes
    const headGroup = new THREE.Group();
    root.add(headGroup);
    const cranium = castMesh(new THREE.SphereGeometry(0.2, 12, 10), MATS.ceramic, headGroup);
    cranium.scale.set(0.92, 0.88, 1.18);
    const muzzle = castMesh(new THREE.BoxGeometry(0.18, 0.12, 0.22), MATS.ceramic, headGroup);
    muzzle.position.set(0, -0.04, 0.18);
    for (const sgn of [-1, 1]) {
      const eye = castMesh(GEO.eyeLens, MATS.lensGlass, headGroup);
      eye.scale.setScalar(0.62);
      eye.position.set(sgn * 0.11, 0.03, 0.16);
      const rim = castMesh(GEO.eyeRim, MATS.orange, headGroup);
      rim.scale.setScalar(0.62);
      rim.position.set(sgn * 0.11, 0.03, 0.17);
      // Signature Cheetah Black Malar Tear Stripe Baffle
      const tear = castMesh(new THREE.BoxGeometry(0.025, 0.12, 0.14), MATS.carbon, headGroup);
      tear.position.set(sgn * 0.11, -0.03, 0.2);
      // Rounded Felid Pinna Ear
      const ear = castMesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10).rotateX(Math.PI / 2), MATS.ceramic, headGroup);
      ear.position.set(sgn * 0.13, 0.16, -0.04);
    }

    // 7C. 4 Long High-Velocity Felid Sprinter Legs (FL, FR, HL, HR) with Traction Cleat Claws
    const legs = [];
    const legDefs = [
      { id: 'FL', side: -1, isFront: true },
      { id: 'FR', side: 1, isFront: true },
      { id: 'HL', side: -1, isFront: false },
      { id: 'HR', side: 1, isFront: false },
    ];
    for (const d of legDefs) {
      const legRoot = new THREE.Group();
      root.add(legRoot);
      const drum = addServoJoint(legRoot, 1.0);
      drum.rotation.y = Math.PI / 2;

      const upper = new THREE.Group();
      legRoot.add(upper);
      const uShell = castMesh(new THREE.BoxGeometry(0.12, 0.56, 0.18), d.id === 'FL' ? MATS.portGlass : MATS.ceramic, upper);
      uShell.position.y = -0.26;
      castMesh(new THREE.BoxGeometry(0.13, 0.32, 0.045), MATS.orange, upper).position.set(0, -0.24, 0.08);

      const knee = new THREE.Group();
      knee.position.set(0, -0.54, 0);
      upper.add(knee);
      const kDrum = addServoJoint(knee, 0.72);
      kDrum.rotation.y = Math.PI / 2;

      const lower = castMesh(new THREE.CylinderGeometry(0.055, 0.035, 0.56, 10), MATS.ceramic, knee);
      lower.position.y = -0.28;
      const ankle = new THREE.Group();
      ankle.position.set(0, -0.56, 0);
      knee.add(ankle);
      const aDrum = addServoJoint(ankle, 0.5);
      aDrum.rotation.y = Math.PI / 2;
      const paw = castMesh(new THREE.BoxGeometry(0.12, 0.07, 0.2), MATS.gunmetal, ankle);
      paw.position.set(0, -0.04, 0.05);
      // Non-retractable Sprinter Traction Claws
      for (let c = -1; c <= 1; c++) {
        const cl = castMesh(new THREE.ConeGeometry(0.018, 0.08, 6).rotateX(Math.PI / 2), MATS.orange, ankle);
        cl.position.set(c * 0.035, -0.05, 0.17);
      }

      legs.push({ ...d, legRoot, upper, knee, ankle });
    }

    // 7D. Long Counter-Torque Rudder Tail (8 Tapered Segments)
    const tailSegs = [];
    for (let t = 0; t < 8; t++) {
      const tg = castMesh(
        new THREE.CylinderGeometry(0.048 - t * 0.004, 0.052 - t * 0.004, 0.18, 8).rotateX(Math.PI / 2),
        t >= 6 ? MATS.orange : t % 2 === 0 ? MATS.ceramic : MATS.carbon,
        root
      );
      tailSegs.push(tg);
    }

    return { root, spineSegs, headGroup, legs, tailSegs };
  }

  // =========================================================================
  // 8. HUMAN (Valkyrie HM-22) — 22-DOF Bipedal Bionic Humanoid Android
  //    Anatomical Cranium Visor Head, Ribbed Thorax with Twin Heart Gears,
  //    3-Link Lumbar Spine, 2 × 4-DOF Bionic Arms &Hands, 2 × 4-DOF Heel-Toe Walking Legs
  // =========================================================================
  function buildHumanModel() {
    const root = new THREE.Group();
    root.visible = false;

    // 8A. Pelvis / Iliac Girdle & Hip Differential
    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.set(0, 0.06, 0);
    root.add(pelvisGroup);
    castMesh(new THREE.BoxGeometry(0.38, 0.16, 0.24), MATS.ceramic, pelvisGroup);
    castMesh(new THREE.BoxGeometry(0.4, 0.04, 0.2), MATS.orange, pelvisGroup).position.y = 0.05;
    castMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 10).rotateZ(Math.PI / 2), MATS.gunmetal, pelvisGroup).position.y = -0.03;

    // 8B. 3-Vertebra Articulated Lumbar Spine
    const spineGroup = new THREE.Group();
    spineGroup.position.set(0, 0.1, 0);
    pelvisGroup.add(spineGroup);
    for (let s = 0; s < 3; s++) {
      const v = castMesh(new THREE.CylinderGeometry(0.11, 0.12, 0.065, 10), MATS.gunmetal, spineGroup);
      v.position.y = 0.04 + s * 0.075;
      const ring = castMesh(new THREE.TorusGeometry(0.115, 0.016, 6, 14).rotateX(Math.PI / 2), MATS.orange, spineGroup);
      ring.position.y = 0.04 + s * 0.075;
    }

    // 8C. Anatomical Thoracic Ribcage, Sternum Glass Port & Twin Planetary Heart Gears
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.28, 0);
    spineGroup.add(torsoGroup);

    // Internal dark thoracic core + twin spinning heart gears
    castMesh(new THREE.BoxGeometry(0.36, 0.42, 0.22), MATS.gunmetal, torsoGroup).position.y = 0.18;
    const heartGearL = castMesh(GEO.gearSmall, MATS.orange, torsoGroup);
    heartGearL.position.set(-0.08, 0.22, 0.11);
    const heartGearR = castMesh(GEO.gearSmall, MATS.steel, torsoGroup);
    heartGearR.position.set(0.08, 0.22, 0.11);

    // Smoked-glass central sternum inspection window over heart gears
    const sternumGlass = castMesh(new THREE.BoxGeometry(0.24, 0.26, 0.05), MATS.portGlass, torsoGroup);
    sternumGlass.position.set(0, 0.22, 0.12);

    // Hinged Left & Right Pectoral / Ribcage Armor Shells (6 anatomical ribs per side)
    const chestShells = [];
    for (const side of [-1, 1]) {
      const sh = new THREE.Group();
      sh.position.set(side * 0.16, 0.2, 0);
      torsoGroup.add(sh);
      castMesh(new THREE.BoxGeometry(0.16, 0.38, 0.26), MATS.ceramic, sh);
      castMesh(new THREE.BoxGeometry(0.17, 0.05, 0.27), MATS.orange, sh).position.y = 0.12;
      for (let r = 0; r < 5; r++) {
        const rib = castMesh(new THREE.BoxGeometry(0.18, 0.038, 0.28), MATS.ceramic, sh);
        rib.position.set(side * 0.01, 0.06 - r * 0.055, 0.01);
      }
      // Clavicle collar strut
      const clav = castMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8).rotateZ(Math.PI / 2), MATS.steel, sh);
      clav.position.set(0, 0.2, 0.08);
      chestShells.push({ group: sh, side });
    }

    // Dorsal Scapula Battery Pack
    const dorsalPack = castMesh(new THREE.BoxGeometry(0.32, 0.34, 0.12), MATS.ceramic, torsoGroup);
    dorsalPack.position.set(0, 0.22, -0.15);
    castMesh(new THREE.BoxGeometry(0.24, 0.06, 0.13), MATS.orange, torsoGroup).position.set(0, 0.28, -0.15);

    // 8D. Cervical Neck & Sculpted Bionic Human Cranium with Stereo Visor & Hinged Jaw
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.48, 0.02);
    torsoGroup.add(headGroup);

    castMesh(new THREE.CylinderGeometry(0.075, 0.09, 0.14, 10), MATS.gunmetal, headGroup).position.y = -0.04;
    castMesh(new THREE.TorusGeometry(0.085, 0.016, 6, 14).rotateX(Math.PI / 2), MATS.orange, headGroup).position.y = -0.02;

    // Cranium Dome + Facial Cheekbones
    const cranium = castMesh(new THREE.SphereGeometry(0.17, 14, 12), MATS.ceramic, headGroup);
    cranium.scale.set(0.88, 1.05, 0.98);
    cranium.position.set(0, 0.14, 0);
    // Smoked Glass Bionic Optical Visor across eyes
    const visor = castMesh(new THREE.CylinderGeometry(0.155, 0.155, 0.09, 12, 1, false, -Math.PI * 0.4, Math.PI * 0.8), MATS.portGlass, headGroup);
    visor.position.set(0, 0.15, 0.02);
    for (const sgn of [-1, 1]) {
      const eye = castMesh(GEO.eyeLens, MATS.lensGlass, headGroup);
      eye.scale.setScalar(0.45);
      eye.position.set(sgn * 0.065, 0.15, 0.14);
      const rim = castMesh(GEO.eyeRim, MATS.orange, headGroup);
      rim.scale.setScalar(0.45);
      rim.position.set(sgn * 0.065, 0.15, 0.148);
      // Lateral Ear Servo Hub
      const ear = addServoJoint(headGroup, 0.35);
      ear.rotation.y = Math.PI / 2;
      ear.position.set(sgn * 0.155, 0.14, 0);
    }
    const lowerJaw = new THREE.Group();
    lowerJaw.position.set(0, 0.04, 0.02);
    headGroup.add(lowerJaw);
    castMesh(new THREE.BoxGeometry(0.16, 0.07, 0.16), MATS.ceramic, lowerJaw).position.set(0, 0, 0.05);
    castMesh(new THREE.BoxGeometry(0.12, 0.022, 0.17), MATS.orange, lowerJaw).position.set(0, -0.02, 0.055);

    // 8E. 2 × 4-DOF Bionic Arms (Deltoid Shoulder, Humerus, Elbow Servo, Radius/Ulna Forearm & 5-Finger Hand)
    const arms = [];
    for (const side of [-1, 1]) {
      const id = side < 0 ? 'AL' : 'AR';
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.31, 0.36, 0);
      torsoGroup.add(shoulder);

      const sDrum = addServoJoint(shoulder, 0.68);
      sDrum.rotation.y = Math.PI / 2;
      // Ceramic Deltoid Pauldron
      const pauldron = castMesh(new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), MATS.ceramic, shoulder);
      pauldron.position.set(side * 0.03, 0.02, 0);
      pauldron.rotation.z = -side * 0.45;

      // Upper Arm (Humerus)
      const upperArm = castMesh(new THREE.CylinderGeometry(0.065, 0.055, 0.32, 10), MATS.ceramic, shoulder);
      upperArm.position.y = -0.17;
      castMesh(new THREE.BoxGeometry(0.08, 0.18, 0.03), MATS.orange, shoulder).position.set(side * 0.04, -0.17, 0);

      // Elbow Joint
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.34, 0);
      shoulder.add(elbow);
      const eDrum = addServoJoint(elbow, 0.56);
      eDrum.rotation.y = Math.PI / 2;

      // Forearm (Radius/Ulna)
      const forearm = castMesh(new THREE.CylinderGeometry(0.058, 0.045, 0.3, 10), MATS.ceramic, elbow);
      forearm.position.y = -0.16;
      castMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6), MATS.gunmetal, elbow).position.set(0, -0.16, -0.03);

      // Articulated 5-Finger Bionic Hand
      const hand = new THREE.Group();
      hand.position.set(0, -0.32, 0);
      elbow.add(hand);
      castMesh(new THREE.BoxGeometry(0.045, 0.09, 0.085), MATS.gunmetal, hand).position.y = -0.04;
      castMesh(new THREE.BoxGeometry(0.05, 0.03, 0.09), MATS.orange, hand).position.y = -0.02;
      for (let f = -1.5; f <= 1.5; f += 1) {
        const finger = castMesh(new THREE.BoxGeometry(0.022, 0.075, 0.016), MATS.ceramic, hand);
        finger.position.set(0, -0.1, f * 0.02);
      }

      arms.push({ id, side, shoulder, elbow, hand });
    }

    // 8F. 2 × 4-DOF Bipedal Walking Legs (Hip Drum, Quadriceps Femur, Patella Knee, Tibia Shin & Heel-Toe Foot)
    const legs = [];
    for (const side of [-1, 1]) {
      const id = side < 0 ? 'LL' : 'LR';
      const hip = new THREE.Group();
      hip.position.set(side * 0.15, -0.04, 0);
      pelvisGroup.add(hip);

      const hDrum = addServoJoint(hip, 0.85);
      hDrum.rotation.y = Math.PI / 2;

      // Quadriceps / Femur Thigh (Left thigh has smoked-glass port showing steel femoral actuator!)
      const thigh = castMesh(
        new THREE.BoxGeometry(0.14, 0.4, 0.16),
        side < 0 ? MATS.portGlass : MATS.ceramic,
        hip
      );
      thigh.position.y = -0.21;
      castMesh(new THREE.CylinderGeometry(0.042, 0.042, 0.38, 8), MATS.steel, hip).position.y = -0.21;
      castMesh(new THREE.BoxGeometry(0.15, 0.24, 0.038), MATS.orange, hip).position.set(0, -0.21, 0.068);

      // Patella Knee Joint
      const knee = new THREE.Group();
      knee.position.set(0, -0.42, 0);
      hip.add(knee);
      const kDrum = addServoJoint(knee, 0.72);
      kDrum.rotation.y = Math.PI / 2;
      const kneecap = castMesh(new THREE.BoxGeometry(0.11, 0.1, 0.06), MATS.ceramic, knee);
      kneecap.position.set(0, 0, 0.09);

      // Tibia / Fibula Lower Leg + Achilles Hydraulic Strut
      const shin = castMesh(new THREE.CylinderGeometry(0.068, 0.05, 0.38, 10), MATS.ceramic, knee);
      shin.position.y = -0.2;
      const achilles = castMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.36, 6), MATS.steel, knee);
      achilles.position.set(0, -0.2, -0.055);

      // Articulated Ankle + Heel-to-Toe Bionic Foot
      const ankle = new THREE.Group();
      ankle.position.set(0, -0.4, 0);
      knee.add(ankle);
      const aDrum = addServoJoint(ankle, 0.52);
      aDrum.rotation.y = Math.PI / 2;

      const footArch = castMesh(new THREE.BoxGeometry(0.12, 0.055, 0.24), MATS.ceramic, ankle);
      footArch.position.set(0, -0.04, 0.05);
      const sole = castMesh(new THREE.BoxGeometry(0.125, 0.025, 0.26), MATS.rubber, ankle);
      sole.position.set(0, -0.075, 0.055);
      const toeCap = castMesh(new THREE.BoxGeometry(0.122, 0.035, 0.08), MATS.orange, ankle);
      toeCap.position.set(0, -0.05, 0.15);

      legs.push({ id, side, hip, knee, ankle });
    }

    return { root, pelvisGroup, spineGroup, torsoGroup, heartGearL, heartGearR, chestShells, dorsalPack, headGroup, lowerJaw, arms, legs };
  }

  // =========================================================================
  // 3D STUDIO LOCOMOTION TRACKWAY (SCROLLING TREADMILL + FORWARD CHEVRONS)
  // =========================================================================
  function buildGroundTrackway() {
    const group = new THREE.Group();
    group.position.set(0, -0.84, 0);
    group.visible = false;
    scene.add(group);

    // Left & Right longitudinal studio track rails
    const railGeo = new THREE.BoxGeometry(0.03, 0.015, 3.6);
    for (const sgn of [-1, 1]) {
      const rail = castMesh(railGeo, MATS.gunmetal, group);
      rail.position.x = sgn * 0.95;
      const accentRail = castMesh(new THREE.BoxGeometry(0.015, 0.018, 3.6), MATS.orange, group);
      accentRail.position.x = sgn * 0.98;
    }

    // 14 Scrolling transverse ties + directional forward chevrons
    const ties = [];
    const tieGeo = new THREE.BoxGeometry(1.88, 0.008, 0.025);
    const chevGeo = new THREE.BoxGeometry(0.22, 0.012, 0.035);
    for (let i = 0; i < 14; i++) {
      const tGroup = new THREE.Group();
      group.add(tGroup);
      castMesh(tieGeo, MATS.steel, tGroup);
      // Center forward arrow chevron pointing toward +Z
      const cL = castMesh(chevGeo, MATS.orange, tGroup);
      cL.position.set(-0.07, 0.006, 0.04);
      cL.rotation.y = -0.55;
      const cR = castMesh(chevGeo, MATS.orange, tGroup);
      cR.position.set(0.07, 0.006, 0.04);
      cR.rotation.y = 0.55;
      ties.push(tGroup);
    }
    return { group, ties };
  }
  const GROUND_TRACK = buildGroundTrackway();

  // Instantiate all 8 new models & add to scene
  const FLEET_MODELS = {
    sc8: buildScorpionModel(),
    hb7: buildBeeModel(),
    cn12: buildDogModel(),
    av6: buildBirdModel(),
    ar8: buildSpiderModel(),
    op24: buildSnakeModel(),
    ac14: buildCheetahModel(),
    hm22: buildHumanModel(),
  };
  Object.values(FLEET_MODELS).forEach((m) => scene.add(m.root));

  // -------------------------------------------------------------------------
  // REGISTER ALL 7 NEW UNITS IN UNIT_CONFIG
  // -------------------------------------------------------------------------
  Object.assign(UNIT_CONFIG, {
    sc8: {
      code: 'SC-8',
      eyebrow: 'ROBOTIC SCORPION · ARMOURED GROUND UNIT',
      title: 'Telson SC-8',
      subtitle: 'OCTOPOD WALKER & STRIKE / FIELD SIMULATOR',
      loadTitle: 'DRIVE LOAD',
      loadFoot: ['IDLE', 'CRUISE', 'STRIKE'],
      simId: 'SC8-0730',
      operator: 'BAY 2 · J.M.',
      modelTag: 'MODEL SC-8 · REV B',
      p1Title: 'GAIT',
      p1Unit1: 'HZ',
      p1Sub1: 'STRIDE RATE',
      p1Sub2: 'STRIKE TORQUE',
      p1FootK1: 'PATTERN',
      p3Title: 'LEG SERVOS',
      p3Subtitle: 'LOAD PER LEG · KNEE TORQUE',
      limbs: ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'],
      p4Title: 'CLAW GRIP',
      p4K1: 'GRIP FORCE',
      p4K2: 'TAIL ARC',
      p8Left: 'DEPLOY',
      p8Right: 'RECALL',
      footerLeft: 'FIELD SIMULATOR  ·  PROCEDURAL MODEL  ·  8 LEGS  ·  2 CLAWS  ·  6 TAIL LINKS',
      footerRight: 'TELSON DYNAMICS  ·  DESERT LAB',
      assemblies: [
        { key: 'hero', label: 'HERO' },
        { key: 'optics', label: 'CLAW L' },
        { key: 'mantle', label: 'CARAPACE' },
        { key: 'arm_r2', label: 'LEG L2' },
        { key: 'siphon', label: 'TAIL' },
        { key: 'beak', label: 'STINGER' },
      ],
      displays: [
        { key: 'labels', label: 'LABELS' },
        { key: 'exploded', label: 'EXPLODED' },
        { key: 'xray', label: 'X-RAY' },
        { key: 'thermal', label: 'THERMAL' },
      ],
      subsystems: [
        { idx: '01', key: 'optics', name: 'CLAW DRIVES', spec: '2 CHELAE · 4-GEAR TRAINS', defaultBadge: '52 N LOCK', defaultCls: 'green' },
        { idx: '02', key: 'mantle', name: 'CARAPACE CORE', spec: '7 PLATES · GLASS CANOPY', defaultBadge: 'SEALED', defaultCls: 'green' },
        { idx: '03', key: 'siphon', name: 'TAIL ACTUATORS', spec: '6 LINKS · OVERHEAD ARC', defaultBadge: '140° ARC', defaultCls: 'green' },
        { idx: '04', key: 'arm_r2', name: 'LEG SERVOS', spec: '8 LEGS · TETRAPOD GAIT', defaultBadge: '8 / 8 LIVE', defaultCls: 'green' },
        { idx: '05', key: 'beak', name: 'TELSON STINGER', spec: 'HYPODERMIC BLADE · PUMP', defaultBadge: 'ARMED', defaultCls: 'green' },
        { idx: '06', key: 'mantle_core', name: 'SENSOR HEAD', spec: '2 MEDIAN + 6 LATERAL OPTICS', defaultBadge: 'TRACKING', defaultCls: 'green' },
      ],
      brandSvg: `<path d="M14 26c0-6 4-10 8-10s8 4 8 10M22 16V8l5-3M14 20l-6-4M30 20l6-4"/><circle cx="22" cy="22" r="2.5" fill="#fff"/>`,
    },
    hb7: {
      code: 'HB-7',
      eyebrow: 'ROBOTIC POLLINATOR · MICRO AIR VEHICLE',
      title: 'Mellis HB-7',
      subtitle: 'FLAPPING-WING DRONE / FIELD SIMULATOR',
      loadTitle: 'LIFT LOAD',
      loadFoot: ['IDLE', 'HOVER', 'MAX'],
      simId: 'HB7-0412',
      operator: 'LAB 3 · J.M.',
      modelTag: 'MODEL HB-7 · REV C',
      p1Title: 'WING BEAT',
      p1Unit1: 'HZ',
      p1Sub1: 'STROKE FREQUENCY',
      p1Sub2: 'AMPLITUDE',
      p1FootK1: 'WING DRIVE',
      p3Title: 'LEG SERVOS',
      p3Subtitle: 'LOAD PER LEG · POLLEN GRIP',
      limbs: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'],
      p4Title: 'FLIGHT',
      p4K1: 'ALT AGL',
      p4K2: 'AIRSPEED',
      p8Left: 'TAKE-OFF',
      p8Right: 'LAND',
      footerLeft: 'FIELD SIMULATOR  ·  PROCEDURAL MODEL  ·  6 LEGS  ·  4 WINGS  ·  2 OPTICS',
      footerRight: 'MELLIS ROBOTICS  ·  POLLINATION LAB',
      assemblies: [
        { key: 'hero', label: 'HERO' },
        { key: 'optics', label: 'OPTICS' },
        { key: 'mantle', label: 'THORAX' },
        { key: 'arm_r2', label: 'WING' },
        { key: 'siphon', label: 'ABDOMEN' },
        { key: 'beak', label: 'LEG L2' },
      ],
      displays: [
        { key: 'labels', label: 'LABELS' },
        { key: 'exploded', label: 'EXPLODED' },
        { key: 'xray', label: 'X-RAY' },
        { key: 'thermal', label: 'THERMAL' },
      ],
      subsystems: [
        { idx: '01', key: 'optics', name: 'OPTIC HEAD', spec: '2 × 18 MM LENS · AMBER IR', defaultBadge: 'TRACKING', defaultCls: 'green' },
        { idx: '02', key: 'mantle', name: 'THORAX DRIVE', spec: '3 GEARS · 11 PIEZO ACTUATORS', defaultBadge: '230 HZ', defaultCls: 'green' },
        { idx: '03', key: 'arm_r2', name: 'WING ROOTS', spec: '4 HINGES · VENATION SPARS', defaultBadge: 'ACTIVE', defaultCls: 'green' },
        { idx: '04', key: 'siphon', name: 'ABDOMEN CAPSULE', spec: '5 GEARS · GLASS BARREL', defaultBadge: 'SEALED', defaultCls: 'green' },
        { idx: '05', key: 'beak', name: 'LEG SERVOS', spec: '6 LEGS · 3 JOINTS', defaultBadge: 'HOLDING', defaultCls: 'green' },
        { idx: '06', key: 'mantle_core', name: 'NECK BEARING', spec: '10-SEGMENT COLLAR', defaultBadge: 'LOCKED', defaultCls: 'green' },
      ],
      brandSvg: `<ellipse cx="22" cy="24" rx="5" ry="9"/><path d="M17 19L8 12c-2 4 1 9 9 9M27 19l9-7c2 4-1 9-9 9"/><circle cx="22" cy="12" r="2.5" fill="#fff"/>`,
    },
    cn12: {
      code: 'CN-12',
      eyebrow: 'ROBOTIC CANINE · 12-DOF AGILE QUADRUPED',
      title: 'Canis CN-12',
      subtitle: 'DIGITIGRADE LUPINE RUNNER / FIELD SIMULATOR',
      loadTitle: 'TORQUE LOAD',
      loadFoot: ['STANCE', 'TROT', 'GALLOP'],
      simId: 'CN12-0804',
      operator: 'TRACK 1 · J.M.',
      modelTag: 'MODEL CN-12 · REV A',
      p1Title: 'GAIT',
      p1Unit1: 'HZ',
      p1Sub1: 'CADENCE',
      p1Sub2: 'PEAK TORQUE',
      p1FootK1: 'GAIT',
      p3Title: 'LIMB TORQUE',
      p3Subtitle: '4 DIGITIGRADE LEGS · 3-DOF',
      limbs: ['FL', 'FR', 'HL', 'HR'],
      p4Title: 'ATTITUDE',
      p4K1: 'HIP HEIGHT',
      p4K2: 'VELOCITY',
      p8Left: 'PATROL',
      p8Right: 'DOCK',
      footerLeft: 'FIELD SIMULATOR  ·  PROCEDURAL MODEL  ·  4 LEGS  ·  12 SERVOS  ·  LUPINE HEAD',
      footerRight: 'CANIS DYNAMICS  ·  QUADRUPED LAB',
      assemblies: [
        { key: 'hero', label: 'HERO' },
        { key: 'optics', label: 'HEAD/JAW' },
        { key: 'mantle', label: 'RIBCAGE' },
        { key: 'arm_r2', label: 'LEG FL' },
        { key: 'siphon', label: 'TAIL' },
        { key: 'beak', label: 'PELVIS' },
      ],
      displays: [
        { key: 'labels', label: 'LABELS' },
        { key: 'exploded', label: 'EXPLODED' },
        { key: 'xray', label: 'X-RAY' },
        { key: 'thermal', label: 'THERMAL' },
      ],
      subsystems: [
        { idx: '01', key: 'optics', name: 'LUPINE HEAD', spec: 'STEREO LIDAR · HINGED JAW', defaultBadge: 'TRACKING', defaultCls: 'green' },
        { idx: '02', key: 'mantle', name: 'THORACIC CAGE', spec: '10 RIBS · GLASS SIDE PORT', defaultBadge: 'SEALED', defaultCls: 'green' },
        { idx: '03', key: 'arm_r2', name: 'DIGITIGRADE LEGS', spec: '4 × 3-DOF BRUSHLESS DRUMS', defaultBadge: '4 / 4 LIVE', defaultCls: 'green' },
        { idx: '04', key: 'beak', name: 'PELVIC DRIVE', spec: 'REAR DIFFERENTIAL · IMU', defaultBadge: 'NOMINAL', defaultCls: 'green' },
        { idx: '05', key: 'siphon', name: 'BALANCE TAIL', spec: '5-LINK COUNTER-TORQUE', defaultBadge: 'ACTIVE', defaultCls: 'green' },
        { idx: '06', key: 'mantle_core', name: 'POWER PACK', spec: '96 V SOLID-STATE LIPO', defaultBadge: 'RUNNING', defaultCls: 'green' },
      ],
      brandSvg: `<path d="M12 26l4-10 4 3 6-3 4-5 2 6-4 5v9M16 26v7M26 26v7"/><circle cx="29" cy="14" r="1.5" fill="#fff"/>`,
    },
    av6: {
      code: 'AV-6',
      eyebrow: 'ROBOTIC RAPTOR · BIOMIMETIC AERIAL INTERCEPTOR',
      title: 'Falco AV-6',
      subtitle: 'ARTICULATED FEATHER-WING DRONE / FIELD SIMULATOR',
      loadTitle: 'WING LOAD',
      loadFoot: ['GLIDE', 'FLAP', 'STOOP'],
      simId: 'AV6-0319',
      operator: 'AERO 2 · J.M.',
      modelTag: 'MODEL AV-6 · REV D',
      p1Title: 'FLIGHT',
      p1Unit1: 'HZ',
      p1Sub1: 'FLAP CADENCE',
      p1Sub2: 'LIFT FORCE',
      p1FootK1: 'PROFILE',
      p3Title: 'FEATHER & TALON',
      p3Subtitle: 'WING SPARS · TALON GRIP',
      limbs: ['WL-1', 'WL-2', 'WR-1', 'WR-2', 'TL-L', 'TL-R'],
      p4Title: 'AIR DATA',
      p4K1: 'ALTITUDE',
      p4K2: 'GLIDE RATIO',
      p8Left: 'LAUNCH',
      p8Right: 'PERCH',
      footerLeft: 'FIELD SIMULATOR  ·  PROCEDURAL MODEL  ·  20 FEATHERS  ·  2 TALONS  ·  7 RECTRICES',
      footerRight: 'FALCO AEROSPACE  ·  AVIAN LAB',
      assemblies: [
        { key: 'hero', label: 'HERO' },
        { key: 'optics', label: 'RAPTOR HEAD' },
        { key: 'mantle', label: 'STERNUM' },
        { key: 'arm_r2', label: 'WING L' },
        { key: 'siphon', label: 'TAIL FAN' },
        { key: 'beak', label: 'TALONS' },
      ],
      displays: [
        { key: 'labels', label: 'LABELS' },
        { key: 'exploded', label: 'EXPLODED' },
        { key: 'xray', label: 'X-RAY' },
        { key: 'thermal', label: 'THERMAL' },
      ],
      subsystems: [
        { idx: '01', key: 'optics', name: 'RAPTOR OPTICS', spec: 'FOVEAL ZOOM · HOOKED BEAK', defaultBadge: 'LOCKED', defaultCls: 'green' },
        { idx: '02', key: 'mantle', name: 'KEELED STERNUM', spec: 'DUAL BEVEL FLAP DRIVE', defaultBadge: 'SEALED', defaultCls: 'green' },
        { idx: '03', key: 'arm_r2', name: 'FEATHER WINGS', spec: '2 × 10 ARTICULATED BLADES', defaultBadge: 'SPANNING', defaultCls: 'green' },
        { idx: '04', key: 'siphon', name: 'TAIL RECTRICES', spec: '7-FEATHER VECTOR FAN', defaultBadge: 'TRIMMED', defaultCls: 'green' },
        { idx: '05', key: 'beak', name: 'RAPTOR TALONS', spec: '2 × 4 RATCHET CLAWS', defaultBadge: 'ARMED', defaultCls: 'green' },
        { idx: '06', key: 'mantle_core', name: 'AVIONICS CORE', spec: 'PITOT-STATIC · 9-DOF IMU', defaultBadge: 'NOMINAL', defaultCls: 'green' },
      ],
      brandSvg: `<path d="M6 16l16 6 16-6-10 10-6 8-6-8z"/><circle cx="22" cy="20" r="2" fill="#fff"/>`,
    },
    ar8: {
      code: 'AR-8',
      eyebrow: 'ROBOTIC ARACHNID · HYDRAULIC OCTOPOD CRAWLER',
      title: 'Arachne AR-8',
      subtitle: 'HIGH-ARCHING TERRAIN CRAWLER / FIELD SIMULATOR',
      loadTitle: 'HYDRO LOAD',
      loadFoot: ['STALK', 'CREEP', 'POUNCE'],
      simId: 'AR8-0915',
      operator: 'VAULT 5 · J.M.',
      modelTag: 'MODEL AR-8 · REV B',
      p1Title: 'PRESSURE',
      p1Unit1: 'KPA',
      p1Sub1: 'PROSOMA MANIFOLD',
      p1Sub2: 'SILK TENSION',
      p1FootK1: 'GAIT',
      p3Title: 'LEG EXTENSION',
      p3Subtitle: '8 HYDRAULIC ARCH LEGS',
      limbs: ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'],
      p4Title: 'TENSION',
      p4K1: 'CLEARANCE',
      p4K2: 'TETHER LOAD',
      p8Left: 'DESCEND',
      p8Right: 'ANCHOR',
      footerLeft: 'FIELD SIMULATOR  ·  PROCEDURAL MODEL  ·  8 LEGS  ·  8 EYES  ·  6 SPINNERETS',
      footerRight: 'ARACHNE ROBOTICS  ·  SUBTERRANEAN LAB',
      assemblies: [
        { key: 'hero', label: 'HERO' },
        { key: 'optics', label: '8-EYE / FANGS' },
        { key: 'mantle', label: 'PROSOMA' },
        { key: 'arm_r2', label: 'LEG L2' },
        { key: 'siphon', label: 'ABDOMEN' },
        { key: 'beak', label: 'SPINNERETS' },
      ],
      displays: [
        { key: 'labels', label: 'LABELS' },
        { key: 'exploded', label: 'EXPLODED' },
        { key: 'xray', label: 'X-RAY' },
        { key: 'thermal', label: 'THERMAL' },
      ],
      subsystems: [
        { idx: '01', key: 'optics', name: 'OCULAR & FANGS', spec: '8 EYES · TWIN CHELICERAE', defaultBadge: 'TRACKING', defaultCls: 'green' },
        { idx: '02', key: 'mantle', name: 'PROSOMA DOME', spec: '8-PORT RADIAL MANIFOLD', defaultBadge: 'SEALED', defaultCls: 'green' },
        { idx: '03', key: 'arm_r2', name: 'ARCH LEG CHAINS', spec: '8 LEGS · GLASS FEMUR PORT', defaultBadge: '8 / 8 LIVE', defaultCls: 'green' },
        { idx: '04', key: 'siphon', name: 'OPISTHOSOMA', spec: 'SILK SPOOL · GLASS DOME', defaultBadge: 'SEALED', defaultCls: 'green' },
        { idx: '05', key: 'beak', name: 'SPINNERET ARRAY', spec: '6 NOZZLES · ARAMID CABLE', defaultBadge: 'READY', defaultCls: 'green' },
        { idx: '06', key: 'mantle_core', name: 'PEDICEL WAIST', spec: 'HYDRAULIC COUPLER RING', defaultBadge: 'LOCKED', defaultCls: 'green' },
      ],
      brandSvg: `<circle cx="22" cy="18" r="4"/><ellipse cx="22" cy="28" rx="6" ry="7"/><path d="M18 16L8 10M18 18L6 18M18 20L8 28M26 16l10-6M26 18l12 0M26 20l10 8"/>`,
    },
    op24: {
      code: 'OP-24',
      eyebrow: 'ROBOTIC SERPENT · 24-JOINT HYPER-REDUNDANT VIPER',
      title: 'Ophidia OP-24',
      subtitle: 'SIDEWINDER CONFINED-SPACE PROBE / FIELD SIMULATOR',
      loadTitle: 'WAVE LOAD',
      loadFoot: ['COIL', 'SLITHER', 'STRIKE'],
      simId: 'OP24-0602',
      operator: 'PIPE 3 · J.M.',
      modelTag: 'MODEL OP-24 · REV C',
      p1Title: 'WAVE',
      p1Unit1: 'HZ',
      p1Sub1: 'UNDULATION FREQ',
      p1Sub2: 'LATERAL THRUST',
      p1FootK1: 'LOCOMOTION',
      p3Title: 'VERTEBRAL CURL',
      p3Subtitle: 'CARDAN SEGMENTS · RIB SCUTES',
      limbs: ['S1-3', 'S4-6', 'S7-9', 'S10-12', 'S13-15', 'S16-18', 'S19-22'],
      p4Title: 'THERMAL PIT',
      p4K1: 'STRIKE REACH',
      p4K2: 'RATTLE FREQ',
      p8Left: 'SLITHER',
      p8Right: 'COIL',
      footerLeft: 'FIELD SIMULATOR  ·  PROCEDURAL MODEL  ·  22 VERTEBRAE  ·  44 RIBS  ·  2 FANGS',
      footerRight: 'OPHIDIA BIO-MECHATRONICS  ·  SERPENT LAB',
      assemblies: [
        { key: 'hero', label: 'HERO' },
        { key: 'optics', label: 'VIPER JAW' },
        { key: 'mantle', label: 'DORSAL SCUTES' },
        { key: 'arm_r2', label: 'RIB CAGE' },
        { key: 'siphon', label: 'RATTLE' },
        { key: 'beak', label: 'BELLY SCALES' },
      ],
      displays: [
        { key: 'labels', label: 'LABELS' },
        { key: 'exploded', label: 'EXPLODED' },
        { key: 'xray', label: 'X-RAY' },
        { key: 'thermal', label: 'THERMAL' },
      ],
      subsystems: [
        { idx: '01', key: 'optics', name: 'VIPER STRIKE HEAD', spec: '160° JAW · FOLDING FANGS', defaultBadge: 'ARMED', defaultCls: 'green' },
        { idx: '02', key: 'mantle', name: 'DORSAL SCUTES', spec: '22 CERAMIC & GLASS PLATES', defaultBadge: 'SEALED', defaultCls: 'green' },
        { idx: '03', key: 'arm_r2', name: 'LATERAL RIBS', spec: '44 CURVED TITANIUM RIBS', defaultBadge: '22 / 22 LIVE', defaultCls: 'green' },
        { idx: '04', key: 'beak', name: 'VENTRAL SCALES', spec: 'LINEAR TRACTOR TREADS', defaultBadge: 'GRIPPING', defaultCls: 'green' },
        { idx: '05', key: 'siphon', name: 'ACOUSTIC RATTLE', spec: '6 RESONATOR RINGS · 85 HZ', defaultBadge: 'IDLE', defaultCls: 'neutral' },
        { idx: '06', key: 'mantle_core', name: 'TENDON SPINE', spec: '24 CARDAN BALL GIMBALS', defaultBadge: 'NOMINAL', defaultCls: 'green' },
      ],
      brandSvg: `<path d="M10 32c0-6 12-6 12-12s-12-6-12-12c0-3 4-4 8-2l6 4"/><circle cx="20" cy="9" r="1.5" fill="#fff"/>`,
    },
    ac14: {
      code: 'AC-14',
      eyebrow: 'ROBOTIC FELID · HIGH-VELOCITY SPRINT QUADRUPED',
      title: 'Acinonyx AC-14',
      subtitle: 'FLEX-SPINE ROTARY GALLOP SPRINTER / FIELD SIMULATOR',
      loadTitle: 'SPRINT LOAD',
      loadFoot: ['STALK', 'PACE', '110 KM/H'],
      simId: 'AC14-1108',
      operator: 'SAVANNA 1 · J.M.',
      modelTag: 'MODEL AC-14 · REV B',
      p1Title: 'STRIDE',
      p1Unit1: 'HZ',
      p1Sub1: 'GALLOP FREQUENCY',
      p1Sub2: 'SPINE FLEXION',
      p1FootK1: 'PHASE',
      p3Title: 'SPRINTER LIMBS',
      p3Subtitle: '4 FELID LEGS · CLEAT CLAWS',
      limbs: ['FL', 'FR', 'HL', 'HR', 'SPINE', 'TAIL'],
      p4Title: 'TELEMETRY',
      p4K1: 'GROUND SPEED',
      p4K2: 'TAIL TORQUE',
      p8Left: 'SPRINT',
      p8Right: 'BRAKE',
      footerLeft: 'FIELD SIMULATOR  ·  PROCEDURAL MODEL  ·  6-LINK SPINE  ·  4 LEGS  ·  8-LINK TAIL',
      footerRight: 'ACINONYX PROPULSION  ·  HIGH-SPEED LAB',
      assemblies: [
        { key: 'hero', label: 'HERO' },
        { key: 'optics', label: 'FELID HEAD' },
        { key: 'mantle', label: 'FLEX SPINE' },
        { key: 'arm_r2', label: 'LEG FL' },
        { key: 'siphon', label: 'RUDDER TAIL' },
        { key: 'beak', label: 'CHEST KEEL' },
      ],
      displays: [
        { key: 'labels', label: 'LABELS' },
        { key: 'exploded', label: 'EXPLODED' },
        { key: 'xray', label: 'X-RAY' },
        { key: 'thermal', label: 'THERMAL' },
      ],
      subsystems: [
        { idx: '01', key: 'optics', name: 'FELID SKULL', spec: 'MALAR BAFFLES · GIMBAL OPTIC', defaultBadge: 'LOCKED', defaultCls: 'green' },
        { idx: '02', key: 'mantle', name: 'ARTICULATED SPINE', spec: '6 VERTEBRAE · LEAF SPRING', defaultBadge: 'FLEXING', defaultCls: 'green' },
        { idx: '03', key: 'arm_r2', name: 'SPRINTER LEGS', spec: '4 LEGS · TRACTION CLEATS', defaultBadge: '4 / 4 LIVE', defaultCls: 'green' },
        { idx: '04', key: 'siphon', name: 'RUDDER TAIL', spec: '8 COUNTER-TORQUE LINKS', defaultBadge: 'ACTIVE', defaultCls: 'green' },
        { idx: '05', key: 'beak', name: 'THORACIC KEEL', spec: 'TURBO COOLING MANIFOLD', defaultBadge: 'RUNNING', defaultCls: 'green' },
        { idx: '06', key: 'mantle_core', name: 'CAPACITOR BANK', spec: '800 V BURST BUS', defaultBadge: 'CHARGED', defaultCls: 'green' },
      ],
      brandSvg: `<path d="M8 26l6-8 10-2 8-6 4 3-5 6-3 9M14 26l-3 7M28 25l3 8"/><circle cx="32" cy="12" r="1.5" fill="#fff"/>`,
    },
    hm22: {
      code: 'HM-22',
      eyebrow: 'BIPEDAL HUMANOID ANDROID · 22-DOF BIONIC WALKER',
      title: 'Valkyrie HM-22',
      subtitle: 'ANTHROPOMORPHIC BIPEDAL RUNNER / FIELD SIMULATOR',
      loadTitle: 'BIPED LOAD',
      loadFoot: ['STANCE', 'WALK', 'SPRINT'],
      simId: 'HM22-0101',
      operator: 'BAY 1 · J.M.',
      modelTag: 'MODEL HM-22 · REV A',
      p1Title: 'STRIDE',
      p1Unit1: 'HZ',
      p1Sub1: 'CADENCE',
      p1Sub2: 'GROUND REACTION',
      p1FootK1: 'GAIT',
      p3Title: 'BIONIC LIMBS',
      p3Subtitle: '2 ARMS · 2 LEGS · SPINE',
      limbs: ['LL', 'LR', 'AL', 'AR', 'SPINE', 'CORE'],
      p4Title: 'BALANCE IMU',
      p4K1: 'COM HEIGHT',
      p4K2: 'FORWARD VEL',
      p8Left: 'WALK',
      p8Right: 'HALT',
      footerLeft: 'FIELD SIMULATOR  ·  PROCEDURAL MODEL  ·  22 DOF  ·  2 LEGS  ·  2 ARMS  ·  TWIN HEART GEARS',
      footerRight: 'VALKYRIE BIONICS  ·  HUMANOID LAB',
      assemblies: [
        { key: 'hero', label: 'HERO' },
        { key: 'optics', label: 'VISOR HEAD' },
        { key: 'mantle', label: 'RIBCAGE' },
        { key: 'arm_r2', label: 'ARM / LEG L' },
        { key: 'siphon', label: 'SPINE' },
        { key: 'beak', label: 'PELVIS' },
      ],
      displays: [
        { key: 'labels', label: 'LABELS' },
        { key: 'exploded', label: 'EXPLODED' },
        { key: 'xray', label: 'X-RAY' },
        { key: 'thermal', label: 'THERMAL' },
      ],
      subsystems: [
        { idx: '01', key: 'optics', name: 'CRANIUM VISOR', spec: 'STEREO OPTIC · HINGED JAW', defaultBadge: 'TRACKING', defaultCls: 'green' },
        { idx: '02', key: 'mantle', name: 'THORACIC CAGE', spec: '12 RIBS · TWIN HEART GEARS', defaultBadge: 'SEALED', defaultCls: 'green' },
        { idx: '03', key: 'arm_r2', name: 'BIPEDAL LEGS', spec: '2 × 4-DOF HEEL-TOE STRIDE', defaultBadge: 'WALKING', defaultCls: 'green' },
        { idx: '04', key: 'siphon', name: 'BIONIC ARMS', spec: '2 × 4-DOF COUNTER-SWING', defaultBadge: 'ACTIVE', defaultCls: 'green' },
        { idx: '05', key: 'beak', name: 'LUMBAR & PELVIS', spec: '3-LINK COUNTER-ROTATION', defaultBadge: 'LOCKED', defaultCls: 'green' },
        { idx: '06', key: 'mantle_core', name: 'DORSAL POWER', spec: '120 V SOLID-STATE PACK', defaultBadge: 'RUNNING', defaultCls: 'green' },
      ],
      brandSvg: `<circle cx="22" cy="11" r="3.5"/><path d="M22 15v10M15 18l7-2 7 2M22 25l-5 9M22 25l5 9"/>`,
    },
  });

  // Smooth step helper for choreography
  const smoother = (x) => {
    const u = clamp(x, 0, 1);
    return u * u * u * (u * (u * 6 - 15) + 10);
  };
  const ss = (a, b, t) => smoother((t - a) / Math.max(1e-5, b - a));

  // Computes physical forward world progression along the creature's facing vector
  function computeForwardTravel(t, speed = 0.42, span = 1.35, wExp = 0) {
    const cyc = (t * speed) % 1.0;
    let d;
    if (cyc < 0.88) {
      d = -span * 0.5 + (cyc / 0.88) * span;
    } else {
      const k = smoother((cyc - 0.88) / 0.12);
      d = span * 0.5 - k * span;
    }
    return d * (1 - wExp * 0.75);
  }

  // Updates the 3D scrolling floor trackway underneath any walking unit
  function updateGroundTrack(t, yaw, speed = 1.35, visible = true, yPos = -0.84) {
    GROUND_TRACK.group.visible = visible;
    if (!visible) return;
    GROUND_TRACK.group.position.y = yPos;
    GROUND_TRACK.group.rotation.y = yaw;
    const spacing = 0.26;
    const totalLen = GROUND_TRACK.ties.length * spacing;
    const scroll = (t * speed) % spacing;
    GROUND_TRACK.ties.forEach((tie, i) => {
      const z = 1.7 - i * spacing - scroll;
      tie.position.set(0, 0, z < -1.85 ? z + totalLen : z);
    });
  }

  // -------------------------------------------------------------------------
  // POSE & KINEMATICS ENGINE FOR ALL 8 BIOMIMETIC CREATURES + HUMANOID
  // -------------------------------------------------------------------------
  function updateFleetUnitPose(unitKey, t, dt) {
    const wOpt = STATE.wOptics;
    const wMan = STATE.wMantle;
    const wArm = STATE.wArmR2;
    const wSip = STATE.wSiphon;
    const wBk = STATE.wBeak;
    const wExp = STATE.wExploded;
    const speedBoost = STATE.gaitPreset === 'sprint' ? 1.45 : STATE.gaitPreset === 'cruise' ? 1.15 : 1.0;
    const flexAmt = Math.max(0.65, (STATE.poseFlex ?? 0.5) * 2.0); // Always keep vibrant motion
    const hasFault = STATE.faultKey;

    // -----------------------------------------------------------------------
    // 1. SCORPION (Telson SC-8) — Walks forward + Tail rises up & strikes!
    // -----------------------------------------------------------------------
    if (unitKey === 'sc8') {
      const m = FLEET_MODELS.sc8;
      const yaw = -0.45;
      m.root.scale.setScalar(0.88);
      m.root.rotation.y = yaw;

      const walkFreq = 6.2 * speedBoost;
      const fwdDist = computeForwardTravel(t, 0.38 * speedBoost, 1.35, wExp);
      const stepSurge = Math.sin(t * walkFreq * 2) * 0.035;
      const dTotal = fwdDist + stepSurge;
      const bodyBob = Math.abs(Math.sin(t * walkFreq)) * 0.045 * (1 - wExp * 0.5);

      m.root.position.set(
        Math.sin(yaw) * dTotal,
        -0.16 + bodyBob,
        Math.cos(yaw) * dTotal
      );
      m.root.rotation.z = Math.cos(t * walkFreq) * 0.045;
      updateGroundTrack(t, yaw, 1.35 * speedBoost, true, -0.84);

      // Carapace plates open upward on Mantle/Carapace or Exploded
      const cOpen = Math.max(wMan, wExp);
      m.carapacePlates.forEach((p) => {
        p.pivot.position.y = 0.18 + cOpen * 0.34;
        p.pivot.position.z = p.baseZ + (3 - p.idx) * wExp * 0.12;
        p.pivot.rotation.z = (p.idx % 2 === 0 ? 1 : -1) * cOpen * 0.15;
      });
      m.ventralDeck.position.y = -0.04 - wExp * 0.32;
      m.sensorHead.position.set(0, 0.14 + wExp * 0.2, 0.92 + Math.max(wOpt * 0.25, wExp * 0.45));

      // Twin Pincer Claws sweeping forward/back & snapping jaws while walking
      const clawSep = Math.max(wOpt, wExp);
      m.claws.forEach((c) => {
        const isLeft = c.side < 0;
        const sep = isLeft ? clawSep : wExp;
        const reachWave = Math.sin(t * 3.8 + (isLeft ? 0 : Math.PI)) * 0.22 * flexAmt;
        c.clawRoot.position.set(c.basePos.x + c.side * sep * 0.35, c.basePos.y, c.basePos.z + sep * 0.38);
        c.clawRoot.rotation.y = reachWave;
        c.clawRoot.rotation.x = Math.cos(t * 3.8 + (isLeft ? 0 : Math.PI)) * 0.12;
        c.glassDome.position.y = 0.1 + sep * 0.28;
        c.movableJaw.rotation.y = -c.side * (0.28 + Math.max(0, Math.sin(t * 5.2 + c.side)) * 0.42 * flexAmt + sep * 0.35);
        c.clawGears.forEach((g, idx) => {
          g.rotation.z = t * (idx % 2 === 0 ? 4.8 : -4.8);
          g.position.y = 0.08 + sep * 0.14;
        });
      });

      // DRAMATIC SCORPION TAIL ANIMATION:
      // Starts low trailing behind -> Rises up high over the carapace -> Coils & Whips forward in a double strike!
      const tailSep = Math.max(wSip, wExp);
      const stingerSep = Math.max(wBk, wExp);
      const tailCyc = (t * 0.24) % 1.0; // 4.16-second full tail raise & strike cycle
      // tailLift: 0 = stretched low behind body, 1 = raised high over the back
      let tailLift = ss(0.12, 0.48, tailCyc) * (1 - ss(0.80, 0.96, tailCyc));
      if (STATE.gaitPreset === 'strike') tailLift = 1.0;

      // Double predatory venom strike whip when tail is raised overhead (0.50..0.78)
      const inStrikeWindow = (tailCyc >= 0.50 && tailCyc <= 0.78) || STATE.gaitPreset === 'strike';
      const strikeWhip = inStrikeWindow
        ? Math.max(0, Math.sin((tailCyc - 0.50) * Math.PI * 6.8)) * 0.42 * flexAmt
        : 0;

      // Base of tail lifts from low trailing (-1.18 rad) up to overhead (-0.08 rad) + forward strike lunge (+0.32 rad)
      m.tailBase.rotation.x = lerp(-1.18, -0.08, tailLift) + strikeWhip * 0.65;
      m.tailBase.rotation.y = Math.sin(t * 2.1) * 0.08;

      m.tailLinks.forEach((tl, idx) => {
        // Each segment curls from nearly flat (0.06 rad) up into a tight overhead arch (0.48 rad) as the tail comes up
        const segCurl = lerp(0.06, 0.48, tailLift) + (idx >= 3 ? strikeWhip * 0.22 : 0);
        tl.segGroup.rotation.x = segCurl + tailSep * 0.08;
        tl.segGroup.position.y = idx === 0 ? 0 : 0.36 + tailSep * 0.14;
      });
      m.stingerGroup.rotation.x = lerp(0.15, 0.62, tailLift) + strikeWhip * 0.95 + stingerSep * 0.4;
      m.stingerGroup.position.y = 0.36 + stingerSep * 0.28;

      // 8 Arachnid Legs — Full-Amplitude Tetrapod Walking Stride
      const loads = {};
      m.legs.forEach((leg) => {
        const isL2 = leg.id === 'L2';
        const isJammed = hasFault && leg.id === 'R2';
        const det = isL2 ? Math.max(wArm, wExp) : wExp;
        const phase = t * walkFreq + leg.idx * 1.57 + (leg.side > 0 ? Math.PI : 0);
        // Positive swing moves leg forward (+Z) during lift (cos(phase) > 0)
        const swing = isJammed ? 0 : -leg.side * Math.sin(phase) * 0.46 * flexAmt;
        const lift = isJammed ? 0.38 : Math.max(0, Math.cos(phase)) * 0.44 * flexAmt;
        const kneeExt = isJammed ? 0 : Math.sin(phase) * 0.52 * flexAmt;

        leg.legRoot.position.set(leg.mountPos.x + leg.side * det * 0.45, leg.mountPos.y, leg.mountPos.z);
        leg.legRoot.rotation.y = -leg.side * (0.48 - leg.idx * 0.32) + swing;
        leg.femur.rotation.z = leg.side * lift;
        leg.tibia.rotation.z = -leg.side * lift * 0.75 + leg.side * kneeExt * 0.35;
        leg.knee.position.x = leg.side * (0.52 + det * 0.28);
        loads[leg.id] = isJammed ? 99 : Math.round(clamp(46 + Math.abs(swing) * 95 + lift * 40, 34, 96));
      });
      return loads;
    }

    // -----------------------------------------------------------------------
    // 2. BEE (Mellis HB-7) — Dynamic 3D Hover & Forward Dart Flight + 4-Wing Stroke
    // -----------------------------------------------------------------------
    if (unitKey === 'hb7') {
      GROUND_TRACK.group.visible = false;
      const m = FLEET_MODELS.hb7;
      m.root.scale.setScalar(0.92);
      const flightX = Math.sin(t * 1.8) * 0.38 * (1 - wExp * 0.6);
      const flightY = 0.12 + Math.sin(t * 3.6) * 0.16 * (1 - wExp * 0.6);
      const flightZ = Math.cos(t * 1.8) * 0.42 * (1 - wExp * 0.6);
      m.root.position.set(flightX, flightY, flightZ);
      m.root.rotation.y = -0.52 + Math.cos(t * 1.8) * 0.28;
      m.root.rotation.x = -0.16 + Math.sin(t * 3.6) * 0.14;
      m.root.rotation.z = -Math.cos(t * 1.8) * 0.18;

      const thOpen = Math.max(wMan, wExp);
      m.thoraxGears.forEach((g, idx) => {
        g.rotation.z = t * (idx % 2 === 0 ? 7.5 : -7.5);
        g.position.y = 0.12 + thOpen * 0.25;
      });
      m.thoraxShells.forEach((s) => {
        s.group.position.x = s.side * (0.32 + thOpen * 0.38);
        s.group.position.y = 0.26 + thOpen * 0.18;
        s.group.rotation.z = -s.side * thOpen * 0.45;
      });

      const hSep = Math.max(wOpt, wExp);
      m.headGroup.position.set(0, 0.14 + hSep * 0.1, 0.72 + hSep * 0.42);
      m.headGroup.rotation.y = Math.sin(t * 4.2) * 0.18;

      // Abdomen Capsule: active respiratory telescoping pumping + fast spinning gears
      const abdSep = Math.max(wSip, wExp);
      const abdPump = (Math.sin(t * 5.5) * 0.5 + 0.5) * 0.06;
      m.abdomenGroup.position.set(0, 0.04 - wExp * 0.15, -0.58 - wExp * 0.38);
      m.abdomenGroup.rotation.x = Math.sin(t * 3.6) * 0.14;
      m.abdInternalGears.forEach((g, idx) => {
        g.rotation.z = t * (idx % 2 === 0 ? 6.0 : -6.0);
      });
      m.abdRings.forEach((r) => {
        r.group.position.z = r.baseZ - r.idx * (abdSep * 0.24 + abdPump);
      });
      m.beeStinger.position.z = -0.78 - abdSep * 0.85 - abdPump * 5.0;

      // 4 Wings: Broad Figure-8 Flapping Stroke
      const wSep = Math.max(wArm, wExp);
      m.wings.forEach((w) => {
        const flap = Math.sin(t * 28.0 + (w.isFore ? 0 : 0.65)) * (0.78 + 0.25 * flexAmt);
        w.wingPivot.position.x = w.side * (0.32 + wSep * 0.36);
        w.wingPivot.position.y = 0.38 + wSep * 0.22;
        w.wingPivot.rotation.z = w.side * (0.32 + flap);
        w.wingPivot.rotation.x = 0.18 + Math.cos(t * 28.0) * 0.32;
      });

      // 6 Pollinator Legs: Active Aerial Cycling / Reach
      const legSep = Math.max(wBk, wExp);
      const loads = {};
      m.legs.forEach((l) => {
        const isL2 = l.id === 'L2';
        const d = isL2 ? legSep : wExp;
        const lWave = Math.sin(t * 5.2 + l.idx * 1.2 + (l.side > 0 ? Math.PI : 0));
        l.legRoot.position.set(l.mountPos.x + l.side * d * 0.38, l.mountPos.y - d * 0.18, l.mountPos.z);
        l.legRoot.rotation.x = lWave * 0.35 * flexAmt;
        l.knee.rotation.z = l.side * (0.25 + lWave * 0.42 * flexAmt);
        loads[l.id] = Math.round(clamp(52 + l.idx * 6 + Math.abs(lWave) * 28, 38, 94));
      });
      return loads;
    }

    // -----------------------------------------------------------------------
    // 3. DOG (Canis CN-12) — Walks/Trots Forward Across Stage with 3-Joint Stride
    // -----------------------------------------------------------------------
    if (unitKey === 'cn12') {
      const m = FLEET_MODELS.cn12;
      const yaw = -0.54;
      m.root.scale.setScalar(0.95);
      m.root.rotation.y = yaw;

      const trotFreq = 6.2 * speedBoost;
      const fwdDist = computeForwardTravel(t, 0.44 * speedBoost, 1.4, wExp);
      const bounce = Math.abs(Math.sin(t * trotFreq)) * 0.075 * (1 - wExp * 0.5);
      const pitchRock = Math.cos(t * trotFreq) * 0.055 * (1 - wExp * 0.5);

      m.root.position.set(
        Math.sin(yaw) * fwdDist,
        -0.05 + bounce,
        Math.cos(yaw) * fwdDist
      );
      m.root.rotation.x = pitchRock;
      updateGroundTrack(t, yaw, 1.45 * speedBoost, true, -0.82);

      m.dogGear.rotation.z = t * 5.5;
      const ribOpen = Math.max(wMan, wExp);
      m.chestShells.forEach((s) => {
        s.group.position.x = s.side * (0.24 + ribOpen * 0.42);
        s.group.position.y = 0.24 + ribOpen * 0.18;
        s.group.rotation.z = -s.side * ribOpen * 0.38;
      });
      m.pelvis.position.z = -0.58 - Math.max(wBk, wExp) * 0.42;

      const headSep = Math.max(wOpt, wExp);
      const headBob = Math.sin(t * trotFreq * 2) * 0.04;
      m.headGroup.position.set(0, 0.54 + headBob + headSep * 0.24, 0.82 + headSep * 0.42);
      m.headGroup.rotation.x = Math.cos(t * trotFreq) * 0.12;
      m.lowerJaw.rotation.x = 0.18 + Math.max(0, Math.sin(t * 5.4)) * 0.36 * flexAmt + headSep * 0.35;

      // 4 Digitigrade Canine Legs (Full-Amplitude Diagonal Trot Gait: FL+HR vs FR+HL)
      const loads = {};
      m.legs.forEach((leg) => {
        const isFL = leg.id === 'FL';
        const isJammed = hasFault && leg.id === 'FR';
        const det = isFL ? Math.max(wArm, wExp) : wExp;
        const diagPhase = (leg.id === 'FL' || leg.id === 'HR') ? 0 : Math.PI;
        const ph = t * trotFreq + diagPhase;

        // Large unmistakable canine stride angles
        const hipSwing = isJammed ? -0.35 : Math.sin(ph) * 0.62 * flexAmt;
        const swingLift = isJammed ? 0.95 : Math.max(0, Math.cos(ph)) * 0.98 * flexAmt;
        const ankleFlex = isJammed ? 0 : Math.sin(ph - 0.6) * 0.65 * flexAmt;

        leg.legRoot.position.set(leg.pos.x + leg.side * det * 0.48, leg.pos.y, leg.pos.z);
        leg.upper.rotation.x = (leg.isFront ? 0.18 : -0.24) + hipSwing;
        leg.knee.rotation.x = (leg.isFront ? -0.35 : 0.48) + (leg.isFront ? -swingLift : swingLift * 0.85);
        leg.knee.position.y = -0.46 - det * 0.25;
        if (leg.ankle) {
          leg.ankle.rotation.x = ankleFlex;
        }
        loads[leg.id] = isJammed ? 99 : Math.round(clamp(48 + Math.abs(hipSwing) * 72 + swingLift * 25, 36, 98));
      });

      // Energetic Wagging & Counter-Balancing Tail
      const tSep = Math.max(wSip, wExp);
      m.tailGroup.position.z = -0.82 - tSep * 0.45;
      m.tailGroup.rotation.y = Math.sin(t * 9.5) * 0.58 * flexAmt;
      m.tailGroup.rotation.x = Math.cos(t * trotFreq) * 0.18;
      return loads;
    }

    // -----------------------------------------------------------------------
    // 4. BIRD (Falco AV-6) — Powerful Avian Flight Stroke, Swooping & Talon Grip
    // -----------------------------------------------------------------------
    if (unitKey === 'av6') {
      GROUND_TRACK.group.visible = false;
      const m = FLEET_MODELS.av6;
      m.root.scale.setScalar(0.92);
      const flapFreq = 5.8 * speedBoost;
      const flapCycle = Math.sin(t * flapFreq);
      const swoopZ = Math.sin(t * 1.6) * 0.45 * (1 - wExp * 0.6);
      const swoopX = Math.cos(t * 1.6) * 0.28 * (1 - wExp * 0.6);
      m.root.position.set(swoopX, 0.12 + (-flapCycle * 0.11) * (1 - wExp), swoopZ);
      m.root.rotation.y = -0.42 + Math.sin(t * 1.6) * 0.22;
      m.root.rotation.x = Math.cos(t * flapFreq) * 0.12;

      m.flightGearL.rotation.z = t * 6.5;
      m.flightGearR.rotation.z = -t * 6.5;

      const stOpen = Math.max(wMan, wExp);
      m.dorsalShell.position.y = 0.18 + stOpen * 0.42;
      m.ventralKeel.position.y = -0.14 - stOpen * 0.36;

      const hSep = Math.max(wOpt, wExp);
      m.headGroup.position.set(0, 0.36 + hSep * 0.2, 0.62 + hSep * 0.45);
      m.headGroup.rotation.y = Math.sin(t * 2.4) * 0.22;

      // 2 Articulated 10-Feather Wings — Full Avian Downstroke & Upstroke Whip
      const wSep = Math.max(wArm, wExp);
      m.wings.forEach((w) => {
        const det = w.side < 0 ? wSep : wExp;
        w.shoulder.position.x = w.side * (0.28 + det * 0.38);
        const innerStroke = flapCycle * (0.74 + 0.25 * flexAmt);
        const outerWhip = Math.sin(t * flapFreq - 0.55) * (0.88 + 0.25 * flexAmt);
        w.innerWing.rotation.z = w.side * innerStroke;
        w.outerWing.rotation.z = w.side * (outerWhip * 0.75 - 0.12);
        w.outerWing.position.x = w.side * (0.72 + det * 0.32);
        w.feathers.forEach((f) => {
          f.blade.position.z = -0.28 - det * (f.idx * 0.045);
          f.fGroup.rotation.x = Math.cos(t * flapFreq) * 0.28;
        });
      });

      // Tail Rectrices Fan
      const tSep = Math.max(wSip, wExp);
      m.tailPivot.position.z = -0.52 - tSep * 0.48;
      m.tailPivot.rotation.x = 0.14 + Math.cos(t * flapFreq) * 0.22;
      m.tailFeathers.forEach((tf) => {
        const fanPulse = 0.16 + Math.abs(flapCycle) * 0.08 * flexAmt;
        tf.group.rotation.y = tf.idx * (fanPulse + tSep * 0.08);
      });

      // Talons grasping & extending
      const talSep = Math.max(wBk, wExp);
      m.talons.forEach((tl) => {
        tl.group.position.y = -0.22 - talSep * 0.38;
        tl.group.rotation.x = 0.35 + Math.sin(t * flapFreq - 0.4) * 0.42 * flexAmt;
      });

      return {
        'WL-1': Math.round(62 + Math.abs(flapCycle) * 34),
        'WL-2': Math.round(68 + Math.abs(flapCycle) * 28),
        'WR-1': Math.round(62 + Math.abs(flapCycle) * 34),
        'WR-2': Math.round(68 + Math.abs(flapCycle) * 28),
        'TL-L': 86,
        'TL-R': 86,
      };
    }

    // -----------------------------------------------------------------------
    // 5. SPIDER (Arachne AR-8) — Walks Forward on 8 High-Arching Hydraulic Legs
    // -----------------------------------------------------------------------
    if (unitKey === 'ar8') {
      const m = FLEET_MODELS.ar8;
      const yaw = -0.46;
      m.root.scale.setScalar(0.85);
      m.root.rotation.y = yaw;

      const walkFreq = 6.0 * speedBoost;
      const fwdDist = computeForwardTravel(t, 0.40 * speedBoost, 1.35, wExp);
      const stepBob = Math.abs(Math.sin(t * walkFreq)) * 0.055 * (1 - wExp * 0.5);

      m.root.position.set(
        Math.sin(yaw) * fwdDist,
        -0.04 + stepBob,
        Math.cos(yaw) * fwdDist
      );
      m.root.rotation.z = Math.cos(t * walkFreq) * 0.05;
      updateGroundTrack(t, yaw, 1.35 * speedBoost, true, -0.84);

      m.spiderGear.rotation.z = t * 5.2;

      const pOpen = Math.max(wMan, wExp);
      m.prosomaDome.position.y = 0.22 + pOpen * 0.48;

      const fSep = Math.max(wOpt, wExp);
      m.fangGroup.position.set(0, 0.1 + fSep * 0.12, 0.78 + fSep * 0.44);
      m.fangGroup.rotation.x = Math.sin(t * 4.5) * 0.24 * flexAmt;

      const abdOpen = Math.max(wSip, wExp);
      m.abdomenGroup.position.z = -0.58 - wExp * 0.42;
      m.abdomenGroup.rotation.x = Math.sin(t * walkFreq) * 0.08;
      m.silkSpool.rotation.x = t * 6.4;
      m.abdShells.forEach((s) => {
        s.group.position.x = s.side * abdOpen * 0.36;
        s.group.rotation.z = -s.side * abdOpen * 0.35;
      });
      m.spinnerets.position.z = -0.68 - Math.max(wBk, wExp) * 0.42;

      const loads = {};
      m.legs.forEach((leg) => {
        const isL2 = leg.id === 'L2';
        const det = isL2 ? Math.max(wArm, wExp) : wExp;
        const ph = t * walkFreq + leg.idx * 1.57 + (leg.side > 0 ? Math.PI : 0);
        const sw = -leg.side * Math.sin(ph) * 0.52 * flexAmt;
        const lift = Math.max(0, Math.cos(ph)) * 0.48 * flexAmt;
        const reach = Math.sin(ph) * 0.58 * flexAmt;

        leg.legRoot.position.set(leg.mountPos.x + leg.side * det * 0.48, leg.mountPos.y, leg.mountPos.z);
        leg.legRoot.rotation.y = -leg.side * (0.72 - leg.idx * 0.48) + sw;
        leg.femur.rotation.z = leg.side * lift;
        leg.tibia.rotation.z = -leg.side * lift * 0.65 + leg.side * reach * 0.4;
        leg.knee.position.x = leg.side * (0.68 + det * 0.32);
        loads[leg.id] = Math.round(clamp(46 + Math.abs(sw) * 90 + lift * 35, 36, 96));
      });
      return loads;
    }

    // -----------------------------------------------------------------------
    // 6. SNAKE (Ophidia OP-24) — Slithers Forward + Rears Up & Strikes!
    // -----------------------------------------------------------------------
    if (unitKey === 'op24') {
      const m = FLEET_MODELS.op24;
      const yaw = -0.35;
      m.root.scale.setScalar(0.95);
      m.root.rotation.y = yaw;

      const fwdDist = computeForwardTravel(t, 0.38 * speedBoost, 1.3, wExp);
      m.root.position.set(Math.sin(yaw) * fwdDist, 0, Math.cos(yaw) * fwdDist);
      updateGroundTrack(t, yaw, 1.4 * speedBoost, true, -0.32);

      const jawOpen = Math.max(wOpt, wExp);
      const scuteOpen = Math.max(wMan, wExp);
      const ribOpen = Math.max(wArm, wExp);
      const rattleOpen = Math.max(wSip, wExp);
      const bellyOpen = Math.max(wBk, wExp);

      const waveSpeed = 6.2 * speedBoost;
      const waveAmp = (0.72 + 0.25 * flexAmt) * (1 - wExp * 0.35);

      // Periodic Viper Rear-Up & Strike Lunge Cycle
      const strikeCyc = (t * 0.25) % 1.0;
      const rearUp = ss(0.35, 0.62, strikeCyc) * (1 - ss(0.78, 0.94, strikeCyc)) + (STATE.gaitPreset === 'strike' ? 0.85 : 0);
      const lungeZ = rearUp > 0.5 ? Math.max(0, Math.sin((strikeCyc - 0.55) * Math.PI * 6)) * 0.42 : 0;

      const hX = Math.sin(t * waveSpeed) * 0.46 * flexAmt;
      const hY = 0.24 + rearUp * 0.46 + Math.sin(t * 3.2) * 0.05;
      m.headGroup.position.set(hX, hY, 1.35 + lungeZ + jawOpen * 0.38);
      m.headGroup.rotation.y = Math.cos(t * waveSpeed) * 0.45;
      m.headGroup.rotation.x = rearUp * 0.25 - lungeZ * 0.6;
      m.jawLower.rotation.x = 0.22 + rearUp * 0.85 + jawOpen * 0.85 + Math.max(0, Math.sin(t * 4.5)) * 0.35;
      m.fangs.forEach((f) => {
        f.rotation.x = -0.45 + (rearUp + jawOpen) * 0.65;
      });

      // 22 Vertebral Segments propagating forward S-wave
      const loads = {};
      m.segments.forEach((s) => {
        const i = s.idx;
        const phase = t * waveSpeed - i * 0.46;
        const sx = Math.sin(phase) * waveAmp * (0.35 + s.u * 0.75);
        const sz = 1.05 + lungeZ * Math.max(0, 1 - i / 8) - i * (0.115 + wExp * 0.045);
        const sy = -0.14 + Math.max(0, 1 - i / 7) * (hY + 0.14) + Math.cos(phase * 2) * 0.03;

        s.segGroup.position.set(sx, sy, sz);
        s.segGroup.rotation.y = Math.cos(phase) * 0.62;
        s.dorsalScute.position.y = 0.14 + scuteOpen * 0.36;
        s.ribL.position.x = -0.06 - (ribOpen + rearUp * 0.25) * 0.28;
        s.ribR.position.x = 0.06 + (ribOpen + rearUp * 0.25) * 0.28;
        s.belly.position.y = -0.15 - bellyOpen * 0.26;
      });

      const lastSeg = m.segments[m.segments.length - 1].segGroup;
      m.rattleGroup.position.copy(lastSeg.position).add(new THREE.Vector3(0, 0.12, -0.18 - rattleOpen * 0.35));
      m.rattleGroup.rotation.x = 0.65 + Math.sin(t * 36.0) * 0.22;
      m.rattleGroup.rotation.z = Math.cos(t * 36.0) * 0.18;
      m.rattleRings.forEach((rr, idx) => {
        rr.position.z = -idx * (0.055 + rattleOpen * 0.08);
      });

      ['S1-3', 'S4-6', 'S7-9', 'S10-12', 'S13-15', 'S16-18', 'S19-22'].forEach((k, idx) => {
        loads[k] = Math.round(clamp(58 + Math.sin(t * 4.5 - idx * 0.7) * 32 * flexAmt, 34, 96));
      });
      return loads;
    }

    // -----------------------------------------------------------------------
    // 7. CHEETAH (Acinonyx AC-14) — Gallops/Runs Forward with Flexing 6-Link Spine
    // -----------------------------------------------------------------------
    if (unitKey === 'ac14') {
      const m = FLEET_MODELS.ac14;
      const yaw = -0.54;
      m.root.scale.setScalar(0.95);
      m.root.rotation.y = yaw;

      const spineSep = Math.max(wMan, wExp);
      const headSep = Math.max(wOpt, wExp);
      const legSep = Math.max(wArm, wExp);
      const tailSep = Math.max(wSip, wExp);
      const keelSep = Math.max(wBk, wExp);

      const gallopFreq = 7.4 * speedBoost;
      const fwdDist = computeForwardTravel(t, 0.56 * speedBoost, 1.45, wExp);
      const boundHeight = Math.max(0, Math.sin(t * gallopFreq)) * 0.11 * (1 - wExp * 0.5);
      const spineFlex = Math.sin(t * gallopFreq) * (0.36 + 0.12 * flexAmt) * (1 - wExp * 0.4);

      m.root.position.set(
        Math.sin(yaw) * fwdDist,
        -0.02 + boundHeight,
        Math.cos(yaw) * fwdDist
      );
      updateGroundTrack(t, yaw, 1.85 * speedBoost, true, -0.84);

      // 6 Articulated Spine Vertebrae arching and extending
      m.spineSegs.forEach((s) => {
        const u = (s.idx - 2.5) / 2.5;
        const zPos = 0.55 - s.idx * (0.24 + spineSep * 0.12);
        const yArch = Math.cos(u * Math.PI * 0.5) * spineFlex * 0.65;
        s.group.position.set(0, 0.26 + yArch, zPos);
        s.group.rotation.x = -u * spineFlex * 0.95;
        s.saddle.position.y = 0.18 + spineSep * 0.32;
        if (s.idx < 3) s.coreBlock.position.y = -keelSep * 0.26;
      });

      // Aerodynamic Felid Head counter-pitching to keep optics level
      m.headGroup.position.set(0, 0.48 - spineFlex * 0.22 + headSep * 0.18, 0.88 + headSep * 0.38);
      m.headGroup.rotation.x = spineFlex * 0.45;

      // 4 Long Sprinter Legs (Rotary Gallop Gait)
      const loads = {};
      m.legs.forEach((leg) => {
        const isFL = leg.id === 'FL';
        const det = isFL ? legSep : wExp;
        const phase = t * gallopFreq + (leg.isFront ? 0 : Math.PI * 0.85) + (leg.side > 0 ? 0.42 : 0);
        const swing = Math.sin(phase) * 0.78 * flexAmt;
        const kneeBend = Math.max(0, Math.cos(phase)) * 1.12 * flexAmt;
        const anklePush = Math.sin(phase - 0.5) * 0.68 * flexAmt;

        const baseZ = leg.isFront ? 0.48 : -0.58;
        leg.legRoot.position.set(leg.side * (0.28 + det * 0.42), 0.22, baseZ);
        leg.upper.rotation.x = swing;
        leg.knee.rotation.x = leg.isFront ? -kneeBend : kneeBend;
        leg.knee.position.y = -0.54 - det * 0.24;
        if (leg.ankle) {
          leg.ankle.rotation.x = anklePush;
        }
        loads[leg.id] = Math.round(clamp(62 + Math.abs(swing) * 45, 42, 99));
      });

      // 8-Link Counter-Torque Rudder Tail
      m.tailSegs.forEach((tg, idx) => {
        const tz = -0.78 - idx * (0.15 + tailSep * 0.08);
        const ty = 0.26 - idx * 0.02 + Math.sin(t * gallopFreq - idx * 0.38) * 0.16 * flexAmt;
        const tx = Math.cos(t * gallopFreq * 0.5 - idx * 0.3) * 0.14 * flexAmt;
        tg.position.set(tx, ty, tz);
        tg.rotation.x = -0.18 + Math.cos(t * gallopFreq - idx * 0.38) * 0.38;
      });

      loads.SPINE = Math.round(clamp(70 + Math.abs(spineFlex) * 65, 45, 98));
      loads.TAIL = 84;
      return loads;
    }

    // -----------------------------------------------------------------------
    // 8. HUMAN (Valkyrie HM-22) — Full 22-DOF Bipedal Forward Walking Stride
    // -----------------------------------------------------------------------
    if (unitKey === 'hm22') {
      const m = FLEET_MODELS.hm22;
      const yaw = -0.48;
      m.root.scale.setScalar(0.76);
      m.root.rotation.y = yaw;

      const walkFreq = 5.2 * speedBoost;
      const fwdDist = computeForwardTravel(t, 0.36 * speedBoost, 1.15, wExp);
      // Human COM bobs at 2x stride frequency (highest at mid-stance, lowest at double-support)
      const comBob = Math.abs(Math.cos(t * walkFreq)) * 0.055 * (1 - wExp * 0.5);
      const latSway = Math.sin(t * walkFreq) * 0.038 * (1 - wExp * 0.5);

      m.root.position.set(
        Math.sin(yaw) * fwdDist + Math.cos(yaw) * latSway,
        -0.18 + comBob,
        Math.cos(yaw) * fwdDist - Math.sin(yaw) * latSway
      );
      updateGroundTrack(t, yaw, 1.35 * speedBoost, true, -0.84);

      // Spinning Twin Planetary Heart Gears inside Thoracic Sternum
      m.heartGearL.rotation.z = t * 5.0;
      m.heartGearR.rotation.z = -t * 5.0;

      // Pelvis & Lumbar Spine Counter-Rotation during Bipedal Walking
      const pelvSep = Math.max(wBk, wExp);
      const spineSep = Math.max(wSip, wExp);
      const chestOpen = Math.max(wMan, wExp);
      const headSep = Math.max(wOpt, wExp);
      const limbSep = Math.max(wArm, wExp);

      m.pelvisGroup.position.y = 0.06 - pelvSep * 0.22;
      m.pelvisGroup.rotation.y = Math.sin(t * walkFreq) * 0.18 * flexAmt;
      m.pelvisGroup.rotation.z = Math.cos(t * walkFreq) * 0.06 * flexAmt;

      m.spineGroup.position.y = 0.1 + spineSep * 0.18;
      m.spineGroup.rotation.y = -Math.sin(t * walkFreq) * 0.24 * flexAmt;
      m.spineGroup.rotation.x = 0.06 + Math.abs(Math.sin(t * walkFreq)) * 0.05;

      // Thoracic Pectoral Shells & Dorsal Power Pack
      m.chestShells.forEach((sh) => {
        sh.group.position.x = sh.side * (0.16 + chestOpen * 0.34);
        sh.group.rotation.y = sh.side * chestOpen * 0.35;
      });
      m.dorsalPack.position.z = -0.15 - chestOpen * 0.32;

      // Bionic Head & Jaw
      m.headGroup.position.set(0, 0.48 + headSep * 0.26, 0.02 + headSep * 0.24);
      m.headGroup.rotation.y = Math.sin(t * walkFreq) * 0.08 + Math.sin(t * 1.9) * 0.14;
      m.headGroup.rotation.x = Math.cos(t * walkFreq * 2) * 0.05;
      m.lowerJaw.rotation.x = headSep * 0.35 + Math.max(0, Math.sin(t * 3.2)) * 0.12;

      // 2 × 4-DOF Bionic Arms swinging in opposition to the legs
      const loads = {};
      m.arms.forEach((arm) => {
        const isLeft = arm.side < 0;
        const det = isLeft ? limbSep : wExp;
        const armPhase = t * walkFreq + (isLeft ? Math.PI : 0);
        const shoulderSwing = Math.sin(armPhase) * 0.56 * flexAmt;
        const elbowFlex = -0.42 - Math.max(0, Math.sin(armPhase + 0.4)) * 0.58 * flexAmt;

        arm.shoulder.position.set(arm.side * (0.31 + det * 0.38), 0.36 + det * 0.1, 0);
        arm.shoulder.rotation.x = shoulderSwing;
        arm.shoulder.rotation.z = arm.side * (-0.08 - det * 0.25);
        arm.elbow.rotation.x = elbowFlex;
        arm.hand.rotation.x = Math.sin(armPhase) * 0.22;
        loads[arm.id] = Math.round(clamp(48 + Math.abs(shoulderSwing) * 65, 34, 92));
      });

      // 2 × 4-DOF Bipedal Walking Legs (Heel-Strike -> Stance -> Toe-Off -> Knee-Lift Swing)
      m.legs.forEach((leg) => {
        const isLeft = leg.side < 0;
        const isJammed = hasFault && !isLeft;
        const det = isLeft ? limbSep : wExp;
        const legPhase = t * walkFreq + (isLeft ? 0 : Math.PI);

        // In Three.js: negative rotation.x swings the leg (-Y) FORWARD (+Z)!
        const hipSwing = isJammed ? 0.15 : -Math.sin(legPhase) * 0.58 * flexAmt;
        // Knee bends backward (+rotation.x moves lower leg toward -Z) during forward swing (cos(legPhase) > 0)
        const kneeBend = isJammed ? 0.1 : (0.12 + Math.max(0, Math.cos(legPhase)) * 0.96 * flexAmt);
        // Ankle dorsiflexes on forward swing/heel-strike and plantarflexes on push-off
        const ankleRoll = isJammed ? 0 : Math.cos(legPhase - 0.5) * 0.38 * flexAmt - kneeBend * 0.35;

        leg.hip.position.set(leg.side * (0.15 + det * 0.34), -0.04 - det * 0.12, 0);
        leg.hip.rotation.x = hipSwing;
        leg.knee.rotation.x = kneeBend;
        leg.knee.position.y = -0.42 - det * 0.18;
        leg.ankle.rotation.x = ankleRoll;
        loads[leg.id] = isJammed ? 99 : Math.round(clamp(58 + Math.abs(hipSwing) * 62 + kneeBend * 18, 42, 97));
      });

      loads.SPINE = 76;
      loads.CORE = 88;
      return loads;
    }

    GROUND_TRACK.group.visible = false;
    return {};
  }

  // -------------------------------------------------------------------------
  // 3D CALLOUT LEADER ANCHORS FOR ALL 8 NEW UNITS
  // -------------------------------------------------------------------------
  function getFleetUnitCallouts(unitKey) {
    if (!STATE.labels) return [];
    const V3 = THREE.Vector3;
    const CALLOUT_MAP = {
      sc8: [
        { world: new V3(0, 0.92, -0.15), labelX: 1065, labelY: 235, align: 'right', title: 'TELSON STINGER', sub: 'HYPODERMIC VENOM BLADE' },
        { world: new V3(0, 0.65, -0.82), labelX: 1065, labelY: 365, align: 'right', title: 'METASOMA TAIL', sub: '6 × ROTARY SERVO DRUMS' },
        { world: new V3(-0.55, 0.05, 1.35), labelX: 370, labelY: 310, align: 'left', title: 'CHELA MANUS L', sub: 'GLASS PORT · 4 BEVEL GEARS' },
        { world: new V3(0, 0.28, 0.15), labelX: 370, labelY: 435, align: 'left', title: 'DORSAL CARAPACE', sub: '7 HINGED CERAMIC PLATES' },
        { world: new V3(-0.85, -0.2, 0.14), labelX: 370, labelY: 555, align: 'left', title: 'ARACHNID LEG L2', sub: '3-DOF SERVO · TARSAL SPIKE' },
      ],
      hb7: [
        { world: new V3(0, 0.22, 0.85), labelX: 1065, labelY: 255, align: 'right', title: 'COMPOUND OPTICS', sub: '2 × 18 MM AMBER IR LENS' },
        { world: new V3(0, 0.35, 0.15), labelX: 370, labelY: 285, align: 'left', title: 'THORAX PIEZO DRIVE', sub: '3 GEARS · 230 HZ RESONATOR' },
        { world: new V3(-0.85, 0.55, 0.1), labelX: 370, labelY: 410, align: 'left', title: 'VENATION FOREWING', sub: 'CARBON SPAR · GLASS FOIL' },
        { world: new V3(0, 0.05, -0.85), labelX: 1065, labelY: 425, align: 'right', title: 'ABDOMEN CAPSULE', sub: '5 STACKED GEARS · GLASS SHELL' },
        { world: new V3(-0.52, -0.5, 0.12), labelX: 370, labelY: 545, align: 'left', title: 'POLLEN BASKET LEG', sub: '3-JOINT MICRO-GRIPPER' },
      ],
      cn12: [
        { world: new V3(0, 0.58, 0.98), labelX: 1065, labelY: 255, align: 'right', title: 'LUPINE LIDAR HEAD', sub: 'STEREO OPTIC · HINGED JAW' },
        { world: new V3(0, 0.32, 0.22), labelX: 370, labelY: 295, align: 'left', title: 'THORACIC RIBCAGE', sub: '10 CERAMIC RIBS · 96V CORE' },
        { world: new V3(-0.35, -0.25, 0.46), labelX: 370, labelY: 465, align: 'left', title: 'DIGITIGRADE LEG FL', sub: '3-DOF QUASI-DIRECT DRIVE' },
        { world: new V3(0, 0.38, -0.95), labelX: 1065, labelY: 445, align: 'right', title: 'COUNTER-TORQUE TAIL', sub: '5-SEGMENT DYNAMIC BALANCE' },
      ],
      av6: [
        { world: new V3(0, 0.42, 0.78), labelX: 1065, labelY: 245, align: 'right', title: 'RAPTOR MAXILLA BEAK', sub: 'CHITIN-TITANIUM · FOVEAL ZOOM' },
        { world: new V3(0, 0.22, 0.08), labelX: 370, labelY: 285, align: 'left', title: 'KEELED STERNUM CORE', sub: 'TWIN BEVEL FLAP GEARBOX' },
        { world: new V3(-0.95, 0.25, 0.0), labelX: 370, labelY: 425, align: 'left', title: 'PRIMARY FLIGHT FEATHERS', sub: '10 ARTICULATED BLADES / WING' },
        { world: new V3(0, -0.08, -0.82), labelX: 1065, labelY: 415, align: 'right', title: 'RECTRICES TAIL FAN', sub: '7-FEATHER PITCH/YAW VECTOR' },
        { world: new V3(-0.18, -0.52, -0.05), labelX: 370, labelY: 555, align: 'left', title: 'RATCHET TALONS', sub: '4 GRASPING CLAWS · 180 N' },
      ],
      ar8: [
        { world: new V3(0, 0.18, 0.85), labelX: 1065, labelY: 255, align: 'right', title: '8-EYE OCULAR TURRET', sub: '2 AME + 6 SECONDARY · FANGS' },
        { world: new V3(0, 0.32, 0.32), labelX: 370, labelY: 295, align: 'left', title: 'PROSOMA CARAPACE', sub: '8-CYLINDER RADIAL MANIFOLD' },
        { world: new V3(-0.82, 0.58, 0.2), labelX: 370, labelY: 435, align: 'left', title: 'ARCHED PATELLA-TIBIA', sub: 'HYDRAULIC EXTENSION STRUT' },
        { world: new V3(0, 0.35, -0.58), labelX: 1065, labelY: 425, align: 'right', title: 'OPISTHOSOMA SPOOL', sub: 'SYNTHETIC ARAMID SILK DRUM' },
        { world: new V3(0, -0.1, -1.25), labelX: 1065, labelY: 545, align: 'right', title: '6-NOZZLE SPINNERETS', sub: 'TENSION ANCHOR ARRAY' },
      ],
      op24: [
        { world: new V3(0, 0.32, 1.35), labelX: 1065, labelY: 245, align: 'right', title: 'SOLENOGLYPHOUS JAW', sub: '160° JAW · FOLDING FANGS' },
        { world: new V3(-0.35, 0.05, 0.45), labelX: 370, labelY: 315, align: 'left', title: 'CARDAN VERTEBRAE', sub: '22 SEGMENTS · GLASS SCUTES' },
        { world: new V3(0.42, -0.08, -0.15), labelX: 1065, labelY: 410, align: 'right', title: 'CURVED TITANIUM RIBS', sub: '44 LATERAL ACTUATED RIBS' },
        { world: new V3(-0.25, -0.12, -1.25), labelX: 370, labelY: 525, align: 'left', title: 'ACOUSTIC TAIL RATTLE', sub: '6 INTERLOCKING RESONATORS' },
      ],
      ac14: [
        { world: new V3(0, 0.52, 0.92), labelX: 1065, labelY: 245, align: 'right', title: 'AERODYNAMIC SKULL', sub: 'MALAR TEAR-STRIPE BAFFLES' },
        { world: new V3(0, 0.38, 0.05), labelX: 370, labelY: 285, align: 'left', title: '6-LINK FLEX SPINE', sub: 'CARBON LEAF-SPRING EXTENSOR' },
        { world: new V3(-0.32, -0.25, 0.48), labelX: 370, labelY: 455, align: 'left', title: 'SPRINTER FORELEG FL', sub: 'CLEAT CLAWS · HIGH-RPM DRUM' },
        { world: new V3(0, 0.18, -1.45), labelX: 1065, labelY: 445, align: 'right', title: 'COUNTER-TORQUE TAIL', sub: '8-SEGMENT RUDDER WHIP' },
      ],
      hm22: [
        { world: new V3(0, 0.88, 0.12), labelX: 1065, labelY: 235, align: 'right', title: 'BIONIC CRANIUM VISOR', sub: 'STEREO LIDAR · HINGED JAW' },
        { world: new V3(0, 0.52, 0.14), labelX: 370, labelY: 295, align: 'left', title: 'THORACIC HEART CORE', sub: '12 RIBS · TWIN PLANETARY GEARS' },
        { world: new V3(-0.36, 0.25, 0.05), labelX: 370, labelY: 415, align: 'left', title: '4-DOF BIONIC ARM L', sub: 'DELTOID DRUM · 5-FINGER HAND' },
        { world: new V3(0.18, -0.45, 0.15), labelX: 1065, labelY: 445, align: 'right', title: 'BIPEDAL STRIDE LEG', sub: 'FEMORAL PISTON · HEEL-TOE FOOT' },
      ],
    };
    return CALLOUT_MAP[unitKey] || [];
  }

  // -------------------------------------------------------------------------
  // BUILD THE HANGAR BAR, COLOR PALETTE BAR, LAB CONTROLS & SPEC DRAWER UI
  // -------------------------------------------------------------------------
  const ALL_UNITS_LIST = [
    { id: 'oc8', code: 'OC-8', name: 'OCTOPUS' },
    { id: 'hx18', code: 'HX-18', name: 'HEXAPOD' },
    { id: 'sc8', code: 'SC-8', name: 'SCORPION' },
    { id: 'hb7', code: 'HB-7', name: 'BEE' },
    { id: 'cn12', code: 'CN-12', name: 'DOG' },
    { id: 'av6', code: 'AV-6', name: 'BIRD' },
    { id: 'ar8', code: 'AR-8', name: 'SPIDER' },
    { id: 'op24', code: 'OP-24', name: 'SNAKE' },
    { id: 'ac14', code: 'AC-14', name: 'CHEETAH' },
    { id: 'hm22', code: 'HM-22', name: 'HUMAN' },
  ];

  function injectFleetAndLabUI() {
    // 1. Keep Top-Bar Unit Switcher compact (OC-8 / HX-18 / HM-22) so it never overlaps DRIVE LOAD
    const switcherBtns = document.querySelector('.unit-switcher-btns');
    if (switcherBtns) {
      switcherBtns.innerHTML = '';
      ['oc8', 'hx18', 'hm22'].forEach((uid) => {
        const b = document.createElement('button');
        b.className = `unit-btn ${STATE.unit === uid ? 'active' : ''}`;
        b.id = `unit-${uid}`;
        b.dataset.unit = uid;
        b.textContent = uid.toUpperCase().replace(/([A-Z]+)(\d+)/, '$1-$2');
        b.addEventListener('click', () => {
          STATE.unit = uid;
          STATE.assembly = 'hero';
          STATE.exploded = false;
          STATE.explodeSlider = 0;
          STATE.faultKey = null;
          playAudioFX('click');
          buildUnitUI();
        });
        switcherBtns.appendChild(b);
      });
    }

    // 2. Inject Two-Tier Biomimetic Hangar & Engineering Lab Dock at Top of Center Stage
    const labBar = document.createElement('div');
    labBar.id = 'engineering-lab-bar';
    labBar.style.cssText = `
      position: absolute;
      left: 332px;
      width: 936px;
      top: 132px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 6px 10px;
      background: rgba(251, 249, 245, 0.94);
      border: 1px solid var(--panel-border);
      border-radius: 4px;
      pointer-events: auto;
      z-index: 15;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5px;
    `;

    const hangarButtonsHtml = ALL_UNITS_LIST.map(
      (u) => `
      <button class="sim-btn hangar-unit-btn ${STATE.unit === u.id ? 'active' : ''}" data-unit="${u.id}" style="padding:3px 4px;font-size:7.5px;flex:1;text-align:center">
        <b>${u.name}</b> <span style="opacity:0.75">${u.code}</span>
      </button>`
    ).join('');

    const themeHtml = Object.entries(COLOR_THEMES)
      .map(
        ([k, v]) => `
        <button class="theme-swatch-btn ${k === STATE.colorTheme ? 'active' : ''}" data-theme="${k}" title="${v.label}" style="
          display:inline-flex;align-items:center;gap:2px;padding:2px 4px;border:1px solid ${k === STATE.colorTheme ? 'var(--accent)' : '#ccc6ba'};
          border-radius:3px;background:#fff;cursor:pointer;">
          <i style="width:7px;height:7px;border-radius:50%;background:${v.swatches[0]};border:1px solid #999"></i>
          <i style="width:7px;height:7px;border-radius:50%;background:${v.swatches[1]}"></i>
          <i style="width:7px;height:7px;border-radius:50%;background:${v.swatches[2]}"></i>
        </button>`
      )
      .join('');

    labBar.innerHTML = `
      <!-- Row 1: 10-Machine Biomimetic Fleet Hangar Selector -->
      <div style="display:flex;align-items:center;gap:3.5px;width:100%">
        <span style="color:var(--mute);font-weight:700;letter-spacing:1px;margin-right:2px">HANGAR</span>
        ${hangarButtonsHtml}
      </div>

      <!-- Row 2: 6 Color Arrangements + Teardown/Pose Sliders + X-Ray/Thermal/Gait/Fault/Audio/Snapshot -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;border-top:1px solid var(--line);padding-top:4px">
        <div style="display:flex;align-items:center;gap:4px">
          <span style="color:var(--mute);font-weight:700;letter-spacing:1px">COLOR</span>
          ${themeHtml}
        </div>

        <div style="display:flex;align-items:center;gap:8px">
          <label style="display:flex;align-items:center;gap:4px;color:var(--ink)" title="Feature 4: Continuous Teardown Separation (0-100%)">
            <span style="color:var(--mute);font-weight:700">TEARDOWN</span>
            <input type="range" id="lab-explode-slider" min="0" max="100" value="0" style="width:58px;accent-color:var(--accent);cursor:pointer"/>
          </label>
          <label style="display:flex;align-items:center;gap:4px;color:var(--ink)" title="Feature 2: Puppeteer Joint & Pose Flex Multiplier">
            <span style="color:var(--mute);font-weight:700">POSE FLEX</span>
            <input type="range" id="lab-pose-slider" min="0" max="100" value="65" style="width:52px;accent-color:var(--accent);cursor:pointer"/>
          </label>
        </div>

        <div style="display:flex;align-items:center;gap:3.5px">
          <button class="sim-btn" id="lab-btn-xray" style="padding:3px 6px;font-size:8px" title="Feature 3: X-Ray Ghost Shell">X-RAY</button>
          <button class="sim-btn" id="lab-btn-thermal" style="padding:3px 6px;font-size:8px" title="Feature 5: Thermal Stress Heatmap">THERMAL</button>
          <button class="sim-btn" id="lab-btn-gait" style="padding:3px 6px;font-size:8px" title="Feature 9: Cycle Locomotion Preset">GAIT: AUTO</button>
          <button class="sim-btn" id="lab-btn-fault" style="padding:3px 6px;font-size:8px" title="Feature 7: Inject / Clear Servo Fault">FAULT</button>
          <button class="sim-btn" id="lab-btn-audio" style="padding:3px 6px;font-size:8px" title="Feature 6: Procedural Mechanical Audio">AUDIO</button>
          <button class="sim-btn" id="lab-btn-snap" style="padding:3px 6px;font-size:8px" title="Feature 10: Export Blueprint PNG Snapshot">SNAPSHOT</button>
        </div>
      </div>
    `;
    document.getElementById('hud-root').appendChild(labBar);

    // Wire Hangar Unit Buttons — Always reset to intact HERO locomotion mode so walking/flying animations play immediately!
    labBar.querySelectorAll('.hangar-unit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        STATE.unit = btn.dataset.unit;
        STATE.assembly = 'hero';
        STATE.exploded = false;
        STATE.explodeSlider = 0;
        STATE.wOptics = 0;
        STATE.wMantle = 0;
        STATE.wArmR2 = 0;
        STATE.wSiphon = 0;
        STATE.wBeak = 0;
        STATE.wExploded = 0;
        STATE.faultKey = null;
        playAudioFX('click');
        buildUnitUI();
      });
    });

    // 3. Feature 8: Floating 3D Part Inspector Blueprint Spec Card (Bottom-Right of Center Stage)
    const specCard = document.createElement('div');
    specCard.id = 'blueprint-spec-card';
    specCard.style.cssText = `
      position: absolute;
      right: 344px;
      bottom: 152px;
      width: 248px;
      padding: 10px 12px;
      background: rgba(24, 24, 26, 0.92);
      color: #f4f2ec;
      border-left: 3px solid var(--accent);
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      display: none;
      pointer-events: auto;
      z-index: 16;
      box-shadow: 0 6px 18px rgba(0,0,0,0.18);
    `;
    document.getElementById('hud-root').appendChild(specCard);

    // Wire Color Theme buttons
    labBar.querySelectorAll('.theme-swatch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyColorTheme(btn.dataset.theme);
        playAudioFX('click');
      });
    });

    // Wire Teardown Slider (Feature 4)
    const expSlider = document.getElementById('lab-explode-slider');
    expSlider.addEventListener('input', (e) => {
      takeManualControl();
      const v = Number(e.target.value) / 100;
      STATE.explodeSlider = v;
      STATE.exploded = v > 0.85;
      if (v > 0.15) STATE.labels = true;
    });

    // Wire Pose Flex Slider (Feature 2)
    const poseSlider = document.getElementById('lab-pose-slider');
    poseSlider.addEventListener('input', (e) => {
      STATE.poseFlex = Number(e.target.value) / 100;
    });

    // Wire X-Ray, Thermal, Gait, Fault, Audio, Snapshot buttons
    document.getElementById('lab-btn-xray').addEventListener('click', () => {
      STATE.xray = !STATE.xray;
      playAudioFX('pneumatic');
    });
    document.getElementById('lab-btn-thermal').addEventListener('click', () => {
      STATE.thermal = !STATE.thermal;
      playAudioFX('click');
    });
    const gaitPresets = ['auto', 'cruise', 'sprint', 'strike'];
    document.getElementById('lab-btn-gait').addEventListener('click', (e) => {
      const idx = (gaitPresets.indexOf(STATE.gaitPreset) + 1) % gaitPresets.length;
      STATE.gaitPreset = gaitPresets[idx];
      e.currentTarget.textContent = `GAIT: ${STATE.gaitPreset.toUpperCase()}`;
      e.currentTarget.classList.toggle('active', STATE.gaitPreset !== 'auto');
      playAudioFX('servo');
    });
    document.getElementById('lab-btn-fault').addEventListener('click', (e) => {
      STATE.faultKey = STATE.faultKey ? null : 'servo_jam';
      e.currentTarget.classList.toggle('active', !!STATE.faultKey);
      e.currentTarget.textContent = STATE.faultKey ? 'FAULT: ACTIVE' : 'FAULT';
      playAudioFX('fault');
    });
    document.getElementById('lab-btn-audio').addEventListener('click', (e) => {
      STATE.audioEnabled = !STATE.audioEnabled;
      e.currentTarget.classList.toggle('active', STATE.audioEnabled);
      if (STATE.audioEnabled) playAudioFX('servo');
    });
    document.getElementById('lab-btn-snap').addEventListener('click', () => {
      playAudioFX('click');
      const a = document.createElement('a');
      a.download = `${UNIT_CONFIG[STATE.unit].code}_Blueprint_${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    });

    // Feature 8: 3D Click-to-Inspect Raycaster on Viewport Canvas
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downPos = null;
    canvas.addEventListener('pointerdown', (e) => {
      downPos = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!downPos || Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const activeRoot =
        STATE.unit === 'oc8'
          ? CORE.pelagos.root
          : STATE.unit === 'hx18'
          ? CORE.hexapod.root
          : FLEET_MODELS[STATE.unit]?.root;
      if (!activeRoot) return;

      const hits = raycaster.intersectObject(activeRoot, true);
      if (hits.length > 0) {
        const hitMat = hits[0].object.material;
        const cfg = UNIT_CONFIG[STATE.unit];
        const matName =
          hitMat === MATS.ceramic
            ? 'ZrO2 Toughened Alumina Ceramic'
            : hitMat === MATS.orange
            ? 'Type-III Anodized 7075-T6 Alloy'
            : hitMat === MATS.portGlass
            ? 'Smoked Borosilicate Inspection Port'
            : hitMat === MATS.steel
            ? '17-4PH Hardened Stainless Gear Steel'
            : 'Ti-6Al-4V / Carbon-PEEK Composite';
        const subSpec = cfg.subsystems[Math.floor(Math.random() * cfg.subsystems.length)];
        specCard.style.display = 'block';
        specCard.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="color:var(--accent);font-weight:700">PART INSPECTOR · ${cfg.code}</span>
            <span style="cursor:pointer;opacity:0.7" onclick="this.parentElement.parentElement.style.display='none'">✕</span>
          </div>
          <div style="font-size:10.5px;font-weight:700;margin-bottom:3px">${subSpec.name}</div>
          <div style="color:#b8b2a6;font-size:8px;margin-bottom:6px">${subSpec.spec}</div>
          <div style="display:grid;grid-template-columns:64px 1fr;row-gap:3px;font-size:8px;border-top:1px solid #333;padding-top:5px">
            <span style="color:#8c867c">MATERIAL</span><span>${matName}</span>
            <span style="color:#8c867c">COORDS</span><span>[${hits[0].point.x.toFixed(2)}, ${hits[0].point.y.toFixed(2)}, ${hits[0].point.z.toFixed(2)}] M</span>
            <span style="color:#8c867c">STATUS</span><span style="color:#1e9e5a;font-weight:700">${STATE.faultKey ? 'FAULT DETECTED' : 'NOMINAL · LIVE'}</span>
          </div>
        `;
        playAudioFX('click');
      } else {
        specCard.style.display = 'none';
      }
    });
  }

  // -------------------------------------------------------------------------
  // REGISTER FLEET HOOKS WITH PELAGOS CORE
  // -------------------------------------------------------------------------
  window.__PELAGOS_FLEET = {
    models: FLEET_MODELS,
    themes: COLOR_THEMES,
    applyColorTheme,
    playAudioFX,
    updateUnitPose: updateFleetUnitPose,
    getUnitCallouts: getFleetUnitCallouts,
    onUnitChanged(unitKey) {
      Object.entries(FLEET_MODELS).forEach(([k, m]) => {
        m.root.visible = k === unitKey;
      });
      if (unitKey === 'oc8') {
        GROUND_TRACK.group.visible = false;
      }
      document.querySelectorAll('.unit-switcher-btns .unit-btn, .hangar-unit-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.unit === unitKey);
      });
    },
    onSubsystemClick(sub) {
      playAudioFX('servo');
    },
    onHudTick(now) {
      syncShaderModesToMats();
      if (STATE.unit === 'hx18') {
        updateGroundTrack(now || performance.now() * 0.001, -0.32, 1.35, true, -0.84);
      } else if (STATE.unit === 'oc8') {
        GROUND_TRACK.group.visible = false;
      }
      const xrBtn = document.getElementById('lab-btn-xray');
      const thBtn = document.getElementById('lab-btn-thermal');
      const exSl = document.getElementById('lab-explode-slider');
      if (xrBtn) xrBtn.classList.toggle('active', !!STATE.xray);
      if (thBtn) thBtn.classList.toggle('active', !!STATE.thermal);
      if (exSl && document.activeElement !== exSl) {
        exSl.value = String(Math.round(STATE.wExploded * 100));
      }
    },
  };

  injectFleetAndLabUI();

  // Check URL ?unit=..., ?theme=..., ?xray=..., ?thermal=..., ?explode=... on load
  const params = new URLSearchParams(window.location.search);
  if (params.has('theme') && COLOR_THEMES[params.get('theme')]) {
    applyColorTheme(params.get('theme'));
  }
  if (params.has('xray')) {
    STATE.xray = params.get('xray') === '1';
  }
  if (params.has('thermal')) {
    STATE.thermal = params.get('thermal') === '1';
  }
  if (params.has('explode')) {
    takeManualControl();
    STATE.explodeSlider = Number(params.get('explode'));
    STATE.wExploded = STATE.explodeSlider;
    STATE.labels = true;
  }
  syncShaderModesToMats();
  if (params.has('unit') && UNIT_CONFIG[params.get('unit')]) {
    STATE.unit = params.get('unit');
    buildUnitUI();
  }
})();
