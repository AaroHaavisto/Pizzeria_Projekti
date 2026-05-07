# Pizzeria Pro

Linkki (Demo): https://users.metropolia.fi/~aarohaa/Demo/
Tuleva linkki: https://users.metropolia.fi/~aarohaa/Slice_Hunt/

## Project Idea and Target Audience
Pizzeria Pro is a restaurant web application for browsing menu items, placing pickup orders, and managing restaurant content.

Target audience:
- Restaurant customers who want to quickly view the menu and order for pickup
- Restaurant staff/admin users who manage menu content and orders
- Course evaluators reviewing UX, technical implementation, and requirement coverage

## What the Project Does
- Shows restaurant content on a responsive website
- Fetches menu/lunch data from a custom API (JSON-based)
- Highlights daily menu context and shows clear pricing
- Supports customer account flow and shopping cart usage
- Provides admin tools for content/order management
- Shows restaurant location with interactive map and routing links

## Why the Project Is Useful
- Gives customers one clear place for menu + pickup workflow
- Reduces manual handling by centralizing ordering and admin actions
- Demonstrates full-stack skills required by the course (React + Node/Express + SQL + REST)

## Main Functionalities
- Public pages: Home, Menu, Location, Account
- Customer flow: Register/Login, Cart, checkout-ready flow
- Admin flow: Admin login, menu content editing, order-related controls
- Location view: map + external routing link
- Responsive layout for desktop and mobile
- Basic UI animations and improved visual polish

## Getting Started
### Prerequisites
- Node.js 18+ (recommended)
- npm 9+

### Installation
```bash
npm install
```

### Run Development
```bash
npm run dev
```

### Build Production
```bash
npm run build
```

### Run Backend (if separate in your setup)
Use your project’s server start command in another terminal from the same workspace. If needed, check scripts in `package.json` and `server/`.

## Testing Guide (How to Verify All Core Functionalities)
Use this checklist when testing the application:

1. Home page loads and navigation works.
2. Menu page fetches menu data from API and renders prices/diet info.
3. Customer can register/login from Account page.
4. Add/remove items in cart works; quantity and totals update correctly.
5. Admin login works and admin can access menu/order management features.
6. Location page shows map marker at restaurant location.
7. External routing link opens correctly.
8. Responsive behavior works on mobile widths.
9. Build succeeds with no errors:
```bash
npm run build
```

## Help and Support
If you need help with this project:
- Check project code in `src/` and `server/` first
- Review API/data files under `src/api/`, `server/`, and `server/data/`
- Contact the project team members directly

## Maintenance and Contributors
Maintained by the Pizzeria Pro project team.

Contributors:
- Course project group members (max 3 people)
- Repository collaborators assigned by the team

## Presentation (PowerPoint) Checklist
Suggested slides for seminar presentation:
1. Problem and target audience
2. Solution overview (customer + admin flows)
3. Architecture (React frontend, Node/Express backend, SQL, REST API)
4. Key features demo (menu, cart, account, admin, location map)
5. Testing evidence (manual flow + automated tests status)
6. Biggest challenges and fixes
7. Next steps and remaining requirements
