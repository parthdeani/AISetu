"use client";

import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../api-config';

export default function Catalog() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    category: 'Lace',
    price: '',
    stock: '',
    tags: '',
  });

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const handleSyncLocal = () => {
    setIsSyncing(true);
    setSyncStatus('Scanning uploads folder and generating 15-degree rotation embeddings...');
    fetch(getApiUrl('/api/catalog/sync-local'), {
      method: 'POST',
    })
      .then((res) => res.json())
      .then((data) => {
        setSyncStatus(data.message || 'Sync completed successfully!');
        fetchProducts();
        setTimeout(() => {
          setIsSyncing(false);
          setSyncStatus('');
        }, 4000);
      })
      .catch((err) => {
        setSyncStatus('Sync failed: ' + err.message);
        setTimeout(() => {
          setIsSyncing(false);
          setSyncStatus('');
        }, 4000);
      });
  };

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const fetchProducts = (pageNum = page) => {
    setLoading(true);
    fetch(getApiUrl(`/api/catalog?page=${pageNum}&limit=${limit}`))
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.items || []);
        setTotal(data.total || 0);
        setPage(data.page || pageNum);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts(1);
  }, []);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.code || !newProduct.name) return;

    fetch(getApiUrl('/api/catalog'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_code: newProduct.code,
        name: newProduct.name,
        category: newProduct.category,
        price: parseFloat(newProduct.price || '0'),
        stock: parseInt(newProduct.stock || '0', 10),
        tags: newProduct.tags ? newProduct.tags.split(',').map((t) => t.trim()) : [],
      }),
    })
      .then((res) => res.json())
      .then(() => {
        fetchProducts(1);
        setNewProduct({ code: '', name: '', category: 'Lace', price: '', stock: '', tags: '' });
        setShowAddForm(false);
      });
  };

  const handleDeleteProduct = (id: string) => {
    fetch(getApiUrl(`/api/catalog/${id}`), {
      method: 'DELETE',
    })
      .then((res) => res.json())
      .then(() => fetchProducts(page));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile && !zipFile) return;

    setIsUploading(true);
    setUploadStatus('Uploading metadata & image archive to backend...');

    const formData = new FormData();
    if (csvFile) formData.append('csv', csvFile);
    if (zipFile) formData.append('zip', zipFile);

    try {
      const response = await fetch(getApiUrl('/api/catalog/bulk-upload'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Bulk upload failed');
      const data = await response.json();

      setUploadStatus(`Success! Job Initialized: ${data.message || 'Processing CSV/ZIP folders'}`);
      
      // Re-fetch after short delay to let sync background worker load images
      setTimeout(() => {
        fetchProducts();
        setIsUploading(false);
        setShowBulkUpload(false);
        setUploadStatus('');
      }, 3000);
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
      setIsUploading(false);
    }
  };

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    product_code: '',
    name: '',
    category: 'Farsan',
    price: '',
    stock: '',
    tags: '',
    status: 'ACTIVE',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenDetails = (p: any) => {
    setSelectedProduct(p);
    setEditForm({
      product_code: p.product_code || '',
      name: p.name || '',
      category: p.category || 'Farsan',
      price: p.price !== undefined ? String(p.price) : '0',
      stock: p.stock !== undefined ? String(p.stock) : '0',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
      status: p.status || 'ACTIVE',
    });
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const handleSaveModalEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsSaving(true);

    fetch(getApiUrl(`/api/catalog/${selectedProduct.id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_code: editForm.product_code,
        name: editForm.name,
        category: editForm.category,
        price: parseFloat(editForm.price || '0'),
        stock: parseInt(editForm.stock || '0', 10),
        tags: editForm.tags ? editForm.tags.split(',').map((t) => t.trim()) : [],
        status: editForm.status,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setIsSaving(false);
        setSelectedProduct(null);
        fetchProducts(page);
      })
      .catch((err) => {
        setIsSaving(false);
        alert('Failed to update product: ' + err.message);
      });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Product Catalog Management</h2>
          <p className="text-sm text-gray-400">Click any product row to view full image and edit details</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleSyncLocal}
            disabled={isSyncing}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {isSyncing ? 'Syncing...' : 'Sync Local Folder'}
          </button>
          <button
            onClick={() => { setShowBulkUpload(true); setShowAddForm(false); }}
            className="px-5 py-2.5 bg-[#202c33] text-white hover:bg-[#2a3942] rounded-lg text-sm font-semibold border border-[#374248] transition-colors"
          >
            Bulk Import (CSV/ZIP)
          </button>
          <button
            onClick={() => { setShowAddForm(true); setShowBulkUpload(false); }}
            className="px-5 py-2.5 bg-[#00a884] hover:bg-[#009675] text-white rounded-lg text-sm font-bold transition-colors"
          >
            Add New Product
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="p-4 bg-[#202c33] border border-[#374248] rounded-xl text-[#00a884] font-mono text-sm">
          {syncStatus}
        </div>
      )}

      {/* Forms Drawer */}
      {showAddForm && (
        <form onSubmit={handleAddProduct} className="p-6 bg-[#111b21] border border-[#222e35] rounded-xl space-y-4 max-w-2xl glass">
          <h3 className="text-lg font-semibold text-white">Add New Catalog Product</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase">Product Code *</label>
              <input
                type="text"
                required
                value={newProduct.code}
                onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white mt-1 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase">Product Name *</label>
              <input
                type="text"
                required
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white mt-1 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase">Category</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white mt-1 outline-none"
              >
                <option value="Farsan">Farsan</option>
                <option value="Lace">Lace</option>
                <option value="Patta">Patta</option>
                <option value="Ribbon">Ribbon</option>
                <option value="Fabric">Fabric</option>
                <option value="Embroidery">Embroidery</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white mt-1 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase">Stock</label>
                <input
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white mt-1 outline-none"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase">Tags (comma separated)</label>
            <input
              type="text"
              value={newProduct.tags}
              onChange={(e) => setNewProduct({ ...newProduct, tags: e.target.value })}
              className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white mt-1 outline-none"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#00a884] hover:bg-[#009675] text-white rounded-lg text-sm font-bold"
            >
              Save Product
            </button>
          </div>
        </form>
      )}

      {showBulkUpload && (
        <form onSubmit={handleBulkSubmit} className="p-6 bg-[#111b21] border border-[#222e35] rounded-xl space-y-4 max-w-2xl glass">
          <h3 className="text-lg font-semibold text-white">Bulk Product Import</h3>
          <p className="text-xs text-gray-400">
            Upload a CSV containing product codes/prices and a corresponding ZIP folder containing product images named exactly like the product code (e.g. <code>LACE-001.jpg</code>).
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-dashed border-[#374248] rounded-lg p-6 text-center">
              <span className="text-2xl block mb-2">📄</span>
              <span className="text-xs text-gray-400 block font-semibold uppercase">Product Metadata (CSV)</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="mt-4 text-xs text-white"
              />
            </div>

            <div className="border border-dashed border-[#374248] rounded-lg p-6 text-center">
              <span className="text-2xl block mb-2">📦</span>
              <span className="text-xs text-gray-400 block font-semibold uppercase">Image Bundle (ZIP)</span>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                className="mt-4 text-xs text-white"
              />
            </div>
          </div>

          {uploadStatus && (
            <div className="bg-[#202c33] border border-[#374248] rounded-lg p-4 text-xs font-mono text-[#00a884]">
              {uploadStatus}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => { setShowBulkUpload(false); setUploadStatus(''); }}
              className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || (!csvFile && !zipFile)}
              className="px-5 py-2.5 bg-[#00a884] hover:bg-[#009675] disabled:opacity-40 text-white rounded-lg text-sm font-bold"
            >
              Run Batch Import
            </button>
          </div>
        </form>
      )}

      {/* Catalog Table */}
      <div className="bg-[#111b21] border border-[#222e35] rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading catalog...</div>
        ) : products.length > 0 ? (
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#202c33]/40 text-xs font-bold uppercase text-gray-400 border-b border-[#222e35]">
              <tr>
                <th className="p-4">Image</th>
                <th className="p-4">Product Code</th>
                <th className="p-4">Product Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222e35]">
              {products.map((p: any) => (
                <tr
                  key={p.id}
                  onClick={() => handleOpenDetails(p)}
                  className="hover:bg-[#202c33]/40 transition-colors cursor-pointer group"
                >
                  <td className="p-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center border border-[#374248] group-hover:border-[#00a884] transition-colors">
                      {p.images && p.images.length > 0 ? (
                        <img
                          src={p.images[0].image_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 text-[10px]">No Img</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold text-white group-hover:text-[#00a884] transition-colors">
                    {p.product_code}
                  </td>
                  <td className="p-4 font-semibold text-white">
                    {p.name}
                  </td>
                  <td className="p-4">{p.category}</td>
                  <td className="p-4">${Number(p.price).toFixed(2)}</td>
                  <td className="p-4">{p.stock}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      p.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="space-x-3">
                      <button
                        onClick={() => handleOpenDetails(p)}
                        className="text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        Edit Details
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="text-red-400 hover:text-red-300 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-400">No products found in catalog. Add one above!</div>
        )}
      </div>

      {/* Pagination Controls */}
      {total > limit && (
        <div className="flex justify-between items-center bg-[#111b21] border border-[#222e35] p-4 rounded-xl">
          <span className="text-sm text-gray-400">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} products
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const prevPage = Math.max(page - 1, 1);
                setPage(prevPage);
                fetchProducts(prevPage);
              }}
              disabled={page === 1}
              className="px-4 py-2 bg-[#202c33] text-white hover:bg-[#2a3942] disabled:opacity-40 disabled:hover:bg-[#202c33] rounded-lg text-xs font-semibold border border-[#374248] transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchProducts(nextPage);
              }}
              disabled={page * limit >= total}
              className="px-4 py-2 bg-[#202c33] text-white hover:bg-[#2a3942] disabled:opacity-40 disabled:hover:bg-[#202c33] rounded-lg text-xs font-semibold border border-[#374248] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Product Details & Full Edit Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111b21] border border-[#222e35] rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl glass relative">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold w-8 h-8 rounded-full bg-[#202c33] flex items-center justify-center border border-[#374248]"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="text-xl font-bold text-white">Product Details & Edit</h3>
                <p className="text-xs text-gray-400 font-mono">ID: {selectedProduct.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Product Image Preview Column */}
              <div className="space-y-3">
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Product Image Preview</span>
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/50 border border-[#374248] flex items-center justify-center relative shadow-inner">
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <img
                      src={selectedProduct.images[0].image_url}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-4xl block mb-2">🖼️</span>
                      <span className="text-xs text-gray-500">No image associated</span>
                    </div>
                  )}
                </div>
                {selectedProduct.images && selectedProduct.images.length > 0 && (
                  <p className="text-[10px] text-gray-500 font-mono truncate text-center" title={selectedProduct.images[0].image_url}>
                    {selectedProduct.images[0].image_url}
                  </p>
                )}
              </div>

              {/* Editable Fields Form */}
              <form onSubmit={handleSaveModalEdit} className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Product Code *</label>
                    <input
                      type="text"
                      required
                      value={editForm.product_code}
                      onChange={(e) => setEditForm({ ...editForm, product_code: e.target.value })}
                      className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white outline-none focus:border-[#00a884] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white outline-none focus:border-[#00a884]"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white outline-none focus:border-[#00a884]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Category</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white outline-none focus:border-[#00a884]"
                    >
                      <option value="Farsan">Farsan</option>
                      <option value="Lace">Lace</option>
                      <option value="Patta">Patta</option>
                      <option value="Ribbon">Ribbon</option>
                      <option value="Fabric">Fabric</option>
                      <option value="Embroidery">Embroidery</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white outline-none focus:border-[#00a884]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Stock Qty</label>
                    <input
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white outline-none focus:border-[#00a884]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-sm text-white outline-none focus:border-[#00a884]"
                    placeholder="e.g. spicy, crunch, popular"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-[#222e35]">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 bg-[#202c33] hover:bg-[#2a3942] text-gray-300 rounded-lg text-sm font-semibold border border-[#374248] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-[#00a884] hover:bg-[#009675] disabled:opacity-40 text-white rounded-lg text-sm font-bold shadow-lg transition-colors"
                  >
                    {isSaving ? 'Saving Changes...' : 'Save All Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

