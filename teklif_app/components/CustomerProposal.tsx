
import React, { useState, useRef } from 'react';
import { SurveyData, ApplianceType, ColumnItem } from '../types';
import { PencilIcon } from './icons';

interface CustomerProposalProps {
    surveyData: SurveyData;
    totalConsumptionKw: number;
    totalPricingCost: number;
    onUpdateNote?: (note: string) => void;
}

// Düzeltme: Logo dosyasını import ederek Vite'ın derlemesini sağlıyoruz.
import defaultLogo from '../../logo/logo-transparent.png';

export const CustomerProposal: React.FC<CustomerProposalProps> = ({
    surveyData,
    totalPricingCost,
    onUpdateNote,
}) => {
    const currentDate = new Date().toLocaleDateString('tr-TR');
    const [isEditingNote, setIsEditingNote] = useState(false);
    const proposalRef = useRef<HTMLDivElement>(null);

    // --- LOGIC SECTION ---
    const gasItem = surveyData.pricingItems.find(i => i.id === 1);
    const heatingItem = surveyData.pricingItems.find(i => i.id === 3);
    const laborItem = surveyData.pricingItems.find(i => i.id === 6);

    const mainServiceType = heatingItem?.selectedOptionName || laborItem?.selectedOptionName || 'Standart Tesisat';
    const mainServiceTypeUpper = mainServiceType.toUpperCase();

    const isHeatPump = mainServiceTypeUpper.includes('ISI POMPASI');
    const isFullInstallation = mainServiceTypeUpper.includes('FULL');
    const isPlasticFree = mainServiceTypeUpper.includes('PLASTİKSİZ');
    const isInteriorGasOnly = mainServiceTypeUpper.includes('İÇ GAZ');
    const isInteriorGasCombiMount = mainServiceTypeUpper === 'İÇ GAZ KOMBİ MONTAJI';
    const isCombiMountOnly = mainServiceType === 'KOMBİ MONTAJI';

    const activeGasSubItems = gasItem && gasItem.units > 0
        ? (gasItem.subItems?.filter(s => s.units > 0 && s.showInProposal !== false) || [])
        : [];

    const customPricingItems = surveyData.pricingItems.filter(item =>
        ![1, 3, 6].includes(item.id) && item.units > 0
    );

    const activeItemForSubItems = heatingItem?.selectedOptionName ? heatingItem : laborItem;
    const activeSubItems = activeItemForSubItems?.subItems?.filter(s => s.units > 0 && s.showInProposal !== false) || [];

    let mainDevice = null;
    if (isHeatPump) mainDevice = surveyData.appliances.find(a => a.type === ApplianceType.HeatPump || a.type.includes('ISI POMPASI') || a.name.includes('ISI POMPASI'));
    if (!mainDevice) mainDevice = surveyData.appliances.find(a => a.type === ApplianceType.Combi || a.type.includes('KOMBİ'));

    const deviceName = mainDevice ? mainDevice.name : (isHeatPump ? 'Isı Pompası Cihazı' : ''); // Empty if no device found
    const deviceKw = mainDevice ? `${mainDevice.consumptionKw} KW` : '';

    const currentMainDevicePrice = mainDevice ? mainDevice.price : 0;

    const totalRadiatorMeters = surveyData.rooms.filter(r => !r.isTowelRail).reduce((sum, r) => {
        const roomTotal = r.radiators ? r.radiators.reduce((acc: number, rad: any) => acc + (rad.length || 0), 0) : 0;
        return sum + roomTotal;
    }, 0);

    const radiatorModelName = surveyData.rooms.length > 0 && surveyData.rooms[0].radiatorModel ? surveyData.rooms[0].radiatorModel : 'DEMİRDÖKÜM PANEL';

    // Column Data Integration
    const showColumnSection = surveyData.columnData?.isIncludedInProposal;
    const activeColumnItems: ColumnItem[] = surveyData.columnData?.items.filter(i => i.quantity > 0) || [];

    // Calculate Column specific quantities for summary list
    const exProofAlarmItem = activeColumnItems.find(i => i.name.includes('EX-PROOF GAZ ALARM MONTAJI'));
    const hasExProofAlarm = exProofAlarmItem && exProofAlarmItem.quantity > 0;

    const karotItem = activeColumnItems.find(i => i.name === 'KAROT');
    const karotCount = karotItem ? karotItem.quantity : 0;

    const valve1InchItem = activeColumnItems.find(i => i.name === '1" DOĞALGAZ VANASI');
    const valve1InchCount = valve1InchItem ? valve1InchItem.quantity : 0;

    // --- VISIBILITY LOGIC UPDATE ---
    const isGasActive = gasItem && gasItem.units > 0;
    const showGasSection = isGasActive && !isCombiMountOnly && !isHeatPump;

    const isHeatingActive = heatingItem ? heatingItem.units > 0 : true;
    const showHeatingSection = isHeatingActive;

    // Numbering Logic
    let sectionCounter = 1;
    const gasSectionNumber = showGasSection ? sectionCounter++ : 0;
    const heatingSectionNumber = showHeatingSection ? sectionCounter++ : 0;
    const columnSectionNumber = showColumnSection ? sectionCounter++ : 0;

    // --- NEW DESCRIPTION LOGIC ---
    const summaryParts: string[] = [];

    if (showGasSection) {
        summaryParts.push("DOĞAL GAZ İÇ TESİSAT");
    }

    if (showHeatingSection) {
        if (isHeatPump) {
            summaryParts.push("ISI POMPASI VE ISITMA SİSTEMİ");
        } else {
            summaryParts.push("KOMBİ VE ISITMA SİSTEMİ");
        }
    }

    if (showColumnSection) {
        summaryParts.push("KOLON TESİSATI");
    }

    const generalTotalDescription = summaryParts.join(" + ");


    const renderApplianceSubItems = () => {
        return surveyData.appliances.flatMap(app => {
            if (!app.subItems) return [];
            return app.subItems
                .filter(s => s.units > 0 && s.showInProposal !== false)
                .map((sub, idx) => (
                    <li key={`app-${app.id}-sub-${idx}`} className="flex items-center uppercase">
                        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 print:bg-brand-500 shrink-0"></span>
                        {sub.name} {sub.units > 1 ? `(${sub.units} ADET)` : ''}
                    </li>
                ));
        });
    };

    return (
        <div ref={proposalRef} id="printable-area" className="bg-white text-black mx-auto shadow-lg print:shadow-none w-[210mm] min-h-[297mm] print:h-[297mm] relative box-border bg-grid-pattern print:bg-none overflow-hidden print:overflow-hidden font-sans flex flex-col">

            {/* Top Padding */}
            <div className="h-[10mm] flex-shrink-0"></div>

            <div className="px-[12mm] flex-grow flex flex-col relative z-10">

                {/* --- HEADER --- */}
                <div className="flex justify-between items-end mb-4 relative flex-shrink-0">
                    <div className="relative w-[45mm] h-[52mm] flex-shrink-0 mr-6 flex items-center justify-center">
                        {surveyData.headerImage ? (
                            <img src={surveyData.headerImage} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <img src={defaultLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                        )}
                    </div>

                    <div className="flex-1 flex flex-col justify-end h-[48mm] pb-1">
                        <div className="relative">
                            <div className="flex items-end justify-between mb-1">
                                <div className="flex items-end gap-4">
                                    <div className="text-[70px] leading-[0.75] font-oswald text-transparent bg-clip-text bg-none text-brand-500 font-medium tracking-tighter" style={{ WebkitTextStroke: '2px #ea580c', transform: 'scaleY(1.4)', transformOrigin: 'bottom left' }}>ONAY</div>
                                    <div className="text-2xl tracking-[0.6em] text-brand-600 mb-2 font-light font-oswald lowercase">mühendislik</div>
                                </div>
                                <div className="mb-2 text-right">
                                    <div className="text-[10px] font-bold text-gray-700 mb-1 mr-1 uppercase font-oswald">TARİH:</div>
                                    <div className="border border-slate-900 px-4 py-1 text-sm font-bold min-w-[30mm] text-center bg-white/80 font-oswald text-black">{currentDate}</div>
                                </div>
                            </div>
                            <div className="w-full h-[6px] bg-brand-500 rounded-sm shadow-sm"></div>
                        </div>
                        <div className="pt-2 pl-1">
                            <h2 className="text-2xl font-bold text-brand-700 tracking-wide font-oswald uppercase">Necati Koray KARADAĞ</h2>
                            <p className="text-sm text-slate-900 tracking-[0.2em] uppercase font-bold">makina mühendisi</p>
                        </div>
                    </div>
                </div>

                {/* --- CUSTOMER SECTION (Compressed) --- */}
                <div className="mt-4 border-2 border-slate-900 bg-white shadow-sm flex-shrink-0">
                    <div className="flex border-b-2 border-slate-900 min-h-[8mm]">
                        <div className="w-[30mm] p-1 border-r-2 border-slate-900 bg-gray-100 font-bold text-xs flex items-center justify-center font-oswald tracking-wide text-black">SAYIN</div>
                        <div className="flex-1 p-1 font-bold text-sm uppercase flex items-center text-black font-oswald pl-2">{surveyData.customerName || '.......................................'}</div>
                    </div>
                    <div className="flex min-h-[8mm]">
                        <div className="w-[30mm] p-1 border-r-2 border-slate-900 bg-gray-100 font-bold text-xs flex items-center justify-center font-oswald tracking-wide text-black">DİKKATİNE;</div>
                        <div className="flex-1 p-1 font-bold flex items-center text-black text-[10px] pl-2">
                            {surveyData.address ? (
                                <span><span className="font-bold">Adres:</span> {surveyData.address} <span className="mx-2">|</span> <span className="font-bold">Tel:</span> {surveyData.phoneNumber}</span>
                            ) : (
                                'Binanızda yapmış olduğumuz keşif sonucu oluşturduğumuz teklifimiz aşağıdadır.'
                            )}
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT --- */}
                <div className="flex-grow mt-4 relative">
                    <div className="grid grid-cols-1 gap-4">

                        {/* 1. Gas */}
                        {showGasSection && (
                            <div className="relative">
                                <h4 className="text-sm font-bold text-brand-600 uppercase mb-1 border-b-2 border-brand-500 inline-block pb-0.5 font-oswald">{gasSectionNumber}. Doğal Gaz İç Tesisat</h4>
                                <div className="pl-4 border-l-2 border-slate-400">
                                    <ul className="space-y-0.5 text-[10px] text-black font-bold leading-tight uppercase">
                                        {activeGasSubItems.map((sub, idx) => (
                                            <li key={`gas-sub-${idx}`} className="flex items-start"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 mt-1 shrink-0"></span><span>{sub.name}</span></li>
                                        ))}
                                        {customPricingItems.map(item => (
                                            <li key={item.id} className="flex items-start"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 mt-1 shrink-0"></span><span>{item.name}</span></li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* 2. Heating & Room Distribution (Side by Side) */}
                        {showHeatingSection && (
                            <div className="relative flex gap-4">
                                {/* Left Side: List */}
                                <div className="flex-grow">
                                    <h4 className="text-sm font-bold text-brand-600 uppercase mb-1 border-b-2 border-brand-500 inline-block pb-0.5 font-oswald">
                                        {heatingSectionNumber}. {isHeatPump ? 'Isı Pompası ve Isıtma Sistemi' : 'Kombi ve Isıtma Sistemi'}
                                    </h4>

                                    <div className="pl-4 border-l-2 border-brand-200">
                                        <div className="bg-brand-50 border border-brand-100 rounded-sm p-1.5 mb-2 flex justify-between items-center">
                                            <div><span className="text-[8px] font-bold text-brand-600 uppercase tracking-wider block mb-0 font-oswald">CİHAZ</span><p className="font-bold text-black text-xs uppercase font-oswald">{deviceName}</p></div>
                                            {deviceKw && <span className="bg-white text-brand-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-brand-200 whitespace-nowrap ml-2 font-oswald">{deviceKw}</span>}
                                        </div>

                                        <ul className="space-y-0.5 text-[10px] text-black font-bold leading-tight uppercase">
                                            {/* Radiator Summary - GLOBAL for all heating types if radiators exist */}
                                            {totalRadiatorMeters > 0 && (
                                                <li className="flex items-center font-bold text-brand-700">
                                                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 shrink-0"></span>
                                                    {radiatorModelName} RADYATÖRLER (TOPLAM {totalRadiatorMeters.toFixed(1)} METRE)
                                                </li>
                                            )}

                                            {isHeatPump ? (
                                                <>
                                                    <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>Isı Pompası Montaj Seti (2 Adet Vana + 1 Adet Çekvalf)</li>
                                                    {activeSubItems.map((sub, idx) => (<li key={idx} className="flex items-center"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 shrink-0"></span>{sub.name} {sub.units > 1 ? `(${sub.units} ADET)` : ''}</li>))}
                                                    {renderApplianceSubItems()}
                                                    {isFullInstallation && (<li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>Kalorifer / Yerden Isıtma Tesisatı Bağlantıları</li>)}
                                                    <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>TÜM SİSTEM İMALAT, MONTAJ VE TEST İŞÇİLİĞİ</li>
                                                </>
                                            ) : isCombiMountOnly ? (
                                                <>
                                                    <li className="flex items-center"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 shrink-0"></span>MÜHENDİSLİK HİZMETLERİ (PROJE ÇİZİMİ VE GAZ AÇIMI)</li>
                                                    <li className="flex items-center"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 shrink-0"></span>CAM MENFEZİ VE ELEKTRİK ŞALTERİ MONTAJI</li>
                                                    {activeSubItems.map((sub, idx) => (<li key={idx} className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>{sub.name} {sub.units > 1 ? `(${sub.units} ADET)` : ''}</li>))}
                                                    {renderApplianceSubItems()}
                                                    <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>İŞÇİLİK VE MONTAJ ÜCRETİ</li>
                                                </>
                                            ) : isPlasticFree ? (
                                                <>
                                                    {activeSubItems.map((sub, idx) => (<li key={idx} className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>{sub.name} {sub.units > 1 ? `(${sub.units} ADET)` : ''}</li>))}
                                                    {renderApplianceSubItems()}
                                                    <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>TÜM SİSTEM İMALAT, MONTAJ VE TEST İŞÇİLİĞİ</li>
                                                </>
                                            ) : isInteriorGasCombiMount ? (
                                                <>
                                                    <li className="flex items-center"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 shrink-0"></span>KOMBİ BAĞLANTI SETİ (4 ADET VANA + 2 ADET FİLTRE)</li>
                                                    {activeSubItems.map((sub, idx) => (<li key={idx} className="flex items-center"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 shrink-0"></span>{sub.name} {sub.units > 1 ? `(${sub.units} ADET)` : ''}</li>))}
                                                    {renderApplianceSubItems()}
                                                    <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>MONTAJ VE İŞÇİLİK</li>
                                                </>
                                            ) : (
                                                <>
                                                    {isFullInstallation && (<li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>Komple Kalorifer Tesisatı (PPRC / Mobil Sistem)</li>)}
                                                    {isInteriorGasOnly ? (
                                                        <>
                                                            <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>Sadece Kombi Montajı ve Gaz Bağlantısı</li>
                                                            {activeSubItems.map((sub, idx) => (<li key={idx} className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>{sub.name} {sub.units > 1 ? `(${sub.units} ADET)` : ''}</li>))}
                                                            {renderApplianceSubItems()}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {activeSubItems.map((sub, idx) => (<li key={idx} className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>{sub.name} {sub.units > 1 ? `(${sub.units} ADET)` : ''}</li>))}
                                                            {renderApplianceSubItems()}
                                                            <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>Kombi Alt Bağlantı Seti (Vana ve Filtreler)</li>
                                                            <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>Tüm Sistem İmalat, Montaj ve Test İşçiliği</li>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </ul>
                                    </div>
                                </div>

                                {/* Right Side: Room Distribution */}
                                {surveyData.rooms.length > 0 && (
                                    <div className="w-[60mm] shrink-0">
                                        <div className="border border-slate-900 rounded-sm bg-white h-full flex flex-col">
                                            {/* Header */}
                                            <div className="bg-slate-200 border-b border-slate-900 p-1 flex justify-between items-center text-[7px] font-bold font-oswald text-black">
                                                <span>ODA ADI</span>
                                                <span>YÜK. x UZUNLUK</span>
                                            </div>

                                            {/* List */}
                                            <div className="flex flex-col">
                                                {surveyData.rooms.map((room) => (
                                                    <div key={room.id} className="border-b border-dashed border-slate-300 last:border-0 p-1 flex justify-between items-start text-[8px] leading-tight">
                                                        {/* Room Name */}
                                                        <div className="font-bold text-black uppercase w-[40%] pr-1">
                                                            {room.name}
                                                        </div>

                                                        {/* Radiators List */}
                                                        <div className="w-[60%] text-right font-medium text-black">
                                                            {room.isTowelRail ? (
                                                                <div>{room.towelRailSize || 'STD'} (HAVLUPAN)</div>
                                                            ) : (
                                                                room.radiators && room.radiators.length > 0 ? (
                                                                    room.radiators.map((rad: any, rIdx: number) => (
                                                                        <div key={rIdx} className="grid grid-cols-[25px_10px_35px] text-[8px] leading-tight justify-end text-right">
                                                                            <span className="font-bold text-right">{room.radiatorHeight || 600}</span>
                                                                            <span className="text-center">x</span>
                                                                            <span className="font-bold text-left">{rad.length.toFixed(1)} m</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span>-</span>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Column Installation Summary (Text List) */}
                        {showColumnSection && (
                            <div className="relative mt-2">
                                <h4 className="text-sm font-bold text-brand-600 uppercase mb-1 border-b-2 border-brand-500 inline-block pb-0.5 font-oswald">
                                    {columnSectionNumber}. KOLON TESİSATI
                                </h4>
                                <div className="pl-4 border-l-2 border-slate-600">
                                    <ul className="space-y-0.5 text-[10px] text-black font-bold leading-tight uppercase">
                                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>MÜHENDİSLİK HİZMETLERİ</li>
                                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>PROJELENDİRME / GAZ AÇIMI</li>
                                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>DOĞAL GAZ KOLON TESİSATI MALZEMESİ</li>
                                        {hasExProofAlarm && (
                                            <li className="flex items-center"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 shrink-0"></span>ÇATIYA 1 ADET GAZ ALARM CİHAZININ MONTAJLANMASI</li>
                                        )}
                                        {karotCount > 0 && (
                                            <li className="flex items-center"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 shrink-0"></span>KAT GEÇİŞLERİ İÇİN KAROT DELİMİNİN YAPILMASI ({karotCount} ADET)</li>
                                        )}
                                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>ANA KESME VE MEKANİK DEPREM VANASI(ESKA,FRS YA DA FAY MARKA)</li>
                                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>METAL VANA DOLABI</li>
                                        {valve1InchCount > 0 && (
                                            <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>TOPLAM BRANŞMAN VANASI ({valve1InchCount} ADET)</li>
                                        )}
                                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>BAKIR TOPRAKLAMA ÇUBUĞU</li>
                                        <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2 shrink-0"></span>KOLON TESİSATI KAYNAKLI İMALAT VE MONTAJ İŞÇİLİĞİ</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="mt-2 mb-2 relative group print:mt-1">
                        {/* Edit Button / Add Trigger */}
                        {!isEditingNote && (
                            <>
                                {/* Print-only style to absolutely guarantee hiding */}
                                <style media="print">
                                    {`
                                    .no-print-force {
                                        display: none !important;
                                    }
                                    `}
                                </style>
                                {/* Trigger Area - Invisible unless hovered or empty note */}
                                <div className={`relative no-print-force ${!surveyData.proposalNote ? 'h-6 group/note flex items-center justify-center' : 'opacity-0 hover:opacity-100 absolute -top-6 right-0'}`}>
                                    <button
                                        onClick={() => setIsEditingNote(true)}
                                        className={`flex items-center text-[10px] font-bold transition-all duration-200 
                                            ${!surveyData.proposalNote
                                                ? 'opacity-0 group-hover/note:opacity-100 text-slate-400 hover:text-blue-600 border border-transparent hover:border-blue-200 bg-transparent hover:bg-blue-50 px-3 py-0.5 rounded-full'
                                                : 'text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100'}`}
                                    >
                                        <PencilIcon className="w-3 h-3 mr-1" />
                                        {surveyData.proposalNote ? 'Notu Düzenle' : '+ Not Ekle'}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Edit Mode */}
                        {isEditingNote ? (
                            <div className="no-print">
                                <textarea
                                    className="w-full p-2 border border-blue-400 rounded text-xs text-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                                    rows={3}
                                    placeholder="Buraya teklif için özel bir not girebilirsiniz..."
                                    value={surveyData.proposalNote || ''}
                                    onChange={(e) => onUpdateNote && onUpdateNote(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex justify-end mt-1 space-x-2">
                                    <button onClick={() => { onUpdateNote && onUpdateNote(''); setIsEditingNote(false); }} className="text-xs text-red-600 hover:underline px-2">Sil</button>
                                    <button onClick={() => setIsEditingNote(false)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Tamam</button>
                                </div>
                            </div>
                        ) : (
                            /* Display Mode */
                            surveyData.proposalNote ? (
                                <div className="border border-slate-400 rounded p-2 bg-white">
                                    <h5 className="text-[9px] font-bold text-slate-600 uppercase mb-0.5 font-oswald">ÖZEL NOTLAR:</h5>
                                    <p className="text-[9px] text-black font-medium whitespace-pre-wrap leading-tight">{surveyData.proposalNote}</p>
                                </div>
                            ) : null
                        )}
                    </div>

                    {/* Watermark */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150mm] h-[150mm] pointer-events-none text-brand-500/5 z-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                            <path d="M15,45 L40,75 L95,10 L85,2 L40,55 L25,35 Z" />
                        </svg>
                    </div>
                </div>

                {/* --- FOOTER & TOTALS --- */}
                <div className="mt-auto relative z-20">
                    <div className="mb-4">
                        <table className="w-full border-collapse border-2 border-slate-900 text-[10px] uppercase">
                            <tbody>
                                <tr className="bg-white">
                                    <td className="border-r-2 border-b border-slate-900 p-1.5 font-bold font-oswald text-black w-[85%] align-middle text-sm">
                                        {generalTotalDescription.toUpperCase()}
                                    </td>
                                    <td className="border-b border-slate-900 p-1.5 text-center font-bold font-oswald bg-slate-200 text-black w-[15%] align-middle text-xs">
                                        GENEL TOPLAMLAR
                                    </td>
                                </tr>
                                <tr className="bg-white h-8">
                                    <td className="border-r-2 border-b border-slate-900 p-1.5 font-bold font-oswald text-black align-middle text-sm flex justify-between items-center">
                                        {deviceName && (
                                            <span>{deviceName} <span className="text-brand-600">({isHeatPump ? 'TAVSİYE EDİLEN CİHAZ' : 'TAVSİYE EDİLEN KOMBİ'})</span></span>
                                        )}
                                        <div className="text-[8px] font-bold text-slate-600 border-l border-slate-400 pl-2 ml-2 h-full flex items-center">
                                            İLE:
                                        </div>
                                    </td>
                                    <td className="border-b border-slate-900 p-1 text-center align-middle">
                                        <div className="text-base font-bold text-black font-oswald whitespace-nowrap">{totalPricingCost.toLocaleString('tr-TR')} TL</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Alternative Offers */}
                    {surveyData.extraOffers.length > 0 && (
                        <div className="mb-2">
                            <div className="text-[10px] font-bold text-black mb-0.5 uppercase font-oswald">ALTERNATİF KOMBİ SEÇENEKLERİ</div>
                            <table className="w-full border-collapse border border-slate-900 text-[9px]">
                                <thead>
                                    <tr className="bg-slate-200 text-black">
                                        <th className="border border-slate-900 p-1 text-left font-oswald w-[85%] text-xs">KOMBİ MODELİ</th>
                                        <th className="border border-slate-900 p-1 text-center font-oswald w-[15%] text-xs">GENEL TOPLAM</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {surveyData.extraOffers.map((offer) => {
                                        const newTotal = totalPricingCost - currentMainDevicePrice + offer.price;
                                        return (
                                            <tr key={offer.id} className="bg-white">
                                                <td className="border border-slate-900 p-1.5 font-bold font-oswald text-black text-sm uppercase align-middle">
                                                    <div><span className="inline-block w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 align-middle"></span><span className="align-middle">{offer.name}</span></div>
                                                </td>
                                                <td className="border border-slate-900 p-1.5 text-center font-bold text-black font-oswald whitespace-nowrap text-base align-middle">
                                                    <div>{newTotal.toLocaleString('tr-TR')} TL</div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer Address */}
                    <div className="w-full relative mt-1">
                        <div className="flex justify-between items-end px-[4mm] pb-1 text-[9px] font-bold text-black font-oswald uppercase tracking-wide">
                            <div>Yeni Mah.Cumhuriyet Cad.No:70/A Yatağan/Muğla <span className="ml-1 text-black font-semibold">Tel: 0252 572 6629</span></div>
                            <div>İsmetpaşa Mah.Sanayi Cad.No : 26B Milas/Muğla <span className="ml-1 text-black font-semibold">Tel: 0252 512 6625</span></div>
                        </div>
                        <div className="w-full h-[4mm] bg-brand-500"></div>
                    </div>
                </div>

            </div>
        </div>
    );
};
