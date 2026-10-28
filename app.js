// Proposta de mestrado: tema, viewers sob demanda, gráficos e cronograma (SVG/HTML gerados aqui, sem biblioteca)
(() => {
  const raiz = document.documentElement;
  const botaoTema = document.getElementById('tema');
  const midiaEscura = matchMedia('(prefers-color-scheme: dark)');
  const escuro = () => (raiz.dataset.tema ? raiz.dataset.tema === 'escuro' : midiaEscura.matches);
  const rotularTema = () => { botaoTema.textContent = escuro() ? 'tema claro' : 'tema escuro'; };

  botaoTema.addEventListener('click', () => {
    const novo = escuro() ? 'claro' : 'escuro';
    raiz.dataset.tema = novo;
    try { localStorage.setItem('tema', novo); } catch (e) { /* sem armazenamento: o tema vale só nesta visita */ }
    rotularTema();
  });
  midiaEscura.addEventListener('change', rotularTema);
  rotularTema();

  // ---------- comparador antes/depois: a barra corta a imagem de cima (depois); uma volta sozinha quando aparece
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.comparar').forEach(caixa => {
    const [esq, dir] = (caixa.dataset.rotulos || 'antes|depois').split('|');
    caixa.insertAdjacentHTML('beforeend', `<span class="barra"></span><span class="alca" aria-hidden="true">‹ ›</span>` +
      `<span class="rot esq">${esq}</span><span class="rot dir">${dir}</span>` +
      `<input type="range" min="0" max="100" value="50" aria-label="Comparar: ${esq} à esquerda, ${dir} à direita">`);
    const r = caixa.querySelector('input');
    const pos = v => caixa.style.setProperty('--corte', `${v}%`);
    let mexeu = false;
    r.addEventListener('input', () => { mexeu = true; pos(r.value); });
    pos(50);
    if (reduzir || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now(), dur = 2200;
      const passo = t => {
        if (mexeu) return;
        const k = Math.min(1, (t - t0) / dur);
        const v = 50 + 32 * Math.sin(k * Math.PI * 2) * (1 - k);
        pos(v); r.value = v;
        if (k < 1) requestAnimationFrame(passo);
      };
      setTimeout(() => requestAnimationFrame(passo), 400);
    }, { threshold: 0.6 });
    obs.observe(caixa);
  });

  // ---------- apresentação 3D na página: a aba escolhe o roteiro; o viewer só carrega no clique
  const player = document.getElementById('player');
  let tourAtual = 'avenida';
  const comecar = () => {
    const q = document.createElement('iframe');
    q.src = `potree/tour.html?t=${tourAtual}`;
    q.title = 'Apresentação 3D';
    q.allow = 'fullscreen';
    player.replaceChildren(q);
  };
  player.querySelector('.comecar').addEventListener('click', comecar);
  document.querySelectorAll('.abas [data-tour]').forEach(aba => aba.addEventListener('click', () => {
    document.querySelectorAll('.abas [data-tour]').forEach(b => b.setAttribute('aria-selected', String(b === aba)));
    tourAtual = aba.dataset.tour;
    document.getElementById('player-desc').textContent = aba.dataset.desc;
    document.getElementById('tela-cheia').href = `potree/tour.html?t=${tourAtual}`;
    const q = player.querySelector('iframe');
    if (q) { q.src = `potree/tour.html?t=${tourAtual}`; return; }
    player.querySelector('.capa').src = aba.dataset.capa;
  }));

  const NS = 'http://www.w3.org/2000/svg';
  const el = (nome, attrs = {}, pai) => {
    const e = document.createElementNS(NS, nome);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (pai) pai.appendChild(e);
    return e;
  };
  const texto = (pai, x, y, s, attrs = {}) => { const t = el('text', { x, y, ...attrs }, pai); t.textContent = s; return t; };
  const virgula = (v, d = 2) => v.toFixed(d).replace('.', ',');
  // barra horizontal com a ponta de dado arredondada (4 px) e a base reta no zero
  const barra = (pai, x0, y, w, h, estilo) => {
    const r = Math.min(4, w / 2, h / 2);
    el('path', { d: `M${x0},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - r)}z`, style: estilo }, pai);
  };

  // ---------- localização das árvores: TCC × método novo (as duas árvores em que o TCC pôde ser refeito)
  (() => {
    const caixa = document.getElementById('grafico-localizacao');
    const dados = [{ nome: 'árvore 1', tcc: 3.55, novo: 0.51 }, { nome: 'árvore 2', tcc: 2.16, novo: 2.47 }];
    const W = 480, esq = 76, dir = 66, topo = 8, linha = 22, vao = 4, grupo = 2 * linha + vao + 26;
    const H = topo + dados.length * grupo + 30;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'presentation' }, caixa);
    const xmax = 4, x = v => esq + (v / xmax) * (W - esq - dir);
    for (let v = 0; v <= xmax; v++) {
      el('line', { x1: x(v), x2: x(v), y1: topo, y2: H - 24, class: 'grade' }, svg);
      texto(svg, x(v), H - 8, `${v} m`, { 'text-anchor': 'middle', 'font-size': 13 });
    }
    dados.forEach((d, i) => {
      const y0 = topo + i * grupo + 6;
      texto(svg, 0, y0 + linha + 6, d.nome, { 'font-size': 14.5, style: 'fill:var(--tinta)' });
      [['tcc', 'var(--barra-neutra)', 'método do TCC'], ['novo', 'var(--destaque)', 'método novo']].forEach(([k, cor, rot], j) => {
        const y = y0 + j * (linha + vao);
        const g = el('g', {}, svg);
        el('title', {}, g).textContent = `${d.nome}, ${rot}: ${virgula(d[k])} m do topo da copa`;
        barra(g, x(0), y, x(d[k]) - x(0), linha, `fill:${cor}`);
        texto(g, x(d[k]) + 6, y + linha / 2 + 4.5, `${virgula(d[k])} m`, { class: 'valor' });
      });
    });
    el('line', { x1: x(0), x2: x(0), y1: topo, y2: H - 24, class: 'eixo' }, svg);
  })();

  // ---------- faixas de voo do LiDAR 2017: esquema (vista de cima) e o deslocamento medido nas 9 faixas
  (() => {
    let svg = document.getElementById('faixas-esquema');
    const tinta = 'fill:var(--tinta)', tinta2 = 'fill:var(--tinta2)';
    const seta = (x1, y, x2, estilo) => {
      el('line', { x1, y1: y, x2, y2: y, style: `stroke:var(--tinta);stroke-width:1.5;${estilo || ''}` }, svg);
      const s = Math.sign(x2 - x1);
      el('path', { d: `M${x2},${y}l${-10 * s},-5v10z`, style: 'fill:var(--tinta)' }, svg);
    };
    // esquema
    texto(svg, 0, 18, 'Vista de cima (escala transversal exagerada)', { 'font-size': 13, 'font-weight': 600, style: tinta });
    seta(40, 64, 380); texto(svg, 40, 52, 'faixa voada para leste', { 'font-size': 12.5, style: tinta2 });
    seta(380, 292, 40); texto(svg, 40, 316, 'faixa voada para oeste', { 'font-size': 12.5, style: tinta2 });
    el('path', { d: 'M395,72v28', style: 'stroke:var(--destaque);stroke-width:1.5' }, svg);
    el('path', { d: 'M395,104l-4,-8h8z', style: 'fill:var(--destaque)' }, svg);
    texto(svg, 404, 92, 'direita do voo', { 'font-size': 11.5, style: 'fill:var(--destaque)' });
    el('path', { d: 'M395,284v-28', style: 'stroke:var(--tinta2);stroke-width:1.5' }, svg);
    el('path', { d: 'M395,252l-4,8h8z', style: 'fill:var(--tinta2)' }, svg);
    texto(svg, 404, 272, 'direita do voo', { 'font-size': 11.5, style: tinta2 });
    el('rect', { x: 90, y: 118, width: 240, height: 60, style: 'fill:var(--papel2);stroke:var(--tinta3);stroke-width:1' }, svg);
    texto(svg, 210, 153, 'prédio', { 'text-anchor': 'middle', 'font-size': 12, style: tinta2 });
    el('line', { x1: 90, x2: 330, y1: 178, y2: 178, style: 'stroke:var(--tinta);stroke-width:2' }, svg);
    el('line', { x1: 90, x2: 330, y1: 196, y2: 196, style: 'stroke:var(--destaque);stroke-width:2.2;stroke-dasharray:8 5' }, svg);
    el('line', { x1: 90, x2: 330, y1: 160, y2: 160, style: 'stroke:var(--tinta2);stroke-width:2.2;stroke-dasharray:2 4' }, svg);
    texto(svg, 90, 214, 'parede na faixa leste', { 'font-size': 11.5, style: 'fill:var(--destaque)' });
    texto(svg, 90, 236, 'parede verdadeira (posição absoluta desconhecida)', { 'font-size': 11.5, style: tinta });
    el('path', { d: 'M340,160h8v36h-8', style: 'fill:none;stroke:var(--tinta);stroke-width:1' }, svg);
    texto(svg, 354, 182, '≈ 0,4 m', { 'font-size': 12, class: 'valor' });
    texto(svg, 210, 112, 'parede na faixa oeste', { 'text-anchor': 'middle', 'font-size': 11.5, style: tinta2 });
    texto(svg, 455, 30, 'N', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, style: tinta });
    el('path', { d: 'M455,36l-6,16h12z', style: 'fill:var(--tinta)' }, svg);

    // dados: deslocamento transversal para a direita do voo em cada faixa (m), medido pelo chão
    svg = document.getElementById('faixas-dados');
    const faixas = [[83, .36], [263, .143], [78, .282], [261, .238], [86, .14], [263, .259], [66, .056], [262, .309], [83, .079]];
    const x0 = 130, x1 = 455, xm = .4, X = v => x0 + (v / xm) * (x1 - x0), Y = i => 70 + i * 26;
    texto(svg, 0, 18, 'Deslocamento para a direita do voo, por faixa', { 'font-size': 13, 'font-weight': 600, style: tinta });
    for (let v = 0; v <= .4001; v += .1) {
      el('line', { x1: X(v), x2: X(v), y1: 52, y2: Y(8) + 14, class: 'grade' }, svg);
      texto(svg, X(v), Y(8) + 34, `${virgula(v, 1)} m`, { 'text-anchor': 'middle', 'font-size': 12 });
    }
    const media = faixas.reduce((s, f) => s + f[1], 0) / faixas.length;
    el('line', { x1: X(media), x2: X(media), y1: 52, y2: Y(8) + 14, style: 'stroke:var(--tinta);stroke-width:1;stroke-dasharray:4 3' }, svg);
    texto(svg, X(media) + 5, 46, `média ${virgula(media)} m`, { 'font-size': 11.5, style: tinta });
    faixas.forEach(([rumo, d], i) => {
      const leste = rumo < 180;
      texto(svg, 0, Y(i) + 4.5, `faixa ${i + 1} · ${leste ? 'leste' : 'oeste'}`, { 'font-size': 12, style: tinta2 });
      const g = el('g', {}, svg);
      el('title', {}, g).textContent = `faixa ${i + 1}, voada para ${leste ? 'leste' : 'oeste'}: ${virgula(d)} m para a direita do voo`;
      el('line', { x1: X(0), x2: X(d), y1: Y(i), y2: Y(i), style: 'stroke:var(--linha);stroke-width:2' }, g);
      el('circle', { cx: X(d), cy: Y(i), r: 6, style: leste ? 'fill:var(--destaque)' : 'fill:var(--papel);stroke:var(--tinta2);stroke-width:2' }, g);
    });
    el('line', { x1: X(0), x2: X(0), y1: 52, y2: Y(8) + 14, class: 'eixo' }, svg);
  })();

  // ---------- cronograma de 24 meses
  (() => {
    const caixa = document.getElementById('crono');
    const itens = [
      { nome: 'Disciplinas obrigatórias (SUS5000 Metodologias de Pesquisa em Sustentabilidade, SUS5002 Sustentabilidade) e revisão sistemática', de: 1, ate: 6 },
      { nome: 'Campo: DAP e altura das árvores na área já processada', de: 1, ate: 6 },
      { nome: 'Escala: trajetórias completas, janela de fotos vizinhas, taxa de sucesso por cena, comparação com GPS e métodos cross-view', de: 4, ate: 12 },
      { nome: 'Inventário multiclasse na área piloto e validação de campo', de: 10, ate: 16 },
      { nome: 'Exame de qualificação (por volta do mês 12, conforme a norma do programa)', marco: 12 },
      { nome: 'Mapillary, WebGIS colaborativo e artigo', de: 14, ate: 20 },
      { nome: 'Redação e defesa', de: 20, ate: 24 },
    ];
    const pct = m => `${((m - 1) / 24) * 100}%`;
    let html = '<div class="crono-escala"><span></span><span class="meses"><span>mês 1</span><span>6</span><span>12</span><span>18</span><span>24</span></span></div>';
    for (const it of itens) {
      const marca = it.marco
        ? `<span class="crono-marco" style="left:${pct(it.marco + 0.5)}" title="mês ${it.marco}"></span>`
        : `<span class="crono-barra" style="left:${pct(it.de)};width:${((it.ate - it.de + 1) / 24) * 100}%" title="meses ${it.de}–${it.ate}"></span>`;
      const quando = it.marco ? `mês ~${it.marco}` : `meses ${it.de}–${it.ate}`;
      html += `<div class="crono-linha"><span class="nome">${it.nome} <span class="selo">· ${quando}</span></span>` +
              `<span class="crono-trilho">${marca}</span></div>`;
    }
    caixa.innerHTML = html;
  })();
})();
