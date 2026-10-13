import { lazy } from 'react';
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { FlowLayout, TabLayout } from '@/components/layout/AppShell';
import Home from '@/screens/Home';

// Home ships in the main bundle for a fast first paint; everything else is split.
const Menu = lazy(() => import('@/screens/Menu'));
const Offers = lazy(() => import('@/screens/Offers'));
const Orders = lazy(() => import('@/screens/Orders'));
const OrderDetail = lazy(() => import('@/screens/OrderDetail'));
const Account = lazy(() => import('@/screens/account/Account'));
const Profile = lazy(() => import('@/screens/account/Profile'));
const Addresses = lazy(() => import('@/screens/account/Addresses'));
const Favorites = lazy(() => import('@/screens/account/Favorites'));
const Notifications = lazy(() => import('@/screens/account/Notifications'));
const Help = lazy(() => import('@/screens/account/Help'));
const Branches = lazy(() => import('@/screens/Branches'));
const ProductDetail = lazy(() => import('@/screens/ProductDetail'));
const Cart = lazy(() => import('@/screens/Cart'));
const Checkout = lazy(() => import('@/screens/Checkout'));

/**
 * Hash routing keeps deep links working inside a Capacitor WebView and on static hosting
 * without server rewrites.
 */
const router = createHashRouter([
  {
    element: <TabLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/menu', element: <Menu /> },
      { path: '/ofertas', element: <Offers /> },
      { path: '/pedidos', element: <Orders /> },
      { path: '/pedidos/:id', element: <OrderDetail /> },
      { path: '/cuenta', element: <Account /> },
      { path: '/cuenta/datos', element: <Profile /> },
      { path: '/cuenta/direcciones', element: <Addresses /> },
      { path: '/cuenta/favoritos', element: <Favorites /> },
      { path: '/cuenta/notificaciones', element: <Notifications /> },
      { path: '/cuenta/ayuda', element: <Help /> },
      { path: '/sucursales', element: <Branches /> },
    ],
  },
  {
    element: <FlowLayout />,
    children: [
      { path: '/producto/:id', element: <ProductDetail /> },
      { path: '/carrito', element: <Cart /> },
      { path: '/checkout', element: <Checkout /> },
      { path: '/confirmacion/:id', element: <OrderDetail confirmation /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
