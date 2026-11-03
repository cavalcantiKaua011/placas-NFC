/**
 * Gerador do PowerPoint de produção.
 *
 * Usa as artes ORIGINAIS do PowerPoint de produção (extraídas por
 * scripts/extrair-modelo-pptx.py para ./modelo.generated.ts): as formas, textos,
 * imagens e fontes são copiados sem alteração. O gerador só:
 *   1. posiciona cada arte numa grade 4 × 2 (8 por slide);
 *   2. ajusta a escala do cartão para exatamente 12 × 12 cm;
 *   3. insere o QR Code (3 × 3 cm) centralizado na área reservada (cantoneiras).
 *
 * Todas as medidas são em EMU (unidade física do PowerPoint: 360 000 EMU = 1 cm).
 */
import JSZip from 'jszip';
import { MODELO, BASE_PPTX_BASE64 } from './modelo.generated';
import { ARTE_IDS, LIMITE_PLAQUINHAS, MEDIDAS, POR_SLIDE, type ArteId } from './plano';

export const EMU_POR_CM = 360_000;

export { ARTES, ARTE_IDS, isArteId, MEDIDAS, POR_SLIDE, LIMITE_PLAQUINHAS, planejar } from './plano';
export type { ArteId, PlanoProducao } from './plano';

export interface ItemProducao {
  /** Código público permanente (o mesmo de /r/[codigo]). */
  codigo: string;
  /** URL gravada no QR Code: https://DOMINIO/r/CODIGO */
  url: string;
}

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Posição (EMU) do cartão de 12 × 12 cm em cada uma das 8 posições do slide. */
export function posicoesDaGrade(): Retangulo[] {
  const c = Math.round(MEDIDAS.cartaoCm * EMU_POR_CM);
  const gx = Math.round(MEDIDAS.espacoHorizontalCm * EMU_POR_CM);
  const gy = Math.round(MEDIDAS.espacoVerticalCm * EMU_POR_CM);
  const larguraTotal = MEDIDAS.colunas * c + (MEDIDAS.colunas - 1) * gx;
  const alturaTotal = MEDIDAS.linhas * c + (MEDIDAS.linhas - 1) * gy;
  const x0 = Math.round((MODELO.slide.cx - larguraTotal) / 2);
  const y0 = Math.round((MODELO.slide.cy - alturaTotal) / 2);
  const out: Retangulo[] = [];
  for (let l = 0; l < MEDIDAS.linhas; l++) {
    for (let col = 0; col < MEDIDAS.colunas; col++) {
      out.push({ x: x0 + col * (c + gx), y: y0 + l * (c + gy), w: c, h: c });
    }
  }
  return out;
}

type Arte = (typeof MODELO.artes)[number];

/** Calcula a transformação do grupo da arte e o retângulo do QR para um cartão em `alvo`. */
export function layoutDaArte(arte: Arte, alvo: Retangulo) {
  const g = arte.grupo;
  const s = alvo.w / arte.cartao.w; // escala: cartão original (11,748 cm) → 12 cm
  const off = {
    x: Math.round(alvo.x - (arte.cartao.x - g.chOffX) * s),
    y: Math.round(alvo.y - (arte.cartao.y - g.chOffY) * s),
  };
  const ext = { cx: Math.round(g.chExtX * s), cy: Math.round(g.chExtY * s) };
  const qrLado = Math.round(MEDIDAS.qrCm * EMU_POR_CM);
  const centroX = off.x + (arte.areaQr.x + arte.areaQr.w / 2 - g.chOffX) * s;
  const centroY = off.y + (arte.areaQr.y + arte.areaQr.h / 2 - g.chOffY) * s;
  const qr: Retangulo = {
    x: Math.round(centroX - qrLado / 2),
    y: Math.round(centroY - qrLado / 2),
    w: qrLado,
    h: qrLado,
  };
  return { escala: s, off, ext, qr };
}

const escXml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CT_SLIDE = 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml';
const REL_SLIDE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';
const REL_IMAGE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const REL_LAYOUT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout';

export interface OpcoesGeracao {
  itens: ItemProducao[];
  artes: ArteId[];
  /** Gera o PNG do QR Code para uma URL. */
  qrPng: (url: string) => Promise<Uint8Array>;
  titulo?: string;
}

export class ErroGeracao extends Error {}

/** Gera o .pptx e devolve os bytes. */
export async function gerarPptx({ itens, artes, qrPng, titulo = 'Plaquinhas para impressão' }: OpcoesGeracao): Promise<Uint8Array> {
  if (!itens.length) throw new ErroGeracao('Selecione pelo menos uma plaquinha.');
  if (itens.length > LIMITE_PLAQUINHAS) throw new ErroGeracao(`Máximo de ${LIMITE_PLAQUINHAS} plaquinhas por arquivo.`);
  const artesUnicas = ARTE_IDS.filter((id) => artes.includes(id)); // ordem fixa e sem repetição
  if (!artesUnicas.length) throw new ErroGeracao('Selecione pelo menos uma arte.');
  const codigos = new Set<string>();
  for (const it of itens) {
    if (!/^[A-Z0-9-]{4,32}$/.test(it.codigo)) throw new ErroGeracao(`Código inválido: ${it.codigo}`);
    if (codigos.has(it.codigo)) throw new ErroGeracao(`Código repetido: ${it.codigo}`);
    if (!it.url.endsWith(`/r/${it.codigo}`)) throw new ErroGeracao(`URL não corresponde ao código ${it.codigo}`);
    codigos.add(it.codigo);
  }

  const zip = await JSZip.loadAsync(BASE_PPTX_BASE64, { base64: true });

  // 1 QR por plaquinha, reaproveitado em todas as artes
  const qrArquivo = new Map<string, string>();
  for (const it of itens) {
    const nome = `qr_${it.codigo}.png`;
    zip.file(`ppt/media/${nome}`, await qrPng(it.url));
    qrArquivo.set(it.codigo, nome);
  }

  const grade = posicoesDaGrade();
  const slides: { xml: string; rels: string }[] = [];

  for (const arteId of artesUnicas) {
    const arte = MODELO.artes.find((a) => a.id === arteId);
    if (!arte) throw new ErroGeracao(`Arte não encontrada no modelo: ${arteId}`);
    for (let inicio = 0; inicio < itens.length; inicio += POR_SLIDE) {
      const lote = itens.slice(inicio, inicio + POR_SLIDE);
      const rels = new Map<string, string>(); // arquivo de mídia -> rId
      const rId = (arquivo: string) => {
        if (!rels.has(arquivo)) rels.set(arquivo, `rId${rels.size + 2}`); // rId1 = layout
        return rels.get(arquivo)!;
      };
      let proximoId = 2;
      const formas: string[] = [];

      lote.forEach((item, i) => {
        const L = layoutDaArte(arte, grade[i]);
        const idExterno = proximoId++;
        const base = proximoId;
        proximoId += arte.qtdIds;
        const idQr = proximoId++;

        const grupoArte = arte.xml
          .replace(/\{\{ID:(\d+)\}\}/g, (_, k: string) => String(base + Number(k)))
          .replace('{{NOME}}', escXml(`Arte ${arte.nome}`))
          .replace('{{X}}', String(L.off.x))
          .replace('{{Y}}', String(L.off.y))
          .replace('{{CX}}', String(L.ext.cx))
          .replace('{{CY}}', String(L.ext.cy))
          .replace(/\{\{IMG:([^}]+)\}\}/g, (_, arq: string) => rId(arq));

        const qr =
          `<p:pic><p:nvPicPr><p:cNvPr id="${idQr}" name="${escXml(`QR ${item.codigo}`)}" descr="${escXml(item.url)}"/>` +
          `<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
          `<p:blipFill><a:blip r:embed="${rId(qrArquivo.get(item.codigo)!)}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
          `<p:spPr><a:xfrm><a:off x="${L.qr.x}" y="${L.qr.y}"/><a:ext cx="${L.qr.w}" cy="${L.qr.h}"/></a:xfrm>` +
          `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;

        // Grupo externo (escala 1) junta arte + QR: dá para mover a plaquinha inteira no PowerPoint.
        const ext = `<a:off x="${L.off.x}" y="${L.off.y}"/><a:ext cx="${L.ext.cx}" cy="${L.ext.cy}"/>`;
        formas.push(
          `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="${idExterno}" name="${escXml(`Plaquinha ${item.codigo} — ${arte.nome}`)}"/>` +
            `<p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm>${ext}` +
            `<a:chOff x="${L.off.x}" y="${L.off.y}"/><a:chExt cx="${L.ext.cx}" cy="${L.ext.cy}"/></a:xfrm></p:grpSpPr>` +
            grupoArte +
            qr +
            `</p:grpSp>`,
        );
      });

      const xml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
        `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
        `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>` +
        formas.join('') +
        `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;

      const relsXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${REL_LAYOUT}" Target="../slideLayouts/slideLayout1.xml"/>` +
        Array.from(rels.entries())
          .map(([arq, id]) => `<Relationship Id="${id}" Type="${REL_IMAGE}" Target="../media/${arq}"/>`)
          .join('') +
        `</Relationships>`;

      slides.push({ xml, rels: relsXml });
    }
  }

  // Registra os slides no pacote
  let pres = await zip.file('ppt/presentation.xml')!.async('string');
  let presRels = await zip.file('ppt/_rels/presentation.xml.rels')!.async('string');
  let tipos = await zip.file('[Content_Types].xml')!.async('string');

  const ids: string[] = [];
  const novasRels: string[] = [];
  const novosTipos: string[] = [];
  slides.forEach((s, i) => {
    const n = i + 1;
    zip.file(`ppt/slides/slide${n}.xml`, s.xml);
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, s.rels);
    ids.push(`<p:sldId id="${256 + i}" r:id="rIdSlide${n}"/>`);
    novasRels.push(`<Relationship Id="rIdSlide${n}" Type="${REL_SLIDE}" Target="slides/slide${n}.xml"/>`);
    novosTipos.push(`<Override PartName="/ppt/slides/slide${n}.xml" ContentType="${CT_SLIDE}"/>`);
  });

  if (/<p:sldIdLst\s*\/>/.test(pres)) pres = pres.replace(/<p:sldIdLst\s*\/>/, `<p:sldIdLst>${ids.join('')}</p:sldIdLst>`);
  else if (pres.includes('<p:sldIdLst>')) pres = pres.replace('<p:sldIdLst>', `<p:sldIdLst>${ids.join('')}`);
  else pres = pres.replace(/(<p:sldMasterIdLst>[\s\S]*?<\/p:sldMasterIdLst>)/, `$1<p:sldIdLst>${ids.join('')}</p:sldIdLst>`);
  presRels = presRels.replace('</Relationships>', `${novasRels.join('')}</Relationships>`);
  for (const [ext, ct] of [
    ['png', 'image/png'],
    ['jpeg', 'image/jpeg'],
    ['jpg', 'image/jpeg'],
  ]) {
    if (!new RegExp(`Extension="${ext}"`, 'i').test(tipos)) {
      tipos = tipos.replace('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">', (m) => `${m}<Default Extension="${ext}" ContentType="${ct}"/>`);
    }
  }
  tipos = tipos.replace('</Types>', `${novosTipos.join('')}</Types>`);

  zip.file('ppt/presentation.xml', pres);
  zip.file('ppt/_rels/presentation.xml.rels', presRels);
  zip.file('[Content_Types].xml', tipos);
  zip.file(
    'docProps/app.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Placas NFC</Application><Slides>${slides.length}</Slides></Properties>`,
  );
  const agora = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escXml(titulo)}</dc:title><dc:creator>Placas NFC</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${agora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${agora}</dcterms:modified></cp:coreProperties>`,
  );

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
