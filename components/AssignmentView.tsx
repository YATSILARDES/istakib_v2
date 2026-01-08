import React, { useState, useMemo, useEffect } from 'react';
import { Task, RoutineTask, TaskStatus, StaffMember } from '../types';
import { User, ArrowRight, ArrowLeft, ClipboardList, CheckSquare, Printer, Plus, Trash2, Save, Pin, PinOff, Phone, MapPin, UserCircle, ChevronDown, ChevronRight, Calendar, List, ChevronLeft, X } from 'lucide-react';

interface AssignmentViewProps {
    tasks: Task[];
    routineTasks: RoutineTask[];
    onAssignTask: (taskId: string, assigneeName: string, assigneeEmail?: string, scheduledDate?: Date) => void;
    onAssignRoutineTask: (taskId: string, assigneeName: string, assigneeEmail?: string, scheduledDate?: Date) => void;
    staffList: StaffMember[];
    pinnedStaff: string[];
    onAddStaff: (name: string, email: string) => void;
    onRemoveStaff: (name: string) => void;
    onTogglePinStaff: (name: string) => void;
    onReorderTasks: (updates: { id: string, type: 'main' | 'routine', dailyOrder: number }[]) => void;
}

const AssignmentView: React.FC<AssignmentViewProps> = ({
    tasks,
    routineTasks,
    onAssignTask,
    onAssignRoutineTask,
    staffList,
    pinnedStaff,
    onAddStaff,
    onRemoveStaff,
    onTogglePinStaff,
    onReorderTasks
}) => {
    const [selectedStaffName, setSelectedStaffName] = useState<string>('');
    const [showAddStaffInput, setShowAddStaffInput] = useState(false);
    const [newStaffName, setNewStaffName] = useState('');
    const [newStaffEmail, setNewStaffEmail] = useState('');

    // DISTRICT FILTER STATE
    const [activeMainDistrict, setActiveMainDistrict] = useState<string>('Tümü');
    const [activeRoutineDistrict, setActiveRoutineDistrict] = useState<string>('Tümü');

    // VIEW MODE STATE (List vs Weekly)
    const [viewMode, setViewMode] = useState<'list' | 'week'>('week'); // Default week view for preview
    const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
        return new Date(d.setDate(diff));
    });

    // Weekly Planning State
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // COLLAPSIBLE SECTIONS STATE
    const [isMainTasksExpanded, setIsMainTasksExpanded] = useState(true);
    const [isRoutineTasksExpanded, setIsRoutineTasksExpanded] = useState(true);
    const [isStaffListExpanded, setIsStaffListExpanded] = useState(true);
    const [isPoolSectionExpanded, setIsPoolSectionExpanded] = useState(true);

    // Personel listesi değiştiğinde veya boşsa seçim yap
    useEffect(() => {
        if (staffList.length > 0) {
            if (!selectedStaffName || !staffList.some(s => s.name === selectedStaffName)) {
                setSelectedStaffName(staffList[0].name);
            }
        } else {
            setSelectedStaffName('');
        }
    }, [staffList, selectedStaffName]);

    // Seçili personelin emailini bul
    const selectedStaffMember = staffList.find(s => s.name === selectedStaffName);
    const selectedStaffEmail = selectedStaffMember?.email;

    // Verileri Filtrele
    const unassignedTasks = useMemo(() =>
        tasks.filter(t =>
            (t.status === TaskStatus.TO_CHECK || t.status === TaskStatus.DEPOSIT_PAID) &&
            (!t.checkStatus) &&
            (!t.assignee || t.assignee.trim() === '' || t.assignee === 'Atanmadı')
        ),
        [tasks]);

    const unassignedRoutineTasks = useMemo(() =>
        routineTasks.filter(t => !t.isCompleted && (!t.assignee || t.assignee.trim() === '' || t.assignee === 'Atanmadı')),
        [routineTasks]);

    const filteredMainTasks = useMemo(() => {
        if (activeMainDistrict === 'Tümü') return unassignedTasks;
        return unassignedTasks.filter(t => t.district === activeMainDistrict);
    }, [unassignedTasks, activeMainDistrict]);

    const filteredRoutineTasks = useMemo(() => {
        if (activeRoutineDistrict === 'Tümü') return unassignedRoutineTasks;
        return unassignedRoutineTasks.filter(t => t.district === activeRoutineDistrict);
    }, [unassignedRoutineTasks, activeRoutineDistrict]);

    const staffTasks = useMemo(() =>
        tasks.filter(t => t.assignee === selectedStaffName && !t.checkStatus)
            .sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)),
        [tasks, selectedStaffName]);

    const staffRoutineTasks = useMemo(() =>
        routineTasks.filter(t => t.assignee === selectedStaffName && !t.isCompleted)
            .sort((a, b) => {
                const aTime = a.assignedAt?.toMillis?.() || a.assignedAt || 0;
                const bTime = b.assignedAt?.toMillis?.() || b.assignedAt || 0;

                if (aTime === 0 && bTime === 0) {
                    const aCreate = a.createdAt?.toMillis?.() || a.createdAt || 0;
                    const bCreate = b.createdAt?.toMillis?.() || b.createdAt || 0;
                    return aCreate - bCreate;
                }
                return aTime - bTime;
            }),
        [routineTasks, selectedStaffName]);

    const handlePrint = () => {
        window.print();
    };

    const handleAddNewStaff = () => {
        if (newStaffName.trim() && newStaffEmail.trim()) {
            onAddStaff(newStaffName.trim(), newStaffEmail.trim());
            setSelectedStaffName(newStaffName.trim());
            setNewStaffName('');
            setNewStaffEmail('');
            setShowAddStaffInput(false);
        }
    };

    const handleRemoveSelectedStaff = () => {
        if (selectedStaffName) {
            onRemoveStaff(selectedStaffName);
        }
    };

    const isPinned = selectedStaffName ? pinnedStaff.includes(selectedStaffName) : false;

    // --- DRAG AND DROP HANDLERS ---
    const handleDragStart = (e: React.DragEvent, type: 'main' | 'routine', id: string) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type, id }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (!data.type || !data.id || !selectedStaffName) return;

            if (data.type === 'main') {
                onAssignTask(data.id, selectedStaffName, selectedStaffEmail, targetDate);
            } else if (data.type === 'routine') {
                onAssignRoutineTask(data.id, selectedStaffName, selectedStaffEmail, targetDate);
            }
        } catch (err) {
            console.error("Drop error:", err);
        }
    };

    return (
        <>
            {/* PRINT LAYOUT (Visible only when printing) */}
            <div className="hidden print:block p-8 bg-white text-black">
                {/* Header */}
                <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">{selectedStaffName || 'Personel'}</h1>
                        <p className="text-sm text-gray-600">İş Listesi ve Saha Programı</p>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold">{new Date().toLocaleDateString('tr-TR')}</div>
                        <div className="text-sm text-gray-500">
                            {viewMode === 'week' ? 'Haftalık Görünüm' : 'Günlük Liste'}
                        </div>
                    </div>
                </div>

                {/* Main Tasks Table */}
                {staffTasks.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5" /> Saha Görevleri
                        </h2>
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-800">
                                    <th className="py-2 w-12">No</th>
                                    <th className="py-2 w-48">Müşteri</th>
                                    <th className="py-2">Adres / Konum</th>
                                    <th className="py-2">İş Tanımı</th>
                                    <th className="py-2 w-32">Telefon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffTasks.map((t, i) => (
                                    <tr key={t.id} className="border-b border-gray-200">
                                        <td className="py-3 font-bold align-top">{t.orderNumber}</td>
                                        <td className="py-3 font-semibold align-top">{t.title}</td>
                                        <td className="py-3 align-top">{t.address || '-'}</td>
                                        <td className="py-3 align-top text-gray-700">{t.jobDescription || '-'}</td>
                                        <td className="py-3 align-top whitespace-nowrap">{t.phone || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Routine Tasks Table */}
                {staffRoutineTasks.length > 0 && (
                    <div className="mb-8 break-inside-avoid">
                        <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2 flex items-center gap-2">
                            <CheckSquare className="w-5 h-5" /> Eksikler ve Notlar
                        </h2>
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-800">
                                    <th className="py-2 w-48">Müşteri / İlgili</th>
                                    <th className="py-2">Açıklama / Eksik Detayı</th>
                                    <th className="py-2 w-64">Adres</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffRoutineTasks.map((t) => (
                                    <tr key={t.id} className="border-b border-gray-200">
                                        <td className="py-3 font-semibold align-top">{t.customerName || '-'}</td>
                                        <td className="py-3 align-top text-gray-700">{t.content}</td>
                                        <td className="py-3 align-top">{t.address || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Empty State */}
                {staffTasks.length === 0 && staffRoutineTasks.length === 0 && (
                    <div className="text-center py-20 text-gray-400 italic border-2 border-dashed border-gray-300 rounded-xl">
                        Bu personel için atanmış aktif bir iş kaydı bulunmamaktadır.
                    </div>
                )}

                {/* Footer */}
                <div className="fixed bottom-0 left-0 right-0 text-center text-[10px] text-gray-400 py-4 border-t border-gray-100">
                    İş Takibi v2 • {new Date().toLocaleString()} tarihinde oluşturulmuştur.
                </div>
            </div>

            {/* APP UI (Hidden when printing) */}
            <div className="flex flex-col h-full bg-slate-200 overflow-hidden animate-in fade-in duration-300 print:hidden">


                {/* HEADER BAR */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm z-10">

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="bg-blue-100 p-2 rounded-xl">
                            <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Görev Dağıtımı</h2>
                            <p className="text-xs text-slate-500 font-medium">Personel iş programı ve atama yönetimi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        {/* Staff Selector */}
                        <div className="flex items-center gap-2">
                            {showAddStaffInput ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-right-5 fade-in">
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Ad Soyad"
                                        value={newStaffName}
                                        onChange={(e) => setNewStaffName(e.target.value)}
                                        className="bg-white border border-slate-300 text-xs rounded-lg p-2 w-32 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="email"
                                        placeholder="E-posta"
                                        value={newStaffEmail}
                                        onChange={(e) => setNewStaffEmail(e.target.value)}
                                        className="bg-white border border-slate-300 text-xs rounded-lg p-2 w-32 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button onClick={handleAddNewStaff} disabled={!newStaffName.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition-colors"><Save className="w-4 h-4" /></button>
                                    <button onClick={() => setShowAddStaffInput(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-1.5 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <>
                                    <select
                                        value={selectedStaffName}
                                        onChange={(e) => setSelectedStaffName(e.target.value)}
                                        className="bg-transparent text-slate-700 font-bold text-sm outline-none cursor-pointer border-none focus:ring-0 min-w-[150px]"
                                    >
                                        {staffList.map(member => (
                                            <option key={member.name} value={member.name}>{member.name}</option>
                                        ))}
                                        {staffList.length === 0 && <option value="">Personel Ekleyin</option>}
                                    </select>

                                    <div className="h-4 w-px bg-slate-300" />

                                    <button onClick={() => setShowAddStaffInput(true)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors" title="Yeni Personel"><Plus className="w-4 h-4" /></button>
                                    {selectedStaffName && (
                                        <button onClick={handleRemoveSelectedStaff} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Personeli Sil"><Trash2 className="w-4 h-4" /></button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedStaffName && (
                            <button
                                onClick={() => onTogglePinStaff(selectedStaffName)}
                                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all border shadow-sm ${isPinned
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                {isPinned ? 'Ana Sayfadan Kaldır' : 'Sütun Aç'}
                            </button>
                        )}

                        <button
                            onClick={handlePrint}
                            className="bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-500 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-sm"
                        >
                            <Printer className="w-4 h-4" /> Yazdır
                        </button>
                    </div>
                </div>

                {/* MAIN CONTENT GRID */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/20 bg-slate-200">

                    {/* LEFT COLUMN: POOL (Unassigned) */}
                    <div className="flex flex-col min-h-0 bg-white/30 backdrop-blur-xl">
                        <div
                            className="bg-white/50 backdrop-blur px-4 py-3 border-b border-white/20 flex justify-between items-center cursor-pointer select-none lg:cursor-default sticky top-0 z-20"
                            onClick={() => setIsPoolSectionExpanded(!isPoolSectionExpanded)}
                        >
                            <div className="flex items-center gap-2">
                                <div className="bg-slate-100 p-1.5 rounded-lg">
                                    <ClipboardList className="w-4 h-4 text-slate-600" />
                                </div>
                                <span className="font-bold text-slate-700">Havuz (Atanmamış İşler)</span>
                                <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                                    {unassignedTasks.length + unassignedRoutineTasks.length}
                                </span>
                            </div>
                            <div className="lg:hidden">
                                {isPoolSectionExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            </div>
                        </div>

                        <div className={`flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-32 ${!isPoolSectionExpanded ? 'hidden lg:block' : ''}`}>

                            {/* 1. Müşteri İşleri (Main Tasks) */}
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden group/section">
                                <div
                                    className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex items-center justify-between cursor-pointer"
                                    onClick={() => setIsMainTasksExpanded(!isMainTasksExpanded)}
                                >
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        {isMainTasksExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        Kontrolü Yapılacak İşler
                                        <span className="bg-blue-100 text-blue-600 px-1.5 rounded py-0.5 text-[10px]">{unassignedTasks.length}</span>
                                    </h4>

                                    {/* District Filter */}
                                    {isMainTasksExpanded && (
                                        <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                                            {['Tümü', ...Array.from(new Set(unassignedTasks.map(t => t.district).filter(Boolean)))].sort().map(dist => (
                                                <button
                                                    key={dist}
                                                    onClick={() => setActiveMainDistrict(dist || 'Tümü')}
                                                    className={`text-[9px] px-2 py-0.5 rounded-md whitespace-nowrap transition-colors border ${activeMainDistrict === (dist || 'Tümü')
                                                        ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                                                >
                                                    {dist || 'Yok'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* List */}
                                {isMainTasksExpanded && (
                                    <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {filteredMainTasks.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400 text-xs italic">Listelenecek iş yok.</div>
                                        ) : (
                                            filteredMainTasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, 'main', task.id)}
                                                    className="bg-slate-200 border-2 border-slate-400 hover:border-blue-600 rounded-xl p-3 shadow-md transition-all hover:shadow-xl group flex items-center justify-between cursor-move active:scale-95 active:bg-blue-100"
                                                >
                                                    <div>
                                                        <div className="font-bold text-blue-950 text-sm flex items-center gap-2">
                                                            <span className="bg-blue-100 text-blue-700 px-1.5 rounded text-[10px]">#{task.orderNumber}</span>
                                                            {task.title}
                                                        </div>
                                                        {task.jobDescription && <div className="text-[11px] text-blue-900 mt-0.5 font-medium">{task.jobDescription}</div>}
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            {task.district && <span className="text-[10px] text-white bg-blue-600 px-2 py-0.5 rounded font-bold shadow-sm">{task.district}</span>}
                                                            <span className="text-[10px] text-red-700 font-semibold flex items-center gap-1"><MapPin className="w-3 h-3 text-red-500" /> {task.address}</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            if (!selectedStaffName) return;
                                                            if (viewMode === 'week' && !selectedDate) {
                                                                alert("Lütfen önce takvimden tarih seçiniz.");
                                                                return;
                                                            }
                                                            onAssignTask(task.id, selectedStaffName, selectedStaffEmail, viewMode === 'week' ? (selectedDate || undefined) : undefined);
                                                        }}
                                                        disabled={!selectedStaffName}
                                                        className={`ml-2 p-2 rounded-lg transition-colors shadow-sm ${viewMode === 'week' && selectedDate
                                                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                                            : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 2. Eksikler (Routine Tasks) */}
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden group/section">
                                <div
                                    className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex items-center justify-between cursor-pointer"
                                    onClick={() => setIsRoutineTasksExpanded(!isRoutineTasksExpanded)}
                                >
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        {isRoutineTasksExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        Eksikler / Notlar
                                        <span className="bg-purple-100 text-purple-600 px-1.5 rounded py-0.5 text-[10px]">{unassignedRoutineTasks.length}</span>
                                    </h4>

                                    {isRoutineTasksExpanded && (
                                        <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                                            {['Tümü', ...Array.from(new Set(unassignedRoutineTasks.map(t => t.district).filter(Boolean)))].sort().map(dist => (
                                                <button
                                                    key={dist}
                                                    onClick={() => setActiveRoutineDistrict(dist || 'Tümü')}
                                                    className={`text-[9px] px-2 py-0.5 rounded-md whitespace-nowrap transition-colors border ${activeRoutineDistrict === (dist || 'Tümü')
                                                        ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'}`}
                                                >
                                                    {dist || 'Yok'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* List */}
                                {isRoutineTasksExpanded && (
                                    <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {filteredRoutineTasks.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400 text-xs italic">Listelenecek eksik yok.</div>
                                        ) : (
                                            filteredRoutineTasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, 'routine', task.id)}
                                                    className="bg-slate-200 border-2 border-slate-400 hover:border-purple-600 rounded-xl p-3 shadow-md transition-all hover:shadow-xl group flex items-start justify-between cursor-move active:scale-95 active:bg-purple-100"
                                                >
                                                    <div className="flex-1">
                                                        {(task.customerName || task.phoneNumber) && (
                                                            <div className="flex flex-col gap-1 mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    {task.district && <span className="text-[9px] bg-purple-600 text-white px-2 py-0.5 rounded font-bold shadow-sm">{task.district}</span>}
                                                                    {task.customerName && <span className="text-[10px] font-bold text-purple-900">{task.customerName}</span>}
                                                                </div>
                                                                {task.address && <div className="text-[10px] text-purple-800 font-semibold flex items-center gap-1"><MapPin className="w-3 h-3 text-purple-600" /> {task.address}</div>}
                                                            </div>
                                                        )}
                                                        <p className="text-xs text-purple-950 font-medium whitespace-pre-wrap">{task.content}</p>
                                                        <div className="flex justify-end mt-1">
                                                            <span className="text-[9px] text-slate-400">{new Date(task.createdAt?.seconds ? task.createdAt.seconds * 1000 : task.createdAt).toLocaleDateString('tr-TR')}</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            if (!selectedStaffName) return;
                                                            if (viewMode === 'week' && !selectedDate) {
                                                                alert("Lütfen önce takvimden tarih seçiniz.");
                                                                return;
                                                            }
                                                            onAssignRoutineTask(task.id, selectedStaffName, selectedStaffEmail, viewMode === 'week' ? (selectedDate || undefined) : undefined);
                                                        }}
                                                        disabled={!selectedStaffName}
                                                        className={`ml-2 p-2 rounded-lg transition-colors shadow-sm mt-1 ${viewMode === 'week' && selectedDate
                                                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                                            : 'bg-purple-500 hover:bg-purple-600 text-white'}`}
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* RIGHT COLUMN: STAFF CALENDAR (Assigned) */}
                    <div className="flex flex-col min-h-0 bg-slate-100 shadow-xl shadow-slate-200/50 z-10 border-l border-slate-300">
                        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-20">
                            <div className="flex items-center gap-2 cursor-pointer lg:cursor-default" onClick={() => setIsStaffListExpanded(!isStaffListExpanded)}>
                                <div className="bg-blue-100 p-1.5 rounded-lg">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="font-bold text-slate-800">{selectedStaffName || 'Personel'}</span>
                                <span className="text-slate-400 text-sm font-normal">Programı</span>
                            </div>

                            {/* View Controls */}
                            <div className="flex items-center gap-2">
                                {viewMode === 'week' && (
                                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 shadow-inner">
                                        <button onClick={() => setWeekStartDate(d => new Date(d.setDate(d.getDate() - 7)))} className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-400 hover:text-slate-800 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="text-[10px] px-2 text-slate-500 font-bold tabular-nums">
                                            {weekStartDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - {new Date(new Date(weekStartDate).setDate(weekStartDate.getDate() + 6)).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                        </span>
                                        <button onClick={() => setWeekStartDate(d => new Date(d.setDate(d.getDate() + 7)))} className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-400 hover:text-slate-800 transition-all"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                )}

                                <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 shadow-inner">
                                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`} title="Liste"><List className="w-4 h-4" /></button>
                                    <button onClick={() => setViewMode('week')} className={`p-1.5 rounded-md transition-all ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`} title="Haftalık"><Calendar className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>

                        <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-200 ${!isStaffListExpanded ? 'hidden lg:block' : ''}`}>

                            {viewMode === 'week' ? (
                                // WEEK GRID
                                <div className="grid grid-cols-7 h-full min-w-[900px] gap-2">
                                    {Array.from({ length: 7 }).map((_, i) => {
                                        const dayDate = new Date(weekStartDate);
                                        dayDate.setDate(weekStartDate.getDate() + i);
                                        const isToday = new Date().toDateString() === dayDate.toDateString();
                                        const isSelected = selectedDate && selectedDate.toDateString() === dayDate.toDateString();

                                        const dayValues = {
                                            name: dayDate.toLocaleDateString('tr-TR', { weekday: 'long' }),
                                            date: dayDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric' })
                                        };

                                        // 1. FILTER TASKS FOR THIS DAY
                                        const dayRoutineTasks = staffRoutineTasks.filter(t => {
                                            const date = t.scheduledDate || t.createdAt;
                                            const d = new Date(date?.seconds ? date.seconds * 1000 : date);
                                            return d.toDateString() === dayDate.toDateString();
                                        });

                                        const dayMainTasks = staffTasks.filter(t => {
                                            if (!t.scheduledDate) return false;
                                            const d = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
                                            return d.toDateString() === dayDate.toDateString();
                                        });

                                        // 2. MERGE AND SORT BY dailyOrder
                                        interface MergedTask { id: string; type: 'main' | 'routine'; dailyOrder: number; data: any; }

                                        const allDayTasks: MergedTask[] = [
                                            ...dayRoutineTasks.map(t => ({ id: t.id, type: 'routine' as const, dailyOrder: t.dailyOrder || 0, data: t })),
                                            ...dayMainTasks.map(t => ({ id: t.id, type: 'main' as const, dailyOrder: t.dailyOrder || 0, data: t }))
                                        ].sort((a, b) => {
                                            // If dailyOrder is 0/undefined for both, fallback to standard sort
                                            if (a.dailyOrder === 0 && b.dailyOrder === 0) {
                                                if (a.type === b.type) return 0; // Keep relative if same type? Or sort by ID?
                                                // Default: Routine first then Main (legacy behavior)
                                                return a.type === 'routine' ? -1 : 1;
                                            }
                                            return a.dailyOrder - b.dailyOrder;
                                        });

                                        // 3. DROP HANDLER (REORDERING)
                                        const handleDayDrop = (e: React.DragEvent) => {
                                            e.preventDefault();
                                            try {
                                                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                                if (!data.type || !data.id || !selectedStaffName) return;

                                                // Determine Drop Index based on Y position
                                                const dropTarget = e.currentTarget;
                                                const tasksContainer = dropTarget.querySelector('.tasks-container');
                                                let newIndex = allDayTasks.length; // Default to append

                                                if (tasksContainer) {
                                                    const taskElements = Array.from(tasksContainer.children);
                                                    const dropY = e.clientY;

                                                    for (let idx = 0; idx < taskElements.length; idx++) {
                                                        const rect = taskElements[idx].getBoundingClientRect();
                                                        const centerY = rect.top + rect.height / 2;
                                                        if (dropY < centerY) {
                                                            newIndex = idx;
                                                            break;
                                                        }
                                                    }
                                                }

                                                // Construct New List
                                                const isInternalMove = allDayTasks.some(t => t.id === data.id);
                                                let newList = [...allDayTasks];

                                                if (isInternalMove) {
                                                    // Moving within same day: Remove old, insert at new
                                                    const oldIndex = newList.findIndex(t => t.id === data.id);
                                                    const [movedItem] = newList.splice(oldIndex, 1);
                                                    // Adjust index if we removed from above
                                                    if (newIndex > oldIndex) newIndex -= 1;
                                                    newList.splice(newIndex, 0, movedItem);
                                                } else {
                                                    // New item from outside
                                                    newList.splice(newIndex, 0, { id: data.id, type: data.type, dailyOrder: 0, data: {} });
                                                }

                                                // Recalculate Orders
                                                const updates = newList.map((t, index) => ({
                                                    id: t.id,
                                                    type: t.type,
                                                    dailyOrder: index + 1 // Start from 1
                                                }));

                                                // Call Handlers
                                                if (!isInternalMove) {
                                                    // First assign date
                                                    if (data.type === 'main') {
                                                        onAssignTask(data.id, selectedStaffName, selectedStaffEmail, dayDate);
                                                    } else {
                                                        onAssignRoutineTask(data.id, selectedStaffName, selectedStaffEmail, dayDate);
                                                    }
                                                    // Then update order after a short delay to allow assignment? 
                                                    // Better: Pass order to assignment? Setup doesn't support it easily.
                                                    // Implementation: Assign works, then we immediately fire Reorder.
                                                    // Since Reorder is by ID, it should work fine concurrently.
                                                }

                                                // Always fire reorder to save the new sequence
                                                onReorderTasks(updates);

                                            } catch (err) {
                                                console.error("Drop error:", err);
                                            }
                                        };

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => setSelectedDate(dayDate)}
                                                onDragOver={handleDragOver}
                                                onDrop={handleDayDrop}
                                                className={`flex flex-col rounded-xl border transition-all cursor-pointer relative overflow-hidden group/day
                                                ${isSelected
                                                        ? 'bg-blue-50/50 border-blue-400 ring-2 ring-blue-400/20 shadow-lg scale-[1.02] z-10'
                                                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                                                    }
                                            `}
                                            >
                                                <div className={`text-center py-2 border-b border-slate-100 ${isToday ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                                                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">{dayValues.name}</div>
                                                    <div className="text-sm font-bold">{dayValues.date}</div>
                                                </div>

                                                <div className="flex-1 p-1 space-y-1.5 overflow-y-auto custom-scrollbar tasks-container">
                                                    {allDayTasks.map(item => {
                                                        const t = item.data;
                                                        if (item.type === 'routine') {
                                                            return (
                                                                <div
                                                                    key={t.id}
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, 'routine', t.id)}
                                                                    className="bg-white border-l-2 border-l-purple-500 border border-slate-100 p-1.5 rounded shadow-sm text-[10px] group/task relative cursor-move hover:bg-purple-50"
                                                                >
                                                                    <div className="font-bold text-slate-700 truncate">{t.customerName || 'İsimsiz'}</div>
                                                                    <div className="line-clamp-2 text-slate-500 leading-tight">{t.content}</div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onAssignRoutineTask(t.id, '', undefined); }}
                                                                        className="absolute top-1 right-1 opacity-0 group-hover/task:opacity-100 text-red-400 hover:bg-red-50 rounded p-0.5 transition-all"
                                                                    ><X className="w-3 h-3" /></button>
                                                                </div>
                                                            );
                                                        } else {
                                                            return (
                                                                <div
                                                                    key={t.id}
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, 'main', t.id)}
                                                                    className="bg-white border-l-2 border-l-blue-500 border border-slate-100 p-1.5 rounded shadow-sm text-[10px] group/task relative cursor-move hover:bg-blue-50"
                                                                >
                                                                    <div className="font-bold text-slate-700 truncate">{t.title}</div>
                                                                    <div className="line-clamp-2 text-slate-500 leading-tight">{t.address}</div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onAssignTask(t.id, '', undefined); }}
                                                                        className="absolute top-1 right-1 opacity-0 group-hover/task:opacity-100 text-red-400 hover:bg-red-50 rounded p-0.5 transition-all"
                                                                    ><X className="w-3 h-3" /></button>
                                                                </div>
                                                            );
                                                        }
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // LIST GRID
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2 border-b border-blue-100 pb-2">
                                            <ClipboardList className="w-4 h-4" /> Müşteri İşleri
                                        </h3>
                                        <div className="space-y-2">
                                            {staffTasks.length === 0 && <p className="text-slate-400 text-xs italic">Kayıt yok.</p>}
                                            {staffTasks.map(t => (
                                                <div key={t.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group">
                                                    <button onClick={() => onAssignTask(t.id, '', undefined)} className="text-slate-300 hover:text-red-500 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-800">#{t.orderNumber} - {t.title}</div>
                                                        <div className="text-xs text-slate-500">{t.address}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2 border-b border-purple-100 pb-2">
                                            <CheckSquare className="w-4 h-4" /> Eksikler / Notlar
                                        </h3>
                                        <div className="space-y-2">
                                            {staffRoutineTasks.length === 0 && <p className="text-slate-400 text-xs italic">Kayıt yok.</p>}
                                            {staffRoutineTasks.map(t => (
                                                <div key={t.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group">
                                                    <button onClick={() => onAssignRoutineTask(t.id, '', undefined)} className="text-slate-300 hover:text-red-500 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-800">{t.customerName}</div>
                                                        <div className="text-xs text-slate-500 line-clamp-1">{t.content}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default AssignmentView;
