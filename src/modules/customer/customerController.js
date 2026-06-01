import { Menu } from '../menus/Menu.js';
import { Promotion } from '../promotions/Promotion.js';

const categoryMeta = {
  chicken: {
    title: 'CHICKEN',
    desc: 'Crispy chicken favorites, from solo bites to shareable buckets.',
    img: '/images/cat-bucket.png',
    badge: 'top-sale',
  },
  burger: {
    title: 'BURGERS',
    desc: 'Bold sandwiches with serious crunch and sauce.',
    img: '/images/cat-sandwich.png',
    badge: 'new',
  },
  combo: {
    title: 'COMBOS',
    desc: 'Full sets built for hungry crews and quick decisions.',
    img: '/images/cat-promo.png',
    badge: 'promo',
  },
  side: {
    title: 'SIDES',
    desc: 'Fries, snacks, and savory sidekicks for every order.',
    img: '/images/cat-side.png',
  },
  dessert: {
    title: 'DESSERTS',
    desc: 'Sweet finishes after the crunch.',
    img: '/images/cat-promo.png',
  },
  drink: {
    title: 'DRINKS',
    desc: 'Cold drinks to cool down the heat.',
    img: '/images/cat-side.png',
  },
};

const menuImageByName = {
  'signature 8pc bucket': '/images/menu-sig8pcbuc.png',
  'party pack 20pc': '/images/menu-partypack.png',
  'zabb team box': '/images/menu-zabbteambox.png',
  'smile bucket': '/images/menu-smilebucket2.png',
  'chick n share': '/images/menu-chicknshare.png',
  "chick n' share": '/images/menu-chicknshare.png',
  'spicy chicken sandwich': '/images/menu-spicychicksand.png',
  'classic sandwich': '/images/menu-classsandwich.png',
  'zinger double': '/images/menu-zinger.png',
  chickskate: '/images/menu-chickskate.png',
  'golden fries l': '/images/menu-goldenfries.png',
  'golden fries (l)': '/images/menu-goldenfries.png',
  coleslaw: '/images/menu-coleslaw.png',
  'mac and cheese': '/images/menu-maccheese.png',
  'mac & cheese': '/images/menu-maccheese.png',
  tteokbokki: '/images/menu-tteokbokki.png',
  'seafood pajeon': '/images/menu-pajeon.png',
  japchae: '/images/menu-japchae.png',
  'hot oden': '/images/menu-oden.png',
  'chocolate cupcake': '/images/menu-choccup.png',
  'soft serve': '/images/menu-soft.png',
  'coca-cola': '/images/menu-cola.png',
  'chocolate float': '/images/menu-chocfloat.png',
  'soju original': '/images/menu-soju.png',
  makgeolli: '/images/menu-makgeolli.png',
  'party bucket set': '/images/pro-combo-1.png',
  'spicy sandwich set': '/images/pro-combo-2.png',
  'chickskate set': '/images/pro-chickskate.png',
};

const getMenuImage = (item) => {
  if (item.image) return item.image;
  return menuImageByName[item.name?.trim().toLowerCase()] || '/images/menu-sig8pcbuc.png';
};

const withStockStatus = (menu) => {
  const item = menu.toObject ? menu.toObject() : menu;
  const linkedIngredients = Array.isArray(item.ingredients) ? item.ingredients : [];
  const missingIngredients = linkedIngredients
    .filter((entry) => {
      const ingredient = entry.ingredient;
      return (
        !ingredient ||
        ingredient.active_status === false ||
        Number(ingredient.quantity || 0) < Number(entry.quantity || 0)
      );
    })
    .map((entry) => ({
      name: entry.ingredient?.name || 'Unknown ingredient',
      required: Number(entry.quantity || 0),
      available: Number(entry.ingredient?.quantity || 0),
      unit: entry.ingredient?.unit || '',
    }));

  return {
    ...item,
    image: getMenuImage(item),
    soldOut: item.available === false || missingIngredients.length > 0,
    soldOutReason:
      item.available === false
        ? 'Menu unavailable'
        : missingIngredients.length > 0
          ? 'Ingredient stock is not enough'
          : '',
    missingIngredients,
  };
};

const toCustomerCategory = (category, count = 0) => ({
  id: category,
  title: categoryMeta[category]?.title || category.toUpperCase(),
  desc: categoryMeta[category]?.desc || `${count} menu item${count === 1 ? '' : 's'} available.`,
  img: categoryMeta[category]?.img || '/images/cat-promo.png',
  link: category === 'all' ? '/menu' : `/menu?tab=${category}`,
  badge: categoryMeta[category]?.badge,
  count,
});

export const getCustomerIndex = async (req, res) => {
  try {
    const now = new Date();
    const [menus, promotions] = await Promise.all([
      Menu.find({ available: true })
        .populate('ingredients.ingredient')
        .sort({ category: 1, name: 1 }),
      Promotion.find({
        active_status: true,
        date_from: { $lte: now },
        date_to: { $gte: now },
      }).sort({ date_to: 1 }),
    ]);

    const categoryCounts = menus.reduce((counts, menu) => {
      counts[menu.category] = (counts[menu.category] || 0) + 1;
      return counts;
    }, {});

    const categories = Object.entries(categoryCounts).map(([category, count]) =>
      toCustomerCategory(category, count),
    );

    res.json({
      categories,
      featuredMenus: menus.slice(0, 8).map(withStockStatus),
      promotions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCustomerMenus = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { available: true };

    if (category && category !== 'all') {
      filter.category = category;
    }

    const menus = await Menu.find(filter)
      .populate('ingredients.ingredient')
      .sort({ category: 1, name: 1 });

    res.json(menus.map(withStockStatus));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
