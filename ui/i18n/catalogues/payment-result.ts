import {defineCatalogue} from '@/lib/i18n/messages';

// Columns: key, English, Swahili, French, Simplified Chinese, Russian, Spanish.
const rows = [
 ['eyebrow.success',"You're all set",'Kila kitu kiko tayari','Tout est prêt','一切就绪','Всё готово','Todo listo'],
 ['eyebrow.pending','One more step','Hatua moja zaidi','Encore une étape','还差一步','Ещё один шаг','Un paso más'],
 ['eyebrow.failed',"Let's get this sorted",'Tutatue hili','Réglons cela','我们来解决','Давайте разберёмся','Vamos a resolverlo'],
 ['eyebrow.refund','Order update','Taarifa ya oda','Mise à jour de la commande','订单更新','Новости о заказе','Actualización del pedido'],
 ['thanks','Thank you for backing the culture.','Asante kwa kuunga mkono utamaduni.','Merci de soutenir la culture.','感谢您支持文化。','Спасибо за поддержку культуры.','Gracias por apoyar la cultura.'],
 ['amount','Order total','Jumla ya oda','Total de la commande','订单总额','Сумма заказа','Total del pedido'],
 ['method','Payment method','Njia ya malipo','Moyen de paiement','支付方式','Способ оплаты','Método de pago'],
 ['method.card','Card','Kadi','Carte','银行卡','Карта','Tarjeta'],
 ['method.paystack','Paystack','Paystack','Paystack','Paystack','Paystack','Paystack'],
 ['method.mpesa','M-Pesa','M-Pesa','M-Pesa','M-Pesa','M-Pesa','M-Pesa'],
 ['method.comp','Complimentary','Bila malipo','Offert','免费','Бесплатно','Gratuito'],
 ['details','Order details & updates','Maelezo na taarifa za oda','Détails et mises à jour de la commande','订单详情与更新','Детали и обновления заказа','Detalles y novedades del pedido'],
 ['reference.copy','Copy order reference','Nakili rejeleo la oda','Copier la référence de commande','复制订单编号','Копировать номер заказа','Copiar referencia del pedido'],
 ['reference.copied','Reference copied','Rejeleo limenakiliwa','Référence copiée','订单编号已复制','Номер заказа скопирован','Referencia copiada'],
 ['reference.copyFailed','Select the reference to copy it.','Chagua rejeleo ili ulinakili.','Sélectionnez la référence pour la copier.','请选择订单编号以复制。','Выделите номер заказа, чтобы скопировать его.','Selecciona la referencia para copiarla.'],
 ['order.view','View order','Tazama oda','Voir la commande','查看订单','Посмотреть заказ','Ver pedido'],
 ['back','Back to shop','Rudi dukani','Retour à la boutique','返回商店','В магазин','Volver a la tienda'],
 ['help','Keep your order reference when contacting support.','Hifadhi rejeleo la oda yako unapowasiliana na huduma kwa wateja.','Gardez la référence de votre commande pour contacter l’assistance.','请保留订单编号，以便联系客服时使用。','Сохраните номер заказа для обращения в поддержку.','Conserva la referencia del pedido para contactar con soporte.'],
 ['continue','Continue shopping','Endelea kununua','Continuer les achats','继续购物','Продолжить покупки','Seguir comprando'],
] as const;

export type PaymentResultMessageKey = typeof rows[number][0];
const column = (index:1|2|3|4|5|6):Record<PaymentResultMessageKey,string> => Object.fromEntries(rows.map(row=>[row[0],row[index]])) as Record<PaymentResultMessageKey,string>;

export const paymentResultMessages = defineCatalogue({
 en:column(1),sw:column(2),fr:column(3),'zh-Hans':column(4),ru:column(5),es:column(6),
});
