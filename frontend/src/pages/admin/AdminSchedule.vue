<template>
  <div class="admin-schedule">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <span class="text-2xl font-bold text-gray-800">Scheduled Notifications</span>
        <p class="text-gray-500 text-sm mt-1">Schedule notifications to be sent at a specific time</p>
      </div>
      <div class="flex gap-3">
        <button 
          v-if="scheduledNotifications.length > 0"
          @click="confirmClearAll"
          class="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-colors"
        >
          <q-icon name="clear_all" size="20px" />
          Clear All
        </button>
        <button 
          @click="openScheduleModal"
          class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-all"
        >
          <q-icon name="schedule_send" size="20px" />
          Schedule Notification
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <q-spinner color="red" size="40px" class="mb-4" />
      <p class="text-gray-500">Loading scheduled notifications...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="scheduledNotifications.length === 0" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <q-icon name="schedule_send" size="40px" class="text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">No scheduled notifications</h3>
      <p class="text-gray-500 mb-4">Schedule a notification to be sent at a specific time</p>
      <button 
        @click="openScheduleModal"
        class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
      >
        Schedule Notification
      </button>
    </div>

    <!-- Scheduled Notifications List -->
    <div v-else class="space-y-4">
      <div 
        v-for="notification in scheduledNotifications" 
        :key="notification.jobId"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-shadow"
      >
        <div class="flex items-start gap-4">
          <!-- Time Badge -->
          <div class="flex flex-col items-center bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl px-4 py-3 text-center flex-shrink-0">
            <span class="text-xs text-amber-600 font-medium uppercase">{{ getMonthName(notification.scheduledFor) }}</span>
            <span class="text-2xl font-bold text-amber-700">{{ getDay(notification.scheduledFor) }}</span>
            <span class="text-xs text-amber-600">{{ getTime(notification.scheduledFor) }}</span>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Pending</span>
              <span class="text-xs text-gray-400">{{ getTimeUntil(notification.scheduledFor) }}</span>
            </div>
            <span class="font-bold text-gray-800 mb-1">{{ notification.title }}</span>
            <p class="text-gray-600 text-sm leading-relaxed">{{ notification.body }}</p>
          </div>

          <!-- Cancel Button -->
          <button 
            @click="confirmCancel(notification)"
            class="p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            title="Cancel scheduled notification"
          >
            <q-icon name="cancel" size="24px" class="text-red-500" />
          </button>
        </div>
      </div>
    </div>

    <!-- Schedule Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showModal = false">
      <div class="bg-white rounded-2xl w-full max-w-md">
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center justify-between">
            <span class="text-xl font-bold text-gray-800">Schedule Notification</span>
            <button @click="showModal = false" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <q-icon name="close" size="20px" class="text-gray-500" />
            </button>
          </div>
        </div>

        <form @submit.prevent="scheduleNotification" class="p-6 space-y-5">
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input 
              v-model="form.title"
              type="text" 
              required
              placeholder="Notification title"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <!-- Body -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Body *</label>
            <textarea 
              v-model="form.body"
              rows="3"
              required
              placeholder="Notification message..."
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            ></textarea>
          </div>

          <!-- Date & Time -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input 
                v-model="form.date"
                type="date" 
                required
                :min="minDate"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Time *</label>
              <input 
                v-model="form.time"
                type="time" 
                required
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <!-- Schedule Preview -->
          <div v-if="form.date && form.time" class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <div class="flex items-center justify-center gap-2 text-amber-700">
              <q-icon name="schedule" size="20px" />
              <span class="font-medium">Will be sent on</span>
            </div>
            <p class="text-amber-800 font-semibold mt-1">{{ formatScheduledDateTime() }}</p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4">
            <button 
              type="button"
              @click="showModal = false"
              class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              :disabled="saving || !form.title || !form.body || !form.date || !form.time"
              class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <q-spinner v-if="saving" color="white" size="18px" />
              {{ saving ? 'Scheduling...' : 'Schedule' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Cancel Confirmation Modal -->
    <div v-if="showCancelModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showCancelModal = false">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
        <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <q-icon name="cancel_schedule_send" size="32px" class="text-amber-600" />
        </div>
        <h3 class="text-lg font-bold text-gray-800 mb-2">Cancel Scheduled Notification?</h3>
        <p class="text-gray-500 text-sm mb-6">This notification will not be sent to users.</p>
        <div class="flex gap-3">
          <button 
            @click="showCancelModal = false"
            class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Keep It
          </button>
          <button 
            @click="cancelNotification"
            :disabled="canceling"
            class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <q-spinner v-if="canceling" color="white" size="18px" />
            {{ canceling ? 'Canceling...' : 'Cancel It' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Clear All Confirmation Modal -->
    <div v-if="showClearAllModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showClearAllModal = false">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <q-icon name="delete_sweep" size="32px" class="text-red-500" />
        </div>
        <span class="text-lg font-bold text-gray-800 mb-2">Clear All Scheduled?</span>
        <p class="text-gray-500 text-sm mb-6">This will cancel all {{ scheduledNotifications.length }} pending notifications.</p>
        <div class="flex gap-3">
          <button 
            @click="showClearAllModal = false"
            class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="clearAllNotifications"
            :disabled="clearingAll"
            class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <q-spinner v-if="clearingAll" color="white" size="18px" />
            {{ clearingAll ? 'Clearing...' : 'Clear All' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { api } from '../../boot/axios';

// State
const scheduledNotifications = ref([]);
const loading = ref(false);
const showModal = ref(false);
const showCancelModal = ref(false);
const showClearAllModal = ref(false);
const cancelingNotification = ref(null);
const saving = ref(false);
const canceling = ref(false);
const clearingAll = ref(false);

const form = ref({
  title: '',
  body: '',
  date: '',
  time: ''
});

// Computed
const minDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

// Methods
const cronToDate = (cron, tz = 'UTC') => {
  // Expect cron in form "MIN HOUR DAY MONTH *" (we use UTC)
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return null;
    const minute = parseInt(parts[0], 10);
    const hour = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[3], 10);
    const now = new Date();
    let year = now.getUTCFullYear();
    let dt = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (dt.getTime() < now.getTime()) {
      // assume next year
      dt = new Date(Date.UTC(year + 1, month - 1, day, hour, minute));
    }
    return dt.toISOString();
  } catch (e) {
    return null;
  }
};

const loadScheduledNotifications = async () => {
  loading.value = true;
  try {
    const res = await api.get('/scheduler/jobs');
    const jobs = res.data.jobs || [];
    const mapped = jobs.map((j) => {
      const body = (j.httpTarget && j.httpTarget.body) || null;
      const meta = (body && body._meta) || null;
      // jobId: prefer meta.jobId, fall back to last segment of name
      const jobId = (meta && meta.jobId) || (j.name && j.name.split('/').pop());
      // title/body fields may be named title/description or title/body
      const title = (body && (body.title || body.name || body.title)) || 'Notification';
      const description = (body && (body.description || body.body || body.message)) || '';

      // Determine scheduledFor: prefer meta.runAt if present, else parse cron
      let scheduledFor = null;
      if (meta && meta.runAt) scheduledFor = meta.runAt;
      else if (j.schedule) scheduledFor = cronToDate(j.schedule, j.timeZone || 'UTC');

      return {
        jobId,
        title,
        body: description,
        scheduledFor,
        raw: j,
      };
    });

    scheduledNotifications.value = mapped;
    console.log('Loaded scheduled notifications:', scheduledNotifications.value);
  } catch (err) {
    console.error('Error loading scheduled notifications:', err);
  } finally {
    loading.value = false;
  }
};

const openScheduleModal = () => {
  form.value = { title: '', body: '', date: '', time: '' };
  showModal.value = true;
};

const scheduleNotification = async () => {
  saving.value = true;
    try {
      const runAt = new Date(`${form.value.date}T${form.value.time}`).toISOString();

      // generate a candidate jobId; backend will ensure uniqueness
      const sanitize = (s) => String(s).replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
      const candidate = `notif-${sanitize(form.value.title || 'job')}-${Date.now().toString(36).slice(-6)}`;

      // Use our trigger endpoint as the job target so the backend can forward
      // to the notifications service and delete one-time jobs after firing.
      //const triggerUrl = new URL('/scheduler/trigger', window.location.origin).toString();
      await api.post('/scheduler/create-job', {
        jobId: candidate,
        runAt,
        title: form.value.title,
        description: form.value.body
      });

      showModal.value = false;
      loadScheduledNotifications();
    } catch (err) {
      console.error('Error scheduling notification:', err);
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      saving.value = false;
    }
};

const confirmCancel = (notification) => {
  cancelingNotification.value = notification;
  showCancelModal.value = true;
};

const cancelNotification = async () => {
  if (!cancelingNotification.value) return;
  
  canceling.value = true;
    try {
      await api.delete(`/scheduler/delete-job/${cancelingNotification.value.jobId}`);
      showCancelModal.value = false;
      cancelingNotification.value = null;
      loadScheduledNotifications();
    } catch (err) {
      console.error('Error canceling notification:', err);
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      canceling.value = false;
    }
};

const confirmClearAll = () => {
  showClearAllModal.value = true;
};

const clearAllNotifications = async () => {
  clearingAll.value = true;
    try {
      for (const notification of scheduledNotifications.value) {
        await api.delete(`/scheduler/delete-job/${notification.jobId}`);
      }
      showClearAllModal.value = false;
      loadScheduledNotifications();
    } catch (err) {
      console.error('Error clearing notifications:', err);
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      clearingAll.value = false;
    }
};

const formatScheduledDateTime = () => {
  if (!form.value.date || !form.value.time) return '';
  const date = new Date(`${form.value.date}T${form.value.time}`);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getMonthName = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', { month: 'short' });
};

const getDay = (timestamp) => {
  const date = new Date(timestamp);
  return date.getDate();
};

const getTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getTimeUntil = (timestamp) => {
  const now = new Date();
  const scheduled = new Date(timestamp);
  const diff = scheduled - now;
  
  if (diff < 0) return 'Pending delivery';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
};

// Lifecycle
onMounted(() => {
  loadScheduledNotifications();
});

onUnmounted(() => {
  try { window.__adminScheduleEvtSrc && window.__adminScheduleEvtSrc.close(); } catch(e){}
});

// Expose refresh method
defineExpose({ refresh: loadScheduledNotifications });
</script>
