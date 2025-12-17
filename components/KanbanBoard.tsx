
import React, { useState } from 'react';
import { Task, TaskStatus, StatusLabels, RoutineTask } from '../types';
import { MoreVertical, ClipboardList, ClipboardCheck, Banknote, Flame, Wrench, Circle, Phone, MapPin, CheckCircle2, Search, CheckSquare, Square, UserCircle, Share2, PhoneCall } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  routineTasks: RoutineTask[];
  onTaskClick: (task: Task) => void;
  onToggleRoutineTask: (taskId: string) => void;
  visibleColumns?: TaskStatus[];
  showRoutineColumn?: boolean;
  myTasks?: Task[]; // Assigned Standard Tasks for the viewer
  staffName?: string; // Staff name for column header
}

const StatusIcon = ({ status }: { status: TaskStatus | 'ROUTINE' }) => {
  switch (status) {
    case 'ROUTINE': return <CheckSquare className="w-4 h-4 text-purple-400" />;
    case TaskStatus.TO_CHECK: return <ClipboardList className="w-4 h-4 text-slate-400" />;
    case TaskStatus.CHECK_COMPLETED: return <ClipboardCheck className="w-4 h-4 text-emerald-400" />;
    case TaskStatus.DEPOSIT_PAID: return <Banknote className="w-4 h-4 text-green-400" />;
    case TaskStatus.GAS_OPENED: return <Flame className="w-4 h-4 text-orange-400" />;
    case TaskStatus.SERVICE_DIRECTED: return <Wrench className="w-4 h-4 text-blue-400" />;
    default: return <Circle className="w-4 h-4 text-gray-400" />;
  }
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  routineTasks,
  onTaskClick,
  onToggleRoutineTask,
  visibleColumns,
  showRoutineColumn = true,
  myTasks = [], // Destructure NEW prop
  staffName // Destructure NEW prop
}) => {
  // State to track search queries for each column
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  // Define the order explicitly including the new column
  const allColumns = [
    TaskStatus.TO_CHECK,
    TaskStatus.CHECK_COMPLETED,
    TaskStatus.DEPOSIT_PAID,
    TaskStatus.GAS_OPENED,
    TaskStatus.SERVICE_DIRECTED
  ];

  const columns = visibleColumns
    ? allColumns.filter(col => visibleColumns.includes(col))
    : allColumns;

  const handleSearchChange = (status: string, value: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [status]: value
    }));
  };

  const getFilteredTasks = (status: TaskStatus) => {
    const term = (searchTerms[status] || '').toLocaleLowerCase('tr').trim();
    const columnTasks = tasks.filter(t => t.status === status);

    if (!term) return columnTasks;

    return columnTasks.filter(task => {
      return (
        task.title.toLocaleLowerCase('tr').includes(term) ||
        (task.jobDescription && task.jobDescription.toLocaleLowerCase('tr').includes(term)) ||
        task.orderNumber.toString().includes(term) ||
        (task.phone && task.phone.includes(term)) ||
        (task.address && task.address.toLocaleLowerCase('tr').includes(term))
      );
    });
  };

  // REWRITTEN: Returns { routine, standard } object
  const getFilteredPersonalTasks = () => {
    const term = (searchTerms['ROUTINE'] || '').toLocaleLowerCase('tr').trim();
    const matchesTerm = (text: string) => text.toLocaleLowerCase('tr').includes(term);

    // Sort Routine Tasks: Incomplete first, then by ASSIGNMENT TIME (User Request: "Sıralama yaparak atama"), then by creation
    const sortedRoutine = [...routineTasks].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }

      // 1. Sıralama Önceliği: Atanma Zamanı (Eğer atanmışsa)
      const aAssign = a.assignedAt?.toMillis?.() || a.assignedAt || 0;
      const bAssign = b.assignedAt?.toMillis?.() || b.assignedAt || 0;

      if (aAssign !== bAssign) {
        return aAssign - bAssign; // Eskiden yeniye (İlk atanan üstte)
      }

      // 2. Sıralama Önceliği: Oluşturulma Zamanı (Fallback)
      const aCreate = a.createdAt?.toMillis?.() || a.createdAt || 0;
      const bCreate = b.createdAt?.toMillis?.() || b.createdAt || 0;
      return aCreate - bCreate;
    });

    const filteredRoutine = !term ? sortedRoutine : sortedRoutine.filter(t =>
      matchesTerm(t.content) ||
      (t.customerName && matchesTerm(t.customerName)) ||
      (t.address && matchesTerm(t.address)) ||
      (t.phoneNumber && matchesTerm(t.phoneNumber))
    );

    // Filter Standard Tasks (myTasks)
    const filteredStandard = !term ? myTasks : myTasks.filter(t =>
      matchesTerm(t.title) ||
      matchesTerm(t.address || '') ||
      t.orderNumber.toString().includes(term)
    );

    return { routine: filteredRoutine, standard: filteredStandard };
  };

  // Destructure filtered results
  const { routine: filteredRoutine, standard: filteredStandard } = getFilteredPersonalTasks();

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
      <div className="flex gap-6 h-full min-w-[1500px]">
        {showRoutineColumn && (
          <div className="flex-1 flex flex-col min-w-[280px] bg-slate-100/80 rounded-2xl border border-slate-200 backdrop-blur-sm self-start max-h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-purple-500/5 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2 font-semibold text-purple-700">
                <StatusIcon status="ROUTINE" />
                <span className="truncate">{staffName ? `${staffName} Eksik Listesi` : 'Personel Eksik Listesi'}</span>
                <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 border border-purple-200 rounded-full text-purple-700">
                  {filteredRoutine.filter(t => !t.isCompleted).length + filteredStandard.length}
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-3 py-2 border-b border-slate-200">
              <div className="relative group">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Ara (İçerik, Müşteri...)"
                  value={searchTerms['ROUTINE'] || ''}
                  onChange={(e) => handleSearchChange('ROUTINE', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {/* STANDARD TASKS SECTION */}
              {filteredStandard.length > 0 && (
                <div className="mb-4 space-y-3">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pl-1">Saha Görevleri ({filteredStandard.length})</div>
                  {filteredStandard.map(t => (
                    <div
                      key={t.id}
                      onClick={() => onTaskClick(t)}
                      className={`
                        p-3.5 rounded-xl border transition-all cursor-pointer group shadow-sm hover:shadow-md hover:-translate-y-0.5
                        ${t.checkStatus === 'missing'
                          ? 'bg-slate-200 border-l-4 border-l-orange-500 border-slate-300 hover:border-orange-500/50'
                          : t.checkStatus === 'clean'
                            ? 'bg-slate-200 border-l-4 border-l-emerald-500 border-slate-300 hover:border-emerald-500/50'
                            : 'bg-slate-200 border-l-4 border-l-blue-500 border-slate-300 hover:border-blue-500/50'
                        }
                      `}

                    >
                      <div className="flex items-start gap-3">
                        {/* <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /> REMOVED Dot, using Border-L instead for cleaner look */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-700 font-medium leading-snug group-hover:text-blue-600 transition-colors">{t.title}</div>
                          {t.address && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {t.address}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">#{t.orderNumber}</span>
                            <span className="text-[10px] text-blue-600 font-medium">{StatusLabels[t.status]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ROUTINE TASKS SECTION */}
              {filteredRoutine.length > 0 && (
                <div className="space-y-3">
                  {filteredStandard.length > 0 && <div className="text-[10px] font-bold text-purple-600 uppercase tracking-widest pl-1 pt-2 border-t border-slate-200">Eksikler / Notlar ({filteredRoutine.length})</div>}
                  {filteredRoutine.map(t => (
                    <div key={t.id} className={`flex flex-col gap-2 p-3.5 rounded-xl border transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${t.isCompleted
                      ? 'bg-slate-100 border-slate-300 text-slate-500 opacity-60'
                      : 'bg-slate-200 border-slate-300 hover:border-purple-500/30'
                      }`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onToggleRoutineTask(t.id)}
                          className={`mt-0.5 flex-shrink-0 transition-colors ${t.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}
                        >
                          {t.isCompleted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Customer Info Badges */}
                          {(t.customerName || t.phoneNumber || t.address) && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                              {t.customerName && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                  <UserCircle className="w-3 h-3" /> {t.customerName}
                                </span>
                              )}
                              {t.phoneNumber && (
                                <a href={`tel:${t.phoneNumber}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100">
                                  <Phone className="w-3 h-3" /> {t.phoneNumber}
                                </a>
                              )}
                              {t.address && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100">
                                  <MapPin className="w-3 h-3" /> {t.address}
                                </span>
                              )}
                            </div>
                          )}

                          <div className={`text-sm break-words leading-relaxed whitespace-pre-wrap ${t.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {t.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredRoutine.length === 0 && filteredStandard.length === 0 && (
                <div className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-300/50 rounded-lg text-slate-400">
                  <span className="text-xs opacity-70">
                    {searchTerms['ROUTINE'] ? 'Sonuç bulunamadı' : 'Eksik iş yok'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- EXISTING KANBAN COLUMNS --- */}
        {columns.map((status) => {
          const filteredTasks = getFilteredTasks(status);
          const searchTerm = searchTerms[status] || '';

          return (
            <div key={status} className="flex-1 flex flex-col min-w-[280px] bg-slate-100/80 rounded-2xl border border-slate-200 backdrop-blur-sm">
              {/* Column Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <StatusIcon status={status} />
                  <span className="truncate">{StatusLabels[status]}</span>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-white border border-slate-200 rounded-full text-slate-500">
                    {tasks.filter(t => t.status === status).length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-3 py-2 border-b border-slate-200">
                <div className="relative group">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Ara (İsim, No, Adres...)"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(status, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Tasks Container */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {filteredTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={`
                      px-3.5 py-3.5 rounded-xl border transition-all cursor-pointer group relative shadow-sm hover:shadow-md hover:-translate-y-0.5
                      ${task.checkStatus === 'missing'
                        ? 'bg-slate-200 border-l-4 border-l-orange-500 border-slate-300 hover:border-orange-500/50'
                        : task.checkStatus === 'clean'
                          ? 'bg-slate-200 border-l-4 border-l-emerald-500 border-slate-300 hover:border-emerald-500/50'
                          : (!task.isProjectDrawn && task.status === TaskStatus.CHECK_COMPLETED)
                            ? 'bg-slate-200 border-l-4 border-l-orange-500 border-slate-300 hover:border-orange-500/50 shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]'
                            : 'bg-slate-200 border-l-4 border-l-slate-400 border-slate-300 hover:border-blue-500/50 hover:border-l-blue-500'
                      }
                    `}
                  >
                    {/* Row Number Badge - Compact */}
                    <div className={`absolute top-2 right-2 text-[10px] font-mono font-bold opacity-60 ${task.checkStatus === 'missing' ? 'text-orange-500' :
                      task.checkStatus === 'clean' ? 'text-emerald-500' : 'text-slate-400'
                      }`}>
                      #{task.orderNumber}
                    </div>

                    {/* Title */}
                    <h4 className={`font-medium text-sm leading-snug pr-8 mb-1.5 ${task.checkStatus === 'missing' ? 'text-orange-700' :
                      task.checkStatus === 'clean' ? 'text-emerald-700' :
                        (!task.isProjectDrawn && task.status === TaskStatus.CHECK_COMPLETED) ? 'text-orange-700' : 'text-slate-700'
                      }`}>
                      {task.title}
                      {task.jobDescription && <span className="ml-2 text-xs font-normal opacity-60 italic text-slate-500">({task.jobDescription})</span>}
                    </h4>

                    {/* PROJECT MISSING BADGE */}
                    {(!task.isProjectDrawn && task.status === TaskStatus.CHECK_COMPLETED) && (
                      <div className="mb-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white animate-pulse">
                        PROJE EKSİK
                      </div>
                    )}

                    {/* Address Only - Compact */}
                    {task.address && (
                      <div className={`flex items-center gap-1.5 text-xs ${task.checkStatus === 'missing' ? 'text-orange-600/70' :
                        task.checkStatus === 'clean' ? 'text-emerald-600/70' : 'text-slate-500'
                        }`}>
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[200px] text-inherit">{task.address}</span>
                      </div>
                    )}
                  </div>
                ))}

                {filteredTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-300/50 rounded-lg text-slate-400">
                    <span className="text-xs opacity-70">
                      {searchTerm ? 'Sonuç bulunamadı' : 'İş kaydı yok'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div >
  );
};

export default KanbanBoard;