"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Anomaly.module.css";

/**
 * 3D-аномалия на чистом WebGL (без three.js): сфера с живой плазмой,
 * гравитационным искажением силуэта и расходящимися волнами.
 *
 * - вращается пальцем / мышью, на тап — всплеск энергии;
 * - во время выброса краснеет и пульсирует;
 * - сама ставится на паузу вне экрана и в фоновой вкладке;
 * - prefers-reduced-motion → один статичный кадр.
 */

export type AnomalyMode = "calm" | "active" | "idle";

const PALETTE: Record<AnomalyMode, { a: number[]; b: number[]; energy: number }> = {
  calm: { a: [0.83, 1.0, 0.23], b: [0.05, 0.42, 0.33], energy: 0.25 },
  active: { a: [1.0, 0.14, 0.22], b: [0.55, 0.02, 0.16], energy: 1.0 },
  idle: { a: [0.62, 0.66, 0.6], b: [0.16, 0.18, 0.2], energy: 0.1 },
};

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uRot;
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uEnergy;

float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){
  vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+.17;a*=.5;}return s;}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}

void main(){
  vec2 uv=(gl_FragCoord.xy*2.-uRes)/min(uRes.x,uRes.y);
  float t=uTime;
  float r=length(uv);
  float ang=atan(uv.y,uv.x);

  float R=.58+.02*sin(t*1.7)*uEnergy;
  float wob=(fbm(vec3(cos(ang)*1.6,sin(ang)*1.6,t*.35))-.5)*(.06+.09*uEnergy);
  float Rw=R+wob;

  vec3 glowCol=mix(uColB,uColA,.55);
  float halo=exp(-max(r-Rw,0.)*(5.-uEnergy*1.5))*(.45+.35*uEnergy);
  vec3 col=glowCol*halo;

  float ring=pow(sin((r-t*.22)*20.)*.5+.5,24.)*smoothstep(1.5,Rw,r)*step(Rw,r);
  col+=uColA*ring*(.18+.4*uEnergy);

  if(r<Rw){
    float z=sqrt(max(Rw*Rw-r*r,0.));
    vec3 n=normalize(vec3(uv,z));
    vec3 p=rotY(t*.22+uRot.x)*rotX(uRot.y)*n;
    float f=fbm(p*2.1+vec3(0.,t*.22,0.));
    float g=fbm(p*3.6-f*1.7+t*.1);
    float veins=pow(1.-abs(g*2.-1.),7.);
    float fres=pow(1.-n.z,2.4);
    vec3 surf=mix(uColB*.12,uColB*.9,f)*(.3+.7*n.z);
    surf+=uColA*veins*(1.1+uEnergy*.7);
    surf+=uColA*fres*.85;
    surf+=uColA*pow(n.z,10.)*.18;
    float edge=smoothstep(Rw,Rw-.015,r);
    col=mix(col,surf,edge);
  }

  // мягко гасим свечение к краям холста, чтобы не было видно его границ
  vec2 e=gl_FragCoord.xy/uRes;
  col*=smoothstep(0.,.2,e.x)*smoothstep(0.,.2,1.-e.x)*smoothstep(0.,.2,e.y)*smoothstep(0.,.2,1.-e.y);

  float a=clamp(max(max(col.r,col.g),col.b),0.,1.);
  gl_FragColor=vec4(col,a);
}`;

interface Props {
  mode?: AnomalyMode;
  className?: string;
  onTap?: () => void;
  label?: string;
}

export function Anomaly({ mode = "calm", className, onTap, label = "Аномалия" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const tapRef = useRef(onTap);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    modeRef.current = mode;
    tapRef.current = onTap;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) {
      setFallback(true);
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = u("uRes"), uTime = u("uTime"), uRot = u("uRot");
    const uColA = u("uColA"), uColB = u("uColB"), uEnergy = u("uEnergy");

    // сглаженное состояние (цвет и энергия плавно перетекают между режимами)
    const cur = { ...PALETTE[modeRef.current], a: [...PALETTE[modeRef.current].a], b: [...PALETTE[modeRef.current].b] };
    const rot = { x: 0, y: 0, vx: 0, vy: 0 };
    let burst = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let time = 4;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;

      const target = PALETTE[modeRef.current];
      const k = 1 - Math.exp(-dt * 3);
      for (let i = 0; i < 3; i++) {
        cur.a[i] += (target.a[i] - cur.a[i]) * k;
        cur.b[i] += (target.b[i] - cur.b[i]) * k;
      }
      burst *= Math.exp(-dt * 2.2);
      cur.energy += (target.energy + burst - cur.energy) * k * 2;

      rot.x += rot.vx * dt;
      rot.y = Math.max(-1.2, Math.min(1.2, rot.y + rot.vy * dt));
      rot.vx *= Math.exp(-dt * 1.8);
      rot.vy *= Math.exp(-dt * 1.8);
      rot.y *= Math.exp(-dt * 0.6);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uRot, rot.x, rot.y);
      gl.uniform3fv(uColA, cur.a);
      gl.uniform3fv(uColB, cur.b);
      gl.uniform1f(uEnergy, Math.min(cur.energy, 1.6));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      draw(now);
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (reduced) return draw(performance.now());
      if (!raf && visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", start);
    start();

    // ---- взаимодействие: вращение пальцем и тап ----
    let drag: { x: number; y: number; t: number; moved: number } | null = null;

    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const dt = Math.max(8, performance.now() - drag.t) / 1000;
      rot.vx = (dx / canvas.clientWidth) * 4 / dt * 0.25 + rot.vx * 0.5;
      rot.vy = (dy / canvas.clientHeight) * 4 / dt * 0.25 + rot.vy * 0.5;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = performance.now();
      start();
    };
    const up = () => {
      if (drag && drag.moved < 6) {
        burst = 1.2;
        tapRef.current?.();
        start();
      }
      drag = null;
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", start);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      // освобождаем GPU только при настоящем размонтировании (StrictMode переиспользует canvas)
      if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div className={`${styles.wrap} ${className ?? ""}`} data-mode={mode}>
      {fallback ? (
        <div className={styles.fallback} role="img" aria-label={label} onClick={() => tapRef.current?.()} />
      ) : (
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={label} />
      )}
    </div>
  );
}
