import type { CharacterId } from './content.ts';

const gaze: Record<CharacterId, [number, number, number, number]> = {
  escalito: [.43, .222, .56, .22],
  ana: [.454, .19, .568, .193],
  luz: [.457, .23, .582, .226],
  mateo: [.436, .238, .561, .239],
  roko: [.447, .233, .557, .23],
  lupi: [.443, .247, .599, .289],
};

export function animateEyes(root: HTMLElement, enabled: boolean): () => void {
  if (!enabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => undefined;
  const cleanups: (() => void)[] = [];
  for (const img of root.querySelectorAll<HTMLImageElement>('img.actor')) {
    const id = Object.keys(gaze).find(name => img.classList.contains('actor-' + name)) as CharacterId | undefined;
    if (!id) continue;
    let disposed = false;
    let visible = false;
    let frame = 0;
    let lastTime = 0;
    let gl: WebGLRenderingContext | null = null;
    let canvas: HTMLCanvasElement | null = null;
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
    observer.observe(img);
    cleanups.push(() => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); canvas?.remove(); img.style.visibility = ''; gl?.getExtension('WEBGL_lose_context')?.loseContext(); });
    void img.decode().then(() => {
      if (disposed || !img.parentElement) return;
      canvas = document.createElement('canvas');
      canvas.className = img.className + ' character-eyes';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: false });
      if (!gl) return;
      const context = gl;
      const shader = (type: number, source: string): WebGLShader | null => {
        const value = context.createShader(type);
        if (!value) return null;
        context.shaderSource(value, source); context.compileShader(value);
        if (!context.getShaderParameter(value, context.COMPILE_STATUS)) { context.deleteShader(value); return null; }
        return value;
      };
      const vertex = shader(context.VERTEX_SHADER, 'attribute vec2 p; varying vec2 uv; void main(){ uv=vec2((p.x+1.)*.5,1.-(p.y+1.)*.5); gl_Position=vec4(p,0.,1.); }');
      const fragment = shader(context.FRAGMENT_SHADER, 'precision mediump float; varying vec2 uv; uniform sampler2D pic; uniform vec4 eyes; uniform vec2 radius; uniform float shift; void main(){float a=1.-smoothstep(.35,1.,length((uv-eyes.xy)/radius));float b=1.-smoothstep(.35,1.,length((uv-eyes.zw)/radius)); vec2 q=uv; q.y-=shift*max(a,b); gl_FragColor=texture2D(pic,q); }');
      const program = context.createProgram();
      if (!vertex || !fragment || !program) return;
      context.attachShader(program, vertex); context.attachShader(program, fragment); context.linkProgram(program);
      if (!context.getProgramParameter(program, context.LINK_STATUS)) return;
      context.useProgram(program);
      const buffer = context.createBuffer(); context.bindBuffer(context.ARRAY_BUFFER, buffer);
      context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), context.STATIC_DRAW);
      const position = context.getAttribLocation(program, 'p'); context.enableVertexAttribArray(position); context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
      const texture = context.createTexture(); context.bindTexture(context.TEXTURE_2D, texture);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE); context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR); context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
      context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, img);
      context.uniform4fv(context.getUniformLocation(program, 'eyes'), gaze[id]);
      context.uniform2f(context.getUniformLocation(program, 'radius'), .026, id === 'lupi' ? .035 : .023);
      const shift = context.getUniformLocation(program, 'shift');
      context.viewport(0, 0, canvas.width, canvas.height);
      img.parentElement.insertBefore(canvas, img.nextSibling);
      img.style.visibility = 'hidden';
      observer.unobserve(img);
      observer.observe(canvas);
      const draw = (now: number): void => {
        if (disposed) return;
        if (visible && !document.hidden && now - lastTime >= 1000 / 24) {
          lastTime = now;
          const phase = Math.sin(now / 1800 + Object.keys(gaze).indexOf(id));
          context.uniform1f(shift, phase * 2.1 / img.naturalHeight);
          context.drawArrays(context.TRIANGLES, 0, 6);
          canvas!.dataset.gaze = phase.toFixed(3);
        }
        frame = requestAnimationFrame(draw);
      };
      context.uniform1f(shift, 0); context.drawArrays(context.TRIANGLES, 0, 6);
      frame = requestAnimationFrame(draw);
    }).catch(() => undefined);
  }
  return () => cleanups.forEach(cleanup => cleanup());
}
