import React, { useState, useMemo } from 'react';
import { Home, Search, Plus, User, Bell, MapPin, Phone, Calendar, ChevronRight, ChevronDown, Filter, LogOut, KeyRound, LayoutGrid, List, CheckSquare, Clock, AlertTriangle, Check, CheckCircle2, Shield, Users, Share2 } from 'lucide-react';
import { Task, TaskStatus, StatusLabels, RoutineTask, UserPermission, StaffMember } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../src/firebase';

interface MobileLayoutProps {
    user: FirebaseUser | null;
    userPermissions: UserPermission | null;
    tasks: Task[];
    routineTasks: RoutineTask[];
    staffList: StaffMember[];
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
    staffList,
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
    const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
    // Helper: Get Display Name
    const displayName = userPermissions?.name || user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';
    const roleName = userPermissions?.role === 'admin' ? 'Yönetici' : 'Personel';

    // --- DATA FILTERING LOGIC ---

    // 1. My Items (Tasks & Routine Tasks)
    const myTasks = tasks.filter(t => t.assigneeEmail === user?.email);

    // 3. Filtered Tasks (Main Tasks)
    const filterTask = (task: Task) => {
        if (!searchQuery.trim()) return true;
        const lowerQ = searchQuery.toLocaleLowerCase('tr');
        const title = (task.title || '').toLocaleLowerCase('tr');
        const address = (task.address || '').toLocaleLowerCase('tr');
        const phone = (task.phone || '').toLocaleLowerCase('tr');
        // Task interface doesn't have customerName by default, checking generic description if needed or just skipping
        const desc = (task.description || '').toLocaleLowerCase('tr');
        return title.includes(lowerQ) || address.includes(lowerQ) || phone.includes(lowerQ) || desc.includes(lowerQ);
    };

    // Rename to avoid conflict
    const filteredMainTasks = myTasks.filter(t => {
        // Filter by Search
        if (!filterTask(t)) return false;

        // Filter by Date (Weekly Plan Logic)
        // Checks `scheduledDate` (new) or `date` (legacy string)
        let taskDate: Date | null = null;

        if (t.scheduledDate) {
            taskDate = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
        } else if (t.date) {
            // Handle legacy string date "YYYY-MM-DD" or "DD.MM.YYYY"
            // Assuming standard ISO or Turkish format. Let's try to parse.
            const d = new Date(t.date);
            if (!isNaN(d.getTime())) {
                taskDate = d;
            } else {
                // Try DD.MM.YYYY
                const parts = t.date.split('.');
                if (parts.length === 3) {
                    taskDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
            }
        }

        if (taskDate && !isNaN(taskDate.getTime())) {
            const today = new Date();
            taskDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const isToday = taskDate.getTime() === today.getTime();
            const isPast = taskDate.getTime() < today.getTime();

            // Show if Today OR (Past AND Not Completed)
            if (isToday) return true;
            if (isPast) return true; // Rollover

            return false; // Future -> HIDE
        }

        // If NO Date at all, show it? Or hide?
        // Existing logic was "Show".
        return true;
    }).sort((a, b) => {
        // Sort by Date (Scheduled > Created)
        const getDate = (t: Task) => {
            if (t.scheduledDate) return new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate).getTime();
            if (t.date) { const d = new Date(t.date); if (!isNaN(d.getTime())) return d.getTime(); }
            return t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
        };
        return getDate(a) - getDate(b);
    });

    const myRoutineTasks = routineTasks.filter(t => {
        // 1. Assignment Check
        const emailMatch = t.assigneeEmail && user?.email && t.assigneeEmail.toLowerCase() === user.email.toLowerCase();
        const nameMatch = userPermissions?.name && t.assignee === userPermissions.name;
        const isAssignedToMe = emailMatch || nameMatch;

        if (!isAssignedToMe) return false;

        // Check `scheduledDate` (New) or fall back to `createdAt` (Legacy)
        let filterDate: Date | null = null;
        let hasSchedule = false;

        if (t.scheduledDate) {
            filterDate = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
            hasSchedule = true;
        } else if (t.createdAt) {
            // Fallback: Check createdAt.
            // If createdAt is in the FUTURE, it means it's a legacy scheduled task (where schedule overwrote creation).
            // We must HIDE these too.
            const d = new Date(t.createdAt.seconds ? t.createdAt.seconds * 1000 : t.createdAt);
            const today = new Date();
            d.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            if (d.getTime() > today.getTime()) {
                return false; // HIDE Future CreatedAt (Legacy Schedule)
            }

            // If Backlog (Past/Today), Show it.
            return true;
        } else {
            return true;
        }

        if (hasSchedule && filterDate) {
            const today = new Date();
            filterDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const isToday = filterDate.getTime() === today.getTime();
            const isPast = filterDate.getTime() < today.getTime();

            if (isToday) return true;
            if (isPast && !t.isCompleted) return true; // Rollover

            return false; // Future -> Hide
        }

        return true;
    }).sort((a, b) => {
        // Sort by Date Ascending
        const getDate = (t: RoutineTask) => {
            if (t.scheduledDate) return new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate).getTime();
            return t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
        };
        return getDate(a) - getDate(b);
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
        // My Tasks (Already filtered by user) -> Apply Search & Date Logic
        // Note: filteredMainTasks already includes applySearch equivalent logic inside filterTask function
        // But wait, applySearch helper is used for Home tab. 
        // filteredMainTasks uses filterTask which replicates applySearch logic.
        // So we can just use filteredMainTasks directly.
        displayedTasks = filteredMainTasks;

        // Use myRoutineTasks (which is also date-filtered and sorted)
        // Check if myRoutineTasks needs search? 
        // Current logic: myRoutineTasks has NO search applied in its definition above?
        // Let's check myRoutineTasks definition. It ONLY filters by date/assignment.
        // So we should apply search to it.
        displayedRoutineTasks = applySearch(myRoutineTasks);
    }

    // --- ADMIN: Group tasks by staff for accordion view ---
    // Only show ACTIVE tasks: TO_CHECK status, today/past date, no checkStatus
    const tasksByStaff = useMemo(() => {
        if (userPermissions?.role !== 'admin' || !staffList || staffList.length === 0) return null;

        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today

        const grouped: Record<string, { tasks: Task[], routineTasks: RoutineTask[] }> = {};

        staffList.forEach(staff => {
            // Filter tasks: TO_CHECK, no checkStatus, scheduled for today or past
            const staffTasks = tasks.filter(t => {
                // Basic filters (status, checkStatus, assignee)
                const basicMatch = t.status === TaskStatus.TO_CHECK &&
                    !t.checkStatus &&
                    (t.assigneeEmail?.toLowerCase() === staff.email.toLowerCase() || t.assignee === staff.name);

                if (!basicMatch) return false;

                // Date filter: only today or past (not future)
                if (t.scheduledDate) {
                    const schedDate = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
                    return schedDate <= today;
                }
                return true; // No scheduled date = show it
            });

            // Filter routine tasks: incomplete, today or past
            const staffRoutines = routineTasks.filter(t => {
                const basicMatch = !t.isCompleted &&
                    (t.assigneeEmail?.toLowerCase() === staff.email.toLowerCase() || t.assignee === staff.name);

                if (!basicMatch) return false;

                // Date filter for routine tasks
                const date = t.scheduledDate || t.createdAt;
                if (date) {
                    const taskDate = new Date(date.seconds ? date.seconds * 1000 : date);
                    return taskDate <= today;
                }
                return true;
            });

            grouped[staff.name] = { tasks: staffTasks, routineTasks: staffRoutines };
        });

        return grouped;
    }, [userPermissions, staffList, tasks, routineTasks]);    // --- COMBINED SORTING LOGIC (Custom Order) ---
    const combinedTasks = React.useMemo(() => {
        if (activeTab !== 'tasks') return [];

        const mainItems = displayedTasks.map(t => ({
            type: 'main' as const,
            data: t,
            // Calculate sort date (Scheduled > Date > Created)
            getTime: () => {
                let d = t.scheduledDate ? t.scheduledDate : t.date;
                // Handle various formats
                if (t.scheduledDate?.seconds) return t.scheduledDate.seconds * 1000;
                if (typeof d === 'string') { const date = new Date(d); if (!isNaN(date.getTime())) return date.getTime(); }
                return t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
            },
            dailyOrder: t.dailyOrder || 0
        }));

        const routineItems = displayedRoutineTasks.map(t => ({
            type: 'routine' as const,
            data: t,
            getTime: () => {
                if (t.scheduledDate?.seconds) return t.scheduledDate.seconds * 1000;
                if (t.scheduledDate) return new Date(t.scheduledDate).getTime();
                return t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0;
            },
            dailyOrder: t.dailyOrder || 0
        }));

        return [...mainItems, ...routineItems].sort((a, b) => {
            // 1. Date Sort (Day Precision)
            const timeA = a.getTime();
            const timeB = b.getTime();
            const dayA = new Date(timeA).setHours(0, 0, 0, 0);
            const dayB = new Date(timeB).setHours(0, 0, 0, 0);

            if (dayA !== dayB) return dayA - dayB;

            // 2. Daily Order Sort
            const orderA = a.dailyOrder;
            const orderB = b.dailyOrder;

            // If both have order, use it
            if (orderA !== 0 && orderB !== 0) return orderA - orderB;

            // If one has order, it comes first? Or last? 
            // In Calendar we append new items (order=0) at the end. 
            // So ordered items (1,2,3) come before 0.
            if (orderA !== 0) return -1;
            if (orderB !== 0) return 1;

            // 3. Fallback: Routine first (Legacy preference)
            if (a.type !== b.type) return a.type === 'routine' ? -1 : 1;

            // 4. Fallback: Time
            return timeA - timeB;
        });
    }, [displayedTasks, displayedRoutineTasks, activeTab]);

    const handleShareTask = async (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        const cleanAddress = (task.address || '').replace(/https?:\/\/[^\s]+/g, '').trim();
        let addressLine = cleanAddress;
        if (task.district) addressLine += ` / ${task.district}`;
        if (task.city) addressLine += ` / ${task.city}`;

        let shareText = `👤 ${task.title}\n📞 ${task.phone || 'Telefon Yok'}\n🏠 ${addressLine || 'Adres Yok'}`;

        if (task.locationCoordinates) {
            shareText += `\n\n📍 Konum:\n${task.locationCoordinates}`;
        }

        const shareData = {
            title: 'Müşteri Bilgileri',
            text: shareText
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareText);
                alert('Bilgiler panoya kopyalandı.');
            }
        } catch (err) {
            console.error('Sharing failed', err);
        }
    };

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

            {/* HEADER (Only for Home & Tasks) - Premium Sticky Design */}
            {activeTab !== 'profile' && (
                <div className="sticky top-0 z-30 px-5 pt-6 pb-3 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/10 shrink-0 space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Merhaba,</h2>
                            <h1 className="text-xl font-bold text-white leading-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">{displayName}</h1>
                        </div>
                        {/* Conditional Add Button - Premium */}
                        {(userPermissions?.canAddCustomers || userPermissions?.role === 'admin') && (
                            <button
                                onClick={onAddTask}
                                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 text-white flex items-center justify-center active:scale-95 transition-all duration-200 hover:shadow-blue-500/50"
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    {/* Search Input - Enhanced */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="İş, müşteri, adres veya telefon ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 outline-none transition-all"
                            />
                        </div>
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

                        {/* --- HOME TAB LIST RENDER --- */}
                        {activeTab === 'home' && (
                            <div className="space-y-4 pt-2">
                                {displayedTasks.length === 0 ? (
                                    <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center">
                                            <Search className="w-8 h-8 opacity-20" />
                                        </div>
                                        <span className="text-sm">
                                            {searchQuery ? 'Arama kriterlerine uygun iş bulunamadı.' : 'Bu kategoride iş bulunmuyor.'}
                                        </span>
                                    </div>
                                ) : (
                                    displayedTasks.map(task => {
                                        // COLOR CODING LOGIC (Copied from below)
                                        let cardStyle = "bg-slate-800 border-slate-700/50";
                                        let badgeStyle = "bg-blue-500/20 text-blue-400";
                                        let shadowStyle = "";

                                        if (task.checkStatus === 'missing') {
                                            cardStyle = "bg-orange-950/30 border-orange-500/50";
                                            badgeStyle = "bg-orange-500/20 text-orange-400";
                                            shadowStyle = "shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]";
                                        } else if (task.checkStatus === 'clean') {
                                            cardStyle = "bg-emerald-950/40 border-emerald-500/40";
                                            badgeStyle = "bg-gradient-to-r from-emerald-500/30 to-emerald-600/20 text-emerald-300 border border-emerald-500/30";
                                            shadowStyle = "shadow-lg shadow-emerald-500/10";
                                        }

                                        return (
                                            <div
                                                key={task.id}
                                                className={`rounded-2xl p-4 border backdrop-blur-sm transition-all relative overflow-hidden active:scale-[0.98] ${cardStyle} ${shadowStyle}`}
                                            >
                                                <div className="flex justify-between items-start mb-2 relative z-10">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                                                        {StatusLabels[task.status]}
                                                    </span>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs text-slate-500 font-mono bg-slate-800/50 px-1.5 py-0.5 rounded">#{task.orderNumber}</span>
                                                        {task.district && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{task.district}</span>}
                                                    </div>
                                                </div>

                                                <div className="relative z-10">
                                                    <h4 className={`font-bold text-sm mb-2 line-clamp-2 ${task.checkStatus === 'missing' ? 'text-orange-100' : task.checkStatus === 'clean' ? 'text-emerald-100' : 'text-white'}`}>
                                                        {task.title}
                                                    </h4>

                                                    <div className="flex items-center gap-2 text-amber-300/90 text-xs mb-3 bg-amber-500/10 p-2 rounded-xl border border-amber-500/10">
                                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                                        <span className="truncate">{task.address || 'Adres Girilmemiş'}</span>
                                                    </div>

                                                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                                        <button
                                                            onClick={() => onTaskClick(task)}
                                                            className="flex items-center gap-2 text-slate-300 text-xs font-semibold hover:text-blue-400 transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl active:scale-95 border border-white/5"
                                                        >
                                                            <Calendar className="w-4 h-4" /> Detay
                                                        </button>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => handleShareTask(task, e)}
                                                                className="w-10 h-10 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20 transition-all active:scale-95"
                                                            >
                                                                <Share2 className="w-4 h-4" />
                                                            </button>

                                                            {task.phone && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        window.open(`tel:${task.phone}`);
                                                                    }}
                                                                    className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20 transition-all active:scale-95"
                                                                >
                                                                    <Phone className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* --- COMBINED TASKS LIST (Mixed & Ordered) - Only for Staff, NOT Admin --- */}
                        {activeTab === 'tasks' && userPermissions?.role !== 'admin' && (
                            <div className="space-y-4">
                                {combinedTasks.length === 0 ? (
                                    <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center">
                                            <Search className="w-8 h-8 opacity-20" />
                                        </div>
                                        <span className="text-sm">
                                            {searchQuery ? 'Arama kriterlerine uygun iş bulunamadı.' : 'Görüntülenecek iş bulunamadı.'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Optional Header for Today? */}
                                        <div className="flex items-center gap-2 text-slate-400 pb-2 border-b border-white/5">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">İş Listesi</span>
                                            <span className="bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full">{combinedTasks.length}</span>
                                        </div>

                                        {combinedTasks.map((item, index) => {
                                            if (item.type === 'routine') {
                                                const task = item.data as RoutineTask;
                                                return (
                                                    <div key={task.id} className={`bg-slate-800/80 border ${task.isCompleted ? 'border-green-500/30' : 'border-purple-500/30'} rounded-xl p-4 relative overflow-hidden shadow-sm transition-all`}>
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.isCompleted ? 'bg-green-500' : 'bg-purple-500'}`}></div>

                                                        {/* Header: Alert Icon + Content + Check Button */}
                                                        <div className="flex justify-between items-start gap-3 mb-2">
                                                            <div className="flex items-start gap-2 flex-1">
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
                                                                {task.isCompleted ? <Check className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 opacity-50" />}
                                                            </button>
                                                        </div>

                                                        <div className="space-y-1.5 mb-2 pl-7">
                                                            <div className="flex items-center justify-between gap-2">
                                                                {task.customerName ? (
                                                                    <div className="flex items-center gap-2 text-sky-400 text-xs">
                                                                        <User className="w-3 h-3 text-sky-500/70" /> {task.customerName}
                                                                    </div>
                                                                ) : <div />}

                                                                {task.district && (
                                                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-900/30 px-1.5 py-0.5 rounded uppercase whitespace-nowrap">{task.district}</span>
                                                                )}
                                                            </div>
                                                            {task.address && (
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
                                                );
                                            } else {
                                                const task = item.data as Task;
                                                let cardStyle = "bg-slate-800 border-slate-700/50";
                                                let badgeStyle = "bg-blue-500/20 text-blue-400";
                                                let shadowStyle = "";

                                                if (task.checkStatus === 'missing') {
                                                    cardStyle = "bg-orange-950/30 border-orange-500/50";
                                                    badgeStyle = "bg-orange-500/20 text-orange-400";
                                                    shadowStyle = "shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]";
                                                } else if (task.checkStatus === 'clean') {
                                                    cardStyle = "bg-emerald-950/30 border-emerald-500/50";
                                                    badgeStyle = "bg-emerald-500/20 text-emerald-400";
                                                    shadowStyle = "shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]";
                                                }

                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={`rounded-2xl p-4 border transition-all relative overflow-hidden ${cardStyle} ${shadowStyle}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                                                                {StatusLabels[task.status]}
                                                            </span>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs text-slate-500 font-mono">#{task.orderNumber}</span>
                                                                {task.district && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{task.district}</span>}
                                                            </div>
                                                        </div>

                                                        <div className="relative z-10">
                                                            <h4 className={`font-bold text-sm mb-2 line-clamp-2 ${task.checkStatus === 'missing' ? 'text-orange-100' : task.checkStatus === 'clean' ? 'text-emerald-100' : 'text-white'}`}>
                                                                {task.title}
                                                            </h4>

                                                            <div className="flex items-center gap-2 text-amber-300/90 text-xs mb-3">
                                                                <MapPin className="w-3 h-3 shrink-0 text-amber-500/70" />
                                                                <span className="truncate">{task.address || 'Adres Girilmemiş'}</span>
                                                            </div>

                                                            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                                                <button
                                                                    onClick={() => onTaskClick(task)}
                                                                    className="flex items-center gap-1.5 text-slate-400 text-xs font-medium hover:text-blue-400 transition-colors bg-white/5 px-3 py-1.5 rounded-lg active:scale-95"
                                                                >
                                                                    <Calendar className="w-3.5 h-3.5" /> Detay
                                                                </button>

                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={(e) => handleShareTask(task, e)}
                                                                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center border border-white/10 transition-colors"
                                                                    >
                                                                        <Share2 className="w-3.5 h-3.5" />
                                                                    </button>

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
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* VIEW: TASKS */}
                {activeTab === 'tasks' && (
                    <div className="flex flex-col h-full">

                        {/* Management Tools - Sticky Top */}
                        {(userPermissions?.role === 'admin' || userPermissions?.canAccessRoutineTasks || userPermissions?.canAccessAssignment) && (
                            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-xl px-4 py-3 border-b border-slate-800/50">
                                <div className="grid grid-cols-2 gap-3">
                                    {(userPermissions?.role === 'admin' || userPermissions?.canAccessRoutineTasks) && (
                                        <button
                                            onClick={onOpenRoutineModal}
                                            className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 hover:from-purple-500/20 hover:to-purple-600/10 border border-purple-500/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95"
                                        >
                                            <Bell className="w-5 h-5 text-purple-400" />
                                            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Eksikler Havuzu</span>
                                        </button>
                                    )}

                                    {(userPermissions?.role === 'admin' || userPermissions?.canAccessAssignment) && (
                                        <button
                                            onClick={onOpenAssignmentModal}
                                            className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 hover:from-blue-500/20 hover:to-blue-600/10 border border-blue-500/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95"
                                        >
                                            <Users className="w-5 h-5 text-blue-400" />
                                            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Görev Dağıtımı</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">

                            {/* ADMIN VIEW: Staff Accordion */}
                            {userPermissions?.role === 'admin' && tasksByStaff ? (
                                <>
                                    <div className="flex items-center gap-2 text-slate-400 pb-2 border-b border-white/5">
                                        <Users className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Personel İş Programları</span>
                                        <span className="bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full">{staffList.length}</span>
                                    </div>

                                    {staffList.map(staff => {
                                        const staffData = tasksByStaff[staff.name];
                                        const totalItems = (staffData?.tasks.length || 0) + (staffData?.routineTasks.length || 0);
                                        const isExpanded = expandedStaff === staff.name;

                                        return (
                                            <div key={staff.email} className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                                                {/* Accordion Header */}
                                                <button
                                                    onClick={() => setExpandedStaff(isExpanded ? null : staff.name)}
                                                    className="w-full flex items-center gap-3 p-4 text-left active:bg-white/5 transition-colors"
                                                >
                                                    {/* Avatar */}
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                        {staff.name.charAt(0).toUpperCase()}
                                                    </div>

                                                    {/* Name & Count */}
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-white text-sm">{staff.name}</h3>
                                                        <p className="text-xs text-slate-500">İş Programı</p>
                                                    </div>

                                                    {/* Badge & Chevron */}
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${totalItems > 0
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : 'bg-slate-700/50 text-slate-500'
                                                            }`}>
                                                            {totalItems} iş
                                                        </span>
                                                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                            <ChevronDown className="w-5 h-5 text-slate-500" />
                                                        </div>
                                                    </div>
                                                </button>

                                                {/* Accordion Content */}
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3 animate-fadeIn">
                                                        {totalItems === 0 ? (
                                                            <div className="text-center text-slate-500 py-4 text-sm">
                                                                Bu personele atanmış iş bulunmuyor.
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* Main Tasks */}
                                                                {staffData?.tasks.map(task => (
                                                                    <div
                                                                        key={task.id}
                                                                        onClick={() => onTaskClick(task)}
                                                                        className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/30 active:scale-[0.98] transition-transform cursor-pointer"
                                                                    >
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400">
                                                                                {StatusLabels[task.status]}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-500 font-mono">#{task.orderNumber}</span>
                                                                        </div>
                                                                        <h4 className="font-medium text-white text-sm mb-1 line-clamp-1">{task.title}</h4>
                                                                        {task.address && (
                                                                            <div className="flex items-center gap-1.5 text-amber-400/80 text-[11px]">
                                                                                <MapPin className="w-3 h-3" />
                                                                                <span className="truncate">{task.address}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}

                                                                {/* Routine Tasks */}
                                                                {staffData?.routineTasks.map(task => (
                                                                    <div
                                                                        key={task.id}
                                                                        className={`bg-purple-900/20 rounded-xl p-3 border ${task.isCompleted ? 'border-green-500/30' : 'border-purple-500/30'}`}
                                                                    >
                                                                        <div className="flex items-start gap-2">
                                                                            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                                                                            <div className="flex-1">
                                                                                <h4 className={`font-medium text-sm ${task.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                                                                                    {task.content}
                                                                                </h4>
                                                                                {task.customerName && (
                                                                                    <p className="text-xs text-sky-400 mt-1">{task.customerName}</p>
                                                                                )}
                                                                            </div>
                                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${task.isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                                                                                }`}>
                                                                                {task.isCompleted ? 'Tamam' : 'Bekliyor'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                /* STAFF VIEW: Empty - handled by combined tasks list above */
                                null
                            )}
                        </div>
                    </div>
                )}

                {/* VIEW: PROFILE - Premium Design */}
                {activeTab === 'profile' && (
                    <div className="px-4 py-4 space-y-6">
                        {/* Profile Card - Glassmorphism */}
                        <div className="relative overflow-hidden">
                            {/* Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent rounded-3xl" />

                            <div className="relative bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 flex flex-col items-center border border-white/10">
                                {/* Avatar with Gradient Ring */}
                                <div className="relative mb-4">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full blur-sm opacity-75 animate-pulse" />
                                    <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-2xl shadow-blue-900/50 border-2 border-white/20">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold text-white">{displayName}</h2>
                                <p className="text-slate-400 text-sm mt-1">{user?.email}</p>

                                {/* Role Badge - Premium */}
                                <div className={`mt-3 px-4 py-1.5 rounded-full border ${userPermissions?.role === 'admin'
                                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300'
                                    : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300'
                                    }`}>
                                    <span className="text-xs font-bold uppercase tracking-wider">{roleName}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions - Premium Cards */}
                        <div className="space-y-3">
                            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-2">Hesap İşlemleri</h3>

                            {userPermissions?.role === 'admin' && (
                                <button
                                    onClick={onOpenAdmin}
                                    className="w-full bg-gradient-to-r from-purple-500/10 to-purple-600/5 hover:from-purple-500/20 hover:to-purple-600/10 p-4 rounded-2xl flex items-center gap-4 text-purple-300 transition-all border border-purple-500/20 group active:scale-[0.98]"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-sm flex-1 text-left">Yönetim Paneli</span>
                                    <ChevronRight className="w-5 h-5 text-purple-500/50 group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}

                            <button
                                onClick={handlePasswordReset}
                                className="w-full bg-slate-800/60 hover:bg-slate-800 p-4 rounded-2xl flex items-center gap-4 text-white transition-all border border-slate-700/50 group active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-sm flex-1 text-left">Şifremi Değiştir</span>
                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button
                                onClick={onSignOut}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 p-4 rounded-2xl flex items-center gap-4 text-red-400 transition-all border border-red-500/20 group active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-sm flex-1 text-left">Çıkış Yap</span>
                                <ChevronRight className="w-5 h-5 text-red-500/50 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Version Footer */}
                        <div className="text-center pt-4">
                            <p className="text-[10px] text-slate-600">Onay Mühendislik V2.0.1</p>
                        </div>
                    </div>
                )}

            </div>

            {/* BOTTOM NAVIGATION BAR - Premium Design */}
            <div className="bg-gradient-to-t from-slate-900 via-slate-900 to-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 flex justify-around items-center h-[72px] pb-3 shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
                <button
                    onClick={() => setActiveTab('home')}
                    className={`flex flex-col items-center gap-1.5 w-20 py-2 rounded-2xl transition-all duration-300 ${activeTab === 'home'
                        ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 shadow-lg shadow-blue-500/10'
                        : 'hover:bg-white/5'}`}
                >
                    <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === 'home' ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' : ''}`}>
                        <Home className={`w-5 h-5 transition-colors ${activeTab === 'home' ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <span className={`text-[10px] font-semibold transition-colors ${activeTab === 'home' ? 'text-blue-400' : 'text-slate-500'}`}>Ana Sayfa</span>
                </button>

                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex flex-col items-center gap-1.5 w-20 py-2 rounded-2xl transition-all duration-300 ${activeTab === 'tasks'
                        ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 shadow-lg shadow-purple-500/10'
                        : 'hover:bg-white/5'}`}
                >
                    <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === 'tasks' ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30' : ''}`}>
                        <List className={`w-5 h-5 transition-colors ${activeTab === 'tasks' ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <span className={`text-[10px] font-semibold transition-colors ${activeTab === 'tasks' ? 'text-purple-400' : 'text-slate-500'}`}>İşlerim</span>
                </button>

                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center gap-1.5 w-20 py-2 rounded-2xl transition-all duration-300 ${activeTab === 'profile'
                        ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 shadow-lg shadow-emerald-500/10'
                        : 'hover:bg-white/5'}`}
                >
                    <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === 'profile' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30' : ''}`}>
                        <User className={`w-5 h-5 transition-colors ${activeTab === 'profile' ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <span className={`text-[10px] font-semibold transition-colors ${activeTab === 'profile' ? 'text-emerald-400' : 'text-slate-500'}`}>Profil</span>
                </button>
            </div>

        </div>
    );
}
