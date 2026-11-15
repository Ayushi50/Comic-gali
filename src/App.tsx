import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Title } from './pages/Title';
import { SignIn } from './pages/SignIn';
import { Listen } from './pages/Listen';
import { Static } from './pages/Static';
import { useEffect } from 'react';

const Reader = lazy(() => import('./pages/Reader'));
const Submit = lazy(() => import('./pages/Submit'));
const Moderation = lazy(() => import('./pages/Moderation'));
const Review = lazy(() => import('./pages/Review'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollTop />
      <Suspense fallback={<div className="empty">…</div>}>
        <Routes>
          <Route path="/read/:id" element={<Reader />} />
          <Route path="/signin" element={<SignIn />} />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="library" element={<Library />} />
            <Route path="title/:id" element={<Title />} />
            <Route path="listen/:id" element={<Listen />} />
            <Route path="submit" element={<Submit />} />
            <Route path="moderation" element={<Moderation />} />
            <Route path="review/:id" element={<Review />} />
            <Route path="takedown" element={<Static page="takedown" />} />
            <Route path="sources" element={<Static page="sources" />} />
            <Route path="*" element={<Static page="404" />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
