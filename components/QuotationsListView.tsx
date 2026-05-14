import React, { useState, useEffect } from 'react';
import { db } from '@/src/firebase';
import { collection, getDocs, query, where, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Quotation } from '@/types';
import { FolderOpen, FileText, ChevronRight, ArrowLeft, Trash2, Clock, User, CheckCircle, XCircle, Loader2, Edit3, Download, FolderIcon } from 'lucide-react';

interface QuotationsListViewProps {
    currentUserEmail: string;
    isAdmin: boolean;
    onClose: () => void;
    onEdit: (quotation: Quotation) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft:    { label: 'Taslak',      color: 'bg-slate-100 text-slate-600 border-slate-200',    icon: <Clock className="w-3 h-3" /> },
    sent:     { label: 'Gönderildi',  color: 'bg-blue-100 text-blue-700 border-blue-200',        icon: <CheckCircle className="w-3 h-3" /> },
    approved: { label: 'Onaylandı',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { label: 'Reddedildi',  color: 'bg-red-100 text-red-700 border-red-200',           icon: <XCircle className="w-3 h-3" /> },
};

const QuotationsListView: React.FC<QuotationsListViewProps> = ({ currentUserEmail, isAdmin, onClose, onEdit }) => {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null);

    // Group by engineer
    const engineerMap = React.useMemo(() => {
        const map: Record<string, { name: string; email: string; quotes: Quotation[] }> = {};
        quotations.forEach(q => {
            if (!map[q.authorEmail]) {
                map[q.authorEmail] = { name: q.authorName, email: q.authorEmail, quotes: [] };
            }
            map[q.authorEmail].quotes.push(q);
        });
        return map;
    }, [quotations]);

    useEffect(() => {
        const fetchQuotations = async () => {
            setLoading(true);
            try {
                let q;
                if (isAdmin) {
                    q = query(collection(db, 'quotations'), orderBy('createdAt', 'desc'));
                } else {
                    // orderBy olmadan sadece where kullan (composite index gerektirmez)
                    q = query(
                        collection(db, 'quotations'),
                        where('authorEmail', '==', currentUserEmail)
                    );
                }
                const snap = await getDocs(q);
                const fetched: Quotation[] = snap.docs.map(d => {
                    const data = d.data() as Omit<Quotation, 'id'>;
                    return { id: d.id, ...data };
                });
                // Client-side sort by createdAt desc
                fetched.sort((a, b) => {
                    const aTime = (a.createdAt as any)?.seconds || 0;
                    const bTime = (b.createdAt as any)?.seconds || 0;
                    return bTime - aTime;
                });
                setQuotations(fetched);
            } catch (err) {
                console.error('Teklifler yüklenemedi:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuotations();
    }, [currentUserEmail, isAdmin]);

    const handleDelete = async (id: string) => {
        if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return;
        try {
            await deleteDoc(doc(db, 'quotations', id));
            setQuotations(prev => prev.filter(q => q.id !== id));
        } catch (err) {
            alert('Silme işlemi başarısız.');
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await updateDoc(doc(db, 'quotations', id), { status });
            setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: status as any } : q));
        } catch (err) {
            alert('Durum güncellenemedi.');
        }
    };

    // JSON olarak yeniden indir
    const handleDownloadJSON = (q: Quotation) => {
        if (!q.data) { alert('Bu teklif için kayıtlı veri bulunamadı.'); return; }
        const fileName = q.fileName || `${q.customerName}_teklif.json`;
        const json = JSON.stringify({ version: '1.0', savedAt: new Date().toISOString(), surveyData: q.data }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const formatDate = (createdAt: any) => {
        if (!createdAt) return '-';
        try {
            const d = createdAt.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt);
            return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return '-'; }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);

    const engineers = Object.values(engineerMap);
    const activeEngineer = selectedEngineer ? engineerMap[selectedEngineer] : null;

    return (
        <div className="fixed inset-0 z-[90] bg-slate-100 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-[#2c3e50] text-white px-6 py-4 flex items-center gap-4 shrink-0 shadow-lg">
                <button
                    onClick={selectedEngineer ? () => setSelectedEngineer(null) : onClose}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="font-bold text-lg flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-amber-400" />
                        {selectedEngineer && activeEngineer
                            ? `${activeEngineer.name} — Teklifler`
                            : 'Hazırlanan Teklifler'}
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {selectedEngineer && activeEngineer
                            ? `${activeEngineer.quotes.length} teklif`
                            : `${engineers.length} mühendis klasörü`}
                    </p>
                </div>

                {/* Kayıt Klasörü Bilgisi */}
                <div className="hidden md:flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-slate-300">
                    <FolderIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-mono truncate max-w-[260px]">TEKLİF DOSYALARI ORTAK KLASÖR</span>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
                    Yükleniyor...
                </div>
            ) : !selectedEngineer ? (
                /* Klasör Görünümü */
                <div className="flex-1 overflow-y-auto p-6">
                    {engineers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                            <FolderOpen className="w-16 h-16 opacity-30" />
                            <p className="text-lg font-semibold">Henüz teklif yok</p>
                            <p className="text-sm">Teklif hazırlayarak bu bölüme kaydedin.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {engineers.map(engineer => (
                                <button
                                    key={engineer.email}
                                    onClick={() => setSelectedEngineer(engineer.email)}
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 text-left group flex flex-col gap-3 hover:-translate-y-1"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md group-hover:scale-110 transition-transform">
                                        {engineer.name.substring(0, 1).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{engineer.name}</div>
                                        <div className="text-xs text-slate-400 truncate">{engineer.email}</div>
                                    </div>
                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                            {engineer.quotes.length} teklif
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Teklif Listesi */
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {activeEngineer?.quotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                            <FileText className="w-16 h-16 opacity-30" />
                            <p className="text-lg font-semibold">Bu mühendise ait teklif yok</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-w-5xl">
                            {activeEngineer?.quotes.map(q => {
                                const sc = statusConfig[q.status] || statusConfig.draft;
                                return (
                                    <div
                                        key={q.id}
                                        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                                    >
                                        {/* Ana satır */}
                                        <div className="flex items-center gap-4 p-4">
                                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                                                <FileText className="w-5 h-5 text-orange-500" />
                                            </div>

                                            {/* Sol: Müşteri bilgisi */}
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="font-bold text-slate-800 text-base truncate">{q.customerName}</div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(q.createdAt)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {q.authorName}
                                                    </span>
                                                    {q.fileName && (
                                                        <button
                                                            onClick={() => handleDownloadJSON(q)}
                                                            className="flex items-center gap-1 text-blue-500 hover:text-blue-700 hover:underline transition-colors font-medium"
                                                            title={`${q.fileName} — JSON İndir`}
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            {q.fileName}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Orta: Tutar */}
                                            <div className="text-right shrink-0">
                                                <div className="text-lg font-black text-slate-800">
                                                    {formatCurrency(q.totalAmount || 0)}
                                                </div>
                                                {isAdmin ? (
                                                    <select
                                                        value={q.status}
                                                        onChange={e => handleStatusChange(q.id, e.target.value)}
                                                        className={`mt-1 text-xs font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none ${sc.color}`}
                                                    >
                                                        <option value="draft">Taslak</option>
                                                        <option value="sent">Gönderildi</option>
                                                        <option value="approved">Onaylandı</option>
                                                        <option value="rejected">Reddedildi</option>
                                                    </select>
                                                ) : (
                                                    <span className={`mt-1 text-xs font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${sc.color}`}>
                                                        {sc.icon}
                                                        {sc.label}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Sağ: Aksiyonlar */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {/* Düzenle */}
                                                <button
                                                    onClick={() => onEdit(q)}
                                                    className="p-2 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                                    title="Teklifi Düzenle"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>

                                                {/* JSON İndir */}
                                                {q.data && (
                                                    <button
                                                        onClick={() => handleDownloadJSON(q)}
                                                        className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="JSON Olarak İndir"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {/* Sil */}
                                                {(isAdmin || q.authorEmail === currentUserEmail) && (
                                                    <button
                                                        onClick={() => handleDelete(q.id)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                        title="Sil"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuotationsListView;
