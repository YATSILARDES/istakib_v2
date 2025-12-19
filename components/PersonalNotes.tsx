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
        <div className="h-full flex flex-col">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3">
                <StickyNote className="w-4 h-4 text-slate-400" />
                Kişisel Notlarım
            </h3>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col flex-1 overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                    <form onSubmit={handleAdd} className="flex flex-col gap-2 relative group">
                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Yeni not yazın..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all placeholder:text-slate-400 text-slate-700 resize-none h-20"
                        />
                        <button type="submit" className="self-end bg-slate-800 hover:bg-slate-700 text-white py-1.5 px-4 rounded-lg transition-colors shadow-sm flex items-center gap-2 text-xs font-bold">
                            <Plus className="w-3.5 h-3.5" /> Ekle
                        </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {notes.length === 0 && (
                        <div className="text-center text-slate-400 text-xs py-8 italic flex flex-col items-center gap-2">
                            <StickyNote className="w-8 h-8 text-slate-200" />
                            Henüz not eklenmemiş.
                        </div>
                    )}
                    {notes.map((note, idx) => (
                        <div key={idx} className="group bg-white border border-slate-100 p-2.5 rounded-lg flex items-start justify-between gap-2 hover:border-slate-300 hover:shadow-sm transition-all">
                            <p className="text-xs text-slate-600 leading-relaxed font-medium break-words w-full">{note}</p>
                            <button
                                onClick={() => handleDelete(idx)}
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all shrink-0"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PersonalNotes;
