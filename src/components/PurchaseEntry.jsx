import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, History, Save, Trash2, Edit2, X, ShoppingCart, CheckCircle } from 'lucide-react';
import { firestore as db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';

const ITEMS = [
    'Steel 100 gm',
    'Steel 50 gm',
    'Steel 20 gm',
    'Steel 500 gm',
    'Plastic Wrapper',
    'Sticker printing',
    'Plastic 100 grm',
    'Plastic 50 gm',
    'Plastic 7 gm',
    'Plastic 13 gm'
];

const PurchaseEntry = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [purchases, setPurchases] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [cart, setCart] = useState([]);
    const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved
    const [formData, setFormData] = useState({
        itemName: ITEMS[0],
        quantity: '',
        price: '',
    });

    const total = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0);
    const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

    useEffect(() => {
        const q = query(collection(db, 'purchases'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const purchaseList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPurchases(purchaseList);
        });

        return () => unsubscribe();
    }, []);

    const handleAddItem = (e) => {
        e.preventDefault();
        if (!formData.quantity || !formData.price) return;

        const newItem = {
            itemName: formData.itemName,
            quantity: parseFloat(formData.quantity),
            price: parseFloat(formData.price),
            total: total,
            tempId: Date.now() // For local key
        };

        setCart([...cart, newItem]);
        setFormData({
            itemName: ITEMS[0],
            quantity: '',
            price: ''
        });
    };

    const handleRemoveFromCart = (tempId) => {
        setCart(cart.filter(item => item.tempId !== tempId));
    };

    const handleSaveAll = async () => {
        if (cart.length === 0) return;

        setSaveStatus('saving');
        setLoading(true);
        try {
            const batchPromises = cart.map(item => {
                const purchaseData = {
                    itemName: item.itemName,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total,
                    timestamp: serverTimestamp(),
                    date: new Date().toISOString()
                };
                return addDoc(collection(db, 'purchases'), purchaseData);
            });

            await Promise.all(batchPromises);

            // Show "Saved" state
            setSaveStatus('saved');

            // Wait 1.5 seconds before clearing
            setTimeout(() => {
                setCart([]);
                setSaveStatus('idle');
                setLoading(false);
                alert('All items saved successfully!');
            }, 1500);

        } catch (error) {
            console.error('Error saving batch:', error);
            alert('Error saving batch purchases');
            setLoading(false);
            setSaveStatus('idle');
        }
    };

    // Keep direct update for editing existing items
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!formData.quantity || !formData.price || !editingId) return;

        setLoading(true);
        try {
            const purchaseData = {
                itemName: formData.itemName,
                quantity: parseFloat(formData.quantity),
                price: parseFloat(formData.price),
                total: total,
                // Don't update timestamp on edit usually, or maybe update 'updatedAt'
            };

            await updateDoc(doc(db, 'purchases', editingId), purchaseData);
            alert('Purchase updated successfully!');
            setEditingId(null);
            setFormData({
                itemName: ITEMS[0],
                quantity: '',
                price: ''
            });
        } catch (error) {
            console.error('Error updating purchase:', error);
            alert('Error updating purchase');
        }
        setLoading(false);
    };

    const handleEdit = (purchase) => {
        // If we are in the middle of a batch, warn user? 
        // Or just let them edit. Let's just switch to edit mode.
        setFormData({
            itemName: purchase.itemName,
            quantity: purchase.quantity,
            price: purchase.price
        });
        setEditingId(purchase.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            try {
                await deleteDoc(doc(db, 'purchases', id));
            } catch (error) {
                console.error('Error deleting purchase:', error);
                alert('Error deleting purchase');
            }
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({
            itemName: ITEMS[0],
            quantity: '',
            price: ''
        });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900">Purchase Entry</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
                    >
                        <LogOut size={20} className="mr-2" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Entry Form */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                    <div className={`p-3 rounded-xl mr-4 ${editingId ? 'bg-orange-100' : 'bg-purple-100'}`}>
                                        {editingId ? <Edit2 className="text-orange-600" size={24} /> : <Plus className="text-purple-600" size={24} />}
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {editingId ? 'Edit Entry' : 'New Entry'}
                                    </h2>
                                </div>
                                {editingId && (
                                    <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <form onSubmit={editingId ? handleUpdate : handleAddItem} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                    <select
                                        value={formData.itemName}
                                        onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                                    >
                                        {ITEMS.map(item => (
                                            <option key={item} value={item}>{item}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Numbers</label>
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="0"
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price EA</label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Amount</label>
                                    <div className="text-2xl font-bold text-gray-900">
                                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg flex items-center justify-center ${editingId
                                        ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
                                        : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                                        }`}
                                >
                                    {loading ? 'Saving...' : (
                                        <>
                                            {editingId ? <Edit2 size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
                                            {editingId ? 'Update Entry' : 'Add to Batch'}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Batch Summary - Only show if items in cart and NOT editing */}
                        {!editingId && cart.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-purple-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center text-purple-900">
                                        <ShoppingCart size={20} className="mr-2" />
                                        <h3 className="font-bold">Current Batch ({cart.length})</h3>
                                    </div>
                                    <span className="font-bold text-lg text-purple-700">
                                        ₹{cartTotal.toLocaleString('en-IN')}
                                    </span>
                                </div>

                                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                                    {cart.map((item) => (
                                        <div key={item.tempId} className="flex justify-between items-center bg-purple-50 p-3 rounded-lg text-sm">
                                            <div>
                                                <div className="font-medium text-gray-900">{item.itemName}</div>
                                                <div className="text-gray-500">{item.quantity} x ₹{item.price}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-gray-700">₹{item.total.toLocaleString('en-IN')}</span>
                                                <button
                                                    onClick={() => handleRemoveFromCart(item.tempId)}
                                                    className="text-red-400 hover:text-red-600"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleSaveAll}
                                    disabled={loading}
                                    className={`w-full text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg flex items-center justify-center ${saveStatus === 'saved'
                                            ? 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                            : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                        }`}
                                >
                                    {saveStatus === 'saving' ? (
                                        'Saving...'
                                    ) : saveStatus === 'saved' ? (
                                        <>
                                            <CheckCircle size={20} className="mr-2" />
                                            Saved
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={20} className="mr-2" />
                                            Save All Items
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Recent Purchases List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="bg-blue-100 p-3 rounded-xl mr-4">
                                        <History className="text-blue-600" size={24} />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900">Recent Purchases</h2>
                                </div>
                                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    {purchases.length} Records
                                </span>
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Date</th>
                                            <th className="px-6 py-4 font-medium">Item</th>
                                            <th className="px-6 py-4 font-medium text-right">Qty</th>
                                            <th className="px-6 py-4 font-medium text-right">Price</th>
                                            <th className="px-6 py-4 font-medium text-right">Total</th>
                                            <th className="px-6 py-4 font-medium text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {purchases.map((purchase) => (
                                            <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                    {purchase.timestamp?.toDate().toLocaleDateString('en-IN') || new Date().toLocaleDateString('en-IN')}
                                                    <div className="text-xs text-gray-400">
                                                        {purchase.timestamp?.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {purchase.itemName}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                                    {purchase.quantity}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                                    ₹{purchase.price.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                                                    ₹{purchase.total.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <button
                                                            onClick={() => handleEdit(purchase)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(purchase.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {purchases.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                                    No purchase records found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {purchases.map((purchase) => (
                                    <div key={purchase.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{purchase.itemName}</h3>
                                                <p className="text-xs text-gray-500">
                                                    {purchase.timestamp?.toDate().toLocaleDateString('en-IN')} • {purchase.timestamp?.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(purchase)}
                                                    className="p-2 bg-white text-blue-600 rounded-lg border border-gray-200 shadow-sm"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(purchase.id)}
                                                    className="p-2 bg-white text-red-600 rounded-lg border border-gray-200 shadow-sm"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Qty</p>
                                                <p className="font-medium">{purchase.quantity}</p>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Price</p>
                                                <p className="font-medium">₹{purchase.price}</p>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Total</p>
                                                <p className="font-bold text-gray-900">₹{purchase.total.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {purchases.length === 0 && (
                                    <div className="text-center py-8 text-gray-400">
                                        No purchase records found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div >
            </div >
        </div >
    );
};

export default PurchaseEntry;
