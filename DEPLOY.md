# 上线部署说明

推荐先用 Vercel 部署，因为这是 Next.js 官方生态里最省事的方式。

## 当前项目状态

当前项目可以部署为一个 Next.js 应用：

- 前台：`/`
- 后台：`/admin`
- AI 接口预留：`/api/chat`
- 钱包接口预留：`/api/wallet`

注意：现在后台配置保存在浏览器本地存储里，适合 MVP 演示。正式上线后，如果要让所有用户看到同一份后台配置，需要接 Supabase 或其他数据库。

## Vercel 上线步骤

1. 把项目上传到 GitHub。
2. 打开 Vercel。
3. New Project。
4. Import 你的 GitHub 仓库。
5. Framework Preset 选择 Next.js。
6. Build Command 保持默认：

```txt
npm run build
```

7. Output Directory 留空。
8. Environment Variables 按需添加：

```env
AI_PROVIDER=mock
PAYMENT_PROVIDER=mock
```

9. 点击 Deploy。

## 后续接真实服务

真实上线建议补：

- Supabase Auth：登录注册
- Supabase Database：用户钱包、AI 钱包、收益、后台配置
- 大模型 API：替换 `lib/ai-provider.ts`
- 充值/提现渠道：替换 `lib/payment-provider.ts`
- 后台权限：只有管理员能进入 `/admin`
