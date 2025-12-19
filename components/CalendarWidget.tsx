
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Save } from 'lucide-react';
import { db } from '../src/firebase'; // Adjust if path is different
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface CalendarWidgetProps {
    userEmail?: string | null;
}

interface CalendarNote {
    id: string;
    date: string; // YYYY-MM-DD
    note: string;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ userEmail }) => {
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
                    h-8 md:h-9 w-full flex flex-col items-center justify-center rounded-lg text-xs md:text-sm relative transition-colors
                    ${isToday ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}
                    ${hasNote && !isToday ? 'bg-indigo-50 text-indigo-700 font-semibold' : ''}
                `}
            >
                {d}
                {hasNote && (
                    <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-indigo-500'}`} />
                )}
            </button>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden relative">
            {/* Header */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="font-bold text-slate-700 capitalize text-sm">{monthName}</span>
                <div className="flex gap-1">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </button>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 gap-1 p-2 border-b border-slate-100 bg-slate-50/30">
                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-slate-400">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 p-2 flex-1 overflow-auto custom-scrollbar content-start">
                {days}
            </div>

            {/* Note Modal/Overlay */}
            {isInternalModalOpen && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col p-4 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                        <h4 className="font-bold text-slate-800 text-sm">Not Ekle: {selectedDate?.split('-').reverse().join('.')}</h4>
                        <button onClick={() => setIsInternalModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                    <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Bugün için notunuz..."
                        className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none mb-3"
                    />
                    <button
                        onClick={handleSaveNote}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
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
