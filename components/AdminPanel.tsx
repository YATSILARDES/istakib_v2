import React, { useState, useEffect } from 'react';
import { db } from '@/src/firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { UserPermission, AppSettings, Task, TaskStatus, StatusLabels } from '../types';
import * as XLSX from 'xlsx';
import { User, Database, Bell, Download, Upload, Check, Plus, Trash2, Shield, Lock, Eye, AlertCircle, Save, X, Users } from 'lucide-react';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSettings: (settings: AppSettings) => void;
    initialSettings: AppSettings;
    users: string[];
    tasks: Task[];
    onTasksUpdate: (newTasks: Task[]) => void;
}

type TabType = 'backup' | 'notifications' | 'permissions';

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onSaveSettings, initialSettings, users, tasks, onTasksUpdate }) => {
    const [activeTab, setActiveTab] = useState<TabType>('backup');
    const [activeStatus, setActiveStatus] = useState<TaskStatus>(TaskStatus.TO_CHECK);
    const [settings, setSettings] = useState<AppSettings>(initialSettings);

    // Permission State
    const [allPermissions, setAllPermissions] = useState<UserPermission[]>([]);
    const [selectedPerm, setSelectedPerm] = useState<UserPermission | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initial Load & Settings Sync
    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    // Load permissions when tab opens
    useEffect(() => {
        if (isOpen && activeTab === 'permissions') {
            loadPermissions();
        }
    }, [isOpen, activeTab]);

    // Message auto-clear
    useEffect(() => {
        if (msg) {
            const timer = setTimeout(() => setMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [msg]);

    const loadPermissions = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'permissions'));
            const perms: UserPermission[] = [];
            snap.forEach(d => {
                const data = d.data();
                perms.push({
                    email: data.email || d.id,
                    name: data.name || '',
                    role: data.role || 'staff',
                    allowedColumns: data.allowedColumns || [],
                    canAccessRoutineTasks: data.canAccessRoutineTasks || false,
                    canAccessAssignment: data.canAccessAssignment || false,
                    canAddCustomers: data.canAddCustomers || false
                });
            });
            setAllPermissions(perms);
        } catch (e: any) {
            setMsg({ type: 'error', text: 'Yetkiler yüklenemedi: ' + e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async () => {
        if (!newEmail || !newName) {
            setMsg({ type: 'error', text: 'Lütfen E-posta ve İsim giriniz.' });
            return;
        }

        const emailLower = newEmail.trim().toLowerCase();

        try {
            setLoading(true);
            const newPerm: UserPermission = {
                email: emailLower,
                name: newName.trim(),
                role: 'staff',
                allowedColumns: [], // Başlangıçta hiçbiri
                canAccessRoutineTasks: false,
                canAccessAssignment: false,
                canAddCustomers: false
            };

            await setDoc(doc(db, 'permissions', emailLower), newPerm);
            await loadPermissions();

            // Auto-select for editing
            setSelectedPerm(newPerm);

            setNewEmail('');
            setNewName('');
            setMsg({ type: 'success', text: 'Kullanıcı oluşturuldu. Şimdi yetkilerini ayarlayın.' });
        } catch (e: any) {
            setMsg({ type: 'error', text: 'Oluşturma hatası: ' + e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePermission = async (perm: UserPermission) => {
        try {
            // Optimistic UI update
            setSelectedPerm(perm); // Keep UI responsive
            setAllPermissions(prev => prev.map(p => p.email === perm.email ? perm : p));

            await setDoc(doc(db, 'permissions', perm.email), perm);
        } catch (e: any) {
            setMsg({ type: 'error', text: 'Güncelleme hatası: ' + e.message });
            loadPermissions(); // Revert on error
        }
    };

    const handleDeleteUser = async (email: string) => {
        if (!confirm('Bu kullanıcıyı ve tüm yetkilerini silmek istediğinize emin misiniz?')) return;
        try {
            await deleteDoc(doc(db, 'permissions', email));
            setAllPermissions(prev => prev.filter(p => p.email !== email));
            if (selectedPerm?.email === email) setSelectedPerm(null);
            setMsg({ type: 'success', text: 'Kullanıcı silindi.' });
        } catch (e: any) {
            setMsg({ type: 'error', text: 'Silme hatası: ' + e.message });
        }
    };


    // --- EXCEL & NOTIFICATIONS LOGIC ---
    const handleDownloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(tasks);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
        XLSX.writeFile(workbook, "Is_Takip_Yedek.xlsx");
        setMsg({ type: 'success', text: 'Excel indirildi.' });
    };

    const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws) as Task[];
            onTasksUpdate(data);
            setMsg({ type: 'success', text: 'Veriler yüklendi.' });
        };
        reader.readAsBinaryString(file);
    };

    const handleNotificationToggle = (user: string) => {
        const currentList = settings.notifications[activeStatus] || [];
        const newList = currentList.includes(user)
            ? currentList.filter(u => u !== user)
            : [...currentList, user];

        onSaveSettings({
            ...settings,
            notifications: { ...settings.notifications, [activeStatus]: newList }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-slate-900 w-full max-w-6xl h-[90vh] rounded-2xl border border-slate-700 shadow-2xl flex overflow-hidden">

                {/* Sidebar */}
                <div className="w-64 bg-slate-800/50 border-r border-slate-700 flex flex-col pt-6 pb-4 gap-2">
                    <h2 className="text-xl font-bold text-white mb-6 px-6 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-blue-500" /> Yönetim
                    </h2>

                    <button onClick={() => setActiveTab('backup')}
                        className={`mx-3 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'backup' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                        <Database className="w-5 h-5" /> Yedekleme
                    </button>

                    <button onClick={() => setActiveTab('notifications')}
                        className={`mx-3 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'notifications' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                        <Bell className="w-5 h-5" /> Bildirimler
                    </button>

                    <div className="h-px bg-slate-700/50 my-2 mx-6" />

                    <button onClick={() => setActiveTab('permissions')}
                        className={`mx-3 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'permissions' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                        <Shield className="w-5 h-5" /> Personel Yetkileri
                    </button>

                    <div className="mt-auto px-4 pt-4 border-t border-slate-800">
                        <button onClick={onClose} className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium border border-slate-700">
                            <X className="w-4 h-4" /> Kapat
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col bg-slate-900 relative">
                    {msg && (
                        <div className={`absolute top-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-sm shadow-xl flex items-center justify-center font-medium animate-slideDown ${msg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                            {msg.type === 'success' ? <Check className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
                            {msg.text}
                        </div>
                    )}

                    {/* BACKUP TAB */}
                    {activeTab === 'backup' && (
                        <div className="p-8 overflow-y-auto h-full">
                            <h3 className="text-2xl font-bold text-white mb-2">Veri Yönetimi</h3>
                            <p className="text-slate-400 mb-8">Excel ile veri yedekleme ve geri yükleme işlemleri.</p>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-colors group">
                                    <div className="w-14 h-14 bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform"><Download className="w-7 h-7" /></div>
                                    <h4 className="text-xl font-bold text-white mb-2">Excel İndir</h4>
                                    <p className="text-slate-400 text-sm mb-6">Tüm iş listesini güvenli bir şekilde bilgisayarınıza indirin.</p>
                                    <button onClick={handleDownloadExcel} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                                        <Download className="w-5 h-5" /> İndir
                                    </button>
                                </div>
                                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-emerald-500/50 transition-colors group">
                                    <div className="w-14 h-14 bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform"><Upload className="w-7 h-7" /></div>
                                    <h4 className="text-xl font-bold text-white mb-2">Excel Yükle</h4>
                                    <p className="text-slate-400 text-sm mb-6">Dikkat: Yüklediğiniz dosya mevcut verilerin yerini alacaktır.</p>
                                    <label className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors text-center cursor-pointer flex items-center justify-center gap-2">
                                        <Upload className="w-5 h-5" />
                                        Dosya Seç
                                        <input type="file" onChange={handleUploadExcel} className="hidden" accept=".xlsx,.xls" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NOTIFICATIONS TAB */}
                    {activeTab === 'notifications' && (
                        <div className="p-8 overflow-y-auto h-full">
                            <h3 className="text-2xl font-bold text-white mb-2">Bildirim Ayarları</h3>
                            <p className="text-slate-400 mb-8">Hangi aşamada kimlere bildirim gideceğini seçin.</p>

                            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin scrollbar-thumb-slate-700">
                                {Object.values(TaskStatus).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setActiveStatus(status)}
                                        className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeStatus === status
                                            ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/20'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                    >
                                        {StatusLabels[status]}
                                        {activeStatus === status && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                                    <h4 className="font-bold text-white text-lg flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-yellow-500" />
                                        {StatusLabels[activeStatus]} Görevlileri
                                    </h4>
                                    <span className="bg-slate-700 text-white text-xs px-3 py-1 rounded-full border border-slate-600">
                                        {(settings.notifications[activeStatus] || []).length} kişi seçili
                                    </span>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {users.map(user => (
                                        <label
                                            key={user}
                                            className={`flex items-center p-4 rounded-xl cursor-pointer transition-all border ${(settings.notifications[activeStatus] || []).includes(user)
                                                ? 'bg-yellow-900/20 border-yellow-500/50'
                                                : 'bg-slate-900/50 border-transparent hover:bg-slate-700'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center mr-4 transition-colors ${(settings.notifications[activeStatus] || []).includes(user)
                                                ? 'bg-yellow-600 border-yellow-600'
                                                : 'border-slate-600'
                                                }`}>
                                                {(settings.notifications[activeStatus] || []).includes(user) && (
                                                    <Check className="w-4 h-4 text-white" />
                                                )}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={(settings.notifications[activeStatus] || []).includes(user)}
                                                onChange={() => handleNotificationToggle(user)}
                                            />
                                            <span className={`text-sm select-none ${(settings.notifications[activeStatus] || []).includes(user)
                                                ? 'text-yellow-100 font-medium'
                                                : 'text-slate-300'
                                                }`}>
                                                {user}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PERMISSIONS TAB (YENİ) */}
                    {activeTab === 'permissions' && (
                        <div className="flex h-full">
                            {/* Sol: Kullanıcı Listesi */}
                            <div className="w-80 border-r border-slate-700 flex flex-col bg-slate-800/30">
                                <div className="p-6 border-b border-slate-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-white font-bold flex items-center gap-2"><Users className="w-5 h-5 text-purple-400" /> Personeller</h3>
                                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{allPermissions.length} Kayıt</span>
                                    </div>
                                    <div className="space-y-3">
                                        <input
                                            type="email"
                                            placeholder="E-posta Adresi"
                                            value={newEmail}
                                            onChange={e => setNewEmail(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors placeholder:text-slate-600"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Personel Adı"
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors placeholder:text-slate-600"
                                        />
                                        <button
                                            onClick={handleCreateUser}
                                            disabled={loading}
                                            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Plus className="w-4 h-4" />
                                            {loading ? 'Ekleniyor...' : 'Personel Ekle'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                                    {allPermissions.length === 0 && (
                                        <div className="text-center text-slate-500 text-sm py-12 flex flex-col items-center gap-2">
                                            <Users className="w-8 h-8 opacity-20" />
                                            Henüz personel eklenmedi
                                        </div>
                                    )}
                                    {allPermissions.map(perm => (
                                        <div
                                            key={perm.email}
                                            onClick={() => setSelectedPerm(perm)}
                                            className={`w-full text-left p-3 rounded-xl flex items-center justify-between group cursor-pointer transition-all border ${selectedPerm?.email === perm.email
                                                ? 'bg-purple-600/10 border-purple-500/50 text-white'
                                                : 'border-transparent hover:bg-slate-800 text-slate-300'
                                                }`}
                                        >
                                            <div className="min-w-0">
                                                <div className={`font-bold text-sm truncate ${selectedPerm?.email === perm.email ? 'text-purple-400' : 'text-slate-200'}`}>{perm.name}</div>
                                                <div className="text-xs truncate text-slate-500">{perm.email}</div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteUser(perm.email); }}
                                                className={`p-1.5 rounded-lg transition-all ${selectedPerm?.email === perm.email ? 'text-purple-400 hover:text-red-400 hover:bg-purple-500/10' : 'text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sağ: Yetki Detayları */}
                            <div className="flex-1 bg-slate-900 p-8 overflow-y-auto">
                                {selectedPerm ? (
                                    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn pb-20">
                                        <div className="flex items-center gap-5 border-b border-slate-700 pb-8">
                                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-2xl shadow-purple-500/20">
                                                {selectedPerm.name.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div>
                                                <h2 className="text-3xl font-bold text-white">{selectedPerm.name}</h2>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-slate-400 font-medium text-sm bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                                        {selectedPerm.email}
                                                    </span>
                                                    <span className="text-purple-400 font-medium text-sm bg-purple-900/20 px-3 py-1 rounded-full border border-purple-500/30 uppercase text-xs tracking-wider">
                                                        {selectedPerm.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Modül Yetkileri */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Lock className="w-4 h-4" /> Erişim Yetkileri
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Eksikler Havuzu */}
                                                <label className={`relative group p-5 rounded-2xl border cursor-pointer transition-all overflow-hidden ${selectedPerm.canAccessRoutineTasks ? 'bg-slate-800 border-purple-500 shadow-lg shadow-purple-900/10' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`p-2.5 rounded-xl ${selectedPerm.canAccessRoutineTasks ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700/50 text-slate-500'}`}>
                                                            <Bell className="w-6 h-6" />
                                                        </div>
                                                        <input
                                                            type="checkbox" className="hidden"
                                                            checked={selectedPerm.canAccessRoutineTasks || false}
                                                            onChange={() => handleUpdatePermission({ ...selectedPerm, canAccessRoutineTasks: !selectedPerm.canAccessRoutineTasks })}
                                                        />
                                                        <div className={`w-12 h-7 rounded-full relative transition-colors ${selectedPerm.canAccessRoutineTasks ? 'bg-purple-600' : 'bg-slate-700'}`}>
                                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${selectedPerm.canAccessRoutineTasks ? 'left-6' : 'left-1'}`} />
                                                        </div>
                                                    </div>
                                                    <div className="font-bold text-white mb-1 text-lg">Eksikler Havuzu</div>
                                                    <div className="text-xs text-slate-400 leading-relaxed">Havuzdaki sahipsiz işleri görebilir ve üzerine alabilir.</div>
                                                </label>

                                                {/* Görev Dağıtımı */}
                                                <label className={`relative group p-5 rounded-2xl border cursor-pointer transition-all overflow-hidden ${selectedPerm.canAccessAssignment ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-900/10' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`p-2.5 rounded-xl ${selectedPerm.canAccessAssignment ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-500'}`}>
                                                            <Database className="w-6 h-6" />
                                                        </div>
                                                        <input
                                                            type="checkbox" className="hidden"
                                                            checked={selectedPerm.canAccessAssignment || false}
                                                            onChange={() => handleUpdatePermission({ ...selectedPerm, canAccessAssignment: !selectedPerm.canAccessAssignment })}
                                                        />
                                                        <div className={`w-12 h-7 rounded-full relative transition-colors ${selectedPerm.canAccessAssignment ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${selectedPerm.canAccessAssignment ? 'left-6' : 'left-1'}`} />
                                                        </div>
                                                    </div>
                                                    <div className="font-bold text-white mb-1 text-lg">Görev Dağıtımı</div>
                                                    <div className="text-xs text-slate-400 leading-relaxed">Diğer personellere iş ataması yapabilir.</div>
                                                </label>

                                                {/* Müşteri Ekle */}
                                                <label className={`relative group p-5 rounded-2xl border cursor-pointer transition-all overflow-hidden ${selectedPerm.canAddCustomers ? 'bg-slate-800 border-green-500 shadow-lg shadow-green-900/10' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`p-2.5 rounded-xl ${selectedPerm.canAddCustomers ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-slate-500'}`}>
                                                            <Plus className="w-6 h-6" />
                                                        </div>
                                                        <input
                                                            type="checkbox" className="hidden"
                                                            checked={selectedPerm.canAddCustomers || false}
                                                            onChange={() => handleUpdatePermission({ ...selectedPerm, canAddCustomers: !selectedPerm.canAddCustomers })}
                                                        />
                                                        <div className={`w-12 h-7 rounded-full relative transition-colors ${selectedPerm.canAddCustomers ? 'bg-green-600' : 'bg-slate-700'}`}>
                                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${selectedPerm.canAddCustomers ? 'left-6' : 'left-1'}`} />
                                                        </div>
                                                    </div>
                                                    <div className="font-bold text-white mb-1 text-lg">Müşteri Ekle</div>
                                                    <div className="text-xs text-slate-400 leading-relaxed">Sisteme yeni müşteri kaydı oluşturabilir.</div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Sütun Görünürlüğü */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Eye className="w-4 h-4" /> Görünür Alanlar (Kanban)
                                            </h4>
                                            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden divide-y divide-slate-700/50">
                                                {Object.values(TaskStatus).map(status => (
                                                    <label key={status} className="flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors cursor-pointer group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${selectedPerm.allowedColumns.includes(status) ? 'bg-purple-600 border-purple-600 scale-110 shadow-lg shadow-purple-900/20' : 'border-slate-600 group-hover:border-slate-500 bg-slate-800'}`}>
                                                                {selectedPerm.allowedColumns.includes(status) && <Check className="w-4 h-4 text-white" />}
                                                            </div>
                                                            <span className={`text-sm font-medium transition-colors ${selectedPerm.allowedColumns.includes(status) ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                                                {StatusLabels[status]}
                                                            </span>
                                                        </div>

                                                        {selectedPerm.allowedColumns.includes(status) ? (
                                                            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">GÖREBİLİR</span>
                                                        ) : (
                                                            <span className="text-[10px] font-medium text-slate-500 bg-slate-900/50 px-2 py-1 rounded border border-slate-700">GİZLİ</span>
                                                        )}

                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={selectedPerm.allowedColumns.includes(status)}
                                                            onChange={() => {
                                                                const newCols = selectedPerm.allowedColumns.includes(status)
                                                                    ? selectedPerm.allowedColumns.filter(c => c !== status)
                                                                    : [...selectedPerm.allowedColumns, status];
                                                                handleUpdatePermission({ ...selectedPerm, allowedColumns: newCols });
                                                            }}
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 animate-fadeIn">
                                        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700">
                                            <Users className="w-10 h-10 opacity-30" />
                                        </div>
                                        <p className="text-xl font-bold text-slate-400 mb-2">Personel Seçimi Yapın</p>
                                        <p className="text-sm opacity-50 max-w-xs text-center leading-relaxed">Yetkilerini düzenlemek için soldaki listeden bir personel seçin veya yukarıdan yeni ekleyin.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
