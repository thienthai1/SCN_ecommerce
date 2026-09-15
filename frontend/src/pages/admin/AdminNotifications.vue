<template>
  <div class="admin-notifications">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <span class="text-2xl font-bold text-gray-800">Notifications</span>
        <p class="text-gray-500 text-sm mt-1">Manage push notifications sent to customers</p>
      </div>
      <button 
        @click="openCreateModal"
        class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-all"
      >
        <q-icon name="add" size="20px" />
        Create Notification
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <q-spinner color="red" size="40px" class="mb-4" />
      <p class="text-gray-500">Loading notifications...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="notifications.length === 0" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <q-icon name="notifications" size="40px" class="text-gray-400" />
      </div>
      <span class="text-lg font-semibold text-gray-700 mb-2">No notifications yet</span>
      <p class="text-gray-500 mb-4">Create your first notification to reach your customers</p>
      <button 
        @click="openCreateModal"
        class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
      >
        Create Notification
      </button>
    </div>

    <!-- Notifications List -->
    <div v-else class="space-y-4">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-shadow"
      >
        <div class="flex items-start gap-4">
          <!-- Icon -->
          <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <q-icon name="notifications_active" size="24px" class="text-white" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <span class="font-bold text-gray-800 mb-1">{{ notification.title }}</span>
            <p class="text-gray-600 text-sm leading-relaxed">{{ notification.body }}</p>
            
            <!-- Metadata -->
            <div class="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
              <div class="flex items-center gap-1">
                <q-icon name="schedule" size="14px" />
                <span>{{ formatDate(notification.createdAt) }}</span>
                <span>{{ notification.date }}</span>
              </div>
              <div v-if="notification.sentCount" class="flex items-center gap-1">
                <q-icon name="send" size="14px" />
                <span>Sent to {{ notification.sentCount }} devices</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button 
              @click="openEditModal(notification)"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <q-icon name="edit" size="20px" class="text-gray-500" />
            </button>
            <button 
              @click="confirmDelete(notification)"
              class="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <q-icon name="delete" size="20px" class="text-red-500" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showModal = false">
      <div class="bg-white rounded-2xl w-full max-w-md">
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center justify-between">
            <span class="text-xl font-bold text-gray-800">{{ editingNotification ? 'Edit Notification' : 'Create Notification' }}</span>
            <button @click="showModal = false" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <q-icon name="close" size="20px" class="text-gray-500" />
            </button>
          </div>
        </div>

        <form @submit.prevent="saveNotification" class="p-6 space-y-5">
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
              rows="4"
              required
              placeholder="Notification message..."
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            ></textarea>
            <p class="text-xs text-gray-400 mt-1">{{ form.body?.length || 0 }} / 500 characters</p>
          </div>

          <!-- Preview -->
          <div class="bg-gray-100 rounded-xl p-4">
            <p class="text-xs text-gray-500 mb-2 font-medium">Preview</p>
            <div class="bg-white rounded-lg p-3 shadow-sm">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <q-icon name="notifications" size="16px" class="text-white" />
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-gray-800 text-sm">{{ form.title || 'Notification title' }}</p>
                  <p class="text-gray-500 text-xs mt-0.5 line-clamp-2">{{ form.body || 'Notification message...' }}</p>
                </div>
              </div>
            </div>
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
              :disabled="saving || !form.title || !form.body"
              class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <q-spinner v-if="saving" color="white" size="18px" />
              {{ saving ? 'Saving...' : (editingNotification ? 'Update' : 'Create & Send') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showDeleteModal = false">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <q-icon name="delete" size="32px" class="text-red-500" />
        </div>
        <h3 class="text-lg font-bold text-gray-800 mb-2">Delete Notification?</h3>
        <p class="text-gray-500 text-sm mb-6">This action cannot be undone. The notification will be permanently deleted.</p>
        <div class="flex gap-3">
          <button 
            @click="showDeleteModal = false"
            class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="deleteNotification"
            :disabled="deleting"
            class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <q-spinner v-if="deleting" color="white" size="18px" />
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../boot/axios';

// State
const notifications = ref([]);
const loading = ref(false);
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingNotification = ref(null);
const deletingNotification = ref(null);
const saving = ref(false);
const deleting = ref(false);

const form = ref({
  title: '',
  body: ''
});

// Methods
const loadNotifications = async () => {
  loading.value = true;
  try {
    const res = await api.get('/notifications');
    notifications.value = res.data.notifications || [];
  } catch (err) {
    console.error('Error loading notifications:', err);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  editingNotification.value = null;
  form.value = { title: '', body: '' };
  showModal.value = true;
};

const openEditModal = (notification) => {
  editingNotification.value = notification;
  form.value = {
    title: notification.title || '',
    body: notification.body || ''
  };
  showModal.value = true;
};

const saveNotification = async () => {
  saving.value = true;
  try {
    if (editingNotification.value) {
      await api.put(`/notifications/${editingNotification.value.id}`, {
        title: form.value.title,
        body: form.value.body
      });
    } else {
      await api.post('/createNotifications', {
        title: form.value.title,
        body: form.value.body
      });
    }
    showModal.value = false;
    loadNotifications();
  } catch (err) {
    console.error('Error saving notification:', err);
    alert('Error: ' + (err.response?.data?.error || err.message));
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (notification) => {
  deletingNotification.value = notification;
  showDeleteModal.value = true;
};

const deleteNotification = async () => {
  if (!deletingNotification.value) return;
  
  deleting.value = true;
  try {
    await api.delete(`/notifications/${deletingNotification.value.id}`);
    showDeleteModal.value = false;
    deletingNotification.value = null;
    loadNotifications();
  } catch (err) {
    console.error('Error deleting notification:', err);
    alert('Error: ' + (err.response?.data?.error || err.message));
  } finally {
    deleting.value = false;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Lifecycle
onMounted(() => {
  loadNotifications();
});

// Expose refresh method
defineExpose({ refresh: loadNotifications });
</script>
