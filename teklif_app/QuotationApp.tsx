import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { db } from '../src/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SurveyData, Room, Appliance, ApplianceType, PricingItem, PricingSubItem, ExtraOffer, Radiator, ApplianceDefinition, ColumnData, ColumnItem } from './types';
import { TOWEL_RAIL_SIZES, ALL_DEFAULT_ITEMS, DEFAULT_MASTER_TEMPLATE, DEFAULT_COLUMN_ITEMS, DEFAULT_PRICING_ITEMS, LABOR_SUB_ITEMS_DEFAULT } from './constants';
import { MIGRATED_PRICES, MIGRATED_APPLIANCE_DEFINITIONS, MIGRATED_RADIATOR_MODELS, MIGRATED_APPLIANCE_MODEL_MAP } from './migrated_constants';
import { ProjectInfoForm } from './components/ProjectInfoForm';
import { RoomList } from './components/RoomList';
import { ApplianceList } from './components/ApplianceList';
import { Summary } from './components/Summary';
import { Header } from './components/Header';
import { PricingForm } from './components/PricingForm';
import { CustomerProposal } from './components/CustomerProposal';
import { PriceList } from './components/PriceList';
import { ColumnCalculation } from './components/ColumnCalculation';
import { calculateTotalConsumptionKw } from './services/calculationService';
import { WizardContainer } from './components/wizard/WizardContainer';

interface QuotationAppProps {
    currentUserEmail: string;
    currentUserName: string;
    onClose: () => void;
    initialData?: any;    // Mevcut teklif verisi (düzenleme modunda)
    quotationId?: string; // Firestore doc ID (düzenleme modunda updateDoc yapar)
}

export const QuotationApp: React.FC<QuotationAppProps> = ({ currentUserEmail, currentUserName, onClose, initialData, quotationId }) => {
    const [viewMode, setViewMode] = useState<'editor' | 'proposal' | 'pricelist' | 'column' | 'wizard'>('editor');

    // ... Global Prices ...
    const [globalPrices, setGlobalPrices] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('global_combi_prices');
        return saved ? JSON.parse(saved) : MIGRATED_PRICES;
    });

    const priceListSuggestions = useMemo(() => {
        const savedKeys = Object.keys(globalPrices);
        return Array.from(new Set([...savedKeys, ...ALL_DEFAULT_ITEMS])).sort();
    }, [globalPrices]);

    const handleSaveGlobalPrices = useCallback((newPrices: Record<string, number>) => {
        setGlobalPrices(newPrices);
        localStorage.setItem('global_combi_prices', JSON.stringify(newPrices));
    }, []);

    // ... Appliances Definitions ...
    const [applianceDefinitions, setApplianceDefinitions] = useState<ApplianceDefinition[]>(() => {
        const saved = localStorage.getItem('appliance_definitions_v2');
        return saved ? JSON.parse(saved) : MIGRATED_APPLIANCE_DEFINITIONS;
    });

    useEffect(() => {
        localStorage.setItem('appliance_definitions_v2', JSON.stringify(applianceDefinitions));
    }, [applianceDefinitions]);

    // ... Radiator Models ...
    const [radiatorModels, setRadiatorModels] = useState<string[]>(() => {
        const saved = localStorage.getItem('radiator_models');
        return saved ? JSON.parse(saved) : MIGRATED_RADIATOR_MODELS;
    });

    useEffect(() => {
        localStorage.setItem('radiator_models', JSON.stringify(radiatorModels));
    }, [radiatorModels]);

    const handleAddRadiatorModel = useCallback((name: string) => {
        const upperName = name.toUpperCase();
        if (!radiatorModels.includes(upperName)) {
            setRadiatorModels(prev => [...prev, upperName]);
        }
    }, [radiatorModels]);

    const handleDeleteRadiatorModel = useCallback((name: string) => {
        setRadiatorModels(prev => prev.filter(m => m !== name));
    }, []);

    // ... Appliance Models Map ...
    const [applianceModelMap, setApplianceModelMap] = useState<Record<string, string[]>>(() => {
        const saved = localStorage.getItem('appliance_model_map_v1');
        if (saved) {
            return JSON.parse(saved);
        }
        return MIGRATED_APPLIANCE_MODEL_MAP;
    });

    // MIGRATION EFFECT: Run once to overwrite defaults if migration hasn't happened
    useEffect(() => {
        const migrationDone = localStorage.getItem('MIGRATION_V2_FULL_DATA');
        if (!migrationDone) {
            console.log("Applying Migration Data (Full Fix)...");
            setGlobalPrices(MIGRATED_PRICES);
            setApplianceDefinitions(MIGRATED_APPLIANCE_DEFINITIONS);
            setRadiatorModels(MIGRATED_RADIATOR_MODELS);
            setApplianceModelMap(MIGRATED_APPLIANCE_MODEL_MAP);
            localStorage.setItem('MIGRATION_V2_FULL_DATA', 'true');
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('appliance_model_map_v1', JSON.stringify(applianceModelMap));
    }, [applianceModelMap]);

    // ... Appliance Model Handlers (Add, Update, Delete) ...
    const handleAddApplianceDefinition = useCallback((name?: string, consumptionKw: number = 0) => {
        const newName = name ? name.toUpperCase() : `YENİ CİHAZ TÜRÜ ${applianceDefinitions.length + 1}`;
        setApplianceDefinitions(prev => [...prev, { name: newName, type: newName, consumptionKw }]);
        setApplianceModelMap(prev => ({ ...prev, [newName]: [] }));
    }, [applianceDefinitions]);

    const handleUpdateApplianceDefinition = useCallback((oldType: string, newName: string) => {
        if (!newName) return;
        const upperName = newName.toUpperCase();
        setApplianceDefinitions(prev => prev.map(d => d.type === oldType ? { ...d, name: upperName, type: upperName } : d));
        setApplianceModelMap(prev => {
            const newMap = { ...prev };
            if (newMap[oldType]) {
                newMap[upperName] = newMap[oldType];
                delete newMap[oldType];
            }
            return newMap;
        });
        setSurveyData(prev => ({
            ...prev,
            appliances: prev.appliances.map(app => app.type === oldType ? { ...app, type: upperName } : app)
        }));
    }, []);

    const handleDeleteApplianceDefinition = useCallback((type: string) => {
        setApplianceDefinitions(prev => prev.filter(d => d.type !== type));
        setApplianceModelMap(prev => {
            const newMap = { ...prev };
            delete newMap[type];
            return newMap;
        });
    }, []);

    const handleAddModel = useCallback((type: string, modelName?: string) => {
        const upperType = type.toUpperCase();
        const existingModels = applianceModelMap[upperType] || [];
        const newModel = modelName ? modelName.toUpperCase() : `YENİ ${upperType} MODELİ ${existingModels.length + 1}`;
        setApplianceModelMap(prev => ({
            ...prev,
            [upperType]: [...(prev[upperType] || []), newModel]
        }));
    }, [applianceModelMap]);

    const handleUpdateModel = useCallback((type: string, oldModel: string, newModel: string) => {
        if (!newModel) return;
        const upperType = type.toUpperCase();
        const upperModel = newModel.toUpperCase();
        setApplianceModelMap(prev => ({
            ...prev,
            [upperType]: (prev[upperType] || []).map(m => m === oldModel ? upperModel : m)
        }));
    }, []);

    const handleDeleteModel = useCallback((type: string, model: string) => {
        const upperType = type.toUpperCase();
        setApplianceModelMap(prev => ({
            ...prev,
            [upperType]: (prev[upperType] || []).filter(m => m !== model)
        }));
    }, []);

    const [surveyData, setSurveyData] = useState<SurveyData>(() => {
        // Düzenleme modunda: Firestore'dan gelen veriyi yükle
        if (initialData) {
            return initialData as SurveyData;
        }
        // ... (Existing Load Logic) ...
        const masterTemplate = localStorage.getItem('master_survey_template');
        // Fallback to hardcoded template if no local storage
        if (masterTemplate) {
            try {
                return JSON.parse(masterTemplate);
            } catch (e) {
                console.error("Error loading master template:", e);
            }
        } else {
            return DEFAULT_MASTER_TEMPLATE;
        }

        const savedTemplate = localStorage.getItem('saved_survey_template');
        let data: SurveyData;

        if (savedTemplate) {
            try {
                data = JSON.parse(savedTemplate);

                // Migrations...
                if (data.rooms && data.rooms.length > 0) {
                    data.rooms = data.rooms.map((room: any) => {
                        if (!room.radiators) {
                            return { ...room, radiators: [{ id: `rad-${Date.now()}`, length: room.selectedRadiatorLength || 0 }] };
                        }
                        if (room.radiatorHeight === undefined && !room.isTowelRail) {
                            return { ...room, radiatorHeight: 600 };
                        }
                        return room;
                    });
                }
                if (data.pricingItems && data.pricingItems.some(i => i.id === 7 || i.id === 2)) {
                    data.pricingItems = DEFAULT_PRICING_ITEMS;
                } else if (!data.pricingItems) {
                    data.pricingItems = DEFAULT_PRICING_ITEMS;
                }

                // *** COLUMN DATA MIGRATION ***
                if (!data.columnData) {
                    const savedColumn = localStorage.getItem('column_data_v2');
                    data.columnData = savedColumn ? JSON.parse(savedColumn) : {
                        description: '', items: DEFAULT_COLUMN_ITEMS, totalCost: 0, isIncludedInProposal: false,
                        customerName: '', phone: '', address: '', date: new Date().toLocaleDateString('tr-TR'),
                        laborCost: 0, projectCost: 0, paintCost: 0, safetyCost: 0, agreedColumnPrice: 0
                    };
                } else if (data.columnData.agreedColumnPrice === undefined) {
                    data.columnData.agreedColumnPrice = 0;
                }

                return data;
            } catch (e) {
                console.error("Error loading template:", e);
            }
        }

        const savedItems = localStorage.getItem('saved_pricing_items');
        let initialItems = savedItems ? JSON.parse(savedItems) : DEFAULT_PRICING_ITEMS;
        if (initialItems.some((i: any) => i.id === 7 || i.id === 2)) {
            initialItems = DEFAULT_PRICING_ITEMS;
        }

        // Check standalone column data if starting fresh
        const savedColumn = localStorage.getItem('column_data_v2');
        const initialColumnData = savedColumn ? JSON.parse(savedColumn) : {
            description: '', items: DEFAULT_COLUMN_ITEMS, totalCost: 0, isIncludedInProposal: false,
            customerName: '', phone: '', address: '', date: new Date().toLocaleDateString('tr-TR'),
            laborCost: 0, projectCost: 0, paintCost: 0, safetyCost: 0, agreedColumnPrice: 0
        };

        if (initialColumnData.agreedColumnPrice === undefined) initialColumnData.agreedColumnPrice = 0;

        return {
            customerName: '',
            address: '',
            surveyDate: new Date().toISOString().split('T')[0],
            technicianName: '',
            phoneNumber: '',
            radiatorMeterPrice: 0,
            radiatorValvePrice: 0,
            extraOffers: [],
            finalBidPrice: undefined,
            agreedPrice: undefined,
            rooms: [],
            appliances: [],
            pricingItems: initialItems,
            proposalNote: '',
            headerImage: undefined,
            columnData: initialColumnData // Initialize here
        };
    });

    useEffect(() => {
        localStorage.setItem('saved_pricing_items', JSON.stringify(surveyData.pricingItems));
        // Also save column data implicitly with surveyData if saving draft, but let's keep standalone backup for now
        if (surveyData.columnData) {
            localStorage.setItem('column_data_v2', JSON.stringify(surveyData.columnData));
        }
    }, [surveyData.pricingItems, surveyData.columnData]);

    // ... (Handlers) ...
    const handleProjectInfoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSurveyData(prev => ({ ...prev, [name]: value }));
    }, []);
    const handleProposalNoteChange = useCallback((note: string) => { setSurveyData(prev => ({ ...prev, proposalNote: note })); }, []);
    const handleHeaderImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setSurveyData(prev => ({ ...prev, headerImage: reader.result as string })); };
            reader.readAsDataURL(file);
        }
    }, []);
    const handleRadiatorPriceChange = useCallback((field: 'radiatorMeterPrice' | 'radiatorValvePrice', value: number) => { setSurveyData(prev => ({ ...prev, [field]: value })); }, []);
    const handleFinalBidChange = useCallback((value: number) => { setSurveyData(prev => ({ ...prev, finalBidPrice: value })); }, []);
    const handleAgreedPriceChange = useCallback((value: number) => { setSurveyData(prev => ({ ...prev, agreedPrice: value })); }, []);

    // Column Handler
    const handleColumnChange = useCallback((newColumnData: ColumnData) => {
        setSurveyData(prev => ({ ...prev, columnData: newColumnData }));
    }, []);

    // ... (Pricing Item Handlers - Same as before) ...
    const handlePricingItemChange = useCallback((itemId: number, newValues: Partial<PricingItem>) => {
        setSurveyData(prev => ({
            ...prev,
            pricingItems: prev.pricingItems.map(item => {
                if (item.id !== itemId) return item;
                const isSelectable = item.type === 'selectableToggle' || item.type === 'selectable';
                let updatedItem = { ...item, ...newValues };
                if (newValues.selectedOptionName && isSelectable && item.options) {
                    const selectedOpt = item.options.find(o => o.name === newValues.selectedOptionName);
                    if (selectedOpt) {
                        updatedItem.rate = selectedOpt.rate;
                        if (selectedOpt.defaultSubItems) { updatedItem.subItems = selectedOpt.defaultSubItems.map((sub, idx) => ({ ...sub, id: sub.id || `${itemId}-${Date.now()}-${idx}` })); } else { updatedItem.subItems = []; }
                    }
                }
                if (updatedItem.subItems && updatedItem.subItems.length > 0) {
                    const subItemsTotal = updatedItem.subItems.reduce((sum, sub) => sum + (sub.units * sub.rate), 0);
                    updatedItem.rate = subItemsTotal;
                }
                if (isSelectable && updatedItem.options && updatedItem.selectedOptionName) {
                    updatedItem.options = updatedItem.options.map(opt => {
                        if (opt.name === updatedItem.selectedOptionName) { return { ...opt, rate: updatedItem.rate, defaultSubItems: updatedItem.subItems ? updatedItem.subItems.map(s => ({ ...s })) : undefined }; }
                        return opt;
                    });
                }
                return updatedItem;
            }),
        }));
    }, []);
    // ... (Add/Delete/Option handlers - Same as before) ...
    const handleAddPricingItem = useCallback((name: string) => { setSurveyData(prev => ({ ...prev, pricingItems: [...prev.pricingItems, { id: Date.now(), name: name.toUpperCase(), units: 1, rate: 0, type: 'toggle' }] })); }, []);
    const handleDeletePricingItem = useCallback((id: number) => { setSurveyData(prev => ({ ...prev, pricingItems: prev.pricingItems.filter(item => item.id !== id) })); }, []);
    const handleAddOption = useCallback((itemId: number, optionName: string) => { setSurveyData(prev => ({ ...prev, pricingItems: prev.pricingItems.map(item => { if (item.id !== itemId) return item; let newDefaultSubItems: PricingSubItem[] = []; if (itemId === 6) { newDefaultSubItems = [{ id: `s-kirim-${Date.now()}`, name: 'KIRIM', units: 0, rate: 1000, showInProposal: false }, { id: `s-kaynak-${Date.now()}`, name: 'KAYNAKLI DIŞ BAĞLANTI', units: 0, rate: 1500, showInProposal: false }]; } return { ...item, options: [...(item.options || []), { name: optionName.toUpperCase(), rate: 0, defaultSubItems: newDefaultSubItems }], selectedOptionName: item.selectedOptionName || optionName.toUpperCase() }; }) })); }, []);
    const handleDeleteOption = useCallback((itemId: number, optionName: string) => { setSurveyData(prev => ({ ...prev, pricingItems: prev.pricingItems.map(item => { if (item.id !== itemId || !item.options) return item; const newOptions = item.options.filter(o => o.name !== optionName); let newSelected = item.selectedOptionName; let newRate = item.rate; let newSubItems = item.subItems; if (item.selectedOptionName === optionName) { if (newOptions.length > 0) { newSelected = newOptions[0].name; newRate = newOptions[0].rate; newSubItems = newOptions[0].defaultSubItems ? [...newOptions[0].defaultSubItems] : undefined; } else { newSelected = undefined; newRate = 0; newSubItems = undefined; } } return { ...item, options: newOptions, selectedOptionName: newSelected, rate: newRate, subItems: newSubItems }; }) })); }, []);
    const handleAddSubItem = useCallback((itemId: number, subItemName: string) => { setSurveyData(prev => ({ ...prev, pricingItems: prev.pricingItems.map(item => { if (item.id !== itemId) return item; const newSubItem: PricingSubItem = { id: `sub-${Date.now()}`, name: subItemName.toUpperCase(), units: 1, rate: 0, showInProposal: false }; const updatedSubItems = [...(item.subItems || []), newSubItem]; let updatedOptions = item.options; if (item.selectedOptionName && item.options) { updatedOptions = item.options.map(opt => { if (opt.name === item.selectedOptionName) return { ...opt, defaultSubItems: [...(opt.defaultSubItems || []), newSubItem] }; return opt; }); } return { ...item, subItems: updatedSubItems, options: updatedOptions }; }) })); }, []);
    const handleDeleteSubItem = useCallback((itemId: number, subItemId: string) => { setSurveyData(prev => ({ ...prev, pricingItems: prev.pricingItems.map(item => { if (item.id !== itemId) return item; const updatedSubItems = item.subItems?.filter(s => s.id !== subItemId); let updatedOptions = item.options; if (item.selectedOptionName && item.options) { updatedOptions = item.options.map(opt => { if (opt.name === item.selectedOptionName) return { ...opt, defaultSubItems: opt.defaultSubItems?.filter(s => s.id !== subItemId) }; return opt; }); } return { ...item, subItems: updatedSubItems, options: updatedOptions }; }) })); }, []);

    // ... Room Handlers ...
    const addRoom = useCallback(() => { setSurveyData(prev => ({ ...prev, rooms: [{ id: Date.now(), name: `ODA ${surveyData.rooms.length + 1}`, width: 0, length: 0, height: 2.8, heatLossCoefficient: 45, radiatorModel: 'DEMİRDÖKÜM', radiatorHeight: 600, radiators: [{ id: `rad-${Date.now()}`, length: 0 }], isTowelRail: false, towelRailSize: TOWEL_RAIL_SIZES[0], towelRailPrice: 0 }, ...prev.rooms] })); }, [surveyData.rooms.length]);
    const updateRoom = useCallback((roomId: number, field: keyof Room, value: string | number | boolean | Radiator[]) => { setSurveyData(prev => ({ ...prev, rooms: prev.rooms.map(room => room.id === roomId ? { ...room, [field]: value } : room) })); }, []);
    const deleteRoom = useCallback((roomId: number) => { setSurveyData(prev => ({ ...prev, rooms: prev.rooms.filter(room => room.id !== roomId) })); }, []);

    // ... Appliance Handlers ...
    const addAppliance = useCallback((applianceType: ApplianceType | string, initialPrice: number = 0) => {
        const applianceDef = applianceDefinitions.find(def => def.type === applianceType);
        const defaultDef = { name: applianceType, type: applianceType, consumptionKw: 0 };
        const def = applianceDef || defaultDef;
        let priceToUse = initialPrice;
        const customLabel = localStorage.getItem('cabinet_custom_label');
        const cabinetPrice = (customLabel && globalPrices[customLabel]) ?? globalPrices['KOMBİ DOLABI'] ?? globalPrices['KOMBİ DOLABI (STANDART)'] ?? 0;
        if (globalPrices[def.name] !== undefined) priceToUse = globalPrices[def.name];
        else if (globalPrices[applianceType] !== undefined) priceToUse = globalPrices[applianceType];
        else if ((applianceType === ApplianceType.Cabinet || def.name === 'KOMBİ DOLABI') && cabinetPrice !== undefined) priceToUse = cabinetPrice;
        let initialSubItems: PricingSubItem[] = [];
        if (applianceType === ApplianceType.Combi || applianceType.includes('KOMBİ')) { initialSubItems.push({ id: `sub-${Date.now()}`, name: 'KOMBİ DOLABI', units: 0, rate: cabinetPrice || 0, showInProposal: true }); }
        const newAppliance: Appliance = { id: `app-${Date.now()}`, type: def.type, name: def.name, consumptionKw: def.consumptionKw, count: 1, price: priceToUse, subItems: initialSubItems };
        setSurveyData(prev => ({ ...prev, appliances: [...prev.appliances, newAppliance] }));
    }, [applianceDefinitions, globalPrices]);
    const updateAppliance = useCallback((id: string, updates: Partial<Appliance>) => { setSurveyData(prev => ({ ...prev, appliances: prev.appliances.map(app => app.id === id ? { ...app, ...updates } : app) })); }, []);
    const deleteAppliance = useCallback((applianceIndex: number) => { setSurveyData(prev => ({ ...prev, appliances: prev.appliances.filter((_, index) => index !== applianceIndex) })); }, []);
    const handleAddApplianceSubItem = useCallback((applianceId: string, name: string) => { setSurveyData(prev => ({ ...prev, appliances: prev.appliances.map(app => { if (app.id !== applianceId) return app; const price = globalPrices[name.toUpperCase()] || 0; const newSub: PricingSubItem = { id: `asub-${Date.now()}`, name: name.toUpperCase(), units: 1, rate: price, showInProposal: true }; return { ...app, subItems: [...(app.subItems || []), newSub] }; }) })); }, [globalPrices]);
    const handleUpdateApplianceSubItem = useCallback((applianceId: string, subId: string, updates: Partial<PricingSubItem>) => { setSurveyData(prev => ({ ...prev, appliances: prev.appliances.map(app => { if (app.id !== applianceId) return app; return { ...app, subItems: app.subItems?.map(sub => sub.id === subId ? { ...sub, ...updates } : sub) }; }) })); }, []);
    const handleDeleteApplianceSubItem = useCallback((applianceId: string, subId: string) => { setSurveyData(prev => ({ ...prev, appliances: prev.appliances.map(app => { if (app.id !== applianceId) return app; return { ...app, subItems: app.subItems?.filter(sub => sub.id !== subId) }; }) })); }, []);
    const addExtraOffer = useCallback((name: string, price: number) => { setSurveyData(prev => ({ ...prev, extraOffers: [...(prev.extraOffers || []), { id: `extra-${Date.now()}`, name, price }] })); }, []);
    const deleteExtraOffer = useCallback((id: string) => { setSurveyData(prev => ({ ...prev, extraOffers: (prev.extraOffers || []).filter(offer => offer.id !== id) })); }, []);

    // ... Template Handlers ...
    const handleSaveMasterTemplate = useCallback((e: React.MouseEvent) => { e.preventDefault(); localStorage.setItem('master_survey_template', JSON.stringify(surveyData)); alert('Ana şablon başarıyla kaydedildi. Uygulama artık her açılışta bu şablonla başlayacak.'); }, [surveyData]);
    const handleResetToMasterTemplate = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const masterTemplate = localStorage.getItem('master_survey_template');
        if (masterTemplate) {
            try {
                const parsed = JSON.parse(masterTemplate);
                setSurveyData(parsed);
                alert('Ana şablon geri yüklendi.');
            } catch (error) {
                console.error("Error resetting template:", error);
                alert('Şablon yüklenirken bir hata oluştu.');
            }
        } else {
            // If no user saved template, use the hardcoded default one
            setSurveyData(DEFAULT_MASTER_TEMPLATE);
            alert('Varsayılan şablon geri yüklendi.');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);
    const handleDownloadProject = useCallback(async () => {
        const fileName = `Proje_${surveyData.customerName.replace(/\s+/g, '_') || 'Taslak'}.json`;
        const jsonString = JSON.stringify(surveyData, null, 2);

        // Removed showSaveFilePicker to prevent double save dialogs/actions
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }, [surveyData]);
    const handleLoadProject = useCallback((event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { try { const content = e.target?.result as string; let parsedData = JSON.parse(content); if (parsedData.pricingItems && parsedData.pricingItems.some((i: any) => i.id === 7 || i.id === 2)) { parsedData.pricingItems = DEFAULT_PRICING_ITEMS; alert('Eski sürüm proje dosyası tespit edildi. Fiyatlandırma kalemleri yeni yapıya güncellendi.'); } if (parsedData.rooms && parsedData.pricingItems) { setSurveyData(parsedData); alert('Proje dosyası başarıyla yüklendi.'); } else { alert('Hata: Geçersiz proje dosyası formatı.'); } } catch (error) { console.error("File parsing error:", error); alert('Hata: Dosya okunamadı.'); } }; reader.readAsText(file); event.target.value = ''; }, []);

    // ... Total Cost Calculation (DECOUPLED) ...
    const totalConsumptionKw = useMemo(() => calculateTotalConsumptionKw(surveyData.appliances), [surveyData.appliances]);

    // Calculate Costs independently for Summary and Proposal
    const costAnalysis = useMemo(() => {
        // 1. BASE COST (Data Entry Section Only - Raw Cost)
        const pricingCost = surveyData.pricingItems.reduce((total, item) => total + (item.units * item.rate), 0);
        const appliancesCost = surveyData.appliances.reduce((total, app) => {
            const mainTotal = app.count * app.price;
            const subTotal = app.subItems ? app.subItems.reduce((sTotal, sub) => sTotal + (sub.units * sub.rate), 0) : 0;
            return total + mainTotal + (subTotal * app.count);
        }, 0);
        const totalRadiatorMeters = surveyData.rooms.filter(r => !r.isTowelRail).reduce((sum, r) => sum + (r.radiators ? r.radiators.reduce((rSum, rad) => rSum + (rad.length || 0), 0) : 0), 0);
        const roomCountWithTowelRail = surveyData.rooms.filter(r => r.isTowelRail).length;
        const radiatorCount = surveyData.rooms.filter(r => !r.isTowelRail).reduce((sum, r) => sum + (r.radiators ? r.radiators.length : 0), 0);
        const totalValves = (radiatorCount + roomCountWithTowelRail) * 2;
        const totalTowelRailCost = surveyData.rooms.filter(r => r.isTowelRail).reduce((sum, r) => sum + (r.towelRailPrice || 0), 0);
        const radiatorCost = totalRadiatorMeters * surveyData.radiatorMeterPrice;
        const valveCost = totalValves * surveyData.radiatorValvePrice;

        const baseRawCost = pricingCost + appliancesCost + radiatorCost + valveCost + totalTowelRailCost;

        // 2. BASE FINAL PRICE (Data Entry Manual Override)
        // If user entered a manual final price, use it. Otherwise, use raw cost.
        const baseFinalPrice = surveyData.finalBidPrice !== undefined
            ? surveyData.finalBidPrice
            : baseRawCost;

        // 3. COLUMN FINAL PRICE (Column Tab Manual Override)
        // Only if column is enabled in proposal.
        let columnFinalPrice = 0;
        if (surveyData.columnData?.isIncludedInProposal) {
            if (surveyData.columnData.agreedColumnPrice !== undefined && surveyData.columnData.agreedColumnPrice > 0) {
                columnFinalPrice = surveyData.columnData.agreedColumnPrice;
            } else {
                columnFinalPrice = surveyData.columnData.totalCost || 0; // Use calculated if no manual override
            }
        }

        // 4. GRAND TOTAL (Proposal Price)
        const grandTotal = baseFinalPrice + columnFinalPrice;

        return {
            baseRawCost,
            baseFinalPrice,
            columnFinalPrice,
            grandTotal
        };

    }, [
        surveyData.pricingItems,
        surveyData.appliances,
        surveyData.rooms,
        surveyData.radiatorMeterPrice,
        surveyData.radiatorValvePrice,
        surveyData.columnData,
        surveyData.finalBidPrice
    ]);

    // Firestore undefined değerleri kabul etmez - hepsini temizle
    const sanitizeForFirestore = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
        if (typeof obj === 'object') {
            const cleaned: any = {};
            for (const key of Object.keys(obj)) {
                const val = obj[key];
                if (val !== undefined) {
                    cleaned[key] = sanitizeForFirestore(val);
                }
            }
            return cleaned;
        }
        return obj;
    };

    // JSON dosyası olarak kaydet (browser download)
    const downloadAsJSON = (data: any, customerName: string) => {
        const fileName = `${customerName.replace(/[^a-zA-Z0-9ğüşöçıĞÜŞÖÇİ ]/g, '_').trim()}_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.json`;
        const json = JSON.stringify({ version: '1.0', savedAt: new Date().toISOString(), surveyData: data }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return fileName;
    };

    const handleSaveToFirebase = async () => {
        try {
            if (!surveyData.customerName) {
                alert('Lütfen önce müşteri adını girin.');
                return;
            }

            // headerImage base64 Firestore boyut limitini aştığı için çıkarılıyor
            const { headerImage: _img, ...dataWithoutImage } = surveyData;
            // undefined alanları temizle
            const cleanData = sanitizeForFirestore(dataWithoutImage);

            // JSON dosyasını indir (TEKLİF DOSYALARI ORTAK KLASÖR'e taşıyın)
            const fileName = downloadAsJSON(dataWithoutImage, surveyData.customerName);

            const docPayload = {
                customerName: surveyData.customerName || '',
                totalAmount: costAnalysis.grandTotal || 0,
                authorEmail: currentUserEmail || '',
                authorName: currentUserName || '',
                status: 'draft',
                fileName,
                data: cleanData
            };

            if (quotationId) {
                // Mevcut teklifi güncelle
                const { updateDoc, doc: fsDoc } = await import('firebase/firestore');
                await updateDoc(fsDoc(db, 'quotations', quotationId), {
                    ...docPayload,
                    updatedAt: serverTimestamp()
                });
                alert('Teklif güncellendi ve JSON olarak indirildi!');
            } else {
                // Yeni teklif oluştur
                await addDoc(collection(db, 'quotations'), {
                    ...docPayload,
                    createdAt: serverTimestamp()
                });
                alert('Teklif kaydedildi ve JSON olarak indirildi!');
            }
            onClose();
        } catch (error: any) {
            console.error('Kaydetme hatası:', error);
            alert('Kaydedilirken bir hata oluştu: ' + (error?.message || String(error)));
        }
    };

    return (
        <div className="min-h-full bg-slate-50 font-sans text-slate-800 flex flex-col">
            <Header
                viewMode={viewMode}
                setViewMode={setViewMode}
                onSave={handleSaveToFirebase}
                onClose={onClose}
            />

            {viewMode === 'editor' && (
                <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <ProjectInfoForm surveyData={surveyData} onChange={handleProjectInfoChange} onHeaderImageChange={handleHeaderImageChange} />
                            <PricingForm items={surveyData.pricingItems} onItemChange={handlePricingItemChange} onAddItem={handleAddPricingItem} onDeleteItem={handleDeletePricingItem} onAddOption={handleAddOption} onDeleteOption={handleDeleteOption} onAddSubItem={handleAddSubItem} onDeleteSubItem={handleDeleteSubItem} suggestions={priceListSuggestions} globalPrices={globalPrices} />
                            <RoomList rooms={surveyData.rooms} onAddRoom={addRoom} onUpdateRoom={updateRoom} onDeleteRoom={deleteRoom} radiatorMeterPrice={surveyData.radiatorMeterPrice} radiatorValvePrice={surveyData.radiatorValvePrice} onPriceChange={handleRadiatorPriceChange} radiatorModels={radiatorModels} onAddRadiatorModel={handleAddRadiatorModel} onDeleteRadiatorModel={handleDeleteRadiatorModel} suggestions={priceListSuggestions} globalPrices={globalPrices} />
                            <ApplianceList appliances={surveyData.appliances} extraOffers={surveyData.extraOffers} onAddAppliance={addAppliance} onUpdateAppliance={updateAppliance} onDeleteAppliance={deleteAppliance} handleAddApplianceSubItem={handleAddApplianceSubItem} handleUpdateApplianceSubItem={handleUpdateApplianceSubItem} handleDeleteApplianceSubItem={handleDeleteApplianceSubItem} onAddExtraOffer={addExtraOffer} onDeleteExtraOffer={deleteExtraOffer} globalPrices={globalPrices} applianceDefinitions={applianceDefinitions} applianceModelMap={applianceModelMap} onAddDefinition={handleAddApplianceDefinition} onUpdateDefinition={handleUpdateApplianceDefinition} onDeleteDefinition={handleDeleteApplianceDefinition} onAddModel={handleAddModel} onUpdateModel={handleUpdateModel} onDeleteModel={handleDeleteModel} suggestions={priceListSuggestions} />
                        </div>
                        <div className="lg:col-span-1 mt-6 lg:mt-0">
                            <Summary
                                totalConsumptionKw={totalConsumptionKw}
                                calculatedRawCost={costAnalysis.baseRawCost}
                                effectiveSellingPrice={costAnalysis.baseFinalPrice}
                                surveyData={surveyData}
                                onFinalBidChange={handleFinalBidChange}
                                onAgreedPriceChange={handleAgreedPriceChange}
                                onSaveTemplate={() => handleSaveMasterTemplate({ preventDefault: () => { } } as any)}
                                onResetTemplate={handleResetToMasterTemplate}
                                onDownloadProject={handleDownloadProject}
                                onLoadProject={handleLoadProject}
                            />
                        </div>
                    </div>
                </main>
            )}

            {viewMode === 'column' && (
                <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                    <ColumnCalculation
                        globalPrices={globalPrices}
                        data={surveyData.columnData}
                        onChange={handleColumnChange}
                    />
                </main>
            )}

            {viewMode === 'pricelist' && (
                <main className="p-4 sm:p-6 lg:p-8">
                    <PriceList globalPrices={globalPrices} onSave={handleSaveGlobalPrices} />
                </main>
            )}

            {viewMode === 'proposal' && (
                <main className="p-0 sm:p-8 flex justify-center bg-slate-200 min-h-full">
                    <CustomerProposal
                        surveyData={surveyData}
                        totalConsumptionKw={totalConsumptionKw}
                        totalPricingCost={costAnalysis.grandTotal}
                        onUpdateNote={handleProposalNoteChange}
                    />
                </main>
            )}

            {viewMode === 'wizard' && (
                <WizardContainer
                    surveyData={surveyData}
                    onProjectInfoChange={handleProjectInfoChange}
                    onHeaderImageChange={handleHeaderImageChange}
                    onAddRoom={addRoom}
                    onUpdateRoom={updateRoom}
                    onDeleteRoom={deleteRoom}
                    radiatorMeterPrice={surveyData.radiatorMeterPrice}
                    radiatorValvePrice={surveyData.radiatorValvePrice}
                    onRadiatorPriceChange={handleRadiatorPriceChange}
                    radiatorModels={radiatorModels}
                    onAddRadiatorModel={handleAddRadiatorModel}
                    onDeleteRadiatorModel={handleDeleteRadiatorModel}
                    onAddAppliance={addAppliance}
                    onUpdateAppliance={updateAppliance}
                    onDeleteAppliance={deleteAppliance}
                    onAddApplianceSubItem={handleAddApplianceSubItem}
                    onUpdateApplianceSubItem={handleUpdateApplianceSubItem}
                    onDeleteApplianceSubItem={handleDeleteApplianceSubItem}
                    onAddExtraOffer={addExtraOffer}
                    onDeleteExtraOffer={deleteExtraOffer}
                    applianceDefinitions={applianceDefinitions}
                    applianceModelMap={applianceModelMap}
                    onAddDefinition={handleAddApplianceDefinition}
                    onUpdateDefinition={handleUpdateApplianceDefinition}
                    onDeleteDefinition={handleDeleteApplianceDefinition}
                    onAddModel={handleAddModel}
                    onUpdateModel={handleUpdateModel}
                    onDeleteModel={handleDeleteModel}
                    onPricingItemChange={handlePricingItemChange}
                    onAddPricingItem={handleAddPricingItem}
                    onDeletePricingItem={handleDeletePricingItem}
                    onAddOption={handleAddOption}
                    onDeleteOption={handleDeleteOption}
                    onAddSubItem={handleAddSubItem}
                    onDeleteSubItem={handleDeleteSubItem}
                    onColumnChange={handleColumnChange}
                    totalConsumptionKw={totalConsumptionKw}
                    costAnalysis={costAnalysis}
                    onFinalBidChange={handleFinalBidChange}
                    onAgreedPriceChange={handleAgreedPriceChange}
                    onSaveTemplate={() => handleSaveMasterTemplate({ preventDefault: () => { } } as any)}
                    onResetTemplate={handleResetToMasterTemplate}
                    onDownloadProject={handleDownloadProject}
                    onLoadProject={handleLoadProject}
                    globalPrices={globalPrices}
                    suggestions={priceListSuggestions}
                    onFinish={() => setViewMode('proposal')}
                />
            )}
        </div>
    );
};