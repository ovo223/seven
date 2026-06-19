# AI 员工聊天 MVP

当前版本只保留一个最小功能：

- 一个 AI 员工：`Mira`
- 一个用户钱包
- 一个 AI 员工钱包
- 用户钱包支持充值和提现
- 一个聊天窗口
- 用户可以从用户钱包给 AI 钱包拨款
- 用户可以从 AI 钱包取回到用户钱包
- 用户钱包和 AI 钱包各自有独立金额输入框
- Next.js 版本已预留统一 AI 回复接口 `/api/chat`
- Next.js 版本已预留充值/提现接口 `/api/wallet`

## 立即预览

直接打开：

```txt
preview.html
```

这个文件不需要安装依赖，双击即可查看网页版效果。

## Next.js 项目

正式项目入口也已简化为同样的单页面体验：

```bash
npm install
npm run dev
```

然后打开：

```txt
http://localhost:3000
```

后台入口：

```txt
http://localhost:3000/admin
```

当前后台可以控制：

- 品牌名称
- AI 员工名称、头像字母、简介
- 前台登录状态
- 用户钱包余额
- AI 员工钱包余额
- 当日收益和总收益

当前后台数据保存在浏览器本地存储。后续接 Supabase 时，可以把 `lib/platform-state.ts` 替换成数据库读写。

## 大模型接口预留

统一入口：

```txt
POST /api/chat
```

模型适配层：

```txt
lib/ai-provider.ts
```

当前默认：

```env
AI_PROVIDER=mock
```

后续可以切换：

```env
AI_PROVIDER=openai
AI_PROVIDER=deepseek
AI_PROVIDER=qwen
AI_PROVIDER=custom
```

对应 API Key 已在 `.env.example` 中预留。

## 钱包接口预留

统一入口：

```txt
POST /api/wallet
```

请求示例：

```json
{
  "action": "recharge",
  "amount": 100
}
```

```json
{
  "action": "withdraw",
  "amount": 50
}
```

支付/提现适配层：

```txt
lib/payment-provider.ts
```

当前默认：

```env
PAYMENT_PROVIDER=mock
```

后续可以切换：

```env
PAYMENT_PROVIDER=stripe
PAYMENT_PROVIDER=wechat_pay
PAYMENT_PROVIDER=alipay
PAYMENT_PROVIDER=bank_transfer
PAYMENT_PROVIDER=manual
```

## 下一步

接 Supabase 时，只需要先做三件事：

1. 登录用户。
2. 保存用户钱包和 AI 员工钱包余额。
3. 保存充值、提现、拨款和取回记录。
4. 保存聊天消息。
5. 补齐真实大模型 provider 调用。
