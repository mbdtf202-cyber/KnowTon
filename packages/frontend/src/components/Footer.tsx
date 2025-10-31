import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
  
  return (
    <footer className="relative glass border-t border-white/10 py-6 sm:py-8 mt-20">
      {/* Gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
      
      <div className="container-safe">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="col-span-2 sm:col-span-1">
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gradient-cyber">KnowTon</h3>
            <p className="text-gray-400 text-xs sm:text-sm">
              {t('home.subtitle')}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-cyan-400">{t('footer.about')}</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#" className="hover:text-cyan-400 transition-colors btn-touch block py-1">{t('nav.marketplace')}</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors btn-touch block py-1">{t('nav.mint')}</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors btn-touch block py-1">{t('nav.staking')}</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors btn-touch block py-1">{t('nav.governance')}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-purple-400">{t('footer.docs')}</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#" className="hover:text-purple-400 transition-colors btn-touch block py-1">{t('footer.docs')}</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors btn-touch block py-1">API</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors btn-touch block py-1">SDK</a></li>
              <li><a href="#" className="hover:text-purple-400 transition-colors btn-touch block py-1">{t('footer.support')}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-pink-400">{t('footer.community')}</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#" className="hover:text-pink-400 transition-colors btn-touch block py-1">Discord</a></li>
              <li><a href="#" className="hover:text-pink-400 transition-colors btn-touch block py-1">Twitter</a></li>
              <li><a href="#" className="hover:text-pink-400 transition-colors btn-touch block py-1">GitHub</a></li>
              <li><a href="#" className="hover:text-pink-400 transition-colors btn-touch block py-1">{t('footer.community')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/10 text-center text-xs sm:text-sm text-gray-500">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
