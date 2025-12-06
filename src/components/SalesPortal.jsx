import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Save, X, ShoppingBag } from 'lucide-react';
import { db } from '../firebase';
import { ITEMS } from '../constants';

const SalesPortal = ({ userName, userRole, editingOrder, setEditingOrder, onNavigate }) => {
    const [customerName, setCustomerName] = useState(editingOrder ? editingOrder.customerName : '');
    const [mobile, setMobile] = useState(editingOrder ? editingOrder.mobile : '');
    const [location, setLocation] = useState(editingOrder ? editingOrder.location : '');
    const [selectedItem, setSelectedItem] = useState('');
    const [selectedItemPrice, setSelectedItemPrice] = useState('');
    const [qty, setQty] = useState('');
    const [rate, setRate] = useState('');
    const [discount, setDiscount] = useState('');
    const [orderItems, setOrderItems] = useState(editingOrder ? editingOrder.items : []);
    const [gps, setGps] = useState(editingOrder ? editingOrder.gps : null);

    useEffect(() => {
        if (editingOrder) {
            setCustomerName(editingOrder.customerName || '');
            setMobile(editingOrder.mobile || '');
            setLocation(editingOrder.location || '');
            setOrderItems(editingOrder.items || []);
            setGps(editingOrder.gps || null);
        }
    }, [editingOrder]);

    const handleItemSelect = (e) => {
        const itemName = e.target.value;
        setSelectedItem(itemName);
        const item = ITEMS.find(i => i.name === itemName);
        if (item) {
            setSelectedItemPrice(item.price);
            setRate(item.price.toString());
        } else {
            setSelectedItemPrice('');
            setRate('');
        }
    };

    const captureGPS = () => {
        if (!navigator.geolocation) {
            alert('GPS not supported on this device');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                alert('GPS Captured Successfully!');
            },
            err => {
                console.error('GPS Error:', err);
                alert(`GPS failed: ${err.message}`);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    const addItem = () => {
        if (!selectedItem || !qty) return alert('Select item & quantity');
        if (selectedItem.trim() === '') return alert('Invalid item selected');

        const qtyNum = parseFloat(qty) || 0;
        const rateNum = parseFloat(rate) || 0;
        const discountPercent = parseFloat(discount) || 0;
        const itemSubtotal = qtyNum * rateNum;
        const discountAmount = itemSubtotal * (discountPercent / 100);
        const itemTotal = itemSubtotal - discountAmount;
        setOrderItems([...orderItems, {
            name: selectedItem,
            qty,
            rate: rate || '0',
            discount: discountPercent,
            total: itemTotal
        }]);
        setSelectedItem('');
        setQty('');
        setRate('');
        setSelectedItemPrice('');
        setDiscount('');
    };

    const removeItem = (index) => {
        const newItems = [...orderItems];
        newItems.splice(index, 1);
        setOrderItems(newItems);
    };

    const finalTotal = orderItems.reduce((s, i) => s + i.total, 0);

    const saveOrder = async () => {
        if (!customerName || !mobile || orderItems.length === 0) return alert('Fill all details');

        // Validate items
        const invalidItems = orderItems.filter(item => !item.name || item.name.trim() === '');
        if (invalidItems.length > 0) return alert('Order contains invalid items. Please remove them.');

        try {
            const orderData = {
                customerName,
                mobile,
                location: location || 'Manual',
                items: orderItems,
                total: finalTotal,
                salesman: userName,
                gps,
                status: editingOrder ? editingOrder.status : 'pending',
                timestamp: editingOrder ? editingOrder.timestamp : new Date().toISOString()
            };
            if (editingOrder) {
                await db.ref('orders/' + editingOrder.id).update(orderData);
                alert('Order Updated Successfully!');
                setEditingOrder(null);
                onNavigate('/orders');
            } else {
                await db.ref('orders').push(orderData);
                alert('Order Saved Successfully!');
                setCustomerName('');
                setMobile('');
                setLocation('');
                setOrderItems([]);
                setGps(null);
                setDiscount('');
            }
        } catch (error) {
            console.error('Firebase Error:', error);
            alert(`Failed to save order: ${error.message}`);
        }
    };

    const cancelEdit = () => {
        setEditingOrder(null);
        onNavigate('/orders');
    };

    const qtyNum = parseFloat(qty) || 0;
    const rateNum = parseFloat(rate) || 0;
    const discountPercent = parseFloat(discount) || 0;
    const itemSubtotal = qtyNum * rateNum;
    const discountAmount = itemSubtotal * (discountPercent / 100);
    const currentItemTotal = itemSubtotal - discountAmount;

    return (
        <div className="max-w-3xl mx-auto pb-4">
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-blue-600 flex-shrink-0" />
                        <span>{editingOrder ? 'Edit Order' : 'New Order'}</span>
                    </h2>
                    {editingOrder && (
                        <span className="bg-orange-100 text-orange-700 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider">
                            Editing
                        </span>
                    )}
                </div>

                <form onSubmit={e => { e.preventDefault(); saveOrder(); }} className="space-y-4">
                    {/* Customer Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase">Customer Name</label>
                            <input
                                placeholder="Enter name"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm md:text-base"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase">Mobile Number</label>
                            <input
                                placeholder="Enter mobile"
                                value={mobile}
                                onChange={e => setMobile(e.target.value)}
                                className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm md:text-base"
                                inputMode="numeric"
                            />
                        </div>
                    </div>

                    {/* Location & GPS */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase">Location</label>
                        <div className="flex gap-2">
                            <input
                                placeholder="Enter location manually"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                className="flex-1 px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm md:text-base"
                            />
                            <button
                                type="button"
                                onClick={captureGPS}
                                className={`px-3 md:px-4 py-2.5 md:py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 flex-shrink-0 text-sm md:text-base ${gps ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                                <span className="hidden sm:inline">{gps ? 'GPS ✓' : 'GPS'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Add Items Section */}
                    <div className="border-t border-gray-100 pt-4 md:pt-6 mt-4 md:mt-6">
                        <h3 className="font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                            <Plus className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                            Add Items
                        </h3>

                        <div className="space-y-3 md:space-y-4 bg-gray-50 p-3 md:p-4 rounded-2xl">
                            {/* Item Selection */}
                            <select
                                value={selectedItem}
                                onChange={handleItemSelect}
                                className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-sm md:text-base"
                            >
                                <option value="">Select Item</option>
                                {ITEMS.map(item => (
                                    <option key={item.name} value={item.name}>{item.name} - ₹{item.price}</option>
                                ))}
                            </select>

                            {/* Quantity and Price */}
                            <div className="grid grid-cols-2 gap-2 md:gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Quantity</label>
                                    <input
                                        placeholder="Qty"
                                        type="number"
                                        value={qty}
                                        onChange={e => setQty(e.target.value)}
                                        className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-sm md:text-base"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Price</label>
                                    <input
                                        placeholder="Price"
                                        type="number"
                                        value={rate}
                                        onChange={e => setRate(e.target.value)}
                                        className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-sm md:text-base"
                                    />
                                </div>
                            </div>

                            {/* Discount */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Discount %</label>
                                <input
                                    placeholder="Discount %"
                                    type="number"
                                    value={discount}
                                    onChange={e => setDiscount(e.target.value)}
                                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-sm md:text-base"
                                />
                            </div>

                            {/* Current Item Total Preview */}
                            {selectedItem && qty && (
                                <div className="p-3 bg-blue-100 rounded-xl flex justify-between items-center text-blue-800 text-xs md:text-sm font-medium">
                                    <span>Item Total:</span>
                                    <span className="text-base md:text-lg font-bold">₹{currentItemTotal.toFixed(2)}</span>
                                </div>
                            )}

                            {/* Add Button */}
                            <button
                                type="button"
                                onClick={addItem}
                                className="w-full bg-gray-900 text-white py-2.5 md:py-3 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                            >
                                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                Add to Order
                            </button>
                        </div>
                    </div>

                    {/* Order Summary */}
                    {orderItems.length > 0 && (
                        <div className="space-y-3 mt-4 md:mt-6">
                            <h3 className="font-bold text-gray-800 text-xs md:text-sm uppercase tracking-wider">Order Summary</h3>
                            {orderItems.map((it, i) => (
                                <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 md:p-4 flex justify-between items-center shadow-sm gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-800 text-sm md:text-base truncate">{it.name}</p>
                                        <p className="text-xs md:text-sm text-gray-500">
                                            {it.qty} × ₹{it.rate}
                                            {it.discount > 0 && <span className="text-orange-600 ml-1">(-{it.discount}%)</span>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                                        <p className="font-bold text-green-600 text-base md:text-lg">₹{it.total.toFixed(2)}</p>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(i)}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Final Total */}
                            <div className="bg-gray-900 text-white p-4 md:p-6 rounded-2xl mt-4 flex justify-between items-center">
                                <span className="text-gray-400 font-medium text-sm md:text-base">Final Total</span>
                                <span className="text-2xl md:text-3xl font-bold">₹{finalTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
                        <button
                            type="submit"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4 md:w-5 md:h-5" />
                            {editingOrder ? 'Update Order' : 'Save Order'}
                        </button>
                        {editingOrder && (
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4 md:w-5 md:h-5" />
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SalesPortal;