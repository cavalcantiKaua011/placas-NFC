'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { acaoAdmin, NaoAutorizado } from '@/lib/auth';
import { analisarListaCodigos, normalizarCodigo } from '@/lib/codigo';
import { DestinoInvalido, isDestinoTipo, montarDestinoUrl } from '@/lib/destino';
import { DEMO_COOKIE } from '@/lib/demo-cookie';
import { isDemo } from '@/lib/env';
import { onlyDigits, parseBRL } from '@/lib/format';
import { getSiteUrl, urlPublica } from '@/lib/site';
import { ErroDeNegocio, type Repo } from '@/lib/data/repo';
import { reiniciarDemo } from '@/lib/data/demo-repo';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LIST, type ActionState, type ClienteDados, type Status } from '@/lib/types';

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

function texto(fd: FormData, campo: string, max = 200) {
  return String(fd.get(campo) ?? '').trim().slice(0, max);
}

function sucesso(message: string, demo: boolean): ActionState {
  return { ok: true, message: demo ? `${message} (demonstração: nada foi gravado no banco real)` : message };
}

function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroDeNegocio || e instanceof DestinoInvalido || e instanceof NaoAutorizado) return e.message;
  console.error('[acao]', e);
  return e instanceof Error && e.message.startsWith('Erro ao') ? e.message : 'Não foi possível concluir. Tente novamente.';
}

function atualizarTelas() {
  revalidatePath('/painel', 'layout');
}

function lerCliente(fd: FormData, prefixo = ''): ClienteDados {
  const nome = texto(fd, `${prefixo}nome_empresa`, 120);
  const responsavel = texto(fd, `${prefixo}responsavel`, 120) || null;
  const wppRaw = texto(fd, `${prefixo}whatsapp`, 30);
  const observacoes = texto(fd, `${prefixo}observacoes`, 1000) || null;
  if (nome.length < 2) throw new ErroDeNegocio('Informe o nome do estabelecimento.');
  let whatsapp: string | null = null;
  if (wppRaw) {
    whatsapp = onlyDigits(wppRaw);
    if (whatsapp.length === 10 || whatsapp.length === 11) whatsapp = `55${whatsapp}`;
    if (whatsapp.length < 12 || whatsapp.length > 13) throw new ErroDeNegocio('WhatsApp inválido. Use DDD + número.');
  }
  return { nome_empresa: nome, responsavel, whatsapp, observacoes };
}

async function garantirSemDuplicado(repo: Repo, dados: ClienteDados, ignorarId?: string) {
  const dup = await repo.clienteDuplicado(dados, ignorarId);
  if (dup) {
    throw new ErroDeNegocio(
      `Já existe um cliente com esse nome ou WhatsApp: "${dup.nome_empresa}". Selecione o cliente existente.`,
    );
  }
}

function lerDestino(fd: FormData) {
  const tipo = fd.get('destino_tipo');
  if (!isDestinoTipo(tipo)) throw new DestinoInvalido('Escolha o tipo de destino.');
  const valor = texto(fd, 'destino_valor', 2048);
  const url = montarDestinoUrl(tipo, valor, texto(fd, 'mensagem', 500));
  return { tipo, valor, url };
}

/* ------------------------------------------------------------------ */
/* Plaquinhas                                                          */
/* ------------------------------------------------------------------ */

export async function criarPlaquinhas(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { repo, demo } = await acaoAdmin();
    const qtd = Number(fd.get('quantidade'));
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 100) throw new ErroDeNegocio('Quantidade deve ser entre 1 e 100.');
    const criadas = await repo.criarPlaquinhas(qtd, getSiteUrl());
    atualizarTelas();
    const cods = criadas.map((p) => p.codigo_publico);
    return sucesso(
      cods.length === 1 ? `Plaquinha ${cods[0]} criada.` : `${cods.length} plaquinhas criadas.`,
      demo,
    );
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export async function importarCodigos(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { repo, demo } = await acaoAdmin();
    const { validos, invalidos } = analisarListaCodigos(String(fd.get('codigos') ?? ''));
    if (invalidos.length) {
      throw new ErroDeNegocio(
        `Códigos inválidos: ${invalidos.slice(0, 5).join(', ')}${invalidos.length > 5 ? '…' : ''}. Use 4 a 32 letras, números ou hífen.`,
      );
    }
    if (!validos.length) throw new ErroDeNegocio('Cole pelo menos um código.');
    if (validos.length > 500) throw new ErroDeNegocio('Importe no máximo 500 códigos por vez.');
    const { criadas, existentes } = await repo.importarCodigos(validos, getSiteUrl());
    atualizarTelas();
    const partes = [`${criadas.length} importado(s)`];
    if (existentes.length) partes.push(`${existentes.length} já existia(m) e foi(ram) ignorado(s)`);
    return sucesso(`${partes.join('; ')}.`, demo);
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export interface ConsultaCodigo {
  error?: string;
  plaquinha?: {
    id: string;
    codigo: string;
    codigo_publico: string;
    status: Status;
    cliente_id: string | null;
    nome_empresa: string | null;
    destino_tipo: string | null;
    destino_valor: string | null;
    destino_url: string | null;
  };
}

/** Passo 1 do fluxo "Configurar plaquinha": valida se o código existe. */
export async function consultarCodigo(entrada: string): Promise<ConsultaCodigo> {
  try {
    const { repo } = await acaoAdmin();
    const codigo = normalizarCodigo(entrada);
    if (!codigo) return { error: 'Código inválido. Digite o código impresso ou cole o link lido do QR Code.' };
    const p = await repo.buscarPorCodigo(codigo);
    if (!p) return { error: `Nenhuma plaquinha cadastrada com o código ${codigo}.` };
    return {
      plaquinha: {
        id: p.id,
        codigo: p.codigo,
        codigo_publico: p.codigo_publico,
        status: p.status,
        cliente_id: p.cliente_id,
        nome_empresa: p.nome_empresa,
        destino_tipo: p.destino_tipo,
        destino_valor: p.destino_valor,
        destino_url: p.destino_url,
      },
    };
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export interface ResultadoConfiguracao extends ActionState {
  resultado?: { id: string; codigo_publico: string; url_publica: string; destino_url: string; cliente: string };
}

/** Passo final do fluxo: vincula cliente, define destino e ativa. */
export async function configurarPlaquinha(_: ResultadoConfiguracao, fd: FormData): Promise<ResultadoConfiguracao> {
  try {
    const { repo, demo } = await acaoAdmin();
    const id = texto(fd, 'plaque_id', 64);
    const p = await repo.obterPlaquinha(id);
    if (!p) throw new ErroDeNegocio('Plaquinha não encontrada.');

    // Valida tudo antes de gravar qualquer coisa.
    const destino = lerDestino(fd);
    const modo = fd.get('cliente_modo') === 'novo' ? 'novo' : 'existente';
    let clienteId: string;
    let clienteNome: string;
    let novoCliente: ClienteDados | null = null;

    if (modo === 'novo') {
      novoCliente = lerCliente(fd, 'novo_');
      await garantirSemDuplicado(repo, novoCliente);
      clienteId = '';
      clienteNome = novoCliente.nome_empresa;
    } else {
      clienteId = texto(fd, 'cliente_id', 64);
      const c = clienteId ? await repo.obterCliente(clienteId) : null;
      if (!c) throw new ErroDeNegocio('Selecione um cliente ou cadastre um novo.');
      clienteNome = c.nome_empresa;
    }

    const trocandoCliente = p.cliente_id && (modo === 'novo' || p.cliente_id !== clienteId);
    if (trocandoCliente && fd.get('confirmar_troca') !== '1') {
      throw new ErroDeNegocio(
        `Esta plaquinha já está vinculada a "${p.nome_empresa}". Marque a confirmação para transferi-la.`,
      );
    }

    if (novoCliente) clienteId = (await repo.criarCliente(novoCliente)).id;
    await repo.vincularCliente(id, clienteId);
    await repo.salvarDestino(id, destino);
    if (p.status !== 'ativa') await repo.alterarStatus(id, 'ativa');

    atualizarTelas();
    return {
      ...sucesso('Plaquinha configurada e ativa.', demo),
      resultado: {
        id,
        codigo_publico: p.codigo_publico,
        url_publica: urlPublica(getSiteUrl(), p.codigo_publico),
        destino_url: destino.url,
        cliente: clienteNome,
      },
    };
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export async function salvarDestino(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { repo, demo } = await acaoAdmin();
    const id = texto(fd, 'id', 64);
    const p = await repo.obterPlaquinha(id);
    if (!p) throw new ErroDeNegocio('Plaquinha não encontrada.');
    await repo.salvarDestino(id, lerDestino(fd));
    let msg = 'Destino salvo.';
    if (p.status === 'aguardando') {
      await repo.alterarStatus(id, 'ativa');
      msg = 'Destino salvo e plaquinha ativada.';
    }
    atualizarTelas();
    return sucesso(msg, demo);
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export async function vincularCliente(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { repo, demo } = await acaoAdmin();
    const id = texto(fd, 'id', 64);
    const p = await repo.obterPlaquinha(id);
    if (!p) throw new ErroDeNegocio('Plaquinha não encontrada.');
    const clienteId = texto(fd, 'cliente_id', 64) || null;
    if (clienteId && !(await repo.obterCliente(clienteId))) throw new ErroDeNegocio('Cliente não encontrado.');
    if (p.cliente_id && clienteId !== p.cliente_id && fd.get('confirmar_troca') !== '1') {
      throw new ErroDeNegocio(`Marque a confirmação para desvincular de "${p.nome_empresa}".`);
    }
    await repo.vincularCliente(id, clienteId);
    atualizarTelas();
    return sucesso(clienteId ? 'Cliente vinculado.' : 'Cliente desvinculado.', demo);
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export async function salvarVenda(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { repo, demo } = await acaoAdmin();
    const id = texto(fd, 'id', 64);
    const data = texto(fd, 'data_venda', 10) || null;
    if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new ErroDeNegocio('Data da venda inválida.');
    const valorRaw = texto(fd, 'valor_venda', 20);
    const valor = valorRaw ? parseBRL(valorRaw) : null;
    if (valorRaw && valor === null) throw new ErroDeNegocio('Valor da venda inválido. Ex.: 149,90');
    await repo.salvarVenda(id, { data_venda: data, valor_venda: valor });
    atualizarTelas();
    return sucesso('Dados da venda salvos.', demo);
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export async function alterarStatus(id: string, status: Status): Promise<ActionState> {
  try {
    const { repo, demo } = await acaoAdmin();
    if (!STATUS_LIST.includes(status)) throw new ErroDeNegocio('Status inválido.');
    const p = await repo.obterPlaquinha(id);
    if (!p) throw new ErroDeNegocio('Plaquinha não encontrada.');
    if (status === 'ativa' && !p.destino_url) throw new ErroDeNegocio('Configure o destino antes de ativar.');
    if (status === 'aguardando' && p.destino_url) throw new ErroDeNegocio('Use "Desativar" para pausar uma plaquinha configurada.');
    await repo.alterarStatus(id, status);
    atualizarTelas();
    return sucesso(status === 'ativa' ? 'Plaquinha ativada.' : 'Plaquinha desativada.', demo);
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export async function excluirPlaquinha(id: string): Promise<ActionState> {
  try {
    const { repo } = await acaoAdmin();
    await repo.excluirPlaquinha(id);
    atualizarTelas();
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
  redirect('/painel/plaquinhas');
}

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

export async function criarCliente(_: ActionState, fd: FormData): Promise<ActionState & { id?: string }> {
  try {
    const { repo, demo } = await acaoAdmin();
    const dados = lerCliente(fd);
    await garantirSemDuplicado(repo, dados);
    const c = await repo.criarCliente(dados);
    atualizarTelas();
    return { ...sucesso(`Cliente "${c.nome_empresa}" cadastrado.`, demo), id: c.id };
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export async function atualizarCliente(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { repo, demo } = await acaoAdmin();
    const id = texto(fd, 'id', 64);
    const dados = lerCliente(fd);
    await garantirSemDuplicado(repo, dados, id);
    await repo.atualizarCliente(id, dados);
    atualizarTelas();
    return sucesso('Cliente atualizado.', demo);
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export async function excluirCliente(id: string): Promise<ActionState> {
  try {
    const { repo } = await acaoAdmin();
    await repo.excluirCliente(id);
    atualizarTelas();
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
  redirect('/painel/clientes');
}

/* ------------------------------------------------------------------ */
/* Conta                                                               */
/* ------------------------------------------------------------------ */

export async function alterarSenha(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { demo } = await acaoAdmin();
    if (demo) throw new ErroDeNegocio('Indisponível no modo demonstração.');
    const senha = String(fd.get('senha') ?? '');
    const confirmar = String(fd.get('confirmar') ?? '');
    if (senha.length < 10) throw new ErroDeNegocio('A senha precisa ter pelo menos 10 caracteres.');
    if (senha !== confirmar) throw new ErroDeNegocio('As senhas não coincidem.');
    const { error } = await createClient().auth.updateUser({ password: senha });
    if (error) throw new ErroDeNegocio(error.message);
    return { ok: true, message: 'Senha alterada.' };
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export async function restaurarDemo(): Promise<ActionState> {
  try {
    const { demo } = await acaoAdmin();
    if (!demo) throw new ErroDeNegocio('Disponível apenas no modo demonstração.');
    reiniciarDemo();
    atualizarTelas();
    return { ok: true, message: 'Dados de exemplo restaurados.' };
  } catch (e) {
    return { error: mensagemDeErro(e) };
  }
}

export async function sair() {
  if (isDemo()) {
    cookies().delete(DEMO_COOKIE);
  } else {
    try {
      await createClient().auth.signOut();
    } catch {
      /* sem sessão */
    }
  }
  redirect('/login');
}
