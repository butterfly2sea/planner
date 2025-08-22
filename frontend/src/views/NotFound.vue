<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <h1>页面不存在</h1>
      <p>抱歉，您访问的页面不存在或已被移除。</p>

      <div class="actions">
        <el-button type="primary" @click="goHome">
          <el-icon><HomeFilled /></el-icon>
          返回首页
        </el-button>
        <el-button @click="goBack">
          <el-icon><Back /></el-icon>
          返回上页
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.not-found-content {
  text-align: center;
  color: white;

  .error-code {
    font-size: 120px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 20px;
    opacity: 0.8;
  }

  h1 {
    font-size: 32px;
    font-weight: 600;
    margin: 0 0 16px 0;
  }

  p {
    font-size: 16px;
    margin: 0 0 32px 0;
    opacity: 0.9;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 16px;
  }
}
</style>