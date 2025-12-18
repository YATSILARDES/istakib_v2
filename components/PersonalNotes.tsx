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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4">
                <StickyNote className="w-5 h-5 text-yellow-500" />
                Kişisel Notlarım
            </h3>

            <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Yeni not ekle..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all"
                />
                <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
            </form>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {notes.length === 0 && (
                    <div className="text-center text-slate-400 text-xs py-8 italic">
                        Henüz not eklenmemiş.
                    </div>
                )}
                {notes.map((note, idx) => (
                    <div key={idx} className="group bg-yellow-50/50 border border-yellow-100 p-3 rounded-lg flex items-start justify-between gap-3 hover:shadow-sm transition-all">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{note}</p>
                        <button
                            onClick={() => handleDelete(idx)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all pt-0.5"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PersonalNotes;
