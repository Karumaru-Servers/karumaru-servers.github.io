class GeoLanguageSwitcher {
    constructor() {
        this.supportedLanguages = {
            'ja': { name: '日本語', flag: '🇯🇵', regions: ['JP'] },
            'en': { name: 'English', flag: '🇺🇸', regions: ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA'] },
            'pt': { name: 'Português', flag: '🇧🇷', regions: ['BR', 'PT', 'AO', 'MZ'] },
            'ru': { name: 'Русский', flag: '🇷🇺', regions: ['RU', 'BY', 'KZ', 'KG', 'TJ', 'UZ'] },
            'fr': { name: 'Français', flag: '🇫🇷', regions: ['FR', 'BE', 'CH', 'CA', 'MA', 'DZ', 'TN'] },
            'zh': { name: '中文(簡体)', flag: '🇨🇳', regions: ['CN', 'SG'] },
            'zh-TW': { name: '中文(繁体)', flag: '🇹🇼', regions: ['TW', 'HK', 'MO'] },
            'hi': { name: 'हिन्दी', flag: '🇮🇳', regions: ['IN'] },
            'es': { name: 'Español', flag: '🇪🇸', regions: ['ES', 'MX', 'AR', 'CO', 'VE', 'PE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY'] },
            'ar': { name: 'العربية', flag: '🇸🇦', regions: ['SA', 'AE', 'EG', 'MA', 'DZ', 'TN', 'JO', 'LB', 'SY', 'IQ', 'KW', 'OM', 'QA', 'BH', 'YE'] },
            'zh-fake': { name: '偽中国語', flag: '🤪', regions: [] }
        };
        
        // 日本ベースのサイトなので日本語がデフォルト、その他は英語
        this.defaultLanguage = 'ja';
        this.fallbackLanguage = 'en'; // 対応地域外のデフォルト
        this.currentLanguage = null;
        this.userLocation = null;
        this.isInitialLoad = true;
        
        this.init();
    }

    async init() {
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('🌍 Karumaru-Servers Language System Initializing...');
            
            await this.detectUserLocation();
            this.currentLanguage = await this.determineLanguage();
            this.setupLanguageSelector();
            this.setupLanguageStorage();
            this.addLanguageChangeAnimation();
            this.addScrollAnimation();
            
            console.log(`🎯 Final language selection: ${this.currentLanguage}`);
            
            // 初回訪問時の自動言語選択
            if (this.isInitialLoad && this.shouldAutoSwitch()) {
                this.showLanguageRecommendation();
            }

            // デバッグ情報表示（開発時のみ）
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                this.showDebugInfo();
            }
        });
    }

    async detectUserLocation() {
        try {
            console.log('📍 Detecting user location...');
            
            // 複数のAPIを試す（信頼性向上）
            const geoApis = [
                {
                    url: 'https://ipapi.co/json/',
                    parser: (data) => ({
                        country: data.country_code,
                        ip: data.ip,
                        city: data.city,
                        region: data.region,
                        timezone: data.timezone
                    })
                },
                {
                    url: 'https://api.ipgeolocation.io/ipgeo?apiKey=free',
                    parser: (data) => ({
                        country: data.country_code2,
                        ip: data.ip,
                        city: data.city,
                        region: data.state_prov
                    })
                },
                {
                    url: 'https://ipinfo.io/json',
                    parser: (data) => ({
                        country: data.country,
                        ip: data.ip,
                        city: data.city,
                        region: data.region
                    })
                }
            ];

            // メインのGeo API群を試行
            for (const api of geoApis) {
                try {
                    const response = await fetch(api.url);
                    if (response.ok) {
                        const data = await response.json();
                        this.userLocation = api.parser(data);
                        console.log('✅ Location detected:', this.userLocation);
                        return;
                    }
                } catch (error) {
                    console.warn(`⚠️ API ${api.url} failed:`, error.message);
                }
            }

            // フォールバック: IP取得のみ
            const fallbackApis = [
                'https://api.ipify.org?format=json',
                'https://httpbin.org/ip',
                'https://icanhazip.com'
            ];

            for (const url of fallbackApis) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const data = await response.json();
                        this.userLocation = {
                            ip: data.ip || data.origin || (typeof data === 'string' ? data.trim() : 'unknown'),
                            country: null
                        };
                        console.log('⚠️ IP only detected:', this.userLocation);
                        break;
                    }
                } catch (error) {
                    console.warn(`⚠️ Fallback API failed:`, error.message);
                }
            }

        } catch (error) {
            console.error('❌ All geo detection failed:', error);
            this.userLocation = { country: null, ip: 'unknown' };
        }
    }

    async determineLanguage() {
        console.log('🤔 Determining optimal language...');

        // 1. URLパスから言語を検出（最優先）
        const pathLang = this.detectLanguageFromPath();
        if (pathLang) {
            console.log('🎯 Language from URL path:', pathLang);
            return pathLang;
        }

        // 2. localStorage から前回の選択を取得
        const storedLang = localStorage.getItem('karumaru-preferred-language');
        if (storedLang && this.supportedLanguages[storedLang]) {
            console.log('💾 Language from storage:', storedLang);
            return storedLang;
        }

        // 3. 地域から言語を推測
        if (this.userLocation && this.userLocation.country) {
            const geoLang = this.getLanguageByCountry(this.userLocation.country);
            if (geoLang) {
                console.log('🌍 Language from geography:', geoLang, `(${this.userLocation.country})`);
                return geoLang;
            } else {
                // 対応地域外は英語をデフォルト
                console.log('🌍 Unknown region, defaulting to English:', this.userLocation.country);
                return this.fallbackLanguage;
            }
        }

        // 4. ブラウザの言語設定から推測
        const browserLang = this.getBrowserLanguage();
        if (browserLang) {
            console.log('🌐 Language from browser:', browserLang);
            return browserLang;
        }

        // 5. 最終デフォルト（日本語）
        console.log('🏠 Using default language:', this.defaultLanguage);
        return this.defaultLanguage;
    }

    detectLanguageFromPath() {
        const path = window.location.pathname;
        for (const lang of Object.keys(this.supportedLanguages)) {
            if (path.includes(`/${lang}/`) || path.endsWith(`/${lang}`)) {
                return lang;
            }
        }
        return null;
    }

    getLanguageByCountry(countryCode) {
        for (const [lang, info] of Object.entries(this.supportedLanguages)) {
            if (info.regions.includes(countryCode.toUpperCase())) {
                return lang;
            }
        }
        return null; // 見つからない場合はnullを返す
    }

    getBrowserLanguage() {
        const browserLang = navigator.language.substring(0, 2);
        
        // より詳細な言語コードのチェック
        const fullBrowserLang = navigator.language.toLowerCase();
        
        if (fullBrowserLang.startsWith('zh-tw') || fullBrowserLang.startsWith('zh-hant')) {
            return 'zh-TW';
        }
        if (fullBrowserLang.startsWith('zh')) {
            return 'zh';
        }
        
        if (this.supportedLanguages[browserLang]) {
            return browserLang;
        }

        return null;
    }

    shouldAutoSwitch() {
        const pathLang = this.detectLanguageFromPath();
        const storedLang = localStorage.getItem('karumaru-preferred-language');
        const declinedBefore = localStorage.getItem('karumaru-language-recommendation-declined');
        
        // すでに言語が選択されている、または以前に拒否された場合は自動切り替えしない
        if (pathLang || storedLang || declinedBefore) {
            return false;
        }

        // 地域に基づく推奨言語がデフォルトと違う場合のみ
        if (this.userLocation && this.userLocation.country) {
            const geoLang = this.getLanguageByCountry(this.userLocation.country);
            
            // 地域対応言語があり、それが現在と異なる場合
            if (geoLang && geoLang !== this.defaultLanguage) {
                return true;
            }
            
            // 対応地域外で英語に切り替える場合
            if (!geoLang && this.fallbackLanguage !== this.defaultLanguage) {
                return true;
            }
        }

        return false;
    }

    showLanguageRecommendation() {
        if (!this.userLocation || !this.userLocation.country) return;

        const recommendedLang = this.getLanguageByCountry(this.userLocation.country) || this.fallbackLanguage;
        if (recommendedLang === this.currentLanguage) return;

        const langInfo = this.supportedLanguages[recommendedLang];
        const isUnknownRegion = !this.getLanguageByCountry(this.userLocation.country);
        
        // おすすめ言語通知を表示
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(18, 18, 18, 0.95);
            color: #00FFFF;
            padding: 20px;
            border-radius: 15px;
            border: 2px solid #00FFFF;
            z-index: 9998;
            max-width: 350px;
            font-size: 0.9em;
            box-shadow: 0 8px 30px rgba(0, 255, 255, 0.4);
            animation: slideInRight 0.6s ease-out;
            backdrop-filter: blur(20px);
        `;

        const messageText = isUnknownRegion 
            ? `${this.userLocation.country}からのアクセスを検出しました。<br>国際的に使用される<strong>${langInfo.name}</strong>はいかがですか？`
            : `${this.userLocation.country}からのアクセスを検出しました。<br><strong>${langInfo.name}</strong>に切り替えますか？`;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 1.8em; margin-right: 12px;" class="language-flag">${langInfo.flag}</span>
                <strong>🌍 言語の提案</strong>
            </div>
            <p style="margin: 0 0 18px 0; line-height: 1.4;">
                ${messageText}
            </p>
            <div style="display: flex; gap: 12px;">
                <button id="accept-lang" style="
                    background: linear-gradient(135deg, #00FFFF, #00CCCC);
                    color: #121212;
                    border: none;
                    padding: 10px 18px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s ease;
                ">はい</button>
                <button id="decline-lang" style="
                    background: transparent;
                    color: #00FFFF;
                    border: 2px solid #00FFFF;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">いいえ</button>
            </div>
            <div style="margin-top: 12px; font-size: 0.75em; color: #999;">
                自動的に10秒後に閉じます
            </div>
        `;

        document.body.appendChild(notification);

        // アニメーション用CSS追加
        if (!document.getElementById('language-animations')) {
            const style = document.createElement('style');
            style.id = 'language-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes flagWave {
                    0%, 100% { transform: rotate(-3deg) scale(1); }
                    50% { transform: rotate(3deg) scale(1.1); }
                }
                .language-flag {
                    animation: flagWave 2s ease-in-out infinite;
                }
            `;
            document.head.appendChild(style);
        }

        // ボタンホバー効果
        const acceptBtn = document.getElementById('accept-lang');
        const declineBtn = document.getElementById('decline-lang');

        acceptBtn.addEventListener('mouseenter', () => {
            acceptBtn.style.transform = 'scale(1.05)';
            acceptBtn.style.boxShadow = '0 4px 15px rgba(0, 255, 255, 0.3)';
        });

        acceptBtn.addEventListener('mouseleave', () => {
            acceptBtn.style.transform = 'scale(1)';
            acceptBtn.style.boxShadow = 'none';
        });

        declineBtn.addEventListener('mouseenter', () => {
            declineBtn.style.background = 'rgba(0, 255, 255, 0.1)';
        });

        declineBtn.addEventListener('mouseleave', () => {
            declineBtn.style.background = 'transparent';
        });

        // イベントリスナー
        acceptBtn.addEventListener('click', () => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                notification.remove();
                this.switchLanguage(recommendedLang);
            }, 300);
        });

        declineBtn.addEventListener('click', () => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                notification.remove();
            }, 300);
            // 今後表示しないフラグを保存
            localStorage.setItem('karumaru-language-recommendation-declined', 'true');
            console.log('🚫 Language recommendation declined');
        });

        // 自動で閉じるカウントダウン
        let countdown = 10;
        const countdownInterval = setInterval(() => {
            countdown--;
            const countdownEl = notification.querySelector('div:last-child');
            if (countdownEl) {
                countdownEl.textContent = `自動的に${countdown}秒後に閉じます`;
            }
        }, 1000);

        setTimeout(() => {
            if (notification.parentNode) {
                clearInterval(countdownInterval);
                notification.style.animation = 'slideInRight 0.3s ease-out reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 10000);
    }

    setupLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (!selector) {
            console.warn('⚠️ Language selector not found');
            return;
        }

        selector.value = this.currentLanguage;

        selector.addEventListener('change', (event) => {
            console.log('🔄 Manual language switch:', event.target.value);
            this.switchLanguage(event.target.value);
        });
    }

    setupLanguageStorage() {
        localStorage.setItem('karumaru-preferred-language', this.currentLanguage);
        
        // 地域情報も保存（デバッグ・分析用）
        if (this.userLocation) {
            localStorage.setItem('karumaru-user-location', JSON.stringify(this.userLocation));
        }
        
        // 訪問日時も記録
        localStorage.setItem('karumaru-last-visit', new Date().toISOString());
    }

    switchLanguage(targetLanguage) {
        if (!this.supportedLanguages[targetLanguage]) {
            console.error(`❌ Unsupported language: ${targetLanguage}`);
            return;
        }

        console.log(`🔄 Switching language: ${this.currentLanguage} → ${targetLanguage}`);
        
        document.body.classList.add('language-switching');
        this.showSwitchingAnimation(targetLanguage);
        localStorage.setItem('karumaru-preferred-language', targetLanguage);

        const newUrl = this.buildLanguageUrl(targetLanguage);
        console.log(`🌐 Redirecting to: ${newUrl}`);
        
        setTimeout(() => {
            window.location.href = newUrl;
        }, 1000);
    }

    buildLanguageUrl(language) {
        const baseUrl = window.location.origin;
        let repoPath = '';
        
        // GitHub Pages のリポジトリ名を検出
        if (window.location.hostname.includes('github.io')) {
            const pathParts = window.location.pathname.split('/').filter(part => part);
            if (pathParts[0] && !Object.keys(this.supportedLanguages).includes(pathParts[0])) {
                repoPath = `/${pathParts[0]}`;
            }
        }

        return `${baseUrl}${repoPath}/${language}/index.html`;
    }

    showSwitchingAnimation(targetLanguage) {
        const langInfo = this.supportedLanguages[targetLanguage];
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1));
            backdrop-filter: blur(12px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            animation: fadeIn 0.5s ease-out;
        `;

        const message = document.createElement('div');
        message.style.cssText = `
            background: rgba(18, 18, 18, 0.95);
            color: #00FFFF;
            padding: 40px 60px;
            border-radius: 25px;
            border: 3px solid #00FFFF;
            font-size: 1.6em;
            text-align: center;
            animation: scaleIn 0.5s ease-out;
            box-shadow: 0 15px 50px rgba(0, 255, 255, 0.4);
            position: relative;
            overflow: hidden;
        `;

        const locationInfo = this.userLocation && this.userLocation.country 
            ? `<div style="font-size: 0.7em; color: #ccc; margin-top: 15px;">📍 Detected from ${this.userLocation.country}</div>`
            : '';

        message.innerHTML = `
            <div style="font-size: 3em; margin-bottom: 20px;" class="language-flag">${langInfo.flag}</div>
            <div style="margin-bottom: 10px;">Switching to</div>
            <div style="font-size: 1.2em; color: #FFD700; font-weight: bold;">${langInfo.name}</div>
            ${locationInfo}
            <div style="margin-top: 20px; font-size: 0.6em; color: #999;">
                Karumaru-Servers Language System
            </div>
        `;

        // 背景のパーティクル効果
        const particles = document.createElement('div');
        particles.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
        `;

        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: #00FFFF;
                border-radius: 50%;
                animation: float ${2 + Math.random() * 3}s linear infinite;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                opacity: ${0.3 + Math.random() * 0.7};
            `;
            particles.appendChild(particle);
        }

        message.appendChild(particles);
        overlay.appendChild(message);
        document.body.appendChild(overlay);

        // アニメーションスタイル追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes scaleIn {
                from { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                to { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes float {
                0% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-20px) rotate(180deg); }
                100% { transform: translateY(0px) rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    addLanguageChangeAnimation() {
        const selector = document.getElementById('language-selector');
        if (!selector) return;

        selector.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

        selector.addEventListener('mouseenter', () => {
            selector.style.transform = 'translateY(-2px) scale(1.02)';
            selector.style.boxShadow = '0 8px 25px rgba(0, 255, 255, 0.4)';
        });

        selector.addEventListener('mouseleave', () => {
            selector.style.transform = 'translateY(0) scale(1)';
            selector.style.boxShadow = '0 4px 15px rgba(0, 255, 255, 0.2)';
        });

        selector.addEventListener('focus', () => {
            selector.style.outline = 'none';
            selector.style.boxShadow = '0 0 0 3px rgba(0, 255, 255, 0.4)';
        });

        selector.addEventListener('blur', () => {
            selector.style.boxShadow = '0 4px 15px rgba(0, 255, 255, 0.2)';
        });
    }

    addScrollAnimation() {
        // スクロール時の要素アニメーション
        const featureItems = document.querySelectorAll('.feature-item');
        
        if (featureItems.length === 0) return;

        const observer = new IntersectionObserver(entries => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 100); // 段階的にアニメーション
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '0px 0px -50px 0px'
        });

        featureItems.forEach(item => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(30px)';
            item.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            observer.observe(item);
        });
    }

    showDebugInfo() {
        const debugDiv = document.createElement('div');
        debugDiv.className = 'debug-info';
        debugDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: #00FFFF;
            padding: 15px;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.75em;
            z-index: 9997;
            max-width: 300px;
            border: 1px solid #00FFFF;
        `;

        const updateDebugInfo = () => {
            debugDiv.innerHTML = `
                <strong>🔧 Debug Info</strong><br>
                <strong>Location:</strong> ${this.userLocation?.country || 'Unknown'} (${this.userLocation?.ip || 'N/A'})<br>
                <strong>Current Lang:</strong> ${this.currentLanguage}<br>
                <strong>Stored Lang:</strong> ${localStorage.getItem('karumaru-preferred-language') || 'None'}<br>
                <strong>Browser Lang:</strong> ${navigator.language}<br>
                <strong>URL Path:</strong> ${window.location.pathname}<br>
                <strong>Recommended:</strong> ${this.userLocation?.country ? (this.getLanguageByCountry(this.userLocation.country) || this.fallbackLanguage) : 'N/A'}
            `;
        };

        updateDebugInfo();
        document.body.appendChild(debugDiv);

        // デバッグ情報を定期的に更新
        setInterval(updateDebugInfo, 2000);

        console.log('🔧 Debug mode enabled - Language switcher information:');
        console.table({
            'User Location': this.userLocation,
            'Current Language': this.currentLanguage,
            'Stored Preference': localStorage.getItem('karumaru-preferred-language'),
            'Browser Language': navigator.language,
            'Supported Languages': Object.keys(this.supportedLanguages)
        });
    }

    // 公開メソッド群
    static switchTo(language) {
        const switcher = new GeoLanguageSwitcher();
        switcher.switchLanguage(language);
    }

    static getCurrentLanguage() {
        return localStorage.getItem('karumaru-preferred-language') || 'ja';
    }

    static getDebugInfo() {
        return {
            location: JSON.parse(localStorage.getItem('karumaru-user-location') || 'null'),
            currentLanguage: GeoLanguageSwitcher.getCurrentLanguage(),
            browserLanguage: navigator.language,
            lastVisit: localStorage.getItem('karumaru-last-visit'),
            recommendationDeclined: localStorage.getItem('karumaru-language-recommendation-declined') === 'true'
        };
    }

    static resetPreferences() {
        localStorage.removeItem('karumaru-preferred-language');
        localStorage.removeItem('karumaru-language-recommendation-declined');
        localStorage.removeItem('karumaru-user-location');
        localStorage.removeItem('karumaru-last-visit');
        console.log('🗑️ Language preferences reset');
        window.location.reload();
    }
}

// 初期化
new GeoLanguageSwitcher();

// グローバル変数として公開（デバッグ・外部操作用）
window.KarumaruLang = GeoLanguageSwitcher;

// ページ読み込み完了ログ
window.addEventListener('load', () => {
    console.log('🚀 Karumaru-Servers Language System Ready!');
    console.log('💡 Available commands:');
    console.log('   KarumaruLang.getDebugInfo() - デバッグ情報取得');
    console.log('   KarumaruLang.switchTo("en") - 言語切り替え');
    console.log('   KarumaruLang.resetPreferences() - 設定リセット');
});