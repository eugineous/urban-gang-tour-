'use client';
import {useState} from 'react';
import {getMerchProduct} from '@/data/color-blast';
import MerchProductGallery from './MerchProductGallery';
/** Retain the illustration gallery and its provenance captions when a design
 * becomes purchasable. Illustrations never become product photographs. */
export default function ColorBlastPurchaseGallery({id}:{id:string}){
 const product=getMerchProduct(id),[colour,setColour]=useState(product?.colorNames[0]||'Black');
 return product?<MerchProductGallery product={product} colour={colour} onSelectColour={setColour}/>:null;
}
