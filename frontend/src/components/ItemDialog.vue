<template>
  <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑元素' : '添加元素'"
      width="800px"
      :before-close="handleClose"
      :close-on-click-modal="!isLocationPicking"
      :close-on-press-escape="!isLocationPicking"
      destroy-on-close
      class="item-dialog"
  >
    <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="item-form"
    >
      <el-tabs v-model="activeTab" class="form-tabs">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="元素名称" prop="name">
                <el-input
                    v-model="form.name"
                    placeholder="请输入元素名称"
                    maxlength="100"
                    show-word-limit
                />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="元素类型" prop="item_type">
                <el-select
                    v-model="form.item_type"
                    placeholder="请选择类型"
                    style="width: 100%"
                    @change="handleTypeChange"
                >
                  <el-option
                      v-for="(config, type) in typeConfigs"
                      :key="type"
                      :value="type"
                      :label="config.name"
                  >
                    <span style="float: left">
                      <i :class="`fas ${config.icon}`" :style="`color: ${config.color}`"></i>
                      {{ config.name }}
                    </span>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="描述信息" prop="description">
            <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="请输入描述信息（可选）"
                maxlength="500"
                show-word-limit
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="优先级">
                <el-select v-model="form.priority" placeholder="选择优先级">
                  <el-option label="普通" value="normal"/>
                  <el-option label="重要" value="high"/>
                  <el-option label="一般" value="medium"/>
                  <el-option label="较低" value="low"/>
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="8">
              <el-form-item label="预估费用">
                <el-input-number
                    v-model="form.cost"
                    :min="0"
                    :precision="2"
                    placeholder="费用"
                    style="width: 100%"
                />
              </el-form-item>
            </el-col>

            <el-col :span="8">
              <el-form-item label="状态">
                <el-select v-model="form.status" placeholder="选择状态">
                  <el-option label="待处理" value="pending"/>
                  <el-option label="进行中" value="in_progress"/>
                  <el-option label="已完成" value="completed"/>
                  <el-option label="已取消" value="cancelled"/>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 时间安排 -->
        <el-tab-pane label="时间安排" name="time">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开始时间">
                <el-date-picker
                    v-model="form.start_datetime"
                    type="datetime"
                    placeholder="选择开始时间"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    style="width: 100%"
                />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="结束时间">
                <el-date-picker
                    v-model="form.end_datetime"
                    type="datetime"
                    placeholder="选择结束时间"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 位置信息 -->
        <el-tab-pane label="位置信息" name="location">
          <el-form-item label="地址" prop="address">
            <el-input
                v-model="form.address"
                placeholder="请输入地址信息（可选）"
                maxlength="200"
                show-word-limit
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="纬度" prop="latitude">
                <el-input-number
                    v-model="form.latitude"
                    :precision="6"
                    placeholder="纬度"
                    style="width: 100%"
                    :controls="false"
                />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="经度" prop="longitude">
                <el-input-number
                    v-model="form.longitude"
                    :precision="6"
                    placeholder="经度"
                    style="width: 100%"
                    :controls="false"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <div class="location-actions">
              <el-button
                  v-if="!isLocationPicking"
                  @click="startLocationPicking"
                  :icon="Aim"
              >
                在地图上选择位置
              </el-button>

              <div v-else class="location-picking-controls">
                <el-alert
                    title="位置选择模式"
                    description="请在地图上点击选择位置，或点击取消按钮返回"
                    type="info"
                    :closable="false"
                    show-icon
                    class="picking-alert"
                />
                <div class="picking-buttons">
                  <el-button @click="cancelLocationPicking" :icon="Close">
                    取消选择
                  </el-button>
                  <el-button
                      v-if="form.latitude && form.longitude"
                      type="success"
                      @click="confirmLocation"
                      :icon="Check"
                  >
                    确认位置 ({{ form.latitude?.toFixed(6) }}, {{ form.longitude?.toFixed(6) }})
                  </el-button>
                </div>
              </div>

              <el-button
                  v-if="form.latitude && form.longitude && !isLocationPicking"
                  @click="clearLocation"
                  type="danger"
                  plain
                  :icon="Delete"
              >
                清除位置
              </el-button>
            </div>
          </el-form-item>

          <!-- 位置预览 -->
          <el-form-item v-if="form.latitude && form.longitude && !isLocationPicking" label="位置预览">
            <div class="location-preview">
              <el-tag type="success">
                纬度: {{ form.latitude.toFixed(6) }}°
              </el-tag>
              <el-tag type="success">
                经度: {{ form.longitude.toFixed(6) }}°
              </el-tag>
            </div>
          </el-form-item>
        </el-tab-pane>

        <!-- 图片上传 -->
        <el-tab-pane label="图片" name="images">
          <el-form-item label="图片上传">
            <el-upload
                ref="uploadRef"
                v-model:file-list="imageFileList"
                action="/api/v1/upload/image"
                list-type="picture-card"
                :auto-upload="false"
                :on-change="handleImageChange"
                :on-remove="handleImageRemove"
                :on-preview="handleImagePreview"
                accept="image/*"
                :limit="5"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>

            <div class="upload-tips">
              <p>支持 JPG、PNG 格式，单个文件不超过 5MB，最多上传 5 张图片</p>
            </div>
          </el-form-item>
        </el-tab-pane>

        <!-- 类型特定字段 -->
        <el-tab-pane
            v-if="typeSpecificFields"
            label="详细信息"
            name="details"
        >
          <component
              :is="typeSpecificFields"
              v-model="form.properties"
          />
        </el-tab-pane>
      </el-tabs>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button
            @click="handleClose"
            :disabled="isLocationPicking"
        >
          取消
        </el-button>
        <el-button
            type="primary"
            :loading="loading"
            @click="handleSubmit"
            :disabled="isLocationPicking"
        >
          {{ isEditing ? '更新' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 图片预览对话框 -->
  <el-dialog
      v-model="showImagePreview"
      title="图片预览"
      width="60%"
      :append-to-body="true"
  >
    <img :src="previewImageUrl" style="width: 100%" alt="预览图片"/>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed, markRaw, nextTick } from 'vue'
import { useItemStore } from '@/stores/item'
import { usePlanStore } from '@/stores/plan'
import type { TravelItem, TypeConfig, ItemType, Priority, ItemStatus, CreateItemRequest, UpdateItemRequest } from '@/types'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Aim, Close, Check, Delete, Plus } from '@element-plus/icons-vue'

// 类型特定组件
import AccommodationFields from './ItemFields/AccommodationFields.vue'
import TransportFields from './ItemFields/TransportFields.vue'
import AttractionFields from './ItemFields/AttractionFields.vue'

interface Props {
  modelValue: boolean
  item?: TravelItem | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
  (e: 'location-pick-start'): void
  (e: 'location-pick-cancel'): void
  (e: 'location-picked', location: { lng: number; lat: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const itemStore = useItemStore()
const planStore = usePlanStore()

const formRef = ref<FormInstance>()
const uploadRef = ref()
const dialogVisible = ref(false)
const activeTab = ref('basic')
const isLocationPicking = ref(false)
const showImagePreview = ref(false)
const previewImageUrl = ref('')

// 修复: 明确定义表单类型
interface FormData {
  name: string
  item_type: ItemType
  description?: string
  start_datetime?: string
  end_datetime?: string
  cost?: number
  priority: Priority
  status: ItemStatus
  address?: string
  latitude?: number
  longitude?: number
  properties: Record<string, any>
}

// 表单数据
const form = reactive<FormData>({
  name: '',
  item_type: 'other',
  description: '',
  start_datetime: '',
  end_datetime: '',
  cost: undefined,
  priority: 'normal',
  status: 'pending',
  address: '',
  latitude: undefined,
  longitude: undefined,
  properties: {}
})

// 图片文件列表
const imageFileList = ref<UploadFile[]>([])

const rules: FormRules = {
  name: [
    { required: true, message: '请输入元素名称', trigger: 'blur' },
    { min: 1, max: 100, message: '元素名称长度应为1-100个字符', trigger: 'blur' }
  ],
  item_type: [
    { required: true, message: '请选择元素类型', trigger: 'change' }
  ]
}

const typeConfigs: Record<string, TypeConfig> = {
  accommodation: { name: '住宿', icon: 'fa-bed', color: '#805ad5' },
  transport: { name: '交通', icon: 'fa-plane', color: '#3182ce' },
  attraction: { name: '景点', icon: 'fa-mountain', color: '#48bb78' },
  photo_spot: { name: '拍照点', icon: 'fa-camera', color: '#ed8936' },
  rest_area: { name: '休息点', icon: 'fa-coffee', color: '#38b2ac' },
  checkpoint: { name: '检查站', icon: 'fa-shield-alt', color: '#e53e3e' },
  other: { name: '其他', icon: 'fa-ellipsis-h', color: '#718096' }
}

// 计算属性
const isEditing = computed(() => !!props.item)
const loading = computed(() => itemStore.loading)

const typeSpecificFields = computed(() => {
  const fieldComponents = {
    accommodation: markRaw(AccommodationFields),
    transport: markRaw(TransportFields),
    attraction: markRaw(AttractionFields)
  }

  return fieldComponents[form.item_type as keyof typeof fieldComponents]
})

// 监听器
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    resetForm()
    if (props.item) {
      populateForm(props.item)
    }
  } else {
    // 对话框关闭时清理位置选择状态
    if (isLocationPicking.value) {
      cancelLocationPicking()
    }
  }
})

watch(dialogVisible, (val) => {
  if (!val && isLocationPicking.value) {
    // 对话框关闭时取消位置选择
    cancelLocationPicking()
  }
  emit('update:modelValue', val)
})

// 方法
const resetForm = () => {
  Object.assign(form, {
    name: '',
    item_type: 'other' as ItemType,
    description: '',
    start_datetime: '',
    end_datetime: '',
    cost: undefined,
    priority: 'normal' as Priority,
    status: 'pending' as ItemStatus,
    address: '',
    latitude: undefined,
    longitude: undefined,
    properties: {}
  })

  imageFileList.value = []
  activeTab.value = 'basic'
  isLocationPicking.value = false

  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const populateForm = (item: TravelItem) => {
  Object.assign(form, {
    name: item.name,
    item_type: item.item_type,
    description: item.description || '',
    start_datetime: item.start_datetime || '',
    end_datetime: item.end_datetime || '',
    cost: item.cost,
    priority: item.priority || 'normal',
    status: item.status || 'pending',
    address: item.address || '',
    latitude: item.latitude,
    longitude: item.longitude,
    properties: item.properties || {}
  })

  // 加载图片
  if (item.images && item.images.length > 0) {
    imageFileList.value = item.images.map((url, index) => ({
      uid: Date.now() + index,
      name: `image-${index}`,
      status: 'success' as const,
      url
    }))
  } else {
    imageFileList.value = []
  }
}

const handleTypeChange = () => {
  form.properties = {}
}

// 位置选择相关方法
const startLocationPicking = () => {
  console.log('Starting location picking...')
  isLocationPicking.value = true
  emit('location-pick-start')
  ElMessage.info('请在地图上点击选择位置')
}

const cancelLocationPicking = () => {
  console.log('Cancelling location picking...')
  isLocationPicking.value = false
  emit('location-pick-cancel')
}

const confirmLocation = () => {
  if (form.latitude && form.longitude) {
    isLocationPicking.value = false
    ElMessage.success(`位置已确认: ${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`)
  }
}

const clearLocation = () => {
  form.latitude = undefined
  form.longitude = undefined
  form.address = ''
  ElMessage.success('位置信息已清除')
}

// 接收来自父组件的位置选择结果
const setLocation = (lngLat: { lng: number; lat: number }) => {
  console.log('Setting location:', lngLat)
  form.longitude = Number(lngLat.lng.toFixed(6))
  form.latitude = Number(lngLat.lat.toFixed(6))

  // 不自动关闭位置选择模式，让用户手动确认
  ElMessage.success('位置已设置，请点击"确认位置"按钮确认')
}

// 图片处理
const handleImageChange = (file: UploadFile) => {
  console.log('Image changed:', file)
  // TODO: 实现图片上传逻辑
}

const handleImageRemove = (file: UploadFile) => {
  console.log('Image removed:', file)
  // TODO: 实现图片删除逻辑
}

const handleImagePreview = (file: UploadFile) => {
  previewImageUrl.value = file.url!
  showImagePreview.value = true
}

const handleClose = () => {
  if (isLocationPicking.value) {
    ElMessage.warning('请先取消位置选择')
    return
  }
  dialogVisible.value = false
}

// 修复: 确保类型匹配
const handleSubmit = async () => {
  if (!formRef.value) return

  if (isLocationPicking.value) {
    ElMessage.warning('请先完成位置选择或取消位置选择')
    return
  }

  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    const images = imageFileList.value
        .filter(file => file.url)
        .map(file => file.url!)

    if (isEditing.value && props.item) {
      // 修复: 构造符合UpdateItemRequest类型的参数
      const updateData: UpdateItemRequest = {
        id: props.item.id,
        name: form.name,
        item_type: form.item_type,
        description: form.description || undefined,
        start_datetime: form.start_datetime || undefined,
        end_datetime: form.end_datetime || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        address: form.address || undefined,
        cost: form.cost,
        priority: form.priority,
        status: form.status,
        properties: form.properties,
        images: images
      }

      await itemStore.updateItem(props.item.id, updateData)
      ElMessage.success('元素更新成功')
    } else {
      // 修复: 构造符合CreateItemRequest类型的参数
      const createData: CreateItemRequest = {
        plan_id: planStore.currentPlanId!,
        name: form.name,
        item_type: form.item_type,
        description: form.description || undefined,
        start_datetime: form.start_datetime || undefined,
        end_datetime: form.end_datetime || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        address: form.address || undefined,
        cost: form.cost,
        priority: form.priority,
        status: form.status,
        properties: form.properties,
        images: images
      }

      await itemStore.createItem(createData)
      ElMessage.success('元素创建成功')
    }

    emit('saved')
    dialogVisible.value = false
  } catch (error) {
    console.error('Save failed:', error)
    // 错误已在store中处理
  }
}

// 暴露方法给父组件调用
defineExpose({
  setLocation,
  startLocationPicking,
  cancelLocationPicking
})
</script>

<style lang="scss" scoped>
.item-dialog {
  :deep(.el-dialog__body) {
    padding: 20px 24px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.item-form {
  .form-tabs {
    :deep(.el-tabs__content) {
      padding-top: 20px;
    }
  }
}

.location-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.location-picking-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .picking-alert {
    margin: 0;
  }

  .picking-buttons {
    display: flex;
    gap: 12px;
  }
}

.location-preview {
  display: flex;
  gap: 8px;
}

.upload-tips {
  margin-top: 8px;

  p {
    margin: 0;
    color: #909399;
    font-size: 12px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 位置选择时的特殊样式
.item-dialog {
  &:has(.location-picking-controls) {
    :deep(.el-dialog__header) {
      background: #f0f9ff;
      border-bottom: 1px solid #e0f2fe;
    }
  }
}
</style>