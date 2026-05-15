import React, { useState } from 'react';
import { Task, TaskStatus, StatusLabels, StaffMember, RoutineTask, UserPermission } from '@/types';
import { ChevronRight, Home, Activity, Clock, Plus, Users, Bell, Map as MapIcon, MoreHorizontal, FileText, FolderOpen } from 'lucide-react';
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
    onOpenQuotationPrep?: () => void;
    onOpenQuotationList?: () => void;
    currentUser?: { name: string; email: string };
    userRole?: 'admin' | 'staff' | 'manager';
    userPermissions?: UserPermission;
    isDarkMode?: boolean;
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
    onOpenQuotationPrep,
    onOpenQuotationList,
    currentUser,
    userRole,
    userPermissions,
    isDarkMode = true
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
            !t.checkStatus // MATCH MOBILE: Hide if checkStatus exists, Allow DEPOSIT_PAID
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
            title: 'PROJESİ ÇİZİLECEK İŞLER',
            displayName: StatusLabels[TaskStatus.PROJECT_TO_BE_DRAWN],
            score: tasks.filter(t => t.status === TaskStatus.PROJECT_TO_BE_DRAWN || (t.status === TaskStatus.CHECK_COMPLETED && !t.isProjectDrawn)).length,
            status: TaskStatus.PROJECT_TO_BE_DRAWN,
            color: 'text-amber-600',
            borderColor: 'hover:border-amber-600'
        },
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
            score: tasks.filter(t => t.status === TaskStatus.GAS_OPENED && !t.isWaiting).length,
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

    const visibleCards = cards.filter(card => {
        if (userRole === 'admin' || userRole === 'manager') return true;
        if (card.status === 'MY_TASKS' || card.status === 'FIELD_STAFF') return true;
        return userPermissions?.allowedColumns?.includes(card.status as TaskStatus);
    });

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
        <div className="flex flex-col h-full overflow-hidden bg-transparent">

            {/* Main Content - No Scroll on outer container */}
            <div className="flex-1 flex flex-row p-4 gap-4 overflow-hidden">

                {/* Left Column: Quick Actions & Stats */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                    {/* Quick Actions (Compact Row) */}
                    <div className={`${isDarkMode ? 'bg-white/5 backdrop-blur-md border-white/10 shadow-xl' : 'bg-slate-200/80 backdrop-blur-md border-slate-300 shadow-md'} rounded-xl p-4 border shrink-0 transition-colors duration-500`}>
                        <div className="mb-3">
                            <h3 className={`font-bold text-sm flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                <Activity className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                                Hızlı İşlemler
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Conditionally render New Customer Button */}
                            {userPermissions?.canAddCustomers && (
                                <button onClick={onOpenNewCustomerModal} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all border group justify-start ${isDarkMode ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 shadow-lg hover:shadow-xl backdrop-blur-sm' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                    <div className={`${isDarkMode ? 'bg-emerald-500/20' : 'bg-white shadow-sm'} p-2 rounded-full group-hover:scale-110 transition-transform shrink-0`}>
                                        <Plus className={`w-5 h-5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
                                    </div>
                                    <span className={`font-bold text-xs text-left ${isDarkMode ? 'text-emerald-100' : 'text-emerald-800'}`}>Yeni Müşteri</span>
                                </button>
                            )}

                            {/* Conditionally render Assignment Button */}
                            {userPermissions?.canAccessAssignment && (
                                <button onClick={onOpenAssignmentModal} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all border group justify-start ${isDarkMode ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20 shadow-lg hover:shadow-xl backdrop-blur-sm' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'}`}>
                                    <div className={`${isDarkMode ? 'bg-blue-500/20' : 'bg-white shadow-sm'} p-2 rounded-full group-hover:scale-110 transition-transform shrink-0`}>
                                        <Users className={`w-5 h-5 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                                    </div>
                                    <span className={`font-bold text-xs text-left ${isDarkMode ? 'text-blue-100' : 'text-blue-800'}`}>Görev Dağıtımı</span>
                                </button>
                            )}

                            {/* Conditionally render Routine Pool Button */}
                            {userPermissions?.canAccessRoutineTasks && (
                                <button onClick={onOpenRoutineModal} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all border group relative justify-start ${isDarkMode ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20 shadow-lg hover:shadow-xl backdrop-blur-sm' : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'}`}>
                                    <div className={`${isDarkMode ? 'bg-purple-500/20' : 'bg-white shadow-sm'} p-2 rounded-full group-hover:scale-110 transition-transform shrink-0`}>
                                        <Bell className={`w-5 h-5 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`} />
                                    </div>
                                    <span className={`font-bold text-xs text-left ${isDarkMode ? 'text-purple-100' : 'text-purple-800'}`}>Eksikler Havuzu</span>
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

                            <button className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all border group justify-start ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 shadow-lg hover:shadow-xl backdrop-blur-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'}`}>
                                <div className={`${isDarkMode ? 'bg-white/10' : 'bg-white shadow-sm'} p-2 rounded-full group-hover:scale-110 transition-transform shrink-0`}>
                                    <MoreHorizontal className={`w-5 h-5 ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`} />
                                </div>
                                <span className={`font-bold text-xs text-left ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Diğer İşlemler</span>
                            </button>
                        </div>
                    </div>



                    {/* Stats Grid (Scrollable) */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {visibleCards.map((card, idx) => {
                                const isGasAlert = card.status === TaskStatus.GAS_OPENED && card.score > 0;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => card.action ? card.action() : onNavigate(card.status)}
                                        className={`
                                            relative p-5 rounded-2xl border transition-all duration-300 text-left flex flex-col justify-between group h-36 overflow-hidden backdrop-blur-md
                                            ${isGasAlert
                                                ? isDarkMode ? 'bg-red-900/40 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]' : 'bg-red-100 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                                : isDarkMode ? 'bg-white/5 border-white/10 shadow-lg hover:shadow-2xl hover:bg-white/10' : 'bg-slate-200/80 border-slate-300 shadow-md hover:shadow-lg hover:bg-slate-300/80'
                                            }
                                            hover:-translate-y-1.5 active:translate-y-0 active:scale-[0.98]
                                        `}
                                    >
                                        {/* Top Gradient Border */}
                                        <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${isGasAlert ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                                            card.status === TaskStatus.TO_CHECK ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                                card.status === TaskStatus.CHECK_COMPLETED ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                                                    card.status === TaskStatus.PROJECT_TO_BE_DRAWN ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                                                        card.status === TaskStatus.DEPOSIT_PAID ? 'bg-gradient-to-r from-indigo-400 to-purple-500' :
                                                            card.status === TaskStatus.SERVICE_DIRECTED ? 'bg-gradient-to-r from-purple-400 to-pink-500' :
                                                                'bg-gradient-to-r from-emerald-400 to-teal-500'
                                            }`} />

                                        {/* Hover Glow Effect */}
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl ${isGasAlert ? '' : 'bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10'
                                            }`} />

                                        <div className="flex justify-between items-start w-full mb-1 z-10 relative">
                                            <h3 className={`font-extrabold text-[11px] uppercase tracking-wider leading-tight max-w-[80%] ${isGasAlert ? (isDarkMode ? 'text-red-300' : 'text-red-700') : (isDarkMode ? 'text-slate-300' : 'text-slate-500')}`}>
                                                {card.title}
                                            </h3>
                                            {isGasAlert && (
                                                <div className="absolute -top-1 -right-1 flex items-center gap-1">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col z-10 relative mt-auto">
                                            <span className={`text-4xl font-black tracking-tight ${isGasAlert ? 'text-red-400' : card.color} drop-shadow-sm`}>
                                                {card.score}
                                            </span>
                                            <span className={`text-[10px] font-semibold mt-1 ${isGasAlert ? 'text-red-400' : 'text-slate-400'}`}>
                                                {isGasAlert ? '⚠️ MÜDAHALE!' : 'kayıt'}
                                            </span>
                                        </div>

                                        <div className={`absolute right-5 bottom-5 z-10 p-2.5 rounded-xl transition-all duration-300 ${isGasAlert
                                            ? (isDarkMode ? 'bg-red-500/20 animate-bounce' : 'bg-red-100 animate-bounce')
                                            : (isDarkMode ? 'bg-white/10 shadow-inner group-hover:scale-110 group-hover:shadow-lg backdrop-blur-sm border border-white/5' : 'bg-slate-50 group-hover:scale-110 group-hover:shadow-md border border-slate-100')
                                            }`}>
                                            <Activity className={`w-5 h-5 ${isGasAlert ? 'text-red-400' : card.color}`} />
                                        </div>

                                        {/* Decorative Background Pattern */}
                                        <div className={`absolute -right-8 -bottom-8 w-36 h-36 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 z-0`}>
                                            <Activity className={`w-full h-full ${isGasAlert ? 'text-red-900' : 'text-slate-100'}`} />
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
                        <PersonalNotes userEmail={currentUser?.email} isDarkMode={isDarkMode} />
                    </div>
                    <div className="flex-1 min-h-0">
                        <CalendarWidget userEmail={currentUser?.email} isDarkMode={isDarkMode} />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
