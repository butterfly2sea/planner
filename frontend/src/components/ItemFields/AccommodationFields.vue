<template>
  <div class="accommodation-fields">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="酒店类型">
          <el-select v-model="localValue.type" placeholder="选择酒店类型">
            <el-option label="经济型酒店" value="economy"/>
            <el-option label="商务酒店" value="business"/>
            <el-option label="度假酒店" value="resort"/>
            <el-option label="民宿/客栈" value="guesthouse"/>
            <el-option label="青年旅社" value="hostel"/>
            <el-option label="公寓" value="apartment"/>
            <el-option label="其他" value="other"/>
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="星级">
          <el-rate
              v-model="localValue.rating"
              :max="5"
              show-text
              :texts="['1星', '2星', '3星', '4星', '5星']"
              allow-half
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-form-item label="房间类型">
          <el-input v-model="localValue.room_type" placeholder="如：标准间、大床房"/>
        </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="入住日期">
          <el-date-picker
              v-model="localValue.check_in_date"
              type="date"
              placeholder="选择入住日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="退房日期">
          <el-date-picker
              v-model="localValue.check_out_date"
              type="date"
              placeholder="选择退房日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="预订平台">
          <el-select v-model="localValue.booking_platform" placeholder="预订平台" allow-create>
            <el-option label="携程" value="ctrip"/>
            <el-option label="去哪儿" value="qunar"/>
            <el-option label="美团" value="meituan"/>
            <el-option label="飞猪" value="fliggy"/>
            <el-option label="Booking.com" value="booking"/>
            <el-option label="Airbnb" value="airbnb"/>
            <el-option label="酒店官网" value="official"/>
            <el-option label="现场预订" value="onsite"/>
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="订单号">
          <el-input v-model="localValue.booking_reference" placeholder="预订确认号"/>
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-form-item label="每晚价格">
          <el-input-number
              v-model="localValue.price_per_night"
              :min="0"
              :precision="2"
              placeholder="每晚价格"
          />
        </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="住宿天数">
          <el-input-number
              v-model="localValue.nights"
              :min="1"
              placeholder="住宿天数"
          />
        </el-form-item>
      </el-col>

      <el-col :span="8">
        <el-form-item label="房间数">
          <el-input-number
              v-model="localValue.rooms"
              :min="1"
              placeholder="房间数量"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="设施服务">
      <el-checkbox-group v-model="localValue.amenities">
        <el-checkbox label="wifi" border>免费WiFi</el-checkbox>
        <el-checkbox label="parking" border>停车场</el-checkbox>
        <el-checkbox label="breakfast" border>早餐</el-checkbox>
        <el-checkbox label="gym" border>健身房</el-checkbox>
        <el-checkbox label="pool" border>游泳池</el-checkbox>
        <el-checkbox label="spa" border>SPA</el-checkbox>
        <el-checkbox label="restaurant" border>餐厅</el-checkbox>
        <el-checkbox label="bar" border>酒吧</el-checkbox>
        <el-checkbox label="laundry" border>洗衣服务</el-checkbox>
        <el-checkbox label="shuttle" border>接送服务</el-checkbox>
      </el-checkbox-group>
    </el-form-item>

    <el-form-item label="联系电话">
      <el-input v-model="localValue.contact_phone" placeholder="酒店联系电话"/>
    </el-form-item>

    <el-form-item label="特殊要求">
      <el-input
          v-model="localValue.special_requests"
          type="textarea"
          :rows="3"
          placeholder="如：无烟房间、高层、安静等特殊需求"
          maxlength="200"
          show-word-limit
      />
    </el-form-item>

    <el-form-item label="取消政策">
      <el-input v-model="localValue.cancellation_policy" placeholder="取消政策说明"/>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import {computed, watch} from 'vue'

interface AccommodationProperties {
  type?: string
  rating?: number
  room_type?: string
  check_in_date?: string
  check_out_date?: string
  booking_platform?: string
  booking_reference?: string
  price_per_night?: number
  nights?: number
  rooms?: number
  amenities?: string[]
  contact_phone?: string
  special_requests?: string
  cancellation_policy?: string
}

interface Props {
  modelValue: AccommodationProperties
}

interface Emits {
  (e: 'update:modelValue', value: AccommodationProperties): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localValue = computed({
  get: () => ({
    type: '',
    rating: 0,
    room_type: '',
    check_in_date: '',
    check_out_date: '',
    booking_platform: '',
    booking_reference: '',
    price_per_night: 0,
    nights: 1,
    rooms: 1,
    amenities: [],
    contact_phone: '',
    special_requests: '',
    cancellation_policy: '',
    ...props.modelValue
  }),
  set: (value) => {
    emit('update:modelValue', value)
  }
})

// 监听入住和退房日期变化，自动计算天数
watch([() => localValue.value.check_in_date, () => localValue.value.check_out_date], ([checkIn, checkOut]) => {
  if (checkIn && checkOut) {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > 0) {
      localValue.value = {
        ...localValue.value,
        nights: diffDays
      }
    }
  }
})
</script>

<style lang="scss" scoped>
.accommodation-fields {
  .el-checkbox-group {
    .el-checkbox {
      margin-right: 12px;
      margin-bottom: 8px;
    }
  }
}
</style>