import {Link} from 'react-router-dom';

function Navigation({isMenuPage = false}) {
  return (
    <nav className="topbar" aria-label="Päävalikko">
      <Link className="brand" to="/">
        Pizzeria Pro
      </Link>
      <div className="topbar__links">
        <Link to="/">Etusivu</Link>
        <Link to="/menu">Menu</Link>
        <a href="/#tarjoukset">Tarjoukset</a>
        <a href="/#sijainti">Sijainti</a>
      </div>
    </nav>
  );
}

export default Navigation;
