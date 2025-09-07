# 稻城亚丁智能旅游规划系统

一个基于 Go + Gin + PostgreSQL 的智能旅游规划系统，帮助用户规划稻城亚丁的完美旅程。

## 功能特性

- 🗺️ **行程规划** - 创建和管理旅游计划，支持多日行程安排
- 🏨 **住宿管理** - 记录和管理酒店预订信息
- ✈️ **交通安排** - 管理航班、火车、自驾等交通方式
- 📍 **景点打卡** - 标记必去景点和拍照点
- 💰 **预算追踪** - 实时追踪旅行费用
- 📊 **数据分析** - 行程统计和优化建议
- 🔐 **用户认证** - JWT 基础的安全认证
- 📱 **响应式设计** - 支持桌面和移动设备

## 技术栈

- **后端**: Go 1.21+, Gin Web Framework
- **数据库**: PostgreSQL 14+
- **缓存**: Redis (可选)
- **认证**: JWT
- **前端**: HTML5, JavaScript, MapLibre GL

## 项目结构

```
planner/
├── cmd/                    # 应用入口（可选）
├── internal/              # 内部包
│   ├── config/           # 配置管理
│   ├── database/         # 数据库连接
│   ├── handlers/         # HTTP处理函数
│   ├── middleware/       # 中间件
│   ├── models/          # 数据模型
│   └── routes/          # 路由配置
├── static/               # 静态文件
│   └── index.html       # 前端页面
├── logs/                # 日志文件
├── uploads/             # 上传文件
├── .env.example         # 环境变量示例
├── go.mod              # Go模块文件
├── go.sum              # 依赖版本锁定
├── main.go             # 主程序入口
└── README.md           # 项目说明

```

## 快速开始

### 0. 快速环境
```bash
cd /mnt/c/Users/h/Documents/GitHub/planner/
docker rm -f pg rds
docker run -p 5432:5432 -d -e POSTGRES_PASSWORD=password -v $(pwd):/data --name pg postgres
docker run -p 6379:6379 -d --name rds redis
docker exec -it pg /bin/bash
psql -U postgres
CREATE DATABASE daocheng_travel;
\q
// 运行后端程序创建相应表后执行
/data/dataimport.bash
```

### 1. 环境要求

- Go 1.21 或更高版本
- PostgreSQL 14 或更高版本
- Redis 6.0 或更高版本（可选）
- Git

### 2. 克隆项目

```bash
git clone https://github.com/yourusername/planner.git
cd planner
```

### 3. 安装依赖

```bash
go mod download
```

### 4. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置数据库连接等配置
```

### 5. 创建数据库

```bash
# 登录 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE daocheng_travel;

# 退出
\q
```

### 6. 运行项目

```bash
# 开发模式
go run main.go

# 或构建后运行
go build -o planner
./planner
```

服务器将在 http://localhost:3000 启动

### 7. 访问应用

- 主页: http://localhost:3000
- API文档: http://localhost:3000/api/v1/docs
- 健康检查: http://localhost:3000/api/v1/health

## API 端点

### 认证
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `GET /api/v1/auth/profile` - 获取用户资料

### 计划管理
- `GET /api/v1/plans` - 获取我的计划列表
- `POST /api/v1/plans` - 创建新计划
- `GET /api/v1/plans/:planId` - 获取计划详情
- `PUT /api/v1/plans/:planId` - 更新计划
- `DELETE /api/v1/plans/:planId` - 删除计划

### 旅游元素
- `GET /api/v1/items/plan/:planId` - 获取计划中的所有元素
- `POST /api/v1/items/plan/:planId` - 添加新元素
- `GET /api/v1/items/:itemId` - 获取元素详情
- `PUT /api/v1/items/:itemId` - 更新元素
- `DELETE /api/v1/items/:itemId` - 删除元素

### 更多端点
查看 `internal/routes/routes.go` 文件了解所有可用端点

## 开发指南

### 运行测试

```bash
go test ./...
```

### 代码格式化

```bash
go fmt ./...
```

### 代码检查

```bash
go vet ./...
```

### 构建生产版本

```bash
# Linux/Mac
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o planner .

# Windows
set CGO_ENABLED=0
set GOOS=windows
go build -a -installsuffix cgo -o planner.exe .
```

## Docker 部署

### 创建 Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o planner .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/planner .
COPY --from=builder /app/static ./static
EXPOSE 3000
CMD ["./planner"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t planner .

# 运行容器
docker run -p 3000:3000 --env-file .env planner
```

## 数据库迁移

数据库表会在首次运行时自动创建。如需手动创建，可以查看 `internal/database/database.go` 中的 SQL 语句。

## 故障排查

### 数据库连接失败
- 检查 PostgreSQL 服务是否运行
- 验证 `.env` 中的数据库连接字符串
- 确保数据库存在且用户有访问权限

### 端口已被占用
- 修改 `.env` 中的 `PORT` 配置
- 或停止占用端口的其他服务

### Redis 连接失败
- Redis 是可选的，如果不使用可以忽略错误
- 如需使用，确保 Redis 服务运行并检查连接配置

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License

## 联系方式

- 项目主页: https://github.com/yourusername/planner
- 问题反馈: https://github.com/yourusername/planner/issues

## 致谢

- [Gin Web Framework](https://github.com/gin-gonic/gin)
- [MapLibre GL JS](https://maplibre.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)