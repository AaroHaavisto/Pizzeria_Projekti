import {useEffect} from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import MainPage from './pages/MainPage';
import MenuPage from './pages/MenuPage';
import AccountPage from './pages/AccountPage';
import LocationPage from './pages/LocationPage';
import {CustomerSessionProvider} from './contexts/CustomerSessionContext';
import {MenuDataProvider} from './contexts/MenuDataContext';
import {CartProvider} from './contexts/CartContext';
import CartPage from './pages/CartPage';
import AdminPage from './pages/AdminPage';

function RouteUiEffects() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }

    const targetId = location.hash.slice(1);
    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    target.scrollIntoView({behavior: 'smooth', block: 'start'});
    target.classList.add('section--focus');

    const timeoutId = window.setTimeout(() => {
      target.classList.remove('section--focus');
    }, 1400);

    return () => {
      window.clearTimeout(timeoutId);
      target.classList.remove('section--focus');
    };
  }, [location.pathname, location.hash]);

  return null;
}

function App() {
  return (
    <CustomerSessionProvider>
      <MenuDataProvider>
        <CartProvider>
          <Router>
            <RouteUiEffects />
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/location" element={<LocationPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Routes>
          </Router>
        </CartProvider>
      </MenuDataProvider>
    </CustomerSessionProvider>
  );
}

export default App;
