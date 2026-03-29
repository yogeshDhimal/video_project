import { Toaster } from 'sonner';
import { useTheme } from '../context/ThemeContext';

export default function AppToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="top-center" closeButton duration={4500} theme={theme} />;
}
