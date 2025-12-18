import React, { useState } from 'react';
import { RoutineTask, TaskStatus, StatusLabels } from '../types';
import { X, Plus, User, Trash2, CalendarCheck, CheckSquare, Square, Phone, MapPin, UserCircle, ArrowRightCircle, Check, Pencil, Save, XCircle, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import LocationPreviewModal from './LocationPreviewModal';

interface RoutineTasksViewProps {
    tasks: RoutineTask[];
    onAddTask: (content: string, assignee: string, customerName?: string, phoneNumber?: string, address?: string, locationCoordinates?: string, district?: string, city?: string, customDate?: string) => void;
    onToggleTask: (taskId: string) => void;
    onDeleteTask: (taskId: string) => void;
    onConvertTask: (taskId: string, targetStatus: TaskStatus) => void;
    onUpdateTask: (taskId: string, updatedData: Partial<RoutineTask>) => void;
}

const RoutineTasksView: React.FC<RoutineTasksViewProps> = ({
    tasks,
    onAddTask,
    onToggleTask,
    onDeleteTask,
    onConvertTask,
    onUpdateTask
}) => {
    const [customerName, setCustomerName] = useState('');
    const [newTaskContent, setNewTaskContent] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [locationCoordinates, setLocationCoordinates] = useState('');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [district, setDistrict] = useState('');
    const [city, setCity] = useState('');
    const [customDate, setCustomDate] = useState('');

    // Edit State
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

    // Conversion State
    const [convertingTaskId, setConvertingTaskId] = useState<string | null>(null);
    const [targetStatus, setTargetStatus] = useState<TaskStatus>(TaskStatus.TO_CHECK);

    // Collapsible Form State
    const [isAddFormExpanded, setIsAddFormExpanded] = useState(true);

    // Filter State
    const [activeTab, setActiveTab] = useState<'pool' | 'assigned' | 'completed'>('pool');
    const [activeDistrict, setActiveDistrict] = useState<string>('Tümü');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskContent.trim()) {
            if (editingTaskId) {
                onUpdateTask(editingTaskId, {
                    content: newTaskContent,
                    customerName,
                    phoneNumber,
                    address,
                    locationCoordinates,
                    district,
                    city
                });
                setEditingTaskId(null);
            } else {
                onAddTask(newTaskContent, '', customerName, phoneNumber, address, locationCoordinates, district, city, customDate);
            }

            setNewTaskContent('');
            setCustomerName('');
            setPhoneNumber('');
            setAddress('');
            setLocationCoordinates('');
            setCustomDate('');
        }
    };

    const handleEditClick = (task: RoutineTask) => {
        setEditingTaskId(task.id);
        setNewTaskContent(task.content);
        setCustomerName(task.customerName || '');
        setPhoneNumber(task.phoneNumber || '');
        setAddress(task.address || '');
        setDistrict(task.district || '');
        setCity(task.city || '');
        setLocationCoordinates(task.locationCoordinates || '');
        setIsAddFormExpanded(true);
    };

    const cancelEdit = () => {
        setEditingTaskId(null);
        setNewTaskContent('');
        setCustomerName('');
        setPhoneNumber('');
        setAddress('');
        setDistrict('');
        setCity('');
        setLocationCoordinates('');
        setCustomDate('');
    };

    const handleStartConversion = (taskId: string) => {
        setConvertingTaskId(taskId);
        setTargetStatus(TaskStatus.TO_CHECK);
    };

    const handleConfirmConversion = () => {
        if (convertingTaskId) {
            onConvertTask(convertingTaskId, targetStatus);
            setConvertingTaskId(null);
        }
    };

    // Filter Logic
    const poolTasks = tasks.filter(t => !t.isCompleted && (!t.assignee || t.assignee.trim() === ''));
    const assignedTasks = tasks.filter(t => !t.isCompleted && t.assignee && t.assignee.trim() !== '');
    const doneTasks = tasks.filter(t => t.isCompleted);

    const uniqueDistricts = ['Tümü', ...Array.from(new Set(poolTasks.map(t => t.district).filter(d => d && d.trim() !== ''))).sort()];

    const filteredPoolTasks = activeDistrict === 'Tümü'
        ? poolTasks
        : poolTasks.filter(t => t.district === activeDistrict);

    const renderTaskCard = (task: RoutineTask, isCompletedView: boolean) => (
        <div key={task.id} className={`group flex items-start gap-4 p-4 rounded-xl border-2 transition-all animate-in fade-in slide-in-from-bottom-2 ${isCompletedView ? 'bg-slate-100 border-slate-300 opacity-60' : 'bg-slate-200 border-slate-400 hover:border-purple-600 hover:shadow-xl'} ${editingTaskId === task.id ? 'ring-2 ring-purple-500 border-purple-500' : ''}`}>
            <button
                onClick={() => onToggleTask(task.id)}
                className={`mt-1 transition-colors ${isCompletedView ? 'text-emerald-500' : 'text-slate-300 hover:text-purple-500'}`}
                title={isCompletedView ? "Tamamlanmadı yap" : "Tamamlandı işaretle"}
            >
                {isCompletedView ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
            </button>

            <div className="flex-1 min-w-0">
                {(task.customerName || task.phoneNumber || task.address || task.district) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2 text-sm">
                        {task.customerName && (
                            <span className={`font-bold flex items-center gap-1.5 ${isCompletedView ? 'text-slate-600' : 'text-purple-900'}`}>
                                <UserCircle className="w-4 h-4" /> {task.customerName}
                            </span>
                        )}
                        {task.phoneNumber && (
                            <a href={`tel:${task.phoneNumber}`} className="text-emerald-500 hover:text-emerald-600 flex items-center gap-1 hover:underline" onClick={(e) => e.stopPropagation()}>
                                <Phone className="w-3.5 h-3.5" /> {task.phoneNumber}
                            </a>
                        )}
                        {task.district && (
                            { task.district }
                            </span>
                )}
                {task.address && (
                    <MapPin className="w-3.5 h-3.5 text-red-600" /> {task.address}
            </span>
                        )}
        </div>
    )
}

<p className={`${isCompletedView ? 'text-slate-500 line-through' : 'text-purple-950 font-medium'} whitespace-pre-wrap break-words leading-relaxed`}>{task.content}</p>

{
    !isCompletedView && (
        <div className="flex items-center gap-3 mt-3">
            {task.assignee ? (
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100 flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5" /> {task.assignee}
                </span>
            ) : (
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Atanmadı</span>
            )}
            <span className="text-[10px] text-slate-400">
                {new Date(task.createdAt?.seconds ? task.createdAt.seconds * 1000 : task.createdAt).toLocaleDateString('tr-TR')}
            </span>
        </div>
    )
}

{
    convertingTaskId === task.id ? (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-lg max-w-md animate-in fade-in">
            <p className="text-xs text-purple-800 mb-2 font-bold">Bu kaydı ana panele taşı:</p>
            <div className="flex gap-2">
                <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as TaskStatus)}
                    className="flex-1 bg-white border border-slate-300 rounded text-sm px-2 py-1.5 outline-none focus:border-purple-500"
                >
                    {Object.entries(StatusLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
                <button onClick={handleConfirmConversion} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">Oluştur</button>
                <button onClick={() => setConvertingTaskId(null)} className="bg-white border border-slate-300 text-slate-600 px-3 py-1.5 rounded text-sm hover:bg-slate-50">İptal</button>
            </div>
        </div>
    ) : (
    !isCompletedView && (task.customerName || task.phoneNumber) && (
        <div className="mt-2">
            <button
                onClick={() => handleStartConversion(task.id)}
                className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-purple-600 transition-colors py-1"
            >
                <ArrowRightCircle className="w-3.5 h-3.5" /> Kişi Kartı Oluştur
            </button>
        </div>
    )
)
}
            </div >

    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => handleEditClick(task)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
        <button onClick={() => onDeleteTask(task.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
    </div>
        </div >
    );

return (
    <div className="flex flex-col h-full bg-slate-200 overflow-hidden animate-in fade-in duration-300">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm z-10">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="bg-purple-100 p-2 rounded-xl">
                    <CalendarCheck className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Eksikler Havuzu</h2>
                    <p className="text-xs text-slate-500 font-medium">Veri girişi ve eksik takibi</p>
                </div>
            </div>

            {/* Quick Stats Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button onClick={() => setActiveTab('pool')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'pool' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Havuz ({poolTasks.length})
                </button>
                <button onClick={() => setActiveTab('assigned')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'assigned' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Atanan ({assignedTasks.length})
                </button>
                <button onClick={() => setActiveTab('completed')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'completed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Biten ({doneTasks.length})
                </button>
            </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT: FORM (Sticky/Sidebar style on Desktop) */}
            <div className={`bg-white/40 backdrop-blur-xl border-r border-white/20 flex-shrink-0 lg:w-[400px] flex flex-col transition-all duration-300 z-20 shadow-xl lg:shadow-none ${isAddFormExpanded ? 'w-full lg:w-[400px]' : 'h-14 lg:h-auto overflow-hidden'}`}>
                <div
                    className="p-4 border-b border-slate-100 flex justify-between items-center cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors lg:cursor-default"
                    onClick={() => setIsAddFormExpanded(!isAddFormExpanded)}
                >
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        {editingTaskId ? <Pencil className="w-4 h-4 text-orange-500" /> : <Plus className="w-4 h-4 text-purple-600" />}
                        {editingTaskId ? 'Düzenle' : 'Yeni Ekle'}
                    </h3>
                    {editingTaskId && <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded hover:bg-red-100">İptal</button>}
                    <div className="lg:hidden">
                        {isAddFormExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>

                <div className={`p-6 overflow-y-auto custom-scrollbar flex-1 ${!isAddFormExpanded ? 'hidden lg:block' : ''}`}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Müşteri Bilgileri</label>
                            <div className="space-y-3">
                                <input type="text" placeholder="Ad Soyad" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-400" />
                                <input type="tel" placeholder="Telefon" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-400" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Konum</label>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input type="text" placeholder="İlçe" value={district} onChange={e => setDistrict(e.target.value)} className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500" />
                                    <input type="text" placeholder="İl" value={city} onChange={e => setCity(e.target.value)} className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500" />
                                </div>
                                <div className="relative">
                                    <input type="text" placeholder="Açık Adres" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pl-9 text-sm outline-none focus:border-purple-500" />
                                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                                {locationCoordinates ? (
                                    <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2 rounded-lg text-xs text-blue-600">
                                        <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Konum Bağlandı</span>
                                        <button type="button" onClick={() => setLocationCoordinates('')}><X className="w-3 h-3 text-slate-400 hover:text-red-500" /></button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setShowLocationModal(true)} className="w-full py-2 border border-slate-200 border-dashed rounded-lg text-slate-400 text-xs hover:border-blue-400 hover:text-blue-500 transition-colors">
                                        + Harita Konumu Ekle
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Eksik Detayı</label>
                            <textarea
                                placeholder="Yapılacak işlem veya not..."
                                value={newTaskContent}
                                onChange={e => setNewTaskContent(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px] outline-none focus:border-purple-500 resize-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex justify-between">
                                <span>Tarih</span>
                                <span className="font-normal text-[9px] lowercase italic text-slate-300">Opsiyonel</span>
                            </label>
                            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 text-slate-600" />
                        </div>

                        <button disabled={!newTaskContent.trim()} className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2">
                            {editingTaskId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editingTaskId ? 'Güncelle' : 'Listeye Ekle'}
                        </button>
                    </form>
                </div>
            </div>

            {/* RIGHT: LIST */}
            <div className="flex-1 bg-slate-200 flex flex-col min-h-0">
                {/* Dynamic Filters Area */}
                {activeTab === 'pool' && uniqueDistricts.length > 1 && (
                    <div className="px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-200/50">
                        {uniqueDistricts.map(dist => (
                            <button
                                key={dist}
                                onClick={() => setActiveDistrict(dist)}
                                className={`text-xs px-3 py-1.5 rounded-full transition-all border ${activeDistrict === dist ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200' : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'}`}
                            >
                                {dist}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {activeTab === 'pool' && (
                        filteredPoolTasks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 pb-20">
                                <CheckSquare className="w-16 h-16 mb-4 opacity-20" />
                                <p>Kayıt bulunamadı.</p>
                            </div>
                        ) : filteredPoolTasks.map(task => renderTaskCard(task, false))
                    )}

                    {activeTab === 'assigned' && (
                        assignedTasks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 pb-20">
                                <User className="w-16 h-16 mb-4 opacity-20" />
                                <p>Atanmış kayıt yok.</p>
                            </div>
                        ) : assignedTasks.map(task => renderTaskCard(task, false))
                    )}

                    {activeTab === 'completed' && (
                        doneTasks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 pb-20">
                                <Check className="w-16 h-16 mb-4 opacity-20" />
                                <p>Tamamlanmış kayıt yok.</p>
                            </div>
                        ) : doneTasks.map(task => renderTaskCard(task, true))
                    )}
                </div>
            </div>
        </div>

        <LocationPreviewModal
            isOpen={showLocationModal}
            onClose={() => setShowLocationModal(false)}
            onConfirm={(url) => {
                setLocationCoordinates(url);
                setShowLocationModal(false);
            }}
        />
    </div>
);
};

export default RoutineTasksView;
