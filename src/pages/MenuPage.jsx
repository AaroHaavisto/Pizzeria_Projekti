import {useEffect, useState} from 'react';
import Navigation from '../components/Navigation';
import PizzaCard from '../components/PizzaCard';
import {getWeeklyMenuCards} from '../api/menuApi';
import '../css/menu_style.css';

function MenuPage() {
  const fallbackPizzas = [
    {
      name: 'Margherita',
      description: 'Tomaatti, mozzarella, basilika.',
      tag: 'Mieto',
      price: '9,90 €',
      image: '/src/assets/images/pizza-margherita.jpg',
    },
    {
      name: 'Pepperoni',
      description: 'Pepperoni, mozzarella, oregano.',
      tag: 'Tulinen',
      price: '11,50 €',
      image: '/src/assets/images/pizza-pepperoni.jpg',
    },
    {
      name: 'Quattro Formaggi',
      description: 'Mozzarella, gorgonzola, parmesan, emmental.',
      tag: 'Juustoinen',
      price: '12,90 €',
      image: '/src/assets/images/pizza-quattro-formaggi.jpg',
    },
    {
      name: 'Chicken BBQ',
      description: 'Kana, BBQ-kastike, punasipuli.',
      tag: 'Suosikki',
      price: '12,50 €',
      image: '/src/assets/images/pizza-chicken-bbq.jpg',
    },
    {
      name: 'Vegetariana',
      description: 'Paprika, oliivi, herkkusieni, sipuli.',
      tag: 'Kasvis',
      price: '11,90 €',
      image: '/src/assets/images/pizza-vegetariana.jpg',
    },
    {
      name: 'Diavola',
      description: 'Salami piccante, chili, mozzarella.',
      tag: 'Vahva',
      price: '13,20 €',
      image: '/src/assets/images/pizza-diavola.jpg',
    },
    {
      name: 'Hawaii',
      description: 'Kinkku, ananas, mozzarella.',
      tag: 'Makea',
      price: '11,40 €',
      image: '/src/assets/images/pizza-hawaii.jpg',
    },
    {
      name: 'Prosciutto',
      description: 'Prosciutto, rucola, parmesan.',
      tag: 'Kevyt',
      price: '13,40 €',
      image: '/src/assets/images/pizza-prosciutto.jpg',
    },
    {
      name: 'Tonno',
      description: 'Tonnikala, kapris, punasipuli.',
      tag: 'Merellinen',
      price: '12,80 €',
      image: '/src/assets/images/pizza-tonno.jpg',
    },
    {
      name: 'Capricciosa',
      description: 'Kinkku, herkkusieni, artisokka.',
      tag: 'Klassikko',
      price: '12,60 €',
      image: '/src/assets/images/pizza-capricciosa.jpg',
    },
  ];
  const [pizzas, setPizzas] = useState(fallbackPizzas);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadMenu() {
      try {
        const cards = await getWeeklyMenuCards();
        if (!mounted) {
          return;
        }

        if (cards.length > 0) {
          setPizzas(cards);
        }
      } catch (_error) {
        if (mounted) {
          setLoadError(
            'Menua ei saatu API:sta, naytetaan paikallinen varalista.'
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="menu-page">
      <header className="hero">
        <Navigation isMenuPage={true} />

        <section className="hero__content">
          <p className="eyebrow">Koko valikoima</p>
          <h1 id="menu">Löydä suosikkipizza jokaiseen nälkätasoon.</h1>
          <p className="hero__text menu-hero-text">
            Kaikki pizzat valmistetaan paikan päällä tuoreista raaka-aineista.
            Valitse klassikko, tulinen vaihtoehto tai talon erikoisuus.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#tarjoukset">
              Katso tarjoukset
            </a>
            <a className="button button--secondary" href="#sijainti">
              Tilaustiedot
            </a>
          </div>
        </section>
      </header>

      <main className="pizza-showcase" aria-label="Pizzeria Pro menu listaus">
        {isLoading ? <p>Ladataan menua...</p> : null}
        {loadError ? <p>{loadError}</p> : null}
        <div className="pizza-grid">
          {pizzas.map(pizza => (
            <PizzaCard key={pizza.id || pizza.name} pizza={pizza} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default MenuPage;
