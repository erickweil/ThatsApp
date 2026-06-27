import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

const getRealtimeClient = (): SupabaseClient | null => {
    if (_supabase) return _supabase;

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('Supabase URL ou Key não definidos nas variáveis de ambiente.');
        return null;
    }

    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _supabase;
};

let canalGlobal: RealtimeChannel | null = null;

export type CallbackMensagem = (username: string, mensagem: string, isSystem: boolean) => void;

let fnCallback: CallbackMensagem = () => {};

export const inicializarRealtime = (username: string, callback: CallbackMensagem): void => {
    const supabase = getRealtimeClient();
    if (!supabase) return;

    fnCallback = callback;

    if (canalGlobal) return;

    const canal = supabase.channel('thatsapp:global');

    canal
        .on('broadcast', { event: 'mensagem' }, ({ payload }) => {
            const msg = (typeof payload.mensagem === 'string' ? payload.mensagem : '').substring(0, 512);
            fnCallback(payload.username ?? '<desconhecido>', msg, false);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
            for (const p of newPresences) {
                const nome = p?.username ?? p?.name ?? '<desconhecido>';
                if (nome === username) continue;
                fnCallback(nome, 'entrou no chat.', true);
            }
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            for (const p of leftPresences) {
                const nome = p?.username ?? p?.name ?? '<desconhecido>';
                if (nome === username) continue;
                fnCallback(nome, 'saiu do chat.', true);
            }
        })
        .subscribe(async (status) => {
            if (status !== 'SUBSCRIBED') return;
            const resultado = await canal.track({ username });
            if (resultado !== 'ok') console.error('Erro ao rastrear presença:', resultado);
        });

    canalGlobal = canal;
};

export const enviarMensagem = async (username: string, mensagem: string): Promise<void> => {
    const supabase = getRealtimeClient();
    if (!supabase || !canalGlobal) {
        console.error('Canal não disponível para envio.');
        return;
    }

    const resultado = await canalGlobal.send({
        type: 'broadcast',
        event: 'mensagem',
        payload: { username, mensagem },
    });

    if (resultado !== 'ok') console.error('Erro ao enviar mensagem:', resultado);
};

export const desconectar = async (): Promise<void> => {
    const supabase = getRealtimeClient();
    if (!supabase) return;

    await supabase.removeAllChannels();
    canalGlobal = null;
    _supabase = null;
};
