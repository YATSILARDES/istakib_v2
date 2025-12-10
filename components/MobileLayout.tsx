import React, { useState } from 'react';
import { Home, Search, Plus, User, Bell, MapPin, Phone, Calendar, ChevronRight, Filter, LogOut, KeyRound, LayoutGrid, List, CheckSquare, Clock, AlertTriangle, Check, CheckCircle2, Shield, Users } from 'lucide-react';
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
    onToggleRoutineTask: (taskId: string) => void;
    onOpenAdmin: () => void;
    onOpenRoutineModal: () => void;
    onOpenAssignmentModal: () => void;
}

export default function MobileLayout({
    user,
    userPermissions,
    tasks,
    routineTasks,
    onSignOut,
    onTaskClick,
    onAddTask,
    onToggleRoutineTask,
    onOpenAdmin,
    onOpenRoutineModal,
    onOpenAssignmentModal
}: MobileLayoutProps) {
    const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'profile'>('home');
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Helper: Get Display Name
    const displayName = userPermissions?.name || user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';
    const roleName = userPermissions?.role === 'admin' ? 'Yönetici' : 'Personel';

    // --- DATA FILTERING LOGIC ---

    // 1. My Items (Tasks & Routine Tasks)
    const myTasks = tasks.filter(t => t.assigneeEmail === user?.email);

    const myRoutineTasks = routineTasks.filter(t => {
        // Check if assigned to me via email or name
        const emailMatch = t.assigneeEmail && user?.email && t.assigneeEmail.toLowerCase() === user.email.toLowerCase();
        // Fallback to name match if permissions available
        const nameMatch = userPermissions?.name && t.assignee === userPermissions.name;
        return emailMatch || nameMatch;
    });

    // 2. Filter Helper Function (Search)
    const applySearch = (items: any[]) => {
        if (!searchQuery.trim()) return items;
        const lowerQ = searchQuery.toLocaleLowerCase('tr'); // Turkish sensitive lowercasing
        return items.filter(item => {
            const title = (item.title || item.content || '').toLocaleLowerCase('tr');
            const address = (item.address || '').toLocaleLowerCase('tr');
            const phone = (item.phone || item.phoneNumber || '').toLocaleLowerCase('tr');
            const customer = (item.customerName || '').toLocaleLowerCase('tr');
            return title.includes(lowerQ) || address.includes(lowerQ) || phone.includes(lowerQ) || customer.includes(lowerQ);
        });
    };

    // 3. Columns Logic (Based on Permissions)
    const availableStatusList = Object.values(TaskStatus).filter(status => {
        // If admin, show all
        if (userPermissions?.role === 'admin') return true;
        // If no explicit permissions, show all (safe fallback) or none? Desktop shows none usually if blocked.
        if (!userPermissions?.allowedColumns) return true;
        // Filter based on allowed columns
        return userPermissions.allowedColumns.includes(status);
    });

    // 4. Tab Specific Logic
    let displayedTasks: Task[] = [];
    let displayedRoutineTasks: RoutineTask[] = [];

    if (activeTab === 'home') {
        // Filter by Status Pill
        const statusFiltered = filterStatus === 'ALL'
            ? tasks
            : tasks.filter(t => t.status === filterStatus);

        // Apply Search
        displayedTasks = applySearch(statusFiltered);
        displayedRoutineTasks = []; // Home only shows main tasks for now? Or separate pool? sticking to Main Tasks per requirement.

    } else if (activeTab === 'tasks') {
        // My Tasks (Already filtered by user) -> Apply Search
        displayedTasks = applySearch(myTasks);
        displayedRoutineTasks = applySearch(myRoutineTasks);
    }


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
                <div className="px-5 pt-6 pb-2 bg-gradient-to-b from-slate-900 to-slate-800 shadow-sm shrink-0 z-10 space-y-4">
                    <div className="flex justify-between items-center">
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

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="İş, müşteri, adres veya telefon ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-base text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                        />
                    </div>
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
                    <div className="px-4 py-2 space-y-6">

                        {/* Filter Pills (Home Only) - REMOVED 'ALL' BUTTON */}
                        {activeTab === 'home' && (
                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                                {availableStatusList.map(status => (
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

                        {/* --- ROUTINE TASKS SECTION (Only in 'Tasks' Tab) --- */}
                        {activeTab === 'tasks' && displayedRoutineTasks.length > 0 && (
                            <div className="space-y-3 animate-fadeIn">
                                <div className="flex items-center gap-2 text-purple-400 border-b border-purple-500/20 pb-2">
                                    <CheckSquare className="w-4 h-4" />
                                    <h3 className="text-sm font-bold uppercase tracking-wide">Eksiklerim</h3>
                                    <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full">{displayedRoutineTasks.length}</span>
                                </div>
                                {displayedRoutineTasks.map(task => (
                                    <div key={task.id} className={`bg-slate-800/80 border ${task.isCompleted ? 'border-green-500/30' : 'border-purple-500/30'} rounded-xl p-4 relative overflow-hidden shadow-sm transition-all`}>
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.isCompleted ? 'bg-green-500' : 'bg-purple-500'}`}></div>

                                        {/* Header: Alert Icon + Content + Check Button */}
                                        <div className="flex justify-between items-start gap-3 mb-2">
                                            <div className="flex items-start gap-2 flex-1">
                                                {/* Exclamation Icon for emphasis */}
                                                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5 animate-pulse" />
                                                <h4 className={`font-medium text-sm ${task.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>{task.content}</h4>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleRoutineTask(task.id);
                                                }}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${task.isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}
                                            >
                                                {task.isCompleted ? (
                                                    <Check className="w-5 h-5" />
                                                ) : (
                                                    <CheckCircle2 className="w-5 h-5 opacity-50" />
                                                )}
                                            </button>
                                        </div>

                                        <div className="space-y-1.5 mb-2 pl-7"> {/* Indented to align with text */}
                                            {task.customerName && (
                                                <div className="flex items-center gap-2 text-sky-400 text-xs">
                                                    <User className="w-3 h-3 text-sky-500/70" /> {task.customerName}
                                                </div>
                                            )}
                                            {task.address && ( // ADDED ADDRESS
                                                <div className="flex items-center gap-2 text-amber-300/90 text-xs">
                                                    <MapPin className="w-3 h-3 text-amber-500/70" />
                                                    <span className="truncate">{task.address}</span>
                                                </div>
                                            )}
                                            {task.phoneNumber && (
                                                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                                                    <Phone className="w-3 h-3 text-emerald-500/70" />
                                                    <a href={`tel:${task.phoneNumber}`} className="hover:text-emerald-300 transition-colors">{task.phoneNumber}</a>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 border-t border-white/5 pt-2 ml-7">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(task.createdAt?.seconds * 1000).toLocaleDateString('tr-TR')}
                                            </span>
                                            <span className={task.isCompleted ? 'text-green-400 font-bold' : 'text-purple-400 font-medium'}>
                                                {task.isCompleted ? 'Tamamlandı' : 'Tamamlanmadı'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}


                        {/* --- MAIN TASKS SECTION --- */}
                        {/* Show section header only if showing routine tasks as well */}
                        {activeTab === 'tasks' && displayedRoutineTasks.length > 0 && (
                            <div className="flex items-center gap-2 text-blue-400 border-b border-blue-500/20 pb-2 mt-6">
                                <LayoutGrid className="w-4 h-4" />
                                <h3 className="text-sm font-bold uppercase tracking-wide">Saha Görevleri</h3>
                                <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full">{displayedTasks.length}</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            {displayedTasks.length === 0 && displayedRoutineTasks.length === 0 && (
                                <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center">
                                        <Search className="w-8 h-8 opacity-20" />
                                    </div>
                                    <span className="text-sm">
                                        {searchQuery ? 'Arama kriterlerine uygun iş bulunamadı.' : 'Görüntülenecek iş bulunamadı.'}
                                    </span>
                                </div>
                            )}

                            {displayedTasks.map(task => {
                                // COLOR CODING LOGIC
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
                                            <h4 className={`font-bold text-sm mb-2 line-clamp-2 ${task.checkStatus === 'missing' ? 'text-orange-100' : task.checkStatus === 'clean' ? 'text-emerald-100' : 'text-white'}`}>
                                                {task.title}
                                            </h4>

                                            <div className="flex items-center gap-2 text-amber-300/90 text-xs mb-3">
                                                <MapPin className="w-3 h-3 shrink-0 text-amber-500/70" />
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
                                                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-white/10 transition-colors"
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

                {/* VIEW: TASKS */}
                {activeTab === 'tasks' && (
                    <div className="px-4 py-2 space-y-4 pb-24">

                        {/* Management Tools - Mobile */}
                        {(userPermissions?.role === 'admin' || userPermissions?.canAccessRoutineTasks || userPermissions?.canAccessAssignment) && (
                            <div className="grid grid-cols-2 gap-3">
                                {(userPermissions?.role === 'admin' || userPermissions?.canAccessRoutineTasks) && (
                                    <button
                                        onClick={onOpenRoutineModal}
                                        className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-colors active:scale-95 transition-transform"
                                    >
                                        <Bell className="w-6 h-6 text-purple-400" />
                                        <span className="text-xs font-bold text-purple-300">Eksikler Havuzu</span>
                                    </button>
                                )}

                                {(userPermissions?.role === 'admin' || userPermissions?.canAccessAssignment) && (
                                    <button
                                        onClick={onOpenAssignmentModal}
                                        className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-colors active:scale-95 transition-transform"
                                    >
                                        <Users className="w-6 h-6 text-blue-400" />
                                        <span className="text-xs font-bold text-blue-300">Görev Dağıtımı</span>
                                    </button>
                                )}
                            </div>
                        )}
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

                            {userPermissions?.role === 'admin' && (
                                <button
                                    onClick={onOpenAdmin}
                                    className="w-full bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex items-center gap-3 text-purple-400 transition-colors border border-slate-700"
                                >
                                    <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-sm flex-1 text-left">Yönetim Paneli</span>
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                </button>
                            )}

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
