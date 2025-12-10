import React, { useState } from 'react';
import { Home, Search, Plus, User, Bell, MapPin, Phone, Calendar, ChevronRight, Filter, ArrowLeft, LayoutGrid, List } from 'lucide-react';
import { Task, TaskStatus, StatusLabels, RoutineTask } from '../types';

interface MobileLayoutDemoProps {
    tasks: Task[];
    routineTasks: RoutineTask[];
    onClose: () => void;
    userEmail?: string;
    onTaskClick: (task: Task) => void;
}

export default function MobileLayoutDemo({ tasks, routineTasks, onClose, userEmail, onTaskClick }: MobileLayoutDemoProps) {
    const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'add' | 'profile'>('home');
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL');

    // Filter Logic
    const myTasks = tasks.filter(t => t.assigneeEmail === userEmail);

    // Decide which tasks to show based on Tab
    let displayedTasks = tasks;

    if (activeTab === 'tasks') {
        // "İşlerim" Tab -> Show only my tasks
        displayedTasks = myTasks;
    } else {
        // "Home" Tab -> Show all (filtered by status pill)
        displayedTasks = filterStatus === 'ALL'
            ? tasks
            : tasks.filter(t => t.status === filterStatus);
    }

    const pendingCount = tasks.filter(t => t.status === TaskStatus.TO_CHECK).length;
    const myPendingCount = myTasks.filter(t => t.status !== TaskStatus.GAS_OPENED && t.status !== TaskStatus.SERVICE_DIRECTED).length; // Example logic

    return (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex justify-center items-center backdrop-blur-sm bg-black/50">
            {/* Mobile Device Frame Simulator */}
            <div className="w-full h-full md:w-[375px] md:h-[667px] md:rounded-[40px] md:border-[8px] md:border-slate-800 bg-slate-900 overflow-hidden relative shadow-2xl flex flex-col font-sans">

                {/* Status Bar (Fake) */}
                <div className="h-10 bg-slate-900 flex items-center justify-between px-6 text-white text-xs font-medium z-10 sticky top-0">
                    <span>09:41</span>
                    <div className="flex gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-slate-700"></div>
                        <div className="w-4 h-4 rounded-full bg-slate-700"></div>
                    </div>
                </div>

                {/* --- MAIN CONTENT SCROLL AREA --- */}
                <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar scroll-smooth">

                    {/* HEADER */}
                    <div className="px-5 pt-2 pb-6 bg-gradient-to-b from-slate-900 to-slate-800 sticky top-0 z-10 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Merhaba,</h2>
                                <h1 className="text-xl font-bold text-white leading-tight">
                                    {activeTab === 'tasks' ? 'İşlerim' : 'Operasyon Paneli'}
                                </h1>
                            </div>
                            <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white border border-slate-700">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Quick Stats Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
                                <LayoutGrid className="w-5 h-5 text-blue-400 mb-1" />
                                <div>
                                    <div className="text-2xl font-bold text-white">{tasks.length}</div>
                                    <div className="text-xs text-blue-300">Toplam İş</div>
                                </div>
                            </div>
                            <div className="bg-purple-600/20 border border-purple-500/30 p-3 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/20 rounded-full blur-xl"></div>
                                <Bell className="w-5 h-5 text-purple-400 mb-1" />
                                <div>
                                    <div className="text-2xl font-bold text-white">
                                        {activeTab === 'tasks' ? myPendingCount : pendingCount}
                                    </div>
                                    <div className="text-xs text-purple-300">
                                        {activeTab === 'tasks' ? 'Bana Atananlar' : 'Kontrol Bekleyen'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PAGE CONTENT */}
                    <div className="px-4 py-4 space-y-6">

                        {/* Horizontal Filter Scroll (Only on Home) */}
                        {activeTab === 'home' && (
                            <div>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="font-bold text-white text-lg">İş Listesi</h3>
                                    <Filter className="w-4 h-4 text-slate-500" />
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                                    <button
                                        onClick={() => setFilterStatus('ALL')}
                                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${filterStatus === 'ALL' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}
                                    >
                                        Tümü
                                    </button>
                                    {Object.values(TaskStatus).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${filterStatus === status ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                                        >
                                            {StatusLabels[status]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Task Cards */}
                        <div className="space-y-3">
                            {displayedTasks.length === 0 && (
                                <div className="text-center text-slate-500 py-10 italic">
                                    Görüntülenecek iş bulunamadı.
                                </div>
                            )}
                            {displayedTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => onTaskClick(task)}
                                    className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50 active:scale-95 transition-transform cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${task.status === TaskStatus.TO_CHECK ? 'bg-slate-700 text-slate-300' :
                                                task.status === TaskStatus.CHECK_COMPLETED ? 'bg-emerald-500/20 text-emerald-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {StatusLabels[task.status]}
                                        </span>
                                        <span className="text-xs text-slate-500 font-mono">#{task.orderNumber}</span>
                                    </div>

                                    <h4 className="text-white font-bold text-sm mb-1 line-clamp-2">{task.title}</h4>

                                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate">{task.address || 'Adres Girilmemiş'}</span>
                                    </div>

                                    <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-slate-300 text-xs font-medium">
                                            <Calendar className="w-3.5 h-3.5" /> Detayları Gör
                                        </div>
                                        {task.phone && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`tel:${task.phone}`);
                                                }}
                                                className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>

                {/* BOTTOM NAVIGATION BAR */}
                <div className="absolute bottom-0 left-0 w-full h-[80px] bg-slate-900 border-t border-slate-800 flex justify-around items-start pt-4 pb-2 z-20">
                    <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'home' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-current' : ''}`} />
                        <span className="text-[10px] font-medium">Ana Sayfa</span>
                    </button>

                    <button onClick={() => setActiveTab('tasks')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'tasks' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}>
                        <List className="w-6 h-6" />
                        <span className="text-[10px] font-medium">İşlerim</span>
                    </button>

                    {/* Floating Action Button Style Center */}
                    <div className="-mt-8">
                        <button onClick={() => setActiveTab('add')} className="w-14 h-14 rounded-full bg-blue-600 shadow-lg shadow-blue-600/40 text-white flex items-center justify-center transform transition-transform active:scale-95 border-4 border-slate-900">
                            <Plus className="w-7 h-7" />
                        </button>
                    </div>

                    <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'profile' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}>
                        <User className={`w-6 h-6 ${activeTab === 'profile' ? 'fill-current' : ''}`} />
                        <span className="text-[10px] font-medium">Profil</span>
                    </button>
                </div>

                {/* iOS Home Indicator */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700/50 rounded-full z-30"></div>

            </div>

            {/* Desktop Close Button Helper */}
            <button onClick={onClose} className="hidden md:flex absolute top-4 right-4 text-white/50 hover:text-white items-center gap-2 bg-slate-800 rounded-full py-2 px-4 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                Önizlemeyi Kapat
            </button>
        </div>
    );
}
