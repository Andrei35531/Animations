import { Mesh, Program, Renderer, Triangle, Vec2, Vec3 } from "ogl"
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import "./SpecterOrb.css"

export type SpecterOrbProps = {
  width?: string | number
  height?: string | number
  className?: string
  style?: CSSProperties
  children?: ReactNode
  radius?: number
  turbulence?: number
  noiseScale?: number
  flowSpeed?: number
  octaves?: number
  roughness?: number
  lacunarity?: number
  steps?: number
  stride?: number
  zoom?: number
  maskRadius?: number
  maskFeather?: number
  colorA?: string
  colorB?: string
  colorC?: string
  rimStrength?: number
  rimPower?: number
  specularColorA?: string
  specularColorB?: string
  specularStrength?: number
  specularSharpness?: number
  glowStrength?: number
  glowFalloff?: number
  gamma?: number
  brightness?: number
  opacity?: number
  backgroundColor?: string
  cursorInteraction?: boolean
  cursorLight?: number
  adaptiveQuality?: boolean
  targetFps?: number
  dpr?: number
  paused?: boolean
}

const VERT = /* glsl */ `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uRadius;
  uniform float uTurbulence;
  uniform float uNoiseScale;
  uniform float uFlowSpeed;
  uniform float uOctaves;
  uniform float uRoughness;
  uniform float uLacunarity;
  uniform float uSteps;
  uniform float uStride;
  uniform float uZoom;
  uniform float uMaskRadius;
  uniform float uMaskFeather;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uRimStrength;
  uniform float uRimPower;
  uniform vec3 uSpecularA;
  uniform vec3 uSpecularB;
  uniform float uSpecularStrength;
  uniform float uSpecularSharpness;
  uniform float uGlowStrength;
  uniform float uGlowFalloff;
  uniform float uGamma;
  uniform float uBrightness;
  uniform float uOpacity;
  uniform vec3 uBackgroundColor;
  uniform float uBackgroundAlpha;
  uniform vec2 uCursor;
  uniform float uCursorLight;
  varying vec2 vUv;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 8; i++) {
      float band = step(float(i), uOctaves - 1.0);
      value += band * amplitude * noise3(p * frequency);
      frequency *= uLacunarity;
      amplitude *= uRoughness;
    }

    return value;
  }

  float map(vec3 p) {
    vec3 q = p;
    q += vec3(
      sin(p.y * 2.4 + uTime * uFlowSpeed * 1.7) * 0.04,
      cos(p.x * 2.1 - uTime * uFlowSpeed) * 0.04,
      sin(p.z * 1.8 + uTime * uFlowSpeed * 0.8) * 0.04
    );
    float field = fbm(q * uNoiseScale + vec3(0.0, uTime * uFlowSpeed, uTime * uFlowSpeed * 0.37));
    float displacement = (field - 0.5) * 2.0 * uTurbulence;
    return length(p) - uRadius - displacement;
  }

  vec3 calcNormal(vec3 p) {
    const float eps = 0.0015;
    const vec2 h = vec2(eps, 0.0);
    return normalize(vec3(
      map(p + h.xyy) - map(p - h.xyy),
      map(p + h.yxy) - map(p - h.yxy),
      map(p + h.yyx) - map(p - h.yyx)
    ));
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
    float mask = 1.0 - smoothstep(uMaskRadius - uMaskFeather, uMaskRadius + uMaskFeather, length(uv));

    vec3 ro = vec3(0.0, 0.0, -2.35 / uZoom);
    vec3 rd = normalize(vec3(uv, 1.65));

    float traveled = 0.0;
    float surfaceHit = 0.0;
    float minDist = 1000.0;
    vec3 hitPos = vec3(0.0);

    for (int i = 0; i < 32; i++) {
      float stepActive = step(float(i), uSteps - 1.0);
      vec3 p = ro + rd * traveled;
      float dist = map(p);
      minDist = min(minDist, dist);
      float hit = step(dist, 0.0015) * stepActive * (1.0 - surfaceHit);
      surfaceHit = max(surfaceHit, hit);
      hitPos = mix(hitPos, p, hit);
      traveled += max(dist * uStride, 0.001) * stepActive * (1.0 - surfaceHit);
    }

    vec3 lightDir = normalize(vec3(0.45, 0.75, 1.0) + vec3(uCursor.x, uCursor.y, 0.0) * uCursorLight);
    vec3 col = vec3(0.0);
    float alpha = 0.0;

    if (surfaceHit > 0.5) {
      vec3 normal = calcNormal(hitPos);
      vec3 viewDir = normalize(ro - hitPos);
      float diffuse = clamp(dot(normal, lightDir), 0.0, 1.0);
      float wrap = clamp(dot(normal, lightDir) * 0.5 + 0.5, 0.0, 1.0);

      col = mix(uColorB, uColorA, diffuse);
      col += uColorC * (0.18 + wrap * 0.22);

      float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), uRimPower);
      col += fresnel * uRimStrength * mix(uColorA, uSpecularA, 0.35);

      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(clamp(dot(normal, halfDir), 0.0, 1.0), uSpecularSharpness);
      col += spec * uSpecularStrength * mix(uSpecularA, uSpecularB, 0.5);

      alpha = 0.96;
    }

    float glow = exp(-abs(minDist) * uGlowFalloff) * uGlowStrength;
    col += mix(uColorA, uColorC, 0.35) * glow * 0.55;
    alpha = max(alpha, glow * 0.85);

    col = pow(max(col, 0.0), vec3(1.0 / max(uGamma, 0.001))) * uBrightness;
    alpha = clamp(alpha * uOpacity * mask, 0.0, 1.0);

    if (uBackgroundAlpha < 0.01) {
      gl_FragColor = vec4(col, alpha);
    } else {
      vec3 bg = uBackgroundColor;
      gl_FragColor = vec4(mix(bg, col, alpha), mix(uBackgroundAlpha, 1.0, alpha) * mask);
    }
  }
`

function hexToVec3(color: string) {
  if (color === "transparent") {
    return { rgb: new Vec3(0, 0, 0), alpha: 0 }
  }

  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16) / 255
    const g = parseInt(color.slice(3, 5), 16) / 255
    const b = parseInt(color.slice(5, 7), 16) / 255
    return { rgb: new Vec3(r, g, b), alpha: 1 }
  }

  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbMatch) {
    return {
      rgb: new Vec3(
        parseInt(rgbMatch[1]) / 255,
        parseInt(rgbMatch[2]) / 255,
        parseInt(rgbMatch[3]) / 255,
      ),
      alpha: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    }
  }

  return { rgb: new Vec3(0, 0, 0), alpha: 1 }
}

function toCssSize(value: string | number | undefined) {
  if (value === undefined) return "100%"
  return typeof value === "number" ? `${value}px` : value
}

export function SpecterOrb({
  width = "100%",
  height = "100%",
  className,
  style,
  children,
  radius = 0.35,
  turbulence = 0.3,
  noiseScale = 1,
  flowSpeed = 0.3,
  octaves = 3,
  roughness = 0.5,
  lacunarity = 2,
  steps = 32,
  stride = 1,
  zoom = 1,
  maskRadius = 1,
  maskFeather = 0.02,
  colorA = "#4da6ff",
  colorB = "#9959ff",
  colorC = "#6680ff",
  rimStrength = 0.75,
  rimPower = 3,
  specularColorA = "#669fff",
  specularColorB = "#998fff",
  specularStrength = 1,
  specularSharpness = 12,
  glowStrength = 1,
  glowFalloff = 32,
  gamma = 1.25,
  brightness = 1,
  opacity = 1,
  backgroundColor = "transparent",
  cursorInteraction = true,
  cursorLight = 0.35,
  adaptiveQuality = true,
  targetFps = 60,
  dpr = 2,
  paused = false,
}: SpecterOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef({ x: 0, y: 0 })
  const qualityRef = useRef(1)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false, dpr: 1 })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.canvas.className = "specter-orb__canvas"
    container.prepend(gl.canvas)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vec2(1, 1) },
        uRadius: { value: radius },
        uTurbulence: { value: turbulence },
        uNoiseScale: { value: noiseScale },
        uFlowSpeed: { value: flowSpeed },
        uOctaves: { value: octaves },
        uRoughness: { value: roughness },
        uLacunarity: { value: lacunarity },
        uSteps: { value: steps },
        uStride: { value: stride },
        uZoom: { value: zoom },
        uMaskRadius: { value: maskRadius },
        uMaskFeather: { value: maskFeather },
        uColorA: { value: hexToVec3(colorA).rgb },
        uColorB: { value: hexToVec3(colorB).rgb },
        uColorC: { value: hexToVec3(colorC).rgb },
        uRimStrength: { value: rimStrength },
        uRimPower: { value: rimPower },
        uSpecularA: { value: hexToVec3(specularColorA).rgb },
        uSpecularB: { value: hexToVec3(specularColorB).rgb },
        uSpecularStrength: { value: specularStrength },
        uSpecularSharpness: { value: specularSharpness },
        uGlowStrength: { value: glowStrength },
        uGlowFalloff: { value: glowFalloff },
        uGamma: { value: gamma },
        uBrightness: { value: brightness },
        uOpacity: { value: opacity },
        uBackgroundColor: { value: hexToVec3(backgroundColor).rgb },
        uBackgroundAlpha: { value: hexToVec3(backgroundColor).alpha },
        uCursor: { value: new Vec2(0, 0) },
        uCursorLight: { value: cursorLight },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    const resize = () => {
      const widthPx = container.clientWidth
      const heightPx = container.clientHeight
      if (widthPx < 1 || heightPx < 1) return

      const maxDpr = Math.min(window.devicePixelRatio || 1, dpr)
      const scale = adaptiveQuality ? qualityRef.current : 1
      const renderDpr = maxDpr * scale
      renderer.setSize(widthPx * renderDpr, heightPx * renderDpr)
      gl.canvas.style.width = `${widthPx}px`
      gl.canvas.style.height = `${heightPx}px`
      program.uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height)
    }

    resize()
    window.addEventListener("resize", resize)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    const handlePointerMove = (event: PointerEvent) => {
      if (!cursorInteraction) return
      const rect = container.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      cursorRef.current = { x, y }
    }

    const handlePointerLeave = () => {
      cursorRef.current = { x: 0, y: 0 }
    }

    if (cursorInteraction) {
      container.addEventListener("pointermove", handlePointerMove)
      container.addEventListener("pointerleave", handlePointerLeave)
    }

    let rafId = 0
    let fpsSampleStart = performance.now()
    let frameCount = 0

    const syncUniforms = (time: number) => {
      const bg = hexToVec3(backgroundColor)
      program.uniforms.uTime.value = time
      program.uniforms.uRadius.value = radius
      program.uniforms.uTurbulence.value = turbulence
      program.uniforms.uNoiseScale.value = noiseScale
      program.uniforms.uFlowSpeed.value = flowSpeed
      program.uniforms.uOctaves.value = octaves
      program.uniforms.uRoughness.value = roughness
      program.uniforms.uLacunarity.value = lacunarity
      program.uniforms.uSteps.value = steps
      program.uniforms.uStride.value = stride
      program.uniforms.uZoom.value = zoom
      program.uniforms.uMaskRadius.value = maskRadius
      program.uniforms.uMaskFeather.value = maskFeather
      program.uniforms.uColorA.value.copy(hexToVec3(colorA).rgb)
      program.uniforms.uColorB.value.copy(hexToVec3(colorB).rgb)
      program.uniforms.uColorC.value.copy(hexToVec3(colorC).rgb)
      program.uniforms.uRimStrength.value = rimStrength
      program.uniforms.uRimPower.value = rimPower
      program.uniforms.uSpecularA.value.copy(hexToVec3(specularColorA).rgb)
      program.uniforms.uSpecularB.value.copy(hexToVec3(specularColorB).rgb)
      program.uniforms.uSpecularStrength.value = specularStrength
      program.uniforms.uSpecularSharpness.value = specularSharpness
      program.uniforms.uGlowStrength.value = glowStrength
      program.uniforms.uGlowFalloff.value = glowFalloff
      program.uniforms.uGamma.value = gamma
      program.uniforms.uBrightness.value = brightness
      program.uniforms.uOpacity.value = opacity
      program.uniforms.uBackgroundColor.value.copy(bg.rgb)
      program.uniforms.uBackgroundAlpha.value = bg.alpha
      program.uniforms.uCursorLight.value = cursorLight
      program.uniforms.uCursor.value.set(cursorRef.current.x, cursorRef.current.y)
    }

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick)

      if (adaptiveQuality) {
        frameCount += 1
        if (now - fpsSampleStart >= 1000) {
          const fps = (frameCount * 1000) / (now - fpsSampleStart)
          if (fps < targetFps * 0.85 && qualityRef.current > 0.55) {
            qualityRef.current = Math.max(0.55, qualityRef.current - 0.08)
            resize()
          } else if (fps > targetFps * 0.95 && qualityRef.current < 1) {
            qualityRef.current = Math.min(1, qualityRef.current + 0.04)
            resize()
          }
          frameCount = 0
          fpsSampleStart = now
        }
      }

      if (!paused) {
        syncUniforms(now * 0.001)
        renderer.render({ scene: mesh })
      }
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
      resizeObserver.disconnect()
      if (cursorInteraction) {
        container.removeEventListener("pointermove", handlePointerMove)
        container.removeEventListener("pointerleave", handlePointerLeave)
      }
      gl.canvas.remove()
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [
    adaptiveQuality,
    backgroundColor,
    brightness,
    colorA,
    colorB,
    colorC,
    cursorInteraction,
    cursorLight,
    dpr,
    flowSpeed,
    gamma,
    glowFalloff,
    glowStrength,
    lacunarity,
    maskFeather,
    maskRadius,
    noiseScale,
    octaves,
    opacity,
    paused,
    radius,
    rimPower,
    rimStrength,
    roughness,
    specularColorA,
    specularColorB,
    specularSharpness,
    specularStrength,
    steps,
    stride,
    targetFps,
    turbulence,
    zoom,
  ])

  return (
    <div
      ref={containerRef}
      className={["specter-orb", className].filter(Boolean).join(" ")}
      style={{
        width: toCssSize(width),
        height: toCssSize(height),
        ...style,
      }}
    >
      {children ? <div className="specter-orb__content">{children}</div> : null}
    </div>
  )
}
