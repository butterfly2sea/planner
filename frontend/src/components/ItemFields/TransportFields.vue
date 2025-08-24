<template>
  <div class="transport-fields">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="交通方式">
          <el-select v-model="localValue.type" placeholder="选择交通方式">
            <el-option label="飞机" value="flight"/>
            <el-option label="火车/高铁" value="train"/>
            <el-option label="汽车/大巴" value="bus"/>
            <el-option label="出租车" value="taxi"/>
            <el-option label="自驾" value="car"/>
            <el-option label="包车" value="charter"/>
            <el-option label="步行" value="walk"/>
            <el-option label="其他" value="other"/>
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="出发地点">
          <el-input v-model="localValue.departure_location" placeholder="出发地点"/>
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="到达地点">
          <el-input v-model="localValue.arrival_location" placeholder="到达地点"/>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="预订平台">
          <el-select v-model="localValue.booking_platform" placeholder="预订平台" allow-create>
            <el-option label="携程" value="ctrip"/>
            <el-option label="去哪儿" value="qunar"/>
            <el-option label="飞猪" value="fliggy"/>
            <el-option label="12306" value="12306"/>
            <el-option label="滴滴" value="didi"/>
            <el-option label="高德" value="gaode"/>
            <el-option label="现场购票" value="onsite"/>
            <el-option label="其他" value="other"/>
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="票号/订单号">
          <el-input v-model="localValue.ticket_number" placeholder="票号或订单号"/>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="座位号/车牌号">
          <el-input v-model="localValue.seat_info" placeholder="座位号或车牌号"/>
        </el-form-item>
      </el-col>
    </el-row>

    <!-- 航班/车次特定信息 -->
    <el-row v-if="['flight', 'train'].includes(localValue.type)" :gutter="20">
      <el-col :span="8">
        <el-form-item :label="localValue.type === 'flight' ? '航班号' : '车次号'">
          <el-input v-model="localValue.flight_number" :placeholder="localValue.type === 'flight' ? '航班号' : '车次号'"/>
        </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="出发时间">
          <el-time-picker
              v-model="localValue.departure_time"
              placeholder="出发时间"
              format="HH:mm"
              value-format="HH:mm"
          />
        </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="到达时间">
          <el-time-picker
              v-model="localValue.arrival_time"
              placeholder="到达时间"
              format="HH:mm"
              value-format="HH:mm"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <!-- 航班特定信息 -->
    <el-row v-if="localValue.type === 'flight'" :gutter="20">
      <el-col :span="8">
        <el-form-item label="航空公司">
          <el-select v-model="localValue.airline" placeholder="选择航空公司" allow-create>
            <el-option label="中国国航" value="CA"/>
            <el-option label="南方航空" value="CZ"/>
            <el-option label="东方航空" value="MU"/>
            <el-option label="海南航空" value="HU"/>
            <el-option label="厦门航空" value="MF"/>
            <el-option label="四川航空" value="3U"/>
            <el-option label="深圳航空" value="ZH"/>
            <el-option label="春秋航空" value="9C"/>
            <el-option label="其他" value="other"/>
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="舱位等级">
          <el-select v-model="localValue.class" placeholder="选择舱位">
            <el-option label="经济舱" value="economy"/>
            <el-option label="商务舱" value="business"/>
            <el-option label="头等舱" value="first"/>
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="登机口">
          <el-input v-model="localValue.gate" placeholder="登机口"/>
        </el-form-item>
      </el-col>
    </el-row>

    <!-- 火车特定信息 -->
    <el-row v-if="localValue.type === 'train'" :gutter="20">
      <el-col :span="12">
        <el-form-item label="座位类型">
          <el-select v-model="localValue.seat_type" placeholder="选择座位类型">
            <el-option label="硬座" value="hard_seat"/>
            <el-option label="软座" value="soft_seat"/>
            <el-option label="硬卧" value="hard_sleeper"/>
            <el-option label="软卧" value="soft_sleeper"/>
            <el-option label="二等座" value="second_class"/>
            <el-option label="一等座" value="first_class"/>
            <el-option label="商务座" value="business"/>
            <el-option label="特等座" value="premium"/>
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="车厢号">
          <el-input v-model="localValue.carriage" placeholder="车厢号"/>
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-form-item label="预计时长">
          <el-input v-model="localValue.duration" placeholder="如：2小时30分钟"/>
        </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="距离">
          <el-input v-model="localValue.distance" placeholder="如：350公里"/>
        </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="票价">
          <el-input-number
              v-model="localValue.ticket_price"
              :min="0"
              :precision="2"
              placeholder="票价"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="联系电话">
      <el-input v-model="localValue.contact_phone" placeholder="司机或服务商电话"/>
    </el-form-item>

    <el-form-item label="特殊说明">
      <el-input
          v-model="localValue.notes"
          type="textarea"
          :rows="3"
          placeholder="如：需要接机、行李托运、特殊需求等"
          maxlength="200"
          show-word-limit
      />
    </el-form-item>

    <!-- 取消政策 -->
    <el-form-item v-if="['flight', 'train', 'bus'].includes(localValue.type)" label="取消政策">
      <el-input v-model="localValue.cancellation_policy" placeholder="退改签政策说明"/>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface TransportProperties {
  type?: string
  departure_location?: string
  arrival_location?: string
  booking_platform?: string
  ticket_number?: string
  seat_info?: string
  flight_number?: string
  departure_time?: string
  arrival_time?: string
  airline?: string
  class?: string
  gate?: string
  seat_type?: string
  carriage?: string
  duration?: string
  distance?: string
  ticket_price?: number
  contact_phone?: string
  notes?: string
  cancellation_policy?: string
}

interface Props {
  modelValue: TransportProperties
}

interface Emits {
  (e: 'update:modelValue', value: TransportProperties): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localValue = computed({
  get: () => ({
    type: '',
    departure_location: '',
    arrival_location: '',
    booking_platform: '',
    ticket_number: '',
    seat_info: '',
    flight_number: '',
    departure_time: '',
    arrival_time: '',
    airline: '',
    class: '',
    gate: '',
    seat_type: '',
    carriage: '',
    duration: '',
    distance: '',
    ticket_price: 0,
    contact_phone: '',
    notes: '',
    cancellation_policy: '',
    ...props.modelValue
  }),
  set: (value) => {
    emit('update:modelValue', value)
  }
})
</script>