import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Package, AlertCircle } from 'lucide-react';

const DeliveryModal = ({ isOpen, onClose, order, onConfirm }) => {
    const [mode, setMode] = useState('selection'); // 'selection' or 'partial'
    const [items, setItems] = useState([]);

    useEffect(() => {
        if (order && order.items) {
            // Ensure items is an array and clone it
            const itemsArray = Array.isArray(order.items) ? order.items : Object.values(order.items);
            setItems(itemsArray.map(item => ({
                ...item,
                originalQty: item.quantity || item.qty || 0,
                currentQty: item.quantity || item.qty || 0
            })));
        } else {
            setItems([]);
        }
        setMode('selection');
    }, [order, isOpen]);

    if (!isOpen) return null;

    const handleQuantityChange = (index, value) => {
        const newItems = [...items];
        const qty = parseFloat(value);
        newItems[index].currentQty = isNaN(qty) ? 0 : qty;
        setItems(newItems);
    };

    const handleFullDelivery = () => {
        onConfirm(items.map(item => ({
            ...item,
            quantity: item.originalQty // Ensure we use the original quantity
        })));
    };

    const handlePartialConfirm = () => {
        onConfirm(items.map(item => ({
            ...item,
            quantity: item.currentQty
        })));
    };

    const totalOriginal = items.reduce((sum, item) => sum + (item.originalQty * (item.price || item.rate || 0)), 0);
    const totalCurrent = items.reduce((sum, item) => sum + (item.currentQty * (item.price || item.rate || 0)), 0);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="w-6 h-6 text-blue-600" />
                        Confirm Delivery
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {mode === 'selection' ? (
                        <div className="space-y-4">
                            <p className="text-gray-600 text-center mb-6 text-lg">
                                Are all items in this order being delivered?
                            </p>
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={handleFullDelivery}
                                    className="flex items-center justify-center gap-3 p-4 bg-green-50 border-2 border-green-100 hover:border-green-500 rounded-2xl group transition-all"
                                >
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors">
                                        <CheckCircle className="w-6 h-6 text-green-600 group-hover:text-white" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-bold text-gray-800 text-lg">Yes, Full Delivery</span>
                                        <span className="text-sm text-gray-500">Mark all {items.length} items as delivered</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setMode('partial')}
                                    className="flex items-center justify-center gap-3 p-4 bg-orange-50 border-2 border-orange-100 hover:border-orange-500 rounded-2xl group transition-all"
                                >
                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                                        <AlertCircle className="w-6 h-6 text-orange-600 group-hover:text-white" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-bold text-gray-800 text-lg">No, Partial Delivery</span>
                                        <span className="text-sm text-gray-500">Some items are missing or returned</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-gray-700">Update Quantities</h4>
                                <button
                                    onClick={() => setMode('selection')}
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    Back
                                </button>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800">{item.itemName || item.name}</p>
                                            <p className="text-xs text-gray-500">Ordered: {item.originalQty}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={item.currentQty}
                                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                className="w-20 px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 outline-none text-center font-bold"
                                            />
                                            <span className="text-sm font-medium text-gray-500 w-16 text-right">
                                                ₹{((item.currentQty || 0) * (item.price || item.rate || 0)).toFixed(0)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center mt-4">
                                <span className="text-blue-800 font-medium">New Total</span>
                                <span className="text-2xl font-bold text-blue-700">₹{totalCurrent.toFixed(2)}</span>
                            </div>

                            <button
                                onClick={handlePartialConfirm}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all mt-4"
                            >
                                Confirm Partial Delivery
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryModal;
