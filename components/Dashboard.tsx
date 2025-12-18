
import React, { useState } from 'react';
import { Task, TaskStatus, StatusLabels, StaffMember, RoutineTask } from '@/types';
import { ChevronRight, Home, Activity, Clock, Plus, Users, Bell, Map as MapIcon, MoreHorizontal } from 'lucide-react';
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
    onOpenNewCustomerModal
}) => {
    const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    // --- İstatistik Hesaplamaları ---
    const getCount = (status: TaskStatus) => tasks.filter(t => t.status === status).length;

    const cards = [
        {
            title: 'İNCELENECEK (TO_CHECK)', // Hardcoded labels or import? StatusLabels has Turkish.
            displayName: StatusLabels[TaskStatus.TO_CHECK],
            score: getCount(TaskStatus.TO_CHECK),
            subText: 'Kontrol bekleyen yeni işler',
            status: TaskStatus.TO_CHECK,
            color: 'text-amber-500',
            borderColor: 'hover:border-amber-500'
        },
        {
            title: 'KONTROL EDİLDİ',
            displayName: StatusLabels[TaskStatus.CHECK_COMPLETED],
            score: getCount(TaskStatus.CHECK_COMPLETED),
            subText: 'Kontrolü tamamlanmış işler',
            status: TaskStatus.CHECK_COMPLETED,
            color: 'text-blue-500',
            borderColor: 'hover:border-blue-500'
        },
        {
            title: 'DEPOZİTO ONAYI',
            displayName: StatusLabels[TaskStatus.DEPOSIT_PAID],
            score: getCount(TaskStatus.DEPOSIT_PAID),
            subText: 'Depozitosu yatırılmış işler',
            status: TaskStatus.DEPOSIT_PAID,
            color: 'text-indigo-500',
            borderColor: 'hover:border-indigo-500'
        },
        {
            title: 'GAZ AÇILDI',
            displayName: StatusLabels[TaskStatus.GAS_OPENED],
            score: getCount(TaskStatus.GAS_OPENED),
            subText: 'Gaz açımı yapılmış işler',
            status: TaskStatus.GAS_OPENED,
            color: 'text-emerald-500',
            borderColor: 'hover:border-emerald-500'
        },
        {
            title: 'SERVİS YÖNLENDİRME',
            displayName: StatusLabels[TaskStatus.SERVICE_DIRECTED],
            score: getCount(TaskStatus.SERVICE_DIRECTED),
            subText: 'Servise yönlendirilmiş işler',
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

            {/* Breadcrumb Bar */}
            <div className="bg-[#2c3e50] border-b border-[#34495e] px-6 py-3 flex items-center gap-2 text-sm text-slate-400 mb-6 shadow-md">
                <span className="font-bold text-white text-lg mr-4">Genel Bakış</span>
                <div className="w-px h-5 bg-[#34495e] mx-2" />
                <Home className="w-4 h-4" />
                <ChevronRight className="w-4 h-4" />
                <span className="font-semibold text-white">Dashboard</span>
                <span className="font-semibold text-white">Dashboard</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* 1. SECTION: QUICK ACTIONS & MAP (NEW) */}
                <div className="grid grid-cols-1 gap-6">

                    {/* Hızlı İşlemler (Tam Genişlik) */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                        <div className="mb-4">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-500" />
                                Hızlı İşlemler
                            </h3>
                            <p className="text-slate-400 text-xs mt-1">Sık kullanılan yönetici araçları</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button onClick={onOpenNewCustomerModal} className="flex flex-col items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-6 rounded-xl transition-all border border-emerald-100 group">
                                <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-sm">Yeni Müşteri</span>
                            </button>

                            <button onClick={onOpenAssignmentModal} className="flex flex-col items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 p-6 rounded-xl transition-all border border-blue-100 group">
                                <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                    <Users className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-sm">Görev Dağıtımı</span>
                            </button>

                            <button onClick={onOpenRoutineModal} className="flex flex-col items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-600 p-6 rounded-xl transition-all border border-purple-100 group relative">
                                <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                    <Bell className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-sm">Eksikler Havuzu</span>
                                <span className="absolute top-2 right-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">3</span>
                            </button>

                            <button className="flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 p-6 rounded-xl transition-all border border-slate-100 group">
                                <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                    <MoreHorizontal className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-sm">Diğer</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. SECTION: STATS & UPDATES */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* Sol Kolon: Kartlar */}
                    <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* .. existing cards code .. */}
                            {cards.map((card, idx) => {
                                const isGasAlert = card.status === TaskStatus.GAS_OPENED && card.score > 0;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => onNavigate(card.status)}
                                        className={`${isGasAlert ? 'bg-red-50 animate-pulse ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white'} p-6 rounded-lg shadow-sm border-t-4 border-slate-100 ${card.borderColor} hover:shadow-md transition-all text-left flex flex-col justify-between group h-36 relative overflow-hidden`}
                                    >
                                        <div className="flex justify-between items-start w-full mb-2 z-10 relative">
                                            <h3 className="font-bold text-slate-600 text-xs uppercase tracking-wider">{card.displayName}</h3>
                                            {isGasAlert && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                                        </div>

                                        <div className="flex items-end justify-between z-10 relative">
                                            <span className={`text-4xl font-bold ${card.color}`}>
                                                {card.score}
                                            </span>
                                            <div className={`p-2 rounded-full bg-slate-50 group-hover:bg-white transition-colors`}>
                                                <Activity className={`w-5 h-5 ${card.color} opacity-50 group-hover:opacity-100`} />
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-slate-100 my-3 relative z-10" />

                                        <p className="text-[11px] text-slate-400 font-medium relative z-10">
                                            {card.subText}
                                        </p>

                                        {/* Decorative Background Icon */}
                                        <Activity className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-50 opacity-50 group-hover:scale-110 transition-transform duration-500 z-0" />
                                    </button>
                                );
                            })}

                            {/* Eksiği Olan İşler Kartı */}
                            <button
                                onClick={onFilterMissing}
                                className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-slate-100 hover:border-red-500 hover:shadow-md transition-all text-left flex flex-col justify-between group h-36 relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start w-full mb-2 z-10 relative">
                                    <h3 className="font-bold text-slate-600 text-xs uppercase tracking-wider">Eksiği Olan İşler</h3>
                                </div>
                                <div className="flex items-end justify-between z-10 relative">
                                    <span className="text-4xl font-bold text-red-500">
                                        {tasks.filter(t => t.checkStatus === 'missing').length}
                                    </span>
                                    <div className="p-2 rounded-full bg-slate-50 group-hover:bg-white transition-colors">
                                        <Activity className="w-5 h-5 text-red-500 opacity-50 group-hover:opacity-100" />
                                    </div>
                                </div>
                                <div className="w-full h-px bg-slate-100 my-3 relative z-10" />
                                <p className="text-[11px] text-slate-400 font-medium relative z-10">
                                    Müdahale gereken dosyalar
                                </p>
                                <Activity className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-50 opacity-50 group-hover:scale-110 transition-transform duration-500 z-0" />
                            </button>

                        </div>
                    </div>

                    {/* Sağ Kolon: Son Güncellemeler */}
                    <div className="w-full lg:w-96 flex flex-col gap-6">
                        <div className="bg-white rounded-lg shadow-sm p-0 overflow-hidden border border-slate-100 h-full max-h-[600px] flex flex-col">
                            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        Son Güncellemeler
                                    </h3>
                                </div>
                                <div className="flex bg-slate-200 rounded-lg p-1 gap-1">
                                    <button
                                        onClick={() => setFilter('daily')}
                                        className={`flex - 1 py - 1 text - [10px] font - bold rounded - md transition - all ${filter === 'daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                                    >
                                        Günlük
                                    </button>
                                    <button
                                        onClick={() => setFilter('weekly')}
                                        className={`flex - 1 py - 1 text - [10px] font - bold rounded - md transition - all ${filter === 'weekly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                                    >
                                        Haftalık
                                    </button>
                                    <button
                                        onClick={() => setFilter('monthly')}
                                        className={`flex - 1 py - 1 text - [10px] font - bold rounded - md transition - all ${filter === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                                    >
                                        Aylık
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar flex-1">
                                {recentUpdates.length > 0 ? recentUpdates.map((item: any) => (
                                    <div
                                        key={item.id}
                                        onClick={() => item.type === 'task' ? onTaskClick(item) : onOpenRoutineModal()} // If routine, open modal?
                                        className="group bg-white p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            {item.type === 'task' ? (
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">#{item.orderNumber}</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Eksik</span>
                                            )}
                                            <span className="text-[10px] text-slate-400">
                                                {new Date((item.completedAt?.seconds || item.updatedAt?.seconds || item.createdAt?.seconds) * 1000 || Date.now()).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-1">{item.title || item.content}</h4>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-xs text-slate-500 line-clamp-1">{item.status ? StatusLabels[item.status] : 'Tamamlanan Eksik'}</p>
                                            {item.checkStatus === 'clean' && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded">Temiz</span>}
                                            {item.isCompleted && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded">Yapıldı</span>}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        Kriterlere uygun kayıt yok.
                                    </div>
                                )}
                            </div>

                            <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                                <button onClick={() => onNavigate()} className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                                    Tüm Kayıtları Görüntüle
                                </button>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
