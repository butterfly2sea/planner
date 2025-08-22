<template>
  <el-dialog
      v-model="dialogVisible"
      title="编辑计划"
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
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          更新
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import type { Plan } from '@/types'
import type { FormInstance, FormRules } from 'element-plus'

interface Props {
  modelValue: boolean
  plan?: Plan | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated', plan: Plan): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const planStore = usePlanStore()

const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
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

const loading = computed(() => planStore.loading)

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val && props.plan) {
    populateForm(props.plan)
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

const populateForm = (plan: Plan) => {
  form.name = plan.name
  form.description = plan.description || ''
}

const handleClose = () => {
  dialogVisible.value = false
}

const handleSubmit = async () => {
  if (!formRef.value || !props.plan) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    const updatedPlan = await planStore.updatePlan(props.plan.id, {
      name: form.name,
      description: form.description || undefined
    })

    emit('updated', updatedPlan)
    dialogVisible.value = false
  } catch (error) {
    // 错误已在store中处理
  }
}
</script>