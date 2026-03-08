import { Outlet } from 'react-router';
import { BottomNav } from './components/BottomNav';
import { PhoneFrame } from './components/PhoneFrame';
import { useTheme } from './ThemeContext';

export function Root() {
  const { isDark } = useTheme();

  return (
    <PhoneFrame isDark={isDark}>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </PhoneFrame>
  );
}
