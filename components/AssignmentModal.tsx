
import React, { useState, useMemo, useEffect } from 'react';
import { Task, RoutineTask, TaskStatus, StaffMember } from '../types';
import { X, User, ArrowRight, ArrowLeft, ClipboardList, CheckSquare, Printer, Plus, Trash2, Save, Pin, PinOff, Phone, MapPin, UserCircle, ChevronDown, ChevronRight, Calendar, List, ChevronLeft } from 'lucide-react';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  routineTasks: RoutineTask[];
  onAssignTask: (taskId: string, assigneeName: string, assigneeEmail?: string, scheduledDate?: Date) => void;
  onAssignRoutineTask: (taskId: string, assigneeName: string, assigneeEmail?: string, scheduledDate?: Date) => void;
  staffList: StaffMember[];
  pinnedStaff: string[];
  onAddStaff: (name: string, email: string) => void;
  onRemoveStaff: (name: string) => void;
  onTogglePinStaff: (name: string) => void;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  tasks,
  routineTasks,
  onAssignTask,
  onAssignRoutineTask,
  staffList,
  pinnedStaff,
  onAddStaff,
  onRemoveStaff,
  onTogglePinStaff
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()); // Default to today

  // COLLAPSIBLE SECTIONS STATE (Mobile Focus)
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
    tasks.filter(t => t.status === TaskStatus.TO_CHECK && (!t.assignee || t.assignee.trim() === '' || t.assignee === 'Atanmadı')),
    [tasks]);

  const unassignedRoutineTasks = useMemo(() =>
    routineTasks.filter(t => !t.isCompleted && (!t.assignee || t.assignee.trim() === '' || t.assignee === 'Atanmadı')),
    [routineTasks]);

  // Derived Filtered Lists
  const filteredMainTasks = useMemo(() => {
    if (activeMainDistrict === 'Tümü') return unassignedTasks;
    return unassignedTasks.filter(t => t.district === activeMainDistrict);
  }, [unassignedTasks, activeMainDistrict]);

  const filteredRoutineTasks = useMemo(() => {
    if (activeRoutineDistrict === 'Tümü') return unassignedRoutineTasks;
    return unassignedRoutineTasks.filter(t => t.district === activeRoutineDistrict);
  }, [unassignedRoutineTasks, activeRoutineDistrict]);

  const staffTasks = useMemo(() =>
    tasks.filter(t => t.assignee === selectedStaffName)
      .sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)), // Sıra numarasına göre
    [tasks, selectedStaffName]);

  const staffRoutineTasks = useMemo(() =>
    routineTasks.filter(t => t.assignee === selectedStaffName && !t.isCompleted)
      .sort((a, b) => {
        // assignedAt'e göre sırala (Eskiden Yeniye -> İlk eklenen üstte)
        const aTime = a.assignedAt?.toMillis?.() || a.assignedAt || 0;
        const bTime = b.assignedAt?.toMillis?.() || b.assignedAt || 0;

        // Eğer assignedAt yoksa (eski kayıtlar), createdAt'e göre sırala
        if (aTime === 0 && bTime === 0) {
          const aCreate = a.createdAt?.toMillis?.() || a.createdAt || 0;
          const bCreate = b.createdAt?.toMillis?.() || b.createdAt || 0;
          return aCreate - bCreate;
        }

        return aTime - bTime;
      }),
    [routineTasks, selectedStaffName]);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[95dvh] md:h-[90vh]">

        {/* Başlık */}
        <div className="relative px-4 py-3 md:px-6 md:py-4 border-b border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-800">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto pr-8 md:pr-0">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <User className="w-6 h-6 text-blue-400" />
              Görev Dağıtımı & Liste Oluşturma
            </h2>

            <div className="h-6 w-px bg-slate-600 mx-2"></div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Personel:</label>

              {showAddStaffInput ? (
                <div className="flex items-center gap-2 animate-fadeIn bg-slate-800 p-1 rounded-lg border border-slate-700">
                  <div className="flex flex-col gap-1">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Ad Soyad..."
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      className="bg-slate-700 border border-slate-600 text-white text-xs rounded p-1.5 outline-none w-40 focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="E-posta adresi..."
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      className="bg-slate-700 border border-slate-600 text-white text-xs rounded p-1.5 outline-none w-40 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={handleAddNewStaff}
                      disabled={!newStaffName.trim() || !newStaffEmail.trim()}
                      className="bg-green-600 hover:bg-green-500 text-white p-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowAddStaffInput(false)}
                      className="bg-slate-600 hover:bg-slate-500 text-white p-1.5 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedStaffName}
                    onChange={(e) => setSelectedStaffName(e.target.value)}
                    className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none min-w-[200px]"
                  >
                    {staffList.map(member => (
                      <option key={member.name} value={member.name}>{member.name}</option>
                    ))}
                    {staffList.length === 0 && <option value="">Personel Ekleyin</option>}
                  </select>

                  <button
                    onClick={() => setShowAddStaffInput(true)}
                    className="bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 p-2 rounded-lg transition-all border border-blue-600/30"
                    title="Yeni Personel Ekle"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {selectedStaffName && (
                    <button
                      onClick={handleRemoveSelectedStaff}
                      className="bg-red-600/20 hover:bg-red-600 hover:text-white text-red-400 p-2 rounded-lg transition-all border border-red-600/30"
                      title="Seçili Personeli Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Seçili Personel Email Bilgisi */}
            {selectedStaffEmail && (
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700 hidden md:block">
                {selectedStaffEmail}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {selectedStaffName && (
              <button
                onClick={() => onTogglePinStaff(selectedStaffName)}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors border ${isPinned
                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/50 hover:bg-emerald-600/30'
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                  }`}
              >
                {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                {isPinned ? 'Ana Sayfadan Kaldır' : 'Ana Sayfada Sütun Aç'}
              </button>
            )}

            <button
              onClick={handlePrint}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
            >
              <Printer className="w-4 h-4" /> Yazdır
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition-colors absolute top-2 right-2 md:static">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* İçerik Izgarası */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700">

          {/* SOL SÜTUN: Havuz (Atanmamış) */}
          <div className="flex flex-col bg-slate-900/50 min-h-0">
            <div
              className="p-3 bg-slate-800/50 border-b border-slate-700 font-medium text-slate-300 flex justify-between cursor-pointer md:cursor-default"
              onClick={() => setIsPoolSectionExpanded(!isPoolSectionExpanded)}
            >
              <span className="flex items-center gap-2">
                <span className="md:hidden">
                  {isPoolSectionExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
                Havuz (Atanmamış İşler)
              </span>
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-400">
                {unassignedTasks.length + unassignedRoutineTasks.length}
              </span>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-24 ${!isPoolSectionExpanded ? 'hidden md:block' : ''}`}>

              {/* Atanmamış Müşteri İşleri */}
              <div className="mb-8 border border-slate-700/50 rounded-lg overflow-hidden md:border-none md:rounded-none">
                <div
                  className="sticky top-0 bg-slate-900/95 z-10 pb-2 pt-1 mb-2 border-b border-slate-800 cursor-pointer select-none"
                  onClick={() => setIsMainTasksExpanded(!isMainTasksExpanded)}
                >
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2 p-2">
                    {isMainTasksExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <ClipboardList className="w-3 h-3" /> Kontrolü Yapılacak İşler
                  </h4>

                  {/* Main Tasks District Filter - Only Show if Expanded */}
                  {isMainTasksExpanded && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-2" onClick={(e) => e.stopPropagation()}>
                      {['Tümü', ...Array.from(new Set(unassignedTasks.map(t => t.district).filter(Boolean)))].sort().map(dist => (
                        <button
                          key={dist}
                          onClick={() => setActiveMainDistrict(dist || 'Tümü')}
                          className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border ${activeMainDistrict === (dist || 'Tümü')
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                            }`}
                        >
                          {dist || 'Belirtilmemiş'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isMainTasksExpanded && (
                  <div className="space-y-2 px-2 pb-2">
                    {filteredMainTasks.length === 0 ? (
                      <p className="text-sm text-slate-600 italic py-2">
                        {activeMainDistrict !== 'Tümü' ? `"${activeMainDistrict}" için iş yok.` : 'Atanacak iş yok.'}
                      </p>
                    ) : (
                      filteredMainTasks.map(task => (
                        <div key={task.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center justify-between group hover:border-slate-500 transition-colors">
                          <div>
                            <div className="font-medium text-slate-200 text-sm">{task.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {task.district && (
                                <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                                  {task.district}
                                </span>
                              )}
                              <div className="text-xs text-slate-500">{task.address}</div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            {/* Atama Butonu (Tek Buton - Akıllı) */}
                            <button
                              onClick={() => {
                                if (!selectedStaffName) return;

                                // Smart Assignment Logic for Main Tasks
                                if (viewMode === 'week' && selectedDate) {
                                  onAssignTask(task.id, selectedStaffName, selectedStaffEmail, selectedDate);
                                } else {
                                  onAssignTask(task.id, selectedStaffName, selectedStaffEmail);
                                }
                              }}
                              disabled={!selectedStaffName}
                              className={`p-1.5 rounded-md transition-colors flex-shrink-0 text-white 
                                ${viewMode === 'week' && selectedDate
                                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                                  : 'bg-blue-600 hover:bg-blue-500'}`}
                              title={viewMode === 'week' && selectedDate
                                ? `${selectedDate.toLocaleDateString('tr-TR')} Tarihine Ata`
                                : "Personele Ata (Havuza)"}
                            >
                              {/* Always Arrow, but acts as calendar if date selected */}
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )))}
                  </div>
                )}
              </div>

              {/* Atanmamış Eksikler */}
              <div className="mb-4 border border-slate-700/50 rounded-lg overflow-hidden md:border-none md:rounded-none">
                <div
                  className="sticky top-0 bg-slate-900/95 z-10 pb-2 pt-1 mb-2 border-b border-slate-800 cursor-pointer select-none"
                  onClick={() => setIsRoutineTasksExpanded(!isRoutineTasksExpanded)}
                >
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2 p-2">
                    {isRoutineTasksExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <CheckSquare className="w-3 h-3" /> Eksikler / Notlar
                  </h4>

                  {/* Routine Tasks District Filter - Only show if Expanded */}
                  {isRoutineTasksExpanded && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-2" onClick={(e) => e.stopPropagation()}>
                      {['Tümü', ...Array.from(new Set(unassignedRoutineTasks.map(t => t.district).filter(Boolean)))].sort().map(dist => (
                        <button
                          key={dist}
                          onClick={() => setActiveRoutineDistrict(dist || 'Tümü')}
                          className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border ${activeRoutineDistrict === (dist || 'Tümü')
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                            }`}
                        >
                          {dist || 'Belirtilmemiş'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isRoutineTasksExpanded && (
                  <div className="space-y-2 px-2 pb-2">
                    {filteredRoutineTasks.length === 0 ? (
                      <p className="text-sm text-slate-600 italic py-2">
                        {activeRoutineDistrict !== 'Tümü' ? `"${activeRoutineDistrict}" için eksik yok.` : 'Eksik kaydı yok.'}
                      </p>
                    ) : (
                      filteredRoutineTasks.map(task => (
                        <div key={task.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-start justify-between group hover:border-slate-500 transition-colors">
                          <div className="pr-2 flex-1 overflow-hidden">
                            {/* Müşteri Bilgileri */}
                            {(task.customerName || task.phoneNumber || task.address || task.district) && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5 text-xs">
                                {task.district && (
                                  <span className="text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {task.district}
                                  </span>
                                )}
                                {task.customerName && (
                                  <span className="text-blue-400 flex items-center gap-1">
                                    <UserCircle className="w-3 h-3" /> {task.customerName}
                                  </span>
                                )}
                                {task.phoneNumber && (
                                  <a
                                    href={`tel:${task.phoneNumber}`}
                                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="w-3 h-3" /> {task.phoneNumber}
                                  </a>
                                )}
                                {task.address && (
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {task.address}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="text-sm text-slate-300 break-all whitespace-pre-wrap">{task.content}</div>
                            <div className="mt-1 flex justify-end">
                              <span className="text-[10px] text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-700/50">
                                {new Date(task.createdAt?.seconds ? task.createdAt.seconds * 1000 : task.createdAt).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          </div>

                          {/* Assignment Button - Context Aware Single Button */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => {
                                if (!selectedStaffName) return;

                                // Smart Assignment Logic
                                if (viewMode === 'week' && selectedDate) {
                                  // If Week Mode AND Date Selected -> Assign to Date
                                  onAssignRoutineTask(task.id, selectedStaffName, selectedStaffEmail, selectedDate);
                                } else {
                                  // Otherwise -> Standard Assign (Backlog / No specific schedule)
                                  onAssignRoutineTask(task.id, selectedStaffName, selectedStaffEmail);
                                }
                              }}
                              disabled={!selectedStaffName}
                              className={`p-1.5 rounded-md transition-colors flex-shrink-0 mt-1 text-white 
                                ${viewMode === 'week' && selectedDate
                                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                                  : 'bg-purple-600 hover:bg-purple-500'}`}
                              title={viewMode === 'week' && selectedDate
                                ? `${selectedDate.toLocaleDateString('tr-TR')} Tarihine Ata`
                                : "Personele Ata (Havuza)"}
                            >
                              {/* Always show Arrow, per user request. Maybe add a small indicator if dated? */}
                              {/* User said: "sadece ok işareti olsun takvim işaretinin görevini yapsın" */}
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* SAĞ SÜTUN: Personel Listesi (Atanmış) */}
          <div className="flex flex-col bg-slate-800/20 min-h-0">
            <div className="flex items-center justify-between p-3 bg-blue-900/20 border-b border-slate-700">
              <div
                className="font-medium text-blue-200 flex items-center gap-2 cursor-pointer md:cursor-default"
                onClick={() => setIsStaffListExpanded(!isStaffListExpanded)}
              >
                {/* Only show chevron on mobile */}
                <span className="md:hidden">
                  {isStaffListExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{selectedStaffName || 'Personel'} - </span>
                İş Programı
              </div>

              {/* View Toggle & Controls */}
              <div className="flex items-center gap-2">
                {/* Week Navigation (Only in Week Mode) */}
                {viewMode === 'week' && (
                  <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 mr-2">
                    <button
                      onClick={() => setWeekStartDate(d => new Date(d.setDate(d.getDate() - 7)))}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] px-2 text-slate-300 font-medium">
                      {weekStartDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - {new Date(new Date(weekStartDate).setDate(weekStartDate.getDate() + 6)).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                    <button
                      onClick={() => setWeekStartDate(d => new Date(d.setDate(d.getDate() + 7)))}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    title="Liste Görünümü"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'week' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    title="Haftalık Görünüm"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Conditionally render content on mobile based on state, always show on desktop */}
            <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar print:overflow-visible ${!isStaffListExpanded ? 'hidden md:block' : ''}`}>

              {viewMode === 'list' ? (
                /* LIST VIEW (Existing) */
                <div className="space-y-6">
                  {/* Personel Müşteri İşleri */}
                  <div>
                    <h4 className="text-xs font-bold text-blue-400/70 uppercase tracking-wider mb-2 flex items-center gap-2">
                      Görevler (Müşteri)
                    </h4>
                    <div className="space-y-2">
                      {(!selectedStaffName || staffTasks.length === 0) && <p className="text-sm text-slate-600 italic">Bu personele atanmış müşteri işi yok.</p>}
                      {staffTasks.map(task => (
                        <div key={task.id} className="bg-slate-700/40 border border-slate-600/50 rounded-lg p-3 flex items-center justify-between group hover:border-red-500/30 transition-colors">
                          <button
                            onClick={() => onAssignTask(task.id, '', undefined)}
                            className="bg-slate-700 hover:bg-red-500 hover:text-white text-slate-400 p-1.5 rounded-md transition-colors mr-3"
                            title="Havuz'a Gönder (Atamayı Kaldır)"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <div className="flex-1">
                            <div className="font-medium text-slate-200 text-sm">
                              <span className="text-xs text-blue-400 mr-1">#{task.orderNumber}</span>
                              {task.title}
                            </div>
                            <div className="text-xs text-slate-500">{task.address}</div>
                            {task.status !== TaskStatus.TO_CHECK && (
                              <div className="text-[10px] text-orange-400 mt-1">Durum: {task.status}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Personel Rutin İşleri */}
                  <div>
                    <h4 className="text-xs font-bold text-purple-400/70 uppercase tracking-wider mb-2 flex items-center gap-2">
                      Eksikler / Notlar
                    </h4>
                    <div className="space-y-2">
                      {(!selectedStaffName || staffRoutineTasks.length === 0) && <p className="text-sm text-slate-600 italic">Bu personele atanmış eksik yok.</p>}
                      {staffRoutineTasks.map(task => (
                        <div key={task.id} className="bg-slate-700/40 border border-slate-600/50 rounded-lg p-3 flex items-start justify-between group hover:border-red-500/30 transition-colors">
                          <button
                            onClick={() => onAssignRoutineTask(task.id, '', undefined)}
                            className="bg-slate-700 hover:bg-red-500 hover:text-white text-slate-400 p-1.5 rounded-md transition-colors mr-3 flex-shrink-0 mt-1"
                            title="Havuz'a Gönder (Atamayı Kaldır)"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <div className="flex-1 overflow-hidden">
                            {/* Müşteri Bilgileri */}
                            {(task.customerName || task.phoneNumber || task.address) && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5 text-xs">
                                {task.customerName && (
                                  <span className="text-blue-400 flex items-center gap-1">
                                    <UserCircle className="w-3 h-3" /> {task.customerName}
                                  </span>
                                )}
                                {task.phoneNumber && (
                                  <a
                                    href={`tel:${task.phoneNumber}`}
                                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="w-3 h-3" /> {task.phoneNumber}
                                  </a>
                                )}
                                {task.address && (
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {task.address}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="text-sm text-slate-300 break-all whitespace-pre-wrap">{task.content}</div>
                            <div className="mt-1 flex justify-end">
                              <span className="text-[10px] text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-700/50">
                                {new Date(task.createdAt?.seconds ? task.createdAt.seconds * 1000 : task.createdAt).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* WEEKLY VIEW */
                <div className="grid grid-cols-7 h-full min-w-[800px] gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                  {/* Render 7 Columns */}
                  {Array.from({ length: 7 }).map((_, i) => {
                    const dayDate = new Date(weekStartDate);
                    dayDate.setDate(weekStartDate.getDate() + i);

                    const dateStr = dayDate.toLocaleDateString('tr-TR');
                    const dayName = dayDate.toLocaleDateString('tr-TR', { weekday: 'long' });
                    const dayShortDate = dayDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric' });
                    const isToday = new Date().toDateString() === dayDate.toDateString();

                    // Filter Tasks for this day
                    const dayRoutineTasks = staffRoutineTasks.filter(t => {
                      // Check scheduledDate first (New Logic)
                      if (t.scheduledDate) {
                        const d = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
                        return d.toDateString() === dayDate.toDateString();
                      }
                      // Fallback to createdAt if NO scheduledDate?
                      // If we decouple, we should technically NOT show tasks here if they are 'backlog' (undated).
                      // But legacy data might rely on createdAt.
                      // Let's support legacy: If scheduledDate is missing, use createdAt.
                      // Wait, if I assign a date, I set scheduledDate.
                      // If I UNASSIGN, I might clear it?
                      // If I have a task created today and I schedule it for tomorrow.
                      // It has createdAt=Today, scheduledDate=Tomorrow.
                      // Here we iterate 'days'.
                      // If I check 'Today', I see tasks with scheduledDate=Today OR (scheduledDate=null AND createdAt=Today).

                      if (t.createdAt) {
                        // Only use createdAt if scheduledDate is missing
                        const d = new Date(t.createdAt.seconds ? t.createdAt.seconds * 1000 : t.createdAt);
                        return d.toDateString() === dayDate.toDateString();
                      }
                      return false;
                    });

                    // Filter Main Tasks for this day
                    const dayMainTasks = staffTasks.filter(t => {
                      if (!t.scheduledDate) return false;
                      const d = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
                      return d.toDateString() === dayDate.toDateString();
                    });

                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedDate(dayDate)} // Select this day
                        className={`flex flex-col border-r border-slate-700 last:border-0 transition-colors cursor-pointer
                           ${isToday ? 'bg-blue-900/10' : ''}
                           ${selectedDate && selectedDate.toDateString() === dayDate.toDateString() ? 'bg-blue-600/20 ring-1 ring-inset ring-blue-500' : 'hover:bg-slate-700/30'}
                         `}
                      >
                        {/* Column Header */}
                        <div className={`text-center py-2 border-b border-slate-700 ${isToday ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                          <div className="text-[10px] uppercase opacity-70">{dayName}</div>
                          <div className="text-xs">{dayShortDate}</div>
                          {/* Visual Indicator for Selection */}
                          {selectedDate && selectedDate.toDateString() === dayDate.toDateString() && (
                            <div className="mt-1">
                              <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Seçili</span>
                            </div>
                          )}
                        </div>

                        {/* Tasks Container */}
                        <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                          {/* Routine Tasks (Orange/Standard) */}
                          {dayRoutineTasks.map(t => (
                            <div key={t.id} className="bg-slate-700/80 border border-slate-600 rounded p-1.5 text-[10px] group relative hover:z-10 hover:shadow-lg transition-all">
                              <div className="line-clamp-3 text-slate-200 mb-1">{t.content}</div>
                              <div className="flex justify-between items-center opacity-60">
                                <span className="text-[9px] text-purple-300">Eksik</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Avoid selecting day when clicking unschedule
                                    onAssignRoutineTask(t.id, '', undefined);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 hover:text-red-400"
                                  title="Atamayı Kaldır"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Main Tasks (Blue/Distinct) */}
                          {dayMainTasks.map(t => (
                            <div key={t.id} className="bg-blue-900/40 border border-blue-700/50 rounded p-1.5 text-[10px] group relative hover:z-10 hover:shadow-lg transition-all">
                              <div className="font-semibold text-blue-200 mb-0.5 truncate">{t.title}</div>
                              <div className="line-clamp-2 text-slate-300 mb-1">{t.address}</div>
                              <div className="flex justify-between items-center opacity-60">
                                <span className="text-[9px] text-blue-300">Saha</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAssignTask(t.id, '', undefined); // Unassign
                                  }}
                                  className="opacity-0 group-hover:opacity-100 hover:text-red-400"
                                  title="Atamayı Kaldır"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {dayRoutineTasks.length === 0 && dayMainTasks.length === 0 && (
                            <div className="h-full flex items-center justify-center opacity-10">
                              {/* Hint text if selected */}
                              {selectedDate && selectedDate.toDateString() === dayDate.toDateString() ? (
                                <div className="text-[9px] text-center text-blue-300">İş Seçip<br />Atayın</div>
                              ) : (
                                <div className="w-full h-px bg-slate-500"></div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AssignmentModal;

// Re-trigger build
