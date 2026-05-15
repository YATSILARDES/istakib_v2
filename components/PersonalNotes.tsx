import React, { useState, useEffect } from 'react';
import { Plus, Trash2, StickyNote, Loader2 } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../src/firebase'; // Ensure this path is correct relative to components folder

interface PersonalNotesProps {
    userEmail?: string;
    isDarkMode?: boolean;
}

const PersonalNotes: React.FC<PersonalNotesProps> = ({ userEmail, isDarkMode = true }) => {
    const [notes, setNotes] = useState<string[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(false);

    // Load Notes from Firestore
    useEffect(() => {
        if (!userEmail) {
            setNotes([]);
            return;
        }

        setLoading(true);
        const unsubscribe = onSnapshot(doc(db, 'personal_notes', userEmail), (docSnap) => {
            if (docSnap.exists()) {
                setNotes(docSnap.data().notes || []);
            } else {
                setNotes([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Notes fetch error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userEmail]);

    const saveNotes = async (updatedNotes: string[]) => {
        if (!userEmail) return;
        // setNotes(updatedNotes); // Optimistic update (already handled by snapshot if local latency is good, but explicit set is faster UI)
        try {
            await setDoc(doc(db, 'personal_notes', userEmail), {
                notes: updatedNotes,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (e) {
            console.error("Error saving notes:", e);
        }
    };

    const handleAdd = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newNote.trim()) return;
        const updated = [newNote, ...notes];
        // Optimistic
        setNotes(updated);
        setNewNote('');
        await saveNotes(updated);
    };

    const handleDelete = async (index: number) => {
        const updated = notes.filter((_, i) => i !== index);
        setNotes(updated);
        await saveNotes(updated);
    };

    if (!userEmail) return null; // Or show 'Please login'

    return (
        <div className="h-full flex flex-col">
            <h3 className={`font-bold text-sm flex items-center gap-2 mb-3 drop-shadow-md ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                <StickyNote className={`w-4 h-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`} />
                Kişisel Notlarım
            </h3>

            <div className={`rounded-xl flex flex-col flex-1 overflow-hidden relative transition-colors duration-500 ${isDarkMode ? 'bg-white/5 backdrop-blur-md shadow-xl border border-white/10' : 'bg-slate-200/80 backdrop-blur-md shadow-md border border-slate-300'}`}>
                {loading && (
                    <div className={`absolute inset-0 z-10 flex items-center justify-center ${isDarkMode ? 'bg-[#1e293b]/80 backdrop-blur-sm' : 'bg-white/80'}`}>
                        <Loader2 className={`w-5 h-5 animate-spin ${isDarkMode ? 'text-slate-300' : 'text-slate-400'}`} />
                    </div>
                )}

                <div className={`p-3 border-b ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
                    <form onSubmit={handleAdd} className="flex flex-col gap-2 relative group">
                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Yeni not yazın..."
                            className={`w-full rounded-lg px-3 py-2 text-xs outline-none transition-all resize-none h-20 border ${isDarkMode ? 'bg-black/20 border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-slate-700 placeholder:text-slate-400'}`}
                        />
                        <button type="submit" className={`self-end py-1.5 px-4 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold ${isDarkMode ? 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 shadow-lg' : 'bg-slate-800 hover:bg-slate-700 text-white shadow-sm'}`}>
                            <Plus className="w-3.5 h-3.5" /> Ekle
                        </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {!loading && notes.length === 0 && (
                        <div className={`text-center text-xs py-8 italic flex flex-col items-center gap-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            <StickyNote className={`w-8 h-8 ${isDarkMode ? 'text-slate-700' : 'text-slate-200'}`} />
                            Henüz not eklenmemiş.
                        </div>
                    )}
                    {notes.map((note, idx) => (
                        <div key={idx} className={`group p-2.5 rounded-lg flex items-start justify-between gap-2 transition-all ${isDarkMode ? 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 shadow-sm backdrop-blur-sm' : 'bg-white border border-slate-100 hover:border-slate-300 hover:shadow-sm'}`}>
                            <p className={`text-xs leading-relaxed font-medium break-words w-full ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{note}</p>
                            <button
                                onClick={() => handleDelete(idx)}
                                className={`opacity-0 group-hover:opacity-100 transition-all shrink-0 ${isDarkMode ? 'text-slate-400 hover:text-red-400' : 'text-slate-300 hover:text-red-500'}`}
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
