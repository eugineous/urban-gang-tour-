import {defineCatalogue} from '@/lib/i18n/messages';

const rows=[
 ['details','Your details','Maelezo yako','Vos coordonnées','您的信息','Ваши данные','Tus datos'],
 ['delivery','Pickup or delivery','Kuchukua au kuletewa','Retrait ou livraison','自取或配送','Самовывоз или доставка','Recogida o entrega'],
 ['tickets','Choose your tickets','Chagua tiketi zako','Choisissez vos billets','选择门票','Выберите билеты','Elige tus entradas'],
 ['payment','Choose how to pay','Chagua njia ya kulipa','Choisissez comment payer','选择付款方式','Выберите способ оплаты','Elige cómo pagar'],
 ['details.note','A few details for this order.','Maelezo machache ya oda hii.','Quelques coordonnées pour cette commande.','填写此订单所需的少量信息。','Несколько данных для этого заказа.','Unos datos para este pedido.'],
 ['email.note','You can also download your receipt after payment is confirmed.','Unaweza pia kupakua risiti yako baada ya malipo kuthibitishwa.','Vous pouvez aussi télécharger votre reçu après confirmation du paiement.','付款确认后，您也可以下载收据。','После подтверждения оплаты квитанцию также можно скачать.','También puedes descargar tu recibo tras confirmarse el pago.'],
 ['delivery.note','Collect your order or use the available delivery option.','Chukua oda yako au tumia chaguo la uwasilishaji linalopatikana.','Retirez votre commande ou choisissez la livraison disponible.','到店自取，或选择可用的配送方式。','Заберите заказ или выберите доступную доставку.','Recoge tu pedido o usa la opción de entrega disponible.'],
 ['tickets.note','Choose an available tier and quantity.','Chagua aina na idadi inayopatikana.','Choisissez une catégorie disponible et la quantité.','选择可用票种和数量。','Выберите доступную категорию и количество.','Elige una categoría disponible y la cantidad.'],
 ['payment.note','Review the total, choose a method and confirm.','Kagua jumla, chagua njia na uthibitishe.','Vérifiez le total, choisissez un moyen et confirmez.','核对总额，选择方式并确认。','Проверьте итог, выберите способ и подтвердите.','Revisa el total, elige un método y confirma.'],
 ['step','Step {current} of {total}','Hatua {current} kati ya {total}','Étape {current} sur {total}','第 {current} 步，共 {total} 步','Шаг {current} из {total}','Paso {current} de {total}'],
 ['progress','Checkout progress','Maendeleo ya malipo','Progression du paiement','结账进度','Этапы оформления','Progreso del pago'],
 ['continue','Continue','Endelea','Continuer','继续','Продолжить','Continuar'],
 ['contact.optional','(optional)','(si lazima)','(facultatif)','（选填）','(необязательно)','(opcional)'],
 ['contact.note','Name and phone are needed for delivery; optional for card collection.','Jina na simu vinahitajika kwa uwasilishaji; si lazima kwa kuchukua oda kwa kadi.','Le nom et le téléphone sont nécessaires pour la livraison ; facultatifs pour un retrait payé par carte.','配送需要姓名和电话号码；刷卡自取时选填。','Имя и телефон нужны для доставки; при самовывозе с оплатой картой они необязательны.','El nombre y teléfono son necesarios para entrega; opcionales para recogida con tarjeta.'],
 ['returnPayment','Return to payment','Rudi kwenye malipo','Revenir au paiement','返回付款','Вернуться к оплате','Volver al pago'],
 ['selectMethod','Choose a payment method','Chagua njia ya malipo','Choisissez un moyen de paiement','选择付款方式','Выберите способ оплаты','Elige un método de pago'],
 ['more','+{count} more items','+bidhaa {count} zaidi','+{count} autres articles','另有 {count} 件商品','Ещё товаров: {count}','+{count} artículos más'],
 ['back','Back','Rudi','Retour','返回','Назад','Volver'],
 ['summary','Order summary','Muhtasari wa oda','Récapitulatif','订单摘要','Сводка заказа','Resumen del pedido'],
 ['summary.show','View order details','Tazama maelezo ya oda','Voir les détails','查看订单详情','Показать детали','Ver detalles del pedido'],
 ['summary.hide','Hide order details','Ficha maelezo ya oda','Masquer les détails','收起订单详情','Скрыть детали','Ocultar detalles del pedido'],
 ['card.note','Continue to secure card checkout.','Endelea kwa malipo salama ya kadi.','Passez au paiement sécurisé par carte.','继续安全银行卡付款。','Перейдите к безопасной оплате картой.','Continúa al pago seguro con tarjeta.'],
 ['mpesa.note','Approve the prompt on your phone.','Thibitisha ombi kwenye simu yako.','Validez la demande sur votre téléphone.','在手机上确认付款提示。','Подтвердите запрос на телефоне.','Aprueba la solicitud en tu teléfono.'],
 ['promo','Have a promo code?','Una msimbo wa punguzo?','Un code promotionnel ?','有优惠码？','Есть промокод?','¿Tienes un código promocional?'],
 ['waiting','Starting your payment','Tunaanzisha malipo yako','Lancement de votre paiement','正在发起付款','Запускаем оплату','Iniciando tu pago'],
 ['waiting.note','Keep this page open while we connect you.','Weka ukurasa huu wazi tunapokuunganisha.','Gardez cette page ouverte pendant la connexion.','正在连接，请保持此页面打开。','Оставьте страницу открытой, пока устанавливается соединение.','Mantén esta página abierta mientras te conectamos.'],
] as const;
type Key=typeof rows[number][0];
const column=(index:1|2|3|4|5|6)=>Object.fromEntries(rows.map(row=>[row[0],row[index]])) as Record<Key,string>;
export const checkoutJourneyMessages=defineCatalogue({en:column(1),sw:column(2),fr:column(3),'zh-Hans':column(4),ru:column(5),es:column(6)});
