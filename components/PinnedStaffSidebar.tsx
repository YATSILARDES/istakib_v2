import React, { useState } from 'react';
import { RoutineTask, Task, TaskStatus } from '../types';
import { ChevronRight, ChevronDown, CheckSquare, Square, UserCircle, Phone, MapPin, PinOff, AlertCircle } from 'lucide-react';
import AddressLink from './AddressLink';

interface PinnedStaffSidebarProps {
  pinnedStaff: string[];
  tasks: Task[]; // Normal Görevler (Referans için)
  routineTasks: RoutineTask[]; // Eksik Listesi
  onTaskClick: (task: Task) => void;
  onToggleRoutineTask: (taskId: string) => void;
  onToggleTaskVerification: (taskId: string) => void;
  onUnpin: (staffName: string) => void;
  onClose: () => void;
  isAdmin: boolean;
}

const PinnedStaffSidebar: React.FC<PinnedStaffSidebarProps> = ({
  pinnedStaff,
  tasks,
  routineTasks,
  onTaskClick,
  onToggleRoutineTask,
  onUnpin,
  onClose,
  isAdmin
}) => {
  // Hangi personelin listesi açık? (Accordian state)
  const [openStaff, setOpenStaff] = useState<Record<string, boolean>>({});

  const toggleStaff = (name: string) => {
    setOpenStaff(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Generate unique consistent color for each staff member
  const getStaffColor = (name: string) => {
    const colors = [
      'bg-blue-900/20 border-blue-700/40',
      'bg-purple-900/20 border-purple-700/40',
      'bg-emerald-900/20 border-emerald-700/40',
      'bg-amber-900/20 border-amber-700/40',
      'bg-rose-900/20 border-rose-700/40',
      'bg-cyan-900/20 border-cyan-700/40',
      'bg-pink-900/20 border-pink-700/40',
      'bg-indigo-900/20 border-indigo-700/40'
    ];

    // Simple hash to assign consistent color per name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Staff'a göre görevleri filtrele ve birleştir
  const getStaffCombinedTasks = (name: string) => {
    // 1. Rutin İşler (SIRALI: Atanma > Oluşturulma)
    const staffRoutineTasks = routineTasks.filter(t => t.assignee === name).sort((a, b) => {
      // 1. Tamamlanma durumu (Tamamlananlar en altta)
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }

      // 2. Atanma Zamanı
      const aAssign = a.assignedAt?.toMillis?.() || a.assignedAt || 0;
      const bAssign = b.assignedAt?.toMillis?.() || b.assignedAt || 0;

      if (aAssign !== bAssign) {
        return aAssign - bAssign;
      }

      // 3. Oluşturulma Zamanı
      const aCreate = a.createdAt?.toMillis?.() || a.createdAt || 0;
      const bCreate = b.createdAt?.toMillis?.() || b.createdAt || 0;
      return aCreate - bCreate;
    });

    // 2. Normal Görevler (Standart İşler)
    const staffStandardTasks = tasks.filter(t => t.assignee === name && t.status !== TaskStatus.CHECK_COMPLETED); // Tamamlananlar hariç mi? Genelde "Yapılacaklar" listesi burası. İsteğe göre değişir.
    // Kullanıcı "kontrol yapılacak işler görünmüyor" dediği için tüm aktif işleri gösterelim.

    // Tipleri birleştirip tek liste yapıyoruz (render aşamasında ayıracağız)
    return {
      routine: staffRoutineTasks,
      standard: staffStandardTasks
    };
  };



  return (
    <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col h-full overflow-hidden shadow-2xl z-20">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
        <div>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Sahadaki Personel
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Sabitlenen listeler burada görünür.</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-700 text-red-400 hover:text-red-300 rounded-lg transition-colors flex items-center gap-2 border border-red-500/20 bg-red-500/10"
          title="Paneli Gizle"
        >
          <span className="text-[10px] font-bold">GİZLE</span>
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {pinnedStaff.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center opacity-50 mt-10">
            <UserCircle className="w-12 h-12 mb-3 text-slate-600" />
            <p className="text-sm text-slate-400">Henüz personel eklenmedi.</p>
            <p className="text-xs text-slate-600 mt-1">Yönetici panelinden personel sabitleyebilirsiniz.</p>
          </div>
        )}

        {pinnedStaff.map(staffName => {
          const { routine, standard } = getStaffCombinedTasks(staffName);
          const pendingRoutineCount = routine.filter(t => !t.isCompleted).length;
          const pendingStandardCount = standard.length; // Hepsi aktif kabul edelim
          const totalCount = pendingRoutineCount + pendingStandardCount;

          const isOpen = openStaff[staffName] ?? true; // Default open
          const staffColorClass = getStaffColor(staffName);

          return (
            <div key={staffName} className={`${staffColorClass} border rounded-lg overflow-hidden transition-all`}>
              {/* Header */}
              <div
                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/50 transition-colors ${isOpen ? 'bg-slate-800' : ''}`}
                onClick={() => toggleStaff(staffName)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <button onClick={(e) => { e.stopPropagation(); toggleStaff(staffName); }}>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                  <span className="font-medium text-slate-200 truncate text-sm">{staffName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {totalCount > 0 && (
                    <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                      {totalCount}
                    </span>
                  )}
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUnpin(staffName); }}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Listeyi Kaldır"
                    >
                      <PinOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              {isOpen && (
                <div className="p-2 space-y-2 bg-slate-900/30 border-t border-slate-700/50">
                  {/* STANDARD TASKS SECTION (IF ANY) */}
                  {standard.length > 0 && (
                    <div className="space-y-1 mb-2">
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest pl-1">Saha Görevleri</div>
                      {standard.map(t => (
                        <div
                          key={t.id}
                          onClick={() => onTaskClick(t)}
                          className="p-2.5 rounded border border-blue-500/20 bg-blue-900/10 hover:bg-blue-900/20 hover:border-blue-500/40 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-blue-100 font-medium leading-snug">{t.title}</div>
                              {t.address && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-300/70 truncate">
                                  <AddressLink address={t.address} showIcon={true} className="text-blue-300/70 hover:text-white" />
                                </div>
                              )}
                              <div className="mt-1 text-[10px] text-slate-500 font-mono">#{t.orderNumber} - {t.status}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ROUTINE TASKS SECTION */}
                  {routine.length > 0 && (
                    <div className="space-y-1">
                      {standard.length > 0 && <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest pl-1 mt-3">Eksikler / Notlar</div>}
                      {routine.map(t => (
                        <div key={t.id} className={`p-2.5 rounded border transition-all ${t.isCompleted ? 'bg-slate-800/40 border-slate-700 opacity-60' : 'bg-slate-800 border-slate-600 hover:border-blue-500/50'}`}>
                          <div className="flex items-start gap-2.5">
                            <button
                              onClick={() => onToggleRoutineTask(t.id)}
                              className={`mt-0.5 flex-shrink-0 ${t.isCompleted ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-400'}`}
                            >
                              {t.isCompleted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              {/* Badges */}
                              {(t.customerName || t.phoneNumber) && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {t.customerName && <span className="text-[10px] px-1 bg-blue-900/40 text-blue-300 rounded border border-blue-500/20 truncate max-w-full">{t.customerName}</span>}
                                  {t.phoneNumber && <span className="text-[10px] px-1 bg-emerald-900/40 text-emerald-300 rounded border border-emerald-500/20">{t.phoneNumber}</span>}
                                </div>
                              )}

                              <div className={`text-xs leading-relaxed break-words whitespace-pre-wrap ${t.isCompleted ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                {t.content}
                              </div>

                              {t.address && (
                                <div className="mt-1.5 flex items-start gap-1 text-[10px] text-slate-500">
                                  <AddressLink address={t.address} showIcon={true} className="text-slate-500 hover:text-slate-300 truncate" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {routine.length === 0 && standard.length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-xs italic">
                      Görev yok.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PinnedStaffSidebar;
