import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import ColorBlastShop from '@/app/_components/merch/ColorBlastShop';
import DesignBag from '@/app/_components/merch/DesignBag';
import {LiveCommerce} from '@/app/_components/LiveCommerce';
import {merchProducts} from '@/data/color-blast';
import {LIVE_CART_KEY as DESIGN_BAG_KEY} from '@/lib/client/merch-preview-cart';
import {LIVE_CART_KEY as PURCHASE_CART_KEY} from '@/lib/client/live-cart';
import {commerceMessages} from '@/ui/i18n/catalogues/commerce';
import {formatMessage} from '@/lib/i18n/messages';

const money=(value:number)=>'KES '+value.toLocaleString('en-KE');

describe('design and checkout copy clarity',()=>{
 it('names the lookbook and its design-only status without generic slogans',()=>{
  const html=renderToStaticMarkup(createElement(ColorBlastShop));
  for(const label of ['Design lookbook','Merchandise designs','View all 24 designs','All designs.','Search designs','Not on sale','no payment is taken.','The source<br/>artwork.'])expect(html).toContain(label);
  for(const phrase of ['Wear the movement.','Your artwork. Your style.','Wear it. Carry it.','The original.<br/>Reimagined.'])expect(html).not.toContain(phrase);
  expect(html).toContain('proposed starting price');
  expect(html).not.toContain('Add to cart');
 });

 it('qualifies retail and event prices on every lookbook card',()=>{
  const html=renderToStaticMarkup(createElement(ColorBlastShop));
  expect(html.match(/Proposed event price · /g)).toHaveLength(24);
  expect(html.match(/<strong>Proposed KES /g)).toHaveLength(24);
  for(const product of merchProducts){
   expect(html).toContain('<strong>Proposed '+money(product.price)+'</strong>');
   expect(html).toContain('Proposed event price · '+money(product.eventPrice));
   expect(html).toContain('href="/shop/'+product.id+'"');
  }
 });

 it('labels detail and selection prices as proposed while retaining specifications and no-payment boundaries',()=>{
  for(const product of merchProducts){
   const html=renderToStaticMarkup(createElement(ColorBlastShop,{product}));
   expect(html).toContain('<strong>Proposed '+money(product.price)+'</strong>');
   expect(html).toContain('Proposed event price <b>'+money(product.eventPrice)+'</b>');
   expect(html).toContain('Save design <span>Proposed '+money(product.price)+'</span>');
   for(const label of ['Not on sale. Production and stock await confirmation. No payment is taken.','Product details','Care','Fit &amp; fulfilment','supplier sample','Delivery costs and collection details will be confirmed before orders open.','Related designs.'])expect(html).toContain(label);
   expect(html).toContain('max="20"');
   expect(html).not.toContain('Add to cart');
   expect(html).not.toContain('Keep the colour going.');
  }
 });

 it('keeps design selections explicitly separate from a paid order or shopping cart',()=>{
  const html=renderToStaticMarkup(createElement(DesignBag));
  expect(DESIGN_BAG_KEY).not.toBe(PURCHASE_CART_KEY);
  for(const label of ['Designs / not an order','Prices are proposed and stock is unconfirmed.','Saving creates no order or charge.','href="/shop/lookbook"','href="/cart"','View shopping cart'])expect(html).toContain(label);
  expect(html).not.toContain('Pay now');
 });

 it('gives the cart a concrete review instruction without changing its stable loading shell',()=>{
  const html=renderToStaticMarkup(createElement(LiveCommerce,{view:'cart'}));
  expect(html).toContain('Check your options and quantities before checkout.');
  expect(html).toContain('Loading the live catalogue');
  expect(html).not.toContain('Your picks, in one place.');
 });

 it('retains checkout recovery, consent and payment-confirmation warnings',()=>{
  const source=readFileSync('app/_components/LiveCommerce.tsx','utf8');
  const warnings=[
   ['fulfillment.method','Pickup or delivery'],
   ['cart.browse','Browse merchandise to add items to your cart.'],
   ['checkout.saved','A saved order is not confirmation of payment.'],
   ['checkout.cardNote','Your receipt is issued only after payment is confirmed.'],
   ['checkout.mpesaNote','Your ticket or receipt is issued only after payment is confirmed.'],
   ['checkout.paymentUncertain','Check the saved payment before paying again.'],
  ] as const;
  for(const [key,text]of warnings){
   expect(formatMessage(commerceMessages,'en',key).text).toContain(text);
   expect(source).toContain(key==='checkout.saved'?'message="'+key+'"':"'"+key+"'");
  }
  // The saved warning is a MessageText slot; consent destinations stay real.
  expect(source).toContain('message="checkout.saved"');
  for(const href of ['href="/terms"','href="/refund-policy"','href="/privacy-policy"'])expect(source).toContain(href);
  expect(formatMessage(commerceMessages,'en','tickets.closed').text).toBe('Ticket sales are not open.');
  expect(source.match(/t\('tickets.closed'\)/g)).toHaveLength(1);
  expect(source).not.toContain('Find something that feels like you');
 });
});
