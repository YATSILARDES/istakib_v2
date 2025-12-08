import React, { useState, useEffect } from 'react';
import { db } from '@/src/firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { UserPermission, AppSettings, Task, TaskStatus, StatusLabels } from '../types';
import * as XLSX from 'xlsx';
import { User, Database, Bell, Download, Upload, Save, Check, Plus, Trash2, X, AlertCircle } from 'lucide-react';

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
    const [selectedUser, setSelectedUser] = useState('');

    // Permissions State
    const [permEmail, setPermEmail] = useState('');
    const [currentPerm, setCurrentPerm] = useState<UserPermission | null>(null);
    const [loadingPerm, setLoadingPerm] = useState(false);
    const [allUsers, setAllUsers] = useState<UserPermission[]>([]); // Tüm kayıtlı kullanıcılar

    // UI Messages
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Mesajları temizle
    useEffect(() => {
        if (errorMsg || successMsg) {
            const timer = setTimeout(() => {
                setErrorMsg(null);
                setSuccessMsg(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMsg, successMsg]);

    useEffect(() => {
        setSettings(initialSettings);
        // Personel yetkileri sekmesi açıldığında kullanıcıları yükle
        if (isOpen && activeTab === 'permissions') {
            fetchAllUsers();
        }
    }, [initialSettings, isOpen, activeTab]);

    // Tüm Kayıtlı Kullanıcıları Getir
    const fetchAllUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'permissions'));
            const users: UserPermission[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Veri güvenliği: Listelerken de eksik verileri tamamla
                users.push({
                    email: data.email || doc.id, // doc.id genelde email adresidir
                    allowedColumns: Array.isArray(data.allowedColumns) ? data.allowedColumns : [],
                    role: data.role || 'staff',
                    canAccessRoutineTasks: data.canAccessRoutineTasks || false,
                    canAccessAssignment: data.canAccessAssignment || false,
                    canAddCustomers: data.canAddCustomers || false
                });
            });
            setAllUsers(users);
        } catch (error) {
            console.error("Kullanıcılar yüklenirken hata:", error);
            setErrorMsg("Kullanıcı listesi yüklenemedi: " + (error as any).message);
        }
    };

    // İzinleri Getir veya Yeni Kullanıcı Oluştur
    const fetchPermission = async (email: string) => {
        if (!email) {
            setErrorMsg("Lütfen geçerli bir e-posta adresi yazın.");
            return;
        }
        setLoadingPerm(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const docRef = doc(db, 'permissions', email);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Veri güvenliği: Eksik alanları varsayılan değerlerle doldur
                const safePerm: UserPermission = {
                    email: data.email || email,
                    allowedColumns: Array.isArray(data.allowedColumns) ? data.allowedColumns : [],
                    role: data.role || 'staff',
                    canAccessRoutineTasks: data.canAccessRoutineTasks || false,
                    canAccessAssignment: data.canAccessAssignment || false,
                    canAddCustomers: data.canAddCustomers || false
                };

                setCurrentPerm(safePerm);
                setSuccessMsg(`"${email}" bilgileri yüklendi.`);
            } else {
                console.log("Yeni kullanıcı oluşturuluyor...", email);

                // 1. Permissions koleksiyonuna ekle
                const newPerm: UserPermission = {
                    email: email,
                    allowedColumns: [],
                    role: 'staff',
                    canAccessRoutineTasks: false,
                    canAccessAssignment: false,
                    canAddCustomers: false
                };
                await setDoc(docRef, newPerm);

                // 2. Staff List'e de ekle (Eğer yoksa)
                const currentStaffList = settings.staffList || [];
                const staffExists = currentStaffList.some(s => s.email === email);

                if (!staffExists) {
                    const generatedName = email.split('@')[0];
                    const newStaffList = [...currentStaffList, { name: generatedName, email: email }];
                    console.log("Staff listesine ekleniyor:", generatedName);
                    onSaveSettings({ ...settings, staffList: newStaffList });
                }

                setCurrentPerm(newPerm);
                setAllUsers(prev => [...prev, newPerm]);
                setSuccessMsg(`"${email}" başarıyla oluşturuldu!`);
            }
        } catch (error: any) {
            console.error("Kullanıcı işlem hatası:", error);
            setErrorMsg("Hata: " + (error.message || "Bilinmeyen hata"));
        } finally {
            setLoadingPerm(false);
        }
    };

    // İzin Kaydet
    const savePermission = async () => {
        const targetEmail = currentPerm?.email || permEmail;

        if (!currentPerm || !targetEmail) {
            setErrorMsg("Kaydedilecek kullanıcı belirsiz!");
            return;
        }

        setLoadingPerm(true);
        setErrorMsg(null);
        try {
            // currentPerm içindeki veriyi targetEmail dökümanına yaz
            // ensure email field is set in content too
            const dataToSave = { ...currentPerm, email: targetEmail };

            await setDoc(doc(db, 'permissions', targetEmail), dataToSave);
            await fetchAllUsers();
            setSuccessMsg("Kullanıcı izinleri kaydedildi!");
        } catch (error: any) {
            console.error("İzin kaydetme hatası:", error);
            setErrorMsg("Kaydetme hatası: " + error.message);
        } finally {
            setLoadingPerm(false);
        }
    };

    // İzin Sil
    const deletePermission = async (email: string) => {
        if (!email) return;
        if (!confirm(`"${email}" kullanıcısını ve tüm yetkilerini silmek istediğinize emin misiniz?`)) return;

        try {
            await deleteDoc(doc(db, 'permissions', email));

            // Staff List'ten de sil
            const currentStaffList = settings.staffList || [];
            if (currentStaffList.some(s => s.email === email)) {
                const newStaffList = currentStaffList.filter(s => s.email !== email);
                onSaveSettings({ ...settings, staffList: newStaffList });
            }

            // Listeden kaldır
            setAllUsers(prev => prev.filter(u => u.email !== email));
            // Eğer silinen kullanıcı şu an seçiliyse, seçimi temizle
            if (currentPerm?.email === email) {
                setCurrentPerm(null);
                setPermEmail('');
            }
            setSuccessMsg(`"${email}" silindi.`);
        } catch (error: any) {
            console.error("İzin silme hatası:", error);
            setErrorMsg("Silme hatası: " + error.message);
        }
    };

    const toggleColumnPermission = (status: TaskStatus) => {
        if (!currentPerm) return;
        const newAllowed = currentPerm.allowedColumns.includes(status)
            ? currentPerm.allowedColumns.filter(s => s !== status)
            : [...currentPerm.allowedColumns, status];

        setCurrentPerm({ ...currentPerm, allowedColumns: newAllowed });
    };

    if (!isOpen) return null;

    // --- Excel İşlemleri ---
    const handleDownloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(tasks);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
        XLSX.writeFile(workbook, "Is_Takip_Yedek.xlsx");
        setSuccessMsg("Excel dosyası indirildi!");
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

            // Basit doğrulama
            if (data.length > 0 && data[0].title) {
                onTasksUpdate(data);
                setSuccessMsg(`${data.length} adet görev yüklendi!`);
            } else {
                setErrorMsg("Geçersiz Excel formatı!");
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- Bildirim İşlemleri ---
    const handleAddUser = () => {
        if (!selectedUser) return;

        const currentList = settings.notifications?.[activeStatus] || [];
        if (currentList.includes(selectedUser)) {
            setErrorMsg("Bu kullanıcı zaten ekli.");
            return;
        }

        setSettings(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [activeStatus]: [...currentList, selectedUser]
            }
        }));
        setSelectedUser('');
    };

    const handleRemoveUser = (email: string) => {
        const currentList = settings.notifications?.[activeStatus] || [];
        setSettings(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [activeStatus]: currentList.filter(u => u !== email)
            }
        }));
    };

    const handleSave = () => {
        onSaveSettings(settings);
        setSuccessMsg("Ayarlar kaydedildi!");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User className="w-6 h-6 text-blue-500" />
                        Yönetici Paneli
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition-colors rounded-full hover:bg-slate-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 bg-slate-800/50 border-r border-slate-700 flex flex-col">
                        <button
                            onClick={() => setActiveTab('backup')}
                            className={`flex items-center gap-3 px-6 py-4 text-sm font-medium transition-colors border-l-4 ${activeTab === 'backup'
                                ? 'bg-slate-800 border-emerald-500 text-emerald-400'
                                : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                }`}
                        >
                            <Database className="w-5 h-5" />
                            Yedekleme & Veri
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`flex items-center gap-3 px-6 py-4 text-sm font-medium transition-colors border-l-4 ${activeTab === 'notifications'
                                ? 'bg-slate-800 border-yellow-500 text-yellow-400'
                                : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                }`}
                        >
                            <Bell className="w-5 h-5" />
                            Bildirim Ayarları
                        </button>
                        <button
                            onClick={() => setActiveTab('permissions')}
                            className={`flex items-center gap-3 px-6 py-4 text-sm font-medium transition-colors border-l-4 ${activeTab === 'permissions'
                                ? 'bg-slate-800 border-purple-500 text-purple-400'
                                : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                }`}
                        >
                            <User className="w-5 h-5" />
                            Personel Yetkileri
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 overflow-y-auto bg-slate-900">
                        {/* Hata ve Başarı Mesajları */}
                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 mb-4 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {errorMsg}
                            </div>
                        )}
                        {successMsg && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 mb-4 rounded-lg flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                {successMsg}
                            </div>
                        )}

                        {activeTab === 'backup' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <Download className="w-5 h-5 text-emerald-400" />
                                        Verileri İndir (Yedekle)
                                    </h3>
                                    <p className="text-slate-400 mb-4 text-sm">
                                        Tüm görevleri, müşterileri ve notları Excel dosyası olarak bilgisayarınıza indirin.
                                        Düzenli yedek almanız önerilir.
                                    </p>
                                    <button
                                        onClick={handleDownloadExcel}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        <Download className="w-5 h-5" />
                                        Excel Olarak İndir
                                    </button>
                                </div>

                                <div className="border-t border-slate-700 pt-8">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-blue-400" />
                                        Veri Yükle (Geri Yükle)
                                    </h3>
                                    <p className="text-slate-400 mb-4 text-sm">
                                        Daha önce indirdiğiniz veya düzenlediğiniz Excel dosyasını sisteme yükleyin.
                                        <span className="text-red-400 block mt-1">Dikkat: Bu işlem mevcut verilerin üzerine yazabilir veya ekleme yapabilir.</span>
                                    </p>
                                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
                                        <Upload className="w-5 h-5" />
                                        Excel Dosyası Seç ve Yükle
                                        <input type="file" accept=".xlsx, .xls" onChange={handleUploadExcel} className="hidden" />
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-white">Gelişmiş Bildirim Ataması</h3>
                                    <button
                                        onClick={handleSave}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                                    >
                                        <Save className="w-4 h-4" /> Değişiklikleri Kaydet
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Durum Listesi */}
                                    <div className="lg:col-span-1 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                                        <div className="p-3 bg-slate-800 border-b border-slate-700 font-medium text-slate-300">
                                            İş Aşaması Seçin
                                        </div>
                                        <div className="divide-y divide-slate-700/50">
                                            {Object.values(TaskStatus).map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={() => setActiveStatus(status)}
                                                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${activeStatus === status
                                                        ? 'bg-blue-900/20 text-blue-400'
                                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                                        }`}
                                                >
                                                    {StatusLabels[status]}
                                                    {activeStatus === status && <Check className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Kullanıcı Atama */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
                                            <h4 className="text-md font-medium text-blue-400 mb-4 flex items-center gap-2">
                                                <Bell className="w-4 h-4" />
                                                "{StatusLabels[activeStatus]}" Bildirim Listesi
                                            </h4>

                                            <div className="flex gap-2 mb-6">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="email"
                                                        value={selectedUser}
                                                        onChange={(e) => setSelectedUser(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="Kullanıcı seçin veya e-posta yazın"
                                                        list="admin-users-list"
                                                    />
                                                    <datalist id="admin-users-list">
                                                        {users.map(email => (
                                                            <option key={email} value={email} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                                <button
                                                    onClick={handleAddUser}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" /> Ekle
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kayıtlı Kullanıcılar</label>
                                                <div className="bg-slate-900 rounded-lg border border-slate-700 divide-y divide-slate-700">
                                                    {(settings.notifications?.[activeStatus] || []).length === 0 ? (
                                                        <div className="p-4 text-center text-slate-500 text-sm">
                                                            Bu aşama için henüz kimse atanmamış.
                                                        </div>
                                                    ) : (
                                                        (settings.notifications?.[activeStatus] || []).map((email) => (
                                                            <div key={email} className="flex items-center justify-between p-3 group">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400">
                                                                        <User className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="text-slate-300">{email}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveUser(email)}
                                                                    className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all"
                                                                    title="Listeden Çıkar"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'permissions' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h3 className="text-lg font-semibold text-white mb-4">Personel Sayfa İzinleri</h3>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* SOL: Kayıtlı Kullanıcılar Listesi */}
                                    <div className="lg:col-span-1">
                                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-sm font-semibold text-slate-300">Kayıtlı Kullanıcılar</h4>
                                                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400">{allUsers.length}</span>
                                            </div>

                                            {/* Yeni Kullanıcı Ekle Input */}
                                            <div className="flex gap-2 mb-4">
                                                <input
                                                    type="email"
                                                    placeholder="E-posta..."
                                                    value={permEmail}
                                                    onChange={(e) => setPermEmail(e.target.value)}
                                                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                                    list="permission-users-list"
                                                />
                                                <datalist id="permission-users-list">
                                                    {users.map(email => (
                                                        <option key={email} value={email} />
                                                    ))}
                                                </datalist>
                                                <button
                                                    onClick={() => fetchPermission(permEmail)}
                                                    disabled={loadingPerm}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                                                    title="Yeni Kullanıcı Ekle / Düzenle"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Kullanıcı Listesi */}
                                            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                                                {allUsers.length === 0 ? (
                                                    <p className="text-sm text-slate-500 italic text-center py-4">Henüz kullanıcı eklenmemiş</p>
                                                ) : (
                                                    allUsers.map(user => (
                                                        <div
                                                            key={user.email}
                                                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${currentPerm?.email === user.email
                                                                ? 'bg-blue-900/30 border-blue-600'
                                                                : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                                                                }`}
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    setPermEmail(user.email);
                                                                    fetchPermission(user.email);
                                                                }}
                                                                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                                            >
                                                                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                                <span className="text-sm text-slate-300 truncate">{user.email}</span>
                                                            </button>
                                                            <div className="flex items-center gap-1">
                                                                {currentPerm?.email === user.email && (
                                                                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        deletePermission(user.email);
                                                                    }}
                                                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                                                    title="Kullanıcıyı Sil"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SAĞ: İzin Düzenleme */}
                                    <div className="lg:col-span-2">
                                        {currentPerm ? (
                                            <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
                                                <div className="mb-6">
                                                    <h4 className="text-lg font-semibold text-white mb-1">{currentPerm.email}</h4>
                                                    <p className="text-xs text-slate-500">Kullanıcı izinlerini aşağıda düzenleyebilirsiniz</p>
                                                </div>

                                                <div className="space-y-6">
                                                    {/* Sütun İzinleri */}
                                                    <div>
                                                        <h5 className="text-sm font-semibold text-slate-400 mb-3">Sayfa Görünürlüğü</h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {Object.values(TaskStatus).map(status => (
                                                                <label key={status} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700 cursor-pointer hover:border-blue-500/50 transition-colors">
                                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${currentPerm.allowedColumns.includes(status)
                                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                                        : 'border-slate-500'
                                                                        }`}>
                                                                        {currentPerm.allowedColumns.includes(status) && <Check className="w-3.5 h-3.5" />}
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="hidden"
                                                                        checked={currentPerm.allowedColumns.includes(status)}
                                                                        onChange={() => toggleColumnPermission(status)}
                                                                    />
                                                                    <span className="text-slate-200 text-sm">{StatusLabels[status]}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Görev Yönetimi Yetkileri */}
                                                    <div className="pt-6 border-t border-slate-700">
                                                        <h5 className="text-sm font-semibold text-slate-400 mb-3">Görev Yönetimi Yetkileri</h5>
                                                        <div className="space-y-2">
                                                            {/* Eksikler Havuzu */}
                                                            <label className="flex items-center gap-3 p-3 bg-purple-900/20 rounded-lg border border-purple-700 cursor-pointer hover:border-purple-500/50 transition-colors">
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${currentPerm.canAccessRoutineTasks
                                                                    ? 'bg-purple-600 border-purple-600 text-white'
                                                                    : 'border-slate-500'
                                                                    }`}>
                                                                    {currentPerm.canAccessRoutineTasks && <Check className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={currentPerm.canAccessRoutineTasks || false}
                                                                    onChange={() => setCurrentPerm({ ...currentPerm, canAccessRoutineTasks: !currentPerm.canAccessRoutineTasks })}
                                                                />
                                                                <span className="text-slate-200 text-sm">Eksikler Havuzu</span>
                                                            </label>

                                                            {/* Görev Dağıtımı */}
                                                            <label className="flex items-center gap-3 p-3 bg-blue-900/20 rounded-lg border border-blue-700 cursor-pointer hover:border-blue-500/50 transition-colors">
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${currentPerm.canAccessAssignment
                                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                                    : 'border-slate-500'
                                                                    }`}>
                                                                    {currentPerm.canAccessAssignment && <Check className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={currentPerm.canAccessAssignment || false}
                                                                    onChange={() => setCurrentPerm({ ...currentPerm, canAccessAssignment: !currentPerm.canAccessAssignment })}
                                                                />
                                                                <span className="text-slate-200 text-sm">Görev Dağıtımı</span>
                                                            </label>

                                                            {/* Müşteri Ekle */}
                                                            <label className="flex items-center gap-3 p-3 bg-emerald-900/20 rounded-lg border border-emerald-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${currentPerm.canAddCustomers
                                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                                    : 'border-slate-500'
                                                                    }`}>
                                                                    {currentPerm.canAddCustomers && <Check className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={currentPerm.canAddCustomers || false}
                                                                    onChange={() => setCurrentPerm({ ...currentPerm, canAddCustomers: !currentPerm.canAddCustomers })}
                                                                />
                                                                <span className="text-slate-200 text-sm">Müşteri Ekle</span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    {/* Kaydet Butonu */}
                                                    <div className="flex justify-end pt-4 border-t border-slate-700">
                                                        <button
                                                            onClick={async () => {
                                                                await savePermission();
                                                            }}
                                                            disabled={loadingPerm}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                                                        >
                                                            {loadingPerm ? 'Kaydediliyor...' : 'İzinleri Kaydet'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-800/30 p-12 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                                                <User className="w-16 h-16 text-slate-600 mb-4" />
                                                <h4 className="text-lg font-semibold text-slate-400 mb-2">Kullanıcı Seçin</h4>
                                                <p className="text-sm text-slate-500">
                                                    Sol taraftan bir kullanıcı seçin veya yeni kullanıcı ekleyin
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
