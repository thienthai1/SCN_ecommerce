<template>
  <div class="admin-categories">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Categories</h1>
        <p class="text-gray-500 text-sm mt-1">Organize your products into categories</p>
      </div>
      <button 
        @click="openCreateModal"
        class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-all"
      >
        <q-icon name="add" size="20px" />
        Add Category
      </button>
    </div>

    <!-- Search -->
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
      <div class="relative">
        <q-icon name="search" size="20px" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search categories..."
          class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <q-spinner color="red" size="40px" class="mb-4" />
      <p class="text-gray-500">Loading categories...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredCategories.length === 0" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <q-icon name="category" size="40px" class="text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">No categories found</h3>
      <p class="text-gray-500 mb-4">Create categories to organize your products</p>
      <button 
        @click="openCreateModal"
        class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
      >
        Add Category
      </button>
    </div>

    <!-- Categories Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="category in filteredCategories" 
        :key="category.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
      >
        <div class="p-6">
          <!-- Category Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center">
              <img v-if="category.imageUrl" :src="category.imageUrl" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <q-icon name="category" size="28px" class="text-white" />
              </div>
            </div>
            <span 
              :class="[
                'px-3 py-1 rounded-full text-xs font-semibold',
                category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              ]"
            >
              {{ category.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>

          <!-- Category Info -->
          <h3 class="text-lg font-bold text-gray-800 mb-2">{{ category.name }}</h3>
          <p class="text-sm text-gray-500 mb-4 line-clamp-2">{{ category.description || 'No description' }}</p>
          
          <div class="text-xs text-gray-400 mb-4">
            Created {{ formatDate(category.created_at) }}
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button 
              @click="openEditModal(category)"
              class="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <q-icon name="edit" size="16px" />
              Edit
            </button>
            <button 
              @click="confirmDelete(category)"
              class="flex items-center justify-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
            >
              <q-icon name="delete" size="18px" />
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
            <h2 class="text-xl font-bold text-gray-800">{{ editingCategory ? 'Edit Category' : 'Add Category' }}</h2>
            <button @click="showModal = false" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <q-icon name="close" size="20px" class="text-gray-500" />
            </button>
          </div>
        </div>

        <form @submit.prevent="saveCategory" class="p-6 space-y-5">
          <!-- Category Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
            <input 
              v-model="form.name"
              type="text" 
              required
              placeholder="e.g. Electronics"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              v-model="form.description"
              rows="3"
              placeholder="Describe this category..."
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            ></textarea>
          </div>

          <!-- Active Status -->
          <div class="flex items-center gap-3">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="form.is_active" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
            <span class="text-sm font-medium text-gray-700">Active (visible to customers)</span>
          </div>

          <!-- Category Image -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category Image</label>
            <div class="flex items-center gap-3">
              <input
                type="file"
                @change="onCategoryImageChange"
                accept="image/*"
                class="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-600 hover:file:bg-red-100"
              />
              <img v-if="form.imagePreview || editingCategory?.imageUrl" :src="form.imagePreview || editingCategory.imageUrl" class="w-16 h-16 object-cover rounded-lg border border-gray-200" />
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
              :disabled="saving"
              class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <q-spinner v-if="saving" color="white" size="18px" />
              {{ saving ? 'Saving...' : (editingCategory ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showDeleteModal = false">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <q-icon name="delete_forever" size="32px" class="text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 mb-2">Delete Category</h3>
          <p class="text-gray-500">Are you sure you want to delete <strong>{{ deleteTarget?.name }}</strong>? This action cannot be undone.</p>
        </div>
        <div class="flex gap-3">
          <button 
            @click="showDeleteModal = false"
            class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="deleteCategory"
            :disabled="deleting"
            class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
import { ref, computed, onMounted } from 'vue';
import { api } from '../../boot/axios';

// State
const categories = ref([]);
const loading = ref(false);
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingCategory = ref(null);
const deleteTarget = ref(null);
const saving = ref(false);
const deleting = ref(false);
const searchQuery = ref('');

const form = ref({
  name: '',
  description: '',
  is_active: true,
  imageFile: null,
  imagePreview: null
});

// For file handling
const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Computed
const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value;
  
  const query = searchQuery.value.toLowerCase();
  return categories.value.filter(c => 
    c.name?.toLowerCase().includes(query) || 
    c.description?.toLowerCase().includes(query)
  );
});

// Methods
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const loadCategories = async () => {
  loading.value = true;
  try {
    const res = await api.get('/viewcategories');
    categories.value = res.data.categories || [];
  } catch (err) {
    console.error('Error loading categories:', err);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  editingCategory.value = null;
  form.value = {
    name: '',
    description: '',
    is_active: true,
    imageFile: null,
    imagePreview: null
  };
  showModal.value = true;
};

const openEditModal = (category) => {
  editingCategory.value = category;
  form.value = {
    name: category.name || '',
    description: category.description || '',
    is_active: category.is_active !== false,
    imageFile: null,
    imagePreview: category.imageUrl || null
  };
  showModal.value = true;
};

const saveCategory = async () => {
  if (!form.value.name.trim()) {
    alert('Category name is required');
    return;
  }

  saving.value = true;
  try {
    if (editingCategory.value) {
      // Use update endpoint
      const payload = {
        id: editingCategory.value.id,
        name: form.value.name,
        description: form.value.description,
        is_active: form.value.is_active
      };
      if (form.value.imageFile) {
        try {
          const base64 = await readFileAsDataURL(form.value.imageFile);
          payload.imageBase64 = base64;
          payload.fileName = form.value.imageFile.name;
        } catch (e) {
          console.error('Error reading image file:', e);
        }
      }
      await api.put('/editcategories', payload);
    } else {
      const payload = {
        name: form.value.name,
        description: form.value.description,
        is_active: form.value.is_active
      };
      if (form.value.imageFile) {
        try {
          const base64 = await readFileAsDataURL(form.value.imageFile);
          payload.imageBase64 = base64;
          payload.fileName = form.value.imageFile.name;
        } catch (e) {
          console.error('Error reading image file:', e);
        }
      }
      await api.post('/addcategories', payload);
    }
    showModal.value = false;
    loadCategories();
  } catch (err) {
    console.error('Error saving category:', err);
    alert('Error: ' + (err.response?.data?.error || err.message));
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (category) => {
  deleteTarget.value = category;
  showDeleteModal.value = true;
};

const deleteCategory = async () => {
  if (!deleteTarget.value) return;

  deleting.value = true;
  try {
    await api.delete(`/deletecategories/${deleteTarget.value.id}`);
    showDeleteModal.value = false;
    deleteTarget.value = null;
    loadCategories();
  } catch (err) {
    console.error('Error deleting category:', err);
    alert('Error: ' + (err.response?.data?.error || err.message));
  } finally {
    deleting.value = false;
  }
};

const onCategoryImageChange = (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  form.value.imageFile = file;
  form.value.imagePreview = URL.createObjectURL(file);
};

// Lifecycle
onMounted(() => {
  loadCategories();
});

// Expose refresh method for parent
defineExpose({ refresh: loadCategories });
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
