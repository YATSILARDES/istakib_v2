import React, { useMemo, useState, useEffect } from 'react';
import { Task, RoutineTask, StaffMember, TaskStatus, StatusLabels } from '../types';
import { X, Users, BarChart3, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../src/firebase';

interface FieldStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    routineTasks: RoutineTask[];
    staffList: StaffMember[];
    onUpdateTask: (taskId: string, newStatus: TaskStatus) => void;
    onToggleRoutineTask: (taskId: string, currentStatus: boolean) => void;
    onTaskClick: (task: Task) => void;
}

const FieldStaffStatusModal: React.FC<FieldStaffModalProps> = ({
    isOpen,
    onClose,
    tasks,
    routineTasks,
    staffList,
    onUpdateTask,
    onToggleRoutineTask,
    onTaskClick
}) => {
    const [selectedStaffEmail, setSelectedStaffEmail] = useState<string | null>(null);
    const [userPresence, setUserPresence] = useState<Record<string, any>>({});

    // --- Date Helpers ---
    const getTaskDate = (t: any): Date => {
        try {
            const source = t.scheduledDate || t.createdAt;
            if (!source) return new Date();
            if (source.seconds) return new Date(source.seconds * 1000);
            if (source instanceof Date) return source;
            if (typeof source === 'string') {
                const d = new Date(source);
                if (!isNaN(d.getTime())) return d;
            }
            if (typeof source === 'number') return new Date(source);
            return new Date();
        } catch (e) {
            console.error("Date parse error for task:", t, e);
            return new Date();
        }
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isOverdue = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const safeFormatDate = (date: Date) => {
        try {
            if (isNaN(date.getTime())) return "Tarihsiz";
            return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'numeric' });
        } catch (e) {
            return date.toDateString();
        }
    };

    const getEffectiveDate = (t: any) => {
        const d = getTaskDate(t);
        if (isOverdue(d) && !t.isCompleted && t.status !== TaskStatus.CHECK_COMPLETED && t.status !== TaskStatus.DEPOSIT_PAID) {
            return new Date(); // Treat as Today
        }
        return d;
    };

    // --- Presence Subscription ---
    useEffect(() => {
        if (!isOpen) return;

        // Subscribe to users collection for lastSeen
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const presenceData: Record<string, any> = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.email && data.lastSeen) {
                    presenceData[data.email.toLowerCase()] = data.lastSeen;
                }
            });
            setUserPresence(presenceData);
        }, (error) => {
            console.error("Error subscribing to user presence:", error);
        });

        return () => unsubscribe();
    }, [isOpen]);

    const formatLastSeen = (timestamp: any) => {
        if (!timestamp) return { text: 'Çevrimdışı', color: 'text-gray-400', date: null };

        let date: Date;
        if (timestamp.seconds) {
            date = new Date(timestamp.seconds * 1000);
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            date = new Date(timestamp);
        }

        if (isNaN(date.getTime())) return { text: 'Bilinmiyor', color: 'text-gray-400', date: null };

        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

        if (diffMinutes < 5) return { text: 'Çevrimiçi', color: 'text-green-500', date };
        if (diffMinutes < 60) return { text: `${diffMinutes} dk önce`, color: 'text-yellow-500', date };
        if (diffMinutes < 1440) return { text: `${Math.floor(diffMinutes / 60)} saat önce`, color: 'text-gray-500', date };

        return { text: date.toLocaleDateString('tr-TR'), color: 'text-gray-400', date };
    };

    // --- Statistics Calculation for SUMMARY View ---
    const staffStats = useMemo(() => {
        const statsMap = new Map<string, {
            name: string;
            email: string;
            activeTasks: Task[];
            activeRoutine: RoutineTask[];
            completedCount: number;
        }>();

        if (!staffList) return [];

        try {
            // Initialize Map
            staffList.forEach(s => {
                if (s && s.name) {
                    statsMap.set(s.name, {
                        name: s.name,
                        email: s.email || '',
                        activeTasks: [],
                        activeRoutine: [],
                        completedCount: 0
                    });
                }
            });

            // Add Active Main Tasks
            if (tasks && Array.isArray(tasks)) {
                tasks.forEach(t => {
                    if (!t) return;
                    // MATCH MOBILE FILTERING:
                    // 1. Hide CHECK_COMPLETED
                    // 2. Hide if checkStatus exists (missing/clean)
                    const isTaskActive = t.status !== TaskStatus.CHECK_COMPLETED && !t.checkStatus;
                    if (t.assignee && isTaskActive) {
                        const date = getTaskDate(t);
                        if (isToday(date) || isOverdue(date)) {
                            if (statsMap.has(t.assignee)) {
                                statsMap.get(t.assignee)!.activeTasks.push(t);
                            }
                        }
                    }
                });
            }

            // Add Active Routine Tasks
            if (routineTasks && Array.isArray(routineTasks)) {
                routineTasks.forEach(t => {
                    if (!t) return;
                    if (t.assignee && !t.isCompleted) {
                        const date = getTaskDate(t);
                        if (isToday(date) || isOverdue(date)) {
                            if (statsMap.has(t.assignee)) {
                                statsMap.get(t.assignee)!.activeRoutine.push(t);
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error("Error calculating staff stats:", error);
        }

        // SORT ARRAYS
        statsMap.forEach(stat => {
            stat.activeTasks.sort((a, b) => (a.dailyOrder || 0) - (b.dailyOrder || 0));
            stat.activeRoutine.sort((a, b) => (a.dailyOrder || 0) - (b.dailyOrder || 0));
        });

        return Array.from(statsMap.values()).sort((a, b) => {
            const totalA = a.activeTasks.length + a.activeRoutine.length;
            const totalB = b.activeTasks.length + b.activeRoutine.length;
            return totalB - totalA;
        });
    }, [tasks, routineTasks, staffList]);

    const totalActive = staffStats.reduce((acc, s) => acc + s.activeTasks.length + s.activeRoutine.length, 0);

    // --- Weekly View Data ---
    const getWeeklyData = (staffEmail: string) => {
        const days = [];
        const startOfWeek = new Date();
        const currentDay = startOfWeek.getDay(); // 0=Sun, 1=Mon...
        const diff = startOfWeek.getDate() - currentDay + (currentDay == 0 ? -6 : 1); // Adjust to Monday
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            days.push({
                date: d,
                label: safeFormatDate(d),
                isToday: isToday(d),
                items: [] as Array<{ type: 'main' | 'routine', data: Task | RoutineTask }>
            });
        }

        const staffName = staffList.find(s => s.email === staffEmail)?.name || '';

        try {
            const combined = [
                ...tasks.filter(t => {
                    // MATCH MOBILE FILTERING:
                    // 1. Hide CHECK_COMPLETED
                    // 2. Hide if checkStatus exists (missing/clean)
                    // 3. Allow DEPOSIT_PAID (removed exclusion)
                    const isTaskActive = t.status !== TaskStatus.CHECK_COMPLETED && !t.checkStatus;
                    return (t.assigneeEmail === staffEmail || t.assignee === staffName) && isTaskActive;
                }).map(t => ({
                    type: 'main' as const,
                    data: t,
                    date: getEffectiveDate(t),
                    dailyOrder: t.dailyOrder || 0
                })),
                ...routineTasks.filter(t => {
                    return (t.assigneeEmail === staffEmail || t.assignee === staffName) && !t.isCompleted;
                }).map(t => ({
                    type: 'routine' as const,
                    data: t,
                    date: getEffectiveDate(t),
                    dailyOrder: t.dailyOrder || 0
                }))
            ];

            combined.forEach(item => {
                const dayObj = days.find(day => isSameDay(day.date, item.date));
                if (dayObj) {
                    dayObj.items.push(item);
                }
            });

            days.forEach(day => {
                day.items.sort((a, b) => {
                    const orderA = a.dailyOrder || 0;
                    const orderB = b.dailyOrder || 0;
                    if (orderA === 0 && orderB === 0) {
                        if (a.type === b.type) return 0;
                        return a.type === 'routine' ? -1 : 1;
                    }
                    return orderA - orderB;
                });
            });

        } catch (error) {
            console.error("Error calculating weekly data:", error);
        }

        return { days, staffName };
    };

    // --- Render Content ---
    const renderContent = () => {
        if (selectedStaffEmail) {
            // --- DETAIL VIEW (WEEKLY) ---
            const { days, staffName } = getWeeklyData(selectedStaffEmail);

            return (
                <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => setSelectedStaffEmail(null)}
                            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-600 font-bold text-sm"
                        >
                            <Clock className="w-4 h-4 rotate-180" /> Geri Dön
                        </button>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">{staffName}</h3>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                        <div className="flex gap-4 min-w-[1200px] h-full">
                            {days.map((day, idx) => (
                                <div key={idx} className={`flex-1 min-w-[200px] rounded-2xl border flex flex-col ${day.isToday ? 'bg-orange-50/50 border-orange-200 ring-1 ring-orange-200' : 'bg-white border-slate-200'}`}>
                                    {/* Column Header */}
                                    <div className={`p-3 border-b text-center ${day.isToday ? 'bg-orange-100/50' : 'bg-slate-50'}`}>
                                        <span className={`block text-xs font-bold uppercase tracking-wider ${day.isToday ? 'text-orange-700' : 'text-slate-500'}`}>
                                            {day.label.split(' ')[0]}
                                        </span>
                                        <span className={`block text-lg font-black ${day.isToday ? 'text-orange-900' : 'text-slate-700'}`}>
                                            {day.label.split(' ').slice(1).join(' ')}
                                        </span>
                                    </div>

                                    {/* Tasks Container */}
                                    <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                                        {day.items.map((item, index) => {
                                            if (item.type === 'routine') {
                                                const t = item.data as RoutineTask;
                                                return (
                                                    <div key={t.id} className="bg-purple-50 border border-purple-100 p-2 rounded-lg group/item">
                                                        <div className="flex gap-2">
                                                            <div className="mt-0.5 bg-slate-700/20 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">
                                                                {index + 1}
                                                            </div>
                                                            <button
                                                                onClick={() => onToggleRoutineTask(t.id, t.isCompleted)}
                                                                className="mt-0.5 w-4 h-4 rounded border border-purple-300 bg-white flex items-center justify-center hover:bg-purple-500 hover:border-purple-500 hover:text-white transition-colors shrink-0"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3 opacity-0 group-hover/item:opacity-100" />
                                                            </button>
                                                            <div className="min-w-0">
                                                                <div className="text-[10px] font-bold text-purple-900 truncate">{t.customerName}</div>
                                                                <div className="text-[10px] text-purple-700 leading-tight">{t.content}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                const t = item.data as Task;
                                                return (
                                                    <div
                                                        key={t.id}
                                                        onClick={() => onTaskClick(t)}
                                                        className="bg-slate-50 border border-slate-200 p-2 rounded-lg group/task cursor-pointer hover:border-orange-300 hover:shadow-md transition-all active:scale-95"
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="flex items-center gap-1">
                                                                <div className="bg-slate-200 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                                                                    {index + 1}
                                                                </div>
                                                                <span className="text-[9px] font-bold bg-white border border-slate-100 px-1 rounded text-slate-500">#{t.orderNumber}</span>
                                                            </div>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${t.status === TaskStatus.GAS_OPENED ? 'bg-red-500' : 'bg-blue-500'}`} />
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-700 mb-1">{t.title}</div>
                                                        <div className="text-[9px] text-slate-500 truncate">{t.district}</div>
                                                    </div>
                                                );
                                            }
                                        })}

                                        {day.items.length === 0 && (
                                            <div className="h-20 flex items-center justify-center opacity-30">
                                                <div className="w-1 h-1 bg-slate-400 rounded-full mx-0.5" />
                                                <div className="w-1 h-1 bg-slate-400 rounded-full mx-0.5" />
                                                <div className="w-1 h-1 bg-slate-400 rounded-full mx-0.5" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        // --- SUMMARY VIEW (DEFAULT) ---
        return (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {staffStats.map((staff, idx) => {
                        const totalWork = staff.activeTasks.length + staff.activeRoutine.length;
                        return (
                            <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 group hover:shadow-xl hover:border-orange-200 transition-all duration-300 flex flex-col h-full relative overflow-hidden">

                                {/* Staff Header */}
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${totalWork > 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {staff.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg leading-tight">{staff.name}</h3>

                                            {/* Last Seen Indicator */}
                                            {(function () {
                                                const lastSeen = userPresence[staff.email.toLowerCase()] || null;
                                                const status = formatLastSeen(lastSeen);
                                                return (
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${status.text === 'Çevrimiçi' ? 'bg-green-500 animate-pulse' : (status.color?.includes('yellow') ? 'bg-yellow-500' : 'bg-slate-300')}`} />
                                                        <span className={`text-[10px] font-bold ${status.color}`}>
                                                            {status.text}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-3xl font-black text-slate-800">{totalWork}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bugün</span>
                                    </div>
                                </div>

                                {/* Task List (Today Only) */}
                                <div className="flex-1 space-y-3 relative z-10 min-h-[100px]">
                                    {totalWork === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-sm gap-2">
                                            <AlertCircle className="w-8 h-8 opacity-20" />
                                            <span>Bugünlük aktif görev yok</span>
                                        </div>
                                    ) : (
                                        <>
                                            <>
                                                <div className="space-y-2">
                                                    {/* Unified List */}
                                                    {[
                                                        ...staff.activeRoutine.map(t => ({ type: 'routine' as const, data: t, dailyOrder: t.dailyOrder || 0 })),
                                                        ...staff.activeTasks.map(t => ({ type: 'main' as const, data: t, dailyOrder: t.dailyOrder || 0 }))
                                                    ].sort((a, b) => {
                                                        const orderA = a.dailyOrder || 0;
                                                        const orderB = b.dailyOrder || 0;
                                                        if (orderA === 0 && orderB === 0) {
                                                            if (a.type === b.type) return 0;
                                                            return a.type === 'routine' ? -1 : 1;
                                                        }
                                                        return orderA - orderB;
                                                    }).map((item, index) => {
                                                        if (item.type === 'routine') {
                                                            const t = item.data as RoutineTask;
                                                            return (
                                                                <div key={t.id} className="bg-purple-50 border border-purple-100 p-2.5 rounded-xl flex flex-row gap-2 hover:bg-purple-100 transition-colors group/item">
                                                                    <div className="mt-0.5 bg-slate-700/10 text-slate-500 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                                                                        {index + 1}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => onToggleRoutineTask(t.id, t.isCompleted)}
                                                                        className="mt-0.5 w-5 h-5 rounded border border-purple-300 bg-white flex items-center justify-center hover:bg-purple-500 hover:border-purple-500 hover:text-white transition-colors shrink-0"
                                                                        title="Tamamlandı İşaretle"
                                                                    >
                                                                        <CheckCircle2 className="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-100" />
                                                                    </button>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-start">
                                                                            <span className="font-bold text-xs text-purple-900 line-clamp-1">{t.customerName || 'İsimsiz Müşteri'}</span>
                                                                            {t.district && <span className="text-[9px] bg-white/50 px-1.5 py-0.5 rounded text-purple-700 font-bold">{t.district}</span>}
                                                                        </div>
                                                                        <p className="text-[10px] text-purple-800/80 line-clamp-1">{t.content}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        } else {
                                                            const t = item.data as Task;
                                                            return (
                                                                <div
                                                                    key={t.id}
                                                                    onClick={() => onTaskClick(t)}
                                                                    className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm hover:border-orange-300 transition-colors group/task flex flex-col gap-2 cursor-pointer hover:shadow-md active:scale-95"
                                                                >
                                                                    <div>
                                                                        <div className="flex justify-between items-start mb-1">
                                                                            <div className="flex items-center gap-1">
                                                                                <div className="bg-slate-100 text-slate-500 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                                                                                    {index + 1}
                                                                                </div>
                                                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 rounded">#{t.orderNumber}</span>
                                                                                <span className="text-xs font-bold text-slate-700">{t.title}</span>
                                                                            </div>
                                                                            <div className={`w-2 h-2 rounded-full ${t.status === TaskStatus.GAS_OPENED ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                                                                        </div>
                                                                        <div className="flex items-center justify-between text-[10px]">
                                                                            <span className="text-slate-500">{StatusLabels[t.status]}</span>
                                                                            {t.district && <span className="font-medium text-slate-400">{t.district}</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    })}
                                                </div>
                                            </>
                                        </>
                                    )}
                                </div>

                                {/* Action Footer */}
                                <div className="mt-4 pt-3 border-t border-slate-100 relative z-10">
                                    <button
                                        onClick={() => setSelectedStaffEmail(staff.email)}
                                        className="w-full text-xs font-bold text-slate-400 hover:text-orange-600 transition-colors flex items-center justify-center gap-1 py-1"
                                    >
                                        Detaylı İncele <BarChart3 className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Decorative Background Blob */}
                                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0" />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-red-500 to-purple-600" />

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="bg-orange-100 p-3 rounded-2xl shadow-inner">
                            <Users className="w-8 h-8 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">SAHADAKİ PERSONEL</h2>
                            <p className="text-slate-500 font-medium mt-1">Anlık İş Yükü ve Görev Dağılımı</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {!selectedStaffEmail && (
                            <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 animate-in fade-in">
                                <Clock className="w-5 h-5 text-slate-400" />
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">BUGÜNKÜ AKTİF İŞ</span>
                                    <span className="text-xl font-black text-slate-800 leading-none">{totalActive}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-3 rounded-full transition-all hover:rotate-90"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {renderContent()}

            </div>
        </div>
    );
};

export default FieldStaffStatusModal;
