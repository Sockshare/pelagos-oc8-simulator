/**
 * Pelagos OC-8 (Robotic Octopus) & Hexapod HX-18 (18-DOF Walker) — 3D Field Simulator
 * Built on the elvarofficial/teardown 1600x900 responsive studio architecture.
 */
(function () {
  'use strict';

  const W = 1600;
  const H = 900;
  const DURATION = 25.0;
  const D2R = Math.PI / 180;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoother = (x) => {
    const u = clamp(x, 0, 1);
    return u * u * u * (u * (u * 6 - 15) + 10);
  };
  const ss = (a, b, t) => smoother((t - a) / Math.max(1e-5, b - a));

  // -------------------------------------------------------------------------
  // 1. RESPONSIVE 1600x900 VIEWPORT SCALING
  // -------------------------------------------------------------------------
  const appEl = document.getElementById('app');
  const canvas = document.getElementById('gl');
  let stageScale = 1;

  function fitViewport() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    stageScale = Math.min(vw / W, vh / H);
    const tx = (vw - W * stageScale) * 0.5;
    const ty = (vh - H * stageScale) * 0.5;
    appEl.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${stageScale.toFixed(5)})`;
    if (renderer) {
      const pr = renderer.isSoftwareRenderer ? 1 : clamp((window.devicePixelRatio || 1) * stageScale, 1, 2);
      renderer.setPixelRatio(pr);
      renderer.setSize(W, H, false);
    }
  }
  window.addEventListener('resize', fitViewport);

  // -------------------------------------------------------------------------
  // 2. BACKGROUND TECHNICAL DRAFTING OVERLAY (SVG — BUILT ONCE, ROTATED VIA DOM)
  // -------------------------------------------------------------------------
  const draftingSvg = document.getElementById('drafting-svg');
  let draftingRotorEl = null;
  function initDraftingBackdrop() {
    const cx = 800;
    const cy = 448;
    let s = '';

    // Top-center two rows of 14 orange '+' crosshairs under JET LOAD
    let crossPath = '';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 14; c++) {
        const x = 642 + c * 24.5;
        const y = 94 + r * 20;
        crossPath += `M${x - 3} ${y} H${x + 3} M${x} ${y - 3} V${y + 3} `;
      }
    }
    s += `<path d="${crossPath}" stroke="#eb4d28" stroke-width="0.9" opacity="0.58"/>`;

    // Corner framing ticks in viewport
    s += `<path d="M344 134 V178 M344 134 H388" stroke="#d5cfc3" stroke-width="0.9" fill="none" stroke-dasharray="2 3"/>`;
    s += `<path d="M1256 736 V692 M1256 736 H1212" stroke="#eb4d28" stroke-width="0.9" fill="none" stroke-dasharray="3 3" opacity="0.55"/>`;

    // Bottom horizontal fine ruler hatching (single combined path)
    let rulerPath = '';
    for (let i = 0; i < 62; i++) {
      const x1 = 24 + i * 5;
      const x2 = 1280 + i * 5;
      const h = i % 5 === 0 ? 12 : 7;
      rulerPath += `M${x1} ${868 - h} V868 M${x2} ${868 - h} V868 `;
    }
    s += `<path d="${rulerPath}" stroke="#d8d2c5" stroke-width="0.7" opacity="0.65"/>`;

    // Concentric polar drafting circles & orbital rings
    s += `<g transform="translate(${cx} ${cy})">`;
    s += `<circle cx="0" cy="0" r="308" fill="none" stroke="#cfcac0" stroke-width="0.9" opacity="0.75"/>`;
    s += `<circle cx="0" cy="0" r="228" fill="none" stroke="#d7d2c8" stroke-width="0.8" stroke-dasharray="4 4" opacity="0.7"/>`;
    s += `<circle cx="0" cy="0" r="386" fill="none" stroke="#dedad0" stroke-width="0.7" opacity="0.6"/>`;

    // Rotating orbital ellipses and degree ticks
    s += `<g id="drafting-rotor" transform="rotate(0)">`;
    s += `<ellipse cx="0" cy="0" rx="348" ry="168" fill="none" stroke="#ccc6ba" stroke-width="0.85" stroke-dasharray="5 4" transform="rotate(-24)"/>`;
    s += `<ellipse cx="0" cy="0" rx="285" ry="120" fill="none" stroke="#d4cfc4" stroke-width="0.75" transform="rotate(32)"/>`;
    s += `<line x1="-420" y1="-210" x2="420" y2="210" stroke="#d4cfc4" stroke-width="0.7" opacity="0.65"/>`;
    s += `<line x1="-360" y1="250" x2="360" y2="-250" stroke="#d4cfc4" stroke-width="0.7" stroke-dasharray="3 4" opacity="0.65"/>`;

    let ticksPath = '';
    for (let i = 0; i < 36; i++) {
      const a = (i * 10 * Math.PI) / 180;
      const r1 = 304;
      const r2 = i % 3 === 0 ? 314 : 309;
      ticksPath += `M${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)} L${(Math.cos(a) * r2).toFixed(1)} ${(Math.sin(a) * r2).toFixed(1)} `;
    }
    s += `<path d="${ticksPath}" stroke="#b8b1a4" stroke-width="0.8"/>`;

    for (const [ang, rad] of [[38, 308], [142, 308], [215, 308], [312, 308], [-55, 228], [115, 228]]) {
      const a = (ang * Math.PI) / 180;
      const nx = (Math.cos(a) * rad).toFixed(1);
      const ny = (Math.sin(a) * rad).toFixed(1);
      s += `<circle cx="${nx}" cy="${ny}" r="4.2" fill="#f5f2ea" stroke="#8e887e" stroke-width="1"/>`;
      s += `<circle cx="${nx}" cy="${ny}" r="1.3" fill="#8e887e"/>`;
    }
    s += `</g></g>`;
    draftingSvg.innerHTML = s;
    draftingRotorEl = document.getElementById('drafting-rotor');
  }
  initDraftingBackdrop();

  let lastRotorDeg = -999;
  function renderDraftingBackdrop(camAz) {
    if (!draftingRotorEl) return;
    const rotDeg = Math.round(((camAz * 180) / Math.PI) * 0.35 * 2) * 0.5;
    if (rotDeg !== lastRotorDeg) {
      lastRotorDeg = rotDeg;
      draftingRotorEl.setAttribute('transform', `rotate(${rotDeg.toFixed(1)})`);
    }
  }

  // -------------------------------------------------------------------------
  // 3. THREE.JS STUDIO STAGE, LIGHTING, MATERIALS & 60-FPS Z-BUFFER RASTERIZER
  // -------------------------------------------------------------------------
  function createSoftware3DRenderer(canvasEl) {
    const ctx = canvasEl.getContext('2d', { alpha: true, desynchronized: true });
    const SW_SCALE = 0.85;
    const curW = Math.round(W * SW_SCALE);
    const curH = Math.round(H * SW_SCALE);
    canvasEl.width = curW;
    canvasEl.height = curH;

    const imgData = ctx.createImageData(curW, curH);
    const pix32 = new Uint32Array(imgData.data.buffer);
    const zBuf = new Float32Array(curW * curH);
    zBuf.fill(-1e9);

    // Pre-bake soft studio floor contact shadow into a reusable row/pixel list at curW x curH
    const shadowPixels = [];
    const shCx = Math.round(800 * SW_SCALE);
    const shCy = Math.round(665 * SW_SCALE);
    const shRx = Math.round(340 * SW_SCALE);
    const shRy = Math.round(82 * SW_SCALE);
    for (let y = shCy - shRy; y <= shCy + shRy; y++) {
      const dy = (y - shCy) / shRy;
      const dy2 = dy * dy;
      if (dy2 >= 1) continue;
      const xSpan = Math.floor(shRx * Math.sqrt(1 - dy2));
      const rowOff = y * curW;
      for (let x = shCx - xSpan; x <= shCx + xSpan; x++) {
        const dx = (x - shCx) / shRx;
        const r = Math.sqrt(dx * dx + dy2);
        if (r < 1) {
          const t = 1 - r;
          const a = Math.round(t * t * 38);
          if (a > 0) {
            shadowPixels.push(rowOff + x, (a << 24) | (61 << 16) | (69 << 8) | 74);
          }
        }
      }
    }

    let dirtyMinX = 0;
    let dirtyMaxX = curW - 1;
    let dirtyMinY = 0;
    let dirtyMaxY = curH - 1;

    // Small queue for transparent triangles (glass ports & wake rings) rendered after opaque pass
    const MAX_TRANS = 2048;
    const trX0 = new Float32Array(MAX_TRANS);
    const trY0 = new Float32Array(MAX_TRANS);
    const trZ0 = new Float32Array(MAX_TRANS);
    const trX1 = new Float32Array(MAX_TRANS);
    const trY1 = new Float32Array(MAX_TRANS);
    const trZ1 = new Float32Array(MAX_TRANS);
    const trX2 = new Float32Array(MAX_TRANS);
    const trY2 = new Float32Array(MAX_TRANS);
    const trZ2 = new Float32Array(MAX_TRANS);
    const trColor = new Uint32Array(MAX_TRANS);
    let transCount = 0;

    const _mvMat = new THREE.Matrix4();
    const _mvpMat = new THREE.Matrix4();
    const _vpMat = new THREE.Matrix4();
    let _viewMat = null;

    function getGeoCache(geo) {
      if (geo.__swCache) return geo.__swCache;
      const posAttr = geo.attributes.position;
      if (!posAttr) return null;
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const normAttr = geo.attributes.normal;
      const posArr = posAttr.array;
      const normArr = normAttr ? normAttr.array : null;
      const indexAttr = geo.index;
      let indices;
      if (indexAttr) {
        indices = indexAttr.array;
      } else {
        indices = new Uint32Array(posAttr.count);
        for (let i = 0; i < posAttr.count; i++) indices[i] = i;
      }
      const nTris = Math.floor(indices.length / 3);
      const fNormals = new Float32Array(nTris * 3);
      for (let t = 0; t < nTris; t++) {
        const i0 = indices[t * 3] * 3;
        const i1 = indices[t * 3 + 1] * 3;
        const i2 = indices[t * 3 + 2] * 3;
        if (normArr) {
          const nx = normArr[i0] + normArr[i1] + normArr[i2];
          const ny = normArr[i0 + 1] + normArr[i1 + 1] + normArr[i2 + 1];
          const nz = normArr[i0 + 2] + normArr[i1 + 2] + normArr[i2 + 2];
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          fNormals[t * 3] = nx / len;
          fNormals[t * 3 + 1] = ny / len;
          fNormals[t * 3 + 2] = nz / len;
        } else {
          fNormals[t * 3 + 1] = 1;
        }
      }
      geo.__swCache = {
        posArr,
        vCount: posAttr.count,
        indices,
        nTris,
        fNormals,
        vScreen: new Float32Array(posAttr.count * 3),
      };
      return geo.__swCache;
    }

    function rasterizeTriangle(x0, y0, z0, x1, y1, z1, x2, y2, z2, abgr, isTransparent) {
      let area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
      if (area < 0) {
        let tx = x1, ty = y1, tz = z1;
        x1 = x2; y1 = y2; z1 = z2;
        x2 = tx; y2 = ty; z2 = tz;
        area = -area;
      }
      if (area < 0.15) return;

      const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
      const maxX = Math.min(curW - 1, Math.ceil(Math.max(x0, x1, x2)));
      const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
      const maxY = Math.min(curH - 1, Math.ceil(Math.max(y0, y1, y2)));
      if (minX > maxX || minY > maxY) return;

      if (minX < dirtyMinX) dirtyMinX = minX;
      if (maxX > dirtyMaxX) dirtyMaxX = maxX;
      if (minY < dirtyMinY) dirtyMinY = minY;
      if (maxY > dirtyMaxY) dirtyMaxY = maxY;

      const invArea = 1.0 / area;
      const dzdx = ((z1 - z0) * (y2 - y0) - (z2 - z0) * (y1 - y0)) * invArea;
      const dzdy = ((z2 - z0) * (x1 - x0) - (z1 - z0) * (x2 - x0)) * invArea;

      const A12 = y1 - y2, B12 = x2 - x1;
      const A20 = y2 - y0, B20 = x0 - x2;
      const A01 = y0 - y1, B01 = x1 - x0;

      const startX = minX + 0.5;
      const startY = minY + 0.5;

      let w0_row = A12 * (startX - x1) + B12 * (startY - y1);
      let w1_row = A20 * (startX - x2) + B20 * (startY - y2);
      let w2_row = A01 * (startX - x0) + B01 * (startY - y0);
      let z_row = z0 + (startX - x0) * dzdx + (startY - y0) * dzdy;

      if (!isTransparent) {
        for (let y = minY; y <= maxY; y++) {
          let w0 = w0_row;
          let w1 = w1_row;
          let w2 = w2_row;
          let z = z_row;
          let idx = y * curW + minX;
          for (let x = minX; x <= maxX; x++, idx++) {
            if (w0 >= -0.05 && w1 >= -0.05 && w2 >= -0.05) {
              if (z > zBuf[idx]) {
                zBuf[idx] = z;
                pix32[idx] = abgr;
              }
            }
            w0 += A12;
            w1 += A20;
            w2 += A01;
            z += dzdx;
          }
          w0_row += B12;
          w1_row += B20;
          w2_row += B01;
          z_row += dzdy;
        }
      } else {
        const sr = abgr & 0xff;
        const sg = (abgr >> 8) & 0xff;
        const sb = (abgr >> 16) & 0xff;
        const sa = (abgr >>> 24) & 0xff;
        const invA = 255 - sa;
        for (let y = minY; y <= maxY; y++) {
          let w0 = w0_row;
          let w1 = w1_row;
          let w2 = w2_row;
          let z = z_row;
          let idx = y * curW + minX;
          for (let x = minX; x <= maxX; x++, idx++) {
            if (w0 >= 0 && w1 >= 0 && w2 >= 0 && z > zBuf[idx]) {
              const dst = pix32[idx];
              const da = (dst >>> 24) & 0xff;
              if (da === 0) {
                pix32[idx] = abgr;
              } else {
                const dr = dst & 0xff;
                const dg = (dst >> 8) & 0xff;
                const db = (dst >> 16) & 0xff;
                const nr = (sr * sa + dr * invA) >> 8;
                const ng = (sg * sa + dg * invA) >> 8;
                const nb = (sb * sa + db * invA) >> 8;
                const na = Math.min(255, sa + ((da * invA) >> 8));
                pix32[idx] = (na << 24) | (nb << 16) | (ng << 8) | nr;
              }
            }
            w0 += A12;
            w1 += A20;
            w2 += A01;
            z += dzdx;
          }
          w0_row += B12;
          w1_row += B20;
          w2_row += B01;
          z_row += dzdy;
        }
      }
    }

    function visit(node, parentMW) {
      if (!node.visible || node === floorShadow) return;
      if (node.matrixAutoUpdate) node.updateMatrix();
      if (parentMW) {
        node.matrixWorld.multiplyMatrices(parentMW, node.matrix);
      } else {
        node.matrixWorld.copy(node.matrix);
      }
      const mwObj = node.matrixWorld;
      if (node.isMesh && node.geometry && node.material) {
        const cache = getGeoCache(node.geometry);
        if (cache) {
          _mvMat.multiplyMatrices(_viewMat, mwObj);
          _mvpMat.multiplyMatrices(_vpMat, mwObj);
          const m = _mvpMat.elements;
          const mv = _mvMat.elements;
          const mw = mwObj.elements;
          const invMeshScale = 1.0 / (Math.sqrt(mw[0] * mw[0] + mw[1] * mw[1] + mw[2] * mw[2]) || 1);

          const posArr = cache.posArr;
          const vScreen = cache.vScreen;
          const vCount = cache.vCount;

          for (let v = 0; v < vCount; v++) {
            const idx = v * 3;
            const x = posArr[idx];
            const y = posArr[idx + 1];
            const z = posArr[idx + 2];
            const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
            if (cw <= 0.05) {
              vScreen[idx + 2] = 10;
            } else {
              const invW = 1.0 / cw;
              vScreen[idx] = ((m[0] * x + m[4] * y + m[8] * z + m[12]) * invW * 0.5 + 0.5) * curW;
              vScreen[idx + 1] = (-(m[1] * x + m[5] * y + m[9] * z + m[13]) * invW * 0.5 + 0.5) * curH;
              vScreen[idx + 2] = mv[2] * x + mv[6] * y + mv[10] * z + mv[14];
            }
          }

          const mat = node.material;
          const baseCol = mat.color || { r: 0.9, g: 0.9, b: 0.9 };
          const emCol = mat.emissive || { r: 0, g: 0, b: 0 };
          let baseR = baseCol.r * 255 + emCol.r * 160;
          let baseG = baseCol.g * 255 + emCol.g * 160;
          let baseB = baseCol.b * 255 + emCol.b * 160;
          let isTrans = !!mat.transparent && (mat.opacity ?? 1) < 0.95;
          let a8 = isTrans ? Math.round((mat.opacity ?? 0.4) * 255) : 255;

          // Feature 3: Live X-Ray / Ghost Shell Mode
          if (typeof STATE !== 'undefined' && STATE.xray && mat === MATS.ceramic) {
            isTrans = true;
            a8 = Math.round((1 - (STATE.xrayOpacity ?? 0.72)) * 255);
            baseR = 38;
            baseG = 48;
            baseB = 62;
          }

          // Feature 5: Thermal / Stress Heatmap Mode
          const isThermal = typeof STATE !== 'undefined' && STATE.thermal;
          if (isThermal) {
            if (mat === MATS.orange) {
              baseR = 255; baseG = 215; baseB = 45;
            } else if (mat === MATS.steel) {
              baseR = 255; baseG = 95; baseB = 25;
            } else if (mat === MATS.gunmetal || mat === MATS.carbon) {
              baseR = 195; baseG = 42; baseB = 135;
            } else if (mat === MATS.ceramic) {
              baseR = 28; baseG = 138; baseB = 225;
            }
          }

          const isDouble = mat.side === THREE.DoubleSide || isTrans;
          const isBack = mat.side === THREE.BackSide && !isTrans;
          const isBasic = !!mat.isMeshBasicMaterial;
          const rough = mat.roughness ?? 0.4;
          const specStrength = (1 - rough) * 58;

          const indices = cache.indices;
          const fNormals = cache.fNormals;
          const nTris = cache.nTris;

          for (let t = 0; t < nTris; t++) {
            const i0 = indices[t * 3] * 3;
            const i1 = indices[t * 3 + 1] * 3;
            const i2 = indices[t * 3 + 2] * 3;

            const vz0 = vScreen[i0 + 2];
            const vz1 = vScreen[i1 + 2];
            const vz2 = vScreen[i2 + 2];
            if (vz0 > -0.05 || vz1 > -0.05 || vz2 > -0.05) continue;

            const sx0 = vScreen[i0];
            const sy0 = vScreen[i0 + 1];
            const sx1 = vScreen[i1];
            const sy1 = vScreen[i1 + 1];
            const sx2 = vScreen[i2];
            const sy2 = vScreen[i2 + 1];

            const cross = (sx1 - sx0) * (sy2 - sy0) - (sy1 - sy0) * (sx2 - sx0);
            if (!isDouble) {
              if (isBack ? cross <= 0 : cross >= 0) continue;
            }

            let r, g, b;
            if (isBasic) {
              r = Math.min(255, baseR | 0);
              g = Math.min(255, baseG | 0);
              b = Math.min(255, baseB | 0);
            } else {
              const fnx = fNormals[t * 3];
              const fny = fNormals[t * 3 + 1];
              const fnz = fNormals[t * 3 + 2];
              const flip = cross > 0 ? -invMeshScale : invMeshScale;
              const wx = (mw[0] * fnx + mw[4] * fny + mw[8] * fnz) * flip;
              const wy = (mw[1] * fnx + mw[5] * fny + mw[9] * fnz) * flip;
              const wz = (mw[2] * fnx + mw[6] * fny + mw[10] * fnz) * flip;

              const dKey = Math.max(0, wx * -0.42 + wy * 0.78 + wz * 0.46);
              const dFill = Math.max(0, wx * 0.74 + wy * 0.43 + wz * 0.51);
              const dRim = Math.max(0, -wz * 0.7 + wy * 0.3);
              const hemi = 0.46 + 0.16 * wy;
              const diff = hemi + dKey * 0.58 + dFill * 0.24 + dRim * 0.16;

              const halfDot = Math.max(0, wx * -0.18 + wy * 0.48 + wz * 0.86);
              const h2 = halfDot * halfDot;
              const h4 = h2 * h2;
              const spec = h4 * h4 * h4 * specStrength;

              r = Math.min(255, Math.max(0, (baseR * diff + spec) | 0));
              g = Math.min(255, Math.max(0, (baseG * diff + spec) | 0));
              b = Math.min(255, Math.max(0, (baseB * diff + spec) | 0));
            }

            const abgr = ((a8 << 24) | (b << 16) | (g << 8) | r) >>> 0;
            if (!isTrans) {
              rasterizeTriangle(sx0, sy0, vz0, sx1, sy1, vz1, sx2, sy2, vz2, abgr, false);
            } else if (transCount < MAX_TRANS) {
              trX0[transCount] = sx0; trY0[transCount] = sy0; trZ0[transCount] = vz0;
              trX1[transCount] = sx1; trY1[transCount] = sy1; trZ1[transCount] = vz1;
              trX2[transCount] = sx2; trY2[transCount] = sy2; trZ2[transCount] = vz2;
              trColor[transCount] = abgr;
              transCount++;
            }
          }
        }
      }
      const children = node.children;
      for (let c = 0; c < children.length; c++) {
        visit(children[c], mwObj);
      }
    }

    return {
      isSoftwareRenderer: true,
      setClearColor() {},
      setPixelRatio() {},
      setSize() {},
      render(scn, cam) {
        if (!ctx) return;
        cam.updateMatrixWorld(true);
        cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
        _vpMat.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        _viewMat = cam.matrixWorldInverse;

        // Fast-clear only the dirty bounding box from previous frame
        for (let y = dirtyMinY; y <= dirtyMaxY; y++) {
          const rowStart = y * curW + dirtyMinX;
          const rowEnd = y * curW + dirtyMaxX + 1;
          pix32.fill(0, rowStart, rowEnd);
          zBuf.fill(-1e9, rowStart, rowEnd);
        }
        dirtyMinX = shCx - shRx;
        dirtyMaxX = shCx + shRx;
        dirtyMinY = shCy - shRy;
        dirtyMaxY = shCy + shRy;

        // Stamp pre-baked floor shadow pixels (~0.04ms)
        for (let i = 0; i < shadowPixels.length; i += 2) {
          pix32[shadowPixels[i]] = shadowPixels[i + 1];
        }

        transCount = 0;
        visit(scn, null);

        // Render transparent triangles (glass inspection port, glass links, wake rings)
        for (let i = 0; i < transCount; i++) {
          rasterizeTriangle(
            trX0[i], trY0[i], trZ0[i],
            trX1[i], trY1[i], trZ1[i],
            trX2[i], trY2[i], trZ2[i],
            trColor[i],
            true
          );
        }

        ctx.putImageData(imgData, 0, 0);
      },
    };
  }

  let renderer = null;
  const forceSw = new URLSearchParams(window.location.search).get('sw') === '1';
  if (!forceSw) {
    try {
      const testCanvas = document.createElement('canvas');
      const testGl =
        testCanvas.getContext('webgl2') ||
        testCanvas.getContext('webgl') ||
        testCanvas.getContext('experimental-webgl');
      if (testGl) {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'default',
        });
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.LinearToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
    } catch (e) {
      renderer = null;
    }
  }
  if (!renderer) {
    renderer = createSoftware3DRenderer(canvas);
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 120);

  // High-contrast studio lighting (no white PMREM wash, keeping blacks deep & orange vivid)
  const hemiLight = new THREE.HemisphereLight('#fffdf9', '#b8b1a4', 0.72);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight('#ffffff', 1.25);
  keyLight.position.set(-4.5, 8.5, 6.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -4.8;
  keyLight.shadow.camera.right = 4.8;
  keyLight.shadow.camera.top = 4.8;
  keyLight.shadow.camera.bottom = -4.8;
  keyLight.shadow.camera.near = 1.0;
  keyLight.shadow.camera.far = 22.0;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight('#f2f4f8', 0.52);
  fillLight.position.set(6.0, 3.5, 4.0);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight('#ffefe6', 0.45);
  rimLight.position.set(0.5, -4.0, -6.0);
  scene.add(rimLight);

  // Subtle floor shadow catcher
  const floorShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.ShadowMaterial({ color: 0x4a453d, opacity: 0.16 })
  );
  floorShadow.rotation.x = -Math.PI / 2;
  floorShadow.position.y = -2.05;
  floorShadow.receiveShadow = true;
  scene.add(floorShadow);

  // High-contrast PBR Studio Materials matching Pelagos OC-8 & Telson SC-8 frames
  const MATS = {
    ceramic: new THREE.MeshStandardMaterial({
      color: '#f4f2ec',
      roughness: 0.42,
      metalness: 0.04,
    }),
    ceramicInner: new THREE.MeshStandardMaterial({
      color: '#23252a',
      roughness: 0.65,
      metalness: 0.15,
      side: THREE.BackSide,
    }),
    gunmetal: new THREE.MeshStandardMaterial({
      color: '#181a1e',
      roughness: 0.38,
      metalness: 0.28,
    }),
    carbon: new THREE.MeshStandardMaterial({
      color: '#0d0e11',
      roughness: 0.55,
      metalness: 0.15,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: '#aeb4bc',
      roughness: 0.3,
      metalness: 0.65,
    }),
    orange: new THREE.MeshStandardMaterial({
      color: '#eb4d28',
      emissive: '#380d02',
      roughness: 0.32,
      metalness: 0.08,
    }),
    lensGlass: new THREE.MeshStandardMaterial({
      color: '#07080a',
      roughness: 0.12,
      metalness: 0.2,
    }),
    portGlass: new THREE.MeshStandardMaterial({
      color: '#1c1e22',
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: '#141518',
      roughness: 0.72,
      metalness: 0.08,
    }),
    wakeRing: new THREE.MeshBasicMaterial({
      color: '#eb4d28',
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    }),
  };

  // Helper to create toothed Involute Gear geometry
  function createGearGeometry(teeth, rOuter, rRoot, thickness, holeRadius) {
    const sh = new THREE.Shape();
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a0 = i * step;
      const pts = [
        [rRoot, a0],
        [rRoot, a0 + step * 0.18],
        [rOuter, a0 + step * 0.32],
        [rOuter, a0 + step * 0.62],
        [rRoot, a0 + step * 0.76],
      ];
      for (let k = 0; k < pts.length; k++) {
        const x = Math.cos(pts[k][1]) * pts[k][0];
        const y = Math.sin(pts[k][1]) * pts[k][0];
        if (i === 0 && k === 0) sh.moveTo(x, y);
        else sh.lineTo(x, y);
      }
    }
    sh.closePath();
    if (holeRadius > 0) {
      const hole = new THREE.Path();
      hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
      sh.holes.push(hole);
    }
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: thickness * 0.08,
      bevelSize: thickness * 0.06,
      bevelSegments: 1,
    });
    geo.translate(0, 0, -thickness * 0.5);
    return geo;
  }

  function castMesh(geo, mat, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }

  // -------------------------------------------------------------------------
  // 4. BUILD PELAGOS OC-8 (8-ARM ROBOTIC OCTOPUS DRONE)
  // -------------------------------------------------------------------------
  function buildPelagosModel() {
    const root = new THREE.Group();

    // 4A. Internal Pump Core, Reactor Ring & Helical Drive Gears (Inside Mantle)
    const pumpCoreGroup = new THREE.Group();
    pumpCoreGroup.position.set(0, 0.42, 0);
    pumpCoreGroup.scale.setScalar(0.64);
    root.add(pumpCoreGroup);

    // Central gunmetal core manifold
    castMesh(new THREE.CylinderGeometry(0.46, 0.42, 0.88, 28), MATS.gunmetal, pumpCoreGroup);
    castMesh(new THREE.SphereGeometry(0.52, 24, 18), MATS.carbon, pumpCoreGroup);

    // Reactor Ring (Upper Pump Drive with safety-orange segments)
    const reactorRing = new THREE.Group();
    reactorRing.position.set(0, 0.34, 0);
    pumpCoreGroup.add(reactorRing);
    castMesh(new THREE.TorusGeometry(0.42, 0.065, 14, 36), MATS.gunmetal, reactorRing).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const seg = castMesh(new THREE.BoxGeometry(0.12, 0.08, 0.09), i % 2 === 0 ? MATS.orange : MATS.steel, reactorRing);
      seg.position.set(Math.cos(a) * 0.42, 0.02, Math.sin(a) * 0.42);
      seg.rotation.y = -a;
    }

    // Drive Gears (44 + 18 Teeth)
    const gear44 = castMesh(createGearGeometry(28, 0.34, 0.28, 0.08, 0.12), MATS.gunmetal, pumpCoreGroup);
    gear44.position.set(-0.18, 0.16, 0.38);
    gear44.rotation.x = 0.25;
    const gear44Hub = castMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 18), MATS.orange, gear44);
    gear44Hub.rotation.x = Math.PI / 2;

    const gear18 = castMesh(createGearGeometry(16, 0.21, 0.16, 0.08, 0.06), MATS.steel, pumpCoreGroup);
    gear18.position.set(0.22, 0.22, 0.42);
    gear18.rotation.x = 0.25;

    // 7 Axial/Radial Pistons around Pump Core
    const pistons = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const pHolder = new THREE.Group();
      pHolder.rotation.y = a;
      pumpCoreGroup.add(pHolder);

      const barrel = castMesh(new THREE.CylinderGeometry(0.085, 0.085, 0.42, 16), MATS.gunmetal, pHolder);
      barrel.position.set(0.46, -0.08, 0);
      const collar = castMesh(new THREE.CylinderGeometry(0.095, 0.095, 0.05, 16), MATS.orange, pHolder);
      collar.position.set(0.46, 0.11, 0);
      const rod = castMesh(new THREE.CylinderGeometry(0.052, 0.052, 0.36, 14), MATS.steel, pHolder);
      rod.position.set(0.46, 0.06, 0);
      pistons.push(rod);
    }

    // Braided hydraulic/pneumatic hoses wrapping the internal core (like octopus_1_f12.png)
    for (let h = 0; h < 14; h++) {
      const a0 = (h / 14) * Math.PI * 2;
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        const ang = a0 + (u - 0.5) * 1.6 + Math.sin(u * Math.PI * 2 + h) * 0.25;
        const rad = 0.52 + Math.sin(u * Math.PI) * 0.09 + (h % 3) * 0.025;
        const yy = -0.36 + u * 0.78;
        pts.push(new THREE.Vector3(Math.cos(ang) * rad, yy, Math.sin(ang) * rad));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.022 + (h % 2) * 0.008, 8, false);
      castMesh(tubeGeo, MATS.carbon, pumpCoreGroup);
    }

    // Lower Mantle Structural Bowl (dark internal socket holding the petals)
    const lowerBowl = new THREE.Group();
    lowerBowl.position.set(0, 0.12, 0);
    root.add(lowerBowl);
    const bowlPts = [
      new THREE.Vector2(0.25, -0.35),
      new THREE.Vector2(0.68, -0.25),
      new THREE.Vector2(0.86, 0.02),
      new THREE.Vector2(0.89, 0.22),
      new THREE.Vector2(0.82, 0.22),
      new THREE.Vector2(0.62, -0.18),
      new THREE.Vector2(0.25, -0.28),
    ];
    castMesh(new THREE.LatheGeometry(bowlPts, 36), MATS.gunmetal, lowerBowl);
    // Equator seam ring with orange stripe
    const eqRing = castMesh(new THREE.TorusGeometry(0.88, 0.022, 12, 48), MATS.gunmetal, lowerBowl);
    eqRing.rotation.x = Math.PI / 2;
    eqRing.position.y = 0.21;

    // 4B. 6 Hinged Ceramic-White Mantle Shell Petals + Top Apex Cap
    const topCap = new THREE.Group();
    topCap.position.set(0, 1.32, 0);
    root.add(topCap);
    castMesh(new THREE.CylinderGeometry(0.24, 0.31, 0.08, 32), MATS.gunmetal, topCap);
    castMesh(new THREE.CylinderGeometry(0.18, 0.22, 0.095, 32), MATS.ceramic, topCap);
    castMesh(new THREE.TorusGeometry(0.12, 0.018, 10, 24), MATS.orange, topCap).rotation.x = Math.PI / 2;

    const petals = [];
    const N_PETALS = 6;
    const petalSpan = (Math.PI * 2) / N_PETALS - 0.038;
    const domeProf = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const th = u * (Math.PI * 0.44);
      const r = Math.cos(th) * 0.88;
      const y = 0.28 + Math.sin(th) * 0.96;
      domeProf.push(new THREE.Vector2(Math.max(0.24, r), y));
    }

    for (let p = 0; p < N_PETALS; p++) {
      const az = (p / N_PETALS) * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.position.set(Math.sin(az) * 0.88, 0.28, Math.cos(az) * 0.88);
      pivot.rotation.y = az;
      root.add(pivot);

      const leaf = new THREE.Group();
      leaf.position.set(0, -0.28, -0.88);
      pivot.add(leaf);

      const isGlassPetal = p === 0; // Front Petal 3 with Glass Port
      if (isGlassPetal) {
        // Left & right border ribs + smoked glass inspection port in center
        const leftRib = new THREE.LatheGeometry(domeProf, 8, -petalSpan * 0.5, petalSpan * 0.24);
        const rightRib = new THREE.LatheGeometry(domeProf, 8, petalSpan * 0.26, petalSpan * 0.24);
        castMesh(leftRib, MATS.ceramic, leaf);
        castMesh(rightRib, MATS.ceramic, leaf);
        const glassGeo = new THREE.LatheGeometry(domeProf, 14, -petalSpan * 0.26, petalSpan * 0.52);
        castMesh(glassGeo, MATS.portGlass, leaf);
        // Subtle orange lower port sill decal flush with shell curve
        const sill = castMesh(new THREE.BoxGeometry(0.24, 0.055, 0.03), MATS.orange, leaf);
        sill.position.set(0, 0.46, 0.84);
        sill.rotation.x = -0.22;
      } else {
        const outerGeo = new THREE.LatheGeometry(domeProf, 16, -petalSpan * 0.5, petalSpan);
        castMesh(outerGeo, MATS.ceramic, leaf);
        const innerProf = domeProf.map((v) => new THREE.Vector2(Math.max(0.21, v.x - 0.04), v.y - 0.01));
        const innerGeo = new THREE.LatheGeometry(innerProf, 12, -petalSpan * 0.48, petalSpan * 0.96);
        castMesh(innerGeo, MATS.ceramicInner, leaf);

        // Flush orange accent tab on petals
        const decal = castMesh(new THREE.BoxGeometry(0.11, 0.04, 0.02), MATS.orange, leaf);
        decal.position.set(0.08, 0.64, 0.78);
        decal.rotation.x = -0.38;
      }

      // Black pin-rivets along the petal edges (signature Pelagos OC-8 look)
      const rivetGeo = new THREE.SphereGeometry(0.014, 6, 4);
      for (const sgn of [-1, 1]) {
        const edgeA = sgn * (petalSpan * 0.43);
        for (let r = 1; r <= 6; r++) {
          const pt = domeProf[r * 2];
          const riv = castMesh(rivetGeo, MATS.carbon, leaf);
          riv.position.set(Math.sin(edgeA) * (pt.x + 0.008), pt.y, Math.cos(edgeA) * (pt.x + 0.008));
        }
      }

      petals.push({ pivot, az });
    }

    // 4C. Dual 52mm Optical Domes (OPTIC ARRAY: Left & Right Lateral Eyes)
    const optics = [];
    const eyeRivetGeo = new THREE.SphereGeometry(0.014, 6, 4);
    for (const side of [-1, 1]) {
      const optGroup = new THREE.Group();
      const basePos = new THREE.Vector3(side * 0.62, 0.16, 0.54);
      optGroup.position.copy(basePos);
      optGroup.lookAt(side * 1.4, 0.12, 1.35);
      root.add(optGroup);

      // Ceramic outer eye pod shroud
      const shroud = castMesh(new THREE.CylinderGeometry(0.34, 0.39, 0.28, 28), MATS.ceramic, optGroup);
      shroud.rotation.x = Math.PI / 2;
      // Rivets around eye shroud
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rv = castMesh(eyeRivetGeo, MATS.carbon, optGroup);
        rv.position.set(Math.cos(a) * 0.355, Math.sin(a) * 0.355, 0.04);
      }

      // Telescoping sub-parts inside each Optic Array
      const irRim = castMesh(new THREE.TorusGeometry(0.275, 0.032, 12, 28), MATS.orange, optGroup);
      irRim.position.z = 0.13;

      const baffle = castMesh(new THREE.CylinderGeometry(0.25, 0.22, 0.18, 24), MATS.gunmetal, optGroup);
      baffle.rotation.x = Math.PI / 2;
      baffle.position.z = 0.11;

      const lens = castMesh(new THREE.SphereGeometry(0.21, 18, 14), MATS.lensGlass, optGroup);
      lens.scale.set(1, 1, 0.45);
      lens.position.z = 0.14;

      const gimbalSled = castMesh(new THREE.CylinderGeometry(0.16, 0.18, 0.22, 16), MATS.steel, optGroup);
      gimbalSled.rotation.x = Math.PI / 2;
      gimbalSled.position.z = -0.04;

      optics.push({
        group: optGroup,
        basePos,
        dir: basePos.clone().normalize(),
        shroud,
        irRim,
        baffle,
        lens,
        gimbalSled,
      });
    }

    // 4D. Ventral/Rear 3-Sleeve Telescopic Siphon & 6-Flap Vectoring Nozzle
    const siphonGroup = new THREE.Group();
    const siphonBasePos = new THREE.Vector3(0, -0.08, -0.78);
    siphonGroup.position.copy(siphonBasePos);
    siphonGroup.rotation.x = -0.45;
    root.add(siphonGroup);

    const siphonSleeves = [];
    for (let s = 0; s < 3; s++) {
      const sl = new THREE.Group();
      siphonGroup.add(sl);
      const rTop = 0.28 - s * 0.045;
      const rBot = 0.25 - s * 0.045;
      const body = castMesh(new THREE.CylinderGeometry(rTop, rBot, 0.24, 20), s === 1 ? MATS.gunmetal : MATS.ceramic, sl);
      body.rotation.x = Math.PI / 2;
      const ring = castMesh(new THREE.TorusGeometry(rBot, 0.018, 8, 22), MATS.orange, sl);
      ring.position.z = -0.11;
      siphonSleeves.push(sl);
    }

    const siphonFlaps = [];
    const nozzleHub = new THREE.Group();
    siphonGroup.add(nozzleHub);
    for (let f = 0; f < 6; f++) {
      const a = (f / 6) * Math.PI * 2;
      const flapPivot = new THREE.Group();
      flapPivot.position.set(Math.cos(a) * 0.15, Math.sin(a) * 0.15, -0.42);
      flapPivot.rotation.z = a;
      nozzleHub.add(flapPivot);
      const flapMesh = castMesh(new THREE.BoxGeometry(0.03, 0.09, 0.16), f % 2 === 0 ? MATS.gunmetal : MATS.ceramic, flapPivot);
      flapMesh.position.set(0, 0, -0.07);
      siphonFlaps.push(flapPivot);
    }

    // Jet Wake Vortex Rings (visible when JET WAKE is enabled or during JETTING/DEPARTING)
    const wakeGroup = new THREE.Group();
    siphonGroup.add(wakeGroup);
    const wakeRings = [];
    for (let w = 0; w < 5; w++) {
      const wr = new THREE.Mesh(
        new THREE.TorusGeometry(0.22 + w * 0.08, 0.012, 8, 24),
        MATS.wakeRing.clone()
      );
      wakeGroup.add(wr);
      wakeRings.push(wr);
    }

    // 4E. Ventral Twin-Jaw Chitin-Titanium Beak & Radula Ring
    const beakGroup = new THREE.Group();
    const beakBasePos = new THREE.Vector3(0, -0.44, 0.0);
    beakGroup.position.copy(beakBasePos);
    root.add(beakGroup);

    const buccalRing = castMesh(new THREE.CylinderGeometry(0.38, 0.32, 0.18, 20), MATS.gunmetal, beakGroup);
    const radulaRing = castMesh(createGearGeometry(20, 0.24, 0.19, 0.06, 0.12), MATS.orange, beakGroup);
    radulaRing.rotation.x = Math.PI / 2;
    radulaRing.position.y = -0.08;

    const jawUpper = new THREE.Group();
    const jawLower = new THREE.Group();
    beakGroup.add(jawUpper, jawLower);
    const jawGeo = new THREE.ConeGeometry(0.18, 0.34, 12, 1, false, 0, Math.PI);
    const jU = castMesh(jawGeo, MATS.gunmetal, jawUpper);
    jU.rotation.x = Math.PI;
    jU.position.set(0, -0.18, 0.06);
    const jL = castMesh(jawGeo, MATS.carbon, jawLower);
    jL.rotation.x = Math.PI;
    jL.rotation.y = Math.PI;
    jL.position.set(0, -0.2, -0.06);

    // 4F. 8 Articulated Soft-Robotic Arms (R1..R4, L1..L4 — 25 Links per Arm = 200+ Links & 400+ Suction Wheels)
    const ARM_DEFS = [
      { id: 'R1', az: -0.42 },
      { id: 'R2', az: -1.12 }, // Hero isolated arm on screen-left in reference video!
      { id: 'R3', az: -1.88 },
      { id: 'R4', az: -2.62 },
      { id: 'L1', az: 0.42 },
      { id: 'L2', az: 1.12 },
      { id: 'L3', az: 1.88 },
      { id: 'L4', az: 2.62 },
    ];
    const LINKS_PER_ARM = 18;
    const arms = [];

    const sharedCollarGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.22, 12);
    const sharedCollarRingGeo = new THREE.TorusGeometry(0.23, 0.022, 6, 14);
    const sharedGimbalGeo = new THREE.SphereGeometry(0.18, 8, 6);

    const linkGeoTemplates = [];
    for (let l = 0; l < LINKS_PER_ARM; l++) {
      const u = l / (LINKS_PER_ARM - 1);
      const scale = Math.pow(1 - u * 0.76, 1.08);
      const rSleeve = 0.198 * scale;
      const lenSleeve = 0.305 * scale;
      const wR = rSleeve * 0.44;
      const wW = rSleeve * 0.36;
      linkGeoTemplates.push({
        u,
        rSleeve,
        lenSleeve,
        wW,
        sleeveGeo: new THREE.CylinderGeometry(rSleeve * 0.94, rSleeve, lenSleeve, 10).rotateX(Math.PI / 2),
        spineGeo: new THREE.CylinderGeometry(rSleeve * 0.28, rSleeve * 0.28, lenSleeve * 1.15, 6).rotateX(Math.PI / 2),
        gDiscGeo: new THREE.CylinderGeometry(rSleeve * 0.62, rSleeve * 0.62, lenSleeve * 0.16, 8).rotateX(Math.PI / 2),
        stripGeo: new THREE.BoxGeometry(rSleeve * 0.55, rSleeve * 0.18, lenSleeve * 0.36),
        ballGeo: new THREE.SphereGeometry(rSleeve * 0.58, 6, 5),
        diaphragmGeo: new THREE.CylinderGeometry(rSleeve * 0.88, rSleeve * 0.88, lenSleeve * 0.12, 8).rotateX(Math.PI / 2),
        cupGeo: new THREE.CylinderGeometry(wR, wR * 0.85, wW, 8).rotateZ(Math.PI / 2),
        rimGeo: new THREE.TorusGeometry(wR * 0.88, wR * 0.18, 4, 8).rotateY(Math.PI / 2),
      });
    }

    for (let aIdx = 0; aIdx < ARM_DEFS.length; aIdx++) {
      const def = ARM_DEFS[aIdx];
      const armRoot = new THREE.Group();
      root.add(armRoot);

      // Root Actuator Collar (3-DOF Shoulder)
      const rootActuator = new THREE.Group();
      armRoot.add(rootActuator);
      const collarMesh = castMesh(sharedCollarGeo, MATS.ceramic, rootActuator);
      collarMesh.rotation.x = Math.PI / 2;
      castMesh(sharedCollarRingGeo, MATS.orange, rootActuator);
      const gimbalCore = castMesh(sharedGimbalGeo, MATS.gunmetal, rootActuator);
      gimbalCore.position.z = 0.1;

      const links = [];
      for (let l = 0; l < LINKS_PER_ARM; l++) {
        const tpl = linkGeoTemplates[l];
        const { u, rSleeve, lenSleeve, wW } = tpl;

        const linkGroup = new THREE.Group();
        armRoot.add(linkGroup);

        // Is this a translucent GLASS LINK (links 2 & 3 on R2, or link 2 on R1/L1)?
        const isGlassLink = (def.id === 'R2' && (l === 2 || l === 3)) || ((def.id === 'R1' || def.id === 'L2') && l === 2);

        // Outer cylindrical sleeve (Ceramic or Glass Link)
        const sleeveMesh = castMesh(tpl.sleeveGeo, isGlassLink ? MATS.portGlass : MATS.ceramic, linkGroup);

        // Internal Gear Train & Tendon Spine (always present inside Glass Links and exposed on teardown)
        const innerGearGroup = new THREE.Group();
        linkGroup.add(innerGearGroup);
        castMesh(tpl.spineGeo, MATS.steel, innerGearGroup);
        if (isGlassLink || l < 6) {
          for (const zOff of [-lenSleeve * 0.22, lenSleeve * 0.22]) {
            const gDisc = castMesh(tpl.gDiscGeo, MATS.gunmetal, innerGearGroup);
            gDisc.position.z = zOff;
          }
        }

        // Orange micro-decal & black pin-rivets on ceramic sleeves
        if (!isGlassLink && l % 2 === 0 && l < 14) {
          const strip = castMesh(tpl.stripGeo, l % 4 === 0 ? MATS.orange : MATS.gunmetal, linkGroup);
          strip.position.set(0, rSleeve * 0.92, 0);
        }

        // Inter-link Ball Joint (±22°) & Black Bellows Diaphragm Disc
        const ballJoint = castMesh(tpl.ballGeo, MATS.gunmetal, linkGroup);
        ballJoint.position.z = -lenSleeve * 0.54;
        const diaphragm = castMesh(tpl.diaphragmGeo, MATS.carbon, linkGroup);
        diaphragm.position.z = -lenSleeve * 0.52;

        // Ventral Paired Suction Wheels (2 Rims: Dark rubber cup + Anodized Orange Rim)
        const wheelGroup = new THREE.Group();
        linkGroup.add(wheelGroup);
        for (const sgn of [-1, 1]) {
          const wx = sgn * rSleeve * 0.56;
          const wy = -rSleeve * 0.92;
          const cup = castMesh(tpl.cupGeo, MATS.rubber, wheelGroup);
          cup.position.set(wx, wy, 0);
          const rim = castMesh(tpl.rimGeo, MATS.orange, wheelGroup);
          rim.position.set(wx + sgn * wW * 0.42, wy, 0);
        }

        links.push({
          group: linkGroup,
          wheelGroup,
          ballJoint,
          diaphragm,
          innerGearGroup,
          sleeveMesh,
          isGlassLink,
          rSleeve,
          lenSleeve,
          u,
        });
      }

      arms.push({
        id: def.id,
        az: def.az,
        armRoot,
        rootActuator,
        links,
      });
    }

    return {
      root,
      pumpCoreGroup,
      reactorRing,
      gear44,
      gear18,
      pistons,
      lowerBowl,
      topCap,
      petals,
      optics,
      siphonGroup,
      siphonBasePos,
      siphonSleeves,
      siphonFlaps,
      wakeGroup,
      wakeRings,
      beakGroup,
      beakBasePos,
      buccalRing,
      radulaRing,
      jawUpper,
      jawLower,
      arms,
    };
  }

  // -------------------------------------------------------------------------
  // 5. BUILD HEXAPOD HX-18 (18-DOF SIX-LEGGED ROBOTIC WALKER)
  // -------------------------------------------------------------------------
  function buildHexapodModel() {
    const root = new THREE.Group();
    root.visible = false;

    // 5A. Central Power & IMU Core (Inside Hexagonal Chassis)
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.15, 0);
    root.add(coreGroup);

    castMesh(new THREE.CylinderGeometry(0.62, 0.58, 0.34, 24), MATS.gunmetal, coreGroup);
    const coreRing = castMesh(new THREE.TorusGeometry(0.64, 0.04, 12, 32), MATS.orange, coreGroup);
    coreRing.rotation.x = Math.PI / 2;
    const mainGear = castMesh(createGearGeometry(24, 0.48, 0.4, 0.08, 0.15), MATS.steel, coreGroup);
    mainGear.rotation.x = Math.PI / 2;
    mainGear.position.y = 0.22;

    // Dual LiPo Power Packs + 6 Radial Torque Distribution Pistons
    for (const sgn of [-1, 1]) {
      const pack = castMesh(new THREE.BoxGeometry(0.32, 0.22, 0.68), MATS.carbon, coreGroup);
      pack.position.set(sgn * 0.34, 0.04, 0);
      const stripe = castMesh(new THREE.BoxGeometry(0.33, 0.05, 0.69), MATS.orange, coreGroup);
      stripe.position.set(sgn * 0.34, 0.12, 0);
    }

    // Lower Structural Hexagonal Deck
    const lowerDeck = new THREE.Group();
    lowerDeck.position.set(0, -0.06, 0);
    root.add(lowerDeck);
    castMesh(new THREE.CylinderGeometry(0.95, 0.85, 0.12, 6), MATS.gunmetal, lowerDeck);

    // 5B. 6 Hinged Ceramic-White Upper Carapace Plates + Central Cap
    const carapacePlates = [];
    for (let i = 0; i < 6; i++) {
      const az = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const pivot = new THREE.Group();
      pivot.position.set(Math.cos(az) * 0.48, 0.36, Math.sin(az) * 0.48);
      pivot.rotation.y = -az + Math.PI / 2;
      root.add(pivot);

      const plate = castMesh(new THREE.BoxGeometry(0.56, 0.07, 0.52), i === 1 ? MATS.portGlass : MATS.ceramic, pivot);
      plate.position.set(0, 0.04, 0.18);
      plate.rotation.x = 0.18;

      const accent = castMesh(new THREE.BoxGeometry(0.18, 0.08, 0.08), MATS.orange, pivot);
      accent.position.set(0, 0.05, 0.38);
      carapacePlates.push({ pivot, az });
    }

    // 5C. Front Optical + Solid-State LiDAR Sensor Turret (OPTICS)
    const sensorHead = new THREE.Group();
    const sensorBasePos = new THREE.Vector3(0, 0.18, 0.96);
    sensorHead.position.copy(sensorBasePos);
    root.add(sensorHead);

    castMesh(new THREE.BoxGeometry(0.56, 0.28, 0.36), MATS.ceramic, sensorHead);
    const lidarDome = castMesh(new THREE.CylinderGeometry(0.16, 0.19, 0.14, 24), MATS.gunmetal, sensorHead);
    lidarDome.position.set(0, 0.19, 0);
    const lidarRing = castMesh(new THREE.TorusGeometry(0.17, 0.02, 10, 24), MATS.orange, sensorHead);
    lidarRing.rotation.x = Math.PI / 2;
    lidarRing.position.set(0, 0.21, 0);

    const stereoEyes = [];
    for (const sgn of [-1, 1]) {
      const eyeG = new THREE.Group();
      eyeG.position.set(sgn * 0.16, 0, 0.18);
      sensorHead.add(eyeG);
      castMesh(new THREE.CylinderGeometry(0.11, 0.12, 0.12, 20).rotateX(Math.PI / 2), MATS.gunmetal, eyeG);
      castMesh(new THREE.TorusGeometry(0.1, 0.018, 10, 20), MATS.orange, eyeG).position.z = 0.05;
      castMesh(new THREE.SphereGeometry(0.08, 16, 12), MATS.lensGlass, eyeG).position.z = 0.05;
      stereoEyes.push(eyeG);
    }

    // 5D. 6 Legs x 3-DOF (Coxa, Femur, Tibia = 18 Digital Servos)
    const LEG_DEFS = [
      { id: 'L1', side: 1, zIdx: 0, mountAngle: 0.58, mountPos: new THREE.Vector3(0.76, 0.02, 0.58) },
      { id: 'L2', side: 1, zIdx: 1, mountAngle: 0.0, mountPos: new THREE.Vector3(0.88, 0.02, 0.0) },
      { id: 'L3', side: 1, zIdx: 2, mountAngle: -0.58, mountPos: new THREE.Vector3(0.76, 0.02, -0.58) },
      { id: 'R1', side: -1, zIdx: 0, mountAngle: Math.PI - 0.58, mountPos: new THREE.Vector3(-0.76, 0.02, 0.58) },
      { id: 'R2', side: -1, zIdx: 1, mountAngle: Math.PI, mountPos: new THREE.Vector3(-0.88, 0.02, 0.0) },
      { id: 'R3', side: -1, zIdx: 2, mountAngle: Math.PI + 0.58, mountPos: new THREE.Vector3(-0.76, 0.02, -0.58) },
    ];

    const L_COXA = 0.38;
    const L_FEMUR = 0.82;
    const L_TIBIA = 1.18;
    const legs = [];

    for (let i = 0; i < LEG_DEFS.length; i++) {
      const def = LEG_DEFS[i];
      const legRoot = new THREE.Group();
      legRoot.position.copy(def.mountPos);
      root.add(legRoot);

      // Joint 1: COXA Yaw Group (Servo 1 of 3)
      const coxaYaw = new THREE.Group();
      legRoot.add(coxaYaw);

      const coxaHousing = new THREE.Group();
      coxaYaw.add(coxaHousing);
      castMesh(new THREE.CylinderGeometry(0.15, 0.15, 0.28, 20), MATS.gunmetal, coxaHousing);
      castMesh(new THREE.TorusGeometry(0.155, 0.022, 10, 22), MATS.orange, coxaHousing).rotation.x = Math.PI / 2;
      const coxaBridge = castMesh(new THREE.BoxGeometry(L_COXA, 0.18, 0.22), MATS.ceramic, coxaHousing);
      coxaBridge.position.set(L_COXA * 0.5, 0, 0);

      // Joint 2: FEMUR Pitch Group (Servo 2 of 3)
      const femurPitch = new THREE.Group();
      femurPitch.position.set(L_COXA, 0, 0);
      coxaYaw.add(femurPitch);

      const femurGroup = new THREE.Group();
      femurPitch.add(femurGroup);
      // Femur Servo Drum with Orange Anodized Horn
      castMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 20).rotateX(Math.PI / 2), MATS.gunmetal, femurGroup);
      castMesh(new THREE.TorusGeometry(0.135, 0.022, 10, 22), MATS.orange, femurGroup).position.z = 0.12;
      castMesh(new THREE.TorusGeometry(0.135, 0.022, 10, 22), MATS.orange, femurGroup).position.z = -0.12;

      // Femur Ceramic Armor Sleeve + Internal Titanium Tie-Rod
      const femurSleeve = castMesh(
        new THREE.BoxGeometry(L_FEMUR * 0.86, 0.21, 0.22),
        def.id === 'L2' ? MATS.portGlass : MATS.ceramic,
        femurGroup
      );
      femurSleeve.position.set(L_FEMUR * 0.5, 0, 0);
      const femurRod = castMesh(
        new THREE.CylinderGeometry(0.055, 0.055, L_FEMUR * 0.9, 12).rotateZ(Math.PI / 2),
        MATS.steel,
        femurGroup
      );
      femurRod.position.set(L_FEMUR * 0.5, 0, 0);
      const femurDecal = castMesh(new THREE.BoxGeometry(0.16, 0.04, 0.23), MATS.orange, femurGroup);
      femurDecal.position.set(L_FEMUR * 0.45, 0.09, 0);

      // Joint 3: TIBIA Knee Pitch Group (Servo 3 of 3)
      const tibiaPitch = new THREE.Group();
      tibiaPitch.position.set(L_FEMUR, 0, 0);
      femurPitch.add(tibiaPitch);

      const tibiaGroup = new THREE.Group();
      tibiaPitch.add(tibiaGroup);
      // Knee Servo Drum
      castMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.24, 20).rotateX(Math.PI / 2), MATS.gunmetal, tibiaGroup);
      castMesh(new THREE.TorusGeometry(0.125, 0.02, 10, 22), MATS.orange, tibiaGroup).position.z = 0.11;

      // Tapered Ceramic Tibia Strut
      const tibiaStrut = castMesh(
        new THREE.CylinderGeometry(0.11, 0.055, L_TIBIA * 0.88, 16).rotateZ(-Math.PI / 2),
        MATS.ceramic,
        tibiaGroup
      );
      tibiaStrut.position.set(L_TIBIA * 0.46, 0, 0);

      // Piezo Force-Sensing Foot Tip
      const footTip = new THREE.Group();
      footTip.position.set(L_TIBIA, 0, 0);
      tibiaGroup.add(footTip);
      castMesh(new THREE.CylinderGeometry(0.065, 0.04, 0.16, 14).rotateZ(-Math.PI / 2), MATS.orange, footTip).position.x = -0.06;
      castMesh(new THREE.SphereGeometry(0.065, 14, 12), MATS.rubber, footTip);

      legs.push({
        id: def.id,
        side: def.side,
        zIdx: def.zIdx,
        mountAngle: def.mountAngle,
        mountPos: def.mountPos,
        legRoot,
        coxaYaw,
        coxaHousing,
        femurPitch,
        femurGroup,
        tibiaPitch,
        tibiaGroup,
        footTip,
      });
    }

    // Gait Trace Polygon on Ground
    const traceGroup = new THREE.Group();
    root.add(traceGroup);
    const footRings = [];
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Mesh(
        new THREE.RingGeometry(0.09, 0.13, 24).rotateX(-Math.PI / 2),
        MATS.wakeRing.clone()
      );
      traceGroup.add(r);
      footRings.push(r);
    }

    return {
      root,
      coreGroup,
      mainGear,
      lowerDeck,
      carapacePlates,
      sensorHead,
      sensorBasePos,
      lidarDome,
      stereoEyes,
      legs,
      traceGroup,
      footRings,
      L_COXA,
      L_FEMUR,
      L_TIBIA,
    };
  }

  const pelagos = buildPelagosModel();
  const hexapod = buildHexapodModel();
  scene.add(pelagos.root);
  scene.add(hexapod.root);

  // -------------------------------------------------------------------------
  // 6. SIMULATOR STATE MACHINE & 25-SECOND REFERENCE TIMELINE
  // -------------------------------------------------------------------------
  const STATE = {
    unit: 'oc8', // 'oc8' (Pelagos OC-8) | 'hx18' (18-DOF Hexapod HX-18)
    time: 5.0, // Starts at 00:05 matching frame 0 of docs/octopus.gif, loops 0..25s
    playing: true,
    autoTour: true,
    lastManualInputTime: -999,
    assembly: 'optics', // 'hero' | 'optics' | 'mantle' | 'arm_r2' | 'siphon' | 'beak'
    labels: false,
    exploded: false,
    jetWake: false,
    turntable: false,
    // Smoothed animation weights (0..1)
    wOptics: 0,
    wMantle: 0,
    wArmR2: 0,
    wSiphon: 0,
    wBeak: 0,
    wExploded: 0,
    wJetting: 0,
    wDeparting: 0,
    turntableAngle: 0,
    // Camera spherical orbit
    camAz: 0.42,
    camEl: 0.16,
    camDist: 6.45,
    camTarget: new THREE.Vector3(0, -0.08, 0),
    userAzOffset: 0,
    userElOffset: 0,
    userDistScale: 1.0,
    // Telemetry histories
    pressureHist: new Array(48).fill(17),
    ringAnim: { t: -10, x: -100, y: -100 },
  };

  // The 8 Operator Beats across the 25-second timeline (matching https://www.youtube.com/watch?v=_fm19Cy5J_I)
  const TIMELINE_BEATS = [
    {
      t: 0.0,
      end: 3.2,
      assembly: 'hero',
      modeBig: { oc8: 'JETTING', hx18: 'TRIPOD SPRINT' },
      status: { oc8: 'JETTING', hx18: 'WALKING' },
      opLog: { oc8: 'OPERATOR · JET PROPULSION DIVE', hx18: 'OPERATOR · TRIPOD GAIT SPRINT' },
      labels: false,
      exploded: false,
      jetWake: true,
      turntable: false,
      cam: { az: -0.68, el: 0.24, d: 6.8, tx: 0, ty: -0.05, tz: 0 },
      btnTarget: 'wake',
    },
    {
      t: 3.2,
      end: 5.0,
      assembly: 'hero',
      modeBig: { oc8: 'HOLDING', hx18: 'STANDING' },
      status: { oc8: 'HOLDING', hx18: 'STANDING' },
      opLog: { oc8: 'OPERATOR · STATION KEEPING', hx18: 'OPERATOR · STANCE EQUILIBRIUM' },
      labels: false,
      exploded: false,
      jetWake: false,
      turntable: false,
      cam: { az: 0.38, el: 0.15, d: 6.45, tx: 0, ty: -0.08, tz: 0 },
      btnTarget: 'hero',
    },
    {
      t: 5.0,
      end: 6.2,
      assembly: 'optics',
      modeBig: { oc8: 'HOLDING', hx18: 'OPTICS OPEN' },
      status: { oc8: 'HOLDING', hx18: 'OPTICS OPEN' },
      opLog: { oc8: 'OPERATOR · ISOLATE OPTICS', hx18: 'OPERATOR · ISOLATE OPTICS' },
      labels: false,
      exploded: false,
      jetWake: false,
      turntable: false,
      cam: { az: 0.48, el: 0.14, d: 6.15, tx: 0.05, ty: -0.05, tz: 0.05 },
      btnTarget: 'optics',
    },
    {
      t: 6.2,
      end: 8.6,
      assembly: 'mantle',
      modeBig: { oc8: 'MANTLE OPEN', hx18: 'CHASSIS OPEN' },
      status: { oc8: 'MANTLE OPEN', hx18: 'CHASSIS OPEN' },
      opLog: { oc8: 'OPERATOR · ISOLATE MANTLE', hx18: 'OPERATOR · ISOLATE CHASSIS' },
      labels: true,
      exploded: false,
      jetWake: false,
      turntable: false,
      cam: { az: 0.18, el: 0.24, d: 6.35, tx: 0, ty: 0.12, tz: 0 },
      btnTarget: 'mantle',
    },
    {
      t: 8.6,
      end: 11.8,
      assembly: 'arm_r2',
      modeBig: { oc8: 'ARM R2 APART', hx18: 'LEG L2 APART' },
      status: { oc8: 'ARM R2 APART', hx18: 'LEG L2 APART' },
      opLog: { oc8: 'OPERATOR · ISOLATE ARM R2', hx18: 'OPERATOR · ISOLATE LEG L2' },
      labels: true,
      exploded: false,
      jetWake: false,
      turntable: false,
      cam: { az: 0.26, el: 0.18, d: 6.55, tx: -0.35, ty: -0.04, tz: 0.08 },
      btnTarget: 'arm_r2',
    },
    {
      t: 11.8,
      end: 14.6,
      assembly: 'siphon',
      modeBig: { oc8: 'SIPHON OPEN', hx18: 'SERVOS OPEN' },
      status: { oc8: 'SIPHON OPEN', hx18: 'SERVOS OPEN' },
      opLog: { oc8: 'OPERATOR · ISOLATE SIPHON', hx18: 'OPERATOR · ISOLATE SERVOS' },
      labels: true,
      exploded: false,
      jetWake: false,
      turntable: false,
      cam: { az: 2.45, el: 0.16, d: 6.25, tx: 0, ty: -0.08, tz: -0.15 },
      btnTarget: 'siphon',
    },
    {
      t: 14.6,
      end: 17.2,
      assembly: 'beak',
      modeBig: { oc8: 'BEAK OPEN', hx18: 'CORE OPEN' },
      status: { oc8: 'BEAK OPEN', hx18: 'CORE OPEN' },
      opLog: { oc8: 'OPERATOR · ISOLATE BEAK', hx18: 'OPERATOR · ISOLATE CORE' },
      labels: true,
      exploded: false,
      jetWake: false,
      turntable: false,
      cam: { az: 0.12, el: -0.18, d: 6.1, tx: 0, ty: -0.22, tz: 0 },
      btnTarget: 'beak',
    },
    {
      t: 17.2,
      end: 22.0,
      assembly: 'hero',
      modeBig: { oc8: 'TEARDOWN', hx18: 'TEARDOWN' },
      status: { oc8: 'TEARDOWN', hx18: 'TEARDOWN' },
      opLog: { oc8: 'OPERATOR · EXPLODED ON', hx18: 'OPERATOR · EXPLODED ON' },
      labels: true,
      exploded: true,
      jetWake: false,
      turntable: true,
      cam: { az: 0.65, el: 0.22, d: 7.45, tx: 0, ty: 0.04, tz: 0 },
      btnTarget: 'exploded',
    },
    {
      t: 22.0,
      end: 25.0,
      assembly: 'hero',
      modeBig: { oc8: 'DEPARTING', hx18: 'OMNI WALK' },
      status: { oc8: 'DEPARTING', hx18: 'DEPARTING' },
      opLog: { oc8: 'OPERATOR · EXPLODED OFF · REASSEMBLE', hx18: 'OPERATOR · EXPLODED OFF · REASSEMBLE' },
      labels: false,
      exploded: false,
      jetWake: true,
      turntable: false,
      cam: { az: 0.85, el: 0.14, d: 6.65, tx: 0.15, ty: -0.05, tz: 0 },
      btnTarget: 'wake',
    },
  ];

  // -------------------------------------------------------------------------
  // 7. INITIALIZE HUD DOM ELEMENTS & INTERACTIVE BUTTONS
  // -------------------------------------------------------------------------
  const loadTicksEl = document.getElementById('load-ticks');
  for (let i = 0; i < 28; i++) {
    const sp = document.createElement('span');
    loadTicksEl.appendChild(sp);
  }
  const loadTickSpans = Array.from(loadTicksEl.children);

  const p2CellsEl = document.getElementById('p2-cells');
  for (let i = 0; i < 10; i++) {
    const cell = document.createElement('div');
    cell.style.width = '9px';
    cell.style.height = '18px';
    cell.style.borderRadius = '1.5px';
    cell.style.background = i < 2 ? '#eb4d28' : i < 8 ? '#1e9e5a' : '#dfdbd2';
    p2CellsEl.appendChild(cell);
  }
  const battCellDivs = Array.from(p2CellsEl.children);

  // Scrubber tick marks
  const scrubberTicksEl = document.getElementById('scrubber-ticks');
  TIMELINE_BEATS.forEach((b) => {
    if (b.t > 0 && b.t < DURATION) {
      const tk = document.createElement('div');
      tk.style.position = 'absolute';
      tk.style.left = `${((b.t / DURATION) * 100).toFixed(2)}%`;
      tk.style.top = '4px';
      tk.style.height = '10px';
      tk.style.width = '1px';
      tk.style.background = '#9a948a';
      scrubberTicksEl.appendChild(tk);
    }
  });

  const UNIT_CONFIG = {
    oc8: {
      code: 'OC-8',
      eyebrow: 'ROBOTIC CEPHALOPOD · EIGHT-ARM SUBSEA DRONE',
      title: 'Pelagos OC-8',
      subtitle: 'SOFT-ARM MANIPULATOR / FIELD SIMULATOR',
      loadTitle: 'JET LOAD',
      loadFoot: ['IDLE', 'CRUISE', 'BURST'],
      simId: 'OC8-0731',
      operator: 'TANK 2 · M.S.',
      modelTag: 'MODEL OC-8 · REV B',
      p1Title: 'JET',
      p1Unit1: 'KPA',
      p1Sub1: 'MANTLE PRESSURE',
      p1Sub2: 'THRUST',
      p1FootK1: 'PULSE',
      p3Title: 'ARM CURL',
      p3Subtitle: 'CURL PER ARM · TIP SPIRAL',
      limbs: ['R1', 'R2', 'R3', 'R4', 'L1', 'L2', 'L3', 'L4'],
      p4Title: 'DEPTH',
      p4K1: 'DEPTH',
      p4K2: 'V/S',
      p8Left: 'DIVE',
      p8Right: 'SURFACE',
      footerLeft: 'FIELD SIMULATOR  ·  PROCEDURAL MODEL  ·  8 ARMS  ·  2 OPTICS  ·  1 SIPHON',
      footerRight: 'PELAGOS MARINE ROBOTICS  ·  DEEP LAB',
      assemblies: [
        { key: 'hero', label: 'HERO' },
        { key: 'optics', label: 'OPTICS' },
        { key: 'mantle', label: 'MANTLE' },
        { key: 'arm_r2', label: 'ARM R2' },
        { key: 'siphon', label: 'SIPHON' },
        { key: 'beak', label: 'BEAK' },
      ],
      displays: [
        { key: 'labels', label: 'LABELS' },
        { key: 'exploded', label: 'EXPLODED' },
        { key: 'wake', label: 'JET WAKE' },
        { key: 'turntable', label: 'TURNTABLE' },
      ],
      subsystems: [
        { idx: '01', key: 'optics', name: 'OPTIC ARRAY', spec: '2 × 52 MM LENS · IR RIM', defaultBadge: 'TRACKING', defaultCls: 'green' },
        { idx: '02', key: 'mantle', name: 'MANTLE SHELL', spec: '6 PETALS · GLASS PORT', defaultBadge: 'SEALED', defaultCls: 'green' },
        { idx: '03', key: 'mantle_core', name: 'PUMP CORE', spec: 'REACTOR RING · 7 PISTONS', defaultBadge: 'RUNNING', defaultCls: 'green' },
        { idx: '04', key: 'arm_r2', name: 'ARM CHAINS', spec: '202 LINKS · 409 WHEELS', defaultBadge: '8 / 8 LIVE', defaultCls: 'green' },
        { idx: '05', key: 'siphon', name: 'SIPHON', spec: '3 SLEEVES · 6-FLAP NOZZLE', defaultBadge: 'IDLE', defaultCls: 'neutral' },
        { idx: '06', key: 'beak', name: 'BEAK', spec: 'TWIN JAW · RADULA RING', defaultBadge: 'SEALED', defaultCls: 'green' },
      ],
      brandSvg: `
        <path d="M14 19a8 8 0 1 1 16 0c0 3.5-2 6-4 7.5"/>
        <circle cx="18.5" cy="18.5" r="1.4" fill="#fff"/>
        <circle cx="25.5" cy="18.5" r="1.4" fill="#fff"/>
        <path d="M16 25c-3 3-6 4-8 3M19 26c-2 4-4 7-7 8M22 26v9M25 26c2 4 4 7 7 8M28 25c3 3 6 4 8 3"/>
      `,
    },
    hx18: {
      code: 'HX-18',
      eyebrow: 'ROBOTIC ARTHROPOD · 18-DOF SIX-LEGGED WALKER',
      title: 'Hexapod HX-18',
      subtitle: 'ALL-TERRAIN IK WALKER / FIELD SIMULATOR',
      loadTitle: 'DRIVE LOAD',
      loadFoot: ['STANCE', 'TRIPOD', 'MAX TORQUE'],
      simId: 'HX18-0419',
      operator: 'BAY 4 · M.S.',
      modelTag: 'MODEL HX-18 · REV C',
      p1Title: 'GAIT',
      p1Unit1: 'HZ',
      p1Sub1: 'STRIDE RATE',
      p1Sub2: 'GROUND SPEED',
      p1FootK1: 'PATTERN',
      p3Title: 'LEG SERVOS',
      p3Subtitle: 'LOAD PER LEG · 3-DOF TORQUE',
      limbs: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'],
      p4Title: 'ATTITUDE',
      p4K1: 'CLEARANCE',
      p4K2: 'YAW RATE',
      p8Left: 'DEPLOY',
      p8Right: 'RECALL',
      footerLeft: 'FIELD SIMULATOR  ·  PROCEDURAL MODEL  ·  6 LEGS  ·  18 SERVOS  ·  IK SOLVER',
      footerRight: 'PELAGOS TERRESTRIAL ROBOTICS  ·  HEX LAB',
      assemblies: [
        { key: 'hero', label: 'HERO' },
        { key: 'optics', label: 'OPTICS' },
        { key: 'mantle', label: 'CHASSIS' },
        { key: 'arm_r2', label: 'LEG L2' },
        { key: 'siphon', label: 'SERVOS' },
        { key: 'beak', label: 'CORE' },
      ],
      displays: [
        { key: 'labels', label: 'LABELS' },
        { key: 'exploded', label: 'EXPLODED' },
        { key: 'wake', label: 'GAIT TRACE' },
        { key: 'turntable', label: 'TURNTABLE' },
      ],
      subsystems: [
        { idx: '01', key: 'optics', name: 'SENSOR HEAD', spec: 'STEREO 32 MM · LIDAR DOME', defaultBadge: 'TRACKING', defaultCls: 'green' },
        { idx: '02', key: 'mantle', name: 'CARAPACE SHELL', spec: '6 PLATES · GLASS CANOPY', defaultBadge: 'SEALED', defaultCls: 'green' },
        { idx: '03', key: 'beak', name: 'POWER CORE', spec: 'DUAL LIPO · IMU RING', defaultBadge: 'NOMINAL', defaultCls: 'green' },
        { idx: '04', key: 'arm_r2', name: 'LEG CHAINS', spec: '6 LEGS · COXA/FEMUR/TIBIA', defaultBadge: '6 / 6 LIVE', defaultCls: 'green' },
        { idx: '05', key: 'siphon', name: 'SERVO BUS', spec: '18 × HV BRUSHLESS SERVOS', defaultBadge: 'HOLDING', defaultCls: 'green' },
        { idx: '06', key: 'foot', name: 'PIEZO FEET', spec: '6 × CONTACT FORCE PADS', defaultBadge: 'LOCKED', defaultCls: 'green' },
      ],
      brandSvg: `
        <polygon points="22,11 30,16 30,28 22,33 14,28 14,16"/>
        <circle cx="22" cy="22" r="3" fill="#fff"/>
        <path d="M14 16L7 11M14 22L6 22M14 28L7 33M30 16L37 11M30 22L38 22M30 28L37 33"/>
      `,
    },
  };

  const btnElements = {};

  function buildUnitUI() {
    const cfg = UNIT_CONFIG[STATE.unit];
    document.getElementById('brand-icon').innerHTML = cfg.brandSvg;
    document.getElementById('hdr-code').textContent = cfg.code;
    document.getElementById('hdr-eyebrow').textContent = cfg.eyebrow;
    document.getElementById('hdr-title').textContent = cfg.title;
    document.getElementById('hdr-subtitle').textContent = cfg.subtitle;
    document.getElementById('load-title').textContent = cfg.loadTitle;
    document.getElementById('load-lbl-1').textContent = cfg.loadFoot[0];
    document.getElementById('load-lbl-2').textContent = cfg.loadFoot[1];
    document.getElementById('load-lbl-3').textContent = cfg.loadFoot[2];
    document.getElementById('meta-simid').textContent = cfg.simId;
    document.getElementById('meta-operator').textContent = cfg.operator;
    document.getElementById('vp-model-tag').textContent = cfg.modelTag;
    document.getElementById('p1-title').textContent = cfg.p1Title;
    document.getElementById('p1-unit1').textContent = cfg.p1Unit1;
    document.getElementById('p1-sub1').textContent = cfg.p1Sub1;
    document.getElementById('p1-sub2').textContent = cfg.p1Sub2;
    document.getElementById('p1-foot-k1').textContent = cfg.p1FootK1;
    document.getElementById('p3-title').textContent = cfg.p3Title;
    document.getElementById('p3-subtitle').textContent = cfg.p3Subtitle;
    document.getElementById('p4-title').textContent = cfg.p4Title;
    document.getElementById('p4-k1').textContent = cfg.p4K1;
    document.getElementById('p4-k2').textContent = cfg.p4K2;
    document.getElementById('p8-left-lbl').textContent = cfg.p8Left;
    document.getElementById('p8-right-lbl').textContent = cfg.p8Right;
    document.getElementById('footer-left').textContent = cfg.footerLeft;
    document.getElementById('footer-right').textContent = cfg.footerRight;

    document.getElementById('unit-oc8').classList.toggle('active', STATE.unit === 'oc8');
    document.getElementById('unit-hx18').classList.toggle('active', STATE.unit === 'hx18');

    // Panel 03 Rows
    const p3RowsEl = document.getElementById('p3-rows');
    p3RowsEl.innerHTML = '';
    cfg.limbs.forEach((id) => {
      const r = document.createElement('div');
      r.className = 'curl-row';
      r.innerHTML = `
        <span class="curl-id">${id}</span>
        <div class="curl-track"><div class="curl-fill" id="curl-bar-${id}" style="width:85%"></div></div>
        <span class="curl-val" id="curl-val-${id}">85%</span>
      `;
      p3RowsEl.appendChild(r);
    });

    // Panel 05 Assemblies Buttons
    const p5El = document.getElementById('p5-assemblies');
    p5El.innerHTML = '';
    cfg.assemblies.forEach((a) => {
      const b = document.createElement('button');
      b.className = 'sim-btn';
      b.textContent = a.label;
      b.dataset.key = a.key;
      b.addEventListener('click', () => {
        takeManualControl();
        triggerClickPulse(b);
        selectAssembly(a.key);
      });
      p5El.appendChild(b);
      btnElements[a.key] = b;
    });

    // Panel 06 Display Buttons
    const p6El = document.getElementById('p6-display');
    p6El.innerHTML = '';
    cfg.displays.forEach((d) => {
      const b = document.createElement('button');
      b.className = 'sim-btn';
      b.textContent = d.label;
      b.dataset.key = d.key;
      b.addEventListener('click', () => {
        takeManualControl();
        triggerClickPulse(b);
        toggleDisplay(d.key);
      });
      p6El.appendChild(b);
      btnElements[d.key] = b;
    });

    // Panel 07 Subsystems
    const p7El = document.getElementById('p7-subsystems');
    p7El.innerHTML = '';
    cfg.subsystems.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'sub-row';
      row.id = `sub-row-${s.idx}`;
      row.innerHTML = `
        <div class="sub-left">
          <span class="sub-idx">${s.idx}</span>
          <div>
            <span class="sub-name">${s.name}</span>
            <span class="sub-spec">${s.spec}</span>
          </div>
        </div>
        <span class="pill ${s.defaultCls}" id="sub-pill-${s.idx}">${s.defaultBadge}</span>
      `;
      row.addEventListener('click', () => {
        takeManualControl();
        if (window.__PELAGOS_FLEET && window.__PELAGOS_FLEET.onSubsystemClick) {
          window.__PELAGOS_FLEET.onSubsystemClick(s);
        }
        if (['optics', 'mantle', 'arm_r2', 'siphon', 'beak'].includes(s.key)) {
          selectAssembly(s.key);
        } else if (s.key === 'mantle_core') {
          selectAssembly('mantle');
        }
      });
      p7El.appendChild(row);
    });

    pelagos.root.visible = STATE.unit === 'oc8';
    hexapod.root.visible = STATE.unit === 'hx18';
    if (window.__PELAGOS_FLEET && window.__PELAGOS_FLEET.onUnitChanged) {
      window.__PELAGOS_FLEET.onUnitChanged(STATE.unit);
    }
  }

  function getElementStageCenter(el) {
    if (!el) return [800, 450];
    if (el.__stageCenter) return el.__stageCenter;
    const r = el.getBoundingClientRect();
    const appRect = appEl.getBoundingClientRect();
    if (r.width > 0) {
      el.__stageCenter = [
        (r.left - appRect.left + r.width * 0.5) / stageScale,
        (r.top - appRect.top + r.height * 0.5) / stageScale,
      ];
      return el.__stageCenter;
    }
    return [800, 450];
  }

  function triggerClickPulse(el) {
    const [x, y] = getElementStageCenter(el);
    STATE.ringAnim = { t: performance.now() * 0.001, x, y };
    if (window.__PELAGOS_FLEET && window.__PELAGOS_FLEET.playAudioFX) {
      window.__PELAGOS_FLEET.playAudioFX('click');
    }
  }

  function takeManualControl() {
    STATE.autoTour = false;
    STATE.lastManualInputTime = performance.now() * 0.001;
  }

  function selectAssembly(key) {
    STATE.assembly = key;
    STATE.exploded = false;
    STATE.userAzOffset = 0;
    STATE.userElOffset = 0;
    STATE.userDistScale = 1.0;
    if (key !== 'hero' && key !== 'optics') {
      STATE.labels = true;
    }
    if (window.__PELAGOS_FLEET && window.__PELAGOS_FLEET.playAudioFX) {
      window.__PELAGOS_FLEET.playAudioFX('servo');
    }
  }

  function toggleDisplay(key) {
    if (key === 'labels') STATE.labels = !STATE.labels;
    else if (key === 'exploded') {
      STATE.exploded = !STATE.exploded;
      if (STATE.exploded) {
        STATE.labels = true;
        STATE.turntable = true;
        STATE.explodeSlider = 1.0;
      } else {
        STATE.explodeSlider = 0.0;
      }
      if (window.__PELAGOS_FLEET && window.__PELAGOS_FLEET.playAudioFX) {
        window.__PELAGOS_FLEET.playAudioFX('pneumatic');
      }
    } else if (key === 'wake') STATE.jetWake = !STATE.jetWake;
    else if (key === 'turntable') STATE.turntable = !STATE.turntable;
    else if (key === 'xray') STATE.xray = !STATE.xray;
    else if (key === 'thermal') STATE.thermal = !STATE.thermal;
  }

  // Unit switcher handlers
  document.getElementById('unit-oc8').addEventListener('click', () => {
    STATE.unit = 'oc8';
    buildUnitUI();
  });
  document.getElementById('unit-hx18').addEventListener('click', () => {
    STATE.unit = 'hx18';
    buildUnitUI();
  });
  document.getElementById('brand-toggle').addEventListener('click', () => {
    STATE.unit = STATE.unit === 'oc8' ? 'hx18' : 'oc8';
    buildUnitUI();
  });

  // Play / Pause button
  document.getElementById('btn-play').addEventListener('click', () => {
    STATE.playing = !STATE.playing;
    if (STATE.playing) STATE.autoTour = true;
    updatePlayIcon();
  });

  function updatePlayIcon() {
    const iconEl = document.getElementById('play-icon');
    if (STATE.playing) {
      iconEl.innerHTML = `<rect x="3" y="2" width="3.5" height="12" rx="0.8"></rect><rect x="9.5" y="2" width="3.5" height="12" rx="0.8"></rect>`;
    } else {
      iconEl.innerHTML = `<polygon points="4,2 14,8 4,14"></polygon>`;
    }
  }

  // Timeline Scrubber Dragging
  const scrubberHit = document.getElementById('scrubber-hit');
  let scrubbing = false;
  function scrubFromEvent(e) {
    const r = scrubberHit.getBoundingClientRect();
    const frac = clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1);
    STATE.time = frac * DURATION;
    STATE.autoTour = true;
  }
  scrubberHit.addEventListener('pointerdown', (e) => {
    scrubbing = true;
    scrubberHit.setPointerCapture(e.pointerId);
    scrubFromEvent(e);
  });
  scrubberHit.addEventListener('pointermove', (e) => {
    if (scrubbing) scrubFromEvent(e);
  });
  scrubberHit.addEventListener('pointerup', () => {
    scrubbing = false;
  });

  // 3D Viewport Orbit & Wheel Zoom
  let draggingOrbit = false;
  let prevX = 0;
  let prevY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    draggingOrbit = true;
    prevX = e.clientX;
    prevY = e.clientY;
    canvas.classList.add('dragging');
    canvas.setPointerCapture(e.pointerId);
    takeManualControl();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!draggingOrbit) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    prevX = e.clientX;
    prevY = e.clientY;
    STATE.userAzOffset -= dx * 0.0065;
    STATE.userElOffset = clamp(STATE.userElOffset + dy * 0.0055, -0.75, 0.75);
  });
  canvas.addEventListener('pointerup', () => {
    draggingOrbit = false;
    canvas.classList.remove('dragging');
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      takeManualControl();
      STATE.userDistScale = clamp(STATE.userDistScale * Math.pow(1.001, e.deltaY), 0.55, 1.75);
    },
    { passive: false }
  );

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      STATE.playing = !STATE.playing;
      updatePlayIcon();
    } else if (e.key === 'e' || e.key === 'E') {
      takeManualControl();
      toggleDisplay('exploded');
    } else if (e.key === 'l' || e.key === 'L') {
      takeManualControl();
      toggleDisplay('labels');
    } else if (e.key === 'm' || e.key === 'M') {
      STATE.unit = STATE.unit === 'oc8' ? 'hx18' : 'oc8';
      buildUnitUI();
    }
  });

  // -------------------------------------------------------------------------
  // 8. POSE & ANIMATE PELAGOS OC-8 (SOFT-ROBOTIC CEPHALOPOD KINEMATICS)
  // -------------------------------------------------------------------------
  function updatePelagosPose(t, dt) {
    const wOpt = STATE.wOptics;
    const wMan = STATE.wMantle;
    const wArm = STATE.wArmR2;
    const wSip = STATE.wSiphon;
    const wBk = STATE.wBeak;
    const wExp = STATE.wExploded;
    const wJet = STATE.wJetting;
    const wDep = STATE.wDeparting;

    // Overall body scale and pitch/bob in water
    const jetTilt = (wJet - wDep) * 0.82;
    pelagos.root.scale.setScalar(0.55);
    pelagos.root.position.set(
      (wDep - wJet) * 0.45,
      0.22 + Math.sin(t * 1.9) * 0.03 * (1 - wExp),
      0
    );
    pelagos.root.rotation.set(
      Math.sin(t * 1.3) * 0.025 * (1 - wExp),
      0,
      jetTilt
    );

    // Internal Pump Core & Gears rotation
    pelagos.gear44.rotation.z = t * 1.8;
    pelagos.gear18.rotation.z = -t * 1.8 * (44 / 18);
    pelagos.reactorRing.rotation.y = t * 0.55;
    pelagos.pistons.forEach((rod, idx) => {
      rod.position.y = 0.06 + Math.sin(t * 6.5 + idx * ((Math.PI * 2) / 7)) * 0.055;
    });

    // Pump core lifts and expands slightly during Mantle Open or Exploded Teardown
    const coreLift = Math.max(wMan * 0.54, wExp * 0.88);
    pelagos.pumpCoreGroup.position.y = 0.38 + coreLift;
    pelagos.pumpCoreGroup.scale.setScalar(0.62 + Math.max(wMan, wExp) * 0.32);
    pelagos.reactorRing.position.y = 0.34 + wExp * 0.45;
    pelagos.lowerBowl.position.y = 0.12 - wExp * 0.35;

    // Top Apex Cap & 6 Hinged Mantle Shell Petals (+openAmt hinges outward; front glass port tucks down to expose Pump Core)
    const openAmt = Math.max(wMan, wExp);
    pelagos.topCap.position.y = 1.24 + wMan * 0.68 + wExp * 1.1;
    pelagos.petals.forEach((p, idx) => {
      const isFrontGlass = idx === 0;
      p.pivot.rotation.x = openAmt * (isFrontGlass ? 0.92 : 0.78);
      const rad = 0.88 + openAmt * (isFrontGlass ? 0.28 : 0.16) + wExp * 0.68;
      const yOff = isFrontGlass ? -wMan * 0.34 + wExp * 0.15 : wExp * 0.28;
      p.pivot.position.set(
        Math.sin(p.az) * rad,
        0.28 + yOff,
        Math.cos(p.az) * rad
      );
    });

    // Twin 52mm Optical Domes (OPTICS isolation + full teardown)
    const optSep = Math.max(wOpt, wExp * 1.25);
    pelagos.optics.forEach((o) => {
      o.group.position.copy(o.basePos).addScaledVector(o.dir, wExp * 0.65);
      o.shroud.position.z = optSep * 0.18;
      o.baffle.position.z = 0.11 + optSep * 0.42;
      o.irRim.position.z = 0.13 + optSep * 0.68;
      o.lens.position.z = 0.14 + optSep * 0.88;
      o.gimbalSled.position.z = -0.04 - optSep * 0.22;
    });

    // Ventral 3-Sleeve Telescopic Siphon & 6-Flap Nozzle
    const sipSep = Math.max(wSip, wExp * 1.2);
    pelagos.siphonGroup.position
      .copy(pelagos.siphonBasePos)
      .add(new THREE.Vector3(0, -wExp * 0.25, -wExp * 0.65));
    pelagos.siphonSleeves.forEach((sl, idx) => {
      sl.position.z = -idx * (0.16 + sipSep * 0.32);
    });
    const pulseFlap = (STATE.jetWake || wJet > 0.1 || wDep > 0.1) ? Math.sin(t * 9.0) * 0.22 : 0;
    pelagos.siphonFlaps.forEach((fl) => {
      fl.position.z = -0.42 - sipSep * 0.68;
      fl.rotation.x = 0.15 + sipSep * 0.55 + pulseFlap;
    });

    // Jet Wake Vortex Rings
    const showWake = STATE.jetWake || wJet > 0.15 || wDep > 0.15;
    pelagos.wakeGroup.visible = showWake;
    if (showWake) {
      pelagos.wakeRings.forEach((wr, i) => {
        const phase = ((t * 1.8 + i * 0.2) % 1.0);
        wr.position.z = -0.58 - phase * 1.85;
        const sc = 0.65 + phase * 1.55;
        wr.scale.set(sc, sc, 1);
        wr.material.opacity = (1 - phase) * 0.45;
      });
    }

    // Ventral Beak & Radula Ring
    const bkSep = Math.max(wBk, wExp * 1.2);
    pelagos.beakGroup.position.set(0, -0.44 - bkSep * 0.48, 0);
    pelagos.radulaRing.position.y = -0.08 - bkSep * 0.28;
    pelagos.radulaRing.rotation.z = t * 1.2;
    pelagos.jawUpper.position.set(0, -bkSep * 0.35, bkSep * 0.22);
    pelagos.jawUpper.rotation.x = bkSep * 0.52;
    pelagos.jawLower.position.set(0, -bkSep * 0.35, -bkSep * 0.22);
    pelagos.jawLower.rotation.x = -bkSep * 0.52;

    // 8 Articulated Soft-Robotic Arms (202 Links & 409 Suction Wheels)
    const armCurls = {};
    pelagos.arms.forEach((arm, aIdx) => {
      const isR2 = arm.id === 'R2';
      const detachAmt = isR2 ? Math.max(wArm, wExp) : wExp;
      const baseAz = arm.az;
      const dirX = Math.sin(baseAz);
      const dirZ = Math.cos(baseAz);

      // Root Actuator position
      const rootR = 0.68 + detachAmt * 0.32;
      arm.rootActuator.position.set(dirX * rootR, -0.32, dirZ * rootR);
      arm.rootActuator.rotation.y = baseAz;

      // Cumulative kinematic chain along the 24 links of this arm
      let curPos = new THREE.Vector3(dirX * (rootR + 0.16), -0.34, dirZ * (rootR + 0.16));
      let pitch = 0.04;
      let yaw = baseAz;

      // Travelling wave + tip spiral curl
      const wavePhase = t * 2.1 + aIdx * 0.78;
      const curlFactor = clamp(0.72 + 0.26 * Math.sin(wavePhase * 0.7 + aIdx), 0.65, 1.0);
      armCurls[arm.id] = Math.round(curlFactor * 100);

      for (let l = 0; l < arm.links.length; l++) {
        const lk = arm.links[l];
        const u = lk.u;

        // Natural octopus posture: arches outward, dips gently, then spirals tightly upward at the 16-link tip
        let dPitch = 0;
        let dYaw = Math.sin(wavePhase - u * 3.8) * 0.045 * (1 - detachAmt * 0.7);
        if (u < 0.3) {
          dPitch = -0.075 + Math.cos(wavePhase - u * 2.5) * 0.02;
        } else if (u < 0.55) {
          dPitch = 0.065;
        } else {
          // 16-link logarithmic tip spiral curl!
          const tipU = (u - 0.55) / 0.45;
          dPitch = (0.32 + tipU * 0.48) * (1 - detachAmt * 0.45);
        }

        // Streamlined trailing cone during Jetting / Departing
        const streamAmt = clamp(wJet + wDep, 0, 1);
        if (streamAmt > 0.01) {
          dPitch = lerp(dPitch, (0.04 - pitch) * 0.35, streamAmt * 0.85);
        }

        // When Arm R2 is isolated ('ARM R2 APART'), stretch it out toward screen-left so every separated link reads clearly!
        if (isR2 && wArm > 0.01) {
          const stretchD = u < 0.62 ? -0.015 : 0.28;
          dPitch = lerp(dPitch, stretchD, wArm * 0.85);
        }

        pitch += dPitch;
        yaw += dYaw;

        const stepGap = lk.lenSleeve * (1.06 + detachAmt * 1.18);
        const forward = new THREE.Vector3(
          Math.sin(yaw) * Math.cos(pitch),
          Math.sin(pitch),
          Math.cos(yaw) * Math.cos(pitch)
        );

        lk.group.position.copy(curPos);
        const lookTarget = curPos.clone().add(forward);
        lk.group.lookAt(lookTarget);

        // Separate suction wheels & ball joints slightly when detached; hide interior gears inside closed opaque sleeves
        lk.innerGearGroup.visible = lk.isGlassLink || detachAmt > 0.02;
        lk.wheelGroup.position.y = -detachAmt * 0.14;
        lk.ballJoint.position.z = -lk.lenSleeve * (0.54 + detachAmt * 0.38);

        curPos.addScaledVector(forward, stepGap);
      }
    });

    return armCurls;
  }

  // -------------------------------------------------------------------------
  // 9. POSE & ANIMATE HEXAPOD HX-18 (3-DOF ANALYTICAL IK & TRIPOD GAIT)
  // -------------------------------------------------------------------------
  function solve3DOFLegIK(dx, dy, dz, lCoxa, lFemur, lTibia) {
    const coxaYaw = Math.atan2(dz, dx);
    const horizDist = Math.max(0.05, Math.hypot(dx, dz) - lCoxa);
    const d = Math.hypot(horizDist, dy);
    const dClamped = clamp(d, Math.abs(lFemur - lTibia) + 0.02, lFemur + lTibia - 0.02);

    const alpha = Math.atan2(dy, horizDist);
    const cosBeta = clamp(
      (lFemur * lFemur + dClamped * dClamped - lTibia * lTibia) / (2 * lFemur * dClamped),
      -1,
      1
    );
    const femurAngle = alpha + Math.acos(cosBeta);

    const cosGamma = clamp(
      (lFemur * lFemur + lTibia * lTibia - dClamped * dClamped) / (2 * lFemur * lTibia),
      -1,
      1
    );
    const tibiaAngle = Math.acos(cosGamma) - Math.PI;

    return { coxaYaw, femurAngle, tibiaAngle };
  }

  function updateHexapodPose(t) {
    const wOpt = STATE.wOptics;
    const wMan = STATE.wMantle;
    const wArm = STATE.wArmR2;
    const wSip = STATE.wSiphon;
    const wBk = STATE.wBeak;
    const wExp = STATE.wExploded;
    const flexAmt = (STATE.poseFlex ?? 0.5) * 2.0;
    const speedMult = STATE.gaitPreset === 'sprint' ? 1.55 : 1.0;
    const gaitFreq = 5.4 * speedMult;

    // Continuous forward walking progression across stage + body stride surge
    const walkCycle = ((t * 0.55 * speedMult) % 1.0);
    const fwdZ = Math.sin(walkCycle * Math.PI * 2) * 0.45 * (1 - wExp * 0.7);
    const stepBounce = Math.abs(Math.sin(t * gaitFreq)) * 0.065 * (1 - wExp * 0.5);

    hexapod.root.scale.setScalar(0.74);
    hexapod.root.position.set(
      Math.cos(t * gaitFreq * 0.5) * 0.04 * (1 - wExp),
      0.15 + stepBounce,
      fwdZ
    );
    hexapod.root.rotation.set(
      0.04 + Math.sin(t * gaitFreq) * 0.055 * (1 - wExp),
      -0.32 + Math.sin(t * 0.8) * 0.08,
      Math.cos(t * gaitFreq) * 0.055 * (1 - wExp)
    );

    hexapod.mainGear.rotation.z = t * 4.5;
    hexapod.lidarDome.rotation.y = t * 6.5;

    // Core & Carapace Teardown
    const chasOpen = Math.max(wMan, wExp);
    hexapod.coreGroup.position.y = 0.15 + Math.max(wBk * 0.55, wExp * 0.85);
    hexapod.lowerDeck.position.y = -0.06 - wExp * 0.45;
    hexapod.carapacePlates.forEach((p) => {
      p.pivot.rotation.x = -chasOpen * 0.72;
      const r = 0.48 + wExp * 0.65;
      p.pivot.position.set(Math.cos(p.az) * r, 0.36 + wExp * 0.4, Math.sin(p.az) * r);
    });

    // Sensor Head (OPTICS)
    const optSep = Math.max(wOpt, wExp * 1.2);
    hexapod.sensorHead.position
      .copy(hexapod.sensorBasePos)
      .add(new THREE.Vector3(0, optSep * 0.15, optSep * 0.48));
    hexapod.lidarDome.position.y = 0.19 + optSep * 0.32;
    hexapod.stereoEyes.forEach((eye, idx) => {
      const sgn = idx === 0 ? -1 : 1;
      eye.position.set(sgn * (0.16 + optSep * 0.15), 0, 0.18 + optSep * 0.28);
    });

    // 6 Legs (18-DOF Tripod Gait + Isolation)
    const legLoads = {};
    hexapod.traceGroup.visible = true;

    hexapod.legs.forEach((leg, idx) => {
      const isL2 = leg.id === 'L2';
      const detach = isL2 ? Math.max(wArm, wExp) : Math.max(wSip * 0.65, wExp);

      // Tripod gait group A (L1, R2, L3) vs group B (R1, L2, R3)
      const tripodGroup = idx % 2 === 0 ? 0 : Math.PI;
      const gaitPhase = t * gaitFreq + tripodGroup;
      const strideZ = -Math.sin(gaitPhase) * (0.48 + 0.18 * flexAmt) * (1 - detach * 0.5);
      const liftY = Math.max(0, Math.cos(gaitPhase)) * (0.42 + 0.15 * flexAmt) * (1 - detach * 0.5);

      const reach = 1.38 + (isL2 ? wArm * 0.35 : 0);
      const targetX = Math.cos(leg.mountAngle) * reach;
      const targetZ = -Math.sin(leg.mountAngle) * reach + strideZ;
      const targetY = -0.82 + liftY;

      const ik = solve3DOFLegIK(
        targetX,
        targetY,
        targetZ,
        hexapod.L_COXA,
        hexapod.L_FEMUR,
        hexapod.L_TIBIA
      );

      const dirMount = leg.mountPos.clone().normalize();
      leg.legRoot.position.copy(leg.mountPos).addScaledVector(dirMount, detach * 0.45);
      leg.coxaYaw.rotation.y = ik.coxaYaw;
      leg.coxaHousing.position.x = detach * 0.18;

      leg.femurPitch.position.x = hexapod.L_COXA + detach * 0.38;
      leg.femurPitch.rotation.z = ik.femurAngle;

      leg.tibiaPitch.position.x = hexapod.L_FEMUR + detach * 0.46;
      leg.tibiaPitch.rotation.z = ik.tibiaAngle;
      leg.footTip.position.x = hexapod.L_TIBIA + detach * 0.32;

      const ring = hexapod.footRings[idx];
      ring.position.set(
        leg.mountPos.x + targetX,
        -0.86,
        leg.mountPos.z + targetZ
      );
      ring.scale.setScalar(1.0 - liftY * 1.4);

      const torquePct = Math.round(clamp(42 + (1 - liftY * 2.5) * 38 + Math.sin(gaitPhase) * 12, 28, 96));
      legLoads[leg.id] = torquePct;
    });

    return legLoads;
  }

  // -------------------------------------------------------------------------
  // 10. 3D PROJECTED LEADER CALLOUTS (MATCHING REFERENCE FRAMES)
  // -------------------------------------------------------------------------
  const calloutSvg = document.getElementById('callout-svg');
  const calloutsLayer = document.getElementById('callouts-layer');
  const tmpV = new THREE.Vector3();

  function projectToStage(worldVec) {
    tmpV.copy(worldVec).project(camera);
    if (tmpV.z > 1) return null;
    return [(tmpV.x * 0.5 + 0.5) * W, (-tmpV.y * 0.5 + 0.5) * H];
  }

  function getActiveCallouts() {
    if (!STATE.labels) return [];
    const list = [];

    if (STATE.unit === 'oc8') {
      if (STATE.exploded) {
        list.push(
          { world: new THREE.Vector3(0, 1.45, 0), labelX: 430, labelY: 225, align: 'left', title: 'REACTOR RING', sub: 'PUMP DRIVE' },
          { world: new THREE.Vector3(-0.35, 0.95, 0.35), labelX: 390, labelY: 325, align: 'left', title: 'PUMP CORE', sub: '7 PISTONS' },
          { world: new THREE.Vector3(0.95, 0.35, 0.8), labelX: 1055, labelY: 270, align: 'right', title: 'OPTIC ARRAY', sub: '2 × 52 MM LENS' },
          { world: new THREE.Vector3(1.1, 0.65, 0.2), labelX: 1085, labelY: 385, align: 'right', title: 'SHELL PETAL', sub: '6 × HINGED' },
          { world: new THREE.Vector3(-1.35, -0.35, 0.25), labelX: 395, labelY: 515, align: 'left', title: 'ARM CHAINS', sub: '202 LINKS · 409 WHEELS' },
          { world: new THREE.Vector3(0, -0.65, -1.1), labelX: 1075, labelY: 535, align: 'right', title: 'SIPHON NOZZLE', sub: '3 SLEEVES · 6 FLAPS' }
        );
      } else if (STATE.assembly === 'mantle') {
        list.push(
          { world: new THREE.Vector3(-0.22, 0.92, 0.32), labelX: 365, labelY: 342, align: 'left', title: 'DRIVE GEARS', sub: '44 + 18 TEETH' },
          { world: new THREE.Vector3(-0.18, 0.65, 0.38), labelX: 365, labelY: 445, align: 'left', title: 'PUMP CORE', sub: '7 PISTONS' },
          { world: new THREE.Vector3(-0.55, 0.15, 0.62), labelX: 365, labelY: 632, align: 'left', title: 'GLASS PORT', sub: 'PETAL 3' },
          { world: new THREE.Vector3(0.24, 1.08, 0.15), labelX: 1070, labelY: 318, align: 'right', title: 'REACTOR RING', sub: 'PUMP DRIVE' },
          { world: new THREE.Vector3(0.68, 0.42, 0.55), labelX: 1070, labelY: 575, align: 'right', title: 'SHELL PETAL', sub: '6 × HINGED' }
        );
      } else if (STATE.assembly === 'arm_r2') {
        list.push(
          { world: new THREE.Vector3(-1.45, 0.08, -0.25), labelX: 365, labelY: 280, align: 'left', title: 'GLASS LINK', sub: 'GEAR TRAIN' },
          { world: new THREE.Vector3(-1.85, -0.22, -0.35), labelX: 365, labelY: 492, align: 'left', title: 'SUCTION WHEEL', sub: '2 RIMS' },
          { world: new THREE.Vector3(-2.15, -0.45, -0.45), labelX: 365, labelY: 540, align: 'left', title: 'SPIRAL TIP', sub: '16 LINKS' },
          { world: new THREE.Vector3(-1.65, -0.35, -0.3), labelX: 365, labelY: 590, align: 'left', title: 'BALL JOINT', sub: '±22°' },
          { world: new THREE.Vector3(-0.72, -0.28, -0.25), labelX: 1065, labelY: 422, align: 'right', title: 'ROOT ACTUATOR', sub: 'ARM R2 · 3 DOF' }
        );
      } else if (STATE.assembly === 'optics') {
        list.push(
          { world: new THREE.Vector3(0.88, 0.18, 0.85), labelX: 1060, labelY: 285, align: 'right', title: 'IR RIM RING', sub: 'ANODIZED ORANGE' },
          { world: new THREE.Vector3(0.98, 0.16, 0.96), labelX: 1060, labelY: 395, align: 'right', title: '52 MM DOUBLET', sub: 'SAPPHIRE OPTIC' },
          { world: new THREE.Vector3(0.55, 0.16, 0.48), labelX: 380, labelY: 350, align: 'left', title: 'GIMBAL SLED', sub: 'CMOS TRACKER' }
        );
      } else if (STATE.assembly === 'siphon') {
        list.push(
          { world: new THREE.Vector3(0, -0.25, -1.25), labelX: 380, labelY: 330, align: 'left', title: 'TELESCOPIC SLEEVE', sub: '3 CONCENTRIC RINGS' },
          { world: new THREE.Vector3(0, -0.45, -1.65), labelX: 1060, labelY: 380, align: 'right', title: '6-FLAP NOZZLE', sub: 'THRUST VECTORING' },
          { world: new THREE.Vector3(0, -0.1, -0.85), labelX: 1060, labelY: 510, align: 'right', title: 'SIPHON GIMBAL', sub: 'HYDRO SEAL' }
        );
      } else if (STATE.assembly === 'beak') {
        list.push(
          { world: new THREE.Vector3(0, -0.78, 0.18), labelX: 380, labelY: 380, align: 'left', title: 'TWIN JAW', sub: 'CHITIN-TITANIUM' },
          { world: new THREE.Vector3(0, -0.68, -0.12), labelX: 1060, labelY: 420, align: 'right', title: 'RADULA RING', sub: '20-TOOTH ROTOR' }
        );
      }
    } else if (STATE.unit === 'hx18') {
      // Hexapod HX-18 Callouts
      if (STATE.exploded || STATE.assembly === 'mantle') {
        list.push(
          { world: new THREE.Vector3(0, 0.65, 0), labelX: 380, labelY: 295, align: 'left', title: 'CARAPACE PLATE', sub: '6 × HINGED ARMOUR' },
          { world: new THREE.Vector3(0, 0.35, 0), labelX: 380, labelY: 425, align: 'left', title: 'POWER & IMU CORE', sub: 'DUAL LIPO · GYRO' },
          { world: new THREE.Vector3(0, 0.35, 1.15), labelX: 1060, labelY: 315, align: 'right', title: 'LIDAR TURRET', sub: '360° SOLID-STATE' },
          { world: new THREE.Vector3(1.45, 0.0, 0), labelX: 1060, labelY: 485, align: 'right', title: '3-DOF LEG CHAIN', sub: 'COXA · FEMUR · TIBIA' }
        );
      } else if (STATE.assembly === 'arm_r2') {
        list.push(
          { world: new THREE.Vector3(1.05, 0.05, 0), labelX: 380, labelY: 310, align: 'left', title: 'COXA SERVO', sub: '±45° YAW GIMBAL' },
          { world: new THREE.Vector3(1.65, 0.12, 0), labelX: 1060, labelY: 340, align: 'right', title: 'FEMUR LINKAGE', sub: 'GLASS GEAR PORT' },
          { world: new THREE.Vector3(2.25, -0.45, 0), labelX: 1060, labelY: 510, align: 'right', title: 'PIEZO FOOT TIP', sub: 'CONTACT FORCE PAD' }
        );
      }
    } else if (window.__PELAGOS_FLEET && window.__PELAGOS_FLEET.getUnitCallouts) {
      return window.__PELAGOS_FLEET.getUnitCallouts(STATE.unit);
    }
    return list;
  }

  function renderCallouts() {
    const items = getActiveCallouts();
    if (!items.length) {
      calloutSvg.innerHTML = '';
      calloutsLayer.innerHTML = '';
      return;
    }
    let svgH = '';
    let htmlH = '';
    for (const c of items) {
      const pt = projectToStage(c.world);
      if (!pt) continue;
      const [px, py] = pt;
      const elbowX = c.align === 'left' ? c.labelX + 128 : c.labelX - 18;
      const elbowY = c.labelY + 6;
      svgH += `<polyline points="${px.toFixed(1)},${py.toFixed(1)} ${elbowX.toFixed(1)},${elbowY.toFixed(1)} ${c.labelX.toFixed(1)},${elbowY.toFixed(1)}" fill="none" stroke="#eb4d28" stroke-width="0.95" opacity="0.86"/>`;
      svgH += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.5" fill="#eb4d28"/>`;

      htmlH += `
        <div class="callout-item" style="left:${c.labelX}px;top:${c.labelY - 6}px">
          <div class="callout-title"><i></i><span>${c.title}</span></div>
          <div class="callout-sub">${c.sub}</div>
        </div>
      `;
    }
    calloutSvg.innerHTML = svgH;
    calloutsLayer.innerHTML = htmlH;
  }

  // -------------------------------------------------------------------------
  // 11. UPDATE HUD PANELS (01 TO 08) & OPERATOR CURSOR
  // -------------------------------------------------------------------------
  const p1ChartEl = document.getElementById('p1-chart');
  const p4GaugeEl = document.getElementById('p4-gauge');
  const opCursorEl = document.getElementById('op-cursor');
  const opRingEl = document.getElementById('op-ring');

  function renderP1Chart(curPressure, isHexapod, t) {
    const Wc = 262;
    const Hc = 90;
    if (!isHexapod) {
      // Pelagos OC-8: Mantle Pressure scrolling waveform
      let pathD = '';
      const N = STATE.pressureHist.length;
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * (Wc - 6);
        const y = 74 - clamp(STATE.pressureHist[i] / 100, 0, 1) * 58;
        pathD += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      const lastY = 74 - clamp(curPressure / 100, 0, 1) * 58;
      p1ChartEl.innerHTML = `
        <line x1="0" y1="16" x2="${Wc - 6}" y2="16" stroke="#dedad0" stroke-width="0.7" stroke-dasharray="2 3"/>
        <line x1="0" y1="45" x2="${Wc - 6}" y2="45" stroke="#dedad0" stroke-width="0.7" stroke-dasharray="2 3"/>
        <line x1="0" y1="74" x2="${Wc - 6}" y2="74" stroke="#b8b2a6" stroke-width="0.9"/>
        <line x1="${Wc - 6}" y1="8" x2="${Wc - 6}" y2="74" stroke="#b8b2a6" stroke-width="0.9"/>
        <text x="${Wc - 10}" y="13" font-size="7" text-anchor="end" fill="#9a948a" font-family="JetBrains Mono">100 KPA</text>
        <text x="${Wc - 10}" y="42" font-size="7" text-anchor="end" fill="#9a948a" font-family="JetBrains Mono">50 KPA</text>
        <path d="${pathD} L${Wc - 6} 74 L0 74 Z" fill="rgba(235, 77, 40, 0.08)"/>
        <path d="${pathD}" fill="none" stroke="#eb4d28" stroke-width="1.6"/>
        <circle cx="${Wc - 6}" cy="${lastY.toFixed(1)}" r="3.2" fill="#eb4d28"/>
        <text x="0" y="86" font-size="7.5" fill="#9a948a" font-family="JetBrains Mono">-3.2 S</text>
        <text x="${Wc - 6}" y="86" font-size="7.5" text-anchor="end" fill="#9a948a" font-family="JetBrains Mono">NOW</text>
      `;
    } else {
      // Hexapod HX-18: 6-Leg Foot Contact Strip Chart (like scorpion_0_f0.png)
      const legs = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'];
      let h = '';
      legs.forEach((lid, r) => {
        const y = 6 + r * 11;
        h += `<text x="0" y="${y + 7}" font-size="7.5" font-weight="700" fill="#7c776e" font-family="JetBrains Mono">${lid}</text>`;
        h += `<rect x="22" y="${y + 1}" width="${Wc - 28}" height="6" fill="#e5e1d7" rx="1"/>`;
        for (let seg = 0; seg < 5; seg++) {
          const phase = ((t * 0.6 + seg * 0.22 + (r % 2) * 0.11) % 1.0);
          const sx = 22 + phase * (Wc - 64);
          h += `<rect x="${sx.toFixed(1)}" y="${y + 1}" width="26" height="6" fill="${seg % 2 === r % 2 ? '#eb4d28' : '#262629'}" rx="1"/>`;
        }
      });
      h += `<text x="22" y="84" font-size="7.5" fill="#9a948a" font-family="JetBrains Mono">-2.4 S</text>`;
      h += `<text x="${Wc - 6}" y="84" font-size="7.5" text-anchor="end" fill="#9a948a" font-family="JetBrains Mono">NOW</text>`;
      p1ChartEl.innerHTML = h;
    }
  }

  function renderP4Gauge(pitchDeg, rollDeg) {
    const cx = 46;
    const cy = 46;
    const r = 41;
    p4GaugeEl.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f5f2eb" stroke="#cbc5b9" stroke-width="1.1"/>
      <g transform="translate(${cx} ${cy}) rotate(${rollDeg.toFixed(1)})">
        <path d="M-${r} 0 A${r} ${r} 0 0 0 ${r} 0 Z" fill="#e6e1d7"/>
        <line x1="-${r}" y1="0" x2="-10" y2="0" stroke="#eb4d28" stroke-width="2.1"/>
        <line x1="10" y1="0" x2="${r}" y2="0" stroke="#eb4d28" stroke-width="2.1"/>
        <polyline points="-10,0 -4,5 4,5 10,0" fill="none" stroke="#eb4d28" stroke-width="1.8"/>
      </g>
      <line x1="34" y1="24" x2="58" y2="24" stroke="#b8b2a6" stroke-width="0.9"/>
      <line x1="38" y1="35" x2="54" y2="35" stroke="#b8b2a6" stroke-width="0.9"/>
      <line x1="38" y1="57" x2="54" y2="57" stroke="#b8b2a6" stroke-width="0.9"/>
      <line x1="34" y1="68" x2="58" y2="68" stroke="#b8b2a6" stroke-width="0.9"/>
    `;
  }

  function updateHUD(t, limbMetrics, activeBeat) {
    const isHx = STATE.unit === 'hx18';
    const wJet = STATE.wJetting + STATE.wDeparting;
    const wAct = Math.max(STATE.wMantle, STATE.wArmR2, STATE.wOptics, STATE.wSiphon, STATE.wBeak, STATE.wExploded);

    // Top Header Load Meter & Metadata
    const loadVal = Math.round(clamp(12 + wJet * 64 + wAct * 4 + Math.sin(t * 2.3) * 1.5, 8, 96));
    document.getElementById('load-pct').textContent = `${loadVal}%`;
    const activeTicks = Math.round((loadVal / 100) * 28);
    loadTickSpans.forEach((sp, idx) => {
      sp.className = idx < activeTicks ? (idx > 20 ? 'burst' : 'on') : '';
    });

    const sec = Math.floor(t);
    document.getElementById('meta-runtime').textContent = `00:00:${String(sec).padStart(2, '0')}`;

    // Determine Status & Mode text
    const unitLocomotionMap = {
      oc8:  { status: 'PROPULSION', mode: 'SWIM & CURL', sub: '8 ARMS · TRAVELLING WAVE' },
      hx18: { status: 'WALKING',    mode: 'TRIPOD WALK', sub: '6 LEGS · FORWARD STRIDE' },
      sc8:  { status: 'WALK & STRIKE', mode: 'PROWL & STRIKE', sub: '8 LEGS · OVERHEAD TAIL ARC' },
      hb7:  { status: 'HOVERING',   mode: 'FLIGHT WAVE', sub: '4 WINGS · 230 HZ STROKE' },
      cn12: { status: 'WALKING',    mode: 'CANINE TROT', sub: '4 LEGS · FORWARD STRIDE' },
      av6:  { status: 'FLYING',     mode: 'WING STROKE', sub: '20 FEATHERS · GLIDE & FLAP' },
      ar8:  { status: 'WALKING',    mode: 'OCTOPOD WALK', sub: '8 ARCH LEGS · FORWARD GAIT' },
      op24: { status: 'SLITHERING', mode: 'SERPENT WAVE', sub: '22 VERTEBRAE · VIPER STRIKE' },
      ac14: { status: 'RUNNING',    mode: 'FLEX GALLOP', sub: '6-LINK SPINE · SPRINT STRIDE' },
      hm22: { status: 'WALKING',    mode: 'BIPED STRIDE', sub: '22-DOF ANDROID · HEEL-TOE GAIT' },
    };
    const uLoco = unitLocomotionMap[STATE.unit] || unitLocomotionMap.oc8;
    let statusTxt = uLoco.status;
    let modeBigTxt = uLoco.mode;
    let modeSubTxt = uLoco.sub;
    let warnStatus = false;

    if (STATE.exploded) {
      statusTxt = 'TEARDOWN';
      modeBigTxt = 'TEARDOWN';
      const ttDeg = Math.round(((STATE.turntableAngle * 180) / Math.PI) % 360);
      modeSubTxt = `TURNTABLE ${(ttDeg + 360) % 360}° · ${Math.round(STATE.wExploded * 100)}% APART`;
      warnStatus = true;
    } else if (STATE.assembly === 'mantle' && STATE.wMantle > 0.05) {
      statusTxt = isHx ? 'CHASSIS OPEN' : 'MANTLE OPEN';
      modeBigTxt = uLoco.mode;
      modeSubTxt = `${isHx ? 'CHASSIS' : 'CORE'} · ${Math.round(STATE.wMantle * 100)}% APART`;
      warnStatus = true;
    } else if (STATE.assembly === 'arm_r2' && STATE.wArmR2 > 0.05) {
      statusTxt = 'LIMB ISOLATED';
      modeBigTxt = uLoco.mode;
      modeSubTxt = `LIMB · ${Math.round(STATE.wArmR2 * 100)}% APART`;
      warnStatus = true;
    } else if (STATE.assembly === 'siphon' && STATE.wSiphon > 0.05) {
      statusTxt = 'TAIL / DRIVE OPEN';
      modeBigTxt = uLoco.mode;
      modeSubTxt = `DRIVE · ${Math.round(STATE.wSiphon * 100)}% APART`;
      warnStatus = true;
    } else if (STATE.assembly === 'beak' && STATE.wBeak > 0.05) {
      statusTxt = 'CORE OPEN';
      modeBigTxt = uLoco.mode;
      modeSubTxt = `LOWER · ${Math.round(STATE.wBeak * 100)}% APART`;
      warnStatus = true;
    } else if (STATE.assembly === 'optics' && STATE.wOptics > 0.25) {
      statusTxt = 'OPTICS OPEN';
      modeBigTxt = uLoco.mode;
      modeSubTxt = `OPTICS · ${Math.round(STATE.wOptics * 100)}% APART`;
    }

    document.getElementById('meta-status').textContent = statusTxt;
    document.getElementById('meta-status-dot').className = warnStatus ? 'status-dot warn' : 'status-dot';
    document.getElementById('mode-big').textContent = modeBigTxt;
    document.getElementById('mode-sub').textContent = modeSubTxt;
    document.getElementById('vp-isolate-tag').textContent = STATE.exploded
      ? 'ISOLATE · ALL'
      : `ISOLATE · ${STATE.assembly.toUpperCase().replace('_', ' ')}`;

    // Panel 01: Jet / Gait
    const kpa = Math.round(17 + wJet * 48 + STATE.wMantle * 11 + Math.sin(t * 3.1) * 3);
    const thrust = Math.round(6 + wJet * 32);
    if (!isHx) {
      document.getElementById('p1-val1').textContent = String(kpa);
      document.getElementById('p1-val2').textContent = `${thrust} N`;
      document.getElementById('p1-foot-v1').textContent = wJet > 0.15 ? '1.8 HZ' : '0.0 HZ';
      document.getElementById('p1-foot-v2').textContent = wJet > 0.15 ? 'SIPHON JETTING' : 'SIPHON IDLE';
    } else {
      const hz = wJet > 0.1 ? (1.8 + wJet * 0.8).toFixed(1) : '0.8';
      document.getElementById('p1-val1').textContent = hz;
      document.getElementById('p1-val2').textContent = `${Math.round(Number(hz) * 145)} MM/S`;
      document.getElementById('p1-foot-v1').textContent = 'TRIPOD · 6 FEET';
      document.getElementById('p1-foot-v2').textContent = 'DUTY 50%';
    }
    renderP1Chart(kpa, isHx, t);

    // Panel 02: Power
    const battPct = t > 9 ? 85 : 86;
    const drawW = (9.4 + wAct * 14.0 + wJet * 18.5).toFixed(1);
    const tempC = Math.round(24 + wAct * 1.4 + (t > 8 ? 1 : 0));
    document.getElementById('p2-batt').textContent = String(battPct);
    document.getElementById('p2-draw').textContent = `${drawW} W`;
    document.getElementById('p2-cell').textContent = '3.72 V';
    document.getElementById('p2-temp').textContent = `${tempC} °C`;
    battCellDivs.forEach((c, i) => {
      c.style.background = i < 2 ? '#eb4d28' : i < 8 ? '#1e9e5a' : '#dfdbd2';
    });

    // Panel 03: Arm Curl / Leg Servos
    const p3Badge = document.getElementById('p3-badge');
    if (STATE.exploded) {
      p3Badge.textContent = 'DETACHED';
      p3Badge.className = 'pill orange';
    } else {
      p3Badge.textContent = isHx ? 'HOLDING' : 'CURLING';
      p3Badge.className = 'pill green';
    }

    const cfg = UNIT_CONFIG[STATE.unit];
    cfg.limbs.forEach((id) => {
      const bar = document.getElementById(`curl-bar-${id}`);
      const val = document.getElementById(`curl-val-${id}`);
      if (!bar || !val) return;
      const isDetached =
        STATE.exploded ||
        (STATE.unit === 'oc8' && id === 'R2' && STATE.wArmR2 > 0.25) ||
        (STATE.unit === 'hx18' && id === 'L2' && STATE.wArmR2 > 0.25);

      if (isDetached) {
        bar.style.width = '0%';
        val.textContent = 'DETACHED';
        val.className = 'curl-val detached';
      } else {
        const pct = limbMetrics[id] ?? 85;
        bar.style.width = `${pct}%`;
        val.textContent = `${pct}%`;
        val.className = 'curl-val';
      }
    });

    // Panel 04: Depth / Attitude
    const depthM = (12.43 - Math.sin(t * 0.7) * 0.06).toFixed(2);
    const vs = (Math.cos(t * 0.9) * 0.06).toFixed(2);
    const pitchDeg = Math.sin(t * 1.1) * 2.1;
    const rollDeg = Math.cos(t * 0.85) * 1.95;
    document.getElementById('p4-v1').textContent = isHx ? '142.0 MM' : `${depthM} M`;
    document.getElementById('p4-v2').textContent = isHx
      ? `${pitchDeg >= 0 ? '+' : ''}${(pitchDeg * 3.2).toFixed(1)} °/S`
      : `${Number(vs) >= 0 ? '+' : ''}${vs} M/S`;
    document.getElementById('p4-v3').textContent = `${pitchDeg >= 0 ? '+' : ''}${pitchDeg.toFixed(2)}°`;
    document.getElementById('p4-v4').textContent = `${rollDeg >= 0 ? '+' : ''}${rollDeg.toFixed(2)}°`;
    document.getElementById('p4-hold').textContent = wJet > 0.2 ? 'VECTOR' : 'STATION';
    document.getElementById('p4-speed').textContent = `${(0.02 + wJet * 0.85).toFixed(2)} M/S`;
    renderP4Gauge(pitchDeg, rollDeg);

    // Panel 05 & 06 Button Active States
    cfg.assemblies.forEach((a) => {
      const b = btnElements[a.key];
      if (b) b.classList.toggle('active', !STATE.exploded && STATE.assembly === a.key);
    });
    if (btnElements.labels) btnElements.labels.classList.toggle('active', STATE.labels);
    if (btnElements.exploded) btnElements.exploded.classList.toggle('active', STATE.exploded);
    if (btnElements.wake) btnElements.wake.classList.toggle('active', STATE.jetWake || wJet > 0.2);
    if (btnElements.turntable) btnElements.turntable.classList.toggle('active', STATE.turntable);

    // Panel 07 Subsystems Matrix
    cfg.subsystems.forEach((s) => {
      const row = document.getElementById(`sub-row-${s.idx}`);
      const pill = document.getElementById(`sub-pill-${s.idx}`);
      if (!row || !pill) return;

      if (STATE.exploded) {
        row.classList.toggle('active', s.idx === '02');
        pill.textContent = 'DETACHED';
        pill.className = 'pill orange';
      } else if (s.key === 'mantle' && STATE.wMantle > 0.2) {
        row.classList.add('active');
        pill.textContent = 'OPEN';
        pill.className = 'pill orange';
      } else if (s.key === 'mantle_core' && STATE.wMantle > 0.2) {
        row.classList.remove('active');
        pill.textContent = 'EXPOSED';
        pill.className = 'pill orange';
      } else if (s.key === 'arm_r2' && STATE.wArmR2 > 0.2) {
        row.classList.add('active');
        pill.textContent = 'DETACHED';
        pill.className = 'pill orange';
      } else if (s.key === 'optics' && STATE.assembly === 'optics') {
        row.classList.add('active');
        pill.textContent = STATE.wOptics > 0.35 ? 'OPEN' : s.defaultBadge;
        pill.className = STATE.wOptics > 0.35 ? 'pill orange' : `pill ${s.defaultCls}`;
      } else if (s.key === 'siphon' && STATE.wSiphon > 0.2) {
        row.classList.add('active');
        pill.textContent = 'OPEN';
        pill.className = 'pill orange';
      } else if (s.key === 'beak' && STATE.wBeak > 0.2) {
        row.classList.add('active');
        pill.textContent = 'OPEN';
        pill.className = 'pill orange';
      } else {
        row.classList.remove('active');
        pill.textContent = s.defaultBadge;
        pill.className = `pill ${s.defaultCls}`;
      }
    });

    // Panel 08 Scrubber & Operation Log
    const pct = clamp((t / DURATION) * 100, 0, 100);
    document.getElementById('scrubber-fill').style.width = `${pct.toFixed(2)}%`;
    document.getElementById('scrubber-knob').style.left = `${pct.toFixed(2)}%`;
    document.getElementById('p8-time').textContent = `00:${String(Math.floor(t)).padStart(2, '0')} / 00:25`;
    document.getElementById('p8-op-action').textContent = activeBeat
      ? activeBeat.opLog[STATE.unit]
      : `OPERATOR · ISOLATE ${STATE.assembly.toUpperCase().replace('_', ' ')}`;
  }

  // Virtual Operator Cursor choreography during Auto-Tour
  function updateOperatorCursor(t, nowSec) {
    if (!STATE.autoTour) {
      opCursorEl.style.display = 'none';
      opRingEl.style.opacity = '0';
      return;
    }
    opCursorEl.style.display = 'block';

    // Find current & next beat to smoothly glide cursor between buttons
    let curIdx = 0;
    for (let i = 0; i < TIMELINE_BEATS.length; i++) {
      if (t >= TIMELINE_BEATS[i].t) curIdx = i;
    }
    const curBeat = TIMELINE_BEATS[curIdx];
    const nextBeat = TIMELINE_BEATS[(curIdx + 1) % TIMELINE_BEATS.length];

    const curBtn = btnElements[curBeat.btnTarget] || btnElements.optics;
    const nextBtn = btnElements[nextBeat.btnTarget] || btnElements.mantle;
    const [x0, y0] = getElementStageCenter(curBtn);
    const [x1, y1] = getElementStageCenter(nextBtn);

    const moveWindow = 0.85;
    const timeToNext = nextBeat.t > curBeat.t ? nextBeat.t - t : DURATION - t;
    const uMove = clamp(1 - timeToNext / moveWindow, 0, 1);
    const k = smoother(uMove);
    const cx = lerp(x0 + 18, x1 + 4, k);
    const cy = lerp(y0 + 14, y1 + 4, k);

    const sinceBeat = t - curBeat.t;
    const press = sinceBeat >= 0 && sinceBeat < 0.22;
    opCursorEl.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) scale(${press ? 0.88 : 1})`;

    if (sinceBeat >= 0 && sinceBeat < 0.55) {
      const p = sinceBeat / 0.55;
      opRingEl.style.left = `${x0.toFixed(1)}px`;
      opRingEl.style.top = `${y0.toFixed(1)}px`;
      opRingEl.style.opacity = (1 - p).toFixed(2);
      opRingEl.style.transform = `scale(${(0.4 + p * 0.9).toFixed(2)})`;
    } else {
      const rAge = nowSec - STATE.ringAnim.t;
      if (rAge >= 0 && rAge < 0.5) {
        const p = rAge / 0.5;
        opRingEl.style.left = `${STATE.ringAnim.x.toFixed(1)}px`;
        opRingEl.style.top = `${STATE.ringAnim.y.toFixed(1)}px`;
        opRingEl.style.opacity = (1 - p).toFixed(2);
        opRingEl.style.transform = `scale(${(0.4 + p * 0.9).toFixed(2)})`;
      } else {
        opRingEl.style.opacity = '0';
      }
    }
  }

  // -------------------------------------------------------------------------
  // 12. MAIN 60 FPS RENDER LOOP & EXTERNAL COMMAND API
  // -------------------------------------------------------------------------
  buildUnitUI();
  fitViewport();

  let prevTime = performance.now() * 0.001;
  let lastHistSample = 0;

  const urlParams = new URLSearchParams(window.location.search);
  const pauseShot = urlParams.get('pause') === '1';
  let renderedFrames = 0;

  const urlAnimOffset = parseFloat(urlParams.get('animOffset') || '0') || 0;
  function animate() {
    renderedFrames++;
    if (!pauseShot || renderedFrames < 2) {
      requestAnimationFrame(animate);
    }
    const rawNow = performance.now() * 0.001;
    const dt = Math.min(0.05, Math.max(0.001, rawNow - prevTime));
    prevTime = rawNow;
    const now = rawNow + urlAnimOffset;

    // Return to auto-tour after 25s of manual inactivity
    if (!STATE.autoTour && now - STATE.lastManualInputTime > 25.0) {
      STATE.autoTour = true;
    }

    if (STATE.playing && !scrubbing && STATE.autoTour) {
      STATE.time = (STATE.time + dt) % DURATION;
    }

    let activeBeat = null;
    if (STATE.autoTour) {
      for (let i = 0; i < TIMELINE_BEATS.length; i++) {
        if (STATE.time >= TIMELINE_BEATS[i].t && STATE.time < TIMELINE_BEATS[i].end) {
          activeBeat = TIMELINE_BEATS[i];
          break;
        }
      }
      if (activeBeat) {
        if (STATE.unit === 'oc8') {
          STATE.assembly = activeBeat.assembly;
          STATE.labels = activeBeat.labels;
          STATE.exploded = activeBeat.exploded;
          STATE.jetWake = activeBeat.jetWake;
          STATE.turntable = activeBeat.turntable;
        } else {
          // For terrestrial & aerial biomimetic units, stay intact in HERO locomotion mode by default
          STATE.assembly = 'hero';
          STATE.exploded = false;
          STATE.turntable = false;
        }
      }
    }

    // Smoothly interpolate subsystem opening weights (0..1)
    const damp = 1 - Math.exp(-dt * 5.2);
    const tgtOpt = STATE.assembly === 'optics' && (!STATE.autoTour || STATE.time > 5.3) ? 1 : 0;
    const tgtMan = STATE.assembly === 'mantle' ? 1 : 0;
    const tgtArm = STATE.assembly === 'arm_r2' ? 1 : 0;
    const tgtSip = STATE.assembly === 'siphon' ? 1 : 0;
    const tgtBk = STATE.assembly === 'beak' ? 1 : 0;
    const tgtExp = STATE.exploded ? 1 : (STATE.explodeSlider ?? 0);
    const tgtJet = (STATE.autoTour && STATE.time < 3.1) || STATE.gaitPreset === 'sprint' ? 1 : 0;
    const tgtDep = (STATE.autoTour && STATE.time > 22.0) || STATE.gaitPreset === 'cruise' ? 1 : 0;

    STATE.wOptics = lerp(STATE.wOptics, tgtOpt, damp);
    STATE.wMantle = lerp(STATE.wMantle, tgtMan, damp);
    STATE.wArmR2 = lerp(STATE.wArmR2, tgtArm, damp);
    STATE.wSiphon = lerp(STATE.wSiphon, tgtSip, damp);
    STATE.wBeak = lerp(STATE.wBeak, tgtBk, damp);
    STATE.wExploded = lerp(STATE.wExploded, tgtExp, damp);
    STATE.wJetting = lerp(STATE.wJetting, tgtJet, damp);
    STATE.wDeparting = lerp(STATE.wDeparting, tgtDep, damp);

    if (STATE.turntable) {
      STATE.turntableAngle += dt * 0.55;
    }

    // Camera target pose based on active assembly or beat
    const CAM_PRESETS = {
      hero: { az: 0.38, el: 0.15, d: 6.45, tx: 0, ty: -0.08, tz: 0 },
      optics: { az: 0.48, el: 0.14, d: 6.15, tx: 0.05, ty: -0.05, tz: 0.05 },
      mantle: { az: 0.18, el: 0.24, d: 6.35, tx: 0, ty: 0.12, tz: 0 },
      arm_r2: { az: 0.26, el: 0.18, d: 6.55, tx: -0.35, ty: -0.04, tz: 0.08 },
      siphon: { az: 2.35, el: 0.16, d: 6.25, tx: 0, ty: -0.08, tz: -0.15 },
      beak: { az: 0.12, el: -0.18, d: 6.1, tx: 0, ty: -0.22, tz: 0 },
    };
    const preset = activeBeat ? activeBeat.cam : CAM_PRESETS[STATE.assembly] || CAM_PRESETS.hero;
    const targetAz = preset.az + (STATE.turntable ? STATE.turntableAngle : 0) + STATE.userAzOffset;
    const targetEl = clamp(preset.el + STATE.userElOffset, -1.1, 1.1);
    const targetDist = (STATE.wExploded > 0.3 ? 7.45 : preset.d) * STATE.userDistScale;

    STATE.camAz = lerp(STATE.camAz, targetAz, damp);
    STATE.camEl = lerp(STATE.camEl, targetEl, damp);
    STATE.camDist = lerp(STATE.camDist, targetDist, damp);
    STATE.camTarget.lerp(new THREE.Vector3(preset.tx, preset.ty, preset.tz), damp);

    camera.position.set(
      STATE.camTarget.x + STATE.camDist * Math.cos(STATE.camEl) * Math.sin(STATE.camAz),
      STATE.camTarget.y + STATE.camDist * Math.sin(STATE.camEl),
      STATE.camTarget.z + STATE.camDist * Math.cos(STATE.camEl) * Math.cos(STATE.camAz)
    );
    camera.lookAt(STATE.camTarget);
    camera.updateMatrixWorld();

    // Update active 3D model kinematics
    const limbMetrics =
      STATE.unit === 'oc8'
        ? updatePelagosPose(now, dt)
        : STATE.unit === 'hx18'
        ? updateHexapodPose(now)
        : window.__PELAGOS_FLEET
        ? window.__PELAGOS_FLEET.updateUnitPose(STATE.unit, now, dt)
        : {};

    // Update HUD & Callout DOM at 16 Hz (every 60ms) to avoid 60Hz SVG innerHTML layout thrashing on CPU
    if (now - lastHistSample > 0.06 || renderedFrames <= 2) {
      lastHistSample = now;
      const wJ = STATE.wJetting + STATE.wDeparting;
      const pVal = 17 + wJ * 48 + STATE.wMantle * 11 + Math.sin(now * 3.1) * 3;
      STATE.pressureHist.push(pVal);
      if (STATE.pressureHist.length > 48) STATE.pressureHist.shift();
      renderCallouts();
      updateHUD(STATE.time, limbMetrics, activeBeat);
      if (window.__PELAGOS_FLEET && window.__PELAGOS_FLEET.onHudTick) {
        window.__PELAGOS_FLEET.onHudTick(now, limbMetrics);
      }
    }

    renderDraftingBackdrop(STATE.camAz, STATE.camEl);
    renderer.render(scene, camera);
    updateOperatorCursor(STATE.time, now);
  }

  // Expose internal core objects for the Biomimetic Fleet & 10-Feature Expansion module
  window.__PELAGOS_CORE = {
    W,
    H,
    scene,
    camera,
    renderer,
    canvas,
    appEl,
    MATS,
    STATE,
    UNIT_CONFIG,
    TIMELINE_BEATS,
    btnElements,
    castMesh,
    createGearGeometry,
    buildUnitUI,
    selectAssembly,
    toggleDisplay,
    takeManualControl,
    triggerClickPulse,
    projectToStage,
    renderCallouts,
    updateHUD,
    pelagos,
    hexapod,
  };

  // Expose programmatic API for testing & external inspection
  window.__PELAGOS_SIM = {
    getState: () => ({
      unit: STATE.unit,
      time: Number(STATE.time.toFixed(2)),
      assembly: STATE.assembly,
      exploded: STATE.exploded,
      labels: STATE.labels,
      jetWake: STATE.jetWake,
      turntable: STATE.turntable,
      xray: !!STATE.xray,
      thermal: !!STATE.thermal,
      colorTheme: STATE.colorTheme || 'pelagos',
    }),
    setUnit: (u) => {
      if (UNIT_CONFIG[u]) {
        STATE.unit = u;
        buildUnitUI();
      }
    },
    setTime: (t) => {
      STATE.time = clamp(Number(t), 0, DURATION);
      STATE.playing = false;
      STATE.autoTour = true;
    },
    selectAssembly: (k) => {
      takeManualControl();
      selectAssembly(k);
    },
    toggleDisplay: (k) => {
      takeManualControl();
      toggleDisplay(k);
    },
  };

  // Support URL query params (?unit=oc8|hx18|sc8|hb7|cn12|av6|ar8|op24|ac14&t=7.4&assembly=mantle&exploded=1&settle=1)
  const params = new URLSearchParams(window.location.search);
  if (params.has('unit') && UNIT_CONFIG[params.get('unit')]) {
    STATE.unit = params.get('unit');
    buildUnitUI();
  }
  if (params.has('t')) {
    STATE.time = clamp(parseFloat(params.get('t')) || 0, 0, DURATION);
  }
  if (params.has('assembly')) {
    STATE.autoTour = false;
    selectAssembly(params.get('assembly'));
  }
  if (params.has('exploded')) {
    STATE.autoTour = false;
    STATE.exploded = params.get('exploded') === '1' || params.get('exploded') === 'true';
    if (STATE.exploded) {
      STATE.labels = true;
      STATE.turntable = true;
    }
  }
  if (params.has('settle')) {
    // Run 90 virtual sub-steps so spring weights and camera settle immediately
    const savedPlay = STATE.playing;
    STATE.playing = false;
    for (let s = 0; s < 90; s++) {
      let ab = null;
      if (STATE.autoTour) {
        for (let i = 0; i < TIMELINE_BEATS.length; i++) {
          if (STATE.time >= TIMELINE_BEATS[i].t && STATE.time < TIMELINE_BEATS[i].end) {
            ab = TIMELINE_BEATS[i];
            break;
          }
        }
        if (ab) {
          STATE.assembly = ab.assembly;
          STATE.labels = ab.labels;
          STATE.exploded = ab.exploded;
          STATE.jetWake = ab.jetWake;
          STATE.turntable = ab.turntable;
        }
      }
      STATE.wOptics = STATE.assembly === 'optics' && (!STATE.autoTour || STATE.time > 5.3) ? 1 : 0;
      STATE.wMantle = STATE.assembly === 'mantle' ? 1 : 0;
      STATE.wArmR2 = STATE.assembly === 'arm_r2' ? 1 : 0;
      STATE.wSiphon = STATE.assembly === 'siphon' ? 1 : 0;
      STATE.wBeak = STATE.assembly === 'beak' ? 1 : 0;
      STATE.wExploded = STATE.exploded ? 1 : 0;
      STATE.wJetting = STATE.autoTour && STATE.time < 3.1 ? 1 : 0;
      STATE.wDeparting = STATE.autoTour && STATE.time > 22.0 ? 1 : 0;
      if (ab) {
        STATE.camAz = ab.cam.az;
        STATE.camEl = ab.cam.el;
        STATE.camDist = STATE.exploded ? 7.45 : ab.cam.d;
        STATE.camTarget.set(ab.cam.tx, ab.cam.ty, ab.cam.tz);
      }
    }
    if (params.get('pause') !== '1') STATE.playing = savedPlay;
  }

  requestAnimationFrame(animate);
})();
