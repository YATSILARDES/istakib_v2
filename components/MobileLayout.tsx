import React, { useState } from 'react';
import { Home, Search, Plus, User, Bell, MapPin, Phone, Calendar, ChevronRight, Filter, LogOut, KeyRound, LayoutGrid, List } from 'lucide-react';
import { Task, TaskStatus, StatusLabels, RoutineTask, UserPermission } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../src/firebase';

interface MobileLayoutProps {
    user: FirebaseUser | null;
    userPermissions: UserPermission | null;
    tasks: Task[];
    routineTasks: RoutineTask[];
    onSignOut: () => void;
    onTaskClick: (task: Task) => void;
    onAddTask: () => void;
}

export default function MobileLayout({
    user,
    userPermissions,
    tasks,
    routineTasks,
    onSignOut,
    onTaskClick,
    onAddTask
}: MobileLayoutProps) {
    const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'profile'>('home');
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL');

    // Helper: Get Display Name
    const displayName = userPermissions?.name || user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';
    const roleName = userPermissions?.role === 'admin' ? 'Yönetici' : 'Personel';

    // Filter Logic
    const myTasks = tasks.filter(t => t.assigneeEmail === user?.email);

    // Decide which tasks to show based on Tab
    let displayedTasks = tasks;
    let pageTitle = 'Operasyon Paneli';

    if (activeTab === 'tasks') {
        displayedTasks = myTasks;
        pageTitle = 'İşlerim';
    } else if (activeTab === 'home') {
        // "Home" Tab -> Show all (filtered by status pill)
        displayedTasks = filterStatus === 'ALL'
            ? tasks
            : tasks.filter(t => t.status === filterStatus);
    }

    // Stats
    const pendingCount = tasks.filter(t => t.status === TaskStatus.TO_CHECK).length;
    const myPendingCount = myTasks.filter(t => t.status !== TaskStatus.GAS_OPENED && t.status !== TaskStatus.SERVICE_DIRECTED).length;

    // Handlers
    const handlePasswordReset = async () => {
        if (user?.email) {
            if (confirm(`${user.email} adresine şifre sıfırlama bağlantısı gönderilsin mi?`)) {
                try {
                    await sendPasswordResetEmail(auth, user.email);
                    alert('E-posta gönderildi! Lütfen gelen kutunuzu kontrol edin.');
                } catch (error) {
                    alert('Hata oluştu: ' + (error as any).message);
                }
            }
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 font-sans overflow-hidden">

            {/* HEADER (Only for Home & Tasks) */}
            {activeTab !== 'profile' && (
                <div className="px-5 pt-6 pb-6 bg-gradient-to-b from-slate-900 to-slate-800 shadow-sm shrink-0 z-10">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Merhaba,</h2>
                            <h1 className="text-xl font-bold text-white leading-tight">{displayName}</h1>
                        </div>
                        {/* Conditional Add Button */}
                        {(userPermissions?.canAddCustomers || userPermissions?.role === 'admin') && (
                            <button
                                onClick={onAddTask}
                                className="w-10 h-10 rounded-full bg-blue-600 shadow-lg shadow-blue-600/30 text-white flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    {/* Quick Stats (Only on Home) */}
                    {activeTab === 'home' && (
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-2xl flex flex-col justify-between h-20 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
                                <LayoutGrid className="w-5 h-5 text-blue-400 mb-1" />
                                <div>
                                    <div className="text-2xl font-bold text-white leading-none">{tasks.length}</div>
                                    <div className="text-[10px] text-blue-300 mt-1">Toplam İş</div>
                                </div>
                            </div>
                            <div className="bg-purple-600/20 border border-purple-500/30 p-3 rounded-2xl flex flex-col justify-between h-20 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/20 rounded-full blur-xl"></div>
                                <Bell className="w-5 h-5 text-purple-400 mb-1" />
                                <div>
                                    <div className="text-2xl font-bold text-white leading-none">{pendingCount}</div>
                                    <div className="text-[10px] text-purple-300 mt-1">Kontrol Bekleyen</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* HEADER (Profile) */}
            {activeTab === 'profile' && (
                <div className="px-5 pt-8 pb-4 bg-slate-900 shrink-0">
                    <h1 className="text-2xl font-bold text-white">Profilim</h1>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth pb-24">

                {/* VIEW: HOME & TASKS */}
                {activeTab !== 'profile' && (
                    <div className="px-4 py-2 space-y-5">

                        {/* Filter Pills (Home Only) */}
                        {activeTab === 'home' && (
                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                                <button
                                    onClick={() => setFilterStatus('ALL')}
                                    className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${filterStatus === 'ALL' ? 'bg-white text-slate-900 font-bold' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                                >
                                    Tümü
                                </button>
                                {Object.values(TaskStatus).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${filterStatus === status ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                                    >
                                        {StatusLabels[status]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Task List */}
                        <div className="space-y-3">
                            {displayedTasks.length === 0 && (
                                <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center">
                                        <Search className="w-8 h-8 opacity-20" />
                                    </div>
                                    <span className="text-sm">Görüntülenecek iş bulunamadı.</span>
                                </div>
                            )}

                            {displayedTasks.map(task => {
                                // COLOR CODING LOGIC (Same as Desktop)
                                let cardStyle = "bg-slate-800 border-slate-700/50"; // Default
                                let badgeStyle = "bg-blue-500/20 text-blue-400"; // Default Badge
                                let shadowStyle = "";

                                if (task.checkStatus === 'missing') {
                                    cardStyle = "bg-orange-950/30 border-orange-500/50";
                                    badgeStyle = "bg-orange-500/20 text-orange-400";
                                    shadowStyle = "shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]"; // Orange Glow
                                } else if (task.checkStatus === 'clean') {
                                    cardStyle = "bg-emerald-950/30 border-emerald-500/50";
                                    badgeStyle = "bg-emerald-500/20 text-emerald-400";
                                    shadowStyle = "shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]"; // Green Glow
                                }

                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => onTaskClick(task)}
                                        className={`rounded-2xl p-4 border active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden ${cardStyle} ${shadowStyle}`}
                                    >
                                        {/* Status Badge & Row Num */}
                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                                                {StatusLabels[task.status]}
                                            </span>
                                            <span className="text-xs text-slate-500 font-mono">#{task.orderNumber}</span>
                                        </div>

                                        {/* Content */}
                                        <div className="relative z-10">
                                            <h4 className={`font-bold text-sm mb-1 line-clamp-2 ${task.checkStatus === 'missing' ? 'text-orange-100' : task.checkStatus === 'clean' ? 'text-emerald-100' : 'text-white'}`}>
                                                {task.title}
                                            </h4>

                                            <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
                                                <MapPin className="w-3 h-3 shrink-0" />
                                                <span className="truncate">{task.address || 'Adres Girilmemiş'}</span>
                                            </div>

                                            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                                                    <Calendar className="w-3.5 h-3.5" /> Detay
                                                </div>
                                                {task.phone && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(`tel:${task.phone}`);
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center border border-white/10 transition-colors"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* VIEW: PROFILE */}
                {activeTab === 'profile' && (
                    <div className="px-4 py-2 space-y-6">
                        {/* Profile Card */}
                        <div className="bg-slate-800 rounded-2xl p-6 flex flex-col items-center border border-slate-700">
                            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-xl shadow-blue-900/50">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <h2 className="text-xl font-bold text-white">{displayName}</h2>
                            <p className="text-slate-400 text-sm">{user?.email}</p>
                            <span className="mt-2 text-xs bg-slate-700 text-slate-300 px-3 py-1 rounded-full">{roleName}</span>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider px-2">Hesap İşlemleri</h3>

                            <button
                                onClick={handlePasswordReset}
                                className="w-full bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex items-center gap-3 text-white transition-colors border border-slate-700"
                            >
                                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
                                    <KeyRound className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-sm flex-1 text-left">Şifremi Değiştir</span>
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </button>

                            <button
                                onClick={onSignOut}
                                className="w-full bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex items-center gap-3 text-red-400 transition-colors border border-slate-700 group"
                            >
                                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-400 group-hover:bg-red-500/20">
                                    <LogOut className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-sm flex-1 text-left">Çıkış Yap</span>
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>

                        <div className="text-center mt-8">
                            <p className="text-[10px] text-slate-600">Onay Mühendislik V2.0.1</p>
                        </div>
                    </div>
                )}

            </div>

            {/* BOTTOM NAVIGATION BAR */}
            <div className="bg-slate-900 border-t border-slate-800/80 flex justify-around items-center h-[70px] pb-2 shrink-0 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
                <button
                    onClick={() => setActiveTab('home')}
                    className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'home' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium">Ana Sayfa</span>
                </button>

                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'tasks' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <List className="w-6 h-6" />
                    <span className="text-[10px] font-medium">İşlerim</span>
                </button>

                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'profile' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <User className={`w-6 h-6 ${activeTab === 'profile' ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium">Profil</span>
                </button>
            </div>

        </div>
    );
}
