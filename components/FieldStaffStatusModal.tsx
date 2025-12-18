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
    if (!isOpen) return null;

    // --- Statistics Calculation ---
    const staffStats = useMemo(() => {
        // Create a map for all staff in the list plus any assignee found in tasks
        const statsMap = new Map<string, {
            name: string;
            email: string;
            activeTasks: Task[];
            activeRoutine: RoutineTask[];
            completedCount: number;
        }>();

        // Initialize with known staff list
        staffList.forEach(s => {
            statsMap.set(s.name, {
                name: s.name,
                email: s.email,
                activeTasks: [],
                activeRoutine: [],
                completedCount: 0
            });
        });

        // Process Tasks
        tasks.forEach(t => {
            // Filter: Must be assigned AND NOT Completed (Check Completed or Deposit Paid)
            const isTaskActive = t.status !== TaskStatus.CHECK_COMPLETED && t.status !== TaskStatus.DEPOSIT_PAID;

            if (t.assignee && isTaskActive) {
                if (!statsMap.has(t.assignee)) {
                    statsMap.set(t.assignee, { name: t.assignee, email: t.assigneeEmail || '', activeTasks: [], activeRoutine: [], completedCount: 0 });
                }
                const entry = statsMap.get(t.assignee)!;
                // Consider active if not fully archived/completed? Or just currently assigned?
                // Visualizing "Active" work. 
                entry.activeTasks.push(t);
            }
        });

        // Process Routine Tasks
        routineTasks.forEach(t => {
            if (t.assignee && !t.isCompleted) {
                if (!statsMap.has(t.assignee)) {
                    statsMap.set(t.assignee, { name: t.assignee, email: t.assigneeEmail || '', activeTasks: [], activeRoutine: [], completedCount: 0 });
                }
                const entry = statsMap.get(t.assignee)!;
                entry.activeRoutine.push(t);
            }
        });

        return Array.from(statsMap.values()).sort((a, b) => {
            const totalA = a.activeTasks.length + a.activeRoutine.length;
            const totalB = b.activeTasks.length + b.activeRoutine.length;
            return totalB - totalA; // Sort by workload desc
        });
    }, [tasks, routineTasks, staffList]);

    const totalActive = staffStats.reduce((acc, s) => acc + s.activeTasks.length + s.activeRoutine.length, 0);

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
                        <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                            <Clock className="w-5 h-5 text-slate-400" />
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TOPLAM AKTİF İŞ</span>
                                <span className="text-xl font-black text-slate-800 leading-none">{totalActive}</span>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-3 rounded-full transition-all hover:rotate-90"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
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
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Görev</span>
                                        </div>
                                    </div>

                                    {/* Task List */}
                                    <div className="flex-1 space-y-3 relative z-10 min-h-[100px]">
                                        {totalWork === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-sm gap-2">
                                                <AlertCircle className="w-8 h-8 opacity-20" />
                                                <span>Aktif görev yok</span>
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
                                        <button className="w-full text-xs font-bold text-slate-400 hover:text-orange-600 transition-colors flex items-center justify-center gap-1 py-1">
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
            </div>
        </div>
    );
};

export default FieldStaffStatusModal;
