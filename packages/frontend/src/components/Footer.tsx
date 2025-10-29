import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
  
  return (
    <footer className="bg-gray-800 text-white py-6 sm:py-8">
      <div className="container-safe">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="col-span-2 sm:col-span-1">
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">KnowTon</h3>
            <p className="text-gray-400 text-xs sm:text-sm">
              {t('home.subtitle')}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.about')}</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">{t('nav.marketplace')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">{t('nav.mint')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">{t('nav.staking')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">{t('nav.governance')}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.docs')}</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">{t('footer.docs')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">API</a></li>
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">SDK</a></li>
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">{t('footer.support')}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.community')}</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">Discord</a></li>
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">Twitter</a></li>
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">GitHub</a></li>
              <li><a href="#" className="hover:text-white transition-colors btn-touch block py-1">{t('footer.community')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-700 text-center text-xs sm:text-sm text-gray-400">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
