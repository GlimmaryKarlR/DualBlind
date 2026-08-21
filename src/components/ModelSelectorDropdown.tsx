import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ALL_CATALOG_MODELS,
  CatalogModel,
  getBrandGroups,
  findCatalogModel,
} from '../utils/modelCatalog';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Sparkles,
  Layers,
  Zap,
  Tag,
  DollarSign,
  Filter,
  X,
  ExternalLink,
  Bot,
  ChevronsUpDown,
} from 'lucide-react';

interface ModelSelectorDropdownProps {
  selectedModel: string;
  selectedBrand?: string;
  onSelectModel: (model: CatalogModel) => void;
  disabled?: boolean;
  accentColor?: 'indigo' | 'emerald' | 'purple' | 'blue' | 'amber';
  label?: string;
  id?: string;
}

export const ModelSelectorDropdown: React.FC<ModelSelectorDropdownProps> = ({
  selectedModel,
  selectedBrand,
  onSelectModel,
  disabled = false,
  accentColor = 'indigo',
  label,
  id = 'model-selector',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeBrandFilter, setActiveBrandFilter] = useState<string>('all');
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({
    Google: true,
    OpenAI: true,
    Anthropic: true,
  });
  const [customInput, setCustomInput] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Find currently active catalog model or create fallback
  const currentModelInfo = useMemo(() => {
    const found = findCatalogModel(selectedModel);
    if (found) return found;
    return {
      id: selectedModel || 'gemini-3.7-flash',
      rawName: selectedModel || 'Google: Gemini 3.7 Flash',
      brand: selectedBrand || 'Google',
      name: selectedModel || 'Gemini 3.7 Flash',
      modelCode: selectedModel || 'gemini-3.7-flash',
      provider: 'google' as const,
      isExternal: false,
      inputPricePerMillion: 0.15,
      outputPricePerMillion: 0.6,
      tags: [],
      isFree: false,
    };
  }, [selectedModel, selectedBrand]);

  // Filter models based on search query and brand filter
  const filteredBrandGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const allGroups = getBrandGroups(ALL_CATALOG_MODELS);

    return allGroups
      .map((group) => {
        // Filter by brand button tab if active
        if (activeBrandFilter !== 'all' && group.brand !== activeBrandFilter) {
          return null;
        }

        // Filter models in brand by query
        if (!query) {
          return group;
        }

        const matchesBrand = group.brand.toLowerCase().includes(query);
        const matchingModels = group.models.filter((m) => {
          if (matchesBrand) return true;
          return (
            m.name.toLowerCase().includes(query) ||
            m.rawName.toLowerCase().includes(query) ||
            m.tags?.some((t) => t.toLowerCase().includes(query)) ||
            m.provider.toLowerCase().includes(query)
          );
        });

        if (matchingModels.length === 0) return null;

        return {
          ...group,
          models: matchingModels,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [searchQuery, activeBrandFilter]);

  const totalMatchingModels = useMemo(() => {
    return filteredBrandGroups.reduce((acc, g) => acc + g.models.length, 0);
  }, [filteredBrandGroups]);

  // When searching, auto-expand matching brands
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const newExpanded: Record<string, boolean> = {};
      for (const group of filteredBrandGroups) {
        newExpanded[group.brand] = true;
      }
      setExpandedBrands(newExpanded);
    }
  }, [searchQuery, filteredBrandGroups]);

  const toggleBrand = (brandName: string) => {
    setExpandedBrands((prev) => ({
      ...prev,
      [brandName]: !prev[brandName],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    for (const group of filteredBrandGroups) {
      all[group.brand] = true;
    }
    setExpandedBrands(all);
  };

  const collapseAll = () => {
    setExpandedBrands({});
  };

  const handleSelect = (model: CatalogModel) => {
    onSelectModel(model);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    if (!customInput.trim()) return;
    const customModel: CatalogModel = {
      id: customInput.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      rawName: `Custom: ${customInput.trim()}`,
      brand: 'Custom',
      name: customInput.trim(),
      modelCode: customInput.trim(),
      provider: 'custom',
      isExternal: true,
      inputPricePerMillion: 1.0,
      outputPricePerMillion: 3.0,
      tags: ['Custom'],
      isFree: false,
    };
    onSelectModel(customModel);
    setCustomInput('');
    setIsOpen(false);
  };

  // Major brands for quick filter pills
  const topBrands = [
    'all',
    'Google',
    'OpenAI',
    'Anthropic',
    'DeepSeek',
    'Qwen',
    'xAI',
    'Meta',
    'Mistral',
    'Moonshot AI',
    'MiniMax',
    'Z.ai',
    'NVIDIA',
    'Amazon',
    'Microsoft',
    'ByteDance Seed',
  ];

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      {label && (
        <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 rounded-xl border bg-white px-3 py-2 text-left shadow-xs transition-all hover:border-slate-300 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:hover:border-slate-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-500'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
              accentColor === 'emerald'
                ? 'bg-emerald-600'
                : accentColor === 'purple'
                ? 'bg-purple-600'
                : accentColor === 'amber'
                ? 'bg-amber-600'
                : 'bg-indigo-600'
            }`}
          >
            <Bot className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                {currentModelInfo.name}
              </span>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {currentModelInfo.brand}
              </span>
              {currentModelInfo.isFree && (
                <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  FREE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-700 dark:text-slate-400">
              <span className="font-mono">
                ${currentModelInfo.inputPricePerMillion.toFixed(2)} in / $
                {currentModelInfo.outputPricePerMillion.toFixed(2)} out
              </span>
              <span>•</span>
              <span className="capitalize">{currentModelInfo.provider}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
          <span className="text-[10px] font-medium hidden sm:inline-block">400+ Models</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0" />
        </div>
      </button>

      {/* Expandable Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[340px] max-w-[620px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100">
          {/* Top Search & Actions Bar */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 400+ models by name, brand, or tag (e.g. 'Pro', 'Free', 'R1', 'Sonnet')..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={expandAll}
                className="rounded px-1.5 py-1 font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60"
              >
                Expand All
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded px-1.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Collapse
              </button>
            </div>
          </div>

          {/* Quick Brand Filter Tabs */}
          <div className="no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5">
            {topBrands.map((brand) => {
              const isActive = activeBrandFilter === brand;
              const count =
                brand === 'all'
                  ? ALL_CATALOG_MODELS.length
                  : ALL_CATALOG_MODELS.filter((m) => m.brand === brand).length;
              if (brand !== 'all' && count === 0) return null;

              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setActiveBrandFilter(brand)}
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {brand === 'all' ? `All (${ALL_CATALOG_MODELS.length})` : `${brand} (${count})`}
                </button>
              );
            })}
          </div>

          {/* Scrollable Model List with Expandable Brand Arrows */}
          <div className="mt-2 max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
            {filteredBrandGroups.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-700 dark:text-slate-400">
                <p className="font-semibold">No models matched "{searchQuery}"</p>
                <p className="mt-1 text-[11px]">
                  Try searching for keywords like "flash", "opus", "r1", "mini", or enter a custom
                  model below.
                </p>
              </div>
            ) : (
              filteredBrandGroups.map((group) => {
                const isExpanded = Boolean(expandedBrands[group.brand]);
                const groupCount = group.models.length;

                return (
                  <div
                    key={group.brand}
                    className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30"
                  >
                    {/* Brand Accordion Header with Arrow */}
                    <button
                      type="button"
                      onClick={() => toggleBrand(group.brand)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-xs text-slate-800 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {/* Expand/Collapse Chevron Arrow */}
                        <div className="flex h-4 w-4 items-center justify-center rounded text-slate-500 dark:text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <span className="font-bold text-slate-900 dark:text-white">
                          {group.brand}
                        </span>

                        <span className="rounded-full bg-slate-200/80 px-2 py-0.2 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {groupCount} {groupCount === 1 ? 'model' : 'models'}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-700 dark:text-slate-400">
                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                      </span>
                    </button>

                    {/* Expanded Model List */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white dark:divide-slate-800/60 dark:border-slate-800 dark:bg-slate-900">
                        {group.models.map((model) => {
                          const isSelected =
                            selectedModel === model.id ||
                            selectedModel === model.modelCode ||
                            selectedModel === model.rawName;

                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => handleSelect(model)}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50/90 font-bold text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {model.name}
                                  </span>

                                  {model.isFree && (
                                    <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                      FREE
                                    </span>
                                  )}

                                  {model.tags?.map((t) => (
                                    <span
                                      key={t}
                                      className={`rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                                        t === 'Reasoning'
                                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                          : t === 'Code'
                                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
                                          : t === 'Batch'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                          : t === 'Vision'
                                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                      }`}
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>

                                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-700 dark:text-slate-400">
                                  <span className="font-mono">
                                    ${model.inputPricePerMillion.toFixed(2)} / $
                                    {model.outputPricePerMillion.toFixed(2)} per 1M
                                  </span>
                                  <span>•</span>
                                  <span>{model.isExternal ? 'Open / External' : 'Direct API'}</span>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center pl-1">
                                {isSelected ? (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Custom Model Input Footer */}
          <div className="mt-2.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCustom()}
                placeholder="Custom model slug or endpoint identifier..."
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!customInput.trim()}
                className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
