<template>
    <!-- Install Banner -->
    <div v-if="showBanner" class="app-install-banner">
        <button class="close-btn" @click="dismissBanner">
            <q-icon name="close" size="18px" />
        </button>

        <div class="app-icon">
            <img src="/icons/icon-128x128.png" alt="App Icon" />
        </div>

        <div class="app-info">
            <h3 class="app-name">E-Shop</h3>
            <p class="app-description">Install our app for a better experience.</p>
        </div>

        <button class="view-btn" @click="openInstallModal">
            Install
        </button>
    </div>

    <!-- Install Modal Overlay -->
    <Teleport to="body">
        <Transition name="fade">
            <div v-if="showInstallModal" class="install-modal-overlay" @click.self="closeInstallModal">
                <Transition name="slide-up">
                    <div v-if="showInstallModal" class="install-modal">
                        <!-- Close button -->
                        <button class="modal-close-btn" @click="closeInstallModal">
                            <q-icon name="close" size="24px" />
                        </button>

                        <!-- App Info Header -->
                        <div class="modal-header">
                            <div class="modal-app-icon">
                                <img src="/icons/icon-128x128.png" alt="App Icon" />
                            </div>
                            <div class="modal-app-info">
                                <h3 class="modal-app-name">Install App</h3>
                                <p class="modal-app-url">{{ appUrl }}</p>
                            </div>
                        </div>

                        <!-- Description -->
                        <p class="modal-description">
                            Install the app on your device to easily access it anytime. No app store. No download. No
                            hassle.
                        </p>

                        <!-- iOS Instructions -->
                        <div v-if="isIOS" class="ios-instructions">
                            <div class="instruction-step">
                                <span class="step-number">1.</span>
                                <span>Tap on</span>
                                <q-icon name="ios_share" size="20px" class="share-icon" />
                            </div>
                            <div class="instruction-step">
                                <span class="step-number">2.</span>
                                <span>Select</span>
                                <span class="highlight-text">Add to Home Screen</span>
                            </div>
                        </div>

                        <!-- Android Install Button -->
                        <div v-else class="android-install">
                            <button class="install-btn" @click="handleInstall">
                                Install
                            </button>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const showBanner = ref(false);
const showInstallModal = ref(false);
const deferredPrompt = ref(null);

// Get current app URL
const appUrl = computed(() => {
    return window.location.hostname;
});

// Check if device is iOS
const isIOS = computed(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
});

// Check if device is mobile
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768;
};

// Check if app is already installed (PWA) - standalone mode
const isAppInstalled = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
};

const dismissBanner = () => {
    showBanner.value = false;
};

const openInstallModal = () => {
    showInstallModal.value = true;
};

const closeInstallModal = () => {
    showInstallModal.value = false;
};

const handleInstall = async () => {
    if (deferredPrompt.value) {
        // Show the install prompt for PWA (Android)
        deferredPrompt.value.prompt();
        const { outcome } = await deferredPrompt.value.userChoice;
        if (outcome === 'accepted') {
            showBanner.value = false;
            showInstallModal.value = false;
        }
        deferredPrompt.value = null;
    } else {
        // Fallback for Android without prompt
        closeInstallModal();
    }
};

onMounted(() => {
    // Only show on mobile devices when not installed as standalone
    if (isMobileDevice() && !isAppInstalled()) {
        showBanner.value = true;
    }

    // Listen for the beforeinstallprompt event (PWA)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        console.log('beforeinstallprompt event captured');
        deferredPrompt.value = e;
        if (isMobileDevice() && !isAppInstalled()) {
            // showBanner.value = true;
        }
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
        showBanner.value = false;
        showInstallModal.value = false;
        deferredPrompt.value = null;
    });
});
</script>

<style scoped>
/* Banner Styles */
.app-install-banner {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background-color: #f5f5f7;
    border-bottom: 1px solid #e0e0e0;
    position: relative;
    gap: 12px;
}

.dark-mode .app-install-banner {
    background-color: #1e1e1e;
    border-bottom-color: #333;
}

.close-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: #999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-btn:hover {
    color: #666;
}

.dark-mode .close-btn {
    color: #888;
}

.dark-mode .close-btn:hover {
    color: #bbb;
}

.app-icon {
    width: 60px;
    height: 60px;
    border-radius: 14px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.app-info {
    flex: 1;
    min-width: 0;
}

.app-name {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #1d1d1f;
    line-height: 1.3;
}

.dark-mode .app-name {
    color: #f5f5f7;
}

.app-description {
    margin: 2px 0 0;
    font-size: 12px;
    color: #6e6e73;
    line-height: 1.3;
}

.dark-mode .app-description {
    color: #a1a1a6;
}

.view-btn {
    background: none;
    border: none;
    color: #007aff;
    font-size: 16px;
    font-weight: 600;
    padding: 8px 12px;
    cursor: pointer;
    flex-shrink: 0;
}

.view-btn:hover {
    opacity: 0.8;
}

.view-btn:active {
    opacity: 0.6;
}

/* Modal Overlay */
.install-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 9999;
}

/* Modal Container */
.install-modal {
    background-color: #ffffff;
    border-radius: 20px 20px 0 0;
    padding: 24px;
    width: 100%;
    max-width: 500px;
    position: relative;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

.dark-mode .install-modal {
    background-color: #2c2c2e;
}

/* Modal Close Button */
.modal-close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    background: #f0f0f0;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #666;
}

.modal-close-btn:hover {
    background: #e0e0e0;
}

.dark-mode .modal-close-btn {
    background: #3a3a3c;
    color: #a1a1a6;
}

.dark-mode .modal-close-btn:hover {
    background: #48484a;
}

/* Modal Header */
.modal-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
}

.modal-app-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-app-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.modal-app-info {
    flex: 1;
}

.modal-app-name {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1d1d1f;
}

.dark-mode .modal-app-name {
    color: #f5f5f7;
}

.modal-app-url {
    margin: 4px 0 0;
    font-size: 13px;
    color: #86868b;
}

.dark-mode .modal-app-url {
    color: #a1a1a6;
}

/* Modal Description */
.modal-description {
    font-size: 14px;
    color: #1d1d1f;
    line-height: 1.5;
    margin-bottom: 24px;
}

.dark-mode .modal-description {
    color: #e5e5e7;
}

/* iOS Instructions */
.ios-instructions {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 20px;
}

.instruction-step {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    color: #1d1d1f;
}

.dark-mode .instruction-step {
    color: #e5e5e7;
}

.step-number {
    font-weight: 500;
    min-width: 20px;
}

.share-icon {
    color: #007aff;
    background: #f0f0f0;
    padding: 6px;
    border-radius: 6px;
}

.dark-mode .share-icon {
    background: #3a3a3c;
}

.highlight-text {
    background: #f0f0f0;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 500;
}

.dark-mode .highlight-text {
    background: #3a3a3c;
}

/* Android Install Button */
.android-install {
    padding-bottom: 20px;
}

.install-btn {
    width: 100%;
    padding: 14px 24px;
    background-color: #1a56db;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
}

.install-btn:hover {
    background-color: #1e40af;
}

.install-btn:active {
    background-color: #1e3a8a;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
}
</style>
