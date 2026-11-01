import {defineCatalogue} from '@/lib/i18n/messages';

// Owned interface copy only; authored event, product and story records stay original.
// Columns: key, English, Swahili, French, Simplified Chinese, Russian, Spanish.
const rows = [
 ['explore.eyebrow','The Urban Gang world','Ulimwengu wa Urban Gang','L’univers Urban Gang','Urban Gang 的世界','Мир Urban Gang','El mundo de Urban Gang'],
 ['explore.title','Find your next move.','Gundua hatua yako inayofuata.','Trouvez votre prochaine sortie.','发现下一站精彩。','Найдите новые впечатления.','Encuentra tu próximo plan.'],
 ['explore.summary','Events, people, stories and the official collection. All in one place.','Matukio, watu, simulizi na mkusanyiko rasmi wa bidhaa. Vyote mahali pamoja.','Événements, rencontres, récits et collection officielle. Tout au même endroit.','活动、人物、故事与官方系列，尽在一处。','События, люди, истории и официальная коллекция. Всё в одном месте.','Eventos, personas, historias y la colección oficial. Todo en un solo lugar.'],
 ['module.action','Explore','Chunguza','Découvrir','探索','Подробнее','Explorar'],
 ['modules.events.title','Live events','Matukio ya moja kwa moja','Événements en direct','现场活动','Живые события','Eventos en vivo'],
 ['modules.events.summary','Dates, venues and ticket details.','Tarehe, kumbi na maelezo ya tiketi.','Dates, lieux et informations sur les billets.','日期、场地与门票详情。','Даты, площадки и информация о билетах.','Fechas, lugares y detalles de las entradas.'],
 ['modules.gallery.title','Inside the tour','Ndani ya ziara','Au cœur de la tournée','走进巡演','Тур изнутри','Dentro de la gira'],
 ['modules.gallery.summary','Photos and films from the road.','Picha na filamu za safari za ziara.','Photos et films de la tournée.','巡演途中的照片与影片。','Фотографии и фильмы из поездок.','Fotos y películas de la gira.'],
 ['modules.clients.title','Clients & collaborators','Wateja na washirika','Clients et collaborateurs','客户与合作伙伴','Клиенты и партнёры','Clientes y colaboradores'],
 ['modules.clients.summary','Meet the organisations we have worked with.','Fahamu mashirika ambayo tumefanya kazi nayo.','Découvrez les organisations avec lesquelles nous avons travaillé.','认识与我们合作过的机构。','Познакомьтесь с организациями, с которыми мы работали.','Conoce las organizaciones con las que hemos trabajado.'],
 ['modules.book.title','Book the team','Weka nafasi ya timu','Réservez l’équipe','预约团队','Пригласите команду','Reserva al equipo'],
 ['modules.book.summary','School events, campus shows and brand experiences.','Matukio ya shule, maonyesho ya vyuo na matukio ya chapa.','Événements scolaires, spectacles universitaires et expériences de marque.','学校活动、大学演出与品牌体验。','Школьные мероприятия, концерты в вузах и события для брендов.','Eventos escolares, espectáculos universitarios y experiencias de marca.'],
 ['modules.vendors.title','Vendors & partners','Wauzaji na washirika','Exposants et partenaires','商家与合作伙伴','Продавцы и партнёры','Vendedores y socios'],
 ['modules.vendors.summary','Apply to trade or discuss a partnership.','Omba nafasi ya kuuza au jadili ushirikiano.','Déposez une candidature pour vendre ou discutons d’un partenariat.','申请设摊销售或洽谈合作。','Подайте заявку на торговлю или обсудите партнёрство.','Solicita un puesto de venta o hablemos de una colaboración.'],
 ['modules.about.title','Meet Urban Gang Tour','Fahamu Urban Gang Tour','Découvrez Urban Gang Tour','认识 Urban Gang Tour','Знакомьтесь: Urban Gang Tour','Conoce Urban Gang Tour'],
 ['modules.about.summary','The people and story behind the tour.','Watu na historia ya ziara.','Les personnes et l’histoire derrière la tournée.','巡演背后的人物与故事。','Люди и история тура.','Las personas y la historia detrás de la gira.'],
 ['shop.eyebrow','The official collection','Mkusanyiko rasmi wa bidhaa','La collection officielle','官方系列','Официальная коллекция','La colección oficial'],
 ['shop.title','Shop the collection.','Nunua kutoka kwenye mkusanyiko.','Découvrez la collection.','选购系列商品。','Покупайте из коллекции.','Compra la colección.'],
 ['shop.summary','Made to order. Pick your style and choose your options.','Hutengenezwa kwa agizo. Chagua mtindo wako na machaguo unayopenda.','Fabriqué sur commande. Choisissez votre style et vos options.','按单制作。挑选喜爱的款式和选项。','Изготовление на заказ. Выберите стиль и нужные параметры.','Fabricado bajo pedido. Elige tu estilo y tus opciones.'],
 ['shop.viewCart','View cart','Tazama kikapu','Voir le panier','查看购物车','Посмотреть корзину','Ver carrito'],
 ['stories.eyebrow','Latest from the tour','Habari mpya za ziara','Les dernières nouvelles de la tournée','巡演最新动态','Новости тура','Lo último de la gira'],
 ['stories.title','Stories worth your scroll.','Simulizi zinazostahili kusomwa.','Des récits qui méritent le détour.','值得一读的故事。','Истории, которые стоит прочитать.','Historias que merecen tu atención.'],
 ['stories.all','Read all stories','Soma simulizi zote','Lire tous les récits','阅读全部故事','Читать все истории','Leer todas las historias'],
 ['stories.read','Read story','Soma simulizi','Lire le récit','阅读故事','Читать историю','Leer historia'],
] as const;

type Key = typeof rows[number][0];
const column = (index:1|2|3|4|5|6):Record<Key,string> => Object.fromEntries(rows.map(row=>[row[0],row[index]])) as Record<Key,string>;

export const onePageMessages = defineCatalogue({
 en:column(1),sw:column(2),fr:column(3),'zh-Hans':column(4),ru:column(5),es:column(6),
});
