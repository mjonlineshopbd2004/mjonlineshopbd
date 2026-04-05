import { Request, Response } from 'express';
import { getDb } from '../config/firebase';
import { Product } from '../models/types';
import { syncProductToSheet, deleteProductFromSheet } from '../services/googleSheetService';

export const createProduct = async (req: Request, res: Response) => {
  const { 
    name, 
    description, 
    price, 
    discountPrice, 
    category, 
    images, 
    stock,
    videoUrl,
    sourceUrl,
    sizes,
    colors,
    colorVariants,
    featured,
    trending,
    specifications
  } = req.body;

  if (!name || !price || !category || !stock) {
    return res.status(400).json({ message: 'Name, price, category, and stock are required' });
  }

  try {
    const db = getDb();
    const newProduct: Product = {
      id: db.collection('products').doc().id,
      name,
      description: description || '',
      price: Number(price),
      discountPrice: discountPrice !== undefined ? Number(discountPrice) : null,
      category,
      images: images || [],
      videoUrl: videoUrl || '',
      sourceUrl: sourceUrl || '',
      stock: Number(stock),
      rating: 5,
      reviewsCount: 0,
      sizes: sizes || [],
      colors: colors || [],
      colorVariants: colorVariants || [],
      featured: !!featured,
      trending: !!trending,
      specifications: specifications || [],
      createdAt: new Date().toISOString(),
    };

    await db.collection('products').doc(newProduct.id).set(newProduct);
    
    // Sync to Google Sheet
    await syncProductToSheet(newProduct);
    
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error creating product' });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  const { category, minPrice, maxPrice, search, sort } = req.query;

  try {
    const db = getDb();
    let query: any = db.collection('products');

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    let products = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Product));

    // Client-side filtering for search and price (Firestore has limitations on multiple range filters)
    if (search) {
      const searchLower = String(search).toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.description.toLowerCase().includes(searchLower)
      );
    }

    if (minPrice) {
      products = products.filter(p => p.price >= Number(minPrice));
    }

    if (maxPrice) {
      products = products.filter(p => p.price <= Number(maxPrice));
    }

    if (sort === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else {
      products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching products' });
  }
};

export const getSingleProduct = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const productDoc = await db.collection('products').doc(req.params.id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ id: productDoc.id, ...productDoc.data() });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const productRef = db.collection('products').doc(req.params.id);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const data = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await productRef.update(data);
    const updatedDoc = await productRef.get();
    const updatedProduct = { id: updatedDoc.id, ...updatedDoc.data() } as Product;
    
    // Sync to Google Sheet
    await syncProductToSheet(updatedProduct);
    
    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error updating product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const productId = req.params.id;
    await db.collection('products').doc(productId).delete();
    
    // Sync to Google Sheet
    await deleteProductFromSheet(productId);
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
};
