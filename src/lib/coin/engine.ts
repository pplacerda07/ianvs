// Motor 3D da moeda (three.js). Uma instância por <canvas>.
// Recalcula só o que mudou: foto ajustada → contorno → relevo → geometria → borda.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ctx2d, makeCanvas, NA, processFace, ringColor, type ProcessedFace, type Source } from "./imaging";
import { flatNormal, reliefAuto, reliefFromHeightMap, reliefStereo, type LightPhoto, type ReliefResult } from "./relief";
import { buildCoinGeometry } from "./geometry";
import { buildEdgeTextures } from "./edge";
import { type CoinParams, type FaceKey, defaultParams } from "../types";

export interface FaceSources {
  photo: Source | null;
  lights: LightPhoto[];
  height: Source | null;
}

export interface Dims {
  diameterMm: number;
  weightG: number;
  density: number;
}

export interface LightState {
  az: number; // graus, no espaço da tela (0 = direita, 90 = cima)
  el: number; // graus acima do plano da tela
  intensity: number;
  raking: boolean;
}

export type ViewMode = "photo" | "cast" | "normals";

export interface EngineInfo {
  thicknessCenterMm: number;
  thicknessEdgeMm: number;
  mmPerUnit: number;
  relief: Record<FaceKey, ReliefResult["source"] | "none">;
  hasPhoto: Record<FaceKey, boolean>;
}

const TEX = 2048;
const RELIEF_RES = 1024;
const BASE_DIST = 5.4;

let srcIds = new WeakMap<object, number>();
let srcCounter = 0;
const sid = (s: object | null) => {
  if (!s) return 0;
  let v = srcIds.get(s);
  if (!v) srcIds.set(s, (v = ++srcCounter));
  return v;
};

export class CoinEngine {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  private group = new THREE.Group();
  private coin: THREE.Mesh | null = null;
  private hemi = new THREE.HemisphereLight(0xfff4e6, 0x17130f, 0.5);
  private key = new THREE.DirectionalLight(0xffffff, 2.2);
  private fill = new THREE.DirectionalLight(0xfff1d6, 0.35);
  private envTex: THREE.Texture | null = null;

  private sources: Record<FaceKey, FaceSources> = {
    obv: { photo: null, lights: [], height: null },
    rev: { photo: null, lights: [], height: null },
  };
  private params: CoinParams = defaultParams();
  private dims: Dims = { diameterMm: 18.8, weightG: 3.8, density: 10.5 };
  private light: LightState = { az: 120, el: 45, intensity: 1, raking: false };
  private viewMode: ViewMode = "photo";

  // caches
  private proc: Partial<Record<FaceKey, { key: string; v: ProcessedFace }>> = {};
  private rel: Partial<Record<FaceKey, { key: string; v: ReliefResult | null }>> = {};
  private geoKey = "";
  private edgeKey = "";
  private colorKey: Partial<Record<FaceKey, string>> = {};
  private outline = new Float32Array(NA).fill(0.985);
  private faceOutline: Record<FaceKey, Float32Array> = { obv: new Float32Array(NA).fill(0.985), rev: new Float32Array(NA).fill(0.985) };
  private faceCanvas: Record<FaceKey, HTMLCanvasElement> = { obv: makeCanvas(TEX), rev: makeCanvas(TEX) };
  private faceTex: Record<FaceKey, THREE.CanvasTexture>;
  private normalTex: Record<FaceKey, THREE.CanvasTexture>;
  private edgeCanvas = { color: makeCanvas(1024, 64), bump: makeCanvas(1024, 64) };
  private edgeTex: THREE.CanvasTexture;
  private bumpTex: THREE.CanvasTexture;
  private mats: { obv: THREE.MeshStandardMaterial; rev: THREE.MeshStandardMaterial; edge: THREE.MeshStandardMaterial };
  private info: EngineInfo = {
    thicknessCenterMm: 0,
    thicknessEdgeMm: 0,
    mmPerUnit: 9.4,
    relief: { obv: "none", rev: "none" },
    hasPhoto: { obv: false, rev: false },
  };

  // interação
  private rotY = 0.35;
  private rotX = -0.12;
  private velY = 0;
  private spin = true;
  private target: { x: number; y: number } | null = null;
  private dragging = false;
  private lx = 0;
  private ly = 0;
  private dist = BASE_DIST;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch0 = 0;
  private dist0 = BASE_DIST;
  private raf = 0;
  private last = performance.now();
  private dirty = true;
  private lastBuild = 0;
  private ro: ResizeObserver;
  private lastScalePx = 0;
  private disposed = false;

  onInfo?: (i: EngineInfo) => void;
  onScale?: (pxPer10mm: number) => void;
  onBusy?: (busy: boolean) => void;
  onSpinChange?: (spin: boolean) => void;

  constructor(canvas: HTMLCanvasElement, opts: { interactive?: boolean } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envTex;

    this.camera.position.set(0, 0, this.dist);
    this.scene.add(this.hemi, this.key, this.key.target, this.fill, this.group);
    this.fill.position.set(-3, -1.5, 2.5);

    const mk = (c: HTMLCanvasElement, srgb = true) => {
      const t = new THREE.CanvasTexture(c);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      return t;
    };
    this.faceTex = { obv: mk(this.faceCanvas.obv), rev: mk(this.faceCanvas.rev) };
    // cor em JPEG no .glb (arquivo ~6× menor); normais continuam PNG (sem perdas)
    this.faceTex.obv.userData.mimeType = this.faceTex.rev.userData.mimeType = "image/jpeg";
    const flat = flatNormal();
    this.normalTex = { obv: mk(flat, false), rev: mk(flat, false) };
    this.edgeTex = mk(this.edgeCanvas.color);
    this.edgeTex.wrapS = THREE.RepeatWrapping;
    this.edgeTex.userData.mimeType = "image/jpeg";
    this.bumpTex = mk(this.edgeCanvas.bump, false);
    this.bumpTex.wrapS = THREE.RepeatWrapping;
    const base = { metalness: 0.5, roughness: 0.5 };
    this.mats = {
      obv: new THREE.MeshStandardMaterial({ ...base, map: this.faceTex.obv, normalMap: this.normalTex.obv }),
      rev: new THREE.MeshStandardMaterial({ ...base, map: this.faceTex.rev, normalMap: this.normalTex.rev }),
      edge: new THREE.MeshStandardMaterial({ ...base, map: this.edgeTex, bumpMap: this.bumpTex, bumpScale: 1.5 }),
    };
    for (const k of ["obv", "rev"] as FaceKey[]) this.paintEmptyFace(k);

    if (opts.interactive !== false) this.bindInput();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.applyLight();
    this.raf = requestAnimationFrame(this.tick);
  }

  // ---------------------------------------------------------------- API
  setSources(face: FaceKey, s: Partial<FaceSources>) {
    this.sources[face] = { ...this.sources[face], ...s };
    this.dirty = true;
  }
  setParams(p: CoinParams) {
    this.params = p;
    this.applyMaterial();
    this.dirty = true;
  }
  setDims(d: Partial<Dims>) {
    const v = { ...this.dims };
    if (d.diameterMm && d.diameterMm > 0) v.diameterMm = d.diameterMm;
    if (d.weightG && d.weightG > 0) v.weightG = d.weightG;
    if (d.density && d.density > 0) v.density = d.density;
    this.dims = v;
    this.dirty = true;
  }
  setLight(l: Partial<LightState>) {
    this.light = { ...this.light, ...l };
    this.applyLight();
  }
  setViewMode(m: ViewMode) {
    this.viewMode = m;
    this.applyMaterial();
  }
  goTo(face: FaceKey) {
    const y = face === "obv" ? 0 : Math.PI;
    const k = Math.round((this.rotY - y) / (2 * Math.PI));
    this.target = { y: y + k * 2 * Math.PI, x: 0 };
    this.setSpin(false);
  }
  setSpin(v: boolean) {
    this.spin = v;
    if (v) this.target = null;
    this.onSpinChange?.(v);
  }
  get spinning() {
    return this.spin;
  }
  reset() {
    this.dist = BASE_DIST;
    const r = ((this.rotY % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    this.goTo(r > Math.PI / 2 && r < 1.5 * Math.PI ? "rev" : "obv");
  }
  zoom(f: number) {
    this.setDist(this.dist * f);
  }
  rotateBy(dy: number, dx = 0) {
    this.target = null;
    this.setSpin(false);
    this.rotY += dy;
    this.rotX = Math.max(-1.3, Math.min(1.3, this.rotX + dx));
  }
  getInfo() {
    return this.info;
  }
  /** Canvas da face processada (cor) — útil para prévias. */
  getFaceCanvas(face: FaceKey) {
    return this.faceCanvas[face];
  }
  getRelief(face: FaceKey) {
    return this.rel[face]?.v ?? null;
  }

  /** Força recomputação imediata (ex.: antes de exportar). */
  flush() {
    if (this.dirty) this.rebuild();
  }

  async exportGLB(name: string): Promise<Blob> {
    this.flush();
    if (!this.coin) throw new Error("Modelo ainda não construído");
    const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
    const mats = [this.mats.obv, this.mats.rev, this.mats.edge].map((m) => {
      const c = m.clone();
      if (this.viewMode !== "photo") {
        c.map = m === this.mats.edge ? this.edgeTex : m === this.mats.obv ? this.faceTex.obv : this.faceTex.rev;
        c.color.setScalar(this.params.brightness);
      }
      return c;
    });
    const mesh = new THREE.Mesh(this.coin.geometry, mats);
    mesh.name = name || "moeda";
    mesh.scale.setScalar(this.info.mmPerUnit / 1000); // milímetros → metros (escala real)
    const scene = new THREE.Scene();
    scene.add(mesh);
    const res = await new GLTFExporter().parseAsync(scene, { binary: true, maxTextureSize: 2048 });
    mats.forEach((m) => m.dispose());
    return new Blob([res as ArrayBuffer], { type: "model/gltf-binary" });
  }

  /** Imagem quadrada da moeda (fundo transparente) — miniatura do acervo. */
  async snapshot(size = 640, face: FaceKey = "obv"): Promise<Blob | null> {
    this.flush();
    const saved = { x: this.rotX, y: this.rotY, z: this.camera.position.z };
    this.group.rotation.set(-0.08, face === "obv" ? 0.18 : Math.PI + 0.18, 0);
    this.camera.position.z = BASE_DIST * 0.82;
    this.renderer.render(this.scene, this.camera);
    const src = this.renderer.domElement;
    const s = Math.min(src.width, src.height);
    const out = makeCanvas(size);
    out.getContext("2d")!.drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, size, size);
    this.group.rotation.set(saved.x, saved.y, 0);
    this.camera.position.z = saved.z;
    return new Promise((r) => out.toBlob(r, "image/webp", 0.9));
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.coin?.geometry.dispose();
    Object.values(this.mats).forEach((m) => m.dispose());
    [this.faceTex.obv, this.faceTex.rev, this.normalTex.obv, this.normalTex.rev, this.edgeTex, this.bumpTex].forEach((t) => t.dispose());
    this.envTex?.dispose();
    this.renderer.dispose();
    srcIds = new WeakMap();
  }

  // ---------------------------------------------------------------- internos
  private paintEmptyFace(k: FaceKey) {
    const c = this.faceCanvas[k],
      x = ctx2d(c);
    const g = x.createRadialGradient(TEX * 0.42, TEX * 0.38, TEX * 0.05, TEX / 2, TEX / 2, TEX * 0.55);
    g.addColorStop(0, "#9b958c");
    g.addColorStop(1, "#5f5a54");
    x.fillStyle = g;
    x.fillRect(0, 0, TEX, TEX);
    this.faceTex[k].needsUpdate = true;
  }

  private applyMaterial() {
    const p = this.params;
    for (const k of ["obv", "rev"] as FaceKey[]) {
      const m = this.mats[k];
      const s = p.relief[k].mode === "off" ? 0 : p.relief[k].strength;
      m.normalScale.set(s, s);
      if (this.viewMode === "cast") {
        m.map = null;
        m.color.set(0xa9a397);
        m.metalness = 0;
        m.roughness = 0.92;
      } else if (this.viewMode === "normals") {
        m.map = this.normalTex[k];
        m.color.setScalar(1);
        m.metalness = 0;
        m.roughness = 1;
      } else {
        m.map = this.faceTex[k];
        m.color.setScalar(p.brightness);
        m.metalness = p.metalness;
        m.roughness = p.roughness;
      }
      m.needsUpdate = true;
    }
    const e = this.mats.edge;
    if (this.viewMode === "photo") {
      e.map = this.edgeTex;
      e.color.setScalar(p.brightness);
      e.metalness = p.metalness * 0.8;
      e.roughness = Math.min(1, p.roughness + 0.15);
    } else {
      e.map = null;
      e.color.set(this.viewMode === "cast" ? 0xa9a397 : 0x8080ff);
      e.metalness = 0;
      e.roughness = 0.95;
    }
    e.needsUpdate = true;
  }

  private applyLight() {
    const l = this.light;
    const el = ((l.raking ? Math.min(l.el, 18) : l.el) * Math.PI) / 180,
      az = (l.az * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el));
    this.key.position.copy(dir.multiplyScalar(10));
    this.key.target.position.set(0, 0, 0);
    this.key.intensity = (l.raking ? 3.4 : 2.2) * l.intensity;
    this.hemi.intensity = l.raking ? 0.06 : 0.5;
    this.fill.intensity = l.raking ? 0 : 0.35;
    this.scene.environmentIntensity = l.raking ? 0.12 : 0.75;
  }

  private sourceKey(k: FaceKey) {
    const s = this.sources[k];
    return `${sid(s.photo)}|${JSON.stringify(this.params.adjust[k])}`;
  }

  private rebuild() {
    this.dirty = false;
    this.lastBuild = performance.now();
    const p = this.params;
    let outlineChanged = false;
    let colorChanged = false;

    // 1) fotos ajustadas
    for (const k of ["obv", "rev"] as FaceKey[]) {
      const s = this.sources[k];
      const key = this.sourceKey(k);
      if (this.proc[k]?.key !== key) {
        if (s.photo) {
          this.proc[k] = { key, v: processFace(s.photo, p.adjust[k], k, TEX, RELIEF_RES) };
        } else delete this.proc[k];
        outlineChanged = true;
        colorChanged = true;
      }
    }

    // 2) contorno: cada face usa o próprio; a geometria usa o menor dos dois
    if (outlineChanged) {
      const po = this.proc.obv?.v.outline ?? null,
        pv = this.proc.rev?.v.outline ?? null;
      const ps = [po, pv].filter(Boolean) as Float32Array[];
      const smooth = (src: Float32Array, dst: Float32Array, f: number) => {
        const R = 3;
        for (let i = 0; i < NA; i++) {
          let t = 0;
          for (let m = -R; m <= R; m++) t += src[(i + m + NA) % NA];
          dst[i] = Math.max(0.5, Math.min(1, t / (2 * R + 1))) * f;
        }
      };
      const raw = new Float32Array(NA).fill(1);
      if (ps.length) for (let i = 0; i < NA; i++) raw[i] = ps.reduce((t, q) => t + q[i], 0) / ps.length;
      const both = new Float32Array(NA);
      for (let i = 0; i < NA; i++) both[i] = ps.length ? Math.min(...ps.map((q) => q[i])) : 1;
      smooth(both, this.outline, 0.985);
      smooth(po || raw, this.faceOutline.obv, 0.985);
      smooth(pv || raw, this.faceOutline.rev, 0.985);
    }

    // 3) cor das faces (fundo = cor da borda)
    const edgeColor =
      p.edgeColor ??
      (this.proc.obv ? ringColor(this.proc.obv.v.cut, this.proc.obv.v.outline, "obv") : this.proc.rev ? ringColor(this.proc.rev.v.cut, this.proc.rev.v.outline, "rev") : "#8a7350");
    for (const k of ["obv", "rev"] as FaceKey[]) {
      const ck = `${this.proc[k]?.key ?? "none"}|${edgeColor}`;
      if (this.colorKey[k] === ck) continue;
      this.colorKey[k] = ck;
      colorChanged = true;
      const pr = this.proc[k]?.v;
      if (!pr) {
        this.paintEmptyFace(k);
        continue;
      }
      const x = ctx2d(this.faceCanvas[k]);
      x.fillStyle = edgeColor;
      x.fillRect(0, 0, TEX, TEX);
      x.drawImage(pr.cut, 0, 0, TEX, TEX);
      this.faceTex[k].needsUpdate = true;
    }

    // 4) relevo
    let reliefChanged = false;
    for (const k of ["obv", "rev"] as FaceKey[]) {
      const s = this.sources[k],
        r = p.relief[k],
        pr = this.proc[k]?.v;
      const lightsKey = s.lights.map((l) => `${sid(l.src)}@${l.az}/${l.el}`).join(",");
      const key = `${this.proc[k]?.key}|${r.mode}|${r.detail}|${r.invert}|${lightsKey}|${sid(s.height)}`;
      if (this.rel[k]?.key === key) continue;
      reliefChanged = true;
      let v: ReliefResult | null = null;
      if (pr && r.mode !== "off") {
        try {
          if (r.mode === "stereo" && s.lights.length >= 3) v = reliefStereo(s.lights, p.adjust[k], pr.mask, RELIEF_RES, r);
          else if (r.mode === "height" && s.height) v = reliefFromHeightMap(s.height, p.adjust[k], pr.mask, RELIEF_RES, r);
          else v = reliefAuto(pr.lum, pr.mask, RELIEF_RES, r);
        } catch (e) {
          console.error("relevo", e);
        }
      }
      this.rel[k] = { key, v };
      const t = this.normalTex[k];
      t.image = v ? v.normal : flatNormal();
      t.needsUpdate = true;
      this.info.relief[k] = v ? v.source : "none";
    }
    this.info.hasPhoto = { obv: !!this.proc.obv, rev: !!this.proc.rev };

    // 5) geometria
    const gk = JSON.stringify([
      Array.from(this.outline).map((v) => v.toFixed(4)).join(""),
      this.dims,
      p.edgeRatio,
      p.roundness,
      p.relief.obv.mode === "off" ? 0 : p.relief.obv.depthMm,
      p.relief.rev.mode === "off" ? 0 : p.relief.rev.depthMm,
      this.rel.obv?.key,
      this.rel.rev?.key,
    ]);
    if (gk !== this.geoKey || reliefChanged) {
      this.geoKey = gk;
      const relOf = (k: FaceKey) => {
        const v = this.rel[k]?.v;
        return { height: v?.height ?? null, res: v?.res ?? RELIEF_RES, depth: 0 };
      };
      const { geo, thickness, mmPerUnit } = buildCoinGeometry(
        { outline: this.outline, edgeRatio: p.edgeRatio, roundness: p.roundness, relief: { obv: relOf("obv"), rev: relOf("rev") } },
        this.dims,
        { obv: p.relief.obv.mode === "off" ? 0 : p.relief.obv.depthMm, rev: p.relief.rev.mode === "off" ? 0 : p.relief.rev.depthMm },
      );
      if (this.coin) {
        this.coin.geometry.dispose();
        this.coin.geometry = geo;
      } else {
        this.coin = new THREE.Mesh(geo, [this.mats.obv, this.mats.rev, this.mats.edge]);
        this.group.add(this.coin);
      }
      this.group.scale.setScalar(mmPerUnit / (this.dims.diameterMm / 2));
      this.info.mmPerUnit = mmPerUnit;
      this.info.thicknessCenterMm = thickness * mmPerUnit;
      this.info.thicknessEdgeMm = thickness * mmPerUnit * p.edgeRatio;
    }

    // 6) borda
    const ek = `${this.colorKey.obv}|${this.colorKey.rev}|${Array.from(this.faceOutline.obv).join(",").length}|${outlineChanged ? Math.random() : ""}`;
    if (colorChanged || outlineChanged || ek !== this.edgeKey) {
      this.edgeKey = ek;
      buildEdgeTextures(this.faceCanvas, this.faceOutline, this.edgeCanvas);
      this.edgeTex.needsUpdate = true;
      this.bumpTex.needsUpdate = true;
    }
    this.onInfo?.({ ...this.info, relief: { ...this.info.relief }, hasPhoto: { ...this.info.hasPhoto } });
  }

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, el.clientWidth),
      h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // em telas estreitas, afasta a câmera para a moeda caber na largura
    this.camera.fov = w < h ? Math.min(52, 30 * (h / w) * 0.85) : 30;
    this.camera.updateProjectionMatrix();
  }

  private setDist(d: number) {
    this.dist = Math.max(1.4, Math.min(10, d));
  }

  private bindInput() {
    const c = this.canvas;
    c.style.touchAction = "none";
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const p = [...this.pointers.values()];
        this.pinch0 = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        this.dist0 = this.dist;
      }
      this.dragging = true;
      this.target = null;
      this.lx = e.clientX;
      this.ly = e.clientY;
      this.velY = 0;
      if (this.spin) this.setSpin(false);
    });
    c.addEventListener("pointermove", (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const p = [...this.pointers.values()];
        const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        this.setDist((this.dist0 * this.pinch0) / Math.max(1, d));
        return;
      }
      if (!this.dragging) return;
      const dx = e.clientX - this.lx,
        dy = e.clientY - this.ly;
      this.lx = e.clientX;
      this.ly = e.clientY;
      this.rotY += dx * 0.01;
      this.rotX = Math.max(-1.3, Math.min(1.3, this.rotX + dy * 0.01));
      this.velY = dx * 0.01;
    });
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) this.dragging = false;
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.setDist(this.dist * (1 + e.deltaY * 0.0012));
      },
      { passive: false },
    );
    c.addEventListener("dblclick", () => {
      this.setDist(this.dist > BASE_DIST * 0.7 ? BASE_DIST * 0.45 : BASE_DIST);
    });
  }

  private tick = (t: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    // reconstrução limitada a ~16/s durante arrastes de slider
    if (this.dirty && t - this.lastBuild > 60) {
      this.onBusy?.(true);
      this.rebuild();
      this.onBusy?.(false);
    }
    if (this.target) {
      this.rotY += (this.target.y - this.rotY) * Math.min(1, dt * 6);
      this.rotX += (this.target.x - this.rotX) * Math.min(1, dt * 6);
      if (Math.abs(this.target.y - this.rotY) < 0.001 && Math.abs(this.target.x - this.rotX) < 0.001) this.target = null;
    } else if (!this.dragging) {
      if (this.spin) this.rotY += dt * 0.5;
      else {
        this.rotY += this.velY;
        this.velY *= 0.92;
      }
    }
    this.group.rotation.set(this.rotX, this.rotY, 0);
    this.camera.position.z += (this.dist - this.camera.position.z) * Math.min(1, dt * 8);
    this.renderer.render(this.scene, this.camera);
    if (this.onScale) {
      const el = this.canvas.parentElement ?? this.canvas;
      const unitsPerMm = this.group.scale.x / this.info.mmPerUnit; // cena por mm
      const px = (10 * unitsPerMm * (el.clientHeight / 2)) / (Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z);
      if (Math.abs(px - this.lastScalePx) > 0.3) {
        this.lastScalePx = px;
        this.onScale(px);
      }
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
