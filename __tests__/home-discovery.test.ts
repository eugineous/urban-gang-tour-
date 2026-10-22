import {describe, expect, it} from 'vitest';
import {homepageProducts, homepageProductPrice, homepageProductSoldOut, homepageUpcomingEvents} from '@/ui/lib/home-discovery';
import type {OwnedEvent} from '@/ui/lib/owned-event-presentation';
import type {LiveShopProduct} from '@/lib/shop-discovery';

const now = Date.parse('2026-10-22T12:00:00+03:00');
const event = (overrides: OwnedEvent = {}): OwnedEvent => ({id:'one',slug:'event-one',kind:'ticketed',name:'Campus event',status:'published',eventDate:'2026-10-23',...overrides});
const product = (overrides: Partial<LiveShopProduct> & Record<string, unknown> = {}): LiveShopProduct => ({id:'tee',name:'Tour tee',price:1000,image:'/uploads/tee.jpg',category:'T-shirts',variants:[],...overrides});

describe('homepage event promotion', () => {
  it('does not promote private, past, postponed, invalid or undated records as upcoming', () => {
    const unsuitable = [
      ...['draft','pending_review','cancelled','archived','postponed','completed'].map(status => event({status})),
      event({eventDate:'2026-10-21'}), event({eventDate:'2026-02-30'}),event({eventDate:null}),
      event({kind:'past'}),event({slug:'Bad slug'}),event({name:''}),
    ];
    expect(homepageUpcomingEvents(unsuitable,now)).toEqual([]);
    expect(homepageUpcomingEvents([event()],NaN)).toEqual([]);
    expect(homepageUpcomingEvents([event()],0)).toEqual([]);
  });
  it('orders current first, then date before promotional priority and deduplicates', () => {
    const later=event({id:'later',slug:'later',eventDate:'2026-10-25',priority:100});
    const sooner=event({id:'sooner',slug:'sooner',eventDate:'2026-10-23',priority:1});
    const current=event({id:'current',slug:'current',eventDate:'2026-10-22',status:'ongoing'});
    const tie=event({id:'tie',slug:'tie',eventDate:'2026-10-23',priority:5});
    expect(homepageUpcomingEvents([later,sooner,current,tie,current,event({id:'sooner',slug:'duplicate-id'})],now,10).map(row => row.slug)).toEqual(['current','tie','sooner','later']);
  });
  it('keeps today through Nairobi midnight and removes it on the next day', () => {
    const today=event({eventDate:'2026-10-22'});
    expect(homepageUpcomingEvents([today],Date.parse('2026-10-22T23:59:58+03:00'))).toEqual([today]);
    expect(homepageUpcomingEvents([today],Date.parse('2026-10-23T00:00:00+03:00'))).toEqual([]);
  });
  it('retains truthful public admission/status and never invents sellability', () => {
    const rows=['announced','sales_paused','sold_out','rescheduled'].map((status,index) => event({id:String(index),slug:'event-'+index,status,sellable:false}));
    const partner=event({id:'partner',slug:'partner',kind:'partner',partnerDetails:null});
    expect(homepageUpcomingEvents([...rows,partner],now,8)).toHaveLength(5);
    expect(homepageUpcomingEvents(rows,now,8).every(row => row.sellable===false)).toBe(true);
    expect(homepageUpcomingEvents(rows,now,0)).toEqual([]);
    expect(homepageUpcomingEvents(rows,now,2)).toHaveLength(2);
  });
});

describe('homepage live merchandise selection', () => {
  it('uses only complete live catalogue records with safe images and finite prices', () => {
    const good=product();
    expect(homepageProducts([
      good,product({preview:true}),product({id:'retired',active:false}),product({id:'bad',image:'javascript:alert(1)'}),
      product({id:'none',image:''}),product({id:'nan',price:NaN}),product({id:'negative',price:-1}),product({id:'empty',name:''}),
    ])).toEqual([good]);
  });
  it('keeps distinct categories visible, stable within category, and deduplicates IDs', () => {
    const first=product();
    const second=product({id:'tee-2'});
    const bag=product({id:'bag',category:'Bags'});
    const hoodie=product({id:'hoodie',category:'Hoodies'});
    expect(homepageProducts([first,second,bag,hoodie,first],4)).toEqual([first,bag,hoodie,second]);
    expect(homepageProducts([first],0)).toEqual([]);
  });
  it('accepts original public HTTPS and canonical images but not private hosts/data URLs', () => {
    expect(homepageProducts([product({image:'https://urbangangtour.co.ke/uploads/a.jpg'})])).toHaveLength(1);
    expect(homepageProducts([product({image:'https://images.example.com/a.jpg'})])).toHaveLength(1);
    expect(homepageProducts([product({image:'https://localhost/a.jpg'})])).toEqual([]);
    expect(homepageProducts([product({image:'data:image/png;base64,a'})])).toEqual([]);
  });
});

describe('homepage merchandise price', () => {
  it('formats actual base prices, including free items, without a false range', () => {
    expect(homepageProductPrice(product())).toBe('KES 1,000');
    expect(homepageProductPrice(product({price:0}))).toBe('KES 0');
    expect(homepageProductPrice(product({price:1000.5}))).toBe('KES 1,000.5');
  });
  it('uses the lowest selectable variant price, not an unpurchasable base', () => {
    expect(homepageProductPrice(product({variants:[{label:'S',priceAdjustment:200},{label:'M',priceAdjustment:200}]}))).toBe('KES 1,200');
    expect(homepageProductPrice(product({variants:[{label:'S',priceAdjustment:200},{label:'M',priceAdjustment:400}]}))).toBe('From KES 1,200');
    expect(homepageProductPrice(product({variants:[{label:'S',priceAdjustment:-100},{label:'M',priceAdjustment:100}]}))).toBe('From KES 900');
  });
  it('does not fabricate a price from invalid adjustments', () => {
    expect(homepageProductPrice(product({variants:[{label:'S',priceAdjustment:NaN},{label:'M',priceAdjustment:-2000}]}))).toBe('KES 1,000');
    expect(homepageProductPrice(product({price:NaN}))).toBe('View price');
  });
  it('does not advertise an unavailable cheaper option when another option can be selected', () => {
    const item=product({variants:[{label:'S',priceAdjustment:0,stock:0},{label:'M',priceAdjustment:500,stock:5}]});
    expect(homepageProductPrice(item)).toBe('KES 1,500');
    expect(homepageProductSoldOut(item)).toBe(false);
    expect(homepageProductPrice(product({variants:[{label:'S',priceAdjustment:0,stock:0},{label:'M',priceAdjustment:500,stock:null},{label:'L',priceAdjustment:700,stock:2}]}))).toBe('From KES 1,500');
  });
  it('retains list pricing for all-zero variants while explicitly marking the product sold out', () => {
    const item=product({stock:null,variants:[{label:'S',priceAdjustment:0,stock:0},{label:'M',priceAdjustment:500,stock:0}]});
    expect(homepageProductPrice(item)).toBe('From KES 1,000');
    expect(homepageProductSoldOut(item)).toBe(true);
    expect(homepageProductSoldOut(product({stock:0}))).toBe(true);
  });
  it('never treats unknown or invalid stock as confirmed sold out', () => {
    expect(homepageProductSoldOut(product({stock:null}))).toBe(false);
    expect(homepageProductSoldOut(product({stock:NaN}))).toBe(false);
    expect(homepageProductSoldOut(product({variants:[{label:'S',priceAdjustment:0,stock:0},{label:'M',priceAdjustment:500}]}))).toBe(false);
    expect(homepageProductSoldOut(product({variants:[{label:'S',priceAdjustment:0,stock:0},{label:'M',priceAdjustment:500,stock:NaN}]}))).toBe(false);
  });
  it('ignores invalid priced variants when determining stock and price', () => {
    const item=product({variants:[{label:'S',priceAdjustment:NaN,stock:0},{label:'M',priceAdjustment:Infinity,stock:0},{label:'L',priceAdjustment:-2000,stock:0}]});
    expect(homepageProductSoldOut(item)).toBe(false);
    expect(homepageProductPrice(item)).toBe('KES 1,000');
    expect(homepageProductSoldOut(product({variants:[{label:'S',priceAdjustment:0,stock:0},{label:'M',priceAdjustment:NaN,stock:5}]}))).toBe(true);
  });
});
