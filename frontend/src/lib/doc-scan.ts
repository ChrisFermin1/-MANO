// "Escanear una nota" camera: find the paper in a camera frame, then straighten and clean it up.
// Plain image math (no AI, no libraries) so it runs several times a second on a phone.
// Works on ImageData-like objects so it can run on any canvas.

export type Point = { x: number; y: number };
/** Corners in order: top-left, top-right, bottom-right, bottom-left */
export type Quad = [Point, Point, Point, Point];
type Pixels = { data: Uint8ClampedArray; width: number; height: number };

const luma = (d: Uint8ClampedArray, i: number) => (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;

/** Otsu: the brightness that best splits the frame into "paper" (light) and "background" (darker). */
function otsu(gray: Float32Array): number {
  const hist = new Array(256).fill(0);
  for (const v of gray) hist[Math.min(255, Math.max(0, Math.round(v)))]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) {
      best = between;
      threshold = i;
    }
  }
  return threshold;
}

const area = (q: Quad) =>
  Math.abs(q.reduce((s, p, i) => s + p.x * q[(i + 1) % 4].y - q[(i + 1) % 4].x * p.y, 0)) / 2;

function isConvex(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross === 0) return false;
    if (sign && Math.sign(cross) !== sign) return false;
    sign = Math.sign(cross);
  }
  return true;
}

/**
 * Find the paper: the biggest light, page-shaped area in a small frame (≈240px wide).
 * Returns its 4 corners, or null when there's no clear page (too small, too big, or not 4-sided).
 */
export function findPaper(frame: Pixels): Quad | null {
  const { data, width: w, height: h } = frame;
  const n = w * h;
  // gray + a light 3×3 blur (pen strokes and lines on the paper shouldn't split it apart)
  const raw = new Float32Array(n);
  for (let p = 0; p < n; p++) raw[p] = luma(data, p * 4);
  const gray = new Float32Array(n);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
            s += raw[yy * w + xx];
            c++;
          }
        }
      gray[y * w + x] = s / c;
    }
  const t = otsu(gray);
  const light = new Uint8Array(n);
  for (let p = 0; p < n; p++) light[p] = gray[p] > t ? 1 : 0;

  // biggest connected light region (4-neighbours)
  const label = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let bestSize = 0, bestLabel = -1, next = 0;
  for (let start = 0; start < n; start++) {
    if (!light[start] || label[start] !== -1) continue;
    let head = 0, tail = 0, size = 0;
    queue[tail++] = start;
    label[start] = next;
    while (head < tail) {
      const p = queue[head++];
      size++;
      const x = p % w, y = (p / w) | 0;
      if (x > 0 && light[p - 1] && label[p - 1] === -1) { label[p - 1] = next; queue[tail++] = p - 1; }
      if (x < w - 1 && light[p + 1] && label[p + 1] === -1) { label[p + 1] = next; queue[tail++] = p + 1; }
      if (y > 0 && light[p - w] && label[p - w] === -1) { label[p - w] = next; queue[tail++] = p - w; }
      if (y < h - 1 && light[p + w] && label[p + w] === -1) { label[p + w] = next; queue[tail++] = p + w; }
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = next;
    }
    next++;
  }
  // a page fills a good part of the frame, but not all of it (then it's just a light background)
  if (bestLabel < 0 || bestSize < n * 0.12 || bestSize > n * 0.93) return null;

  // A page has a SHARP edge (paper → table). A patch of light on a table fades out gradually,
  // so the brightness step across its border is small: that's not a page.
  let edgeSteps = 0, edgeCount = 0;
  for (let p = 0; p < n; p++) {
    if (label[p] !== bestLabel) continue;
    const x = p % w, y = (p / w) | 0;
    for (const q of [x > 1 ? p - 2 : -1, x < w - 2 ? p + 2 : -1, y > 1 ? p - 2 * w : -1, y < h - 2 ? p + 2 * w : -1]) {
      if (q >= 0 && label[q] !== bestLabel) {
        edgeSteps += gray[p] - gray[q];
        edgeCount++;
      }
    }
  }
  if (!edgeCount || edgeSteps / edgeCount < 18) return null;

  // corners = the region's extreme points along the two diagonals
  let tl = { x: 0, y: 0 }, tr = tl, br = tl, bl = tl;
  let minSum = Infinity, maxSum = -Infinity, minDiff = Infinity, maxDiff = -Infinity;
  for (let p = 0; p < n; p++) {
    if (label[p] !== bestLabel) continue;
    const x = p % w, y = (p / w) | 0;
    if (x + y < minSum) { minSum = x + y; tl = { x, y }; }
    if (x + y > maxSum) { maxSum = x + y; br = { x, y }; }
    if (x - y > maxDiff) { maxDiff = x - y; tr = { x, y }; }
    if (x - y < minDiff) { minDiff = x - y; bl = { x, y }; }
  }
  const quad: Quad = [tl, tr, br, bl];
  // page-shaped: convex, and the 4 corners cover most of the light region (not a blob or a lamp)
  if (!isConvex(quad)) return null;
  const quadArea = area(quad);
  if (quadArea < n * 0.1 || bestSize / quadArea < 0.82) return null;
  return quad;
}

/** True when two outlines are about the same (the phone and the paper are holding still). */
export function sameQuad(a: Quad | null, b: Quad | null, frameDiagonal: number): boolean {
  if (!a || !b) return false;
  const moved = a.reduce((s, p, i) => s + Math.hypot(p.x - b[i].x, p.y - b[i].y), 0) / 4;
  return moved < frameDiagonal * 0.02;
}

/** Solve the 8 numbers of the perspective map from the output rectangle back to the photo. */
function homography(from: Quad, to: Quad): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i], { x: u, y: v } = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  // Gaussian elimination with partial pivoting (8×8)
  for (let c = 0; c < 8; c++) {
    let pivot = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[pivot][c])) pivot = r;
    [A[c], A[pivot]] = [A[pivot], A[c]];
    [b[c], b[pivot]] = [b[pivot], b[c]];
    for (let r = c + 1; r < 8; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = new Array(8).fill(0);
  for (let r = 7; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < 8; k++) s -= A[r][k] * h[k];
    h[r] = s / A[r][r];
  }
  return h;
}

/**
 * Cut the paper out of the photo and make it flat (as if shot straight on), at most `maxSide` px,
 * with the contrast stretched so pen on paper reads clearly.
 */
export function flattenPaper(photo: Pixels, quad: Quad, maxSide = 1600): ImageData {
  const [tl, tr, br, bl] = quad;
  const width = Math.max(Math.hypot(tr.x - tl.x, tr.y - tl.y), Math.hypot(br.x - bl.x, br.y - bl.y));
  const height = Math.max(Math.hypot(bl.x - tl.x, bl.y - tl.y), Math.hypot(br.x - tr.x, br.y - tr.y));
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const W = Math.max(1, Math.round(width * scale)), H = Math.max(1, Math.round(height * scale));
  const [a, b, c, d, e, f, g, hh] = homography(
    [{ x: 0, y: 0 }, { x: W - 1, y: 0 }, { x: W - 1, y: H - 1 }, { x: 0, y: H - 1 }],
    quad,
  );
  const out = new ImageData(W, H);
  const src = photo.data, sw = photo.width, sh = photo.height;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const den = g * x + hh * y + 1;
      const sx = Math.min(sw - 1, Math.max(0, Math.round((a * x + b * y + c) / den)));
      const sy = Math.min(sh - 1, Math.max(0, Math.round((d * x + e * y + f) / den)));
      const si = (sy * sw + sx) * 4, oi = (y * W + x) * 4;
      out.data[oi] = src[si];
      out.data[oi + 1] = src[si + 1];
      out.data[oi + 2] = src[si + 2];
      out.data[oi + 3] = 255;
    }
  return stretchContrast(out);
}

/** Levels: the darkest 2% becomes black and the brightest 2% white (shadows and dim light fade). */
export function stretchContrast(img: ImageData): ImageData {
  const n = img.width * img.height;
  const hist = new Array(256).fill(0);
  for (let p = 0; p < n; p++) hist[Math.round(luma(img.data, p * 4))]++;
  let lo = 0, hi = 255, acc = 0;
  for (; lo < 255 && (acc += hist[lo]) < n * 0.02; lo++);
  acc = 0;
  for (; hi > 0 && (acc += hist[hi]) < n * 0.02; hi--);
  if (hi - lo < 30) return img; // flat image: leave it alone
  const k = 255 / (hi - lo);
  for (let i = 0; i < img.data.length; i += 4)
    for (let ch = 0; ch < 3; ch++) img.data[i + ch] = Math.min(255, Math.max(0, (img.data[i + ch] - lo) * k));
  return img;
}
