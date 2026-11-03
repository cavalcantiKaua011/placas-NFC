#!/usr/bin/env python3
"""
Extrai as 6 artes do PowerPoint de produção (slide 1, "Artes sem QR Code") e gera
lib/pptx/modelo.generated.ts, usado pelo gerador de PowerPoint do painel.

Uso (só precisa rodar de novo se as artes do PowerPoint mudarem):
    python3 scripts/extrair-modelo-pptx.py assets/pptx/referencia-producao.pptx

O que faz:
  - Lê os 6 grupos (artes) do slide 1, sem alterar o desenho: mesmas formas, textos,
    imagens, cores e fontes do arquivo original.
  - Mede, em cada arte, o retângulo do cartão (fundo 11,75 cm) e a área reservada ao
    QR Code (os 8 cantoneiras pretas).
  - Monta um PowerPoint-base SEM slides (mesmo tamanho de slide, tema, master e fontes)
    contendo as imagens das artes.
  - Grava tudo em base64/JSON dentro de um arquivo TypeScript (funciona na Vercel sem
    precisar ler arquivos do disco).
"""
import base64, copy, hashlib, io, json, re, sys, zipfile
from lxml import etree

NS = {
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}
R = '{%s}' % NS['r']
REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
SAIDA = 'lib/pptx/modelo.generated.ts'

# Ordem das artes no slide 1 (linha 1: Google azul, Google preto; linha 2: Instagram
# colorido, Instagram preto, WhatsApp verde, WhatsApp preto). Conferida pelo texto.
ARTES = [
    ('google_azul', 'Google azul', 'GOOGLE'),
    ('google_preto', 'Google preto', 'GOOGLE'),
    ('instagram_colorido', 'Instagram colorido', 'Instagram'),
    ('instagram_preto', 'Instagram preto', 'Instagram'),
    ('whatsapp_verde', 'WhatsApp verde', 'WhatsApp'),
    ('whatsapp_preto', 'WhatsApp preto', 'WhatsApp'),
]


def xfrm_of(el):
    x = el.find('./p:spPr/a:xfrm', NS)
    if x is None:
        x = el.find('./p:grpSpPr/a:xfrm', NS)
    off, ext = x.find('a:off', NS), x.find('a:ext', NS)
    return int(off.get('x')), int(off.get('y')), int(ext.get('cx')), int(ext.get('cy'))


def texto(el):
    return ' '.join(t.text or '' for t in el.iter('{%s}t' % NS['a']))


def main(ref):
    z = zipfile.ZipFile(ref)
    pres = etree.fromstring(z.read('ppt/presentation.xml'))
    sz = pres.find('p:sldSz', NS)
    slide_cx, slide_cy = int(sz.get('cx')), int(sz.get('cy'))

    # slide 1 = primeiro da lista de slides
    pres_rels = etree.fromstring(z.read('ppt/_rels/presentation.xml.rels'))
    rid1 = pres.find('p:sldIdLst/p:sldId', NS).get(R + 'id')
    alvo1 = next(r.get('Target') for r in pres_rels if r.get('Id') == rid1)
    slide_path = 'ppt/' + alvo1
    rels_path = slide_path.replace('slides/', 'slides/_rels/') + '.rels'
    slide = etree.fromstring(z.read(slide_path))
    rels = {r.get('Id'): r.get('Target') for r in etree.fromstring(z.read(rels_path))}

    grupos = slide.findall('./p:cSld/p:spTree/p:grpSp', NS)
    if len(grupos) != 6:
        sys.exit(f'Esperava 6 artes no slide 1, encontrei {len(grupos)}')

    def cartao(g):
        # maior imagem quadrada do grupo = fundo do cartão
        pics = [(xfrm_of(p), p) for p in g.findall('p:pic', NS)]
        quad = [(xf, p) for xf, p in pics if abs(xf[2] - xf[3]) < 20000]
        return max(quad, key=lambda t: t[0][2])[0]

    # ordena por linha (y do cartão) e coluna (x)
    def chave(g):
        x, y, w, h = cartao(g)
        return (round(y / 1_000_000), x)

    grupos.sort(key=chave)

    media = {}  # nome no pacote -> bytes
    artes = []
    for (aid, nome, palavra), g in zip(ARTES, grupos):
        if palavra.lower() not in texto(g).lower():
            sys.exit(f'Arte {aid}: texto esperado "{palavra}" não encontrado')
        g = copy.deepcopy(g)
        gx, gy, gw, gh = xfrm_of(g)
        ch = g.find('./p:grpSpPr/a:xfrm/a:chOff', NS)
        che = g.find('./p:grpSpPr/a:xfrm/a:chExt', NS)
        chx, chy, chw, chh = int(ch.get('x')), int(ch.get('y')), int(che.get('cx')), int(che.get('cy'))

        card = cartao(g)
        # cantoneiras da área do QR: formas finas (~0,11 x 0,71 cm)
        cantos = []
        for sp in g.findall('p:sp', NS):
            x, y, w, h = xfrm_of(sp)
            fino, longo = min(w, h), max(w, h)
            if fino < 60000 and 220000 < longo < 300000:
                cantos.append((x, y, x + w, y + h))
        if len(cantos) != 8:
            sys.exit(f'Arte {aid}: esperava 8 cantoneiras da área do QR, encontrei {len(cantos)}')
        qr = (min(c[0] for c in cantos), min(c[1] for c in cantos), max(c[2] for c in cantos), max(c[3] for c in cantos))

        # imagens: renomeia e troca r:embed por marcador
        n = 0
        for blip in g.iter('{%s}blip' % NS['a']):
            rid = blip.get(R + 'embed')
            alvo = rels[rid]
            ext = alvo.rsplit('.', 1)[-1].lower()
            dados = z.read('ppt/' + alvo.replace('../', ''))
            novo = f'arte_{hashlib.sha1(dados).hexdigest()[:12]}.{ext}'  # mesma imagem = mesmo arquivo
            media[novo] = dados
            blip.set(R + 'embed', '{{IMG:' + novo + '}}')
            n += 1
        for el in g.iter():
            for k in el.attrib:
                if k.startswith(R) and not el.attrib[k].startswith('{{IMG:'):
                    sys.exit(f'Arte {aid}: relação não suportada {k}={el.attrib[k]}')

        # remove ids de criação (GUIDs) e renumera ids das formas
        for ext_lst in g.iter('{%s}extLst' % NS['a']):
            if b'creationId' in etree.tostring(ext_lst):
                ext_lst.getparent().remove(ext_lst)
        k = 0
        for c in g.iter('{%s}cNvPr' % NS['p']):
            c.set('id', '{{ID:%d}}' % k)
            k += 1
        g.find('./p:nvGrpSpPr/p:cNvPr', NS).set('name', '{{NOME}}')

        # transformação do grupo vira marcador (posição/escala calculadas no gerador)
        xf = g.find('./p:grpSpPr/a:xfrm', NS)
        xf.find('a:off', NS).set('x', '{{X}}'); xf.find('a:off', NS).set('y', '{{Y}}')
        xf.find('a:ext', NS).set('cx', '{{CX}}'); xf.find('a:ext', NS).set('cy', '{{CY}}')

        xml = etree.tostring(g, encoding='unicode')
        # remove declarações de namespace repetidas (o slide de saída já declara p/a/r)
        xml = re.sub(r' xmlns:(p|a|r)="[^"]+"', '', xml)
        artes.append({
            'id': aid, 'nome': nome, 'xml': xml, 'qtdIds': k,
            'grupo': {'chOffX': chx, 'chOffY': chy, 'chExtX': chw, 'chExtY': chh, 'escalaOriginal': gw / chw},
            'cartao': {'x': card[0], 'y': card[1], 'w': card[2], 'h': card[3]},
            'areaQr': {'x': qr[0], 'y': qr[1], 'w': qr[2] - qr[0], 'h': qr[3] - qr[1]},
        })

    # PowerPoint-base: sem slides, mesmo master/tema/tamanho
    buf = io.BytesIO()
    zo = zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED)
    for info in z.infolist():
        nomearq = info.filename
        if nomearq.startswith(('ppt/slides/', 'ppt/notesSlides/', 'ppt/media/', 'docProps/thumbnail')):
            continue
        dados = z.read(nomearq)
        if nomearq == 'ppt/presentation.xml':
            p = etree.fromstring(dados)
            lst = p.find('p:sldIdLst', NS)
            for s in list(lst):
                lst.remove(s)
            dados = etree.tostring(p, xml_declaration=True, encoding='UTF-8', standalone=True)
        elif nomearq == 'ppt/_rels/presentation.xml.rels':
            rr = etree.fromstring(dados)
            for r in list(rr):
                if r.get('Type').endswith('/slide'):
                    rr.remove(r)
            dados = etree.tostring(rr, xml_declaration=True, encoding='UTF-8', standalone=True)
        elif nomearq == '[Content_Types].xml':
            ct = etree.fromstring(dados)
            for o in list(ct):
                pn = o.get('PartName') or ''
                if pn.startswith(('/ppt/slides/', '/ppt/notesSlides/', '/docProps/thumbnail')):
                    ct.remove(o)
            dados = etree.tostring(ct, xml_declaration=True, encoding='UTF-8', standalone=True)
        elif nomearq == 'docProps/core.xml':
            continue  # metadados (autor etc.) são recriados pelo gerador (lib/pptx/gerar.ts)
        elif nomearq == '_rels/.rels':
            rr = etree.fromstring(dados)
            for r in list(rr):
                if 'thumbnail' in r.get('Type'):
                    rr.remove(r)
            dados = etree.tostring(rr, xml_declaration=True, encoding='UTF-8', standalone=True)
        zo.writestr(nomearq, dados)
    for nomearq, dados in media.items():
        zo.writestr('ppt/media/' + nomearq, dados)
    zo.close()

    modelo = {'slide': {'cx': slide_cx, 'cy': slide_cy}, 'artes': artes}
    with open(SAIDA, 'w', encoding='utf-8') as f:
        f.write('/* eslint-disable */\n')
        f.write('// ARQUIVO GERADO por scripts/extrair-modelo-pptx.py — não edite à mão.\n')
        f.write('// Origem: assets/pptx/referencia-producao.pptx (slide 1, "Artes sem QR Code").\n\n')
        f.write('export const MODELO = ' + json.dumps(modelo, ensure_ascii=False) + ' as const;\n\n')
        f.write("export const BASE_PPTX_BASE64 = '" + base64.b64encode(buf.getvalue()).decode() + "';\n")
    print(f'OK: {len(artes)} artes, {len(media)} imagens, base {len(buf.getvalue())//1024} KB -> {SAIDA}')
    for a in artes:
        c, q = a['cartao'], a['areaQr']
        print(f"  {a['id']:20} cartão {c['w']/360000:.3f} cm  área QR {q['w']/360000:.3f}x{q['h']/360000:.3f} cm  ids={a['qtdIds']}  escala={a['grupo']['escalaOriginal']:.4f}")


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'assets/pptx/referencia-producao.pptx')
