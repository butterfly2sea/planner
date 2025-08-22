# 稻城亚丁智能旅游规划系统 - 前端 v2.0

## 项目简介

基于 Vue 3 + TypeScript + Element Plus 构建的现代化旅游规划应用，提供直观的界面和强大的功能来帮助用户规划完美的稻城亚丁之旅。

### 主要特性

- 🔐 **用户认证** - 安全的登录注册系统
- 📍 **智能地图** - 支持多种地图样式，标记管理，位置选择
- 📅 **时间轴视图** - 直观的日程安排展示
- 📊 **甘特图** - 可视化时间关系，支持拖拽调整
- ✏️ **元素管理** - 完整的CRUD操作，支持多种旅游元素类型
- 🔗 **关联管理** - 元素间的依赖关系设置
- 📷 **图片管理** - 支持多图片上传和管理
- 📥 **数据导出** - JSON格式数据导出
- 🎨 **现代UI** - 响应式设计，支持深色模式
- 🌐 **国际化** - 多语言支持

### 技术栈

- **前端框架**: Vue 3.4 + TypeScript
- **构建工具**: Vite 5.0
- **状态管理**: Pinia 2.1
- **路由管理**: Vue Router 4.2
- **UI组件库**: Element Plus 2.4
- **地图服务**: MapLibre GL JS 5.6
- **甘特图**: Frappe Gantt 1.0.3
- **图表库**: Chart.js 4.5
- **日期处理**: Day.js 1.11
- **HTTP客户端**: Axios 1.6
- **工具库**: @vueuse/core 10.7

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+ 或 yarn 3+
- 现代浏览器 (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)

### 安装步骤

1. **克隆项目**
```bash
git clone 
cd planner-frontend
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **配置环境变量**
```bash
cp .env.example .env.local
# 编辑 .env.local 文件，配置API地址等
```

4. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
```

访问 http://localhost:3001 查看应用

### 构建部署

1. **生产构建**
```bash
npm run build
# 或
yarn build
```

2. **预览构建结果**
```bash
npm run preview
# 或
yarn preview
```

3. **部署**
   将 `dist` 目录下的文件部署到您的服务器或CDN

## 项目结构

```
src/
├── api/                    # API服务层
│   ├── auth.ts            # 认证相关API
│   ├── plan.ts            # 计划管理API
│   ├── item.ts            # 元素管理API
│   ├── relation.ts        # 关联管理API
│   └── http.ts            # HTTP客户端配置
├── components/            # 可复用组件
│   ├── MapComponent.vue   # 地图组件
│   ├── TimelineComponent.vue # 时间轴组件
│   ├── GanttComponent.vue # 甘特图组件
│   ├── ItemDialog.vue     # 元素编辑对话框
│   ├── CreatePlanDialog.vue # 创建计划对话框
│   └── ItemFields/        # 元素类型特定字段
├── stores/                # Pinia状态管理
│   ├── auth.ts           # 认证状态
│   ├── plan.ts           # 计划状态
│   └── item.ts           # 元素状态
├── views/                 # 页面组件
│   ├── Login.vue         # 登录页
│   ├── Register.vue      # 注册页
│   ├── Dashboard.vue     # 主面板
│   ├── Planner.vue       # 规划器主页
│   ├── Plans.vue         # 计划管理页
│   ├── Settings.vue      # 设置页
│   └── NotFound.vue      # 404页面
├── composables/           # 组合式API
│   ├── useTheme.ts       # 主题管理
│   ├── useLocalStorage.ts # 本地存储
│   └── useRequest.ts     # 请求管理
├── utils/                 # 工具函数
│   └── index.ts          # 通用工具函数
├── styles/               # 样式文件
│   └── index.scss        # 全局样式
├── types/                # TypeScript类型定义
│   └── index.ts          # 类型声明
├── router/               # 路由配置
│   └── index.ts          # 路由定义
├── App.vue               # 根组件
└── main.ts               # 应用入口
```

## 核心功能

### 1. 用户认证
- JWT Token认证
- 自动Token刷新
- 路由守卫保护

### 2. 计划管理
- 创建、编辑、删除计划
- 计划切换和选择
- 计划数据导出

### 3. 旅游元素管理
- 多种元素类型支持（住宿、交通、景点等）
- 时间、位置、费用等属性管理
- 图片上传和管理
- 类型特定字段配置

### 4. 视图模式
- **地图视图**: 地理位置可视化，支持多种地图样式
- **时间轴视图**: 按日期展示行程安排
- **甘特图视图**: 时间关系可视化，支持拖拽调整

### 5. 数据管理
- 自动保存到后端
- 数据验证和错误处理
- 离线状态管理

## 开发指南

### 代码规范

项目使用以下工具确保代码质量：

- **TypeScript**: 类型安全
- **ESLint**: 代码规范检查
- **Prettier**: 代码格式化
- **Husky**: Git钩子
- **Commitlint**: 提交信息规范

### 组件开发

1. **使用组合式API**
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

// 推荐的组件结构
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const state = ref()

// 计算属性
const computed = computed(() => {})

// 方法
const methods = () => {}
</script>
```

2. **TypeScript类型定义**
```typescript
// 为所有props和emits定义类型
interface Props {
  title: string
  items: Item[]
}

interface Emits {
  (e: 'update', value: string): void
}
```

3. **样式规范**
```vue
<style lang="scss" scoped>
// 使用scoped样式避免污染
// 使用CSS变量保持一致性
.component {
  color: var(--text-primary);
  background: var(--bg-primary);
}
</style>
```

### 状态管理

使用Pinia进行状态管理：

```typescript
export const useExampleStore = defineStore('example', () => {
  // state
  const state = ref()
  
  // getters
  const getters = computed(() => {})
  
  // actions
  const actions = () => {}
  
  return {
    state: readonly(state),
    getters,
    actions
  }
})
```

### API集成

统一的API调用模式：

```typescript
// 在store中处理API调用
const fetchData = async () => {
  loading.value = true
  try {
    const data = await api.getData()
    state.value = data
    ElMessage.success('操作成功')
  } catch (error) {
    ElMessage.error('操作失败')
    throw error
  } finally {
    loading.value = false
  }
}
```

## 环境配置

### 开发环境变量

创建 `.env.local` 文件：

```bash
# API配置
VITE_API_BASE_URL=http://localhost:3000/api/v1

# 地图配置  
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_MAPTILER_KEY=your_maptiler_key

# 其他配置
VITE_APP_TITLE=稻城亚丁旅游规划系统
VITE_APP_VERSION=2.0.0
```

### 代理配置

开发环境API代理在 `vite.config.ts` 中配置：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

## 部署说明

### 静态部署

适用于Nginx、Apache等静态服务器：

```bash
npm run build
# 将dist目录内容部署到服务器
```

### Docker部署

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### CDN部署

支持部署到Vercel、Netlify等平台：

```bash
# Vercel
npm i -g vercel
vercel

# Netlify
npm run build
# 手动上传dist目录或连接Git仓库
```

## 性能优化

### 打包优化

- 代码分割和懒加载
- Tree-shaking去除未使用代码
- 资源压缩和缓存策略

### 运行时优化

- 虚拟滚动处理大数据
- 图片懒加载
- 防抖和节流优化用户交互

### 监控和分析

- 使用Vue Devtools调试
- 性能监控和错误追踪
- Bundle分析优化

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 常见问题

### Q: 地图不显示？
A: 检查地图服务的API密钥配置，确保网络连接正常。

### Q: 甘特图报错？
A: 确保传入的数据格式正确，特别是时间格式。

### Q: 图片上传失败？
A: 检查后端API是否正常，文件大小是否超限。

### Q: 构建失败？
A: 检查Node.js版本，清除缓存后重新安装依赖。

## 贡献指南

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

### 提交信息规范

使用Angular规范：

```
type(scope): description

[optional body]

[optional footer(s)]
```

类型包括：feat, fix, docs, style, refactor, test, chore等。

## 更新日志

### v2.0.0 (2024-12-XX)
- 🎉 全新Vue 3 + TypeScript重构
- ✨ 新增甘特图视图
- ✨ 新增深色模式支持
- ✨ 新增国际化支持
- 🐛 修复地图标记交互问题
- 🐛 修复编辑功能无法使用问题
- ⚡ 性能优化和体验提升

### v1.0.0 (2024-XX-XX)
- 🎉 初始版本发布
- ✨ 基础功能实现

## 许可证

MIT License

## 联系方式

- 项目主页: https://github.com/yourusername/planner
- 问题反馈: https://github.com/yourusername/planner/issues
- 邮箱: your.email@example.com

## 致谢

- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Element Plus](https://element-plus.org/) - Vue 3组件库
- [MapLibre GL JS](https://maplibre.org/) - 开源地图库
- [Pinia](https://pinia.vuejs.org/) - Vue状态管理
- [Vite](https://vitejs.dev/) - 下一代前端构建工具