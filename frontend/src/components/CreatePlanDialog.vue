<template>
  <el-dialog
      v-model="dialogVisible"
      title="创建新计划"
      width="500px"
      :before-close="handleClose"
  >
    <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
    >
      <el-form-item label="计划名称" prop="name">
        <el-input
            v-model="form.name"
            placeholder="请输入计划名称"
            maxlength="50"
            show-word-limit
            @keyup.enter="handleSubmit"
        />
      </el-form-item>

      <el-form-item label="计划描述" prop="description">
        <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入计划描述（可选）"
            maxlength="200"
            show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
            type="primary"
            :loading="loading"
            @click="handleSubmit"
            :disabled="!form.name.trim()"
        >
          创建
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// 修复: 添加所有必需的导入
import { reactive, ref, watch, computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import type { FormInstance, FormRules } from 'element-plus'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', plan: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const planStore = usePlanStore()

const formRef = ref<FormInstance>()
const dialogVisible = ref(false)

// 使用reactive确保表单数据响应式
const form = reactive({
  name: '',
  description: ''
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入计划名称', trigger: 'blur' },
    { min: 2, max: 50, message: '计划名称长度应为2-50个字符', trigger: 'blur' }
  ]
}

// 修复: 确保computed正确导入和定义
const loading = computed(() => planStore.loading)

// 监听props变化
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    resetForm()
  }
}, { immediate: true })

// 监听dialog状态变化
watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

const resetForm = () => {
  form.name = ''
  form.description = ''
  // 清除验证状态
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const handleClose = () => {
  dialogVisible.value = false
}

// 修复: 确保事件处理函数正确定义并添加错误处理
const handleSubmit = async () => {
  if (!formRef.value) {
    console.error('Form ref not available')
    return
  }

  try {
    // 验证表单
    const valid = await formRef.value.validate()
    if (!valid) {
      console.warn('Form validation failed')
      return
    }

    console.log('Submitting form with data:', form)

    // 创建计划
    const plan = await planStore.createPlan({
      name: form.name.trim(),
      description: form.description.trim() || undefined
    })

    console.log('Plan created successfully:', plan)

    // 发送事件
    emit('created', plan)
    dialogVisible.value = false
  } catch (error) {
    console.error('Failed to create plan:', error)
    // 错误已在store中处理，这里不需要额外处理
  }
}

// 修复: 添加nextTick导入以确保DOM更新
import { nextTick } from 'vue'
</script>

<style lang="scss" scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 增加一些视觉反馈
.el-button {
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>