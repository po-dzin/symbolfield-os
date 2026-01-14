import React, { useState, useRef, useEffect } from 'react';

const AgentWindow = () => {
    const [messages, setMessages] = useState([
        { role: 'system', content: 'AGENT // ONLINE' },
        { role: 'assistant', content: 'Awaiting input. System status: NOMINAL.' }
    ]);
    const [input, setInput] = useState('');
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setMessages(prev => [...prev, { role: 'user', content: input }]);
        setInput('');

        // Mock response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: `Processing: "${input}"...` }]);
        }, 500);
    };

    return (
        <div className="flex flex-col h-full text-sm font-mono">
            {/* Chat History */}
            <div className="flex-1 space-y-3 mb-4 selectable-text">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                    max-w-[80%] p-3 rounded-lg backdrop-blur-md border
                    ${msg.role === 'user'
                                ? 'bg-os-cyan-dim border-os-cyan/20 text-os-cyan'
                                : msg.role === 'system'
                                    ? 'text-os-text-meta text-xs uppercase tracking-widest border-transparent'
                                    : 'bg-os-glass-bg border-os-glass-border text-os-text-primary'
                            }
                `}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Command..."
                    className="w-full bg-os-glass-bg border border-os-glass-border rounded-lg px-4 py-3 
                       text-os-text-primary placeholder-os-text-meta focus:outline-none focus:border-os-cyan/50
                       transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-os-text-meta text-xs">
                    ⏎
                </div>
            </form>
        </div>
    );
};

export default AgentWindow;
