import {defineCatalogue} from '@/lib/i18n/messages';
const rows=[
 ['title','My tickets','Tiketi zangu','Mes billets','我的门票','Мои билеты','Mis entradas'],
 ['intro','Open your tickets. No account needed.','Fungua tiketi zako. Huhitaji akaunti.','Ouvrez vos billets. Aucun compte requis.','打开门票，无需账户。','Откройте билеты без аккаунта.','Abre tus entradas. No necesitas cuenta.'],
 ['guest','Already have a ticket?','Tayari una tiketi?','Vous avez déjà un billet ?','已经有门票？','Уже есть билет?','¿Ya tienes una entrada?'],
 ['label','Ticket link or order reference','Kiungo cha tiketi au nambari ya oda','Lien du billet ou référence de commande','门票链接或订单编号','Ссылка на билет или номер заказа','Enlace de entrada o referencia del pedido'],
 ['hint','Use the link or full ORD reference from your confirmation.','Tumia kiungo au nambari kamili ya ORD kutoka kwa uthibitisho wako.','Utilisez le lien ou la référence ORD complète de votre confirmation.','使用确认信息中的链接或完整 ORD 编号。','Используйте ссылку или полный номер ORD из подтверждения.','Usa el enlace o la referencia ORD completa de tu confirmación.'],
 ['open','Open tickets','Fungua tiketi','Ouvrir les billets','打开门票','Открыть билеты','Abrir entradas'],
 ['invalid','Check the ticket link or full order reference. For older orders, sign in or contact us.','Kagua kiungo au nambari kamili ya oda. Kwa oda za zamani, ingia au wasiliana nasi.','Vérifiez le lien ou la référence complète. Pour une ancienne commande, connectez-vous ou contactez-nous.','请检查门票链接或完整订单编号。旧订单请登录或联系我们。','Проверьте ссылку или полный номер заказа. Для старых заказов войдите или свяжитесь с нами.','Comprueba el enlace o la referencia completa. Para pedidos antiguos, inicia sesión o contáctanos.'],
 ['account','Your Urban Gang account','Akaunti yako ya Urban Gang','Votre compte Urban Gang','您的 Urban Gang 账户','Ваш аккаунт Urban Gang','Tu cuenta Urban Gang'],
 ['accountNote','Your account keeps purchases made while signed in. Guest orders stay with their confirmation links.','Akaunti huhifadhi ununuzi uliofanya ukiwa umeingia. Oda za wageni hubaki kwenye viungo vya uthibitisho.','Votre compte conserve les achats effectués en étant connecté. Les commandes invité restent accessibles par leurs liens de confirmation.','账户保存登录后购买的订单。访客订单仍通过确认链接访问。','В аккаунте сохраняются покупки, сделанные после входа. Гостевые заказы доступны по ссылкам подтверждения.','Tu cuenta guarda las compras hechas con sesión iniciada. Los pedidos de invitado siguen en sus enlaces de confirmación.'],
 ['signIn','Sign in','Ingia','Se connecter','登录','Войти','Iniciar sesión'],
 ['create','Create account','Fungua akaunti','Créer un compte','创建账户','Создать аккаунт','Crear cuenta'],
 ['help','Can’t find your tickets?','Hupati tiketi zako?','Vous ne trouvez pas vos billets ?','找不到门票？','Не можете найти билеты?','¿No encuentras tus entradas?'],
 ['helpNote','Check your confirmation email or contact us with your order reference. Never share your PIN or password.','Kagua barua pepe ya uthibitisho au wasiliana nasi ukitaja nambari ya oda. Usishiriki PIN au nenosiri lako.','Vérifiez votre e-mail de confirmation ou contactez-nous avec la référence de commande. Ne communiquez jamais votre code PIN ou mot de passe.','请检查确认邮件，或提供订单编号联系我们。切勿分享 PIN 或密码。','Проверьте письмо с подтверждением или свяжитесь с нами, указав номер заказа. Никому не сообщайте PIN или пароль.','Revisa tu correo de confirmación o contáctanos con la referencia del pedido. Nunca compartas tu PIN ni contraseña.'],
 ['contact','Contact us','Wasiliana nasi','Nous contacter','联系我们','Связаться с нами','Contáctanos'],
 ['privacy','Ticket links are private. Share them only with people you trust.','Viungo vya tiketi ni vya faragha. Vishiriki tu na watu unaowaamini.','Les liens des billets sont privés. Partagez-les uniquement avec des personnes de confiance.','门票链接属于私人信息，仅与信任的人分享。','Ссылки на билеты приватны. Делитесь ими только с теми, кому доверяете.','Los enlaces de entradas son privados. Compártelos solo con personas de confianza.'],
 ['accountHeading','Your account','Akaunti yako','Votre compte','您的账户','Ваш аккаунт','Tu cuenta'],
 ['accountIntro','Your purchases, in one place.','Ununuzi wako, mahali pamoja.','Vos achats, au même endroit.','所有购买记录，尽在此处。','Ваши покупки в одном месте.','Tus compras, en un solo lugar.'],
] as const;
type Key=typeof rows[number][0];
const column=(index:1|2|3|4|5|6)=>Object.fromEntries(rows.map(row=>[row[0],row[index]])) as Record<Key,string>;
export const ticketAccessMessages=defineCatalogue({en:column(1),sw:column(2),fr:column(3),'zh-Hans':column(4),ru:column(5),es:column(6)});
