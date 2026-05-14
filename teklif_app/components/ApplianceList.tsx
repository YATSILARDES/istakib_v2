
import React, { useState, useEffect } from 'react';
import { Appliance, ApplianceType, ExtraOffer, ApplianceDefinition, PricingSubItem } from '../types';
import { PlusCircleIcon, TrashIcon, PencilIcon, LockOpenIcon, LockClosedIcon, CheckIcon, XMarkIcon } from './icons';
import { SuggestionInput } from './SuggestionInput';

interface ApplianceListProps {
    appliances: Appliance[];
    extraOffers?: ExtraOffer[];
    onAddAppliance: (applianceType: ApplianceType | string) => void;
    onUpdateAppliance: (id: string, updates: Partial<Appliance>) => void;
    onDeleteAppliance: (index: number) => void;
    // New handlers for Appliance Sub Items
    handleAddApplianceSubItem?: (applianceId: string, name: string) => void;
    handleUpdateApplianceSubItem?: (applianceId: string, subId: string, updates: Partial<PricingSubItem>) => void;
    handleDeleteApplianceSubItem?: (applianceId: string, subId: string) => void;
    onAddExtraOffer?: (name: string, price: number) => void;
    onDeleteExtraOffer?: (id: string) => void;
    globalPrices?: Record<string, number>;
    // Dynamic Props
    applianceDefinitions?: ApplianceDefinition[];
    applianceModelMap?: Record<string, string[]>; 
    onAddDefinition?: (name?: string, consumptionKw?: number) => void;
    onUpdateDefinition?: (oldType: string, newName: string) => void;
    onDeleteDefinition?: (type: string) => void;
    onAddModel?: (type: string, model?: string) => void; 
    onUpdateModel?: (type: string, oldModel: string, newModel: string) => void; 
    onDeleteModel?: (type: string, model: string) => void; 
    suggestions?: string[];
}

export const ApplianceList: React.FC<ApplianceListProps> = ({ 
    appliances, 
    extraOffers, 
    onAddAppliance, 
    onUpdateAppliance, 
    onDeleteAppliance,
    handleAddApplianceSubItem,
    handleUpdateApplianceSubItem,
    handleDeleteApplianceSubItem,
    onAddExtraOffer,
    onDeleteExtraOffer,
    globalPrices = {},
    applianceDefinitions = [],
    applianceModelMap = {}, 
    onAddDefinition,
    onUpdateDefinition,
    onDeleteDefinition,
    onAddModel,
    onUpdateModel,
    onDeleteModel,
    suggestions = []
}) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [isEditingDefinition, setIsEditingDefinition] = useState(false);
    const [tempDefinitionName, setTempDefinitionName] = useState('');
    const [modelAction, setModelAction] = useState<{ type: 'add' | 'edit', applianceId: string } | null>(null);
    const [tempModelName, setTempModelName] = useState('');
    const [extraOfferModelAction, setExtraOfferModelAction] = useState<'add' | 'edit' | null>(null);
    const [tempExtraOfferModelName, setTempExtraOfferModelName] = useState('');
    const [combiAction, setCombiAction] = useState<{ type: 'add' | 'edit', applianceId: string } | null>(null); // Kept for backward compatibility if needed, but generic modelAction is preferred

    const definitions = applianceDefinitions.length > 0 ? applianceDefinitions : [];
    const defaultType = definitions.length > 0 ? definitions[0].type : 'KOMBİ';
    const [selectedApplianceType, setSelectedApplianceType] = useState<string>(defaultType);
    
    useEffect(() => {
        if (!definitions.find(d => d.type === selectedApplianceType) && definitions.length > 0) {
            setSelectedApplianceType(definitions[0].type);
        }
    }, [definitions, selectedApplianceType]);

    const combiModels = applianceModelMap['KOMBİ'] || [];
    const allModels = Object.values(applianceModelMap).flat();
    const [newExtraOfferModel, setNewExtraOfferModel] = useState(combiModels.length > 0 ? combiModels[0] : (allModels.length > 0 ? allModels[0] : ''));
    const [newExtraOfferPrice, setNewExtraOfferPrice] = useState(0);

    const handleAddClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onAddAppliance(selectedApplianceType);
    };

    const getKwFromModelName = (name: string): number => {
        const match = name.match(/\b(18|19|20|24|25|28|30|32|33|34|35|42|45|50)\b/);
        if (match && match[1]) return parseInt(match[1], 10);
        return 24;
    }

    const handleModelChange = (id: string, newName: string) => {
        const newKw = getKwFromModelName(newName);
        const autoPrice = globalPrices[newName] !== undefined ? globalPrices[newName] : 0;
        const updates: Partial<Appliance> = { name: newName, consumptionKw: newKw, price: autoPrice };
        onUpdateAppliance(id, updates);
    };

    // ... Definition & Model Handlers (Same as before) ...
    const handleAddDefinitionClick = (e: React.MouseEvent) => { e.preventDefault(); if (onAddDefinition) onAddDefinition(); };
    const handleStartEditingDefinition = (e: React.MouseEvent) => { e.preventDefault(); const def = definitions.find(d => d.type === selectedApplianceType); setTempDefinitionName(def ? def.name : selectedApplianceType); setIsEditingDefinition(true); };
    const handleSaveDefinition = (e: React.MouseEvent) => { e.preventDefault(); if (tempDefinitionName && onUpdateDefinition) { onUpdateDefinition(selectedApplianceType, tempDefinitionName); setSelectedApplianceType(tempDefinitionName.toUpperCase()); setIsEditingDefinition(false); } };
    const handleCancelEditingDefinition = (e: React.MouseEvent) => { e.preventDefault(); setIsEditingDefinition(false); };
    const handleDeleteDefinitionClick = (e: React.MouseEvent) => { e.preventDefault(); if (onDeleteDefinition) onDeleteDefinition(selectedApplianceType); };
    
    const handleStartAddModel = (e: React.MouseEvent, applianceId: string) => { e.preventDefault(); e.stopPropagation(); setModelAction({ type: 'add', applianceId }); setTempModelName(''); };
    const handleStartEditModel = (e: React.MouseEvent, applianceId: string, currentName: string) => { e.preventDefault(); e.stopPropagation(); setModelAction({ type: 'edit', applianceId }); setTempModelName(currentName); };
    const handleCancelModelAction = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setModelAction(null); };
    const handleSaveModelAction = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); if (!modelAction || !tempModelName.trim()) { setModelAction(null); return; } const currentApp = appliances.find(a => a.id === modelAction.applianceId); if (!currentApp) { setModelAction(null); return; } if (modelAction.type === 'add' && onAddModel) { onAddModel(currentApp.type, tempModelName.toUpperCase()); handleModelChange(modelAction.applianceId, tempModelName.toUpperCase()); } else if (modelAction.type === 'edit' && onUpdateModel) { onUpdateModel(currentApp.type, currentApp.name, tempModelName.toUpperCase()); handleModelChange(modelAction.applianceId, tempModelName.toUpperCase()); } setModelAction(null); };
    const handleDeleteModelClick = (e: React.MouseEvent, type: string, modelName: string) => { e.preventDefault(); e.stopPropagation(); if (onDeleteModel) onDeleteModel(type, modelName); }

    // Extra Offer Handlers
    const handleExtraOfferModelChange = (modelName: string) => { setNewExtraOfferModel(modelName); if (globalPrices[modelName] !== undefined) { setNewExtraOfferPrice(globalPrices[modelName]); } else { setNewExtraOfferPrice(0); } };
    const handleAddExtraOfferClick = (e: React.MouseEvent) => { e.preventDefault(); if (newExtraOfferPrice > 0 && onAddExtraOffer) { onAddExtraOffer(newExtraOfferModel, newExtraOfferPrice); } };
    const handleStartAddExtraModel = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setExtraOfferModelAction('add'); setTempExtraOfferModelName(''); };
    const handleStartEditExtraModel = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setExtraOfferModelAction('edit'); setTempExtraOfferModelName(newExtraOfferModel); };
    const handleCancelExtraModelAction = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setExtraOfferModelAction(null); };
    const handleSaveExtraModelAction = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); if (!tempExtraOfferModelName.trim()) { setExtraOfferModelAction(null); return; } const targetType = 'KOMBİ'; if (extraOfferModelAction === 'add' && onAddModel) { onAddModel(targetType, tempExtraOfferModelName.toUpperCase()); setNewExtraOfferModel(tempExtraOfferModelName.toUpperCase()); } else if (extraOfferModelAction === 'edit' && onUpdateModel) { onUpdateModel(targetType, newExtraOfferModel, tempExtraOfferModelName.toUpperCase()); setNewExtraOfferModel(tempExtraOfferModelName.toUpperCase()); } setExtraOfferModelAction(null); };
    const handleDeleteExtraModelClick = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); if (onDeleteModel) onDeleteModel('KOMBİ', newExtraOfferModel); }

    // SUB-ITEM RENDER HELPER
    const renderSubItems = (appliance: Appliance) => {
        if (!appliance.subItems) return null;
        const hasActiveItems = appliance.subItems.length > 0;

        return (
            <div className="mt-2 bg-slate-100/70 rounded p-2 border border-slate-200">
                <div className="flex justify-between items-center mb-2 px-1">
                    <div className="grid grid-cols-12 gap-2 w-full text-[10px] font-bold text-slate-500 uppercase">
                        <div className="col-span-4">Alt Malzeme</div>
                        <div className="col-span-1 text-center">Durum</div>
                        <div className="col-span-2">Birim</div>
                        <div className="col-span-3">Birim Fiyat</div>
                        <div className="col-span-2 text-right">Tutar</div>
                    </div>
                    
                    <div className="flex-shrink-0 ml-2">
                         <button 
                            onMouseDown={(e) => {
                                e.preventDefault();
                                if (handleAddApplianceSubItem) handleAddApplianceSubItem(appliance.id, "YENİ MALZEME");
                            }}
                            className="text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap"
                        >
                            + Ekle
                        </button>
                    </div>
                </div>

                {appliance.subItems.map(sub => {
                    const isEnabled = sub.units > 0;
                    return (
                        <div key={sub.id} className="grid grid-cols-12 gap-2 items-center py-1 border-t border-slate-200 text-xs">
                            {/* NAME */}
                            <div className="col-span-4">
                                {isEditMode ? (
                                    <SuggestionInput 
                                        value={sub.name}
                                        onChange={(val) => { if(handleUpdateApplianceSubItem) handleUpdateApplianceSubItem(appliance.id, sub.id, { name: val }) }}
                                        onSelect={(val) => {
                                            const price = globalPrices[val];
                                            if (price !== undefined && handleUpdateApplianceSubItem) {
                                                handleUpdateApplianceSubItem(appliance.id, sub.id, { name: val, rate: price });
                                            } else if (handleUpdateApplianceSubItem) {
                                                handleUpdateApplianceSubItem(appliance.id, sub.id, { name: val });
                                            }
                                        }}
                                        suggestions={suggestions}
                                        className={`w-full bg-white border border-slate-300 rounded px-1 py-0.5 uppercase ${isEnabled ? 'text-slate-800' : 'text-slate-400'}`}
                                    />
                                ) : (
                                    <span className={`block truncate uppercase ${isEnabled ? 'text-slate-800 font-medium' : 'text-slate-400'}`} title={sub.name}>{sub.name}</span>
                                )}
                            </div>

                            {/* TOGGLE */}
                            <div className="col-span-1 flex justify-center">
                                <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if(handleUpdateApplianceSubItem) handleUpdateApplianceSubItem(appliance.id, sub.id, { units: isEnabled ? 0 : 1 }); }}
                                    className={`relative inline-flex items-center h-4 rounded-full w-7 shrink-0 transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled ? 'bg-green-600' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block w-2.5 h-2.5 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${isEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            {/* UNITS */}
                            <div className="col-span-2">
                                <input
                                    type="number"
                                    value={sub.units === 0 ? '' : sub.units}
                                    placeholder="0"
                                    onChange={(e) => {
                                        if(handleUpdateApplianceSubItem) handleUpdateApplianceSubItem(appliance.id, sub.id, { units: e.target.valueAsNumber || 0 });
                                    }}
                                    className={`w-full p-1 text-right border border-slate-300 rounded bg-white text-xs ${!isEnabled ? 'opacity-50' : ''}`}
                                />
                            </div>

                            {/* RATE */}
                            <div className="col-span-3 relative">
                                <input
                                    type="number"
                                    value={sub.rate === 0 ? '' : sub.rate}
                                    placeholder="0"
                                    onChange={(e) => {
                                        if(handleUpdateApplianceSubItem) handleUpdateApplianceSubItem(appliance.id, sub.id, { rate: e.target.valueAsNumber || 0 });
                                    }}
                                    className={`w-full p-1 text-right border border-slate-300 rounded bg-white text-xs font-semibold ${!isEnabled ? 'opacity-50' : ''}`}
                                />
                            </div>

                            {/* TOTAL & DELETE */}
                            <div className="col-span-2 flex items-center justify-end gap-1">
                                <span className={`font-bold whitespace-nowrap ${isEnabled ? 'text-slate-700' : 'text-slate-300'}`}>
                                    {(sub.units * sub.rate).toLocaleString('tr-TR')}
                                </span>
                                {isEditMode && (
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if(handleDeleteApplianceSubItem) handleDeleteApplianceSubItem(appliance.id, sub.id); }}
                                        className="text-slate-400 hover:text-red-500 ml-1"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md print-container">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h2 className="text-xl font-bold text-slate-800">Cihazlar ve Fiyatlandırma</h2>
                <button
                    type="button"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition border ${isEditMode ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
                >
                    {isEditMode ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                    <span>{isEditMode ? 'Düzenleme Açık' : 'Kilitli'}</span>
                </button>
            </div>

            {/* Add Appliance Section */}
            <div className="no-print flex flex-col gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="text-xs font-semibold text-slate-500">Cihaz Ekle</label>
                <div className="flex items-center gap-2">
                    <div className="flex-grow relative flex items-center">
                        {isEditingDefinition ? (
                            <div className="flex-grow flex items-center gap-1 w-full">
                                <input type="text" value={tempDefinitionName} onChange={(e) => setTempDefinitionName(e.target.value)} className="flex-grow p-2 border border-blue-500 rounded-md bg-white focus:outline-none uppercase font-medium text-sm" autoFocus />
                                <button type="button" onMouseDown={handleSaveDefinition} className="bg-green-500 text-white p-2 rounded hover:bg-green-600"><CheckIcon className="w-5 h-5" /></button>
                                <button type="button" onMouseDown={handleCancelEditingDefinition} className="bg-slate-300 text-slate-600 p-2 rounded hover:bg-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                            </div>
                        ) : (
                            <select value={selectedApplianceType} onChange={(e) => setSelectedApplianceType(e.target.value)} className="flex-grow p-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {definitions.filter(d => d.type !== ApplianceType.Cabinet).map(def => (
                                    <option key={def.type} value={def.type}>{def.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    {isEditMode && !isEditingDefinition && onUpdateDefinition && (<button type="button" onMouseDown={handleStartEditingDefinition} className="bg-white border border-slate-300 text-slate-500 p-2 rounded hover:bg-blue-50 hover:text-blue-600"><PencilIcon className="w-5 h-5" /></button>)}
                    {isEditMode && !isEditingDefinition && onAddDefinition && (<button type="button" onMouseDown={handleAddDefinitionClick} className="bg-white border border-slate-300 text-blue-600 p-2 rounded hover:bg-blue-50"><PlusCircleIcon className="w-5 h-5" /></button>)}
                    {isEditMode && !isEditingDefinition && onDeleteDefinition && (<button type="button" onMouseDown={handleDeleteDefinitionClick} className="bg-white border border-slate-300 text-red-500 p-2 rounded hover:bg-red-50"><TrashIcon className="w-5 h-5" /></button>)}
                    {!isEditingDefinition && (<button type="button" onMouseDown={handleAddClick} className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition"><PlusCircleIcon className="w-5 h-5" /><span>Ekle</span></button>)}
                </div>
            </div>

            <div className="space-y-3 mb-8">
                {appliances.filter(a => a.type !== ApplianceType.Cabinet).length > 0 && (
                    <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-2">
                        <div className="col-span-5">Cihaz / Model</div>
                        <div className="col-span-2">Tüketim (kW)</div>
                        <div className="col-span-1">Adet</div>
                        <div className="col-span-2">Birim Fiyat</div>
                        <div className="col-span-2 text-right">Tutar</div>
                    </div>
                )}

                {appliances.map((appliance, index) => {
                    if (appliance.type === ApplianceType.Cabinet) return null;
                    const availableModels = applianceModelMap?.[appliance.type] || [];
                    const isModelActionActive = modelAction?.applianceId === appliance.id;

                    return (
                        <div key={appliance.id} className="bg-white p-3 rounded-md border border-slate-200 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                {/* Name / Selection */}
                                <div className="sm:col-span-5 flex flex-col">
                                    <span className="text-xs text-slate-500 sm:hidden">Cihaz / Model</span>
                                    <div className="flex items-center gap-1">
                                        {isModelActionActive ? (
                                            <div className="flex-grow flex items-center gap-1 w-full">
                                                <SuggestionInput value={tempModelName} onChange={(val) => setTempModelName(val)} onSelect={(val) => setTempModelName(val)} suggestions={suggestions} className="w-full p-1.5 text-sm border border-blue-500 rounded focus:outline-none bg-white uppercase" placeholder={modelAction.type === 'add' ? `YENİ ${appliance.type} MODELİ` : ""} autoFocus />
                                                <button type="button" onMouseDown={handleSaveModelAction} className="bg-green-500 text-white p-1.5 rounded hover:bg-green-600"><CheckIcon className="w-4 h-4" /></button>
                                                <button type="button" onMouseDown={handleCancelModelAction} className="bg-slate-300 text-slate-600 p-1.5 rounded hover:bg-slate-400"><XMarkIcon className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <select value={appliance.name} onChange={(e) => handleModelChange(appliance.id, e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded focus:ring-blue-500 bg-white">
                                                    {!availableModels.includes(appliance.name) && appliance.name !== `${appliance.type} (Genel)` && <option value={appliance.name}>{appliance.name}</option>}
                                                    <option value={`${appliance.type} (Genel)`}>{appliance.type} (Genel)</option>
                                                    {availableModels.map(model => <option key={model} value={model}>{model}</option>)}
                                                </select>
                                                {onAddModel && (<button type="button" onMouseDown={(e) => handleStartAddModel(e, appliance.id)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded border border-slate-200 bg-slate-50 shrink-0"><PlusCircleIcon className="w-4 h-4" /></button>)}
                                                {isEditMode && onUpdateModel && (<button type="button" onMouseDown={(e) => handleStartEditModel(e, appliance.id, appliance.name)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded shrink-0"><PencilIcon className="w-4 h-4" /></button>)}
                                                {isEditMode && onDeleteModel && (<button type="button" onMouseDown={(e) => handleDeleteModelClick(e, appliance.type, appliance.name)} className="text-red-400 hover:bg-red-50 p-1 rounded shrink-0"><TrashIcon className="w-4 h-4" /></button>)}
                                            </>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500">{appliance.type}</span>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="text-xs text-slate-500 sm:hidden block">Tüketim (kW)</label>
                                    <input type="number" value={appliance.consumptionKw === 0 ? '' : appliance.consumptionKw} placeholder="0" onChange={(e) => onUpdateAppliance(appliance.id, { consumptionKw: e.target.valueAsNumber || 0 })} className="w-full p-1.5 text-sm border border-slate-300 rounded bg-slate-50" />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="text-xs text-slate-500 sm:hidden block">Adet</label>
                                    <input type="number" value={appliance.count} onChange={(e) => onUpdateAppliance(appliance.id, { count: e.target.valueAsNumber || 1 })} className="w-full p-1.5 text-sm border border-slate-300 rounded focus:ring-blue-500 bg-white" min="1" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs text-slate-500 sm:hidden block">Birim Fiyat</label>
                                    <span className="font-bold text-slate-700 text-sm block py-1.5">{appliance.price.toLocaleString('tr-TR')} TL</span>
                                </div>
                                <div className="sm:col-span-2 flex justify-between items-center">
                                    <div className="text-right w-full mr-2">
                                        <span className="text-xs text-slate-500 sm:hidden block">Tutar</span>
                                        <span className="font-bold text-slate-800 text-sm">{(appliance.count * appliance.price).toLocaleString('tr-TR')} TL</span>
                                    </div>
                                    {isEditMode && (<button type="button" onMouseDown={(e) => { e.preventDefault(); onDeleteAppliance(index); }} className="no-print text-red-500 hover:text-red-700 transition p-1"><TrashIcon className="w-5 h-5" /></button>)}
                                </div>
                            </div>
                            
                            {/* Sub Items Section */}
                            {renderSubItems(appliance)}
                        </div>
                    );
                })}
                
                {appliances.filter(a => a.type !== ApplianceType.Cabinet).length === 0 && (
                    <div className="text-center py-4 text-slate-500"><p>Henüz cihaz eklenmedi.</p></div>
                )}
            </div>

            {/* Extra Offers (Existing Code) ... */}
            {onAddExtraOffer && onDeleteExtraOffer && (
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
                        <span className="w-2 h-6 bg-orange-500 rounded mr-2"></span>
                        Alternatif / Ekstra Kombi Teklifleri
                    </h3>
                    <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            <div className="sm:col-span-7">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Alternatif Kombi Modeli</label>
                                <div className="flex items-center gap-1">
                                    {extraOfferModelAction ? (
                                        <div className="flex-grow flex items-center gap-1 w-full">
                                            <SuggestionInput value={tempExtraOfferModelName} onChange={(val) => setTempExtraOfferModelName(val)} onSelect={(val) => setTempExtraOfferModelName(val)} suggestions={suggestions} className="w-full p-2 text-sm border border-orange-500 rounded focus:outline-none bg-white uppercase" placeholder={extraOfferModelAction === 'add' ? "YENİ KOMBİ MODELİ" : ""} autoFocus />
                                            <button type="button" onMouseDown={handleSaveExtraModelAction} className="bg-green-500 text-white p-2 rounded hover:bg-green-600"><CheckIcon className="w-4 h-4" /></button>
                                            <button type="button" onMouseDown={handleCancelExtraModelAction} className="bg-slate-300 text-slate-600 p-2 rounded hover:bg-slate-400"><XMarkIcon className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <select value={newExtraOfferModel} onChange={(e) => handleExtraOfferModelChange(e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-orange-500 bg-white">
                                                {allModels.map(model => <option key={model} value={model}>{model}</option>)}
                                            </select>
                                            {onAddModel && (<button type="button" onMouseDown={handleStartAddExtraModel} className="text-orange-600 hover:bg-orange-50 p-2 rounded border border-slate-200 bg-white shrink-0"><PlusCircleIcon className="w-4 h-4" /></button>)}
                                            {isEditMode && onUpdateModel && (<button type="button" onMouseDown={handleStartEditExtraModel} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded shrink-0"><PencilIcon className="w-4 h-4" /></button>)}
                                            {isEditMode && onDeleteModel && (<button type="button" onMouseDown={handleDeleteExtraModelClick} className="text-red-400 hover:bg-red-50 p-2 rounded shrink-0"><TrashIcon className="w-4 h-4" /></button>)}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="sm:col-span-3">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Fiyat (TL) (Otomatik)</label>
                                <input type="text" value={(newExtraOfferPrice || 0).toLocaleString('tr-TR')} readOnly className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-100 text-slate-500 font-bold cursor-not-allowed" />
                            </div>
                            <div className="sm:col-span-2">
                                <button type="button" onMouseDown={handleAddExtraOfferClick} className="w-full py-2 bg-orange-600 text-white text-sm font-semibold rounded shadow hover:bg-orange-700 transition">Ekle</button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {extraOffers?.map(offer => (
                            <div key={offer.id} className="flex justify-between items-center bg-white p-3 border border-slate-200 rounded shadow-sm group hover:border-orange-200 transition-colors">
                                <div><span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider block mb-0.5">ALTERNATİF</span><p className="font-medium text-sm text-slate-800">{offer.name}</p></div>
                                <div className="flex items-center space-x-4"><span className="font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">{offer.price.toLocaleString('tr-TR')} TL</span>{isEditMode && (<button type="button" onMouseDown={(e) => { e.preventDefault(); onDeleteExtraOffer(offer.id); }} className="text-slate-400 hover:text-red-500 transition"><TrashIcon className="w-4 h-4" /></button>)}</div>
                            </div>
                        ))}
                        {(!extraOffers || extraOffers.length === 0) && <div className="text-center py-3 text-sm text-slate-500 italic border border-dashed border-slate-200 rounded">Henüz alternatif kombi teklifi eklenmedi.</div>}
                    </div>
                </div>
            )}
        </div>
    );
};
