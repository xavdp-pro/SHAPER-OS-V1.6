import { Outlet } from 'react-router-dom';

/** Shell plein écran — la sidebar vit dans Dashboard. */
export default function Layout() {
  return (
    <div className="h-dvh max-h-dvh w-full max-w-full mesh-bg overflow-hidden">
      <Outlet />
    </div>
  );
}
