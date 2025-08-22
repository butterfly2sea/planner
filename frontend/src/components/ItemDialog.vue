<template>
  <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑元素' : '添加元素'"
      width="800px"
      :before-close="handleClose"
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
              <el-form-item label="元素类型" prop="item_type">
                <el-select
                    v-model="form.item_type"
                    placeholder="请选择元素类型"
                    @change="handleTypeChange"
                >
                  <el-option
                      v-for="(config, type) in typeConfigs"
                      :key="type"
                      :label="config.name"
                      :value="type"
                  >
                    <i :class="`fas ${config.icon}`" :style="{ color: config.color }" />
                    {{ config.name }}
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="优先级" prop="priority">
                <el-select v-model="form.priority" placeholder="请选择优先级">
                  <el-option label="低" :value="1" />
                  <el-option label="中" :value="3" />
                  <el-option label="高" :value="5" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="名称" prop="name">
            <el-input
                v-model="form.name"
                placeholder="请输入元素名称"
                maxlength="100"
                show-word-limit
            />
          </el-form-item>

          <el-form-item label="描述" prop="description">
            <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="请输入元素描述（可选）"
                maxlength="500"
                show-word-limit
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开始时间" prop="start_datetime">
                <el-date-picker
                    v-model="form.start_datetime"
                    type="datetime"
                    placeholder="选择开始时间"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DDTHH:mm:ss"
                    style="width: 100%"
                />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="结束时间" prop="end_datetime">
                <el-date-picker
                    v-model="form.end_datetime"
                    type="datetime"
                    placeholder="选择结束时间"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DDTHH:mm:ss"
                    style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="费用" prop="cost">
            <el-input-number
                v-model="form.cost"
                :min="0"
                :precision="2"
                placeholder="请输入费用"
                style="width: 200px"
            />
            <span style="margin-left: 8px; color: #999;">元</span>
          </el-form-item>
        </el-tab-pane>

        <!-- 位置信息 -->
        <el-tab-pane label="位置信息" name="location">
          <el-form-item label="地址" prop="address">
            <el-input
                v-model="form.address"
                placeholder="请输入地址"
                maxlength="200"
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
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <el-button @click="handleLocationPick">
              <el-icon><Aim /></el-icon>
              在地图上选择位置
            </el-button>
          </el-form-item>
        </el-tab-pane>

        <!-- 图片上传 -->
        <el-tab-pane label="图片" name="images">
          <el-form-item label="图片上传">
            <el-upload
                v-model:file-list="imageFileList"
                action="/api/v1/upload/image"
                list-type="picture-card"
                :auto-upload="false"
                :on-change="handleImageChange"
                :on-remove="handleImageRemove"
                accept="image/*"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
          </el-form-item>
        </el-tab-pane>

        <!-- 类型特定字段 -->
        <el-tab-pane v-if="typeSpecificFields" label="详细信息" name="details">
          <component :is="typeSpecificFields" v-model="form.properties" />
        </el-tab-pane>
      </el-tabs>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          {{ isEditing ? '更新' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed, markRaw } from 'vue'
import { useItemStore } from '@/stores/item'
import { usePlanStore } from '@/stores/plan'
import type { TravelItem, TypeConfig } from '@/types'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'

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
  (e: 'location-pick'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const itemStore = useItemStore()
const planStore = usePlanStore()

const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const activeTab = ref('basic')
const imageFileList = ref<UploadFile[]>([])

const form = reactive({
  item_type: '',
  name: '',
  description: '',
  start_datetime: '',
  end_datetime: '',
  cost: undefined as number | undefined,
  priority: 3,
  address: '',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  properties: {} as Record<string, any>
})

const typeConfigs: Record<string, TypeConfig> = {
  accommodation: { name: '住宿', icon: 'fa-bed', color: '#805ad5' },
  transport: { name: '交通', icon: 'fa-plane', color: '#3182ce' },
  attraction: { name: '景点', icon: 'fa-mountain', color: '#48bb78' },
  photo_spot: { name: '拍照点', icon: 'fa-camera', color: '#ed8936' },
  rest_area: { name: '休息点', icon: 'fa-coffee', color: '#38b2ac' },
  checkpoint: { name: '检查站', icon: 'fa-shield-alt', color: '#e53e3e' },
  other: { name: '其他', icon: 'fa-ellipsis-h', color: '#718096' }
}

const typeSpecificComponents: Record<string, any> = {
  accommodation: markRaw(AccommodationFields),
  transport: markRaw(TransportFields),
  attraction: markRaw(AttractionFields)
}

const rules: FormRules = {
  item_type: [
    { required: true, message: '请选择元素类型', trigger: 'change' }
  ],
  name: [
    { required: true, message: '请输入元素名称', trigger: 'blur' },
    { min: 1, max: 100, message: '名称长度应为1-100个字符', trigger: 'blur' }
  ],
  start_datetime: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  end_datetime: [
    { required: true, message: '请选择结束时间', trigger: 'change' }
  ]
}

const isEditing = computed(() => !!props.item)
const loading = computed(() => itemStore.loading)

const typeSpecificFields = computed(() => {
  return typeSpecificComponents[form.item_type] || null
})

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    if (props.item) {
      populateForm(props.item)
    } else {
      resetForm()
    }
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

const resetForm = () => {
  Object.assign(form, {
    item_type: '',
    name: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    cost: undefined,
    priority: 3,
    address: '',
    latitude: undefined,
    longitude: undefined,
    properties: {}
  })
  imageFileList.value = []
  activeTab.value = 'basic'
  formRef.value?.clearValidate()
}

const populateForm = (item: TravelItem) => {
  Object.assign(form, {
    item_type: item.item_type,
    name: item.name,
    description: item.description || '',
    start_datetime: item.start_datetime || '',
    end_datetime: item.end_datetime || '',
    cost: item.cost,
    priority: item.priority,
    address: item.address || '',
    latitude: item.latitude,
    longitude: item.longitude,
    properties: item.properties || {}
  })

  // 加载图片
  if (item.images && item.images.length > 0) {
    imageFileList.value = item.images.map((url, index) => ({
      uid: index,
      name: `image-${index}`,
      status: 'success',
      url
    }))
  } else {
    imageFileList.value = []
  }
}

const handleTypeChange = () => {
  form.properties = {}
}

const handleLocationPick = () => {
  emit('location-pick')
}

const handleImageChange = (file: UploadFile) => {
  // TODO: 实现图片上传逻辑
  console.log('Image changed:', file)
}

const handleImageRemove = (file: UploadFile) => {
  // TODO: 实现图片删除逻辑
  console.log('Image removed:', file)
}

const handleClose = () => {
  dialogVisible.value = false
}

const handleSubmit = async () => {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    const itemData = {
      plan_id: planStore.currentPlanId!,
      ...form,
      images: imageFileList.value.map(file => file.url).filter(Boolean)
    }

    if (isEditing.value && props.item) {
      await itemStore.updateItem(props.item.id, {
        id: props.item.id,
        ...itemData
      })
    } else {
      await itemStore.createItem(itemData)
    }

    emit('saved')
    dialogVisible.value = false
  } catch (error) {
    // 错误已在store中处理
  }
}

// 暴露方法供父组件调用
const setLocation = (lngLat: { lng: number; lat: number }) => {
  form.longitude = Number(lngLat.lng.toFixed(6))
  form.latitude = Number(lngLat.lat.toFixed(6))
}

defineExpose({
  setLocation
})
</script>

<style lang="scss" scoped>
.item-dialog {
  :deep(.el-dialog__body) {
    padding: 20px 24px;
  }
}

.item-form {
  .form-tabs {
    :deep(.el-tabs__content) {
      padding-top: 20px;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>