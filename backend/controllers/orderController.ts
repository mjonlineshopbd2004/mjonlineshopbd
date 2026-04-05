import { Request, Response } from 'express';
import { getDb } from '../config/firebase';
import { Order, OrderStatus, PaymentMethod } from '../models/types';
import { syncOrderToSheet } from '../services/googleSheetService';

export const createOrder = async (req: any, res: Response) => {
  const { 
    items, 
    customerName, 
    phone, 
    address, 
    paymentMethod, 
    deliveryArea, 
    discount, 
    total, 
    subtotal, 
    deliveryCharge,
    payableAmount,
    paymentType,
    transactionId,
    paymentScreenshot,
    cardDetails,
    customerNote
  } = req.body;

  if (!items || items.length === 0 || !customerName || !phone || !address || !paymentMethod) {
    return res.status(400).json({ message: 'Missing required order fields' });
  }

  try {
    const db = getDb();
    const newOrder: Order = {
      id: db.collection('orders').doc().id,
      userId: req.user.uid,
      customerName,
      customerEmail: req.user.email,
      phone,
      address,
      items,
      subtotal,
      deliveryCharge,
      discount: discount || 0,
      total,
      payableAmount: payableAmount || total,
      status: 'pending',
      paymentMethod,
      paymentType: paymentType || '100%',
      paymentStatus: 'pending',
      deliveryArea: deliveryArea || 'inside-dhaka',
      transactionId: transactionId || '',
      paymentScreenshot: paymentScreenshot || '',
      cardDetails: cardDetails || null,
      customerNote: customerNote || '',
      createdAt: new Date().toISOString(),
    };

    await db.collection('orders').doc(newOrder.id).set(newOrder);

    // Sync to Google Sheet
    syncOrderToSheet(newOrder).catch(err => console.error('Sheet sync error:', err));

    // Update product stock
    for (const item of items) {
      const productRef = db.collection('products').doc(item.id);
      const productDoc = await productRef.get();
      if (productDoc.exists) {
        const currentStock = productDoc.data()?.stock || 0;
        await productRef.update({ stock: Math.max(0, currentStock - item.quantity) });
      }
    }

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Server error creating order' });
  }
};

export const getUserOrders = async (req: any, res: Response) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('orders').where('userId', '==', req.user.uid).orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Order));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching orders' });
  }
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Order));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching orders' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { status, paymentStatus, transactionId } = req.body;
  try {
    const db = getDb();
    const orderRef = db.collection('orders').doc(req.params.id);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (transactionId) updates.transactionId = transactionId;

    await orderRef.update(updates);
    const updatedDoc = await orderRef.get();
    const updatedOrder = { id: updatedDoc.id, ...updatedDoc.data() };

    // Sync to Google Sheet on status update
    syncOrderToSheet(updatedOrder).catch(err => console.error('Sheet sync error:', err));

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating order' });
  }
};

export const getOrderById = async (req: any, res: Response) => {
  try {
    const db = getDb();
    const orderDoc = await db.collection('orders').doc(req.params.id).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const orderData = orderDoc.data() as Order;
    
    // Authorization check: Only owner or admin can see the order
    if (orderData.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ id: orderDoc.id, ...orderData });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
