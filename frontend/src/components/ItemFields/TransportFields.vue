<template>
  <div class="transport-fields">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="交通类型">
          <el-select v-model="localData.transport_type" placeholder="请选择交通类型">
            <el-option label="飞机" value="flight" />
            <el-option label="火车" value="train" />
            <el-option label="汽车" value="bus" />
            <el-option label="自驾" value="car" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="车次/航班号">
          <el-input
              v-model="localData.vehicle_number"
              placeholder="如：CZ3901、G1234"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="出发地">
          <el-input
              v-model="localData.departure_location"
              placeholder="出发地点"
          />
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="目的地">
          <el-input
              v-model="localData.arrival_location"
              placeholder="到达地点"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="预计出发时间">
          <el-time-picker
              v-model="localData.departure_time"
              placeholder="出发时间"
              format="HH:mm"
              value-format="HH:mm"
          />
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="预计到达时间">
          <el-time-picker
              v-model="localData.arrival_time"
              placeholder="到达时间"
              format="HH:mm"
              value-format="HH:mm"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="座位/舱位">
      <el-input
          v-model="localData.seat_class"
          placeholder="如：经济舱、商务座、软卧等"
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
  transport_type: 'flight',
  vehicle_number: '',
  departure_location: '',
  arrival_location: '',
  departure_time: '',
  arrival_time: '',
  seat_class: '',
  ...props.modelValue
})

watch(localData, (newData) => {
  emit('update:modelValue', { ...newData })
}, { deep: true })

watch(() => props.modelValue, (newValue) => {
  Object.assign(localData, newValue)
}, { deep: true })
</script>