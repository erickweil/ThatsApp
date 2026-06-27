'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { desconectar, enviarMensagem, inicializarRealtime } from '@/lib/realtime';

interface Mensagem {
    id: number;
    username: string;
    texto: string;
    isSystem: boolean;
    isMinha: boolean;
    hora: string;
}

function horaAtual(): string {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatApp() {
    const [etapa, setEtapa] = useState<'login' | 'chat'>('login');
    const [username, setUsername] = useState('');
    const [inputNome, setInputNome] = useState('');
    const [mensagens, setMensagens] = useState<Mensagem[]>([]);
    const [inputMensagem, setInputMensagem] = useState('');
    const [enviando, setEnviando] = useState(false);
    const idRef = useRef(0);
    const listaRef = useRef<HTMLDivElement>(null);

    const adicionarMensagem = useCallback((msg: Omit<Mensagem, 'id'>) => {
        setMensagens((prev) => [...prev, { ...msg, id: ++idRef.current }]);
    }, []);

    useEffect(() => {
        if (listaRef.current) {
            listaRef.current.scrollTop = listaRef.current.scrollHeight;
        }
    }, [mensagens]);

    useEffect(() => {
        return () => {
            desconectar();
        };
    }, []);

    const entrar = (e: React.FormEvent) => {
        e.preventDefault();
        const nome = inputNome.trim();
        if (!nome) return;

        setUsername(nome);
        setEtapa('chat');

        inicializarRealtime(nome, (msgUsername, texto, isSystem) => {
            adicionarMensagem({
                username: msgUsername,
                texto,
                isSystem,
                isMinha: false,
                hora: horaAtual(),
            });
        });

        adicionarMensagem({
            username: 'Sistema',
            texto: `Bem-vindo ao ThatsApp, ${nome}!`,
            isSystem: true,
            isMinha: false,
            hora: horaAtual(),
        });
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        const texto = inputMensagem.trim();
        if (!texto || enviando) return;

        setEnviando(true);
        setInputMensagem('');

        adicionarMensagem({
            username,
            texto,
            isSystem: false,
            isMinha: true,
            hora: horaAtual(),
        });

        await enviarMensagem(username, texto);
        setEnviando(false);
    };

    if (etapa === 'login') {
        return (
            <div className="flex h-screen items-center justify-center bg-[#128C7E]">
                <div className="w-full max-w-sm mx-4">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white mb-4 shadow-lg">
                            <span className="text-4xl">💬</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tight">ThatsApp</h1>
                        <p className="text-[#dcf8c6] mt-2 text-sm">Chat em tempo real</p>
                    </div>
                    <form onSubmit={entrar} className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
                        <label className="text-sm font-medium text-gray-600">Seu nome</label>
                        <input
                            type="text"
                            value={inputNome}
                            onChange={(e) => setInputNome(e.target.value)}
                            placeholder="Como você quer ser chamado?"
                            maxLength={32}
                            autoFocus
                            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#128C7E] transition"
                        />
                        <button
                            type="submit"
                            disabled={!inputNome.trim()}
                            className="bg-[#128C7E] hover:bg-[#0f7268] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
                        >
                            Entrar no chat
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#ECE5DD]">
            {/* Header */}
            <header className="flex items-center gap-3 bg-[#128C7E] text-white px-4 py-3 shadow-md">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                    <span className="text-xl">💬</span>
                </div>
                <div className="flex-1">
                    <h1 className="font-bold text-lg leading-none">ThatsApp</h1>
                    <p className="text-xs text-[#dcf8c6]">Chat global</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                    <span className="text-xs text-[#dcf8c6]">{username}</span>
                </div>
            </header>

            {/* Wallpaper + mensagens */}
            <div
                ref={listaRef}
                className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23b0bec5' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            >
                {mensagens.map((msg) => {
                    if (msg.isSystem) {
                        return (
                            <div key={msg.id} className="flex justify-center my-1">
                                <span className="bg-[#e1f2fb] text-[#54656f] text-xs px-3 py-1 rounded-full shadow-sm">
                                    <strong>{msg.username}</strong>{msg.texto ? ` ${msg.texto}` : ''}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={msg.id}
                            className={`flex ${msg.isMinha ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${
                                    msg.isMinha
                                        ? 'bg-[#dcf8c6] rounded-br-sm'
                                        : 'bg-white rounded-bl-sm'
                                }`}
                            >
                                {!msg.isMinha && (
                                    <p className="text-xs font-semibold text-[#128C7E] mb-0.5">
                                        {msg.username}
                                    </p>
                                )}
                                <p className="text-sm text-gray-800 break-words">{msg.texto}</p>
                                <p className="text-[10px] text-gray-400 text-right mt-0.5 select-none">
                                    {msg.hora}
                                    {msg.isMinha && <span className="ml-1 text-[#53bdeb]">✓✓</span>}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input */}
            <form
                onSubmit={enviar}
                className="flex items-center gap-2 bg-[#f0f2f5] px-3 py-2 border-t border-gray-200"
            >
                <input
                    type="text"
                    value={inputMensagem}
                    onChange={(e) => setInputMensagem(e.target.value)}
                    placeholder="Digite uma mensagem"
                    maxLength={512}
                    className="flex-1 bg-white rounded-full px-4 py-2.5 text-sm focus:outline-none shadow-sm"
                />
                <button
                    type="submit"
                    disabled={!inputMensagem.trim() || enviando}
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-[#128C7E] hover:bg-[#0f7268] disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow"
                    aria-label="Enviar mensagem"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 translate-x-0.5">
                        <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </form>
        </div>
    );
}
