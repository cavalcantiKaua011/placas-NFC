import type { Status } from './types';

export const STATUS_LABEL: Record<Status, string> = {
  aguardando: 'Aguardando configuração',
  ativa: 'Ativa',
  desativada: 'Desativada',
};

export const DISPOSITIVO_LABEL: Record<string, string> = {
  ios: 'iPhone / iPad',
  android: 'Android',
  desktop: 'Computador',
  outro: 'Outro',
};

export const TZ = 'America/Sao_Paulo';

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ }).format(
    new Date(value),
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: TZ }).format(new Date(value));
}

export function formatBRL(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

/** Aceita "1.234,56", "1234.56", "150" ou "R$ 150,00". Retorna null se inválido. */
export function parseBRL(input: string): number | null {
  const raw = input.replace(/[R$\s]/g, '').trim();
  if (!raw) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n * 100) / 100 : null;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatPhone(value: string | null | undefined) {
  if (!value) return '—';
  const d = onlyDigits(value).replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value;
}

export function timeAgo(value: string | null | undefined, agora: number = Date.now()) {
  if (!value) return 'nunca';
  const min = Math.round((agora - new Date(value).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  return formatDate(value);
}

/** Data de hoje (YYYY-MM-DD) no fuso de São Paulo. */
export function hojeISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}
