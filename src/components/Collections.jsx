import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { Plus, Trash2, Wallet, Calendar, User } from 'lucide-react';

const Collections = ({ userName, userRole }) => {
    const [collections, setCollections] = useState([]);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [dateFilter, setDateFilter] = useState('asOnDate');
    const [customerName, setCustomerName] = useState('');
    const [collectionAmount, setCollectionAmount] = useState('');
    const [totalCollectionAmount, setTotalCollectionAmount] = useState(0);

    useEffect(() => {
        const collectionsRef = db.ref('collections');
        const listener = collectionsRef.on('value', snapshot => {
            const data = snapshot.val();
            if (data) {
                let collectionsList = Object.entries(data).map(([id, collection]) => ({ id, ...collection }));

                const filterDateObj = new Date(filterDate);

                collectionsList = collectionsList.filter(collection => {
                    const collectionDate = new Date(collection.date);
                    if (dateFilter === 'asOnDate') {
                        return collectionDate.toISOString().split('T')[0] === filterDate;
                    } else if (dateFilter === 'weekly') {
                        const weekAgo = new Date(filterDateObj);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return collectionDate >= weekAgo && collectionDate <= filterDateObj;
                    } else if (dateFilter === 'monthly') {
                        const monthAgo = new Date(filterDateObj);
                        monthAgo.setDate(monthAgo.getDate() - 30);
                        return collectionDate >= monthAgo && collectionDate <= filterDateObj;
                    }
                    return true;
                });

                if (userRole !== 'admin') {
                    collectionsList = collectionsList.filter(collection => collection.salesman === userName);
                }

                const total = collectionsList.reduce((sum, col) => sum + (col.amount || 0), 0);
                setTotalCollectionAmount(total);
                setCollections(collectionsList);
            } else {
                setCollections([]);
                setTotalCollectionAmount(0);
            }
        });
        return () => collectionsRef.off('value', listener);
    }, [filterDate, userRole, userName, dateFilter]);

    const addCollection = async () => {
        if (!customerName || !collectionAmount) {
            alert('Please enter customer name and amount');
            return;
        }
        try {
            await db.ref('collections').push({
                customerName,
                amount: parseFloat(collectionAmount),
                date: filterDate,
                salesman: userName,
                timestamp: new Date().toISOString()
            });
            alert('Collection added successfully');
            setCustomerName('');
            setCollectionAmount('');
        } catch (error) {
            console.error('Add collection error:', error);
            alert('Failed to add collection');
        }
    };

    const deleteCollection = async (collectionId) => {
        if (!confirm('Delete this collection?')) return;
        try {
            await db.ref('collections/' + collectionId).remove();
            alert('Collection deleted');
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete collection');
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-blue-600" />
                        Collections
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setDateFilter('asOnDate')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'asOnDate' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>As On Date</button>
                        <button onClick={() => setDateFilter('weekly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'weekly' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Weekly</button>
                        <button onClick={() => setDateFilter('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'monthly' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Monthly</button>
                    </div>
                </div>

                <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all mb-6"
                />

                {userRole !== 'admin' && (
                    <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Add New Collection</h3>
                        <div className="space-y-4">
                            <input
                                placeholder="Customer Name"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                            />
                            <input
                                placeholder="Amount"
                                type="number"
                                value={collectionAmount}
                                onChange={e => setCollectionAmount(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                            />
                            <button
                                onClick={addCollection}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                            >
                                <Plus className="w-5 h-5" />
                                Add Collection
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-blue-600 text-white rounded-2xl p-6 mb-6 flex justify-between items-center shadow-lg shadow-blue-200">
                    <span className="font-medium opacity-90">Total Collections</span>
                    <span className="text-3xl font-bold">₹{totalCollectionAmount.toFixed(2)}</span>
                </div>

                <div className="space-y-3">
                    {collections.map(collection => (
                        <div key={collection.id} className="bg-white border border-gray-100 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-all">
                            <div>
                                <p className="font-bold text-gray-900 text-lg">{collection.customerName}</p>
                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {collection.salesman}</span>
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {collection.date}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="font-bold text-green-600 text-xl">₹{(collection.amount || 0).toFixed(2)}</p>
                                {userRole === 'admin' && (
                                    <button
                                        onClick={() => deleteCollection(collection.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {collections.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No collections found for this period</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Collections;
