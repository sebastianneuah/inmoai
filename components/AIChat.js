
import { useState } from 'react';
import { searchProperties } from '../lib/searchEngine';
import PropertyCard from './PropertyCard';
import { saveSearchToSupabase } from '../supabase/queries';

export default function AIChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setMessages([...messages, { role: 'user', content: input }]);

    await saveSearchToSupabase(input);
    const foundProps = await searchProperties(input);

    setResults(foundProps);
    setMessages([...messages, { role: 'user', content: input }, { role: 'ai', content: `Encontré ${foundProps.length} propiedades:` }]);
    setLoading(false);
    setInput('');
  };

  return (
    <div style={{ maxWidth: 800, width: '100%', background: 'white', borderRadius: 8, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <div style={{ height: 400, overflowY: 'auto', marginBottom: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <b>{m.role === 'user' ? 'Vos' : 'InmoAI'}:</b> {m.content}
          </div>
        ))}
        {loading && <div>Buscando propiedades...</div>}
      </div>
      <input
        type="text"
        placeholder="Contame qué estás buscando..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
      />
      <div style={{ marginTop: 32 }}>
        {results.map((prop, i) => (
          <PropertyCard key={i} property={prop} />
        ))}
      </div>
    </div>
  );
}
