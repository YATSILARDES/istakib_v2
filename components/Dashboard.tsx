
import React, { useState } from 'react';
import { Task, TaskStatus, StatusLabels, StaffMember, RoutineTask, UserPermission } from '@/types';
import { ChevronRight, Home, Activity, Clock, Plus, Users, Bell, Map as MapIcon, MoreHorizontal } from 'lucide-react';
import PersonalNotes from './PersonalNotes';
import CalendarWidget from './CalendarWidget';
// import InteractiveMap from './InteractiveMap'; // Later integration

interface DashboardProps {
    tasks: Task[];
    routineTasks: RoutineTask[];
    // staffList removed
    onNavigate: (status?: TaskStatus) => void;
    onTaskClick: (task: Task) => void;
    onFilterMissing: () => void;
    onOpenRoutineModal: () => void;
    onOpenAssignmentModal: () => void;
    onOpenNewCustomerModal: () => void;
    onOpenFieldStaffModal: () => void;
    currentUser?: { name: string; email: string };
    userRole?: 'admin' | 'staff' | 'manager';
    userPermissions?: UserPermission;
}

const Dashboard: React.FC<DashboardProps> = ({
    tasks,
    routineTasks,
    // staffList removed
    onNavigate,
    onTaskClick,
    onFilterMissing,
    onOpenRoutineModal,
    onOpenAssignmentModal,
    onOpenNewCustomerModal,
    onOpenFieldStaffModal,
    currentUser,
    userRole,
    userPermissions
}) => {
    const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    // --- İstatistik Hesaplamaları ---
    const getCount = (status: TaskStatus) => tasks.filter(t => t.status === status).length;

    // Helper for My Tasks Count
    const getMyActiveTaskCount = () => {
        if (!currentUser) return 0;
        // Count Main Tasks assigned to me
        const myTasks = tasks.filter(t =>
            (t.assignee === currentUser.name || t.assigneeEmail === currentUser.email) &&
            t.status !== TaskStatus.CHECK_COMPLETED &&
            t.status !== TaskStatus.DEPOSIT_PAID
        ).length;
        // Count Routine Tasks assigned to me (uncompleted)
        const myRoutine = routineTasks.filter(t =>
            (t.assignee === currentUser.name || t.assigneeEmail === currentUser.email) &&
            !t.isCompleted
        ).length;
        return myTasks + myRoutine;
    };

    const cards = [
        {
            title: 'KONTROLÜ YAPILACAK İŞLER',
            displayName: StatusLabels[TaskStatus.TO_CHECK],
            score: getCount(TaskStatus.TO_CHECK),
            status: TaskStatus.TO_CHECK,
            color: 'text-amber-500',
            borderColor: 'hover:border-amber-500'
        },
        {
            title: 'KONTROL EDİLDİ',
            displayName: StatusLabels[TaskStatus.CHECK_COMPLETED],
            score: getCount(TaskStatus.CHECK_COMPLETED),
            status: TaskStatus.CHECK_COMPLETED,
            color: 'text-blue-500',
            borderColor: 'hover:border-blue-500'
        },
        {
            title: 'DEPOZİTOSU YATIRILMIŞ İŞLER',
            displayName: StatusLabels[TaskStatus.DEPOSIT_PAID],
            score: getCount(TaskStatus.DEPOSIT_PAID),
            status: TaskStatus.DEPOSIT_PAID,
            color: 'text-indigo-500',
            borderColor: 'hover:border-indigo-500'
        },
        // Role Based Card
        userRole === 'admin' ? {
            title: 'SAHADAKİ PERSONEL',
            displayName: 'SAHADAKİ PERSONEL',
            score: tasks.filter(t => t.assignee).length, // Count all assigned tasks
            action: onOpenFieldStaffModal, // Open Live Modal
            color: 'text-orange-600',
            borderColor: 'hover:border-orange-600',
            status: 'FIELD_STAFF' as any
        } : {
            title: 'ATANAN İŞLERİM',
            displayName: 'ATANAN İŞLERİM',
            score: getMyActiveTaskCount(),
            action: onOpenFieldStaffModal, // Opens same modal, but App.tsx will filter content
            color: 'text-emerald-600',
            borderColor: 'hover:border-emerald-600',
            status: 'MY_TASKS' as any
        },
        {
            title: 'GAZI AÇILAN İŞLER',
            displayName: StatusLabels[TaskStatus.GAS_OPENED],
            score: getCount(TaskStatus.GAS_OPENED),
            status: TaskStatus.GAS_OPENED,
            color: 'text-emerald-500',
            borderColor: 'hover:border-emerald-500'
        },
        {
            title: 'SERVİS YÖNLENDİRİLMESİ YAPILMIŞ İŞLER',
            displayName: StatusLabels[TaskStatus.SERVICE_DIRECTED],
            score: getCount(TaskStatus.SERVICE_DIRECTED),
            status: TaskStatus.SERVICE_DIRECTED,
            color: 'text-purple-500',
            borderColor: 'hover:border-purple-500'
        },
    ];

    // Filtreleme Mantığı (Son Güncellemeler için)
    // Filtreleme Mantığı (Son Güncellemeler için)
    const filteredUpdates = React.useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // 1. Routine Tasks (Check for completedAt or generic createdAt if today)
        const relevantRoutine = routineTasks.filter(t => {
            if (!t.isCompleted) return false;
            // Check completedAt first, fallback to createdAt (but createdAt is creation, not completion)
            // If completedAt is missing, we might assume it's old or check createdAt just in case created&done today.
            const dateRef = t.completedAt?.seconds ? new Date(t.completedAt.seconds * 1000) :
                (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date(t.createdAt));

            const day = new Date(dateRef);
            day.setHours(0, 0, 0, 0);
            return day.getTime() === now.getTime();
        }).map(t => ({ ...t, type: 'routine' }));

        // 2. Field Tasks (GAS_OPENED, SERVICE_DIRECTED, CHECK_COMPLETED)
        // Check updatedAt or createdAt if today
        const relevantTasks = tasks.filter(t => {
            const isFieldDone = (t.status === TaskStatus.GAS_OPENED) ||
                (t.status === TaskStatus.SERVICE_DIRECTED) ||
                (t.status === TaskStatus.CHECK_COMPLETED); // Maybe check completed too?

            if (!isFieldDone) return false;

            const dateRef = t.updatedAt?.seconds ? new Date(t.updatedAt.seconds * 1000) :
                (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date(t.date || ''));

            const day = new Date(dateRef);
            day.setHours(0, 0, 0, 0);
            return day.getTime() === now.getTime();
        }).map(t => ({ ...t, type: 'task' }));

        const combined = [...relevantRoutine, ...relevantTasks];

        // Apply Time Filter (Daily/Weekly/Monthly) - Though logic above enforced Today for Daily.
        // Let's refine: The above logic enforces TODAY.
        // If filter is Weekly/Monthly, we should relax the date check above.

        return combined.filter(item => {
            const dateRef = (item as any).completedAt?.seconds ? new Date((item as any).completedAt.seconds * 1000) :
                (item as any).updatedAt?.seconds ? new Date((item as any).updatedAt.seconds * 1000) :
                    ((item as any).createdAt?.seconds ? new Date((item as any).createdAt.seconds * 1000) : new Date((item as any).createdAt || (item as any).date));

            const itemDay = new Date(dateRef);
            itemDay.setHours(0, 0, 0, 0);

            const diffTime = Math.abs(now.getTime() - itemDay.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (filter === 'daily') return diffDays <= 1; // Include today
            if (filter === 'weekly') return diffDays <= 7;
            if (filter === 'monthly') return diffDays <= 30;
            return true;
        }).sort((a, b) => {
            // Sort by latest date
            const dateA = (a as any).completedAt?.seconds || (a as any).updatedAt?.seconds || (a as any).createdAt?.seconds || 0;
            const dateB = (b as any).completedAt?.seconds || (b as any).updatedAt?.seconds || (b as any).createdAt?.seconds || 0;
            return dateB - dateA;
        });

    }, [tasks, routineTasks, filter]);

    const recentUpdates = filteredUpdates.slice(0, 10);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-100">

            {/* Breadcrumb Bar - Compact */}
            <div className="bg-[#2c3e50] border-b border-[#34495e] px-4 py-2 flex items-center gap-2 text-xs text-slate-400 shrink-0 shadow-sm">
                <span className="font-bold text-white text-base mr-4">Genel Bakış</span>
                <div className="w-px h-4 bg-[#34495e] mx-2" />
                <Home className="w-3 h-3" />
                <ChevronRight className="w-3 h-3" />
                <span className="font-semibold text-white">Dashboard</span>
            </div>

            {/* Main Content - No Scroll on outer container */}
            <div className="flex-1 flex flex-row p-4 gap-4 overflow-hidden">

                {/* Left Column: Quick Actions & Stats */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                    {/* Quick Actions (Compact Row) */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 shrink-0">
                        <div className="mb-3">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500" />
                                Hızlı İşlemler
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Conditionally render New Customer Button */}
                            {userPermissions?.canAddCustomers && (
                                <button onClick={onOpenNewCustomerModal} className="flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-3 rounded-lg transition-all border border-emerald-100 group shadow-sm hover:shadow-md justify-start">
                                    <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform shrink-0">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs text-left">Yeni Müşteri</span>
                                </button>
                            )}

                            {/* Conditionally render Assignment Button */}
                            {userPermissions?.canAccessAssignment && (
                                <button onClick={onOpenAssignmentModal} className="flex items-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-3 rounded-lg transition-all border border-blue-100 group shadow-sm hover:shadow-md justify-start">
                                    <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform shrink-0">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs text-left">Görev Dağıtımı</span>
                                </button>
                            )}

                            {/* Conditionally render Routine Pool Button */}
                            {userPermissions?.canAccessRoutineTasks && (
                                <button onClick={onOpenRoutineModal} className="flex items-center gap-3 bg-purple-50 hover:bg-purple-100 text-purple-600 px-4 py-3 rounded-lg transition-all border border-purple-100 group relative shadow-sm hover:shadow-md justify-start">
                                    <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform shrink-0">
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs text-left">Eksikler Havuzu</span>
                                    {(() => {
                                        // Calculate number of routine tasks created TODAY
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const dailyCount = routineTasks.filter(t => {
                                            const d = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date(t.createdAt);
                                            d.setHours(0, 0, 0, 0);
                                            return d.getTime() === today.getTime();
                                        }).length;

                                        return dailyCount > 0 ? (
                                            <span className="absolute top-2 right-2 bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                                +{dailyCount}
                                            </span>
                                        ) : null;
                                    })()}
                                </button>
                            )}

                            <button className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-3 rounded-lg transition-all border border-slate-100 group shadow-sm hover:shadow-md justify-start">
                                <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform shrink-0">
                                    <MoreHorizontal className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-xs text-left">Diğer İşlemler</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid (Scrollable) */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {cards.map((card, idx) => {
                                const isGasAlert = card.status === TaskStatus.GAS_OPENED && card.score > 0;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => card.action ? card.action() : onNavigate(card.status)}
                                        className={`
                                            relative p-5 rounded-2xl border transition-all duration-300 text-left flex flex-col justify-between group h-36 overflow-hidden
                                            ${isGasAlert
                                                ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                                                : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/80 shadow-lg hover:shadow-2xl'
                                            }
                                            hover:-translate-y-1.5 active:translate-y-0 active:scale-[0.98]
                                        `}
                                    >
                                        {/* Top Gradient Border */}
                                        <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${isGasAlert ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                                                card.status === TaskStatus.TO_CHECK ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                                    card.status === TaskStatus.CHECK_COMPLETED ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                                                        card.status === TaskStatus.DEPOSIT_PAID ? 'bg-gradient-to-r from-indigo-400 to-purple-500' :
                                                            card.status === TaskStatus.SERVICE_DIRECTED ? 'bg-gradient-to-r from-purple-400 to-pink-500' :
                                                                'bg-gradient-to-r from-emerald-400 to-teal-500'
                                            }`} />

                                        {/* Hover Glow Effect */}
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl ${isGasAlert ? '' : 'bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5'
                                            }`} />

                                        <div className="flex justify-between items-start w-full mb-1 z-10 relative">
                                            <h3 className={`font-extrabold text-[11px] uppercase tracking-wider leading-tight max-w-[80%] ${isGasAlert ? 'text-red-700' : 'text-slate-600'}`}>
                                                {card.title}
                                            </h3>
                                            {isGasAlert && (
                                                <div className="absolute -top-1 -right-1 flex items-center gap-1">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-end justify-between z-10 relative mt-auto">
                                            <div className="flex flex-col">
                                                <span className={`text-4xl font-black tracking-tight ${isGasAlert ? 'text-red-600' : card.color} drop-shadow-sm`}>
                                                    {card.score}
                                                </span>
                                                <span className={`text-[10px] font-semibold mt-1 ${isGasAlert ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {isGasAlert ? '⚠️ MÜDAHALE!' : 'kayıt'}
                                                </span>
                                            </div>
                                            <div className={`p-2.5 rounded-xl transition-all duration-300 ${isGasAlert
                                                    ? 'bg-red-200 animate-bounce'
                                                    : 'bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner group-hover:scale-110 group-hover:shadow-md'
                                                }`}>
                                                <Activity className={`w-5 h-5 ${isGasAlert ? 'text-red-600' : card.color}`} />
                                            </div>
                                        </div>

                                        {/* Decorative Background Pattern */}
                                        <div className={`absolute -right-8 -bottom-8 w-36 h-36 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 z-0`}>
                                            <Activity className={`w-full h-full ${isGasAlert ? 'text-red-900' : 'text-slate-900'}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Personal Notes & Calendar (Fixed Width, Full Height) */}
                <div className="w-80 shrink-0 h-full flex flex-col gap-4">
                    <div className="h-[45%]">
                        <PersonalNotes userEmail={currentUser?.email} />
                    </div>
                    <div className="flex-1 min-h-0">
                        <CalendarWidget userEmail={currentUser?.email} />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
