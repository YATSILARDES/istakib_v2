
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Save } from 'lucide-react';
import { db } from '../src/firebase'; // Adjust if path is different
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface CalendarWidgetProps {
    userEmail?: string | null;
    isDarkMode?: boolean;
}

interface CalendarNote {
    id: string;
    date: string; // YYYY-MM-DD
    note: string;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ userEmail, isDarkMode = true }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [noteInput, setNoteInput] = useState('');
    const [isInternalModalOpen, setIsInternalModalOpen] = useState(false);

    // Fetch notes for the current user
    useEffect(() => {
        if (!userEmail) return;

        const q = query(
            collection(db, 'calendar_notes'),
            where('userEmail', '==', userEmail)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotes: Record<string, string> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.date && data.note) {
                    fetchedNotes[data.date] = data.note;
                }
            });
            setNotes(fetchedNotes);
        });

        return () => unsubscribe();
    }, [userEmail]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        // 0 = Sunday, 1 = Monday ... 6 = Saturday
        // We want Monday to be 0 for the grid usually in TR culture?
        // Standard JS: 0=Sun. Let's convert so 0=Mon, 6=Sun
        let day = new Date(year, month, 1).getDay();
        return (day === 0 ? 6 : day - 1);
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const formatDate = (year: number, month: number, day: number) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const handleDateClick = (day: number) => {
        const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(dateStr);
        setNoteInput(notes[dateStr] || '');
        setIsInternalModalOpen(true);
    };

    const handleSaveNote = async () => {
        if (!userEmail || !selectedDate) return;

        // Doc ID can be email_date
        const docId = `${userEmail}_${selectedDate}`;
        try {
            if (noteInput.trim()) {
                await setDoc(doc(db, 'calendar_notes', docId), {
                    userEmail,
                    date: selectedDate,
                    note: noteInput,
                    updatedAt: new Date()
                });
            } else {
                // Delete if empty
                await deleteDoc(doc(db, 'calendar_notes', docId));
            }
            setIsInternalModalOpen(false);
        } catch (error) {
            console.error("Error saving note:", error);
        }
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthName = currentDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

    const days = [];
    // Padding for prev month
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-8 md:h-9" />);
    }
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = formatDate(year, month, d);
        const hasNote = !!notes[dateStr];
        const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

        days.push(
            <button
                key={d}
                onClick={() => handleDateClick(d)}
                className={`
                    h-8 md:h-9 w-full flex flex-col items-center justify-center rounded-lg text-xs md:text-sm relative transition-colors border
                    ${isToday 
                        ? (isDarkMode ? 'bg-blue-500/20 text-blue-300 font-bold border-blue-500/30' : 'bg-blue-600 text-white font-bold border-transparent')
                        : (isDarkMode ? 'hover:bg-white/10 text-slate-300 hover:text-white border-transparent' : 'hover:bg-slate-100 text-slate-700 border-transparent')
                    }
                    ${hasNote && !isToday 
                        ? (isDarkMode ? 'bg-indigo-500/20 text-indigo-200 font-semibold border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 font-semibold border-transparent') 
                        : ''}
                `}
            >
                {d}
                {hasNote && (
                    <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isToday ? (isDarkMode ? 'bg-blue-300' : 'bg-white') : (isDarkMode ? 'bg-indigo-400' : 'bg-indigo-500')}`} />
                )}
            </button>
        );
    }

    return (
        <div className={`rounded-2xl flex flex-col h-full overflow-hidden relative transition-colors duration-500 ${isDarkMode ? 'bg-white/5 backdrop-blur-md shadow-xl border border-white/10' : 'bg-slate-200/80 backdrop-blur-md shadow-md border border-slate-300'}`}>
            {/* Header */}
            <div className={`p-3 border-b flex items-center justify-between ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex flex-col">
                    <span className={`font-bold capitalize text-sm ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{monthName}</span>
                    <span className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-400'}`}>Kişisel Takvim</span>
                </div>
                <div className="flex gap-1">
                    <button onClick={handlePrevMonth} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-500'}`}>
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={handleNextMonth} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-500'}`}>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Grid Header */}
            <div className={`grid grid-cols-7 gap-1 p-2 border-b ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400' : 'border-slate-100 bg-slate-50/30 text-slate-500'}`}>
                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 p-2 flex-1 overflow-auto custom-scrollbar content-start">
                {days}
            </div>

            {/* Today Note Alert */}
            {(() => {
                const today = new Date();
                const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
                if (notes[todayStr]) {
                    return (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                            <button
                                onClick={() => handleDateClick(today.getDate())}
                                className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-red-500/30 animate-pulse flex items-center gap-2 whitespace-nowrap transition-colors"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                BUGÜN NOTUNUZ VAR!
                            </button>
                        </div>
                    );
                }
                return null;
            })()}

            {/* Note Modal/Overlay */}
            {isInternalModalOpen && (
                <div className={`absolute inset-0 z-10 flex flex-col p-4 animate-in fade-in zoom-in duration-200 rounded-2xl ${isDarkMode ? 'bg-[#1e293b]/90 backdrop-blur-md' : 'bg-white/95 backdrop-blur-sm'}`}>
                    <div className="flex items-center justify-between mb-3 shrink-0">
                        <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Not Ekle: {selectedDate?.split('-').reverse().join('.')}</h4>
                        <button onClick={() => setIsInternalModalOpen(false)} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-500'}`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Bugün için notunuz..."
                        className={`flex-1 w-full rounded-xl p-3 text-sm focus:outline-none resize-none mb-3 transition-colors border ${isDarkMode ? 'bg-black/20 border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-slate-100 placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder:text-slate-400'}`}
                    />
                    <button
                        onClick={handleSaveNote}
                        className={`w-full py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${isDarkMode ? 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 shadow-lg' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'}`}
                    >
                        <Save className="w-4 h-4" />
                        Kaydet
                    </button>
                </div>
            )}
        </div>
    );
};

export default CalendarWidget;
