
import React, { useState, useMemo, useEffect } from 'react';
import { Task, RoutineTask, TaskStatus, StaffMember } from '../types';
import { X, User, ArrowRight, ArrowLeft, ClipboardList, CheckSquare, Printer, Plus, Trash2, Save, Pin, PinOff, Phone, MapPin, UserCircle } from 'lucide-react';
import AddressLink from './AddressLink';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  routineTasks: RoutineTask[];
  onAssignTask: (taskId: string, assigneeName: string, assigneeEmail?: string) => void;
  onAssignRoutineTask: (taskId: string, assigneeName: string, assigneeEmail?: string) => void;
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
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">

        {/* Başlık */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
          <div className="flex items-center gap-4">
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
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* İçerik Izgarası */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700">

          {/* SOL SÜTUN: Havuz (Atanmamış) */}
          <div className="flex flex-col bg-slate-900/50 min-h-0">
            <div className="p-3 bg-slate-800/50 border-b border-slate-700 font-medium text-slate-300 flex justify-between">
              <span>Havuz (Atanmamış İşler)</span>
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-400">
                {unassignedTasks.length + unassignedRoutineTasks.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-24">

              {/* Atanmamış Müşteri İşleri */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ClipboardList className="w-3 h-3" /> Kontrolü Yapılacak İşler
                </h4>
                <div className="space-y-2">
                  {unassignedTasks.length === 0 && <p className="text-sm text-slate-600 italic">Atanacak iş yok.</p>}
                  {unassignedTasks.map(task => (
                    <div key={task.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center justify-between group hover:border-slate-500 transition-colors">
                      <div>
                        <div className="font-medium text-slate-200 text-sm">{task.title}</div>
                        <div className="text-xs text-slate-500">
                          <AddressLink address={task.address} className="text-slate-500 hover:text-slate-300" />
                        </div>
                      </div>
                      <button
                        onClick={() => selectedStaffName && onAssignTask(task.id, selectedStaffName, selectedStaffEmail)}
                        disabled={!selectedStaffName}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-1.5 rounded-md transition-colors"
                        title="Personele Ata"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Atanmamış Eksikler */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CheckSquare className="w-3 h-3" /> Eksikler / Notlar
                </h4>
                <div className="space-y-2">
                  {unassignedRoutineTasks.length === 0 && <p className="text-sm text-slate-600 italic">Eksik kaydı yok.</p>}
                  {unassignedRoutineTasks.map(task => (
                    <div key={task.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-start justify-between group hover:border-slate-500 transition-colors">
                      <div className="pr-2 flex-1 overflow-hidden">
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
                                <AddressLink address={task.address} showIcon={true} className="text-amber-400 hover:text-amber-200" />
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-sm text-slate-300 break-all whitespace-pre-wrap">{task.content}</div>
                      </div>
                      <button
                        onClick={() => selectedStaffName && onAssignRoutineTask(task.id, selectedStaffName, selectedStaffEmail)}
                        disabled={!selectedStaffName}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-1.5 rounded-md transition-colors flex-shrink-0 mt-1"
                        title="Personele Ata"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* SAĞ SÜTUN: Personel Listesi (Atanmış) */}
          <div className="flex flex-col bg-slate-800/20 min-h-0">
            <div className="p-3 bg-blue-900/20 border-b border-slate-700 font-medium text-blue-200 flex justify-between">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" /> {selectedStaffName || 'Personel Seçiniz'} - İş Listesi
              </span>
              <span className="text-xs bg-blue-900/50 px-2 py-0.5 rounded text-blue-300">
                {staffTasks.length + staffRoutineTasks.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar print:overflow-visible">

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
                        <div className="text-xs text-slate-500">
                          <AddressLink address={task.address} className="text-slate-500 hover:text-slate-300" />
                        </div>
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
                                <AddressLink address={task.address} showIcon={true} className="text-amber-400 hover:text-amber-200" />
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-sm text-slate-300 break-all whitespace-pre-wrap">{task.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AssignmentModal;
