<template>
    <div v-if="isLoading" class="loading-overlay">
        <div class="loading-container">
            <img :src="loadingPng" alt="Loading" class="loading-gif" />
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    isLoading: { type: Boolean, default: false }
});
import loadingGif from '../assets/loading.gif';
import loadingPng from '../assets/loading.png';

</script>

<style scoped>
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    z-index: 10000;
}

.loading-gif {
    width: 80px;
    height: 80px;
    animation: pulse 1s ease-in-out infinite alternate;
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }
    100% {
        transform: scale(1.1);
        opacity: 0.8;
    }
}

.dark-mode .loading-container {
    background: var(--dark-bg-primary);
}
</style>