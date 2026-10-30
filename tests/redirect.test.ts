import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashIp, resolverCodigo } from '@/lib/redirect';
import { DemoRepo, reiniciarDemo } from '@/lib/data/demo-repo';

describe('hashIp', () => {
  it('não devolve o IP e muda por dia/sal', () => {
    const h = hashIp('200.1.2.3', 'sal', '2026-01-01');
    expect(h).not.toContain('200.1.2.3');
    expect(h).toHaveLength(32);
    expect(hashIp('200.1.2.3', 'sal', '2026-01-02')).not.toBe(h);
    expect(hashIp('200.1.2.3', null)).toBeNull();
  });
});

describe('resolverCodigo (modo demonstração)', () => {
  beforeEach(() => {
    process.env.DEMO_MODE = 'true';
    process.env.IP_HASH_SALT = 'teste';
    reiniciarDemo();
  });
  afterEach(() => {
    delete process.env.DEMO_MODE;
    delete process.env.IP_HASH_SALT;
  });

  it('redireciona plaquinha ativa e registra 1 leitura por visitante em 30 s', async () => {
    const repo = new DemoRepo();
    const antes = (await repo.buscarPorCodigo('DEMO2K7M'))!.total_leituras;
    const r1 = await resolverCodigo('demo2k7m', { ip: '1.1.1.1', userAgent: 'iPhone' });
    const r2 = await resolverCodigo('DEMO2K7M', { ip: '1.1.1.1', userAgent: 'iPhone' });
    const r3 = await resolverCodigo('DEMO2K7M', { ip: '2.2.2.2', userAgent: 'Android' });
    expect(r1).toEqual({ tipo: 'redirecionar', url: 'https://g.page/r/EXEMPLO-PADARIA/review' });
    expect(r2.tipo).toBe('redirecionar');
    expect(r3.tipo).toBe('redirecionar');
    expect((await new DemoRepo().buscarPorCodigo('DEMO2K7M'))!.total_leituras).toBe(antes + 2);
  });

  it('não redireciona plaquinha aguardando nem desativada, e não conta leitura', async () => {
    expect(await resolverCodigo('DEMO4BQE', { ip: null, userAgent: null })).toEqual({ tipo: 'estado', motivo: 'aguardando' });
    const antes = (await new DemoRepo().buscarPorCodigo('DEMO2MKD'))!.total_leituras;
    expect(await resolverCodigo('DEMO2MKD', { ip: null, userAgent: null })).toEqual({ tipo: 'estado', motivo: 'desativada' });
    expect((await new DemoRepo().buscarPorCodigo('DEMO2MKD'))!.total_leituras).toBe(antes);
  });

  it('código inexistente, interno sequencial ou malformado → não encontrada', async () => {
    for (const c of ['ZZZZZZZZ', 'NFC-0001', '../../etc', 'a b', "x';--"]) {
      expect(await resolverCodigo(c, { ip: null, userAgent: null })).toEqual({ tipo: 'estado', motivo: 'nao-encontrada' });
    }
  });
});
