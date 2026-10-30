'use client';

import { useState } from 'react';
import { Power, PowerOff, Trash2 } from 'lucide-react';
import { alterarStatus, excluirPlaquinha } from '@/app/painel/actions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import type { ActionState, Status } from '@/lib/types';

export function AcoesPlaquinha({
  id,
  codigo,
  status,
  temDestino,
}: {
  id: string;
  codigo: string;
  status: Status;
  temDestino: boolean;
}) {
  const [msg, setMsg] = useState<ActionState>({});

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === 'ativa' ? (
          <ConfirmButton
            title={`Desativar ${codigo}?`}
            description="Quem ler a plaquinha verá uma página informando que ela está desativada. Você pode reativar quando quiser."
            confirmLabel="Desativar"
            action={() => alterarStatus(id, 'desativada')}
            onDone={setMsg}
          >
            <PowerOff className="h-4 w-4" aria-hidden /> Desativar
          </ConfirmButton>
        ) : temDestino ? (
          <ConfirmButton
            title={`Ativar ${codigo}?`}
            description="A plaquinha voltará a redirecionar para o destino configurado."
            confirmLabel="Ativar"
            action={() => alterarStatus(id, 'ativa')}
            onDone={setMsg}
          >
            <Power className="h-4 w-4" aria-hidden /> Ativar
          </ConfirmButton>
        ) : null}

        <ConfirmButton
          className="btn-danger"
          danger
          title={`Excluir ${codigo}?`}
          description={
            <>
              Esta ação <strong className="text-zinc-200">não pode ser desfeita</strong>. O QR Code e o chip NFC com este código
              deixarão de funcionar e o histórico de leituras será apagado. Para apenas pausar, use “Desativar”.
            </>
          }
          confirmLabel="Excluir definitivamente"
          action={() => excluirPlaquinha(id)}
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Excluir
        </ConfirmButton>
      </div>
      {msg.ok && msg.message && <p role="status" className="text-sm text-emerald-300">{msg.message}</p>}
    </div>
  );
}
