<template>
  <el-container class="dashboard-container">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarWidth" class="sidebar">
      <div class="sidebar-header">
<!--        <img src="/logo.png" alt="Logo" class="logo" />-->
        <h2>稻城亚丁</h2>
      </div>

      <el-menu
          :default-active="currentRoute"
          class="sidebar-menu"
          router
          @select="handleMenuSelect"
      >
        <el-menu-item index="/planner">
          <el-icon><Location /></el-icon>
          <span>旅游规划</span>
        </el-menu-item>
        <el-menu-item index="/plans">
          <el-icon><Document /></el-icon>
          <span>我的计划</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <el-dropdown @command="handleUserCommand">
          <div class="user-info">
            <el-avatar :size="32" :src="userAvatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <span class="username">{{ authStore.user?.username }}</span>
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人资料</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-aside>

    <!-- 主内容区域 -->
    <el-main class="main-content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const sidebarWidth = ref('240px')
const currentRoute = computed(() => route.path)
const userAvatar = computed(() => `https://api.dicebear.com/7.x/avataaars/svg?seed=${authStore.user?.username}`)

const handleMenuSelect = (index: string) => {
  router.push(index)
}

const handleUserCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      // TODO: 打开个人资料对话框
      break
    case 'logout':
      await authStore.logout()
      router.push('/login')
      break
  }
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  height: 100vh;
}

.sidebar {
  background: #001529;
  display: flex;
  flex-direction: column;

  .sidebar-header {
    display: flex;
    align-items: center;
    padding: 20px;
    color: white;
    border-bottom: 1px solid #333;

    .logo {
      width: 32px;
      height: 32px;
      margin-right: 12px;
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
  }

  .sidebar-menu {
    flex: 1;
    border: none;
    background: transparent;

    :deep(.el-menu-item) {
      color: rgba(255, 255, 255, 0.65);

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }

      &.is-active {
        color: #1890ff;
        background: rgba(24, 144, 255, 0.1);
      }
    }
  }

  .sidebar-footer {
    padding: 20px;
    border-top: 1px solid #333;

    .user-info {
      display: flex;
      align-items: center;
      color: white;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: background 0.3s;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .username {
        flex: 1;
        margin-left: 12px;
        font-size: 14px;
      }

      .dropdown-icon {
        font-size: 12px;
        opacity: 0.6;
      }
    }
  }
}

.main-content {
  padding: 0;
  overflow: hidden;
}
</style>