import React, { useMemo } from 'react';
import { Task, RoutineTask, StaffMember, TaskStatus, StatusLabels } from '../types';
import { X, User, Users, Phone, MapPin, Search, BarChart3, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface FieldStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    routineTasks: RoutineTask[];
    staffList: StaffMember[];
    onUpdateTask: (taskId: string, newStatus: TaskStatus) => void;
    onToggleRoutineTask: (taskId: string, currentStatus: boolean) => void;
}

const FieldStaffStatusModal: React.FC<FieldStaffModalProps> = ({
    isOpen,
    onClose,
    tasks,
    routineTasks,
    staffList,
    onUpdateTask,
    onToggleRoutineTask
}) => {
    const [selectedStaffEmail, setSelectedStaffEmail] = React.useState<string | null>(null);

    if (!isOpen) return null;

    // --- Date Helpers ---
    const getTaskDate = (t: any) => {
        if (t.scheduledDate) return new Date(t.scheduledDate.seconds * 1000);
        if (t.createdAt) return new Date(t.createdAt.seconds * 1000);
        return new Date(); // Fallback to today
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Checks if date is strictly before today (ignoring time)
    const isOverdue = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    // Rollover Logic: Effective date is Today if task is Overdue
    const getEffectiveDate = (t: any) => {
        const d = getTaskDate(t);
        if (isOverdue(d) && !t.isCompleted && t.status !== TaskStatus.CHECK_COMPLETED && t.status !== TaskStatus.DEPOSIT_PAID) {
            return new Date(); // Treat as Today
        }
        return d;
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

        staffList.forEach(s => {
            statsMap.set(s.name, {
                name: s.name,
                email: s.email,
                activeTasks: [],
                activeRoutine: [],
                completedCount: 0
            });
        });

        // Add Active Main Tasks (Today + Overdue ONLY)
        tasks.forEach(t => {
            const isTaskActive = t.status !== TaskStatus.CHECK_COMPLETED && t.status !== TaskStatus.DEPOSIT_PAID;
            if (t.assignee && isTaskActive) {
                const date = getTaskDate(t);
                // IF Today OR Overdue -> Show in Summary
                if (isToday(date) || isOverdue(date)) {
                    if (!statsMap.has(t.assignee)) {
                        statsMap.set(t.assignee, { name: t.assignee, email: t.assigneeEmail || '', activeTasks: [], activeRoutine: [], completedCount: 0 });
                    }
                    statsMap.get(t.assignee)!.activeTasks.push(t);
                }
            }
        });

        // Add Active Routine Tasks (Today + Overdue ONLY)
        routineTasks.forEach(t => {
            if (t.assignee && !t.isCompleted) {
                const date = getTaskDate(t);
                if (isToday(date) || isOverdue(date)) {
                    if (!statsMap.has(t.assignee)) {
                        statsMap.set(t.assignee, { name: t.assignee, email: t.assigneeEmail || '', activeTasks: [], activeRoutine: [], completedCount: 0 });
                    }
                    statsMap.get(t.assignee)!.activeRoutine.push(t);
                }
            }
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
                label: d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'numeric' }),
                isToday: isToday(d),
                tasks: [] as Task[],
                routine: [] as RoutineTask[]
            });
        }

        // Filter all tasks for this staff
        // We use "Effective Date" logic: Overdue tasks move to Today's column
        const staffName = staffList.find(s => s.email === staffEmail)?.name || '';

        tasks.forEach(t => {
            const isTaskActive = t.status !== TaskStatus.CHECK_COMPLETED && t.status !== TaskStatus.DEPOSIT_PAID;
            if ((t.assigneeEmail === staffEmail || t.assignee === staffName) && isTaskActive) {
                const effDate = getEffectiveDate(t);
                const dayObj = days.find(day => day.date.getDate() === effDate.getDate() && day.date.getMonth() === effDate.getMonth());
                if (dayObj) dayObj.tasks.push(t);
            }
        });

        routineTasks.forEach(t => {
            if ((t.assigneeEmail === staffEmail || t.assignee === staffName) && !t.isCompleted) {
                const effDate = getEffectiveDate(t);
                const dayObj = days.find(day => day.date.getDate() === effDate.getDate() && day.date.getMonth() === effDate.getMonth());
                if (dayObj) dayObj.routine.push(t);
            }
        });

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
                            <p className="text-slate-500 text-sm font-medium">Bu Haftaki Görev Dağılımı (Kalanlar Sonraki Güne Devreder)</p>
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
                                        {/* Routine Tasks */}
                                        {day.routine.map(t => (
                                            <div key={t.id} className="bg-purple-50 border border-purple-100 p-2 rounded-lg group/item">
                                                <div className="flex gap-2">
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
                                        ))}

                                        {/* Main Tasks */}
                                        {day.tasks.map(t => (
                                            <div key={t.id} className="bg-slate-50 border border-slate-200 p-2 rounded-lg group/task">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[9px] font-bold bg-white border border-slate-100 px-1 rounded text-slate-500">#{t.orderNumber}</span>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${t.status === TaskStatus.GAS_OPENED ? 'bg-red-500' : 'bg-blue-500'}`} />
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-700 mb-1">{t.title}</div>
                                                <div className="text-[9px] text-slate-500 mb-2 truncate">{t.district}</div>

                                                <button
                                                    onClick={() => onUpdateTask(t.id, TaskStatus.CHECK_COMPLETED)}
                                                    className="w-full py-1 bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-100 hover:border-emerald-200 rounded text-[9px] font-bold transition-all flex items-center justify-center opacity-0 group-hover/task:opacity-100"
                                                >
                                                    Bitir
                                                </button>
                                            </div>
                                        ))}

                                        {day.routine.length === 0 && day.tasks.length === 0 && (
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
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${totalWork > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                {totalWork > 0 ? 'Sahada / Aktif' : 'Boşta'}
                                            </span>
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
                                            {/* Routine Tasks Section */}
                                            {staff.activeRoutine.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1">
                                                        <div className="w-1 h-1 bg-purple-400 rounded-full" /> Eksikler ({staff.activeRoutine.length})
                                                    </div>
                                                    {staff.activeRoutine.map(t => (
                                                        <div key={t.id} className="bg-purple-50 border border-purple-100 p-2.5 rounded-xl flex flex-row gap-2 hover:bg-purple-100 transition-colors group/item">
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
                                                    ))}
                                                </div>
                                            )}

                                            {/* Main Tasks Section */}
                                            {staff.activeTasks.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1">
                                                        <div className="w-1 h-1 bg-blue-400 rounded-full" /> Ana İşler ({staff.activeTasks.length})
                                                    </div>
                                                    {staff.activeTasks.map(t => (
                                                        <div key={t.id} className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm hover:border-blue-300 transition-colors group/task flex flex-col gap-2">
                                                            <div>
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <div className="flex items-center gap-1">
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

                                                            <button
                                                                onClick={() => onUpdateTask(t.id, TaskStatus.CHECK_COMPLETED)}
                                                                className="w-full py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-100 hover:border-emerald-200 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 opacity-0 group-hover/task:opacity-100"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" /> Kontrol Edildi (Bitir)
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
```
