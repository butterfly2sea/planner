<template>
  <div class="attraction-fields">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="景点类型">
          <el-select v-model="localValue.type" placeholder="选择景点类型">
            <el-option label="自然景观" value="nature"/>
            <el-option label="人文景观" value="culture"/>
            <el-option label="宗教寺庙" value="temple"/>
            <el-option label="博物馆" value="museum"/>
            <el-option label="游乐园" value="amusement"/>
            <el-option label="购物中心" value="shopping"/>
            <el-option label="观景台" value="viewpoint"/>
            <el-option label="拍照点" value="photo_spot"/>
            <el-option label="其他" value="other"/>
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="景点评级">
          <el-rate
              v-model="localValue.rating"
              :max="5"
              show-text
              :texts="['1分', '2分', '3分', '4分', '5分']"
              allow-half
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="门票价格">
          <el-input-number
              v-model="localValue.ticket_price"
              :min="0"
              :precision="2"
              placeholder="门票价格"
              style="width: 100%"
          />
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="开放时间">
          <el-input v-model="localValue.opening_hours" placeholder="如：08:00-18:00"/>
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="建议游玩时间">
          <el-input v-model="localValue.recommended_duration" placeholder="如：2-3小时"/>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="最佳时节">
          <el-input v-model="localValue.best_season" placeholder="如：春夏季节"/>
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="购票方式">
          <el-select v-model="localValue.ticket_method" placeholder="购票方式" allow-create>
            <el-option label="现场购票" value="onsite"/>
            <el-option label="网上预订" value="online"/>
            <el-option label="美团" value="meituan"/>
            <el-option label="大众点评" value="dianping"/>
            <el-option label="携程" value="ctrip"/>
            <el-option label="去哪儿" value="qunar"/>
            <el-option label="官方APP" value="official"/>
            <el-option label="免费开放" value="free"/>
          </el-select>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="预订单号">
          <el-input v-model="localValue.booking_reference" placeholder="预订确认号"/>
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="景点特色">
      <el-checkbox-group v-model="localValue.features">
        <el-checkbox label="photography" border>适合摄影</el-checkbox>
        <el-checkbox label="hiking" border>徒步登山</el-checkbox>
        <el-checkbox label="family" border>亲子游玩</el-checkbox>
        <el-checkbox label="culture" border>文化体验</el-checkbox>
        <el-checkbox label="adventure" border>探险刺激</el-checkbox>
        <el-checkbox label="peaceful" border>安静休闲</el-checkbox>
        <el-checkbox label="worship" border>祈福朝拜</el-checkbox>
        <el-checkbox label="education" border>科普教育</el-checkbox>
        <el-checkbox label="shopping" border>购物消费</el-checkbox>
        <el-checkbox label="food" border>美食品尝</el-checkbox>
      </el-checkbox-group>
    </el-form-item>

    <el-form-item label="交通方式">
      <el-input v-model="localValue.transportation" placeholder="如：步行10分钟、打车、公交等"/>
    </el-form-item>

    <el-form-item label="联系电话">
      <el-input v-model="localValue.contact_phone" placeholder="景点咨询电话"/>
    </el-form-item>

    <el-form-item label="官方网站">
      <el-input v-model="localValue.website" placeholder="景点官方网站"/>
    </el-form-item>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="海拔高度">
          <el-input-number
              v-model="localValue.altitude"
              :min="0"
              placeholder="海拔(米)"
              style="width: 100%"
          />
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="气温范围">
          <el-input v-model="localValue.temperature_range" placeholder="如：10-25°C"/>
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="注意事项">
      <el-input
          v-model="localValue.warnings"
          type="textarea"
          :rows="3"
          placeholder="如：注意防晒、带好保暖衣物、注意高反等"
          maxlength="300"
          show-word-limit
      />
    </el-form-item>

    <el-form-item label="游玩攻略">
      <el-input
          v-model="localValue.tips"
          type="textarea"
          :rows="4"
          placeholder="游玩路线、拍照机位、避坑指南等"
          maxlength="500"
          show-word-limit
      />
    </el-form-item>

    <el-form-item label="周边设施">
      <el-checkbox-group v-model="localValue.facilities">
        <el-checkbox label="parking" border>停车场</el-checkbox>
        <el-checkbox label="restroom" border>卫生间</el-checkbox>
        <el-checkbox label="restaurant" border>餐厅</el-checkbox>
        <el-checkbox label="shop" border>商店</el-checkbox>
        <el-checkbox label="atm" border>ATM</el-checkbox>
        <el-checkbox label="wifi" border>WiFi</el-checkbox>
        <el-checkbox label="guide" border>导游服务</el-checkbox>
        <el-checkbox label="wheelchair" border>无障碍通道</el-checkbox>
        <el-checkbox label="luggage" border>寄存服务</el-checkbox>
        <el-checkbox label="medical" border>医疗服务</el-checkbox>
      </el-checkbox-group>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface AttractionProperties {
  type?: string
  rating?: number
  ticket_price?: number
  opening_hours?: string
  recommended_duration?: string
  best_season?: string
  ticket_method?: string
  booking_reference?: string
  features?: string[]
  transportation?: string
  contact_phone?: string
  website?: string
  altitude?: number
  temperature_range?: string
  warnings?: string
  tips?: string
  facilities?: string[]
}

interface Props {
  modelValue: AttractionProperties
}

interface Emits {
  (e: 'update:modelValue', value: AttractionProperties): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localValue = computed({
  get: () => ({
    type: '',
    rating: 0,
    ticket_price: 0,
    opening_hours: '',
    recommended_duration: '',
    best_season: '',
    ticket_method: '',
    booking_reference: '',
    features: [],
    transportation: '',
    contact_phone: '',
    website: '',
    altitude: 0,
    temperature_range: '',
    warnings: '',
    tips: '',
    facilities: [],
    ...props.modelValue
  }),
  set: (value) => {
    emit('update:modelValue', value)
  }
})
</script>

<style lang="scss" scoped>
.attraction-fields {
  .el-checkbox-group {
    .el-checkbox {
      margin-right: 12px;
      margin-bottom: 8px;
    }
  }
}
</style>