
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

  const handleShareTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanAddress = (task.address || '').replace(/https?:\/\/[^\s]+/g, '').trim();
    let shareText = `👤 ${task.title}\n📞 ${task.phone || 'Telefon Yok'}\n🏠 ${cleanAddress || 'Adres Yok'}`;

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

  const handleShareRoutineTask = async (task: RoutineTask, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanAddress = (task.address || '').replace(/https?:\/\/[^\s]+/g, '').trim();
    let shareText = `📝 Eksik/Not\n👤 ${task.customerName || 'Müşteri Yok'}\n📞 ${task.phoneNumber || 'Telefon Yok'}\n🏠 ${cleanAddress || 'Adres Yok'}\n\n📄 İçerik: ${task.content}`;

    if (task.locationCoordinates) {
      shareText += `\n\n📍 Konum:\n${task.locationCoordinates}`;
    }

    const shareData = {
      title: 'Eksik Bilgisi',
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


  // Destructure filtered results
  const { routine: filteredRoutine, standard: filteredStandard } = getFilteredPersonalTasks();

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
      <div className="flex gap-6 h-full min-w-[1500px]">
        {showRoutineColumn && (
          <div className="flex-1 flex flex-col min-w-[280px] bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm">
            {/* Header */}
            <div className="p-4 border-b border-purple-500/20 bg-purple-900/10 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2 font-semibold text-purple-100">
                <StatusIcon status="ROUTINE" />
                <span className="truncate">{staffName ? `${staffName} Eksik Listesi` : 'Personel Eksik Listesi'}</span>
                <span className="ml-2 px-2 py-0.5 text-xs bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-200">
                  {filteredRoutine.filter(t => !t.isCompleted).length + filteredStandard.length}
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-3 py-2 border-b border-slate-700/30 bg-slate-800/30">
              <div className="relative group">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Ara (İçerik, Müşteri...)"
                  value={searchTerms['ROUTINE'] || ''}
                  onChange={(e) => handleSearchChange('ROUTINE', e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-md py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {/* STANDARD TASKS SECTION */}
              {filteredStandard.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest pl-1">Saha Görevleri ({filteredStandard.length})</div>
                  {filteredStandard.map(t => (
                    <div
                      key={t.id}
                      onClick={() => onTaskClick(t)}
                      className={`
                        p-3 rounded-lg border transition-all cursor-pointer group shadow-sm relative
                        ${t.checkStatus === 'missing'
                          ? 'bg-orange-900/40 border-orange-500/50 hover:border-orange-400 shadow-orange-900/10'
                          : t.checkStatus === 'clean'
                            ? 'bg-emerald-900/40 border-emerald-500/50 hover:border-emerald-400 shadow-emerald-900/10'
                            : 'border-blue-500/20 bg-blue-900/10 hover:bg-blue-900/20 hover:border-blue-500/40'
                        }
                      `}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-blue-100 font-medium leading-snug">{t.title}</div>
                          {t.address && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-blue-300/70 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {t.address}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-800/50 px-1.5 py-0.5 rounded">#{t.orderNumber}</span>
                            <span className="text-[10px] text-blue-300">{StatusLabels[t.status]}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons (Share & Call) */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {t.phone && (
                          <a
                            href={`tel:${t.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors border border-green-500/20"
                            title="Ara"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={(e) => handleShareTask(t, e)}
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/20"
                          title="Paylaş"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ROUTINE TASKS SECTION */}
              {filteredRoutine.length > 0 && (
                <div className="space-y-2">
                  {filteredStandard.length > 0 && <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest pl-1 pt-2 border-t border-slate-700/50">Eksikler / Notlar ({filteredRoutine.length})</div>}
                  {filteredRoutine.map(t => (
                    <div key={t.id} className={`flex flex-col gap-2 p-3 rounded-lg border transition-all relative ${t.isCompleted
                      ? 'bg-slate-800/30 border-slate-700/30 opacity-60'
                      : 'bg-indigo-900/20 border-indigo-500/30 hover:border-indigo-400/50 shadow-sm'
                      }`}>

                      {/* Share Button for Routine Task - Top Right */}
                      <button
                        onClick={(e) => handleShareRoutineTask(t, e)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors border border-indigo-500/20 z-10"
                        title="Paylaş"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onToggleRoutineTask(t.id)}
                          className={`mt-0.5 flex-shrink-0 transition-colors ${t.isCompleted ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}
                        >
                          {t.isCompleted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>

                        <div className="flex-1 min-w-0 pr-6"> {/* Added padding right for button space */}
                          {/* Customer Info Badges */}
                          {(t.customerName || t.phoneNumber || t.address) && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                              {t.customerName && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                  <UserCircle className="w-3 h-3" /> {t.customerName}
                                </span>
                              )}
                              {t.phoneNumber && (
                                <a href={`tel:${t.phoneNumber}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20">
                                  <Phone className="w-3 h-3" /> {t.phoneNumber}
                                </a>
                              )}
                              {t.address && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  <MapPin className="w-3 h-3" /> {t.address}
                                </span>
                              )}
                            </div>
                          )}

                          <div className={`text-sm break-words leading-relaxed whitespace-pre-wrap ${t.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {t.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredRoutine.length === 0 && filteredStandard.length === 0 && (
                <div className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-700/50 rounded-lg text-slate-500">
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
            <div key={status} className="flex-1 flex flex-col min-w-[280px] bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm">
              {/* Column Header */}
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  <StatusIcon status={status} />
                  <span className="truncate">{StatusLabels[status]}</span>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-slate-700 rounded-full text-slate-300">
                    {tasks.filter(t => t.status === status).length}
                  </span>
                </div>
                <button className="text-slate-500 hover:text-slate-300">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-3 py-2 border-b border-slate-700/30 bg-slate-800/30">
                <div className="relative group">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Ara (İsim, No, Adres...)"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(status, e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-md py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Tasks Container */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                {filteredTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={`
                      px-3 py-3 rounded-lg border transition-all cursor-pointer group relative
                      ${task.checkStatus === 'missing'
                        ? 'bg-orange-900/40 border-orange-500/50 hover:border-orange-400 shadow-orange-900/10'
                        : task.checkStatus === 'clean'
                          ? 'bg-emerald-900/40 border-emerald-500/50 hover:border-emerald-400 shadow-emerald-900/10'
                          : 'bg-slate-700/40 border-slate-600/30 hover:border-blue-500/30 hover:shadow-lg'
                      }
                    `}
                  >
                    {/* Row Number Badge - Compact */}
                    <div className={`absolute top-2 left-2 text-[10px] font-mono font-bold opacity-60 ${task.checkStatus === 'missing' ? 'text-orange-300' :
                      task.checkStatus === 'clean' ? 'text-emerald-300' : 'text-slate-500'
                      }`}>
                      #{task.orderNumber}
                    </div>

                    {/* Action Buttons: Phone & Share (Top Right) */}
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      {task.phone && (
                        <a
                          href={`tel:${task.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors border border-green-500/20 shadow-sm"
                          title="Ara"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={(e) => handleShareTask(task, e)}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/20 shadow-sm"
                        title="Paylaş"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title */}
                    <div className="mt-6"> {/* Spacing for top buttons */}
                      <h4 className={`font-medium text-sm leading-snug pr-2 mb-1.5 ${task.checkStatus === 'missing' ? 'text-orange-100' :
                        task.checkStatus === 'clean' ? 'text-emerald-100' : 'text-slate-200'
                        }`}>
                        {task.title}
                        {task.jobDescription && <span className="ml-2 text-xs font-normal opacity-60 italic">({task.jobDescription})</span>}
                      </h4>

                      {/* Address Only - Compact */}
                      {task.address && (
                        <div className={`flex items-center gap-1.5 text-xs ${task.checkStatus === 'missing' ? 'text-orange-200/70' :
                          task.checkStatus === 'clean' ? 'text-emerald-200/70' : 'text-slate-400'
                          }`}>
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-[200px] text-inherit">{task.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-700/50 rounded-lg text-slate-500">
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
    </div>
  );
};

export default KanbanBoard;