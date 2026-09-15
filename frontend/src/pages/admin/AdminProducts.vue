<template>
  <div class="admin-products">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <span class="text-2xl font-bold text-gray-800">Products</span>
        <p class="text-gray-500 text-sm mt-1">Manage your product inventory</p>
      </div>
      <button 
        @click="openCreateModal"
        class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-all"
      >
        <q-icon name="add" size="20px" />
        Add Product
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1 relative">
          <q-icon name="search" size="20px" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search products..."
            class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>
        <select 
          v-model="filterCategory"
          class="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
        >
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.name">{{ cat.name }}</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <q-spinner color="red" size="40px" class="mb-4" />
      <p class="text-gray-500">Loading products...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredProducts.length === 0" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <q-icon name="inventory_2" size="40px" class="text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">No products found</h3>
      <p class="text-gray-500 mb-4">Get started by adding your first product</p>
      <button 
        @click="openCreateModal"
        class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
      >
        Add Product
      </button>
    </div>

    <!-- Products Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div 
        v-for="product in filteredProducts" 
        :key="product.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group"
      >
        <!-- Product Image -->
        <div class="aspect-square bg-gray-100 relative overflow-hidden">
          <img 
            v-if="product.imageUrl" 
            :src="product.imageUrl" 
            :alt="product.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <q-icon name="image" size="48px" class="text-gray-300" />
          </div>
          <!-- Status Badge -->
          <div class="absolute top-3 right-3 flex flex-col gap-1 items-end">
            <div 
              :class="[
                'px-3 py-1 rounded-full text-xs font-semibold',
                product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              ]"
            >
              {{ product.is_active ? 'Active' : 'Inactive' }}
            </div>
            <div 
              v-if="product.isVariant"
              class="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700"
            >
              Has Variants
            </div>
          </div>
        </div>

        <!-- Product Info -->
        <div class="p-4">
          <div v-if="product.category_name" class="text-xs text-white font-medium mb-1 bg-green-600 w-fit px-2 py-1 rounded-xl">{{ product.category_name }}</div>
          <span class="font-semibold text-gray-800 mb-2 line-clamp-1">{{ product.name }}</span>
          
          <div class="flex items-center justify-between mb-4">
            <span class="text-md font-bold text-gray-800">{{ getProductPriceDisplay(product) }}</span>
            <span :class="['text-sm font-medium', getProductStock(product) < 10 ? 'text-red-600' : 'text-gray-600']">
              Stock: {{ getProductStock(product) }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button 
              @click="openEditModal(product)"
              class="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <q-icon name="edit" size="16px" />
              Edit
            </button>
            <button 
              @click="confirmDelete(product)"
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
      <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-800">{{ editingProduct ? 'Edit Product' : 'Add Product' }}</h2>
            <button @click="showModal = false" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <q-icon name="close" size="20px" class="text-gray-500" />
            </button>
          </div>
        </div>

        <form @submit.prevent="saveProduct" class="p-6 space-y-5">
          <!-- Product Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input 
              v-model="form.name"
              type="text" 
              required
              placeholder="Enter product name"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <!-- SKU -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
            <input 
              v-model="form.sku"
              type="text" 
              required
              placeholder="e.g., PROD-001"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <!-- Price, Stock, Weight Row -->
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input 
                v-model.number="form.price"
                type="number" 
                step="0.01"
                required
                placeholder="0.00"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input 
                v-model.number="form.stock"
                type="number"
                placeholder="0"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Weight</label>
              <input 
                v-model.number="form.weight"
                type="number"
                step="0.01"
                placeholder="0"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select 
              v-model="form.category_name"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="">Select a category</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.name">{{ cat.name }}</option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              v-model="form.description"
              rows="3"
              placeholder="Product description..."
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            ></textarea>
          </div>

          <!-- Image Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
            <input 
              type="file" 
              @change="onImageFileChange"
              accept="image/*"
              class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-600 hover:file:bg-red-100"
            />
            <div v-if="form.imagePreview" class="mt-3">
              <img :src="form.imagePreview" class="w-24 h-24 object-cover rounded-xl border border-gray-200" />
            </div>
          </div>

          <!-- Active Status -->
          <div class="flex items-center gap-3">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="form.is_active" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
            <span class="text-sm font-medium text-gray-700">Active (visible in store)</span>
          </div>

          <!-- Variants Section -->
          <div class="border-t border-gray-200 pt-5">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="form.hasVariants" class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
                <span class="text-sm font-medium text-gray-700">This product has variants</span>
              </div>
            </div>

            <!-- Existing Variants (when editing) -->
            <div v-if="form.existingVariants?.length && form.hasVariants" class="mb-6">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-gray-700">Existing Variants</h4>
              </div>
              <div class="space-y-4">
                <div 
                  v-for="(variantGroup, evIndex) in form.existingVariants" 
                  :key="variantGroup.id"
                  class="bg-purple-50 rounded-xl p-4 space-y-3 border border-purple-200"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex-1 mr-3">
                      <input 
                        v-model="variantGroup.variant"
                        type="text" 
                        placeholder="Variant type (e.g., Color, Size)"
                        class="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-medium bg-white"
                      />
                    </div>
                    <button 
                      type="button"
                      @click="confirmDeleteExistingVariant(variantGroup)"
                      class="text-red-500 hover:text-red-600 p-1"
                      title="Delete variant"
                    >
                      <q-icon name="delete" size="20px" />
                    </button>
                  </div>

                  <!-- Options for existing variant -->
                  <div class="space-y-2">
                    <div 
                      v-for="(opt, oIndex) in variantGroup.options" 
                      :key="oIndex"
                      class="bg-white rounded-lg p-3 border border-purple-200"
                    >
                      <div class="flex items-start justify-between mb-2">
                        <span class="text-xs font-medium text-purple-600">Option {{ oIndex + 1 }}</span>
                        <button 
                          v-if="variantGroup.options.length > 1"
                          type="button"
                          @click="removeExistingOption(evIndex, oIndex)"
                          class="text-red-400 hover:text-red-500"
                        >
                          <q-icon name="close" size="16px" />
                        </button>
                      </div>
                      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <input 
                          v-model="opt.name"
                          type="text" 
                          placeholder="Name *"
                          class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <input 
                          v-model="opt.sku"
                          type="text" 
                          placeholder="SKU *"
                          class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <input 
                          v-model.number="opt.price"
                          type="number" 
                          step="0.01"
                          placeholder="Price *"
                          class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <input 
                          v-model.number="opt.stock"
                          type="number" 
                          placeholder="Stock *"
                          class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div class="grid grid-cols-2 md:grid-cols-2 gap-2 mt-2">
                        <input 
                          v-model.number="opt.weight"
                          type="number" 
                          step="0.01"
                          placeholder="Weight (g)"
                          class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <input 
                          v-model="opt.description"
                          type="text" 
                          placeholder="Description"
                          class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div class="mt-2">
                        <label class="block text-xs text-gray-500 mb-1">Option Image</label>
                        <div class="flex items-center gap-2">
                          <input 
                            type="file" 
                            @change="(e) => onExistingOptionImageChange(e, evIndex, oIndex)"
                            accept="image/*"
                            class="flex-1 text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100"
                          />
                          <img 
                            v-if="opt.imagePreview || opt.imageUrl" 
                            :src="opt.imagePreview || opt.imageUrl" 
                            class="w-8 h-8 object-cover rounded border border-gray-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    @click="addOptionToExistingVariant(evIndex)"
                    class="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                  >
                    <q-icon name="add" size="14px" />
                    Add Option
                  </button>
                </div>
              </div>
            </div>

            <!-- Add New Variants -->
            <div v-if="form.hasVariants" class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold text-gray-700">{{ form.existingVariants?.length ? 'Add More Variants' : 'Variants' }}</h4>
                <button 
                  type="button"
                  @click="addVariantGroup"
                  class="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                >
                  <q-icon name="add" size="16px" />
                  Add Variant Type
                </button>
              </div>

              <div 
                v-for="(variantGroup, vIndex) in form.variants" 
                :key="vIndex"
                class="bg-gray-50 rounded-xl p-4 space-y-3"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 mr-3">
                    <input 
                      v-model="variantGroup.variant"
                      type="text" 
                      placeholder="Variant type (e.g., Color, Size)"
                      class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-medium"
                    />
                  </div>
                  <button 
                    v-if="form.variants.length > 1"
                    type="button"
                    @click="removeVariantGroup(vIndex)"
                    class="text-red-500 hover:text-red-600 p-1"
                  >
                    <q-icon name="delete" size="20px" />
                  </button>
                </div>

                <!-- Options for this variant -->
                <div class="space-y-2">
                  <div 
                    v-for="(opt, oIndex) in variantGroup.options" 
                    :key="oIndex"
                    class="bg-white rounded-lg p-3 border border-gray-200"
                  >
                    <div class="flex items-start justify-between mb-2">
                      <span class="text-xs font-medium text-gray-500">Option {{ oIndex + 1 }}</span>
                      <button 
                        v-if="variantGroup.options.length > 1"
                        type="button"
                        @click="removeOption(vIndex, oIndex)"
                        class="text-red-400 hover:text-red-500"
                      >
                        <q-icon name="close" size="16px" />
                      </button>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <input 
                        v-model="opt.name"
                        type="text" 
                        placeholder="Name *"
                        class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input 
                        v-model="opt.sku"
                        type="text" 
                        placeholder="SKU *"
                        class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input 
                        v-model.number="opt.price"
                        type="number" 
                        step="0.01"
                        placeholder="Price *"
                        class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input 
                        v-model.number="opt.stock"
                        type="number" 
                        placeholder="Stock *"
                        class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-2 gap-2 mt-2">
                      <input 
                        v-model.number="opt.weight"
                        type="number" 
                        step="0.01"
                        placeholder="Weight (g)"
                        class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input 
                        v-model="opt.description"
                        type="text" 
                        placeholder="Description"
                        class="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div class="mt-2">
                      <label class="block text-xs text-gray-500 mb-1">Option Image</label>
                      <div class="flex items-center gap-2">
                        <input 
                          type="file" 
                          @change="(e) => onNewOptionImageChange(e, vIndex, oIndex)"
                          accept="image/*"
                          class="flex-1 text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100"
                        />
                        <img 
                          v-if="opt.imagePreview || opt.imageUrl" 
                          :src="opt.imagePreview || opt.imageUrl" 
                          class="w-8 h-8 object-cover rounded border border-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="button"
                  @click="addOptionToVariant(vIndex)"
                  class="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                >
                  <q-icon name="add" size="14px" />
                  Add Option
                </button>
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
              :disabled="saving"
              class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <q-spinner v-if="saving" color="white" size="18px" />
              {{ saving ? 'Saving...' : (editingProduct ? 'Update' : 'Create') }}
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
          <h3 class="text-lg font-bold text-gray-800 mb-2">Delete Product</h3>
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
            @click="deleteProduct"
            :disabled="deleting"
            class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <q-spinner v-if="deleting" color="white" size="18px" />
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Variant Confirmation Modal -->
    <div v-if="showDeleteVariantModal" class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" @click.self="showDeleteVariantModal = false">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <q-icon name="delete_forever" size="32px" class="text-purple-600" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 mb-2">Delete Variant</h3>
          <p class="text-gray-500">Are you sure you want to delete the variant <strong>"{{ deleteVariantTarget?.variant }}"</strong>? This will remove all its options.</p>
        </div>
        <div class="flex gap-3">
          <button 
            @click="showDeleteVariantModal = false"
            class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="deleteExistingVariant"
            class="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Delete
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
const products = ref([]);
const categories = ref([]);
const loading = ref(false);
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingProduct = ref(null);
const deleteTarget = ref(null);
const saving = ref(false);
const deleting = ref(false);
const searchQuery = ref('');
const filterCategory = ref('');

const form = ref({
  name: '',
  price: 0,
  stock: 0,
  weight: 0,
  sku: '',
  category_name: '',
  description: '',
  imageUrl: '',
  imageFile: null,
  imagePreview: null,
  is_active: true,
  hasVariants: false,
  variants: [],
  existingVariants: [], // For editing existing variants
  variantsToDelete: [] // Track variants to delete
});

const showDeleteVariantModal = ref(false);
const deleteVariantTarget = ref(null);

const createEmptyOption = () => ({
  name: '',
  description: '',
  sku: '',
  stock: 0,
  price: 0,
  weight: 0,
  imageUrl: '',
  imageFile: null,
  imagePreview: null,
  isActive: true
});

const createEmptyVariantGroup = () => ({
  variant: '',
  options: [createEmptyOption()]
});

// Computed
const filteredProducts = computed(() => {
  let result = products.value;
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(p => 
      p.name?.toLowerCase().includes(query) || 
      p.description?.toLowerCase().includes(query)
    );
  }
  
  if (filterCategory.value) {
    result = result.filter(p => p.category_name === filterCategory.value);
  }
  
  return result;
});

// Methods
const formatCurrency = (value) => {
  if (value === undefined || value === null) return '฿0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB' }).format(Number(value));
};

const getProductStock = (product) => {
  // If product has variants, sum up all variant option stocks
  if (product.isVariant && product.variants && product.variants.length > 0) {
    let totalStock = 0;
    for (const variant of product.variants) {
      if (variant.options && Array.isArray(variant.options)) {
        for (const opt of variant.options) {
          totalStock += Number(opt.stock) || 0;
        }
      }
    }
    return totalStock;
  }
  // Otherwise return the product's own stock
  return product.stock || 0;
};

const getProductPriceDisplay = (product) => {
  // If product has variants, show min-max price range
  if (product.isVariant && product.variants && product.variants.length > 0) {
    const prices = [];
    for (const variant of product.variants) {
      if (variant.options && Array.isArray(variant.options)) {
        for (const opt of variant.options) {
          if (opt.price !== undefined && opt.price !== null) {
            prices.push(Number(opt.price));
          }
        }
      }
    }
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      if (minPrice === maxPrice) {
        return formatCurrency(minPrice);
      }
      return `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
    }
  }
  // Otherwise return the product's own price
  return formatCurrency(product.price);
};

const loadProducts = async () => {
  loading.value = true;
  try {
    const res = await api.get('/getproducts');
    products.value = res.data.products || [];
  } catch (err) {
    console.error('Error loading products:', err);
  } finally {
    loading.value = false;
  }
};

const loadCategories = async () => {
  try {
    const res = await api.get('/viewcategories');
    categories.value = (res.data.categories || []).filter(c => c.is_active !== false);
  } catch (err) {
    console.error('Error loading categories:', err);
  }
};

const openCreateModal = () => {
  editingProduct.value = null;
  form.value = {
    name: '',
    price: 0,
    stock: 0,
    weight: 0,
    sku: '',
    category_name: '',
    description: '',
    imageUrl: '',
    imageFile: null,
    imagePreview: null,
    is_active: true,
    hasVariants: false,
    variants: [createEmptyVariantGroup()],
    existingVariants: [],
    variantsToDelete: []
  };
  showModal.value = true;
};

const openEditModal = (product) => {
  editingProduct.value = product;
  
  // Deep clone existing variants into editable form
  const existingVariants = (product.variants || []).map(v => ({
    id: v.id,
    product_id: v.product_id,
    variant: v.variant || '',
    options: (v.options || []).map(opt => ({
      name: opt.name || '',
      description: opt.description || '',
      sku: opt.sku || '',
      stock: opt.stock || 0,
      price: opt.price || 0,
      weight: opt.weight || 0,
      imageUrl: opt.imageUrl || '',
      imageFile: null,
      imagePreview: opt.imageUrl || null,
      isActive: opt.isActive !== false,
      created_time: opt.created_time
    }))
  }));
  
  form.value = {
    name: product.name || '',
    price: product.price || 0,
    stock: product.stock || 0,
    weight: product.weight || 0,
    sku: product.sku || '',
    category_name: product.category_name || '',
    description: product.description || '',
    imageUrl: product.imageUrl || '',
    imageFile: null,
    imagePreview: product.imageUrl || null,
    is_active: product.is_active !== false,
    hasVariants: product.isVariant || false,
    variants: [createEmptyVariantGroup()],
    existingVariants: existingVariants,
    variantsToDelete: []
  };
  showModal.value = true;
};

const onImageFileChange = (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  form.value.imageFile = file;
  form.value.imagePreview = URL.createObjectURL(file);
};

const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const saveProduct = async () => {
  saving.value = true;
  try {
    // If an image file is selected, upload it first
    if (form.value.imageFile) {
      const base64 = await readFileAsDataURL(form.value.imageFile);
      const uploadRes = await api.post('/uploadProductImage', {
        imageBase64: base64,
        fileName: form.value.imageFile.name,
        product_id: editingProduct.value ? editingProduct.value.id : undefined
      });
      const img = uploadRes.data.product_image;
      if (img && img.imageUrl) {
        form.value.imageUrl = img.imageUrl;
      }
    }

    // Prepare product data
    const productData = {
      name: form.value.name,
      sku: form.value.sku,
      price: form.value.price,
      stock: form.value.stock,
      weight: form.value.weight,
      category_name: form.value.category_name,
      description: form.value.description,
      imageUrl: form.value.imageUrl,
      is_active: form.value.is_active,
      isVariant: form.value.hasVariants
    };

    let productId;

    if (editingProduct.value) {
      productData.id = editingProduct.value.id;
      await api.put('/editproducts', productData);
      productId = editingProduct.value.id;
    } else {
      const res = await api.post('/addproducts', productData);
      productId = res.data.product?.id;
    }

    // If has variants, handle them
    if (form.value.hasVariants && productId) {
      // Delete variants marked for deletion
      for (const variantId of form.value.variantsToDelete) {
        try {
          await api.delete(`/deletevariant/${variantId}`);
        } catch (deleteErr) {
          console.error('Error deleting variant:', deleteErr);
        }
      }

      // Update existing variants
      for (const variantGroup of form.value.existingVariants) {
        if (variantGroup.id && variantGroup.variant?.trim()) {
          const validOptions = variantGroup.options.filter(opt => opt.name?.trim() && opt.sku?.trim());
          if (validOptions.length > 0) {
            // Upload images for options that have imageFile
            for (const opt of validOptions) {
              if (opt.imageFile) {
                const uploadedUrl = await uploadOptionImage(opt.imageFile, productId, opt.sku);
                if (uploadedUrl) {
                  opt.imageUrl = uploadedUrl;
                }
              }
            }
            try {
              await api.put('/editvariant', {
                id: variantGroup.id,
                variant: variantGroup.variant,
                options: validOptions.map(opt => ({
                  name: opt.name,
                  description: opt.description,
                  sku: opt.sku,
                  stock: opt.stock,
                  price: opt.price,
                  weight: opt.weight,
                  imageUrl: opt.imageUrl,
                  isActive: opt.isActive,
                  created_time: opt.created_time
                }))
              });
            } catch (updateErr) {
              console.error('Error updating variant:', updateErr);
            }
          }
        }
      }

      // Add new variants
      for (const variantGroup of form.value.variants) {
        // Only add if variant has a name and at least one valid option
        if (variantGroup.variant?.trim()) {
          const validOptions = variantGroup.options.filter(opt => opt.name?.trim() && opt.sku?.trim());
          if (validOptions.length > 0) {
            // Upload images for options that have imageFile
            for (const opt of validOptions) {
              if (opt.imageFile) {
                const uploadedUrl = await uploadOptionImage(opt.imageFile, productId, opt.sku);
                if (uploadedUrl) {
                  opt.imageUrl = uploadedUrl;
                }
              }
            }
            try {
              await api.post('/addvariant', {
                product_id: productId,
                variant: variantGroup.variant,
                options: validOptions.map(opt => ({
                  name: opt.name,
                  description: opt.description,
                  sku: opt.sku,
                  stock: opt.stock,
                  price: opt.price,
                  weight: opt.weight,
                  imageUrl: opt.imageUrl,
                  isActive: opt.isActive
                }))
              });
            } catch (variantErr) {
              console.error('Error adding variant:', variantErr);
              // Continue with other variants even if one fails
            }
          }
        }
      }
    }

    showModal.value = false;
    loadProducts();
  } catch (err) {
    console.error('Error saving product:', err);
    alert('Error: ' + (err.response?.data?.error || err.message));
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (product) => {
  deleteTarget.value = product;
  showDeleteModal.value = true;
};

const deleteProduct = async () => {
  deleting.value = true;
  try {
    await api.delete(`/deleteproducts/${deleteTarget.value.id}`);
    showDeleteModal.value = false;
    loadProducts();
  } catch (err) {
    console.error('Error deleting product:', err);
    alert('Error: ' + (err.response?.data?.error || err.message));
  } finally {
    deleting.value = false;
  }
};

// Variant Management Methods (inline in product form)
const addVariantGroup = () => {
  form.value.variants.push(createEmptyVariantGroup());
};

const removeVariantGroup = (index) => {
  form.value.variants.splice(index, 1);
};

const addOptionToVariant = (variantIndex) => {
  form.value.variants[variantIndex].options.push(createEmptyOption());
};

const removeOption = (variantIndex, optionIndex) => {
  form.value.variants[variantIndex].options.splice(optionIndex, 1);
};

// Existing Variant Management Methods
const addOptionToExistingVariant = (variantIndex) => {
  form.value.existingVariants[variantIndex].options.push(createEmptyOption());
};

const removeExistingOption = (variantIndex, optionIndex) => {
  form.value.existingVariants[variantIndex].options.splice(optionIndex, 1);
};

// Option image change handlers
const onExistingOptionImageChange = (e, variantIndex, optionIndex) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  form.value.existingVariants[variantIndex].options[optionIndex].imageFile = file;
  form.value.existingVariants[variantIndex].options[optionIndex].imagePreview = URL.createObjectURL(file);
};

const onNewOptionImageChange = (e, variantIndex, optionIndex) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  form.value.variants[variantIndex].options[optionIndex].imageFile = file;
  form.value.variants[variantIndex].options[optionIndex].imagePreview = URL.createObjectURL(file);
};

// Helper to upload option image and return URL
const uploadOptionImage = async (imageFile, productId, optionSku) => {
  if (!imageFile) return null;
  try {
    const base64 = await readFileAsDataURL(imageFile);
    const uploadRes = await api.post('/uploadProductImage', {
      imageBase64: base64,
      fileName: `variant_${optionSku}_${Date.now()}_${imageFile.name}`,
      product_id: productId
    });
    const img = uploadRes.data.product_image;
    return img?.imageUrl || null;
  } catch (err) {
    console.error('Error uploading option image:', err);
    return null;
  }
};

const confirmDeleteExistingVariant = (variantGroup) => {
  deleteVariantTarget.value = variantGroup;
  showDeleteVariantModal.value = true;
};

const deleteExistingVariant = () => {
  if (deleteVariantTarget.value) {
    // Mark for deletion on save
    form.value.variantsToDelete.push(deleteVariantTarget.value.id);
    // Remove from existing variants in the form
    const index = form.value.existingVariants.findIndex(v => v.id === deleteVariantTarget.value.id);
    if (index > -1) {
      form.value.existingVariants.splice(index, 1);
    }
  }
  showDeleteVariantModal.value = false;
  deleteVariantTarget.value = null;
};

// Lifecycle
onMounted(() => {
  loadProducts();
  loadCategories();
});

// Expose refresh method for parent
defineExpose({ refresh: loadProducts });
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
