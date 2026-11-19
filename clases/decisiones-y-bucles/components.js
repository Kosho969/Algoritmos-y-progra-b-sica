// Elementos propios de las diapositivas: <x-shape>, <x-connector> y <x-icon>.
// Se dibujan como SVG usando los colores que les da el CSS.

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Figuras: diamond, ellipse, rounded, arrow-right.
// El relleno sale de background y el borde de border.
class XShape extends HTMLElement {
  connectedCallback() {
    if (this.drawn) return;
    this.drawn = true;
    const cs = getComputedStyle(this);
    const fill = cs.backgroundColor;
    const sw = cs.borderTopStyle === 'none' ? 0 : parseFloat(cs.borderTopWidth) || 0;
    const stroke = cs.borderTopColor;
    this.style.boxSizing = 'border-box';
    this.style.background = 'none';
    this.style.border = 'none';

    const w = parseFloat(this.style.width) || this.offsetWidth || 100;
    const h = parseFloat(this.style.height) || this.offsetHeight || 100;
    const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    const s = sw / 2;
    const paint = { fill, stroke: sw ? stroke : 'none', 'stroke-width': sw, 'stroke-linejoin': 'round' };
    let shape;
    switch (this.getAttribute('kind')) {
      case 'diamond':
        shape = svgEl('polygon', { points: `${w / 2},${s} ${w - s},${h / 2} ${w / 2},${h - s} ${s},${h / 2}`, ...paint });
        break;
      case 'ellipse':
        shape = svgEl('ellipse', { cx: w / 2, cy: h / 2, rx: w / 2 - s, ry: h / 2 - s, ...paint });
        break;
      case 'arrow-right': {
        const head = Math.min(w * 0.45, h);
        const t = h * 0.3;
        shape = svgEl('polygon', {
          points: `0,${t} ${w - head},${t} ${w - head},0 ${w},${h / 2} ${w - head},${h} ${w - head},${h - t} 0,${h - t}`,
          ...paint,
        });
        break;
      }
      default: // rounded, rect
        shape = svgEl('rect', { x: s, y: s, width: w - sw, height: h - sw, rx: this.getAttribute('kind') === 'rounded' ? 16 : 0, ...paint });
    }
    svg.appendChild(shape);
    this.appendChild(svg);
  }
}

// Flechas: de (x1,y1) a (x2,y2) dentro del diagrama.
// route="vh" va primero vertical y luego horizontal; "hv" al revés.
// head="none" quita la punta. Sin coordenadas, cruza su propia caja de izquierda a derecha.
class XConnector extends HTMLElement {
  connectedCallback() {
    if (this.drawn) return;
    this.drawn = true;
    const cs = getComputedStyle(this);
    const color = cs.color;
    const w = parseFloat(cs.getPropertyValue('--cw')) || 4;
    const dashed = cs.borderTopStyle === 'dashed';
    const hasHead = this.getAttribute('head') !== 'none';

    let pts;
    if (this.hasAttribute('x1')) {
      const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(a => parseFloat(this.getAttribute(a)));
      const route = this.getAttribute('route');
      if (route === 'vh') pts = [[x1, y1], [x1, y2], [x2, y2]];
      else if (route === 'hv') pts = [[x1, y1], [x2, y1], [x2, y2]];
      else pts = [[x1, y1], [x2, y2]];
    } else {
      const len = parseFloat(this.style.width) || this.offsetWidth || 56;
      pts = [[0, 0], [len, 0]];
    }

    const svg = svgEl('svg', { width: 1, height: 1, 'aria-hidden': 'true' });
    const headLen = w * 4.5;
    const line = pts.map(p => p.slice());
    if (hasHead) {
      // acorta el último tramo para que la punta termine justo en (x2,y2)
      const [ax, ay] = line[line.length - 2];
      const [bx, by] = line[line.length - 1];
      const d = Math.hypot(bx - ax, by - ay) || 1;
      const ux = (bx - ax) / d, uy = (by - ay) / d;
      line[line.length - 1] = [bx - ux * headLen * 0.8, by - uy * headLen * 0.8];
      const hw = w * 2.6;
      const baseX = bx - ux * headLen, baseY = by - uy * headLen;
      svg.appendChild(svgEl('polygon', {
        points: `${bx},${by} ${baseX - uy * hw},${baseY + ux * hw} ${baseX + uy * hw},${baseY - ux * hw}`,
        fill: color,
      }));
    }
    const path = svgEl('polyline', {
      points: line.map(p => p.join(',')).join(' '),
      fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-linecap': dashed ? 'butt' : 'round',
    });
    if (dashed) path.setAttribute('stroke-dasharray', `${w * 3} ${w * 2.5}`);
    svg.insertBefore(path, svg.firstChild);
    this.appendChild(svg);
  }
}

// Íconos de línea (24×24), del color del texto.
const ICONS = {
  CheckCircle: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  Warning: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  Book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  Activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  GraduationCap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>',
  Key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  Lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
};

class XIcon extends HTMLElement {
  connectedCallback() {
    if (this.drawn) return;
    this.drawn = true;
    const body = ICONS[this.getAttribute('name')] || ICONS.CheckCircle;
    this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }
}

customElements.define('x-shape', XShape);
customElements.define('x-connector', XConnector);
customElements.define('x-icon', XIcon);
