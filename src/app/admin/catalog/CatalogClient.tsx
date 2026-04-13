"use client";

import { useState, useEffect } from "react";
import { Search, Download, Filter, MoreHorizontal, ChevronDown, Package, Plus, Star, Box, Trash2, Edit } from "lucide-react";
import { Product, ImportableProduct } from "../../../types/product";
import { MOCK_IMPORTABLES } from "../../../lib/mocks/catalog";
import { ProductStatusBadge } from "../../../components/admin/catalog/ProductStatusBadge";
import { ProductDrawer } from "../../../components/admin/catalog/ProductDrawer";
import { ImportPreviewDrawer } from "../../../components/admin/catalog/ImportPreviewDrawer";

type TabValue = 'all' | 'active' | 'draft' | 'archived' | 'out_of_stock' | 'import';

interface CatalogClientProps {
  products: Product[];
}

export default function CatalogClient({ products }: CatalogClientProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImportable, setSelectedImportable] = useState<ImportableProduct | null>(null);
  
  // Bulk Actions
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    setSelectedRows([]);
  }, [activeTab]);

  // Filtering Logic
  const filteredCatalog = products.filter(product => {
    let matchesTab = true;
    if (activeTab === 'active') matchesTab = product.status === 'active';
    if (activeTab === 'draft') matchesTab = product.status === 'draft';
    if (activeTab === 'archived') matchesTab = product.status === 'archived';
    if (activeTab === 'out_of_stock') matchesTab = product.totalStock === 0;

    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const filteredImports = MOCK_IMPORTABLES.filter(prod => 
    prod.originalTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prod.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs: { label: string, value: TabValue, count?: number, isSpecial?: boolean }[] = [
    { label: "Catálogo", value: "all", count: products.length },
    { label: "Activos", value: "active", count: products.filter(p => p.status === 'active').length },
    { label: "Borradores", value: "draft", count: products.filter(p => p.status === 'draft').length },
    { label: "Archivados", value: "archived", count: products.filter(p => p.status === 'archived').length },
    { label: "Sin Stock", value: "out_of_stock", count: products.filter(p => p.totalStock === 0).length },
    { label: "Importador Dropshipping", value: "import", isSpecial: true },
  ];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedRows(filteredCatalog.map(p => p.id));
    else setSelectedRows([]);
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (e.target.checked) setSelectedRows(prev => [...prev, id]);
    else setSelectedRows(prev => prev.filter(r => r !== id));
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32">
      
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Catálogo de Productos</h1>
          <p className="text-[#666666] text-[15px] mt-1 font-medium">Administra tu inventario y descubre productos ganadores listos para importar.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 text-[13px] font-bold text-[#111111] bg-white border border-[#EAEAEA] rounded-xl hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
            Exportar CSV
          </button>
          <button className="px-5 py-2.5 text-[13px] font-bold text-white bg-[#111111] rounded-xl hover:bg-black transition-all active:scale-95 shadow-md shadow-black/10 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar Manual
          </button>
        </div>
      </div>

      {/* 2. Main Container Layer */}
      <div className="bg-white border rounded-xl border-[#EAEAEA] shadow-none overflow-hidden relative">
        
        {/* Tabs Bar */}
        <div className="flex items-center gap-8 px-6 border-b border-[#EAEAEA] overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative py-4 text-[13px] font-bold whitespace-nowrap transition-colors flex items-center gap-2 group
                ${activeTab === tab.value ? (tab.isSpecial ? "text-emerald-600" : "text-[#111111]") : "text-[#888888] hover:text-[#111111]"}
              `}
            >
              {tab.isSpecial && <Box className={`w-4 h-4 ${activeTab === tab.value ? 'text-emerald-500' : 'text-[#888888]'}`} />}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold transition-colors ${activeTab === tab.value ? 'bg-gray-100 text-[#111111]' : 'bg-transparent text-gray-500 group-hover:bg-gray-50'}`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.value && (
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${tab.isSpecial ? 'bg-emerald-500' : 'bg-[#111111]'}`} />
              )}
            </button>
          ))}
        </div>

        {/* Filters Toolbar */}
        <div className="p-3 flex flex-col md:flex-row gap-4 justify-between items-center bg-white border-b border-[#EAEAEA]">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
            <input 
              type="text" 
              placeholder={activeTab === 'import' ? "Buscar dropshippers o productos..." : "Buscar SKU o nombre de producto..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-[13px] font-medium bg-transparent border border-transparent focus:outline-none text-[#111111] transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button className="w-full md:w-auto px-3 py-1.5 text-[12px] font-bold text-gray-600 bg-white border border-[#EAEAEA] rounded-md hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
              <Filter className="w-3.5 h-3.5" /> Filtros
            </button>
          </div>
        </div>

        {/* 3. Dynamic Rendering based on Tab */}
        <div className="min-h-[400px] bg-[#FAFAFA]/30">
          <>
            {/* --- VIEW: CATALOG (Standard Table) --- */}
            {activeTab !== 'import' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]">
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] w-12">
                        <input 
                          type="checkbox" 
                          onChange={handleSelectAll}
                          checked={selectedRows.length === filteredCatalog.length && filteredCatalog.length > 0}
                          className="w-4 h-4 rounded border-gray-300 text-[#111111] focus:ring-[#111111] cursor-pointer" 
                        />
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Producto</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Proveedor</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Rentabilidad</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Reglas Precio</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Estado</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] text-right">Stock</th>
                      <th className="px-6 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA]/80">
                    {filteredCatalog.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-24 text-center">
                          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6 border border-gray-100 shadow-sm">
                            <Package className="w-8 h-8 text-gray-300" />
                          </div>
                          <h3 className="text-xl font-extrabold text-[#111111]">Catálogo Vacío</h3>
                          <p className="text-[15px] font-medium text-[#888888] mt-2 max-w-sm mx-auto">No tienes productos en esta vista. Prueba importando desde dropshipping.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredCatalog.map(product => {
                        const isSelected = selectedRows.includes(product.id);
                        return (
                          <tr 
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            className={`group transition-all cursor-pointer ${isSelected ? 'bg-emerald-50/30' : 'hover:bg-gray-50/50 bg-white'}`}
                          >
                            <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={(e) => handleSelectRow(e, product.id)}
                                className="w-4 h-4 rounded border-gray-300 text-[#111111] focus:ring-[#111111] cursor-pointer" 
                              />
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shadow-sm shrink-0">
                                  {product.image ? (
                                    <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="w-5 h-5" /></div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[13px] font-bold text-[#111111]">{product.title}</p>
                                  <p className="text-xs font-semibold text-gray-400 mt-0.5">{product.variants.length} variante{product.variants.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`text-[11px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${product.supplier === 'Own' ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'}`}>
                                {product.supplier}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-sm font-bold text-emerald-700 tabular-nums">+{Math.round(product.margin * 100)}%</p>
                              <p className="text-[11px] font-medium text-gray-500 mt-0.5 tabular-nums">Costo: ${product.cost.toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-[15px] font-black text-[#111111] tabular-nums tracking-tight">${product.price.toLocaleString('es-AR')}</p>
                            </td>
                            <td className="px-6 py-5"><ProductStatusBadge status={product.status} /></td>
                            <td className="px-6 py-5 text-right font-black text-[#111111] text-sm tabular-nums">
                              {product.totalStock > 0 ? (
                                <span className="text-[#111111]">{product.totalStock} u.</span>
                              ) : (
                                <span className="text-red-500">Agotado</span>
                              )}
                            </td>
                            <td className="px-6 py-5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 hover:bg-white border hover:border-[#EAEAEA] border-transparent shadow-sm rounded-lg text-gray-500 hover:text-[#111111] transition-all">
                                  <Edit className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                
                {/* Pagination Footer */}
                {filteredCatalog.length > 0 && (
                  <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#FAFAFA] flex items-center justify-between">
                    <span className="text-xs text-[#888888] font-bold uppercase tracking-wider block">
                      Mostrando <b className="text-[#111111] px-1">{filteredCatalog.length}</b> de {products.length}
                    </span>
                    <div className="flex gap-2">
                      <button disabled className="px-4 py-2 border border-[#EAEAEA] rounded-xl text-[13px] font-bold text-gray-400 bg-white opacity-50 cursor-not-allowed">Anterior</button>
                      <button className="px-4 py-2 border border-[#EAEAEA] rounded-xl text-[13px] font-bold text-[#111111] bg-white hover:bg-gray-50 transition-colors shadow-sm">Siguiente</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- VIEW: IMPORT DROPSHIPPING (Grid) --- */}
            {activeTab === 'import' && (
              <div className="p-6">
                 {filteredImports.length === 0 ? (
                    <div className="py-24 text-center">
                      <h3 className="text-xl font-extrabold text-[#111111]">No hay dropshippers para esto</h3>
                      <p className="text-[15px] font-medium text-[#888888] mt-2">Busca términos como "Gamer", "Tecnología".</p>
                    </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {filteredImports.map(prod => (
                       <div 
                         key={prod.id} 
                         onClick={() => setSelectedImportable(prod)}
                         className="group bg-white border border-[#EAEAEA] rounded-2xl overflow-hidden hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all cursor-pointer flex flex-col"
                       >
                         <div className="aspect-video w-full bg-gray-100 overflow-hidden relative">
                           <img src={prod.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           <div className="absolute top-3 left-3 bg-[#111111]/80 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                             <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {prod.rating}
                           </div>
                         </div>
                         <div className="p-5 flex-1 flex flex-col justify-between">
                           <div>
                             <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Box className="w-3 h-3" /> Mayorista {prod.supplier}</p>
                             <h3 className="text-sm font-bold text-[#111111] leading-snug line-clamp-2 mb-4">{prod.originalTitle}</h3>
                           </div>
                           <div className="flex items-end justify-between mt-4">
                             <div>
                               <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Costo NETO</p>
                               <p className="text-xl font-black text-[#111111] tabular-nums tracking-tight">${prod.baseCost.toLocaleString()}</p>
                             </div>
                             <div className="text-right">
                               <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Margen Sugerido</p>
                               <p className="text-sm font-black text-emerald-600 tabular-nums">+{Math.round(prod.estimatedMargin * 100)}%</p>
                             </div>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            )}
          </>
        </div>
      </div>

      {/* Floating Bulk Actions Toolbar */}
      {selectedRows.length > 0 && activeTab !== 'import' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#111111] text-white px-2 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 z-30">
           <div className="px-4 border-r border-gray-700">
             <span className="text-[13px] font-bold">{selectedRows.length} seleccionados</span>
           </div>
           <div className="flex items-center gap-1 px-2">
             <button className="px-4 py-2 text-[13px] font-bold hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2">
               Activar
             </button>
             <button className="px-4 py-2 text-[13px] font-bold hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2">
               Archivar
             </button>
             <button className="px-4 py-2 text-[13px] font-bold hover:bg-red-950/50 hover:text-red-400 text-gray-300 rounded-xl transition-colors flex items-center gap-2">
               <Trash2 className="w-4 h-4" /> Eliminar
             </button>
           </div>
        </div>
      )}

      {/* Drawers */}
      <ProductDrawer 
        product={selectedProduct} 
        isOpen={selectedProduct !== null} 
        onClose={() => setSelectedProduct(null)} 
      />
      <ImportPreviewDrawer
        product={selectedImportable}
        isOpen={selectedImportable !== null}
        onClose={() => setSelectedImportable(null)}
      />

    </div>
  );
}
