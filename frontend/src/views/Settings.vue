<template>
  <div class="settings-container">
    <div class="settings-header">
      <h1>设置</h1>
    </div>

    <div class="settings-content">
      <el-tabs v-model="activeTab" class="settings-tabs">
        <!-- 个人资料 -->
        <el-tab-pane label="个人资料" name="profile">
          <div class="settings-section">
            <h3>基本信息</h3>
            <el-form
                ref="profileFormRef"
                :model="profileForm"
                :rules="profileRules"
                label-width="100px"
                style="max-width: 500px"
            >
              <el-form-item label="用户名" prop="username">
                <el-input v-model="profileForm.username" disabled />
              </el-form-item>

              <el-form-item label="邮箱" prop="email">
                <el-input v-model="profileForm.email" />
              </el-form-item>

              <el-form-item label="昵称" prop="nickname">
                <el-input
                    v-model="profileForm.nickname"
                    placeholder="请输入昵称"
                />
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="updateProfile">
                  保存更改
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-divider />

          <div class="settings-section">
            <h3>修改密码</h3>
            <el-form
                ref="passwordFormRef"
                :model="passwordForm"
                :rules="passwordRules"
                label-width="100px"
                style="max-width: 500px"
            >
              <el-form-item label="当前密码" prop="currentPassword">
                <el-input
                    v-model="passwordForm.currentPassword"
                    type="password"
                    show-password
                />
              </el-form-item>

              <el-form-item label="新密码" prop="newPassword">
                <el-input
                    v-model="passwordForm.newPassword"
                    type="password"
                    show-password
                />
              </el-form-item>

              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    show-password
                />
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="changePassword">
                  修改密码
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 偏好设置 -->
        <el-tab-pane label="偏好设置" name="preferences">
          <div class="settings-section">
            <h3>界面设置</h3>
            <div class="preference-item">
              <div class="preference-label">
                <span>主题</span>
                <p>选择您喜欢的界面主题</p>
              </div>
              <el-radio-group v-model="preferences.theme">
                <el-radio label="light">浅色</el-radio>
                <el-radio label="dark">深色</el-radio>
                <el-radio label="auto">跟随系统</el-radio>
              </el-radio-group>
            </div>

            <div class="preference-item">
              <div class="preference-label">
                <span>语言</span>
                <p>选择界面显示语言</p>
              </div>
              <el-select v-model="preferences.language" style="width: 150px">
                <el-option label="简体中文" value="zh-CN" />
                <el-option label="English" value="en-US" />
              </el-select>
            </div>

            <div class="preference-item">
              <div class="preference-label">
                <span>默认地图样式</span>
                <p>新建计划时的默认地图样式</p>
              </div>
              <el-select v-model="preferences.defaultMapStyle" style="width: 150px">
                <el-option label="街道" value="street" />
                <el-option label="卫星" value="satellite" />
                <el-option label="地形" value="terrain" />
                <el-option label="深色" value="dark" />
              </el-select>
            </div>
          </div>

          <el-divider />

          <div class="settings-section">
            <h3>通知设置</h3>
            <div class="preference-item">
              <div class="preference-label">
                <span>桌面通知</span>
                <p>允许显示桌面通知</p>
              </div>
              <el-switch v-model="preferences.desktopNotifications" />
            </div>

            <div class="preference-item">
              <div class="preference-label">
                <span>邮件提醒</span>
                <p>接收重要更新的邮件通知</p>
              </div>
              <el-switch v-model="preferences.emailNotifications" />
            </div>
          </div>

          <div class="settings-actions">
            <el-button type="primary" @click="savePreferences">
              保存设置
            </el-button>
          </div>
        </el-tab-pane>

        <!-- 数据管理 -->
        <el-tab-pane label="数据管理" name="data">
          <div class="settings-section">
            <h3>数据导出</h3>
            <p>您可以导出所有的计划数据作为备份</p>
            <el-button type="primary" @click="exportAllData">
              <el-icon><Download /></el-icon>
              导出所有数据
            </el-button>
          </div>

          <el-divider />

          <div class="settings-section">
            <h3>数据导入</h3>
            <p>从之前导出的文件中恢复数据</p>
            <el-upload
                ref="uploadRef"
                :auto-upload="false"
                :on-change="handleFileChange"
                accept=".json"
                :show-file-list="false"
            >
              <el-button type="primary">
                <el-icon><Upload /></el-icon>
                选择文件
              </el-button>
            </el-upload>
          </div>

          <el-divider />

          <div class="settings-section danger-zone">
            <h3>危险操作</h3>
            <el-alert
                title="注意：以下操作不可恢复"
                type="warning"
                :closable="false"
                style="margin-bottom: 16px"
            />

            <div class="danger-actions">
              <el-button type="danger" plain @click="clearAllData">
                清空所有数据
              </el-button>

              <el-button type="danger" @click="deleteAccount">
                删除账号
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- 关于 -->
        <el-tab-pane label="关于" name="about">
          <div class="settings-section">
            <div class="about-content">
              <div class="app-info">
<!--                <img src="/logo.png" alt="Logo" class="app-logo" />-->
                <h2>稻城亚丁旅游规划系统</h2>
                <p class="version">版本 2.0.0</p>
                <p class="description">
                  智能化的旅游规划工具，帮助您轻松规划完美的稻城亚丁之旅。
                  支持地图规划、时间轴管理、甘特图视图等多种功能。
                </p>
              </div>

              <div class="links">
                <h3>相关链接</h3>
                <ul>
                  <li><a href="#" target="_blank">官方网站</a></li>
                  <li><a href="#" target="_blank">使用帮助</a></li>
                  <li><a href="#" target="_blank">问题反馈</a></li>
                  <li><a href="#" target="_blank">隐私政策</a></li>
                </ul>
              </div>

              <div class="tech-info">
                <h3>技术信息</h3>
                <p>基于 Vue 3 + TypeScript + Element Plus 构建</p>
                <p>地图服务：MapLibre GL JS</p>
                <p>甘特图：Frappe Gantt</p>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'

const authStore = useAuthStore()

const activeTab = ref('profile')

// 个人资料表单
const profileFormRef = ref<FormInstance>()
const profileForm = reactive({
  username: '',
  email: '',
  nickname: ''
})

const profileRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

// 密码修改表单
const passwordFormRef = ref<FormInstance>()
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules: FormRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 偏好设置
const preferences = reactive({
  theme: 'light',
  language: 'zh-CN',
  defaultMapStyle: 'street',
  desktopNotifications: true,
  emailNotifications: true
})

onMounted(() => {
  // 初始化用户信息
  if (authStore.user) {
    profileForm.username = authStore.user.username
    profileForm.email = authStore.user.email
    profileForm.nickname = authStore.user.username // 临时使用username作为nickname
  }

  // 加载用户偏好设置
  loadPreferences()
})

const loadPreferences = () => {
  const savedPreferences = localStorage.getItem('user-preferences')
  if (savedPreferences) {
    Object.assign(preferences, JSON.parse(savedPreferences))
  }
}

const updateProfile = async () => {
  if (!profileFormRef.value) return

  const valid = await profileFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    // TODO: 调用API更新用户信息
    ElMessage.success('个人资料更新成功')
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

const changePassword = async () => {
  if (!passwordFormRef.value) return

  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    // TODO: 调用API修改密码
    ElMessage.success('密码修改成功')

    // 清空表单
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    ElMessage.error('密码修改失败')
  }
}

const savePreferences = () => {
  localStorage.setItem('user-preferences', JSON.stringify(preferences))
  ElMessage.success('设置保存成功')
}

const exportAllData = () => {
  // TODO: 实现数据导出
  ElMessage.info('数据导出功能开发中...')
}

const handleFileChange = (_file: UploadFile) => {
  // TODO: 实现数据导入
  ElMessage.info('数据导入功能开发中...')
}

const clearAllData = async () => {
  try {
    await ElMessageBox.confirm(
        '确定要清空所有数据吗？此操作不可恢复！',
        '危险操作',
        {
          confirmButtonText: '确定清空',
          cancelButtonText: '取消',
          type: 'error'
        }
    )

    // TODO: 实现清空数据
    ElMessage.success('数据已清空')
  } catch (error) {
    // 用户取消
  }
}

const deleteAccount = async () => {
  try {
    await ElMessageBox.confirm(
        '确定要删除账号吗？账号删除后将无法恢复！',
        '删除账号',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'error'
        }
    )

    // TODO: 实现删除账号
    ElMessage.success('账号已删除')
  } catch (error) {
    // 用户取消
  }
}
</script>

<style lang="scss" scoped>
.settings-container {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.settings-header {
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #2c3e50;
  }
}

.settings-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-tabs {
  :deep(.el-tabs__content) {
    padding-top: 20px;
  }
}

.settings-section {
  margin-bottom: 32px;

  h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
  }

  &.danger-zone {
    border: 1px solid #f56c6c;
    border-radius: 8px;
    padding: 20px;
    background: #fef0f0;

    .danger-actions {
      display: flex;
      gap: 12px;
    }
  }
}

.preference-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  .preference-label {
    flex: 1;

    span {
      font-weight: 500;
      color: #2c3e50;
    }

    p {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: #7f8c8d;
    }
  }
}

.settings-actions {
  margin-top: 24px;
}

.about-content {
  .app-info {
    text-align: center;
    margin-bottom: 40px;

    .app-logo {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .version {
      margin: 0 0 16px 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .description {
      max-width: 500px;
      margin: 0 auto;
      line-height: 1.6;
      color: #5a6c7d;
    }
  }

  .links {
    margin-bottom: 32px;

    h3 {
      margin-bottom: 16px;
      font-size: 16px;
      color: #2c3e50;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        margin-bottom: 8px;

        a {
          color: #409eff;
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }
  }

  .tech-info {
    h3 {
      margin-bottom: 16px;
      font-size: 16px;
      color: #2c3e50;
    }

    p {
      margin: 8px 0;
      color: #7f8c8d;
      font-size: 14px;
    }
  }
}
</style>