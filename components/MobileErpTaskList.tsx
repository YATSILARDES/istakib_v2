import React, { useState, useMemo, useRef } from 'react';
import { 
    ChevronLeft, Search, ArrowUpDown, Filter, SlidersHorizontal, 
    Plus, Phone, Share2, MapPin, Calendar, Star, X, 
    CheckCircle2, AlertTriangle, Clock, ChevronRight, Eye, Send, ChevronDown,
    Square
} from 'lucide-react';
import { Task, TaskStatus, StatusLabels, UserPermission, RoutineTask } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface MobileErpTaskListProps {
    title: string;
    tasks: Task[];
    routineTasks?: RoutineTask[];
    onToggleRoutineTask?: (taskId: string, currentStatus?: boolean) => void;
    onUpdateRoutineTask?: (taskId: string, updates: Partial<RoutineTask>) => void;
    user: FirebaseUser | null;
    userPermissions: UserPermission | null;
    onBackToMenu: () => void;
    onTaskClick: (task: Task) => void;
    onAddTask: () => void;
    onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
    onSwitchToClassic: () => void;
    currentFilterStatus?: TaskStatus | 'ALL';
    initialSearchQuery?: string;
}

const formatSafeDate = (dateVal: any) => {
    if (!dateVal) return '';
    try {
        if (typeof dateVal === 'string') {
            const datePart = dateVal.split(' ')[0];
            if (datePart.includes('.') || datePart.includes('-') || datePart.includes('/')) {
                return datePart;
            }
        }
        let d: Date | null = null;
        if (typeof dateVal === 'string' || typeof dateVal === 'number') {
            d = new Date(dateVal);
        } else if (dateVal instanceof Date) {
            d = dateVal;
        } else if (dateVal.toMillis && typeof dateVal.toMillis === 'function') {
            d = new Date(dateVal.toMillis());
        } else if (dateVal.seconds) {
            d = new Date(dateVal.seconds * 1000);
        } else if (dateVal._seconds) {
            d = new Date(dateVal._seconds * 1000);
        }
        if (!d || isNaN(d.getTime())) {
            return typeof dateVal === 'string' ? dateVal.split(' ')[0] : String(dateVal);
        }
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return typeof dateVal === 'string' ? dateVal.split(' ')[0] : String(dateVal);
    }
};

export const MobileErpTaskList: React.FC<MobileErpTaskListProps> = ({
    title,
    tasks,
    routineTasks,
    onToggleRoutineTask,
    onUpdateRoutineTask,
    user,
    userPermissions,
    onBackToMenu,
    onTaskClick,
    onAddTask,
    onTaskUpdate,
    onSwitchToClassic,
    currentFilterStatus,
    initialSearchQuery
}) => {
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');

    React.useEffect(() => {
        if (initialSearchQuery !== undefined) {
            setSearchQuery(initialSearchQuery);
        }
    }, [initialSearchQuery]);
    const [selectedDistrict, setSelectedDistrict] = useState<string>('');
    const [sortBy, setSortBy] = useState<'order_asc' | 'order_desc' | 'date_desc' | 'title_asc'>('order_asc');
    const [tabFilter, setTabFilter] = useState<'all' | 'main' | 'routine'>('all');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [statusModalTask, setStatusModalTask] = useState<Task | null>(null);
    const [selectedNewStatus, setSelectedNewStatus] = useState<TaskStatus>(TaskStatus.TO_CHECK);
    const [modalIsWaiting, setModalIsWaiting] = useState<boolean>(false);

    // Get all unique districts for filter
    const allDistricts = useMemo(() => {
        const set = new Set<string>();
        tasks.forEach(t => {
            if (t.district?.trim()) set.add(t.district.trim().toLocaleUpperCase('tr-TR'));
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr-TR'));
    }, [tasks]);

    // Share handler (matches TaskModal format exactly)
    const handleShare = async (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        const cleanAddress = (task.address || '').replace(/https?:\/\/[^\s]+/g, '').trim();

        let addressLine = cleanAddress;
        if (task.district) addressLine += ` / ${task.district}`;
        if (task.city) addressLine += ` / ${task.city}`;

        let shareText = `👤 ${task.title || 'Müşteri'}\n📞 ${task.phone || 'Telefon Yok'}\n🏠 ${addressLine || 'Adres Yok'}`;

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
                alert('Müşteri bilgileri panoya kopyalandı.');
            }
        } catch (err) {
            console.error('Share failed', err);
        }
    };

    // Filtered Routine Tasks (for My Tasks view)
    const filteredRoutineTasks = useMemo(() => {
        if (!routineTasks || routineTasks.length === 0) return [];
        if (tabFilter === 'main') return [];
        let list = routineTasks;
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
            list = list.filter(r =>
                (r.customerName && r.customerName.toLocaleLowerCase('tr-TR').includes(q)) ||
                (r.content && r.content.toLocaleLowerCase('tr-TR').includes(q)) ||
                (r.address && r.address.toLocaleLowerCase('tr-TR').includes(q)) ||
                (r.phoneNumber && r.phoneNumber.includes(q))
            );
        }
        return list;
    }, [routineTasks, tabFilter, searchQuery]);

    // Filter & Sort Logic for Main Tasks
    const filteredTasks = useMemo(() => {
        if (routineTasks && routineTasks.length > 0 && tabFilter === 'routine') return [];
        return tasks.filter(t => {
            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLocaleLowerCase('tr');
                const cleanPhone = searchQuery.trim().replace(/\D/g, '');
                const tPhone = (t.phone || '').replace(/\D/g, '');

                const titleMatch = (t.title || '').toLocaleLowerCase('tr').includes(q);
                const custMatch = ((t as any).customerName || '').toLocaleLowerCase('tr').includes(q);
                const addrMatch = (t.address || '').toLocaleLowerCase('tr').includes(q);
                const phoneMatch = (t.phone || '').includes(q) || (cleanPhone.length >= 3 && tPhone.includes(cleanPhone));
                const descMatch = (t.description || '').toLocaleLowerCase('tr').includes(q);
                const jobDescMatch = (t.jobDescription || '').toLocaleLowerCase('tr').includes(q);
                const noteMatch = (t.generalNote || '').toLocaleLowerCase('tr').includes(q) || (t.teamNote || '').toLocaleLowerCase('tr').includes(q);
                const orderMatch = String(t.orderNumber || '').includes(q);
                const districtMatch = (t.district || '').toLocaleLowerCase('tr').includes(q);
                if (!titleMatch && !custMatch && !addrMatch && !phoneMatch && !descMatch && !jobDescMatch && !noteMatch && !orderMatch && !districtMatch) {
                    return false;
                }
            }

            // District filter
            if (selectedDistrict && t.district?.trim().toLocaleUpperCase('tr-TR') !== selectedDistrict) {
                return false;
            }

            return true;
        }).sort((a, b) => {
            if (sortBy === 'order_asc') return (a.orderNumber || 0) - (b.orderNumber || 0);
            if (sortBy === 'order_desc') return (b.orderNumber || 0) - (a.orderNumber || 0);
            if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '', 'tr-TR');
            if (sortBy === 'date_desc') {
                const getTime = (task: Task) => {
                    if (task.scheduledDate?.seconds) return task.scheduledDate.seconds * 1000;
                    if (task.date) { const d = new Date(task.date); if (!isNaN(d.getTime())) return d.getTime(); }
                    return task.createdAt?.seconds ? task.createdAt.seconds * 1000 : 0;
                };
                return getTime(b) - getTime(a);
            }
            return 0;
        });
    }, [tasks, searchQuery, selectedDistrict, sortBy, routineTasks, tabFilter]);

    const canAddTasks = userPermissions?.canAddCustomers || userPermissions?.role === 'admin';
    const displayName = userPermissions?.name || user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';

    return (
        <div className="flex flex-col h-full bg-[#f3f4f6] font-sans overflow-hidden select-none">

            {/* --- TOP HEADER (MATCHING SCREENSHOT) --- */}
            <div className="bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00] text-white pt-3 pb-3.5 px-4 shadow-md shrink-0 flex items-center justify-between z-20">
                {/* Left: Circular Back Button */}
                <button
                    onClick={onBackToMenu}
                    className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center text-white transition-all shadow-xs"
                    title="Menüye Dön"
                >
                    <ChevronLeft className="w-6 h-6 stroke-[2.5] -ml-0.5" />
                </button>

                {/* Center: Title */}
                <div className="flex flex-col items-center flex-1 px-2">
                    <h1 className="font-bold text-[16px] text-white tracking-tight truncate max-w-[220px] text-center drop-shadow-xs">
                        {title}
                    </h1>
                    <span className="text-[11px] text-orange-100 font-medium">
                        {filteredTasks.length + filteredRoutineTasks.length} Kayıt Listeleniyor
                    </span>
                </div>

                {/* Right: Switch to classic or menu */}
                <button
                    onClick={onSwitchToClassic}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold border border-white/30 active:scale-95 transition-all"
                    title="Klasik Görünüme Geç"
                >
                    Klasik
                </button>
            </div>

            {/* --- SEARCH & ACTIONS ROW (WHITE BACKGROUND) --- */}
            <div className="bg-white px-3 py-2 border-b border-slate-200 flex items-center gap-2 shrink-0 z-10 shadow-xs">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Arama yap..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Sort Button */}
                <button
                    onClick={() => setIsSortMenuOpen(prev => !prev)}
                    className={`p-2 rounded-lg border transition-all ${
                        sortBy !== 'order_asc' 
                            ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-xs' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Sıralama"
                >
                    <ArrowUpDown className="w-4 h-4" />
                </button>

                {/* Filter Funnel Button (District Filter) */}
                <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`p-2 rounded-lg border transition-all relative ${
                        selectedDistrict 
                            ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-xs' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="İlçe Filtresi"
                >
                    <Filter className="w-4 h-4" />
                    {selectedDistrict && (
                        <span className="w-2 h-2 rounded-full bg-orange-600 absolute top-1 right-1" />
                    )}
                </button>
            </div>

            {/* --- SUB-TOOLBAR ROW (DARK SLATE #1e293b - CLEAN DESIGN, NO ÖNCELİKLİ/BEKLEYEN/BARKOD) --- */}
            <div className="bg-[#1e293b] text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-xs">
                {routineTasks && routineTasks.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        <button
                            onClick={() => setTabFilter('all')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                tabFilter === 'all'
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                            }`}
                        >
                            Tümü ({tasks.length + routineTasks.length})
                        </button>
                        <button
                            onClick={() => setTabFilter('main')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                tabFilter === 'main'
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                            }`}
                        >
                            İşler ({tasks.length})
                        </button>
                        <button
                            onClick={() => setTabFilter('routine')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                tabFilter === 'routine'
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                            }`}
                        >
                            Eksikler ({routineTasks.length})
                        </button>
                    </div>
                ) : (
                    <span className="text-[11px] font-semibold text-slate-300">
                        Toplam <strong className="text-orange-400 font-bold">{filteredTasks.length}</strong> İş Kaydı
                    </span>
                )}

                <div className="flex items-center gap-2">
                    {selectedDistrict && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded text-[10px] font-bold">
                            <span>{selectedDistrict}</span>
                            <button onClick={() => setSelectedDistrict('')}><X className="w-3 h-3" /></button>
                        </div>
                    )}
                    {routineTasks && routineTasks.length > 0 && (
                        <span className="text-[11px] font-semibold text-slate-300">
                            {filteredTasks.length + filteredRoutineTasks.length} Kayıt
                        </span>
                    )}
                </div>
            </div>

            {/* --- SORT MENU DROPDOWN (IF OPEN) --- */}
            {isSortMenuOpen && (
                <div className="bg-white border-b border-slate-200 px-4 py-2 shadow-md flex items-center justify-between text-xs z-20 animate-in fade-in duration-150">
                    <span className="font-bold text-slate-600 text-[11px]">Sıralama:</span>
                    <div className="flex gap-1.5 overflow-x-auto py-1">
                        {[
                            { id: 'order_asc', label: 'Sıra No (Artan)' },
                            { id: 'order_desc', label: 'Sıra No (Azalan)' },
                            { id: 'date_desc', label: 'En Yeni' },
                            { id: 'title_asc', label: 'İsim (A-Z)' }
                        ].map(s => (
                            <button
                                key={s.id}
                                onClick={() => { setSortBy(s.id as any); setIsSortMenuOpen(false); }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                                    sortBy === s.id 
                                        ? 'bg-orange-500 text-white font-bold shadow-xs' 
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* --- LIST CONTENT AREA (MATCHING THE SCREENSHOT ERP ROWS) --- */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 bg-white custom-scrollbar pb-24">
                {filteredTasks.length === 0 && filteredRoutineTasks.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                        <Search className="w-8 h-8 opacity-30 text-slate-400" />
                        <span className="text-xs font-medium">Bu kriterlere uygun iş kaydı bulunamadı.</span>
                        {(searchQuery || selectedDistrict) && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedDistrict('');
                                }}
                                className="mt-2 text-xs text-orange-600 font-bold underline"
                            >
                                Filtreleri Temizle
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                    {filteredTasks.map(task => {
                        const statusLabel = StatusLabels[task.status] || task.status;
                        const dateText = formatSafeDate(task.scheduledDate || task.date || task.createdAt);
                        const isClean = task.checkStatus === 'clean';
                        const isMissing = task.checkStatus === 'missing';

                        // Status Color Badges
                        let statusColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                        if (isMissing) {
                            statusColor = "text-rose-700 bg-rose-50 border-rose-200";
                        } else if (task.isWaiting) {
                            statusColor = "text-blue-700 bg-blue-50 border-blue-200";
                        } else if (task.status === TaskStatus.PROJECT_TO_BE_DRAWN) {
                            statusColor = "text-amber-800 bg-amber-50 border-amber-200";
                        } else if (task.status === TaskStatus.TO_CHECK) {
                            statusColor = "text-purple-700 bg-purple-50 border-purple-200";
                        }

                        return (
                            <div
                                key={task.id}
                                onClick={() => onTaskClick(task)}
                                className="px-3.5 py-3 hover:bg-orange-50/30 active:bg-orange-50/60 transition-colors flex items-start gap-3 cursor-pointer group relative"
                            >
                                {/* Left: Circle Thumbnail / Order Number */}
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/60 border border-orange-200 flex flex-col items-center justify-center shrink-0 text-orange-700 shadow-xs relative">
                                    <span className="text-[10px] font-bold text-slate-500 leading-none">NO</span>
                                    <span className="text-xs font-black leading-none mt-0.5">#{task.orderNumber || 0}</span>
                                    
                                    {/* Clickable Star on top-right of number */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTaskUpdate && onTaskUpdate(task.id, { isPriority: !task.isPriority });
                                        }}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center transition-all active:scale-125 z-10"
                                        title={task.isPriority ? "Önceliği Kaldır" : "Öncelikli İş Yap"}
                                    >
                                        <Star className={`w-3 h-3 ${task.isPriority ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400'}`} />
                                    </button>
                                </div>

                                {/* Content Details */}
                                <div className="flex-1 min-w-0">
                                    
                                    {/* Line 1: Customer Name (Orange), District, Status Badge */}
                                    <div className="flex items-center justify-between gap-1.5 mb-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {/* Customer Name in Bold Orange (Screenshot Style) */}
                                            <span className="font-extrabold text-[13px] text-[#e65100] uppercase tracking-tight truncate">
                                                {task.title}
                                            </span>

                                            {/* District / Order Code in Slate */}
                                            {task.district && (
                                                <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0">
                                                    · {task.district}
                                                </span>
                                            )}
                                        </div>

                                        {/* Status Tag on Top Right: Shows EKSİK VAR / TEMİZ if available */}
                                        {(isMissing || isClean) ? (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 tracking-tight leading-tight ${statusColor}`}>
                                                {isMissing ? 'EKSİK VAR' : 'TEMİZ'}
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* Line 2: Job description / Address */}
                                    <p className="text-[11.5px] font-medium text-slate-700 line-clamp-1 leading-snug">
                                        {task.address || task.description || 'Adres bilgisi girilmemiş'}
                                    </p>

                                    {/* Line 3: Date, Interactive Status Button (where red marker was drawn), and Actions */}
                                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100 gap-1.5">
                                        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-mono shrink-0">
                                            {dateText && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    {dateText}
                                                </span>
                                            )}
                                            {task.isWaiting && (
                                                <span className="bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[9.5px]">
                                                    BEKLİYOR
                                                </span>
                                            )}
                                        </div>

                                        {/* Middle (Red marker spot): Clickable Status Button to change status + Beklet */}
                                        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0 px-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setStatusModalTask(task);
                                                    setSelectedNewStatus(task.status);
                                                    setModalIsWaiting(task.isWaiting || false);
                                                }}
                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 max-w-full truncate active:scale-95 transition-all shadow-2xs hover:brightness-95 ${statusColor}`}
                                                title="Aşamayı Değiştir / Gönder"
                                            >
                                                <span className="truncate">{statusLabel}</span>
                                                <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
                                            </button>

                                            {/* Beklet / Beklemede Butonu (Gaz Açıldı aşamasındaysa) */}
                                            {onTaskUpdate && task.status === TaskStatus.GAS_OPENED && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTaskUpdate(task.id, { isWaiting: !task.isWaiting });
                                                    }}
                                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-all active:scale-95 shrink-0 flex items-center gap-1 shadow-2xs ${
                                                        task.isWaiting
                                                            ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                                                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                                    }`}
                                                    title={task.isWaiting ? "Beklemeden Çıkar" : "Beklemeye Al"}
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    <span>{task.isWaiting ? 'BEKLEMEDE' : 'BEKLET'}</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Action Icons */}
                                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {/* Kontrolü Onayla Butonu */}
                                            {task.isReassignedForCheck && onTaskUpdate && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTaskUpdate(task.id, { isReassignedForCheck: false });
                                                    }}
                                                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs active:scale-95 transition-all shrink-0"
                                                    title="Kontrolü Onayla"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>Kontrolü Onayla</span>
                                                </button>
                                            )}

                                            {/* WhatsApp / Share Button */}
                                            <button
                                                onClick={(e) => handleShare(task, e)}
                                                className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 active:scale-95 transition-all"
                                                title="Paylaş"
                                            >
                                                <Share2 className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Phone Call Button */}
                                            {task.phone && (
                                                <a
                                                    href={`tel:${task.phone}`}
                                                    className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[10.5px] font-bold active:scale-95 transition-all shadow-2xs"
                                                    title="Müşteriyi Ara"
                                                >
                                                    <Phone className="w-3 h-3" />
                                                    <span>Ara</span>
                                                </a>
                                            )}

                                            {/* Detail Arrow */}
                                            <button
                                                onClick={() => onTaskClick(task)}
                                                className="p-1 text-slate-400 hover:text-slate-600"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })}

                    {/* Routine Tasks (For Bana Atananlar / Eksiklerden Atananlar) */}
                    {filteredRoutineTasks.map(rt => {
                        const rtDate = formatSafeDate(rt.scheduledDate || rt.createdAt);
                        return (
                            <div
                                key={rt.id}
                                className="p-3.5 bg-amber-50/40 hover:bg-amber-50/70 transition-colors border-l-4 border-l-amber-500"
                            >
                                <div className="flex items-start gap-3">
                                    {onToggleRoutineTask && (
                                        <button
                                            onClick={() => onToggleRoutineTask(rt.id, rt.isCompleted)}
                                            className="mt-0.5 w-6 h-6 rounded-lg border-2 border-amber-500 bg-white flex items-center justify-center text-amber-600 active:scale-90 transition-all shrink-0 hover:bg-amber-100"
                                            title="Tamamla"
                                        >
                                            <CheckCircle2 className={`w-4 h-4 ${rt.isCompleted ? 'opacity-100 text-emerald-600' : 'opacity-25'}`} />
                                        </button>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                                    EKSİK / RUTİN
                                                </span>
                                                <span className="font-bold text-slate-800 text-xs truncate">
                                                    {rt.customerName || 'Müşteri Belirtilmemiş'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {/* Clickable Star for Routine Tasks */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUpdateRoutineTask && onUpdateRoutineTask(rt.id, { isPriority: !rt.isPriority });
                                                    }}
                                                    className="w-6 h-6 rounded-full bg-white border border-amber-200 shadow-2xs flex items-center justify-center transition-all active:scale-125"
                                                    title={rt.isPriority ? "Önceliği Kaldır" : "Öncelikli Yap"}
                                                >
                                                    <Star className={`w-3.5 h-3.5 ${rt.isPriority ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400'}`} />
                                                </button>
                                                {rtDate && (
                                                    <span className="text-[10px] font-semibold text-slate-400">
                                                        {rtDate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                                            {rt.content}
                                        </p>
                                        {(rt.address || rt.phoneNumber) && (
                                            <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-amber-200/60 text-xs">
                                                {rt.address ? (
                                                    <span className="text-slate-500 truncate text-[11px]">
                                                        {rt.address}
                                                    </span>
                                                ) : <span />}
                                                {rt.phoneNumber && (
                                                    <a
                                                        href={`tel:${rt.phoneNumber}`}
                                                        className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10.5px] font-bold shrink-0"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        <span>Ara</span>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>

            {/* FAB button */}
            {canAddTasks && (
                <button
                    onClick={onAddTask}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#e65100] via-[#f57c00] to-[#ff9800] text-white shadow-xl shadow-orange-600/40 hover:shadow-orange-600/60 flex items-center justify-center fixed bottom-6 right-4 z-30 active:scale-90 transition-all border-2 border-white/80"
                    title="Yeni Müşteri / İş Ekle"
                >
                    <Plus className="w-7 h-7 stroke-[2.5]" />
                </button>
            )}

            {/* --- DISTRICT FILTER MODAL (IF FUNNEL CLICKED) --- */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[75vh] flex flex-col p-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-sm text-slate-800">İlçe Filtresi</h3>
                            <button onClick={() => setIsFilterModalOpen(false)} className="p-1 text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-2 space-y-1">
                            <button
                                onClick={() => { setSelectedDistrict(''); setIsFilterModalOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                    selectedDistrict === '' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                Tüm İlçeler ({tasks.length})
                            </button>

                            {allDistricts.map(dist => {
                                const count = tasks.filter(t => t.district?.trim().toLocaleUpperCase('tr-TR') === dist).length;
                                return (
                                    <button
                                        key={dist}
                                        onClick={() => { setSelectedDistrict(dist); setIsFilterModalOpen(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                                            selectedDistrict === dist ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span>{dist}</span>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* --- STATUS CHANGER MODAL / BOTTOM SHEET WITH GÖNDER BUTTON --- */}
            {statusModalTask && (
                <div
                    className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
                    onClick={() => setStatusModalTask(null)}
                >
                    <div
                        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-5 py-3.5 bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00] text-white flex items-center justify-between shadow-xs shrink-0">
                            <div className="min-w-0">
                                <h3 className="font-black text-sm uppercase tracking-tight">İş Durumunu Değiştir</h3>
                                <p className="text-[11px] text-orange-100 font-medium truncate">
                                    {statusModalTask.title} • #{statusModalTask.orderNumber || 0}
                                </p>
                            </div>
                            <button
                                onClick={() => setStatusModalTask(null)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Status Options */}
                        <div className="p-4 overflow-y-auto space-y-2 flex-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Aktarılacak Aşamayı Seçin:
                            </span>
                            {Object.entries(StatusLabels).filter(([key]) => {
                                // Admin ve Manager tüm aşamaları görebilir
                                if (!userPermissions || userPermissions.role === 'admin' || userPermissions.role === 'manager') return true;
                                // Görevin mevcut aşamasını her zaman göster
                                if (statusModalTask && statusModalTask.status === key) return true;
                                // Personelin yetki verilen aşamaları
                                if (!userPermissions.allowedColumns) return false;
                                return userPermissions.allowedColumns.includes(key as TaskStatus);
                            }).map(([key, label]) => {
                                const isSelected = selectedNewStatus === key;
                                const isCurrent = statusModalTask.status === key;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => setSelectedNewStatus(key as TaskStatus)}
                                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${
                                            isSelected
                                                ? 'bg-orange-50 border-orange-500 shadow-xs ring-2 ring-orange-500/20'
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    isSelected
                                                        ? 'border-orange-500 bg-orange-500 text-white'
                                                        : 'border-slate-300 bg-white'
                                                }`}
                                            >
                                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-orange-950 font-black' : 'text-slate-700'}`}>
                                                {label}
                                            </span>
                                        </div>

                                        {isCurrent && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                                                Mevcut
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Gaz Açıldı Seçildiyse: Beklet Seçeneği */}
                            {selectedNewStatus === TaskStatus.GAS_OPENED && (
                                <div className="mt-3 p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-blue-950 block leading-tight">
                                                Bekletmeye Al
                                            </span>
                                            <span className="text-[10px] text-blue-600 font-medium">
                                                {modalIsWaiting ? 'İş gaz açıldı aşamasında beklemede kaydedilecek' : 'İsteğe bağlı beklemeye alabilirsiniz'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setModalIsWaiting(!modalIsWaiting)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all active:scale-95 shrink-0 ${
                                            modalIsWaiting
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {modalIsWaiting ? 'BEKLEMEDE' : 'BEKLET'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer with GÖNDER button */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => setStatusModalTask(null)}
                                className="flex-1 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onTaskUpdate && statusModalTask) {
                                        const updates: Partial<Task> = { status: selectedNewStatus };
                                        if (selectedNewStatus === TaskStatus.GAS_OPENED) {
                                            updates.gasOpeningDate = new Date().toISOString().split('T')[0];
                                            updates.isWaiting = modalIsWaiting;
                                        } else {
                                            updates.isWaiting = false;
                                        }
                                        onTaskUpdate(statusModalTask.id, updates);
                                    }
                                    setStatusModalTask(null);
                                }}
                                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/30 flex items-center justify-center gap-1.5 transition-all"
                            >
                                <Send className="w-4 h-4" />
                                <span>Gönder</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
