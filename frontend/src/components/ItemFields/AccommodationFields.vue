<template>
  <div class="accommodation-fields">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="住宿类型">
          <el-select v-model="localData.accommodation_type" placeholder="请选择住宿类型">
            <el-option label="酒店" value="hotel" />
            <el-option label="客栈" value="guesthouse" />
            <el-option label="露营" value="camping" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="房间数量">
          <el-input-number
              v-model="localData.room_count"
              :min="1"
              placeholder="房间数量"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="入住时间">
          <el-time-picker
              v-model="localData.check_in_time"
              placeholder="入住时间"
              format="HH:mm"
              value-format="HH:mm"
          />
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="退房时间">
          <el-time-picker
              v-model="localData.check_out_time"
              placeholder="退房时间"
              format="HH:mm"
              value-format="HH:mm"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="特殊要求">
      <el-input
          v-model="localData.special_requirements"
          type="textarea"
          :rows="2"
          placeholder="如：无烟房、高层、临窗等"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

interface Props {
  modelValue: Record<string, any>
}

interface Emits {
  (e: 'update:modelValue', value: Record<string, any>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localData = reactive({
  accommodation_type: 'hotel',
  room_count: 1,
  check_in_time: '14:00',
  check_out_time: '12:00',
  special_requirements: '',
  ...props.modelValue
})

watch(localData, (newData) => {
  emit('update:modelValue', { ...newData })
}, { deep: true })

watch(() => props.modelValue, (newValue) => {
  Object.assign(localData, newValue)
}, { deep: true })
</script>