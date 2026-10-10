import { useLanguage } from '@/context/LanguageContext';
import { Button } from './ui/button';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-2">
      <Button
        variant={language === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('en')}
      >
        EN
      </Button>
      <Button
        variant={language === 'es' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('es')}
      >
        ES
      </Button>
    </div>
  );
}
