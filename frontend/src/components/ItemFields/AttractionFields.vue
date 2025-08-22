<template>
  <div class="attraction-fields">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="建议游览时长">
          <el-input-number
              v-model="localData.visit_duration"
              :min="0.5"
              :step="0.5"
              placeholder="小时"
          />
          <span style="margin-left: 8px;">小时</span>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="最佳游览时间">
          <el-select v-model="localData.best_time" placeholder="请选择时间">
            <el-option label="上午" value="morning" />
            <el-option label="下午" value="afternoon" />
            <el-option label="傍晚" value="evening" />
            <el-option label="夜晚" value="night" />
            <el-option label="任何时间" value="anytime" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="门票价格">
          <el-input-number
              v-model="localData.ticket_price"
              :min="0"
              :precision="2"
              placeholder="门票价格"
          />
          <span style="margin-left: 8px;">元</span>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="推荐指数">
          <el-rate
              v-model="localData.rating"
              :max="5"
              show-score
              text-color="#ff9900"
              score-template="{value} 分"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="景点特色">
      <el-checkbox-group v-model="localData.features">
        <el-checkbox label="摄影圣地">摄影圣地</el-checkbox>
        <el-checkbox label="网红打卡">网红打卡</el-checkbox>
        <el-checkbox label="自然风光">自然风光</el-checkbox>
        <el-checkbox label="人文历史">人文历史</el-checkbox>
        <el-checkbox label="户外运动">户外运动</el-checkbox>
        <el-checkbox label="亲子友好">亲子友好</el-checkbox>
      </el-checkbox-group>
    </el-form-item>

    <el-form-item label="游览建议">
      <el-input
          v-model="localData.visit_tips"
          type="textarea"
          :rows="3"
          placeholder="如：需要提前预约、注意防晒、穿舒适鞋子等"
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
  visit_duration: 2,
  best_time: 'morning',
  ticket_price: 0,
  rating: 5,
  features: [],
  visit_tips: '',
  ...props.modelValue
})

watch(localData, (newData) => {
  emit('update:modelValue', { ...newData })
}, { deep: true })

watch(() => props.modelValue, (newValue) => {
  Object.assign(localData, newValue)
}, { deep: true })
</script>
