import React, { useState, useEffect } from 'react';
import { Plus, Trash2, StickyNote } from 'lucide-react';

const PersonalNotes: React.FC = () => {
    const [notes, setNotes] = useState<string[]>([]);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('personal_notes');
        if (saved) {
            try {
                setNotes(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse notes", e);
            }
        }
    }, []);

    const saveNotes = (updatedNotes: string[]) => {
        setNotes(updatedNotes);
        localStorage.setItem('personal_notes', JSON.stringify(updatedNotes));
    };

    const handleAdd = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newNote.trim()) return;
        const updated = [newNote, ...notes];
        saveNotes(updated);
        setNewNote('');
    };

    const handleDelete = (index: number) => {
        const updated = notes.filter((_, i) => i !== index);
        saveNotes(updated);
    };

    return (
        <div className="bg-[#fdfbf7] rounded-xl shadow-md border border-stone-200 h-full flex flex-col relative overflow-hidden">
            {/* Notebook Header / Binding Visual */}
            <div className="bg-stone-800 h-3 w-full absolute top-0 left-0 z-20 opacity-80" />

            <div className="p-4 pt-6 flex flex-col h-full relative z-10">
                <h3 className="font-serif font-bold text-stone-700 text-lg flex items-center gap-2 mb-2 italic">
                    <StickyNote className="w-5 h-5 text-stone-400" />
                    Kişisel Notlarım
                </h3>

                <form onSubmit={handleAdd} className="flex gap-2 mb-2 relative group">
                    <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Buraya not alın..."
                        className="flex-1 bg-transparent border-b-2 border-stone-300 px-1 py-1 text-sm outline-none focus:border-stone-500 text-stone-700 placeholder:italic placeholder:text-stone-400 font-serif transition-all"
                    />
                    <button type="submit" className="text-stone-400 hover:text-stone-700 transition-colors p-1">
                        <Plus className="w-5 h-5" />
                    </button>
                </form>

                <div
                    className="flex-1 overflow-y-auto custom-scrollbar pr-1"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e7e5e4 31px, #e7e5e4 32px)',
                        backgroundAttachment: 'local',
                        lineHeight: '32px'
                    }}
                >
                    {notes.length === 0 && (
                        <div className="text-center text-stone-300 text-sm py-8 font-serif italic selection:bg-stone-100">
                            Defter boş...
                        </div>
                    )}
                    {notes.map((note, idx) => (
                        <div key={idx} className="group relative pl-2 hover:bg-stone-50/50 transition-colors -mx-2 px-2 flex items-start justify-between min-h-[32px]">
                            <p className="text-sm text-stone-700 font-serif leading-[32px] break-words w-full">{note}</p>
                            <button
                                onClick={() => handleDelete(idx)}
                                className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all absolute right-0 top-1 bg-[#fdfbf7] px-1"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Paper Texture Overlay (optional subtle noise if needed, but simple color is clean) */}
        </div>
    );
};

export default PersonalNotes;
