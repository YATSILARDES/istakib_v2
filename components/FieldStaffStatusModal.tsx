import React, { useMemo, useState, useEffect } from 'react';
import { Task, RoutineTask, StaffMember, TaskStatus, StatusLabels } from '../types';
import {
    X,
    Users,
    User,
    BarChart3,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Phone,
    Search,
    Calendar,
    Filter,
    CheckSquare,
    Square
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../src/firebase';

interface FieldStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    routineTasks: RoutineTask[];
    staffList: StaffMember[];
    onUpdateTask: (taskId: string, newStatus: TaskStatus) => void;
    onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
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
    onTaskUpdate,
    onToggleRoutineTask,
    onTaskClick
}) => {
    const [selectedStaffEmail, setSelectedStaffEmail] = useState<string | null>(null);
    const [userPresence, setUserPresence] = useState<Record<string, any>>({});

    // Mobile Navigation States
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    const [mobileSelectedStaffName, setMobileSelectedStaffName] = useState<string | null>(null);
    const [mobileSearchTerm, setMobileSearchTerm] = useState('');
    const [mobileTabFilter, setMobileTabFilter] = useState<'all' | 'main' | 'routine'>('all');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Reset mobile state on close
    useEffect(() => {
        if (!isOpen) {
            setMobileSelectedStaffName(null);
            setMobileSearchTerm('');
            setMobileTabFilter('all');
            setSelectedStaffEmail(null);
        }
    }, [isOpen]);

    // Status badge style helper
    const getStatusBadge = (status: TaskStatus) => {
        switch (status) {
            case TaskStatus.PROJECT_TO_BE_DRAWN:
                return { label: 'Projesi Çizilecek', bg: 'bg-orange-50', text: 'text-[#e65100]', border: 'border-orange-200', stripe: 'bg-orange-500' };
            case TaskStatus.SERVICE_DIRECTED:
                return { label: 'Servis Yönlendirildi', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', stripe: 'bg-blue-500' };
            case TaskStatus.COMBI_REPLACEMENT_RENOVATION:
                return { label: 'Kombi Değişimi', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', stripe: 'bg-indigo-500' };
            case TaskStatus.TO_CHECK:
                return { label: 'Kontrol Yapılacak', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', stripe: 'bg-amber-500' };
            case TaskStatus.CHECK_COMPLETED:
                return { label: 'Kontrol Yapıldı', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', stripe: 'bg-teal-500' };
            case TaskStatus.GAS_OPENED:
                return { label: 'Gazı Açıldı', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', stripe: 'bg-rose-500' };
            case TaskStatus.DEPOSIT_PAID:
                return { label: 'Kapora / Avans', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', stripe: 'bg-purple-500' };
            default:
                return { label: StatusLabels[status] || status, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', stripe: 'bg-slate-400' };
        }
    };

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
                    // 3. ALLOW if it is reassigned for check
                    const isTaskActive = !(t.status === TaskStatus.CHECK_COMPLETED && !t.isReassignedForCheck) && !(t.checkStatus && !t.isReassignedForCheck);
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

    // --- Mobile Specific Data & Calculations ---
    const mobileSelectedStaffObj = useMemo(() => {
        if (!mobileSelectedStaffName) return null;
        return staffList.find(s => s.name === mobileSelectedStaffName) || { name: mobileSelectedStaffName, email: '', phone: '' };
    }, [mobileSelectedStaffName, staffList]);

    const mobileStaffPresence = useMemo(() => {
        if (!mobileSelectedStaffObj?.email) return { text: 'Çevrimdışı', color: 'text-slate-400', isOnline: false };
        const p = formatLastSeen(userPresence[mobileSelectedStaffObj.email.toLowerCase()]);
        return { ...p, isOnline: p.text === 'Çevrimiçi' };
    }, [mobileSelectedStaffObj, userPresence]);

    const mobileSelectedStaffTasks = useMemo(() => {
        if (!mobileSelectedStaffName) return { main: [], routine: [], total: 0 };
        const sName = mobileSelectedStaffName;
        const sEmail = (mobileSelectedStaffObj?.email || '').toLowerCase();

        const main = tasks.filter(t => {
            const isTaskActive = !(t.status === TaskStatus.CHECK_COMPLETED && !t.isReassignedForCheck) && !(t.checkStatus && !t.isReassignedForCheck);
            const matchesAssignee = t.assignee === sName || (t.assigneeEmail && t.assigneeEmail.toLowerCase() === sEmail);
            return isTaskActive && matchesAssignee;
        }).sort((a, b) => {
            const dateA = getEffectiveDate(a).getTime();
            const dateB = getEffectiveDate(b).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return (a.dailyOrder || 0) - (b.dailyOrder || 0);
        });

        const routine = routineTasks.filter(t => {
            const matchesAssignee = t.assignee === sName || (t.assigneeEmail && t.assigneeEmail.toLowerCase() === sEmail);
            return !t.isCompleted && matchesAssignee;
        }).sort((a, b) => {
            const dateA = getEffectiveDate(a).getTime();
            const dateB = getEffectiveDate(b).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return (a.dailyOrder || 0) - (b.dailyOrder || 0);
        });

        return { main, routine, total: main.length + routine.length };
    }, [mobileSelectedStaffName, mobileSelectedStaffObj, tasks, routineTasks]);

    const filteredMobileTasks = useMemo(() => {
        if (!mobileSelectedStaffName) return { main: [], routine: [] };
        const q = mobileSearchTerm.trim().toLocaleLowerCase('tr-TR');

        let main = mobileSelectedStaffTasks.main;
        let routine = mobileSelectedStaffTasks.routine;

        if (mobileTabFilter === 'main') {
            routine = [];
        } else if (mobileTabFilter === 'routine') {
            main = [];
        }

        if (q) {
            main = main.filter(t =>
                (t.title && t.title.toLocaleLowerCase('tr-TR').includes(q)) ||
                (t.orderNumber && String(t.orderNumber).includes(q)) ||
                (t.district && t.district.toLocaleLowerCase('tr-TR').includes(q)) ||
                (t.address && t.address.toLocaleLowerCase('tr-TR').includes(q)) ||
                (t.phone && t.phone.includes(q)) ||
                (t.description && t.description.toLocaleLowerCase('tr-TR').includes(q))
            );

            routine = routine.filter(t =>
                (t.customerName && t.customerName.toLocaleLowerCase('tr-TR').includes(q)) ||
                (t.content && t.content.toLocaleLowerCase('tr-TR').includes(q))
            );
        }

        return { main, routine };
    }, [mobileSelectedStaffTasks, mobileTabFilter, mobileSearchTerm, mobileSelectedStaffName]);

    const mobileStaffList = useMemo(() => {
        const list = staffStats.map(stat => {
            const p = formatLastSeen(userPresence[stat.email.toLowerCase()]);
            const sEmail = stat.email.toLowerCase();
            const totalMain = tasks.filter(t => {
                const isTaskActive = !(t.status === TaskStatus.CHECK_COMPLETED && !t.isReassignedForCheck) && !(t.checkStatus && !t.isReassignedForCheck);
                return (t.assignee === stat.name || (t.assigneeEmail && t.assigneeEmail.toLowerCase() === sEmail)) && isTaskActive;
            }).length;
            const totalRoutine = routineTasks.filter(t => {
                return (t.assignee === stat.name || (t.assigneeEmail && t.assigneeEmail.toLowerCase() === sEmail)) && !t.isCompleted;
            }).length;

            return {
                ...stat,
                presence: p,
                totalWork: totalMain + totalRoutine,
                todayWork: stat.activeTasks.length + stat.activeRoutine.length
            };
        });

        if (!mobileSearchTerm.trim()) return list;
        const q = mobileSearchTerm.trim().toLocaleLowerCase('tr-TR');
        return list.filter(s =>
            s.name.toLocaleLowerCase('tr-TR').includes(q) ||
            s.email.toLocaleLowerCase('tr-TR').includes(q)
        );
    }, [staffStats, userPresence, tasks, routineTasks, mobileSearchTerm]);

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
                    // 4. ALLOW if it is reassigned for check
                    const isTaskActive = !(t.status === TaskStatus.CHECK_COMPLETED && !t.isReassignedForCheck) && !(t.checkStatus && !t.isReassignedForCheck);
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
                    // 1. Sort by full time (includes AssignmentView hours)
                    const getTime = (item: any) => {
                        if (!item.date) return 0;
                        return new Date(item.date.seconds ? item.date.seconds * 1000 : item.date).getTime();
                    };
                    const timeA = getTime(a);
                    const timeB = getTime(b);

                    if (timeA !== timeB) {
                        return timeA - timeB;
                    }

                    // 2. Fallback to dailyOrder
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
                                                            <div className="flex items-center gap-2">
                                                                {t.isReassignedForCheck && onTaskUpdate && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onTaskUpdate(t.id, { isReassignedForCheck: false });
                                                                        }}
                                                                        className="w-5 h-5 rounded border border-emerald-300 bg-white flex items-center justify-center hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-colors"
                                                                        title="Kontrolü Onayla"
                                                                    >
                                                                        <CheckCircle2 className="w-3.5 h-3.5 opacity-0 group-hover/task:opacity-100" />
                                                                    </button>
                                                                )}
                                                                <div className={`w-1.5 h-1.5 rounded-full ${t.status === TaskStatus.GAS_OPENED ? 'bg-red-500' : 'bg-blue-500'}`} />
                                                            </div>
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
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${totalWork > 0 ? 'bg-gradient-to-br from-[#f57c00] to-[#e65100] text-white' : 'bg-slate-100 text-slate-400'}`}>
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
                                                        const getTime = (item: any) => {
                                                            let date = item.type === 'routine' ? (item.data.scheduledDate || item.data.createdAt) : item.data.scheduledDate;
                                                            if (!date) return 0;
                                                            return new Date(date.seconds ? date.seconds * 1000 : date).getTime();
                                                        };
                                                        const timeA = getTime(a);
                                                        const timeB = getTime(b);

                                                        if (timeA !== timeB) return timeA - timeB;

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
                                                                            <div className="flex items-center gap-2">
                                                                                {t.isReassignedForCheck && onTaskUpdate && (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            onTaskUpdate(t.id, { isReassignedForCheck: false });
                                                                                        }}
                                                                                        className="w-5 h-5 rounded border border-emerald-300 bg-white flex items-center justify-center hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-colors"
                                                                                        title="Kontrolü Onayla"
                                                                                    >
                                                                                        <CheckCircle2 className="w-3.5 h-3.5 opacity-0 group-hover/task:opacity-100" />
                                                                                    </button>
                                                                                )}
                                                                                <div className={`w-2 h-2 rounded-full ${t.status === TaskStatus.GAS_OPENED ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                                                                            </div>
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

    // =========================================================================
    // MOBILE ERP RENDERING (DIA-STYLE CORPORATE WARM ORANGE THEME)
    // =========================================================================
    if (isMobile) {
        if (mobileSelectedStaffName) {
            // -----------------------------------------------------------------
            // LEVEL 2: SEÇİLEN PERSONELİN İŞ LİSTESİ
            // -----------------------------------------------------------------
            return (
                <div className="fixed inset-0 z-[100] bg-[#f1f5f9] flex flex-col font-sans overflow-hidden animate-in fade-in duration-200">
                    {/* Top Orange Header Bar */}
                    <div className="bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00] text-white p-3 shadow-md flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <button
                                onClick={() => {
                                    setMobileSelectedStaffName(null);
                                    setMobileSearchTerm('');
                                    setMobileTabFilter('all');
                                }}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition-all shadow-xs shrink-0"
                                title="Geri Dön"
                            >
                                <ChevronLeft className="w-5 h-5 text-white" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-base font-bold tracking-wide text-white truncate">
                                    {mobileSelectedStaffName}
                                </h1>
                                <p className="text-[11px] text-orange-100 font-medium truncate flex items-center gap-1.5">
                                    <span>{mobileSelectedStaffTasks.total} Aktif Görev</span>
                                    <span>•</span>
                                    <span className={mobileStaffPresence.color}>{mobileStaffPresence.text}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {(mobileSelectedStaffObj as any)?.phone && (
                                <a
                                    href={`tel:${(mobileSelectedStaffObj as any).phone}`}
                                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs"
                                    title="Personeli Ara"
                                >
                                    <Phone className="w-4 h-4" />
                                </a>
                            )}
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs"
                                title="Kapat"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Search Row */}
                    <div className="bg-white px-3 py-2 border-b border-slate-200 flex items-center gap-2 shrink-0 z-10 shadow-xs">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Müşteri, iş no veya adres ara..."
                                value={mobileSearchTerm}
                                onChange={(e) => setMobileSearchTerm(e.target.value)}
                                className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                            />
                            {mobileSearchTerm && (
                                <button
                                    onClick={() => setMobileSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sub-Toolbar (Dark Slate #1e293b) */}
                    <div className="bg-[#1e293b] text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                            <button
                                onClick={() => setMobileTabFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                    mobileTabFilter === 'all'
                                        ? 'bg-orange-500 text-white shadow-xs'
                                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                                }`}
                            >
                                Tümü ({mobileSelectedStaffTasks.total})
                            </button>
                            <button
                                onClick={() => setMobileTabFilter('main')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                    mobileTabFilter === 'main'
                                        ? 'bg-orange-500 text-white shadow-xs'
                                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                                }`}
                            >
                                İşler ({mobileSelectedStaffTasks.main.length})
                            </button>
                            <button
                                onClick={() => setMobileTabFilter('routine')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                    mobileTabFilter === 'routine'
                                        ? 'bg-orange-500 text-white shadow-xs'
                                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                                }`}
                            >
                                Eksikler ({mobileSelectedStaffTasks.routine.length})
                            </button>
                        </div>

                        <span className="text-[11px] font-semibold text-slate-300 shrink-0 ml-2">
                            {filteredMobileTasks.main.length + filteredMobileTasks.routine.length} Kayıt
                        </span>
                    </div>

                    {/* Task List Content */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                        {filteredMobileTasks.main.length === 0 && filteredMobileTasks.routine.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 mt-4 shadow-xs">
                                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <p className="font-bold text-sm text-slate-600">Görev Bulunamadı</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {mobileSearchTerm ? 'Arama kriterinize uygun iş bulunamadı.' : 'Bu personele atanmış aktif bir görev bulunmuyor.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Main Tasks */}
                                {filteredMobileTasks.main.map((t, idx) => {
                                    const badge = getStatusBadge(t.status);
                                    const taskDate = getTaskDate(t);
                                    const isTaskToday = isToday(taskDate);
                                    const isTaskOverdue = isOverdue(taskDate);

                                    return (
                                        <div
                                            key={t.id || idx}
                                            onClick={() => onTaskClick(t)}
                                            className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs hover:border-orange-200 active:scale-[0.99] transition-all relative overflow-hidden cursor-pointer"
                                        >
                                            {/* Left Status Stripe */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${badge.stripe}`} />

                                            {/* Top Badge Row */}
                                            <div className="flex items-center justify-between gap-2 pl-2 mb-2">
                                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                                        #{t.orderNumber}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {isTaskToday ? (
                                                        <span className="text-[10px] font-black text-[#e65100] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                                                            Bugün
                                                        </span>
                                                    ) : isTaskOverdue ? (
                                                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                                            Gecikmiş
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                                            {safeFormatDate(taskDate)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Customer / Job Title */}
                                            <div className="pl-2">
                                                <h3 className="font-black text-slate-800 text-sm leading-snug">
                                                    {t.title}
                                                </h3>

                                                {/* District & Address */}
                                                {(t.district || t.address) && (
                                                    <div className="flex items-start gap-1.5 mt-1 text-slate-500 text-xs">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                        <span className="line-clamp-2">
                                                            {t.district && <strong className="text-slate-700 mr-1">{t.district}</strong>}
                                                            {t.address}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Phone & Actions Bar */}
                                                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                                                    {t.phone ? (
                                                        <a
                                                            href={`tel:${t.phone}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 active:scale-95 transition-all"
                                                        >
                                                            <Phone className="w-3 h-3" />
                                                            <span>{t.phone}</span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400 italic">Telefon yok</span>
                                                    )}

                                                    {/* Reassigned for check action */}
                                                    {t.isReassignedForCheck && onTaskUpdate && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onTaskUpdate(t.id, { isReassignedForCheck: false });
                                                            }}
                                                            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span>Kontrolü Onayla</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Routine Tasks */}
                                {filteredMobileTasks.routine.map((rt, idx) => {
                                    const rtDate = getTaskDate(rt);
                                    return (
                                        <div
                                            key={rt.id || idx}
                                            className="bg-amber-50/50 rounded-2xl border border-amber-200/80 p-3.5 shadow-xs relative overflow-hidden"
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
                                            <div className="pl-2 flex items-start gap-3">
                                                <button
                                                    onClick={() => onToggleRoutineTask(rt.id, rt.isCompleted)}
                                                    className="mt-0.5 w-6 h-6 rounded-lg border-2 border-amber-500 bg-white flex items-center justify-center text-amber-600 active:scale-90 transition-all shrink-0 hover:bg-amber-50"
                                                    title="Tamamla"
                                                >
                                                    <Square className="w-4 h-4" />
                                                </button>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className="font-bold text-amber-950 text-xs truncate">
                                                            {rt.customerName || 'Eksik / Rutin Not'}
                                                        </h4>
                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                                                            {safeFormatDate(rtDate)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                                                        {rt.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            );
        }

        // ---------------------------------------------------------------------
        // LEVEL 1: SAHADAKİ PERSONEL LİSTESİ
        // ---------------------------------------------------------------------
        return (
            <div className="fixed inset-0 z-[100] bg-[#f1f5f9] flex flex-col font-sans overflow-hidden animate-in fade-in duration-200">
                {/* Top Orange Header Bar */}
                <div className="bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00] text-white p-3 shadow-md flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition-all shadow-xs"
                            title="Geri Dön"
                        >
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        <div>
                            <h1 className="text-base font-bold tracking-wide">SAHADAKİ PERSONEL</h1>
                            <p className="text-[11px] text-orange-100 font-medium">
                                Toplam {staffList.length} Personel • {totalActive} Aktif İş
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs"
                        title="Kapat"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search Row */}
                <div className="bg-white px-3 py-2 border-b border-slate-200 flex items-center gap-2 shrink-0 z-10 shadow-xs">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Personel ara..."
                            value={mobileSearchTerm}
                            onChange={(e) => setMobileSearchTerm(e.target.value)}
                            className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                        />
                        {mobileSearchTerm && (
                            <button
                                onClick={() => setMobileSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub-Toolbar Row (Dark Slate #1e293b) */}
                <div className="bg-[#1e293b] text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-300">
                        PERSONEL LİSTESİ ({mobileStaffList.length})
                    </span>
                    <span className="text-[11px] font-bold text-orange-400">
                        BUGÜNKÜ AKTİF: {totalActive}
                    </span>
                </div>

                {/* Staff Cards List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {mobileStaffList.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 mt-4 shadow-xs">
                            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="font-bold text-sm text-slate-600">Personel Bulunamadı</p>
                            <p className="text-xs text-slate-400 mt-1">Arama kriterinize uygun personel bulunamadı.</p>
                        </div>
                    ) : (
                        mobileStaffList.map((stat, idx) => {
                            const initials = stat.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                            const isOnline = stat.presence.text === 'Çevrimiçi';

                            return (
                                <div
                                    key={stat.email || stat.name || idx}
                                    onClick={() => {
                                        setMobileSelectedStaffName(stat.name);
                                        setMobileSearchTerm('');
                                        setMobileTabFilter('all');
                                    }}
                                    className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs hover:border-orange-300 active:scale-[0.99] transition-all flex items-center justify-between gap-3 cursor-pointer"
                                >
                                    {/* Left: Avatar + Details */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Avatar */}
                                        <div className="relative shrink-0">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f57c00] to-[#e65100] text-white font-black text-sm flex items-center justify-center shadow-md">
                                                {initials}
                                            </div>
                                            <span
                                                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                                    isOnline
                                                        ? 'bg-emerald-500 ring-1 ring-emerald-300'
                                                        : stat.presence.text.includes('dk')
                                                        ? 'bg-amber-500 ring-1 ring-amber-300'
                                                        : 'bg-slate-300'
                                                }`}
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-800 text-sm truncate">
                                                {stat.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                                                <span className={`font-semibold text-[11px] ${stat.presence.color}`}>
                                                    • {stat.presence.text}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                {stat.todayWork > 0 ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-[#e65100] border border-orange-200">
                                                        {stat.todayWork} Bugün
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                                        Bugün iş yok
                                                    </span>
                                                )}
                                                {stat.totalWork > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                                        {stat.totalWork} Toplam
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Total Badge + Chevron */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-orange-50 text-[#e65100] border border-orange-200 shadow-2xs">
                                            {stat.totalWork} İş
                                        </span>
                                        <ChevronRight className="w-5 h-5 text-orange-500" />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00]" />

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
